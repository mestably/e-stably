/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, AlertCircle, X, Scale, ScrollText } from 'lucide-react';

interface TermsAgreementModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  categoryName?: string;
  isSubmitting?: boolean;
}

export default function TermsAgreementModal({
  isOpen,
  onConfirm,
  onCancel,
  title = 'معاهدة المنصة',
  categoryName = 'الإعلان',
  isSubmitting = false,
}: TermsAgreementModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  if (!isOpen) return null;

  const handleConfirmClick = () => {
    if (!agreed) {
      setShowWarning(true);
      return;
    }
    setShowWarning(false);
    onConfirm();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden my-auto z-10"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-amber-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-2xs">
                <ScrollText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-black text-navy text-base sm:text-lg leading-tight">
                  {title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  إقرار وتعهد معلن المنصة قبل إتمام نشر {categoryName}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 text-slate-400 hover:text-navy hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: Covenant Formula and Sacred Texts */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-right">
            
            {/* The Solemn Covenant Box */}
            <div className="bg-gradient-to-b from-rose-50/90 via-red-50/80 to-amber-50/60 border-2 border-red-300/90 rounded-2xl p-4 sm:p-5 text-red-700 shadow-sm space-y-3">
              
              <div className="space-y-1.5 text-center sm:text-right border-b border-red-200/80 pb-3">
                <p className="font-black text-red-700 text-sm sm:text-base leading-relaxed">
                  اتعهد واقسم بالله أنا المعلن أن أدفع عمولة المنصة
                </p>
                <p className="font-extrabold text-red-700 text-xs sm:text-sm leading-relaxed">
                  وكما أتعهد بدفع الرسوم خلال 10 أيام من استلام مبلغ المبايعة
                </p>
                <p className="font-black text-red-800 text-sm sm:text-base pt-1">
                  أتعهد بذلك
                </p>
              </div>

              {/* Quranic Sacred Verse */}
              <div className="pt-1 text-center text-slate-800 text-xs sm:text-[13px] font-bold leading-relaxed space-y-1 bg-white/70 p-3 rounded-xl border border-red-100 shadow-2xs">
                <span className="block text-red-800 font-extrabold text-[11px]">بِسْمِ اللَّـهِ الرَّحْمَـٰنِ الرَّحِيمِ</span>
                <p className="text-red-700 font-black leading-normal">
                  قال الله تعالى: &quot;وَأَوْفُوا بِعَهْدِ اللَّهِ إِذَا عَاهَدْتُمْ وَلَا تَنقُضُوا الْأَيْمَانَ بَعْدَ تَوْكِيدِهَا وَقَدْ جَعَلْتُمُ اللَّهَ عَلَيْكُمْ كَفِيلًا&quot;
                </p>
                <span className="block text-slate-500 text-[11px] font-bold">صدق الله العظيم</span>
              </div>
            </div>

            {/* Mandatory Checkbox Agreement Card: أتعهد بذلك */}
            <div
              onClick={() => {
                setAgreed(!agreed);
                if (showWarning) setShowWarning(false);
              }}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer select-none flex items-start gap-3.5 shadow-xs ${
                agreed
                  ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-400/20'
                  : showWarning
                  ? 'bg-red-50 border-red-400 animate-pulse'
                  : 'bg-slate-50/80 border-slate-300 hover:border-gold hover:bg-amber-50/30'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                  agreed
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : showWarning
                    ? 'border-red-500 bg-white'
                    : 'border-slate-400 bg-white'
                }`}
              >
                {agreed && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
              <div className="space-y-0.5">
                <label className="font-black text-slate-900 text-sm sm:text-base cursor-pointer block">
                  أتعهد بذلك
                </label>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  أقر وأقسم بالله بالالتزام التام بسداد عمولة المنصة ورسومها في موعدها دون تأخير.
                </p>
              </div>
            </div>

            {/* Validation Warning if attempted without checking */}
            {showWarning && !agreed && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-100 border border-red-300 rounded-xl text-red-800 text-xs flex items-center gap-2 font-bold shadow-2xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>يجب التعليم على «أتعهد بذلك» أولاً للمتابعة ونشر الإعلان.</span>
              </motion.div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
            <button
              onClick={handleConfirmClick}
              disabled={isSubmitting}
              className={`flex-1 py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] ${
                agreed
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                  : 'bg-navy hover:bg-navy-dark text-white'
              }`}
            >
              {isSubmitting ? (
                <span>جاري نشر الإعلان...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>نشر الإعلان</span>
                </>
              )}
            </button>

            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="py-3.5 px-5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-2xl border border-slate-200 transition text-xs cursor-pointer"
            >
              تراجع وتعديل
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
