/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Key, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Crown, 
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { User, SubscriptionCode } from '../types';
import { SubscriptionService, FREE_USER_ADS_LIMIT } from '../lib/subscriptionService';
import RequestSubscriptionCodeModal from './RequestSubscriptionCodeModal';

interface SubscriptionCodeFieldProps {
  currentUser: User | null;
  code: string;
  onChangeCode: (code: string) => void;
  isCodeValid: boolean;
  setIsCodeValid: (valid: boolean) => void;
  validatedCodeObj: SubscriptionCode | null;
  setValidatedCodeObj: (obj: SubscriptionCode | null) => void;
  adType?: string;
  totalAdsCount: number;
  onOpenSubscriptions?: () => void;
  onOpenAuth?: () => void;
}

export default function SubscriptionCodeField({
  currentUser,
  code,
  onChangeCode,
  isCodeValid,
  setIsCodeValid,
  validatedCodeObj,
  setValidatedCodeObj,
  adType = 'إعلان جديد',
  totalAdsCount,
  onOpenSubscriptions,
  onOpenAuth
}: SubscriptionCodeFieldProps) {
  // Toggle switch state: single compact line by default so user can see form fields
  const [isCodeSectionOpen, setIsCodeSectionOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string>('');

  const isUnlimited = currentUser?.role === 'admin' || !!currentUser?.isGold || !!currentUser?.isSubscribed;
  const isFreeLimitReached = !isUnlimited && totalAdsCount >= FREE_USER_ADS_LIMIT;

  const handleValidateCode = async () => {
    if (!code.trim()) {
      setValidationMessage('يرجى كتابة أو لصق كود الاشتراك أولاً.');
      setIsCodeValid(false);
      setValidatedCodeObj(null);
      return;
    }

    setIsValidating(true);
    setValidationMessage('');
    try {
      const res = await SubscriptionService.validateCodeOnly(code);
      if (res.valid && res.codeObj) {
        setIsCodeValid(true);
        setValidatedCodeObj(res.codeObj);
        setValidationMessage(res.message);
      } else {
        setIsCodeValid(false);
        setValidatedCodeObj(null);
        setValidationMessage(res.message);
      }
    } catch {
      setIsCodeValid(false);
      setValidatedCodeObj(null);
      setValidationMessage('فشل فحص كود الاشتراك. تحقق من اتصال الإنترنت.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCodeGenerated = (newCode: string) => {
    onChangeCode(newCode);
    setIsCodeValid(false);
    setValidatedCodeObj(null);
    setValidationMessage('تم توليد الكود. بعد إرساله للإدارة عبر الواتساب واعتماده، اضغط "تأكيد الكود".');
    setIsCodeSectionOpen(true); // Open toggle so user can immediately see the generated code
  };

  // Case 1: Unlimited account (Admin / VIP Gold)
  if (isUnlimited) {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-amber-900 font-extrabold">
          <Crown className="w-4 h-4 text-amber-600 shrink-0" />
          <span>حسابك يتمتع بإعلانات غير محدودة (عضوية ذهبية / إدارة). يمكنك النشر مباشرة!</span>
        </div>
        <span className="bg-amber-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shrink-0">
          بلا حدود
        </span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* Single line bar: "تفعيل كود لنشر إعلان" + Toggle Switch Button */}
      <div className="bg-amber-50/90 border border-amber-300/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-2xs transition-all">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            isCodeSectionOpen ? 'bg-amber-600 text-white shadow-2xs' : 'bg-amber-100 text-amber-800'
          }`}>
            <Key className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-amber-950">
              تفعيل كود لنشر إعلان
            </span>
            {isCodeValid ? (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>كود معتمد: {code}</span>
              </span>
            ) : isFreeLimitReached ? (
              <span className="bg-red-100 text-red-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-200">
                استنفدت الإعلان المجاني (1/1)
              </span>
            ) : (
              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                إعلانك الأول مجاني ({totalAdsCount}/1)
              </span>
            )}
          </div>
        </div>

        {/* Toggle Switch Button */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-extrabold text-slate-500 hidden sm:inline select-none">
            {isCodeSectionOpen ? 'إخفاء' : 'تفعيل'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isCodeSectionOpen}
            onClick={() => setIsCodeSectionOpen(!isCodeSectionOpen)}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
              isCodeSectionOpen ? 'bg-amber-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
            dir="ltr"
            title={isCodeSectionOpen ? 'إغلاق قسم كود الاشتراك' : 'تفعيل وإظهار قسم كود الاشتراك'}
          >
            <span
              className="bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-200 ease-in-out"
            />
          </button>
        </div>
      </div>

      {/* Collapsible Panel: Drops down when toggle switch is activated */}
      {isCodeSectionOpen && (
        <div className="bg-gradient-to-b from-amber-50/70 via-white to-amber-50/40 border-2 border-amber-300 rounded-2xl p-4 space-y-3.5 text-right shadow-xs overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Header Explanation */}
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <Key className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-black text-xs sm:text-sm text-amber-950">
                  كود الاشتراك وتفعيل نشر الإعلان
                </h4>
                {isFreeLimitReached && (
                  <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                    مطلوب كود إضافي
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                {isFreeLimitReached
                  ? 'وفقاً لسياسة المنصة، يحق للمستخدم المجاني نشر إعلان واحد فقط. لنشر هذا الإعلان، يرجى إدخال كود اشتراك معتمد، أو طلب كود فوري عبر الواتساب، أو ترقية اشتراكك.'
                  : 'يمكنك استخدام كود تفعيل مسبق أو ترقية حسابك للتمتع بإعلانات غير محدودة وتثبيت الإعلانات.'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Request via WhatsApp OR Upgrade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(true)}
              className="w-full bg-[#25D366] hover:bg-[#1ebc59] text-white font-extrabold text-xs py-2.5 px-3 rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">طلب كود اشتراك عبر واتساب الإدارة 📲</span>
            </button>

            {onOpenSubscriptions && (
              <button
                type="button"
                onClick={onOpenSubscriptions}
                className="w-full bg-navy hover:bg-navy-dark text-white font-extrabold text-xs py-2.5 px-3 rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Crown className="w-3.5 h-3.5 text-gold shrink-0" />
                <span className="truncate">ترقية الاشتراك لباقات VIP</span>
              </button>
            )}
          </div>

          {/* Code Input Field (Compact ~12 characters) & Confirm Button */}
          <div className="space-y-1.5 pt-2 border-t border-amber-200/70">
            <label className="text-[11px] font-bold text-slate-700 block">
              أدخل كود الاشتراك / النشر الإضافي (حتى 12 حرف ورقم):
            </label>
            
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Reduced input size to fit 12 characters perfectly without overflowing */}
              <input
                type="text"
                value={code}
                maxLength={14}
                onChange={(e) => {
                  onChangeCode(e.target.value.toUpperCase());
                  setIsCodeValid(false);
                  setValidatedCodeObj(null);
                  setValidationMessage('');
                }}
                placeholder="EST-78027"
                className="w-36 sm:w-44 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-navy uppercase text-center tracking-wider placeholder:text-slate-400 focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy shrink-0 shadow-2xs"
              />

              {/* Confirm Code Button nicely accommodated inside the frame */}
              <button
                type="button"
                onClick={handleValidateCode}
                disabled={isValidating || !code.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap shadow-xs active:scale-95"
              >
                {isValidating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري الفحص...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>تأكيد الكود</span>
                  </>
                )}
              </button>
            </div>

            {/* Validation Feedback Message */}
            {validationMessage && (
              <div className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                isCodeValid 
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold' 
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {isCodeValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{validationMessage}</span>
              </div>
            )}

            {isCodeValid && (
              <p className="text-[10px] text-emerald-700 font-bold">
                ✓ تم التحقق بنجاح! سيتم تفعيل نشر الإعلان واستهلاك الكود فور الضغط على زر الحفظ أدناه.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Code Request Modal via WhatsApp */}
      <RequestSubscriptionCodeModal
        isOpen={isRequestModalOpen}
        currentUser={currentUser}
        onClose={() => setIsRequestModalOpen(false)}
        onCodeGenerated={handleCodeGenerated}
        onOpenAuth={onOpenAuth}
        adType={adType}
      />
    </div>
  );
}
