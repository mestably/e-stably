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
  X,
  Clock
} from 'lucide-react';
import { User, SubscriptionCode } from '../types';
import { SubscriptionService, FREE_USER_ADS_LIMIT } from '../lib/subscriptionService';
import { useAdminContact } from '../lib/useAdminContact';
import { useVipCountdown } from '../lib/useVipCountdown';
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
  const { adminWhatsApp } = useAdminContact();
  const [totalAdsCount, setTotalAdsCount] = useState<number>(0);
  const [isLoadingAds, setIsLoadingAds] = useState(false);
  const [isRequestCodeOpen, setIsRequestCodeOpen] = useState(false);
  const [testCodeInput, setTestCodeInput] = useState('');
  const [codeCheckResult, setCodeCheckResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [isCheckingCode, setIsCheckingCode] = useState(false);

  const vipCountdown = useVipCountdown(
    currentUser?.subscriptionExpiresAt,
    currentUser?.updatedAt || currentUser?.createdAt,
    !!currentUser?.isGold
  );

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
      <div className="bg-gradient-to-br from-amber-100 via-yellow-100 to-amber-200 rounded-3xl p-5 sm:p-7 lg:p-8 text-slate-900 shadow-xl relative overflow-hidden border-4 border-sky-400 text-right">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-sky-300/25 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-yellow-400/35 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 text-right">
          <div className="space-y-3 flex-1 min-w-0 max-w-2xl text-right">
            <div className="inline-flex items-center gap-2 bg-sky-200/80 text-sky-950 border border-sky-400 px-3.5 py-1.5 rounded-full text-xs font-black shadow-2xs">
              <Crown className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>منظومة الاشتراكات والترقية - منصة إستابلي</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-950 leading-snug">
              باقات الاشتراكات وأكواد نشر الإعلانات
            </h1>
            <p className="text-xs sm:text-sm text-slate-800 font-bold leading-relaxed">
              يحق لكل مستخدم مجاني نشر <strong className="text-slate-950 font-black underline decoration-sky-500 decoration-2 underline-offset-2">إعلان واحد فقط مجاناً</strong>. يمكنك طلب <strong className="text-slate-950 font-black underline decoration-sky-500 decoration-2 underline-offset-2">كود نشر إضافي (السعر: 20 ريال)</strong> لنشر إعلان إضافي وتفعيله فوراً عبر واتساب الإدارة، أو الترقية إلى <strong className="text-slate-950 font-black underline decoration-amber-600 decoration-2 underline-offset-2">العضوية الذهبية (100 ريال شهرياً)</strong> لإعلانات غير محدودة وشارة توثيق وعد تنازلي.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-start xl:justify-end shrink-0 pt-1 xl:pt-0">
            {/* Glowing Luminous Amber Request Button */}
            <button
              onClick={() => setIsRequestCodeOpen(true)}
              className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm px-4 sm:px-5 py-3.5 rounded-2xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 border-2 border-yellow-100 shadow-[0_0_20px_rgba(245,158,11,0.65)] hover:shadow-[0_0_30px_rgba(245,158,11,0.9)] ring-2 ring-amber-400/60 hover:scale-[1.02] active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Key className="w-4 h-4 text-slate-950 shrink-0" />
              <span>طلب كود نشر إضافي (السعر 20 ريال) 📲</span>
            </button>

            {/* Glowing Luminous Emerald WhatsApp Activation Button */}
            <a
              href={`https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(`السلام عليكم ورحمة الله، أرغب في ترقية حسابي إلى العضوية الذهبية (100 ريال شهرياً) في منصة إستابلي (${currentUser?.name || 'مستخدم جديد'})`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400 hover:from-emerald-400 hover:to-green-400 text-white font-black text-xs sm:text-sm px-4 sm:px-5 py-3.5 rounded-2xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 border-2 border-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.7)] hover:shadow-[0_0_30px_rgba(16,185,129,0.95)] ring-2 ring-emerald-400/60 hover:scale-[1.02] active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Crown className="w-4 h-4 text-white shrink-0" />
              <span>ترقية للعضوية الذهبية (100 ريال شهرياً) 👑</span>
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-slate-900 text-sm">{currentUser.name}</span>
                {currentUser.role === 'admin' ? (
                  <span className="bg-navy text-white text-[10px] font-black px-2 py-0.5 rounded-full">مدير النظام</span>
                ) : currentUser.isGold ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-600" />
                      عضوية ذهبية (100 ريال شهرياً)
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                      vipCountdown.isExpired 
                        ? 'bg-red-50 text-red-700 border-red-200' 
                        : vipCountdown.days <= 3 
                        ? 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse' 
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                      <span>العد التنازلي: {vipCountdown.formattedDetailed}</span>
                    </span>
                  </div>
                ) : (
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    حساب مجاني
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
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

      {/* Subscription Pricing Cards Grid - Responsive on Zoom & Resizing */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
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
              <span className="text-xs font-black text-blue-800 bg-blue-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                <span>كود نشر إضافي</span>
                <span className="bg-blue-600 text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-2xs">السعر 20 ريال</span>
              </span>
              <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                20 ريال / كود
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-black text-slate-900">كود النشر الإضافي</h3>
                <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-0.5 rounded-lg shadow-2xs">
                  السعر: 20 ريال
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">كود مخصص لنشر إعلان إضافي دون التزام شهري</p>
            </div>

            <div className="py-2.5 border-y border-blue-100 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-blue-900">20</span>
              <span className="text-sm text-blue-700 font-extrabold">ريال</span>
              <span className="text-xs text-slate-500 font-bold mr-1">/ كود لكل إعلان إضافي</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span><strong>توليد كود فوري مخصص لحسابك بقيمة 20 ريال</strong></span>
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
              <span>طلب كود نشر إضافي - السعر 20 ريال</span>
            </button>
          </div>
        </div>

        {/* Card 3: Gold VIP Tier */}
        <div className="bg-gradient-to-b from-amber-50/60 to-white rounded-3xl p-6 border-2 border-amber-400 shadow-md flex flex-col justify-between relative hover:shadow-lg transition md:col-span-2 xl:col-span-1">
          <div className="absolute -top-3 right-6 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1">
            <Crown className="w-3 h-3" />
            عضوية الـ VIP الملكية
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                <span>العضوية الذهبية</span>
                <span className="bg-amber-600 text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-2xs">100 ريال شهرياً</span>
              </span>
              <span className="text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-300">
                100 ريال شهرياً
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-black text-slate-900">العضوية الذهبية 👑</h3>
                <span className="bg-amber-600 text-white text-xs font-black px-2.5 py-0.5 rounded-lg shadow-2xs">
                  100 ريال شهرياً
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">للمربين، الإسطبلات، والشركات ذات النشاط المستمر</p>
            </div>

            <div className="py-2.5 border-y border-amber-100 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-amber-900">100</span>
              <span className="text-sm text-amber-700 font-extrabold">ريال</span>
              <span className="text-xs text-slate-500 font-bold mr-1">/ شهرياً (إعلانات بلا حدود)</span>
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
                <span><strong>عد تنازلي فوري (30 يوماً)</strong> يظهر في أيقونة المستخدم ولوحة المدير</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>أولوية ظهور إعلاناتك في الصفحة الرئيسية والبحث</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>دعم فني خاص ومباشر عبر الواتساب</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <a
              href={`https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(`السلام عليكم ورحمة الله، أرغب في ترقية حسابي إلى العضوية الذهبية VIP (100 ريال شهرياً) في منصة إستابلي (${currentUser?.name || 'مستخدم جديد'})`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs py-3 px-4 rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4" />
              <span>ترقية للعضوية الذهبية (100 ريال شهرياً) 👑</span>
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
            <h3 className="text-sm font-extrabold text-slate-800">فحص وصلاحية كود الاشتراك وتفعيله</h3>
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
            <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed font-medium">
              تواصل مباشرة مع إدارة المنصة عبر الواتساب للاعتماد الفوري لأكواد النشر وتفعيل العضوية الذهبية (متاح 24/7)
            </p>
          </div>
        </div>

        <a
          href={`https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(`السلام عليكم ورحمة الله، أتواصل معكم بخصوص ترقية حسابي في منصة إستابلي (${currentUser?.name || 'مستخدم جديد'})`)}`}
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
