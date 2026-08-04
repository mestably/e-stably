/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react';
import { Eye, EyeOff, User as UserIcon, Mail, Phone, Lock, Sparkles, CheckCircle, XCircle, AlertCircle, RefreshCw, Send, KeyRound } from 'lucide-react';
import { User } from '../types';
import { FirebaseService } from '../lib/firebase';
import { AuthService } from '../lib/authService';
import { googleDriveSignIn } from '../lib/drive';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  
  // Registration Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Login Fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // UI & Activation states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pending Activation State & 6-Digit OTP
  const [pendingVerificationUser, setPendingVerificationUser] = useState<User | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [lastSentOtpCode, setLastSentOtpCode] = useState<string>('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Input refs for OTP 6-digits auto-advance
  const otpInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  // Cooldown timer for resending email code
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus first OTP input when activation screen opens
  useEffect(() => {
    if (pendingVerificationUser) {
      setTimeout(() => {
        otpInputRefs[0].current?.focus();
      }, 100);
    }
  }, [pendingVerificationUser]);

  // Auto check nickname availability when input changes
  useEffect(() => {
    if (!nickname || nickname.length < 3) {
      setNicknameAvailable(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsCheckingNickname(true);
      setError('');
      try {
        const users = await FirebaseService.getUsers();
        const exists = users.some((u) => u.nickname.toLowerCase() === nickname.trim().toLowerCase());
        setNicknameAvailable(!exists);
      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingNickname(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [nickname]);

  if (!isOpen) return null;

  // Validate password strength (at least 8 chars, containing letters and numbers)
  const validatePassword = (pass: string) => {
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasArabicLetters = /[\u0600-\u06FF]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    return pass.length >= 8 && (hasLetters || hasArabicLetters) && hasNumbers;
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || !phone || !nickname || !password || !confirmPassword) {
      setError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    if (nicknameAvailable === false) {
      setError('الاسم المستعار غير متاح، يرجى اختيار اسم آخر.');
      return;
    }

    if (!validatePassword(password)) {
      setError('يجب أن تتكون كلمة السر من حروف وأرقام وألا تقل عن 8 خانات.');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا السر غير متطابقتين.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Prepare user structure (does NOT save user to DB until verified!)
      const newUserPayload = await AuthService.prepareRegistration({
        name,
        email,
        phone,
        nickname,
        password,
      });

      // 2. Send real OTP email
      await AuthService.sendOtpCode(newUserPayload.email);

      // 3. Set pending user state & switch to 6-digit OTP activation screen
      setPendingVerificationUser(newUserPayload);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccess(`أرسلنا كود تفعيل مكون من 6 أرقام إلى بريدك الإلكتروني: ${newUserPayload.email}`);
      setResendCooldown(60);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء إرسال كود التفعيل عبر البريد الإلكتروني، يرجى المحاولة لاحقاً.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    // Handle paste of full 6 digit code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = ['', '', '', '', '', ''];
      digits.forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtpDigits(newOtp);
      const focusIdx = Math.min(digits.length, 5);
      otpInputRefs[focusIdx].current?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otpDigits];
    newOtp[index] = digit;
    setOtpDigits(newOtp);

    // Auto-advance focus to next field
    if (digit && index < 5) {
      otpInputRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs[index - 1].current?.focus();
    }
  };

  const handleVerifyOtp = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!pendingVerificationUser) return;

    const fullCode = otpDigits.join('');
    if (fullCode.length !== 6) {
      setError('يرجى إدخال كود التفعيل المكون من 6 أرقام كاملاً.');
      return;
    }

    setIsVerifyingOtp(true);
    setError('');
    setSuccess('');

    try {
      // 1. Verify code via server API
      await AuthService.verifyOtpCode(pendingVerificationUser.email, fullCode);

      // 2. Save user to database ONLY after real activation succeeds
      const verifiedUser: User = { 
        ...pendingVerificationUser, 
        isVerified: true 
      };
      await FirebaseService.saveUser(verifiedUser);
      
      setSuccess('تهانينا! تم التفعيل وإنشاء الحساب بنجاح. جاري تسجيل الدخول...');
      setTimeout(() => {
        onAuthSuccess(verifiedUser);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'كود التفعيل غير صحيح أو انتهت صلاحيته.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !pendingVerificationUser) return;
    setError('');
    setSuccess('');

    try {
      await AuthService.sendOtpCode(pendingVerificationUser.email);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccess(`تم إعادة إرسال كود التفعيل (6 أرقام) إلى بريدك الإلكتروني: ${pendingVerificationUser.email}`);
      setResendCooldown(60);
      otpInputRefs[0].current?.focus();
    } catch (err: any) {
      setError(err.message || 'تعذر إعادة إرسال الكود، يرجى التأكد من البريد والمحاولة لاحقاً.');
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!loginEmail || !loginPassword) {
      setError('يرجى إدخال الاسم المستعار، الهاتف أو البريد الإلكتروني مع كلمة السر.');
      return;
    }

    setIsLoading(true);

    try {
      const { user, isVerified } = await AuthService.loginUser(loginEmail, loginPassword);

      if (!isVerified) {
        // Send a fresh OTP and prompt activation view
        await AuthService.sendOtpCode(user.email);
        setPendingVerificationUser(user);
        setOtpDigits(['', '', '', '', '', '']);
        setResendCooldown(60);
        setError(`حسابك غير مفعل بعد. أرسلنا كود تفعيل مكون من 6 أرقام إلى بريدك الإلكتروني (${user.email}). يرجى إدخاله لتفعيل الحساب.`);
        setIsLoading(false);
        return;
      }

      onAuthSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await googleDriveSignIn();
      if (result && result.user) {
        const googleUser: User = {
          id: result.user.uid || ('g_user_' + Date.now()),
          name: result.user.displayName || 'مستخدم Google',
          email: result.user.email || 'google.user@gmail.com',
          phone: result.user.phoneNumber || '0555612055',
          nickname: (result.user.email ? result.user.email.split('@')[0] : 'google_user'),
          role: 'user',
          isVerified: true,
          createdAt: new Date().toISOString()
        };
        await FirebaseService.saveUser(googleUser);
        onAuthSuccess(googleUser);
        onClose();
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request' || err?.message?.includes('popup-closed-by-user')) {
        setError('');
        return;
      }
      setError('تعذر الدخول عن طريق Google حالياً.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header Tabs */}
        {!pendingVerificationUser && (
          <div className="flex border-b border-slate-100 bg-slate-50">
            <button
              onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
              className={`flex-1 py-4 text-center text-sm font-semibold transition-all cursor-pointer ${
                isLogin 
                  ? 'bg-white text-navy border-b-2 border-navy font-bold' 
                  : 'text-slate-500 hover:text-navy hover:bg-slate-100/50'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
              className={`flex-1 py-4 text-center text-sm font-semibold transition-all cursor-pointer ${
                !isLogin 
                  ? 'bg-white text-navy border-b-2 border-navy font-bold' 
                  : 'text-slate-500 hover:text-navy hover:bg-slate-100/50'
              }`}
            >
              اشتراك جديد
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-r-4 border-red-500 text-red-700 text-xs rounded-xl flex items-start gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border-r-4 border-green-500 text-green-700 text-xs rounded-xl flex items-start gap-2 shadow-xs">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* --- 6-DIGIT OTP ACTIVATION VIEW --- */}
          {pendingVerificationUser ? (
            <div className="py-2 space-y-5 text-center">
              <div className="w-16 h-16 bg-navy/10 text-navy rounded-full flex items-center justify-center mx-auto border border-navy/20 relative shadow-inner">
                <KeyRound className="w-8 h-8 text-navy" />
                <span className="absolute -top-1 -right-1 bg-gold text-white font-extrabold text-[10px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  OTP
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-base text-slate-800">أدخل كود التفعيل المكون من 6 أرقام</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  تم إرسال كود التفعيل الفعلي إلى بريدك الإلكتروني:<br />
                  <strong className="text-navy font-bold text-sm bg-slate-100 px-3 py-1 rounded-lg inline-block mt-1 font-mono" dir="ltr">
                    {pendingVerificationUser.email}
                  </strong>
                </p>
              </div>

              {/* 6 OTP Input Boxes */}
              <form onSubmit={handleVerifyOtp} className="space-y-4 pt-1">
                <div className="flex justify-center items-center gap-2" dir="ltr">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={otpInputRefs[idx]}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`w-11 h-13 text-center text-xl font-bold font-mono border-2 rounded-xl focus:outline-none transition-all ${
                        digit ? 'border-navy bg-navy/5 text-navy' : 'border-slate-200 focus:border-navy focus:bg-slate-50'
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpDigits.join('').length !== 6}
                  className="w-full bg-navy hover:bg-navy-dark text-white font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 mt-4"
                >
                  {isVerifyingOtp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-gold" />
                      <span>جاري التحقق من الكود...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-gold" />
                      <span>تأكيد وتفعيل الحساب</span>
                    </>
                  )}
                </button>
              </form>

              {/* Resend Code Button & Timer */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <p className="text-xs text-slate-500">لم يصلك كود التفعيل؟</p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {resendCooldown > 0 
                      ? `إعادة إرسال الكود خلال (${resendCooldown} ثانية)` 
                      : 'إعادة إرسال كود التفعيل الآن'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPendingVerificationUser(null);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 underline pt-1 block mx-auto"
                >
                  العودة لتسجيل الدخول
                </button>
              </div>
            </div>
          ) : isLogin ? (
            // --- LOGIN FORM ---
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">الاسم المستعار، الهاتف أو البريد الإلكتروني</label>
                <div className="relative">
                  <UserIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="اسم المستخدم أو الهاتف أو الإيميل"
                    className="w-full text-sm pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy text-right"
                    dir="rtl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">كلمة السر</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm pl-12 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3 text-slate-400 hover:text-navy"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-navy hover:bg-navy-dark text-white font-semibold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}</span>
              </button>

              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                <span className="relative bg-white px-3 text-xs text-slate-400">أو دخول سريع</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.64l3.15-3.15C17.45 1.68 14.93 1 12 1 7.35 1 3.39 3.65 1.48 7.54l3.75 2.91C6.18 7.37 8.87 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.73-4.91 3.73-8.6z" />
                  <path fill="#FBBC05" d="M5.23 10.45c-.24-.73-.38-1.51-.38-2.32 0-.81.14-1.59.38-2.32L1.48 6.9C.54 8.75 0 10.82 0 13s.54 4.25 1.48 6.1l3.75-2.91c-.24-.74-.38-1.52-.38-2.32c0-.74.14-1.46.38-1.42z" />
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.03.69-2.35 1.1-4.26 1.1-3.13 0-5.82-2.33-6.77-5.41L1.48 15.82C3.39 19.71 7.35 23 12 23z" />
                </svg>
                <span>الدخول السريع باستخدام Google</span>
              </button>
            </form>
          ) : (
            // --- REGISTRATION FORM ---
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">الاسم الكامل</label>
                <div className="relative">
                  <UserIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: محمد الحربي"
                    required
                    className="w-full text-sm pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">البريد الإلكتروني الحقيقي (للتفعيل)</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    required
                    className="w-full text-sm pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">رقم الهاتف للتواصل</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثال: 0559595055"
                    required
                    className="w-full text-sm pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-600">الاسم المستعار (اسم المستخدم)</label>
                  {isCheckingNickname && <span className="text-[10px] text-slate-400 animate-pulse">جاري التحقق...</span>}
                  {nickname && !isCheckingNickname && nicknameAvailable === true && (
                    <span className="text-[10px] text-green-600 flex items-center gap-1 font-semibold">
                      <CheckCircle className="w-3 h-3" /> متاح للاستخدام
                    </span>
                  )}
                  {nickname && !isCheckingNickname && nicknameAvailable === false && (
                    <span className="text-[10px] text-red-600 flex items-center gap-1 font-semibold">
                      <XCircle className="w-3 h-3" /> غير متاح
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Sparkles className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.replace(/\s+/g, ''))}
                    placeholder="nickname_99"
                    required
                    className={`w-full text-sm pl-4 pr-10 py-2.5 border rounded-xl focus:outline-none ${
                      nicknameAvailable === true ? 'border-green-300 focus:border-green-500' :
                      nicknameAvailable === false ? 'border-red-300 focus:border-red-500' :
                      'border-slate-200 focus:border-navy'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">كلمة السر (حروف وأرقام، لا تقل عن 8 خانات)</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أرقام وحروف مدمجة"
                    required
                    className="w-full text-sm pl-12 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3 text-slate-400 hover:text-navy"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">تأكيد كلمة السر</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="إعادة إدخال كلمة السر"
                    required
                    className="w-full text-sm pl-12 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-3 text-slate-400 hover:text-navy"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-navy hover:bg-navy-dark text-white font-semibold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب وإرسال كود التفعيل (OTP)'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => {
              setPendingVerificationUser(null);
              onClose();
            }}
            className="text-slate-500 hover:text-navy font-semibold text-xs py-1 px-3 cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
}
