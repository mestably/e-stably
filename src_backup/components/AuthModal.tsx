/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Eye, EyeOff, User as UserIcon, Mail, Phone, Lock, Sparkles, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { FirebaseService } from '../lib/firebase';

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
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

    try {
      const users = await FirebaseService.getUsers();
      if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
        setError('البريد الإلكتروني مسجل بالفعل.');
        return;
      }

      const newUser: User = {
        id: 'usr_' + Date.now(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        nickname: nickname.trim(),
        role: email.trim().toLowerCase() === 'admin@m-estably.com' ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
      };

      await FirebaseService.saveUser(newUser);
      setSuccess('تم إنشاء الحساب بنجاح! تم تفعيل حسابك لتتمكن من إضافة إعلاناتك.');
      
      setTimeout(() => {
        onAuthSuccess(newUser);
        onClose();
      }, 1500);
    } catch (err) {
      setError('حدث خطأ أثناء التسجيل، يرجى المحاولة مرة أخرى.');
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!loginEmail || !loginPassword) {
      setError('يرجى إدخال الاسم المستعار، الهاتف أو البريد الإلكتروني مع كلمة السر.');
      return;
    }

    const identifier = loginEmail.trim().toLowerCase();

    try {
      const users = await FirebaseService.getUsers();
      
      // Admin bypass / default accounts
      if ((identifier === 'admin@m-estably.com' || identifier === 'admin') && loginPassword === 'admin123') {
        const adminUser: User = {
          id: 'admin_user',
          name: 'المدير العام',
          email: 'admin@m-estably.com',
          phone: '0559595055',
          nickname: 'admin',
          role: 'admin',
          createdAt: new Date().toISOString()
        };
        onAuthSuccess(adminUser);
        onClose();
        return;
      }

      // Hardcoded or registered user matching (by email, nickname, or phone)
      const foundUser = users.find((u) => {
        const userEmail = u.email ? u.email.toLowerCase() : '';
        const userNickname = u.nickname ? u.nickname.toLowerCase() : '';
        const userPhone = u.phone ? u.phone.replace(/[\s\-\+]/g, '') : '';
        const cleanIdentifier = identifier.replace(/[\s\-\+]/g, '');

        return userEmail === identifier || 
               userNickname === identifier || 
               userPhone === cleanIdentifier;
      });

      if (foundUser) {
        onAuthSuccess(foundUser);
        onClose();
      } else {
        setError('بيانات الدخول غير صحيحة أو الحساب غير موجود.');
      }
    } catch (err) {
      setError('حدث خطأ أثناء تسجيل الدخول.');
    }
  };

  const handleGoogleLogin = async () => {
    // Elegant simulation of Google Fast Login via OAuth/API integration
    const googleUser: User = {
      id: 'g_user_' + Date.now(),
      name: 'مستخدم جوجل السريع',
      email: 'google.user@gmail.com',
      phone: '0555612055',
      nickname: 'google_user',
      role: 'user',
      createdAt: new Date().toISOString()
    };
    await FirebaseService.saveUser(googleUser);
    onAuthSuccess(googleUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-4 text-center text-sm font-semibold transition-all ${
              isLogin 
                ? 'bg-white text-navy border-b-2 border-navy font-bold' 
                : 'text-slate-500 hover:text-navy hover:bg-slate-100/50'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-4 text-center text-sm font-semibold transition-all ${
              !isLogin 
                ? 'bg-white text-navy border-b-2 border-navy font-bold' 
                : 'text-slate-500 hover:text-navy hover:bg-slate-100/50'
            }`}
          >
            اشتراك جديد
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-r-4 border-red-500 text-red-700 text-xs rounded-l flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border-r-4 border-green-500 text-green-700 text-xs rounded-l flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {isLogin ? (
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
                className="w-full bg-navy hover:bg-navy-dark text-white font-semibold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-6 cursor-pointer"
              >
                <span>تسجيل الدخول</span>
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

              <div className="text-center mt-6 p-3 bg-gold-light rounded-xl border border-gold/20">
                <span className="text-[11px] text-gold-dark font-medium leading-relaxed block">
                  دخول المدير لتجربة كامل الصلاحيات:<br />
                  البريد الإلكتروني: <strong className="font-mono">admin@m-estably.com</strong><br />
                  كلمة السر: <strong className="font-mono">admin123</strong>
                </span>
              </div>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">البريد الإلكتروني لتفعيل الحساب</label>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">رقم الهاتف للتفعيل عبر واتساب</label>
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
                className="w-full bg-navy hover:bg-navy-dark text-white font-semibold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-6 cursor-pointer"
              >
                <span>إنشاء الحساب والتفعيل</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-navy font-semibold text-xs py-1 px-3"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
}
