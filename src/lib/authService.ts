/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signInWithEmailAndPassword, 
  signOut,
  reload,
  User as FirebaseUser 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { FirebaseService } from './firebase';
import { User } from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const AuthService = {
  /**
   * Prepares a new user structure without saving it to DB yet.
   * User is only persisted to DB after successful OTP activation.
   */
  async prepareRegistration(data: {
    name: string;
    email: string;
    phone: string;
    nickname: string;
    password: string;
  }): Promise<User> {
    const cleanEmail = data.email.trim().toLowerCase();

    const users = await FirebaseService.getUsers();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('البريد الإلكتروني مسجل بالفعل في النظام.');
    }
    if (users.some((u) => u.nickname.toLowerCase() === data.nickname.trim().toLowerCase())) {
      throw new Error('الاسم المستعار مستخدم بالفعل، يرجى اختيار اسم آخر.');
    }

    const newUser: User = {
      id: 'usr_' + Date.now(),
      name: data.name.trim(),
      email: cleanEmail,
      phone: data.phone.trim(),
      nickname: data.nickname.trim(),
      password: data.password,
      role: cleanEmail === 'admin@m-estably.com' ? 'admin' : 'user',
      isVerified: false,
      createdAt: new Date().toISOString(),
    };

    return newUser;
  },

  /**
   * Legacy register method wrapper.
   */
  async registerUser(data: {
    name: string;
    email: string;
    phone: string;
    nickname: string;
    password: string;
  }): Promise<{ user: User }> {
    const user = await this.prepareRegistration(data);
    return { user };
  },

  /**
   * Generates and dispatches a 6-digit OTP code via backend API & real email service.
   * Throws an error if real email delivery fails.
   */
  async sendOtpCode(email: string): Promise<{ email: string; sentViaRealApi: boolean; apiDeliveryMethod?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    let res: Response;
    try {
      res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
    } catch (netErr) {
      throw new Error('فشل الاتصال بالخادم. يرجى التأكد من الاتصال بالإنترنت والمحاولة لاحقاً.');
    }

    let data: any;
    try {
      const text = await res.text();
      data = JSON.parse(text);
    } catch (parseErr) {
      throw new Error('استجابة غير متوقعة من الخادم. يرجى إعادة المحاولة لاحقاً.');
    }

    if (!res.ok || !data.success || !data.sentViaRealApi) {
      throw new Error(data.error || 'تعذر إرسال كود التفعيل إلى بريدك الإلكتروني. يرجى التأكد من صحة البريد والمحاولة لاحقاً.');
    }

    return {
      email: cleanEmail,
      sentViaRealApi: true,
      apiDeliveryMethod: data.apiDeliveryMethod
    };
  },

  /**
   * Verifies the 6-digit OTP code using server API.
   * Only returns true if the server confirms the exact code.
   */
  async verifyOtpCode(email: string, inputCode: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = inputCode.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      throw new Error('يرجى إدخال كود تفعيل مكون من 6 أرقام.');
    }

    let res: Response;
    try {
      res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode })
      });
    } catch (netErr) {
      throw new Error('فشل الاتصال بالخادم. يرجى التأكد من الاتصال بالإنترنت والمحاولة لاحقاً.');
    }

    let data: any;
    try {
      const text = await res.text();
      data = JSON.parse(text);
    } catch (parseErr) {
      throw new Error('استجابة غير متوقعة من الخادم. يرجى إعادة المحاولة لاحقاً.');
    }

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'كود التفعيل غير صحيح أو انتهت صلاحيته.');
    }

    // Mark existing user as verified if present in DB
    const users = await FirebaseService.getUsers();
    const existingUser = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      existingUser.isVerified = true;
      await FirebaseService.saveUser(existingUser);
    }

    return true;
  },

  /**
   * Checks if current user's email is verified after user clicks link in email.
   */
  async checkEmailVerification(): Promise<boolean> {
    if (auth.currentUser) {
      try {
        await reload(auth.currentUser);
        if (auth.currentUser.emailVerified) {
          return true;
        }
      } catch (err) {
        console.warn('checkEmailVerification reload warning:', err);
      }
    }
    return false;
  },

  /**
   * Logs in user with email & password, enforcing email verification.
   */
  async loginUser(identifier: string, pass: string): Promise<{ user: User; isVerified: boolean }> {
    const cleanIdentifier = identifier.trim().toLowerCase();
    
    // Fetch user profiles from database
    const users = await FirebaseService.getUsers();
    
    let targetUser = users.find(u => 
      u.email.toLowerCase() === cleanIdentifier ||
      u.nickname.toLowerCase() === cleanIdentifier ||
      u.phone.replace(/[\s\-\+]/g, '') === cleanIdentifier.replace(/[\s\-\+]/g, '')
    );

    // Try Firebase Auth if identifier is email
    let fbUserVerified = false;
    if (cleanIdentifier.includes('@')) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanIdentifier, pass);
        fbUserVerified = userCredential.user.emailVerified;
      } catch (err: any) {
        console.warn('Firebase auth sign in warning:', err);
        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          throw new Error('البريد الإلكتروني أو كلمة السر غير صحيحة.');
        } else if (err.code === 'auth/too-many-requests') {
          throw new Error('تم محاولة الدخول لمرات عديدة، يرجى الانتظار قليلاً وإعادة المحاولة.');
        }
      }
    }

    if (!targetUser) {
      throw new Error('بيانات الدخول غير صحيحة أو الحساب غير موجود.');
    }

    if (targetUser.password && targetUser.password !== pass) {
      throw new Error('البريد الإلكتروني أو كلمة السر غير صحيحة.');
    }

    if (targetUser.isSuspended) {
      throw new Error('تم إيقاف هذا الحساب من قِبل الإدارة. يرجى التواصل مع الدعم الفني.');
    }

    // Determine verification status
    const isVerified = fbUserVerified || targetUser.isVerified === true;

    if (!isVerified) {
      return { user: targetUser, isVerified: false };
    }

    // Update verified flag in DB if it was previously false
    if (!targetUser.isVerified) {
      targetUser.isVerified = true;
      await FirebaseService.saveUser(targetUser);
    }

    return { user: targetUser, isVerified: true };
  },

  /**
   * Sign out current user
   */
  async logout(): Promise<void> {
    await signOut(auth);
  }
};
