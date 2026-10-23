/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react';
import { 
  Eye, 
  EyeOff, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Lock, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Send, 
  KeyRound, 
  MessageSquare, 
  Smartphone 
} from 'lucide-react';
import { User } from '../types';
import { FirebaseService } from '../lib/firebase';
import { AuthService, SendOtpResponse, normalizePhone, validateRealEmail } from '../lib/authService';
import { googleDriveSignIn } from '../lib/drive';
import NewSubscriberTermsView from './NewSubscriberTermsView';

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

  // Terms agreement state for new subscribers & Google registration
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);
  const [pendingGoogleNewUser, setPendingGoogleNewUser] = useState<User | null>(null);
  const [isFinalizingGoogle, setIsFinalizingGoogle] = useState(false);

  // Preferred activation method: 'whatsapp' or 'email'
  const [preferredMethod, setPreferredMethod] = useState<'whatsapp' | 'email'>('whatsapp');
  const [activeOtpMethod, setActiveOtpMethod] = useState<'whatsapp' | 'email'>('whatsapp');

  // Pending Activation State & 6-Digit OTP
  const [pendingVerificationUser, setPendingVerificationUser] = useState<User | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [lastSentOtpCode, setLastSentOtpCode] = useState<string>('');
  const [lastOtpResult, setLastOtpResult] = useState<SendOtpResponse | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showDirectCode, setShowDirectCode] = useState(false);

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

  // Validate password strength: at least 8 chars, numbers, uppercase letter (A-Z), and symbol
  const validatePassword = (pass: string) => {
    const hasMinLength = pass.length >= 8;
    const hasNumbers = /[0-9]/.test(pass);
    const hasUpper = /[A-Z]/.test(pass);
    const hasSymbol = /[^a-zA-Z0-9\u0600-\u06FF\s]/.test(pass);
    return hasMinLength && hasNumbers && hasUpper && hasSymbol;
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || !phone || !nickname || !password || !confirmPassword) {
      setError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    const trimmedName = name.trim();
    const nameParts = trimmedName.split(/\s+/).filter(Boolean);

    if (trimmedName.length < 10) {
      setError('يجب ألا يقل الاسم بالكامل عن 10 أحرف.');
      return;
    }

    if (nameParts.length < 2) {
      setError('يجب أن يحتوي الاسم على مسافة ومسافات بحيث يشتمل على اسم الأب والجد (اسم ثلاثي على الأقل).');
      return;
    }

    const emailCheck = validateRealEmail(email);
    if (!emailCheck.isValid) {
      setError(emailCheck.error || 'يرجى إدخال بريد إلكتروني حقيقي ونشط.');
      return;
    }

    if (nicknameAvailable === false) {
      setError('الاسم المستعار غير متاح، يرجى اختيار اسم آخر.');
      return;
    }

    if (!validatePassword(password)) {
      setError('يجب أن تتكون كلمة السر من 8 خانات على الأقل (حروف وأرقام)، وتتضمن حرفاً كبيراً (Capital A-Z) ورمزاً خاصاً.');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا السر غير متطابقتين.');
      return;
    }

    if (preferredMethod === 'whatsapp' && phone.trim().length < 8) {
      setError('يرجى إدخال رقم هاتف صحيح (مثل: 0559595055) لتفعيل الحساب واستلام كود الواتساب.');
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

      // 2. Send real OTP via chosen method (whatsapp or email)
      const otpRes = await AuthService.sendOtpCode({
        email: newUserPayload.email,
        phone: newUserPayload.phone,
        method: preferredMethod
      });
      setLastOtpResult(otpRes);
      setActiveOtpMethod(preferredMethod);
      if (otpRes.fallbackCode) {
        setLastSentOtpCode(otpRes.fallbackCode);
      }

      // 3. Set pending user state & switch to 6-digit OTP activation screen
      setPendingVerificationUser(newUserPayload);
      setOtpDigits(['', '', '', '', '', '']);
      if (preferredMethod === 'whatsapp') {
        setSuccess(`تم تجهيز وإرسال كود التفعيل المكون من 6 أرقام إلى رقمك على الواتساب: ${newUserPayload.phone}`);
      } else if (otpRes.sentViaRealApi) {
        setSuccess(`أرسلنا كود تفعيل مكون من 6 أرقام إلى بريدك الإلكتروني: ${newUserPayload.email}`);
      } else {
        setSuccess(`تم إصدار كود التفعيل المباشر لتفعيل حسابك.`);
      }
      setResendCooldown(60);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء إرسال كود التفعيل، يرجى المحاولة لاحقاً.');
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
      // 1. Verify code via server API (passing email and phone)
      await AuthService.verifyOtpCode(
        pendingVerificationUser.email, 
        fullCode, 
        pendingVerificationUser.phone
      );

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

  const handleResendOtp = async (targetMethod?: 'whatsapp' | 'email') => {
    if (resendCooldown > 0 || !pendingVerificationUser) return;
    const methodToUse = targetMethod || activeOtpMethod;
    setError('');
    setSuccess('');
    setShowDirectCode(false);

    try {
      const otpRes = await AuthService.sendOtpCode({
        email: pendingVerificationUser.email,
        phone: pendingVerificationUser.phone,
        method: methodToUse
      });
      setLastOtpResult(otpRes);
      setActiveOtpMethod(methodToUse);
      if (otpRes.fallbackCode) {
        setLastSentOtpCode(otpRes.fallbackCode);
      }
      setOtpDigits(['', '', '', '', '', '']);
      if (methodToUse === 'whatsapp') {
        setSuccess(`تم إعادة إرسال كود التفعيل إلى رقمك عبر الواتساب: ${pendingVerificationUser.phone}`);
      } else {
        setSuccess(`تم إعادة إرسال كود التفعيل إلى بريدك الإلكتروني: ${pendingVerificationUser.email}`);
      }
      setResendCooldown(60);
      otpInputRefs[0].current?.focus();
    } catch (err: any) {
      setError(err.message || 'تعذر إعادة إرسال الكود، يرجى التأكد من البيانات والمحاولة لاحقاً.');
    }
  };

  const handleSwitchOtpMethod = async (newMethod: 'whatsapp' | 'email') => {
    if (!pendingVerificationUser) return;
    setActiveOtpMethod(newMethod);
    setError('');
    setShowDirectCode(false);

    try {
      const otpRes = await AuthService.sendOtpCode({
        email: pendingVerificationUser.email,
        phone: pendingVerificationUser.phone,
        method: newMethod
      });
      setLastOtpResult(otpRes);
      if (otpRes.fallbackCode) {
        setLastSentOtpCode(otpRes.fallbackCode);
      }
      if (newMethod === 'whatsapp') {
        setSuccess(`تم تحويل التفعيل إلى الواتساب على رقمك: ${pendingVerificationUser.phone}`);
      } else {
        setSuccess(`تم تحويل التفعيل إلى بريدك الإلكتروني: ${pendingVerificationUser.email}`);
      }
      setResendCooldown(60);
      otpInputRefs[0].current?.focus();
    } catch (e: any) {
      console.warn('Switch otp error:', e);
    }
  };

  const handleRevealCode = () => {
    let codeToShow = lastSentOtpCode || lastOtpResult?.fallbackCode;
    if (!codeToShow && pendingVerificationUser) {
      codeToShow = AuthService.getLatestOtpCode(
        activeOtpMethod === 'whatsapp' ? pendingVerificationUser.phone : pendingVerificationUser.email
      );
    }
    if (!codeToShow) {
      codeToShow = Math.floor(100000 + Math.random() * 900000).toString();
      if (pendingVerificationUser && typeof window !== 'undefined') {
        sessionStorage.setItem('local_otp_' + pendingVerificationUser.email.toLowerCase(), codeToShow);
        sessionStorage.setItem('local_otp_' + pendingVerificationUser.phone.toLowerCase(), codeToShow);
      }
      setLastSentOtpCode(codeToShow);
    }
    setShowDirectCode(true);
    if (codeToShow && codeToShow.length === 6) {
      setOtpDigits(codeToShow.split(''));
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
        const hasPhone = Boolean(user.phone && user.phone.trim().length >= 8);
        const method = hasPhone ? 'whatsapp' : 'email';
        const otpRes = await AuthService.sendOtpCode({
          email: user.email,
          phone: user.phone,
          method
        });
        setLastOtpResult(otpRes);
        setActiveOtpMethod(method);
        if (otpRes.fallbackCode) {
          setLastSentOtpCode(otpRes.fallbackCode);
        }
        setPendingVerificationUser(user);
        setOtpDigits(['', '', '', '', '', '']);
        setResendCooldown(60);
        setError(
          hasPhone 
            ? `حسابك غير مفعل بعد. جهزنا كود تفعيل مكون من 6 أرقام لرقم هاتفك على الواتساب (${user.phone}).`
            : `حسابك غير مفعل بعد. أرسلنا كود تفعيل مكون من 6 أرقام لتفعيل الحساب (${user.email}).`
        );
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
      const { user, isNewUser } = await AuthService.loginWithGoogle();
      
      // If this is a new Google subscriber who hasn't agreed to terms yet:
      if (isNewUser && !hasAgreedToTerms) {
        setPendingGoogleNewUser(user);
        setIsLogin(false);
        setIsLoading(false);
        return;
      }

      // If user already agreed to terms or is an existing returning user:
      if (isNewUser) {
        await AuthService.confirmNewGoogleUser(user);
      }

      onAuthSuccess(user);
      onClose();
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' || 
        err?.code === 'auth/cancelled-popup-request' || 
        err?.message?.includes('popup-closed-by-user')
      ) {
        setError('');
        return;
      }
      setError(err?.message || 'تعذر الدخول عن طريق Google حالياً.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmGoogleWithTerms = async () => {
    if (!pendingGoogleNewUser) return;
    setIsFinalizingGoogle(true);
    setError('');
    try {
      await AuthService.confirmNewGoogleUser(pendingGoogleNewUser);
      setHasAgreedToTerms(true);
      onAuthSuccess(pendingGoogleNewUser);
      setPendingGoogleNewUser(null);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء إتمام التسجيل بواسطة Google.');
    } finally {
      setIsFinalizingGoogle(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl w-full ${(!isLogin && !hasAgreedToTerms) || pendingGoogleNewUser ? 'max-w-lg' : 'max-w-md'} overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] transition-all`}>
        
        {/* Header Tabs */}
        {!pendingVerificationUser && !pendingGoogleNewUser && (
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

        {/* If pending new Google user registration */}
        {pendingGoogleNewUser && (
          <div className="p-3.5 bg-navy text-white flex items-center justify-between border-b border-navy-dark shadow-xs">
            <span className="text-xs font-black text-gold flex items-center gap-1.5">
              <span>إتمام الاشتراك الجديد بواسطة Google</span>
            </span>
            <button
              type="button"
              onClick={() => { setPendingGoogleNewUser(null); setIsLogin(true); setError(''); setSuccess(''); }}
              className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
            >
              إلغاء والعودة
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
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
            <div className="py-2 space-y-4 text-center">
              {/* Method Switcher Header */}
              <div className="flex items-center justify-center p-1 bg-slate-100 rounded-xl max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() => handleSwitchOtpMethod('whatsapp')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeOtpMethod === 'whatsapp'
                      ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تفعيل الواتساب</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchOtpMethod('email')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeOtpMethod === 'email'
                      ? 'bg-white text-blue-700 shadow-xs ring-1 ring-blue-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>تفعيل الإيميل</span>
                </button>
              </div>

              {/* Main Badge & Title */}
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto border relative shadow-inner ${
                activeOtpMethod === 'whatsapp' 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                  : 'bg-navy/10 text-navy border-navy/20'
              }`}>
                {activeOtpMethod === 'whatsapp' ? (
                  <MessageSquare className="w-7 h-7 text-emerald-600" />
                ) : (
                  <KeyRound className="w-7 h-7 text-navy" />
                )}
                <span className={`absolute -top-1 -right-1 font-extrabold text-[9px] px-1.5 py-0.5 rounded-full border shadow-xs ${
                  activeOtpMethod === 'whatsapp'
                    ? 'bg-emerald-600 text-white border-white'
                    : 'bg-gold text-white border-white'
                }`}>
                  OTP
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-base text-slate-800">
                  {activeOtpMethod === 'whatsapp' ? 'كود التفعيل عبر الواتساب' : 'أدخل كود التفعيل المكون من 6 أرقام'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {activeOtpMethod === 'whatsapp' ? (
                    <>
                      تم تجهيز كود التفعيل المكون من 6 أرقام لرقم هاتفك على الواتساب:<br />
                      <strong className="text-emerald-800 font-bold text-sm bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg inline-block mt-1 font-mono" dir="ltr">
                        {pendingVerificationUser.phone}
                      </strong>
                    </>
                  ) : (
                    <>
                      تم إرسال كود التفعيل إلى بريدك الإلكتروني:<br />
                      <strong className="text-navy font-bold text-sm bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg inline-block mt-1 font-mono" dir="ltr">
                        {pendingVerificationUser.email}
                      </strong>
                    </>
                  )}
                </p>
              </div>

              {/* Active Method Delivery Guidance */}
              {activeOtpMethod === 'whatsapp' ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-950 font-bold text-xs">
                    <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>تفعيل فوري ومباشر عبر الواتساب</span>
                  </div>

                  {/* Dual Action Buttons: WhatsApp Web & WhatsApp App */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a
                      href={lastOtpResult?.whatsappWebUrl || `https://web.whatsapp.com/send?phone=${normalizePhone(pendingVerificationUser.phone)}&text=${encodeURIComponent(lastOtpResult?.whatsappMessage || 'كود التفعيل: ' + (lastSentOtpCode || '123456'))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#25D366] hover:bg-[#20bd5a] active:scale-98 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 fill-white shrink-0" />
                      <span>فتح واتساب ويب (الكمبيوتر)</span>
                    </a>

                    <a
                      href={lastOtpResult?.whatsappUrl || `https://api.whatsapp.com/send?phone=${normalizePhone(pendingVerificationUser.phone)}&text=${encodeURIComponent(lastOtpResult?.whatsappMessage || 'كود التفعيل: ' + (lastSentOtpCode || '123456'))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4 shrink-0" />
                      <span>فتح تطبيق الواتساب (الهاتف)</span>
                    </a>
                  </div>

                  <p className="text-[11px] text-emerald-800 leading-relaxed bg-white/70 p-2 rounded-lg border border-emerald-200/60">
                    💡 <strong>ملاحظة لمستخدمي واتساب ويب:</strong> إذا لم تكن مسجلاً في واتساب ويب أو واجهت أي تأخير، يمكنك الضغط على زر <strong>(أظهر لي كود التفعيل هنا)</strong> بالأسفل لتعبئة الرمز والتفعيل فوراً!
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-center gap-1.5 text-blue-900 font-bold text-xs">
                    <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>يرجى تفقد بريدك الإلكتروني للحصول على كود التفعيل</span>
                  </div>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    إذا لم تجد الرسالة في صندوق الوارد (Inbox)، يرجى مراجعة مجلد الرسائل غير المرغوب فيها (Spam / Junk).
                  </p>
                </div>
              )}

              {/* Instant Code Display Fallback Button */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-center space-y-2 shadow-xs">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-right">
                  <div>
                    <p className="text-xs font-bold text-amber-950">تعذر وصول الرسالة أو تريد التفعيل السريع؟</p>
                    <p className="text-[11px] text-amber-800">اضغط لإظهار رمز التفعيل الخاص بك هنا مباشرة</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRevealCode}
                    className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>أظهر لي كود التفعيل هنا</span>
                  </button>
                </div>

                {showDirectCode && (
                  <div className="bg-white border-2 border-dashed border-amber-400 rounded-xl p-3 text-center space-y-2 mt-2">
                    <div className="text-xs text-slate-600 font-semibold">رمز التفعيل المخصص لحسابك هو:</div>
                    <div className="text-2xl font-black font-mono tracking-widest text-navy bg-amber-50 py-1.5 px-6 rounded-xl inline-block border border-amber-300 shadow-inner" dir="ltr">
                      {lastSentOtpCode || lastOtpResult?.fallbackCode || (pendingVerificationUser && AuthService.getLatestOtpCode(activeOtpMethod === 'whatsapp' ? pendingVerificationUser.phone : pendingVerificationUser.email)) || '123456'}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-medium flex items-center justify-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>تمت تعبئة الرمز تلقائياً في الخانات بالأسفل لتأكيد التفعيل فوراً</span>
                    </div>
                  </div>
                )}
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
                <p className="text-xs text-slate-500">
                  لم يصلك كود التفعيل عبر {activeOtpMethod === 'whatsapp' ? 'الواتساب' : 'البريد'}؟
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => handleResendOtp()}
                    disabled={resendCooldown > 0}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {resendCooldown > 0 
                        ? `إعادة الإرسال خلال (${resendCooldown} ث)` 
                        : activeOtpMethod === 'whatsapp' 
                        ? 'إعادة إرسال كود الواتساب' 
                        : 'إعادة إرسال كود الإيميل'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchOtpMethod(activeOtpMethod === 'whatsapp' ? 'email' : 'whatsapp')}
                    className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    {activeOtpMethod === 'whatsapp' ? (
                      <>
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        <span>تحويل للإيميل</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تحويل للواتساب</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPendingVerificationUser(null);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 underline pt-1 block mx-auto cursor-pointer"
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
          ) : pendingGoogleNewUser ? (
            /* --- GOOGLE NEW SUBSCRIBER TERMS AGREEMENT VIEW --- */
            <NewSubscriberTermsView
              isForGoogle={true}
              googleUserName={pendingGoogleNewUser.name}
              isSubmitting={isFinalizingGoogle}
              onAgreeAndProceed={handleConfirmGoogleWithTerms}
              onBackToLogin={() => {
                setPendingGoogleNewUser(null);
                setIsLogin(true);
                setError('');
                setSuccess('');
              }}
            />
          ) : !hasAgreedToTerms ? (
            /* --- NEW SUBSCRIBER TERMS AGREEMENT VIEW BEFORE REGISTRATION --- */
            <NewSubscriberTermsView
              onAgreeAndProceed={() => {
                setHasAgreedToTerms(true);
                setError('');
                setSuccess('✓ تم تأكيد قراءة والموافقة على الشروط والأحكام بنجاح. يرجى إكمال بيانات الاشتراك أدناه:');
              }}
              onBackToLogin={() => {
                setIsLogin(true);
                setError('');
                setSuccess('');
              }}
            />
          ) : (
            // --- REGISTRATION FORM (After Agreeing to Terms) ---
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Confirmed Terms Notice Banner */}
              <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-800 font-bold shadow-2xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>تمت الموافقة على قائمة الشروط والأحكام (16 بنداً)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHasAgreedToTerms(false)}
                  className="text-[11px] text-navy underline hover:text-navy-dark cursor-pointer shrink-0"
                >
                  مراجعة الشروط
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">الاسم الكامل (الثلاثي أو الرباعي)</label>
                <div className="relative">
                  <UserIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: محمد عبدالله الشمري"
                    required
                    className={`w-full text-sm pl-4 pr-10 py-2.5 border rounded-xl focus:outline-none transition-all ${
                      name.trim().length > 0 && (name.trim().length < 10 || !name.trim().includes(' '))
                        ? 'border-amber-300 focus:border-amber-500 bg-amber-50/20'
                        : name.trim().length >= 10 && name.trim().includes(' ')
                        ? 'border-emerald-300 focus:border-emerald-500'
                        : 'border-slate-200 focus:border-navy'
                    }`}
                  />
                </div>
                {/* تنويه الاسم الكامل */}
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                  <span className="font-bold text-navy">تنويه:</span> يجب ألا يقل الاسم بالكامل عن 10 أحرف ويتضمن مسافة بحيث يحتوي على اسم الأب والجد (مثال: محمد عبدالله الحربي).
                </p>
              </div>

              {(() => {
                const emailStatus = email.trim() ? validateRealEmail(email) : null;
                return (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-600">البريد الإلكتروني الحقيقي (للتفعيل)</label>
                      {email.trim().length > 0 && emailStatus && (
                        emailStatus.isValid ? (
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> بريد حقيقي معتمد
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-600" /> غير مكتمل / غير صالح
                          </span>
                        )
                      )}
                    </div>
                    <div className="relative">
                      <Mail className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value.replace(/\s+/g, ''))}
                        placeholder="yourname@gmail.com"
                        required
                        className={`w-full text-sm pl-4 pr-10 py-2.5 border rounded-xl focus:outline-none transition-all ${
                          email.trim().length > 0 && emailStatus
                            ? emailStatus.isValid
                              ? 'border-emerald-300 focus:border-emerald-500 bg-emerald-50/15'
                              : 'border-amber-300 focus:border-amber-500 bg-amber-50/20'
                            : 'border-slate-200 focus:border-navy'
                        }`}
                        dir="ltr"
                      />
                    </div>
                    {/* تنويه البريد الإلكتروني الحقيقي وملاحظة الخطأ الحية */}
                    {email.trim().length > 0 && emailStatus && !emailStatus.isValid ? (
                      <p className="text-[11px] text-amber-800 mt-1.5 leading-relaxed bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{emailStatus.error}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="font-bold text-navy">تنويه:</span> يجب إدخال بريد إلكتروني حقيقي ونشط (مثل Gmail أو Outlook أو Yahoo أو بريدك الرسمي) لاستلام كود التفعيل وتجنب إيقاف الحساب.
                      </p>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  رقم الهاتف (الواتساب للتفعيل والتواصل)
                </label>
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
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  يُستخدم للتواصل وتفعيل اشتراكك واستلام كود التفعيل عبر الواتساب.
                </p>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">كلمة السر</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة السر..."
                    required
                    className={`w-full text-sm pl-12 pr-10 py-2.5 border rounded-xl focus:outline-none transition-all ${
                      password.length > 0 && !validatePassword(password)
                        ? 'border-amber-300 focus:border-amber-500 bg-amber-50/20'
                        : password.length > 0 && validatePassword(password)
                        ? 'border-emerald-300 focus:border-emerald-500'
                        : 'border-slate-200 focus:border-navy'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3 text-slate-400 hover:text-navy cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* تنويه كلمة السر والمؤشرات الحية */}
                <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <p className="text-[11px] text-slate-700 leading-relaxed font-semibold">
                    <span className="text-amber-800 font-extrabold">تنويه:</span> يجب وضع حرف كابيتال كبير (A-Z) ورمز خاص وتكون كلمة السر 8 خانات (حروف وأرقام).
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                    <div className={`flex items-center gap-1 font-medium ${password.length >= 8 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${password.length >= 8 ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-200 text-slate-500'}`}>
                        {password.length >= 8 ? '✓' : '•'}
                      </span>
                      <span>8 خانات على الأقل</span>
                    </div>
                    <div className={`flex items-center gap-1 font-medium ${/[A-Z]/.test(password) ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${/[A-Z]/.test(password) ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-200 text-slate-500'}`}>
                        {/[A-Z]/.test(password) ? '✓' : '•'}
                      </span>
                      <span>حرف كابيتال (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1 font-medium ${/[0-9]/.test(password) ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${/[0-9]/.test(password) ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-200 text-slate-500'}`}>
                        {/[0-9]/.test(password) ? '✓' : '•'}
                      </span>
                      <span>أرقام (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1 font-medium ${/[^a-zA-Z0-9\u0600-\u06FF\s]/.test(password) ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${/[^a-zA-Z0-9\u0600-\u06FF\s]/.test(password) ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-200 text-slate-500'}`}>
                        {/[^a-zA-Z0-9\u0600-\u06FF\s]/.test(password) ? '✓' : '•'}
                      </span>
                      <span>رمز خاص (@ # $ ! %)</span>
                    </div>
                  </div>
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

              {/* خيار طريقة استلام رمز التفعيل */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>طريقة استلام كود التفعيل (OTP):</span>
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    متاح عبر الواتساب
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* تفعيل عبر الواتساب */}
                  <button
                    type="button"
                    onClick={() => setPreferredMethod('whatsapp')}
                    className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col gap-1 relative ${
                      preferredMethod === 'whatsapp'
                        ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-100/60 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>عبر الواتساب</span>
                      </span>
                      {preferredMethod === 'whatsapp' && (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal leading-tight">
                      يصلك الرمز مباشرة إلى رقمك في الواتساب
                    </span>
                  </button>

                  {/* تفعيل عبر الإيميل */}
                  <button
                    type="button"
                    onClick={() => setPreferredMethod('email')}
                    className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col gap-1 relative ${
                      preferredMethod === 'email'
                        ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-bold shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-100/60 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs font-bold text-blue-700">
                        <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>عبر الإيميل</span>
                      </span>
                      {preferredMethod === 'email' && (
                        <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal leading-tight">
                      يصلك الرمز إلى صندوق بريدك الإلكتروني
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-navy hover:bg-navy-dark text-white font-semibold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-5 cursor-pointer disabled:opacity-50"
              >
                <span>
                  {isLoading
                    ? 'جاري تجهيز الحساب...'
                    : preferredMethod === 'whatsapp'
                    ? 'إنشاء الحساب وتفعيل عبر الواتساب (OTP)'
                    : 'إنشاء الحساب وتفعيل عبر الإيميل (OTP)'}
                </span>
              </button>

              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                <span className="relative bg-white px-3 text-xs text-slate-400">أو التسجيل السريع</span>
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
                <span>التسجيل بواسطة Google</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => {
              setPendingVerificationUser(null);
              setPendingGoogleNewUser(null);
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
