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
   * Seamlessly falls back to local OTP if server is unavailable or returns an error.
   */
  async sendOtpCode(email: string): Promise<{ email: string; sentViaRealApi: boolean; apiDeliveryMethod?: string; fallbackCode?: string; previewUrl?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const localCode = Math.floor(100000 + Math.random() * 900000).toString();

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('local_otp_' + cleanEmail, localCode);
      } catch (e) {}
    }

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });

      if (res.ok) {
        const text = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch (e) {}

        if (data.success) {
          if (data.otpToken && typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('otp_token_' + cleanEmail, data.otpToken);
            } catch (e) {}
          }

          if (data.fallbackCode && typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('local_otp_' + cleanEmail, data.fallbackCode);
            } catch (e) {}
          }

          return {
            email: cleanEmail,
            sentViaRealApi: true,
            apiDeliveryMethod: data.apiDeliveryMethod,
            fallbackCode: data.fallbackCode || localCode,
            previewUrl: data.previewUrl
          };
        }
      }
    } catch (netErr) {
      console.warn('Network or server error during send-otp, using local OTP fallback:', netErr);
    }

    // Fallback if server returned non-ok status or network failed
    return {
      email: cleanEmail,
      sentViaRealApi: false,
      apiDeliveryMethod: 'كود التفعيل محلياً (وضع التطوير)',
      fallbackCode: localCode
    };
  },

  /**
   * Verifies the 6-digit OTP code using server API with client fallback.
   */
  async verifyOtpCode(email: string, inputCode: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = inputCode.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      throw new Error('يرجى إدخال كود تفعيل مكون من 6 أرقام.');
    }

    let localCode = '';
    let otpToken = '';
    if (typeof window !== 'undefined') {
      try {
        localCode = sessionStorage.getItem('local_otp_' + cleanEmail) || '';
        otpToken = sessionStorage.getItem('otp_token_' + cleanEmail) || '';
      } catch (e) {}
    }

    // Direct local check if code matches generated local code
    if (localCode && cleanCode === localCode) {
      const users = await FirebaseService.getUsers();
      const existingUser = users.find(u => u.email.toLowerCase() === cleanEmail);
      if (existingUser) {
        existingUser.isVerified = true;
        await FirebaseService.saveUser(existingUser);
      }
      return true;
    }

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode, otpToken })
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (e) {}

      if (res.ok && data.success) {
        const users = await FirebaseService.getUsers();
        const existingUser = users.find(u => u.email.toLowerCase() === cleanEmail);
        if (existingUser) {
          existingUser.isVerified = true;
          await FirebaseService.saveUser(existingUser);
        }
        return true;
      }

      if (data && data.error && typeof data.error === 'string') {
        throw new Error(data.error);
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('JSON')) {
        throw err;
      }
    }

    // Final check for local code fallback
    if (localCode && cleanCode === localCode) {
      const users = await FirebaseService.getUsers();
      const existingUser = users.find(u => u.email.toLowerCase() === cleanEmail);
      if (existingUser) {
        existingUser.isVerified = true;
        await FirebaseService.saveUser(existingUser);
      }
      return true;
    }

    throw new Error('كود التفعيل غير صحيح أو انتهت صلاحيته. يرجى طلب كود جديد.');
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
