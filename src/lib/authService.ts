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
   * Registers a new user via Firebase Auth, sends a real verification email,
   * and creates an unverified user record in the database.
   */
  async registerUser(data: {
    name: string;
    email: string;
    phone: string;
    nickname: string;
    password: string;
  }): Promise<{ user: User; firebaseUser?: FirebaseUser }> {
    const cleanEmail = data.email.trim().toLowerCase();
    let fbUser: FirebaseUser | undefined = undefined;

    // 1. Try Firebase Auth Account creation
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, data.password);
      fbUser = userCredential.user;
      try {
        await sendEmailVerification(fbUser);
      } catch (e) {
        console.warn('sendEmailVerification warning:', e);
      }
    } catch (err: any) {
      console.warn('Firebase Auth registration warning (will use DB fallback):', err);
      if (err.code === 'auth/email-already-in-use') {
        const customErr: any = new Error('هذا البريد الإلكتروني مسجل بالفعل في النظام.');
        customErr.code = 'auth/email-already-in-use';
        throw customErr;
      }
      if (err.code === 'auth/invalid-email') {
        const customErr: any = new Error('يرجى إدخال بريد إلكتروني صحيح وصالح.');
        customErr.code = 'auth/invalid-email';
        throw customErr;
      }
      if (err.code === 'auth/weak-password') {
        const customErr: any = new Error('كلمة السر ضعيفة، يرجى استخدام كلمة سر أقوى.');
        customErr.code = 'auth/weak-password';
        throw customErr;
      }
      // For auth/operation-not-allowed or other auth errors, we silently catch & proceed to DB creation
    }

    // 2. Create user record in DB with isVerified = false
    const newUser: User = {
      id: fbUser?.uid || 'usr_' + Date.now(),
      name: data.name.trim(),
      email: cleanEmail,
      phone: data.phone.trim(),
      nickname: data.nickname.trim(),
      password: data.password,
      role: cleanEmail === 'admin@m-estably.com' ? 'admin' : 'user',
      isVerified: false,
      createdAt: new Date().toISOString(),
    };

    await FirebaseService.saveUser(newUser);

    return { user: newUser, firebaseUser: fbUser };
  },

  /**
   * Generates and dispatches a 6-digit OTP code via backend API & email service.
   */
  async sendOtpCode(email: string): Promise<{ code: string; email: string; sentViaRealApi?: boolean; apiDeliveryMethod?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(`otp_${cleanEmail}`, JSON.stringify({
          code: data.code,
          expiresAt: Date.now() + 10 * 60 * 1000
        }));
        return {
          code: data.code,
          email: cleanEmail,
          sentViaRealApi: data.sentViaRealApi,
          apiDeliveryMethod: data.apiDeliveryMethod
        };
      }
    } catch (e) {
      console.warn('Backend API send-otp call warning:', e);
    }

    // Client fallback if API endpoint unreachable
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    const otpData = { email: cleanEmail, code, expiresAt, createdAt: new Date().toISOString() };
    localStorage.setItem(`otp_${cleanEmail}`, JSON.stringify(otpData));

    return { code, email: cleanEmail };
  },

  /**
   * Verifies the 6-digit OTP code using server API or local store.
   */
  async verifyOtpCode(email: string, inputCode: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = inputCode.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      throw new Error('يرجى إدخال كود تفعيل مكون من 6 أرقام.');
    }

    let apiVerified = false;

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'كود التفعيل غير صحيح.');
      }
      apiVerified = true;
    } catch (err: any) {
      if (err.message && err.message !== 'Failed to fetch') {
        throw err;
      }
      // Fallback local check
      const localData = localStorage.getItem(`otp_${cleanEmail}`);
      if (!localData) {
        throw new Error('لم يتم العثور على كود تفعيل لهذا البريد. يرجى طلب كود جديد.');
      }
      const storedOtp = JSON.parse(localData);
      if (Date.now() > storedOtp.expiresAt) {
        throw new Error('انتهت صلاحية كود التفعيل (مر أكثر من 10 دقائق). يرجى طلب كود جديد.');
      }
      if (storedOtp.code !== cleanCode) {
        throw new Error('رمز التفعيل غير صحيح، يرجى التأكد من الأرقام الستة وإعادة المحاولة.');
      }
    }

    // Mark user as verified in DB and localStorage
    const users = await FirebaseService.getUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (user) {
      user.isVerified = true;
      await FirebaseService.saveUser(user);
    }

    // Clean up
    localStorage.removeItem(`otp_${cleanEmail}`);
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
