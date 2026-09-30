/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Sparkles, 
  CheckCircle2, 
  MessageCircle, 
  ShieldCheck, 
  AlertCircle, 
  Key, 
  Copy, 
  Check, 
  ArrowLeft, 
  ExternalLink, 
  FileText, 
  Zap,
  HelpCircle,
  X
} from 'lucide-react';
import { User, SubscriptionCode } from '../types';
import { SubscriptionService, FREE_USER_ADS_LIMIT, ADMIN_WHATSAPP_NUMBER, ADMIN_PHONE_DISPLAY } from '../lib/subscriptionService';
import RequestSubscriptionCodeModal from './RequestSubscriptionCodeModal';

interface SubscriptionsSectionProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onNavigateToTab?: (tab: string) => void;
  isModal?: boolean;
  onClose?: () => void;
}

export default function SubscriptionsSection({
  currentUser,
  onOpenAuth,
  onNavigateToTab,
  isModal = false,
  onClose
}: SubscriptionsSectionProps) {
  const [totalAdsCount, setTotalAdsCount] = useState<number>(0);
  const [isLoadingAds, setIsLoadingAds] = useState(false);
  const [isRequestCodeOpen, setIsRequestCodeOpen] = useState(false);
  const [testCodeInput, setTestCodeInput] = useState('');
  const [codeCheckResult, setCodeCheckResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [isCheckingCode, setIsCheckingCode] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      setIsLoadingAds(true);
      SubscriptionService.getUserTotalAdsCount(currentUser.id).then(cnt => {
        setTotalAdsCount(cnt);
        setIsLoadingAds(false);
      });
    }
  }, [currentUser?.id]);

  const handleCheckCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testCodeInput.trim()) return;
    setIsCheckingCode(true);
    setCodeCheckResult(null);
    try {
      const res = await SubscriptionService.validateCodeOnly(testCodeInput);
      setCodeCheckResult(res);
    } catch {
      setCodeCheckResult({ valid: false, message: 'حدث خطأ أثناء فحص الكود.' });
    } finally {
      setIsCheckingCode(false);
    }
  };

  const isUnlimited = currentUser?.role === 'admin' || !!currentUser?.isGold || !!currentUser?.isSubscribed;
  const remainingFreeAds = Math.max(0, FREE_USER_ADS_LIMIT - totalAdsCount);

  const containerContent = (
    <div className="space-y-8 max-w-5xl mx-auto py-2 px-1">
      
      {/* Hero / Header Card with Yellow Background, Sky-Blue Border, Crisp Dark Text, and Luminous Glowing Buttons */}
      <div className="bg-gradient-to-br from-amber-100 via-yellow-100 to-amber-200 rounded-3xl p-6 sm:p-8 text-slate-900 shadow-xl relative overflow-hidden border-4 border-sky-400">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-sky-300/25 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-yellow-400/35 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 bg-sky-200/70 text-sky-950 border border-sky-400 px-3.5 py-1.5 rounded-full text-xs font-black shadow-2xs">
              <Crown className="w-3.5 h-3.5 text-amber-700" />
              <span>منظومة الاشتراكات والترقية - منصة إستابلي</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 leading-tight">
              باقات الاشتراكات وأكواد نشر الإعلانات
            </h1>
            <p className="text-xs sm:text-sm text-slate-800 font-bold max-w-xl leading-relaxed">
              يحق لكل مستخدم مجاني نشر <strong className="text-slate-950 font-black underline decoration-sky-500 decoration-2 underline-offset-2">إعلان واحد فقط</strong>. يمكنك ترقية اشتراكك للاستمتاع بإعلانات غير محدودة، أو طلب <strong className="text-slate-950 font-black underline decoration-sky-500 decoration-2 underline-offset-2">كود اشتراك متغير</strong> لنشر إعلان إضافي وتفعيله فوراً عبر واتساب الإدارة.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3.5 shrink-0">
            {/* Glowing Luminous Amber Request Button */}
            <button
              onClick={() => setIsRequestCodeOpen(true)}
              className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm px-5 py-3.5 rounded-2xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 border-2 border-yellow-100 shadow-[0_0_20px_rgba(245,158,11,0.65)] hover:shadow-[0_0_30px_rgba(245,158,11,0.9)] ring-2 ring-amber-400/60 hover:scale-[1.02] active:scale-95"
            >
              <Key className="w-4 h-4 text-slate-950" />
              <span>طلب كود نشر إضافي 📲</span>
            </button>

            {/* Glowing Luminous Emerald WhatsApp Activation Button */}
            <a
              href={SubscriptionService.getUpgradeWhatsAppUrl(currentUser, 'العضوية الذهبية VIP')}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400 hover:from-emerald-400 hover:to-green-400 text-white font-black text-xs sm:text-sm px-5 py-3.5 rounded-2xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 border-2 border-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.7)] hover:shadow-[0_0_30px_rgba(16,185,129,0.95)] ring-2 ring-emerald-400/60 hover:scale-[1.02] active:scale-95"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span>تفعيل عبر واتساب الإدارة</span>
            </a>
          </div>
        </div>
      </div>

      {/* Current User Status Alert / Profile Integration */}
      {currentUser ? (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-navy/10 text-navy font-bold text-sm flex items-center justify-center border border-navy/20 overflow-hidden shrink-0">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                currentUser.name.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm">{currentUser.name}</span>
                {currentUser.role === 'admin' ? (
                  <span className="bg-navy text-white text-[10px] font-black px-2 py-0.5 rounded-full">مدير النظام</span>
                ) : currentUser.isGold ? (
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-600" />
                    عضوية ذهبية
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    حساب مجاني
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isUnlimited ? (
                  <strong className="text-emerald-700 font-extrabold">لديك صلاحية نشر غير محدودة للإعلانات 👑</strong>
                ) : (
                  <span>
                    إجمالي إعلاناتك المنشورة: <strong className="text-navy font-black">{totalAdsCount}</strong> من أصل <strong className="text-navy font-black">{FREE_USER_ADS_LIMIT}</strong> مسموح به مجاناً.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            {!isUnlimited && totalAdsCount >= FREE_USER_ADS_LIMIT ? (
              <span className="bg-red-50 text-red-700 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                استنفدت الإعلان المجاني (يلزم كود أو ترقية)
              </span>
            ) : !isUnlimited ? (
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                متبقي لك {remainingFreeAds} إعلان مجاني
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-900">
              قم بتسجيل الدخول لمعرفة رصيدك من الإعلانات وطلب أكواد الاشتراك المخصصة لحسابك.
            </span>
          </div>
          <button
            onClick={onOpenAuth}
            className="bg-navy hover:bg-navy-dark text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer shrink-0 shadow-xs"
          >
            تسجيل الدخول الآن
          </button>
        </div>
      )}

      {/* Subscription Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Free Tier */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm flex flex-col justify-between relative hover:border-slate-300 transition">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                الباقة الأساسية
              </span>
              <span className="text-xs font-bold text-slate-400">مجاناً دائماً</span>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">الباقة المجانية</h3>
              <p className="text-xs text-slate-500 mt-1">مناسبة للأفراد والمبتدئين لتجربة خدمات المنصة</p>
            </div>

            <div className="py-2 border-y border-slate-100">
              <span className="text-3xl font-black text-slate-900">0</span>
              <span className="text-xs text-slate-500 font-bold mr-1">ريال / شهرياً</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>إعلان واحد فقط مجاناً</strong> (خيل، إسطبل، إيواء، أو نقل)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>إمكانية تعديل وحذف الإعلان في أي وقت</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تواصل مباشر مع المشترين عبر الواتساب والاتصال</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <X className="w-4 h-4 text-slate-300 shrink-0" />
                <span className="line-through">نشر إعلانات متعددة بدون كود</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <X className="w-4 h-4 text-slate-300 shrink-0" />
                <span className="line-through">شارة التوثيق الملكية</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <div className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 text-center text-xs font-bold">
              مفعلة تلقائياً لجميع الحسابات
            </div>
          </div>
        </div>

        {/* Card 2: Single Ad Code (Highlight) */}
        <div className="bg-gradient-to-b from-blue-50/50 to-white rounded-3xl p-6 border-2 border-blue-500/80 shadow-md flex flex-col justify-between relative hover:shadow-lg transition">
          <div className="absolute -top-3 right-6 bg-blue-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-xs">
            الأكثر طلباً وسرعة ⚡
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-800 bg-blue-100 px-3 py-1 rounded-full">
                كود نشر إضافي
              </span>
              <span className="text-xs font-bold text-blue-600">طلب فوري</span>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">كود الإعلان المتغير</h3>
              <p className="text-xs text-slate-500 mt-1">كود مخصص لنشر إعلان إضافي دون التزام شهري</p>
            </div>

            <div className="py-2 border-y border-blue-100">
              <span className="text-2xl font-black text-blue-900">كود متغير</span>
              <span className="text-xs text-blue-700 font-bold mr-2">لكل إعلان إضافي</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span><strong>توليد كود فوري مخصص لحسابك</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>إرسال مباشر لواتساب الإدارة بضغطة زر</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>اعتماد سريع للكود من الإدارة</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>وضعه عند نشر الإعلان لتنزيله فوراً</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>لا يتطلب اشتراكاً شهرياً مستمراً</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 space-y-2">
            <button
              onClick={() => setIsRequestCodeOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-3 px-4 rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <Key className="w-4 h-4" />
              <span>طلب كود اشتراك الآن</span>
            </button>
          </div>
        </div>

        {/* Card 3: Gold VIP Tier */}
        <div className="bg-gradient-to-b from-amber-50/60 to-white rounded-3xl p-6 border-2 border-amber-400 shadow-md flex flex-col justify-between relative hover:shadow-lg transition">
          <div className="absolute -top-3 right-6 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1">
            <Crown className="w-3 h-3" />
            عضوية الـ VIP الملكية
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-full">
                الباقة الذهبية
              </span>
              <span className="text-xs font-bold text-amber-700">VIP غير محدود</span>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">العضوية الذهبية 👑</h3>
              <p className="text-xs text-slate-500 mt-1">للمربين، الإسطبلات، والشركات ذات النشاط المستمر</p>
            </div>

            <div className="py-2 border-y border-amber-100">
              <span className="text-2xl font-black text-amber-900">إعلانات بلا حدود</span>
              <span className="text-xs text-amber-700 font-bold mr-2">بدون أكواد أو قيود</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span><strong>نشر إعلانات غير محدودة</strong> يومياً وبدون قيود</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span><strong>شارة التوثيق الذهبية 👑</strong> بجانب اسمك في المنصة</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>أولوية ظهور إعلاناتك في الصفحة الرئيسية والبحث</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>دعم فني خاص ومباشر عبر الواتساب</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>إمكانية تمييز الإعلانات بعلامات خاصة</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <a
              href={SubscriptionService.getUpgradeWhatsAppUrl(currentUser, 'العضوية الذهبية VIP (إعلانات غير محدودة)')}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs py-3 px-4 rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>تفعيل عبر واتساب الإدارة</span>
            </a>
          </div>
        </div>

      </div>

      {/* Live Code Verification Form */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-navy/10 text-navy flex items-center justify-center shrink-0">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">فحص وصلاحية كود الاشتراك</h3>
            <p className="text-[11px] text-slate-500">لديك كود وترغب في التأكد من تفعيله وجاهزيته للنشر؟</p>
          </div>
        </div>

        <form onSubmit={handleCheckCode} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={testCodeInput}
            onChange={(e) => setTestCodeInput(e.target.value.toUpperCase())}
            placeholder="مثال: EST-84912"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono uppercase text-slate-800 focus:outline-none focus:border-navy"
          />
          <button
            type="submit"
            disabled={isCheckingCode || !testCodeInput.trim()}
            className="bg-navy hover:bg-navy-dark text-white font-bold text-xs px-6 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            {isCheckingCode ? 'جاري الفحص...' : 'فحص الكود'}
          </button>
        </form>

        {codeCheckResult && (
          <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
            codeCheckResult.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {codeCheckResult.valid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <span>{codeCheckResult.message}</span>
          </div>
        )}
      </div>

      {/* WhatsApp Activation Direct Box - Fully Responsive & Aligned for Mobile & Desktop */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 text-right">
        <div className="flex items-start sm:items-center gap-3.5 text-right flex-1">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-md mt-0.5 sm:mt-0">
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="space-y-1 text-right flex-1">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
              تفعيل الاشتراكات والتواصل المباشر مع إدارة إستابلي
            </h4>
            <div className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
              <span>رقم واتساب الإدارة المباشر: </span>
              <span className="inline-block font-mono font-bold text-emerald-800 dir-ltr whitespace-nowrap bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-200">
                {ADMIN_PHONE_DISPLAY}
              </span>
              <span className="block sm:inline text-slate-500 sm:mr-1"> (متاح 24/7 للرد والتفعيل الفوري)</span>
            </div>
          </div>
        </div>

        <a
          href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(`السلام عليكم ورحمة الله، أتواصل معكم بخصوص ترقية حسابي في منصة إستابلي (${currentUser?.name || 'مستخدم جديد'})`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400 hover:from-emerald-400 hover:to-green-400 text-white font-black text-xs px-5 py-3.5 rounded-2xl transition-all duration-300 cursor-pointer shadow-[0_0_18px_rgba(16,185,129,0.65)] hover:shadow-[0_0_26px_rgba(16,185,129,0.9)] border border-emerald-200 ring-2 ring-emerald-400/50 flex items-center justify-center gap-2 shrink-0 active:scale-95"
        >
          <MessageCircle className="w-4 h-4" />
          <span>محادثة الإدارة واتساب</span>
        </a>
      </div>

      {/* Modal for Requesting Dynamic Code */}
      <RequestSubscriptionCodeModal
        isOpen={isRequestCodeOpen}
        currentUser={currentUser}
        onClose={() => setIsRequestCodeOpen(false)}
        onOpenAuth={onOpenAuth}
      />
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div className="bg-slate-50 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col my-4">
          <div className="bg-white p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gold/20 text-gold-dark flex items-center justify-center font-bold">
                <Crown className="w-4 h-4 text-gold-dark" />
              </div>
              <h2 className="font-black text-sm sm:text-base text-slate-800">صفحة الاشتراكات والترقية</h2>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-4 sm:p-6">
            {containerContent}
          </div>
        </div>
      </div>
    );
  }

  return containerContent;
}
