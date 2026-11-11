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
  const { adminPhone, adminWhatsApp } = useAdminContact();
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
  const [ads24hCount, setAds24hCount] = useState<number>(0);
  const [timeRemainingText, setTimeRemainingText] = useState<string>('');

  useEffect(() => {
    if (currentUser?.id) {
      setIsLoadingAds(true);
      Promise.all([
        SubscriptionService.getUserTotalAdsCount(currentUser.id),
        SubscriptionService.getUserLast24HoursAdsCount(currentUser.id)
      ]).then(([totalCnt, status24h]) => {
        setTotalAdsCount(totalCnt);
        setAds24hCount(status24h.count);
        if (status24h.hoursRemaining > 0) {
          setTimeRemainingText(`(متبقي حوالي ${status24h.hoursRemaining} ساعة و ${status24h.minutesRemaining} دقيقة)`);
        } else if (status24h.minutesRemaining > 0) {
          setTimeRemainingText(`(متبقي حوالي ${status24h.minutesRemaining} دقيقة)`);
        } else {
          setTimeRemainingText('');
        }
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

  const containerContent = (
    <div className="space-y-8 max-w-5xl mx-auto py-2 px-1">
      
      {/* Top Header Card: منظومة الاشتراكات والترقية للمنصة */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-right">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold shrink-0 border border-amber-300 shadow-2xs">
            <Crown className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
              منظومة الاشتراكات والترقية للمنصة
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              باقات نشر الإعلانات والعضوية الذهبية مع التفعيل المباشر عبر واتساب الإدارة
            </p>
          </div>
        </div>

        {/* Dynamic Admin Phone & WhatsApp Badge that changes with admin input */}
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-950">
          <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>واتساب وهاتف الإدارة للتفعيل:</span>
          <span className="font-mono font-black text-emerald-800 dir-ltr select-all">
            {adminPhone || adminWhatsApp}
          </span>
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
                    حساب مجاني (إعلان كل 24 ساعة)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isUnlimited ? (
                  <strong className="text-emerald-700 font-extrabold">لديك صلاحية نشر غير محدودة للإعلانات 👑</strong>
                ) : (
                  <span>
                    رصيدك اليومي المجاني: {ads24hCount >= 1 ? (
                      <strong className="text-amber-800 font-bold">تم نشر إعلانك لليوم {timeRemainingText}</strong>
                    ) : (
                      <strong className="text-emerald-700 font-bold">لديك 1 إعلان مجاني متاح الآن (إعلان كل 24 ساعة)</strong>
                    )} • إجمالي إعلاناتك السابقة: <strong className="text-navy font-black">{totalAdsCount}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            {!isUnlimited && ads24hCount >= 1 ? (
              <span className="bg-amber-50 text-amber-950 border border-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                استنفدت إعلان اليوم (يتجدد كل 24 ساعة)
              </span>
            ) : !isUnlimited ? (
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                إعلانك المجاني لليوم متاح الآن ✓
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
              <h3 className="text-xl font-black text-slate-900">باقة 0 ريال شهرياً</h3>
              <p className="text-xs text-slate-500 mt-1">إعلان مجاني كل 24 ساعة لجميع مستخدمي المنصة</p>
            </div>

            <div className="py-2 border-y border-slate-100">
              <span className="text-3xl font-black text-slate-900">0</span>
              <span className="text-xs text-slate-500 font-bold mr-1">ريال / شهرياً</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>إعلان مجاني واحد كل 24 ساعة</strong> (خيل، إسطبل، إيواء، أو نقل)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>تجدد تلقائي مجاني</strong> كل 24 ساعة لنشر إعلان جديد</span>
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
                <span className="line-through">نشر أكثر من إعلان واحد خلال نفس الـ 24 ساعة (يلزم كود)</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <X className="w-4 h-4 text-slate-300 shrink-0" />
                <span className="line-through">شارة التوثيق الملكية</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <div className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 text-center text-xs font-bold">
              مفعلة تلقائياً (إعلان مجاني كل 24 ساعة)
            </div>
          </div>
        </div>

        {/* Card 2: Single Ad Code (Highlight) */}
        <div className="bg-gradient-to-b from-blue-50/50 to-white rounded-3xl p-6 border-2 border-blue-500/80 shadow-md flex flex-col justify-between relative hover:shadow-lg transition">
          <div className="absolute -top-3 right-6 bg-blue-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-xs">
            الأكثر طلباً وسرعة ⚡
          </div>

          <div className="space-y-4">
            <div className="space-y-2 pb-3 border-b border-blue-100 text-right">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-2xs"></span>
                  <span>كود النشر الإضافي</span>
                </h3>
                <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5 rounded-xl shadow-xs font-black">
                  <span className="text-[11px] font-medium opacity-90">السعر:</span>
                  <span className="text-base sm:text-lg font-mono font-black">20</span>
                  <span className="text-xs font-bold">ريال</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-bold leading-relaxed">
                كود مخصص لنشر إعلان واحد فقط دون التزام بالمدة
              </p>
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
            <div className="space-y-2 pb-3 border-b border-amber-200/80 text-right">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500 fill-amber-400 shrink-0" />
                  <span>العضوية الذهبية</span>
                </h3>
                <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white px-3 py-1.5 rounded-xl shadow-xs font-black border border-amber-400/40">
                  <span className="text-base sm:text-lg font-mono font-black">100</span>
                  <span className="text-xs font-bold">ريال شهرياً</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-amber-900 font-black flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-400 shrink-0" />
                <span>(إعلانات بلا حدود)</span>
              </p>
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
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 pt-1">
              <span>رقم هاتف وواتساب الإدارة:</span>
              <span className="font-mono font-black text-emerald-800 bg-white/80 px-2 py-0.5 rounded-lg border border-emerald-200 dir-ltr select-all">
                {adminPhone || adminWhatsApp}
              </span>
            </div>
          </div>
        </div>

        <a
          href={`https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(`السلام عليكم ورحمة الله، أتواصل معكم بخصوص ترقية حسابي في منصة إستابلي (${currentUser?.name || 'مستخدم جديد'})`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400 hover:from-emerald-400 hover:to-green-400 text-white font-black text-xs px-5 py-3.5 rounded-2xl transition-all duration-300 cursor-pointer shadow-[0_0_18px_rgba(16,185,129,0.65)] hover:shadow-[0_0_26px_rgba(16,185,129,0.9)] border border-emerald-200 ring-2 ring-emerald-400/50 flex items-center justify-center gap-2 shrink-0 active:scale-95"
        >
          <MessageCircle className="w-4 h-4" />
          <span>محادثة الإدارة واتساب ({adminPhone || adminWhatsApp})</span>
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
