/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileCheck2, 
  Check, 
  X, 
  MessageCircle, 
  AlertCircle, 
  Clock, 
  Info,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { useAdminContact } from '../lib/useAdminContact';

export interface EditTermsAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  adTitle: string;
  adCategoryName: string; // 'خيل' | 'إسطبل' | 'إيواء' | 'نقل خيل'
  adId?: string;
  userName?: string;
  userPhone?: string;
  isSubmitting?: boolean;
}

export default function EditTermsAgreementModal({
  isOpen,
  onClose,
  onConfirm,
  adTitle,
  adCategoryName,
  adId,
  userName,
  userPhone,
  isSubmitting = false
}: EditTermsAgreementModalProps) {
  const [hasAgreed, setHasAgreed] = useState<boolean>(false);
  const [showError, setShowError] = useState<boolean>(false);
  const { adminWhatsApp, adminPhone } = useAdminContact();

  if (!isOpen) return null;

  const targetWhatsApp = adminWhatsApp || adminPhone || '201021464799';

  const handleAgreeAndSend = async () => {
    if (!hasAgreed) {
      setShowError(true);
      return;
    }
    setShowError(false);

    // Call onConfirm to save ad with isPendingEditApproval: true
    await onConfirm();

    // Prepare WhatsApp message to Admin
    const cleanNumber = targetWhatsApp.replace(/[^0-9]/g, '');
    const message = `السلام عليكم ورحمة الله،
أود إبلاغكم بأني قمت بإجراء وتأكيد تعديلات على إعلاني عبر منصة إستابلي:
- عنوان الإعلان: ${adTitle || 'بدون عنوان'}
- القسم: ${adCategoryName || 'عام'}
- كود الإعلان: #${adId ? adId.replace(/^(hrs_|stb_|shl_|trans_)/, '') : 'غير محدد'}
- اسم المعلن: ${userName || 'المعلن'}
- رقم جوال المعلن: ${userPhone || 'غير مسجل'}
- تم استيفاء الشروط والموافقة عليها والتعهد بصحة البيانات.

أرجو التكرم بمراجعة التعديلات والموافقة على نشر الإعلان عبر لوحة تحكم المنصة. شكراً لكم.`;

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanNumber}?text=${encoded}`;

    // Open WhatsApp in a new tab for user to send
    try {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('Could not open WhatsApp window automatically', e);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-navy text-white p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
                <FileCheck2 className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-md">
                    خطوة إتمام التعديلات 📋
                  </span>
                  <span className="text-[10px] bg-white/10 text-emerald-200 px-2 py-0.5 rounded-md font-bold">
                    إشعار المدير عبر الواتساب
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white mt-1">
                  شروط اعتماد التعديلات وسياسة النشر
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs sm:text-sm">
          
          {/* Ad Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold">الإعلان المراد حفظ تعديلاته:</span>
              <span className="font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                قسم {adCategoryName}
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-black text-slate-900 truncate">
              {adTitle || 'إعلان بدون عنوان'}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap pt-0.5">
              <span>المعلن: <strong className="text-slate-800">{userName || 'المستخدم'}</strong></span>
              {userPhone && <span>• الجوال: <strong className="text-slate-800 dir-ltr">{userPhone}</strong></span>}
              {adId && <span>• كود: <strong className="text-slate-600 font-mono">#{adId.slice(-6)}</strong></span>}
            </div>
          </div>

          {/* Terms List (قائمة الشروط المطلوب الموافقة عليها) */}
          <div className="space-y-2.5">
            <h5 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>قائمة الشروط والالتزامات (يرجى قراءتها بدقة):</span>
            </h5>

            <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p><strong>صحة ودقة البيانات المعدلة:</strong> يتعهد المعلن بأن جميع المعلومات والمواصفات والأسعار والصور المدخلة في التعديل صحيحة ومطابقة للواقع تماماً وخالية من أي غش أو تضليل.</p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p><strong>الملكية والتفويض:</strong> يقر المعلن بأنه المالك الفعلي للجواد أو المنشأة أو الخدمة، أو مفوض قانونياً بنشر وتعديل هذا الإعلان.</p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <p><strong>التوافق مع الشريعة والأنظمة:</strong> الالتزام التام بعدم مخالفة الأنظمة والقوانين السارية أو أحكام الشريعة الإسلامية في بيع وخدمات الخيل.</p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                <p><strong>مراجعة الإدارة والاعتماد:</strong> بعد حفظ التعديلات سيظهر الإعلان للمعلن بحالة <span className="text-amber-800 font-bold bg-amber-100 px-1 py-0.5 rounded">في انتظار موافقة الإدارة على التعديلات ⏳</span> حتى يقوم مدير المنصة بمراجعتها واعتماد النشر.</p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">5</span>
                <p><strong>إشعار المدير عبر الواتساب:</strong> سيتم تجهيز وإرسال رسالة مباشرة للمدير تتضمن بيانات الإعلان لسرعة فحص التعديلات واتخاذ القرار بالنشر.</p>
              </div>
            </div>
          </div>

          {/* Agreement Checkbox */}
          <div className="pt-2">
            <label 
              className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer select-none ${
                hasAgreed 
                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300/60' 
                  : showError 
                  ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200' 
                  : 'bg-slate-50 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <input
                type="checkbox"
                checked={hasAgreed}
                onChange={(e) => {
                  setHasAgreed(e.target.checked);
                  if (e.target.checked) setShowError(false);
                }}
                className="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 border-slate-300 shrink-0 mt-0.5 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-black text-slate-900 block mb-0.5">
                  أوافق وأتعهد بالالتزام بكافة الشروط المذكورة أعلاه *
                </span>
                <span className="text-slate-600 text-[11px] block leading-relaxed">
                  أتحمل المسؤولية الكاملة عن صحة البيانات المعدلة وأطلب إرسال التعديلات لمدير المنصة عبر الواتساب للموافقة على نشرها.
                </span>
              </div>
            </label>

            {showError && (
              <p className="text-rose-600 text-xs font-bold mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>يجب تحديد مربع الموافقة على الشروط للمتابعة.</span>
              </p>
            )}
          </div>

          {/* Explanation Alert */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-black block">ملاحظة هامة:</span>
              <p className="text-blue-800 text-[11px]">
                سيتم حفظ التعديلات وإظهار حالة <span className="font-bold underline">"في انتظار الموافقة على التعديلات"</span> في صفحتك فقط، وسيفتح تطبيق الواتساب لإرسال الإشعار للمدير مباشرة لسرعة مراجعتها واعتماد النشر.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleAgreeAndSend}
            className={`flex-1 py-3 px-4 rounded-xl text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer ${
              hasAgreed 
                ? 'bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 hover:shadow-lg' 
                : 'bg-slate-400 hover:bg-slate-500'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>الموافقة وإرسال التعديل للمدير عبر الواتساب ✓</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-3 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs sm:text-sm border border-slate-300 transition cursor-pointer"
          >
            إلغاء والعودة
          </button>
        </div>

      </div>
    </div>
  );
}
