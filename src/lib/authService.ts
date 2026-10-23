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
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { FirebaseService } from './firebase';
import { User } from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const ADMIN_EMAILS = [
  'fares.m.alamoudi@gmail.com',
  'admin@m-estably.com',
  'x24.akar@gmail.com',
  'x2.sharshar@gmail.com',
  'mfc@m-estably.com',
  'mfc'
];

export function isSystemAdminEmail(emailOrNickname?: string): boolean {
  if (!emailOrNickname) return false;
  const clean = emailOrNickname.trim().toLowerCase();
  return ADMIN_EMAILS.includes(clean) || clean.endsWith('@m-estably.com') || clean === 'mfc' || clean === 'admin';
}

export function normalizePhone(rawPhone?: string): string {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  if (cleaned.startsWith('00')) cleaned = cleaned.slice(2);

  // Saudi Arabia prefix: 05xxxxxxxx -> 9665xxxxxxxx, or 5xxxxxxxx -> 9665xxxxxxxx
  if (/^05\d{8}$/.test(cleaned)) {
    cleaned = '966' + cleaned.slice(1);
  } else if (/^5\d{8}$/.test(cleaned)) {
    cleaned = '966' + cleaned;
  }
  // Egypt prefix: 010..., 011..., 012..., 015... (11 digits: 01xxxxxxxxx) -> 201xxxxxxxxx
  else if (/^01[0125]\d{8}$/.test(cleaned)) {
    cleaned = '20' + cleaned.slice(1);
  } else if (/^1[0125]\d{8}$/.test(cleaned)) {
    cleaned = '20' + cleaned;
  }
  // UAE prefix: 050..., 052..., 054..., 055..., 056..., 058... -> 9715xxxxxxxx
  else if (/^05[024568]\d{7}$/.test(cleaned)) {
    cleaned = '971' + cleaned.slice(1);
  }
  // Kuwait: 8 digits starting with 5, 6, 9 -> 965xxxxxxxx
  else if (/^[569]\d{7}$/.test(cleaned)) {
    cleaned = '965' + cleaned;
  }
  // Qatar: 8 digits starting with 3, 5, 6, 7 -> 974xxxxxxxx
  else if (/^[3567]\d{7}$/.test(cleaned)) {
    cleaned = '974' + cleaned;
  }
  // Bahrain: 8 digits -> 973xxxxxxxx
  else if (/^[369]\d{7}$/.test(cleaned)) {
    cleaned = '973' + cleaned;
  }
  // Jordan: 07[789]xxxxxxx -> 9627xxxxxxxx
  else if (/^07[789]\d{7}$/.test(cleaned)) {
    cleaned = '962' + cleaned.slice(1);
  } else if (cleaned.startsWith('0') && cleaned.length >= 9) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'temp-mail.io',
  'guerrillamail.com', 'yopmail.com', 'sharklasers.com', 'trashmail.com', 'getnada.com',
  'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'mytemp.email', 'inboxkitten.com',
  'mohmal.com', 'throwawaymail.com', 'emailondeck.com', 'burnermail.io', 'generator.email',
  'crazymailing.com', 'dropmail.me', 'getairmail.com', 'nada.ltd', 'minuteinbox.com',
  'test.com', 'example.com', 'fake.com', 'asdf.com', 'none.com', 'noemail.com',
  'sample.com', 'domain.com', 'foo.com', 'bar.com', 'invalid.com', 'temporary.com',
  'mailcatch.com', 'mytempemail.com', 'throwaway.com'
]);

export function validateRealEmail(rawEmail?: string): { isValid: boolean; error?: string } {
  if (!rawEmail || !rawEmail.trim()) {
    return { isValid: false, error: 'يرجى إدخال البريد الإلكتروني.' };
  }
  const email = rawEmail.trim().toLowerCase();

  // 1. No spaces or Arabic letters
  if (/[\s\u0600-\u06FF]/.test(email)) {
    return { isValid: false, error: 'يجب أن يُكتب البريد الإلكتروني بحروف إنجليزية وبدون أي مسافات.' };
  }

  // 2. Strict RFC email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'صيغة البريد الإلكتروني غير صحيحة (مثال: name@gmail.com).' };
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'البريد الإلكتروني يجب أن يحتوي على علامة @ واحدة فقط.' };
  }

  const [username, domain] = parts;

  // 3. Username length & patterns
  if (username.length < 2) {
    return { isValid: false, error: 'اسم المستخدم في البريد الإلكتروني قصير جداً (حرفان على الأقل قبل @).' };
  }

  const dummyUsernames = ['test', 'asdf', 'fake', 'none', 'dummy', 'temp', '123', '12345', 'aaa', 'abc', 'xyz', 'noemail'];
  if (dummyUsernames.includes(username)) {
    return { isValid: false, error: 'يرجى إدخال بريد إلكتروني حقيقي وشخصي وليس اسماً وهمياً أو تجريبياً.' };
  }

  // 4. Domain & TLD checks
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { isValid: false, error: 'نطاق البريد الإلكتروني غير مكتمل (يجب أن يحتوي على نقطة مثل .com).' };
  }

  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
    return { isValid: false, error: 'امتداد نطاق البريد غير صالح (يجب أن ينتهي بـ .com أو .net أو كود دولة).' };
  }

  // 5. Disposable / fake domains
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { isValid: false, error: 'نطاق البريد المدخل يعتبر بريداً مؤقتاً أو وهمياً. يرجى إدخال بريدك الحقيقي الدائم (مثل Gmail أو Outlook أو Yahoo).' };
  }

  // 6. Username and domain should not be identical
  if (username === domainParts[0]) {
    return { isValid: false, error: 'البريد الإلكتروني يبدو وهمياً. يرجى كتابة بريدك الإلكتروني الحقيقي.' };
  }

  return { isValid: true };
}

export interface SendOtpParams {
  email: string;
  phone?: string;
  method?: 'email' | 'whatsapp';
}

export interface SendOtpResponse {
  email: string;
  phone?: string;
  method?: 'email' | 'whatsapp';
  sentViaRealApi: boolean;
  apiDeliveryMethod?: string;
  fallbackCode?: string;
  previewUrl?: string;
  whatsappUrl?: string;
  whatsappWebUrl?: string;
  whatsappMessage?: string;
}

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
    const cleanNick = data.nickname.trim().toLowerCase();

    // Verify email validity
    const emailValidation = validateRealEmail(cleanEmail);
    if (!emailValidation.isValid) {
      throw new Error(emailValidation.error || 'البريد الإلكتروني غير صالح، يرجى إدخال بريد إلكتروني حقيقي.');
    }

    const users = await FirebaseService.getUsers();
    const existingByEmail = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existingByEmail && existingByEmail.isVerified) {
      throw new Error('البريد الإلكتروني مسجل ومفعل بالفعل في النظام. يرجى تسجيل الدخول مباشرة.');
    }

    const existingByNick = users.find((u) => u.nickname.toLowerCase() === cleanNick);
    if (existingByNick && existingByNick.isVerified && existingByNick.email.toLowerCase() !== cleanEmail) {
      throw new Error('الاسم المستعار مستخدم بالفعل من قبل عضو آخر، يرجى اختيار اسم آخر.');
    }

    const newUser: User = {
      id: existingByEmail ? existingByEmail.id : ('usr_' + Date.now()),
      name: data.name.trim(),
      email: cleanEmail,
      phone: data.phone.trim(),
      nickname: data.nickname.trim(),
      password: data.password,
      role: isSystemAdminEmail(cleanEmail) || isSystemAdminEmail(data.nickname) ? 'admin' : 'user',
      isVerified: false,
      createdAt: new Date().toISOString(),
    };

    return newUser;
  },

  /**
   * Returns the cached active OTP code for this email or phone if available.
   */
  getLatestOtpCode(emailOrPhone: string): string {
    if (!emailOrPhone) return '';
    const clean = emailOrPhone.trim().toLowerCase();
    const cleanP = normalizePhone(emailOrPhone);
    if (typeof window !== 'undefined') {
      try {
        return (
          sessionStorage.getItem('local_otp_' + clean) ||
          (cleanP ? sessionStorage.getItem('local_otp_' + cleanP) : '') ||
          ''
        );
      } catch (e) {}
    }
    return '';
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
   * Generates and dispatches a 6-digit OTP code via email or WhatsApp.
   */
  async sendOtpCode(
    target: string | SendOtpParams,
    optionalPhone?: string,
    optionalMethod: 'email' | 'whatsapp' = 'email'
  ): Promise<SendOtpResponse> {
    const cleanEmail = typeof target === 'string' ? target.trim().toLowerCase() : target.email.trim().toLowerCase();
    const rawPhone = typeof target === 'string' ? optionalPhone : (target.phone || optionalPhone);
    const cleanPhone = normalizePhone(rawPhone);
    const method = typeof target === 'string' ? optionalMethod : (target.method || optionalMethod);
    const isWhatsApp = method === 'whatsapp' || (!cleanEmail && Boolean(cleanPhone));

    const localCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Cache locally
    if (typeof window !== 'undefined') {
      try {
        if (cleanEmail) sessionStorage.setItem('local_otp_' + cleanEmail, localCode);
        if (cleanPhone) sessionStorage.setItem('local_otp_' + cleanPhone, localCode);
      } catch (e) {}
    }

    const defaultWhatsappMsg = `🐎 منصة إستابلي للخيول العربية الأصيلة\nرمز تفعيل حسابك (OTP) هو: *${localCode}*\n\nالرمز صالح لمدة 10 دقائق لتأكيد رقم هاتفك وتفعيل اشتراكك في المنصة.`;
    const encodedDefaultMsg = encodeURIComponent(defaultWhatsappMsg);
    const defaultWhatsappUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedDefaultMsg}`
      : '';
    const defaultWhatsappWebUrl = cleanPhone
      ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedDefaultMsg}`
      : '';

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: cleanEmail, 
          phone: cleanPhone, 
          method: isWhatsApp ? 'whatsapp' : 'email' 
        })
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
              if (cleanEmail) sessionStorage.setItem('otp_token_' + cleanEmail, data.otpToken);
              if (cleanPhone) sessionStorage.setItem('otp_token_' + cleanPhone, data.otpToken);
            } catch (e) {}
          }

          const activeCode = data.fallbackCode || data.code || localCode;
          if (activeCode && typeof window !== 'undefined') {
            try {
              if (cleanEmail) sessionStorage.setItem('local_otp_' + cleanEmail, activeCode);
              if (cleanPhone) sessionStorage.setItem('local_otp_' + cleanPhone, activeCode);
            } catch (e) {}
          }

          const isReal = data.apiDeliveryMethod && !data.apiDeliveryMethod.includes('محلياً');
          return {
            email: cleanEmail,
            phone: cleanPhone,
            method: isWhatsApp ? 'whatsapp' : 'email',
            sentViaRealApi: Boolean(isReal),
            apiDeliveryMethod: data.apiDeliveryMethod,
            fallbackCode: activeCode,
            previewUrl: data.previewUrl,
            whatsappUrl: data.whatsappUrl || defaultWhatsappUrl,
            whatsappWebUrl: data.whatsappWebUrl || defaultWhatsappWebUrl,
            whatsappMessage: data.whatsappMessage || defaultWhatsappMsg
          };
        }
      }
    } catch (netErr) {
      console.warn('Network or server error during send-otp, using fallback:', netErr);
    }

    // Fallback response
    return {
      email: cleanEmail,
      phone: cleanPhone,
      method: isWhatsApp ? 'whatsapp' : 'email',
      sentViaRealApi: isWhatsApp,
      apiDeliveryMethod: isWhatsApp ? 'واتساب (WhatsApp OTP)' : 'كود التفعيل محلياً (وضع التطوير)',
      fallbackCode: localCode,
      whatsappUrl: defaultWhatsappUrl,
      whatsappWebUrl: defaultWhatsappWebUrl,
      whatsappMessage: defaultWhatsappMsg
    };
  },

  /**
   * Verifies the 6-digit OTP code using server API with client fallback.
   * Supports email or phone number verification.
   */
  async verifyOtpCode(emailOrPhone: string, inputCode: string, optionalPhone?: string): Promise<boolean> {
    const cleanEmail = emailOrPhone.includes('@') ? emailOrPhone.trim().toLowerCase() : '';
    const cleanPhone = normalizePhone(optionalPhone || (!emailOrPhone.includes('@') ? emailOrPhone : ''));
    const cleanCode = inputCode.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      throw new Error('يرجى إدخال كود تفعيل مكون من 6 أرقام.');
    }

    let localCode = '';
    let otpToken = '';
    if (typeof window !== 'undefined') {
      try {
        if (cleanEmail) {
          localCode = sessionStorage.getItem('local_otp_' + cleanEmail) || localCode;
          otpToken = sessionStorage.getItem('otp_token_' + cleanEmail) || otpToken;
        }
        if (cleanPhone) {
          localCode = sessionStorage.getItem('local_otp_' + cleanPhone) || localCode;
          otpToken = sessionStorage.getItem('otp_token_' + cleanPhone) || otpToken;
        }
      } catch (e) {}
    }

    // Direct local check if code matches generated local code
    if (localCode && cleanCode === localCode) {
      const users = await FirebaseService.getUsers();
      const existingUser = users.find(u => 
        (cleanEmail && u.email.toLowerCase() === cleanEmail) ||
        (cleanPhone && normalizePhone(u.phone) === cleanPhone)
      );
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
        body: JSON.stringify({ 
          email: cleanEmail, 
          phone: cleanPhone, 
          code: cleanCode, 
          otpToken 
        })
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (e) {}

      if (res.ok && data.success) {
        const users = await FirebaseService.getUsers();
        const existingUser = users.find(u => 
          (cleanEmail && u.email.toLowerCase() === cleanEmail) ||
          (cleanPhone && normalizePhone(u.phone) === cleanPhone)
        );
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
      const existingUser = users.find(u => 
        (cleanEmail && u.email.toLowerCase() === cleanEmail) ||
        (cleanPhone && normalizePhone(u.phone) === cleanPhone)
      );
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

    // Instant master login for admin mfc / password 1155
    if ((cleanIdentifier === 'mfc' || cleanIdentifier === 'mfc@m-estably.com') && pass.trim() === '1155') {
      const mfcAdminUser: User = {
        id: 'admin_mfc',
        name: 'المدير العام (MFC)',
        email: 'mfc@m-estably.com',
        phone: '0559595055',
        nickname: 'mfc',
        password: '1155',
        role: 'admin',
        isVerified: true,
        createdAt: '2026-08-19T00:00:00.000Z',
      };
      // Persist to database & storage
      try {
        await FirebaseService.saveUser(mfcAdminUser);
      } catch (e) {
        console.warn('Could not save mfc user to Firebase', e);
      }
      return { user: mfcAdminUser, isVerified: true };
    }
    
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

    if (isSystemAdminEmail(cleanIdentifier) || (targetUser && isSystemAdminEmail(targetUser.email))) {
      targetUser.role = 'admin';
    }

    // Determine verification status
    const isVerified = fbUserVerified || targetUser.isVerified === true;

    if (!isVerified) {
      return { user: targetUser, isVerified: false };
    }

    // Update verified flag in DB if it was previously false
    if (!targetUser.isVerified || targetUser.role === 'admin') {
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
  },

  /**
   * Login or Register via Google Popup using Firebase Auth
   */
  async loginWithGoogle(): Promise<{ user: User; isNewUser: boolean }> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    const result = await signInWithPopup(auth, provider);
    const fbUser = result.user;
    
    if (!fbUser.email) {
      throw new Error('تعذر الحصول على البريد الإلكتروني لحساب Google.');
    }

    const cleanEmail = fbUser.email.trim().toLowerCase();
    const users = await FirebaseService.getUsers();
    let existingUser = users.find(u => u.email.toLowerCase() === cleanEmail);
    const isNewUser = !existingUser;

    if (!existingUser) {
      // Create new profile for Google user
      existingUser = {
        id: fbUser.uid || ('usr_g_' + Date.now()),
        name: fbUser.displayName || cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: fbUser.phoneNumber || '',
        nickname: (fbUser.displayName || cleanEmail.split('@')[0]).replace(/\s+/g, '_').toLowerCase(),
        avatar: fbUser.photoURL || undefined,
        password: '',
        role: isSystemAdminEmail(cleanEmail) ? 'admin' : 'user',
        authProvider: 'google',
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
    } else {
      // Preserve custom profile edits while granting admin to system admin emails
      existingUser.authProvider = 'google';
      existingUser.isVerified = true;
      existingUser.role = isSystemAdminEmail(cleanEmail) ? 'admin' : 'user';
      if (!existingUser.avatar && fbUser.photoURL) {
        existingUser.avatar = fbUser.photoURL;
      }
      if (!existingUser.phone && fbUser.phoneNumber) {
        existingUser.phone = fbUser.phoneNumber;
      }
      await FirebaseService.saveUser(existingUser);
    }

    if (existingUser.isSuspended) {
      throw new Error('تم إيقاف هذا الحساب من قِبل الإدارة. يرجى التواصل مع الدعم الفني.');
    }

    return { user: existingUser, isNewUser };
  },

  async confirmNewGoogleUser(user: User): Promise<User> {
    await FirebaseService.saveUser(user);
    return user;
  }
};
