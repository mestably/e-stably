/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ShieldCheck, BookOpen, Scale, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { PLATFORM_TERMS_LIST } from '../data/termsData';

interface NewSubscriberTermsViewProps {
  onAgreeAndProceed: () => void;
  onBackToLogin: () => void;
  isForGoogle?: boolean;
  googleUserName?: string;
  isSubmitting?: boolean;
}

export default function NewSubscriberTermsView({
  onAgreeAndProceed,
  onBackToLogin,
  isForGoogle = false,
  googleUserName,
  isSubmitting = false,
}: NewSubscriberTermsViewProps) {
  const [agreed, setAgreed] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const handleConfirm = () => {
    if (!agreed) {
      setShowWarning(true);
      return;
    }
    setShowWarning(false);
    onAgreeAndProceed();
  };

  return (
    <div className="space-y-4 text-right" dir="rtl">
      
      {/* Prominent Header at the very top as requested */}
      <div className="bg-gradient-to-r from-navy via-navy-light to-navy text-white p-4 rounded-2xl shadow-md border border-navy/40 space-y-1.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gold/20 text-gold flex items-center justify-center shrink-0 border border-gold/30">
            <Scale className="w-4 h-4 text-gold" />
          </div>
          <div>
            <h3 className="font-black text-xs sm:text-sm text-gold leading-tight">
              قائمة الشروط والأحكام يجب قراءتها جيداً قبل الاشتراك
            </h3>
            <p className="text-[11px] text-slate-200 mt-0.5 leading-relaxed">
              خطوة إلزامية لجميع المشتركين الجدد لضمان الأمانة والالتزام بالضوابط الشرعية والقانونية
            </p>
          </div>
        </div>

        {isForGoogle && googleUserName && (
          <div className="mt-2 pt-2 border-t border-white/10 text-[11px] text-amber-200 flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-ping"></span>
            <span>مرحباً بك ({googleUserName})، يرجى الموافقة على الشروط لإتمام تسجيلك السريع عبر Google:</span>
          </div>
        )}
      </div>

      {/* Islamic Sacred Guidance Box */}
      <div className="space-y-2 bg-amber-50/70 p-3.5 rounded-2xl border border-gold/30 text-xs">
        <div className="flex items-center gap-2 text-gold-dark font-extrabold pb-1 border-b border-gold/20">
          <BookOpen className="w-4 h-4" />
          <span>الضوابط الشرعية والأمانة في التعامل</span>
        </div>
        <p className="text-red-700 font-extrabold text-xs text-center py-1.5 bg-red-50/90 rounded-xl border border-red-200/70 shadow-2xs">
          قال الله تعالى: &#123;يَا أَيُّهَا الَّذِينَ آمَنُوا أَوْفُوا بِالْعُقُودِ&#125;
        </p>
        <p className="text-navy font-bold text-[11px] text-center">
          قول رسول الله ﷺ: «مَنْ حَمَلَ عَلَيْنَا السِّلَاحَ فَلَيْسَ مِنَّا، وَمَنْ غَشَّنَا فَلَيْسَ مِنَّا»
        </p>
        <p className="text-slate-600 text-[10.5px] leading-relaxed text-center">
          «البَيِّعانِ بالخِيارِ ما لَمْ يَتَفَرَّقا، فإنْ صَدَقا وبَيَّنا بُورِكَ لهما في بَيْعِهِما، وإنْ كَتَبا وكَذَبا مُحِقَتْ بَرَكةُ بَيْعِهِما»
        </p>
      </div>

      {/* Scrollable Terms List (16 Clauses) with Oath under Clause 16 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-navy font-bold text-xs px-1">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-gold-dark" />
            <span>بنود الاتفاقية والشروط (16 بنداً):</span>
          </span>
          <span className="text-[10px] text-slate-400 font-normal">مرّر لأسفل لقراءة جميع البنود</span>
        </div>

        <div className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white shadow-2xs p-1 scrollbar-thin scrollbar-thumb-slate-300">
          {PLATFORM_TERMS_LIST.map((t, idx) => (
            <div key={t.id} className="p-3 flex items-start gap-2.5 hover:bg-slate-50/60 transition">
              <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                {idx + 1}
              </span>
              <div className="space-y-1 flex-1 text-right">
                <h4 className="font-extrabold text-navy text-xs leading-snug">{t.title}</h4>
                <p className="text-slate-600 text-[11px] leading-relaxed whitespace-pre-line font-medium">
                  {t.desc}
                </p>

                {/* Solemn Oath & Quran Verse Box Under Clause 16 */}
                {idx === 15 && (
                  <div className="mt-3 p-3.5 bg-red-50/95 border border-red-200 rounded-2xl text-red-600 font-black text-xs leading-relaxed space-y-1.5 shadow-xs text-right">
                    <p className="font-black text-red-600 text-xs sm:text-[13px]">
                      اتعهد واقسم بالله أنا المعلن أن أدفع عمولة المنصة
                    </p>
                    <p className="font-extrabold text-red-600 text-xs sm:text-[13px]">
                      وكما أتعهد بدفع الرسوم خلال 10 أيام من استلام مبلغ المبايعة
                    </p>
                    <p className="font-black text-red-700 text-xs sm:text-[13px]">
                      أتعهد بذلك
                    </p>
                    <div className="pt-2 mt-1 border-t border-red-200 text-red-700 text-[11px] sm:text-xs font-bold leading-normal">
                      بسم الله الرحمن الرحيم قال الله تعالى: &quot;وَأَوْفُوا بِعَهْدِ اللَّهِ إِذَا عَاهَدْتُمْ وَلَا تَنقُضُوا الْأَيْمَانَ بَعْدَ تَوْكِيدِهَا وَقَدْ جَعَلْتُمُ اللَّهَ عَلَيْكُمْ كَفِيلًا&quot; صدق الله العظيم
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mandatory Checkbox Agreement Card */}
      <div
        onClick={() => {
          setAgreed(!agreed);
          if (showWarning) setShowWarning(false);
        }}
        className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none flex items-start gap-3 text-right shadow-xs ${
          agreed
            ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-400/20'
            : showWarning
            ? 'bg-red-50 border-red-400 animate-pulse'
            : 'bg-slate-50/70 border-slate-300 hover:border-gold hover:bg-amber-50/40'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition ${
            agreed
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : showWarning
              ? 'border-red-500 bg-white'
              : 'border-slate-400 bg-white'
          }`}
        >
          {agreed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </div>
        <div className="space-y-0.5">
          <label className="font-black text-navy text-xs sm:text-sm cursor-pointer block">
            قرأت ووافقت على كل البنود
          </label>
          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            أتعهد بالالتزام التام بكافة بنود الشروط والأحكام وضوابط المنصة الموضحة أعلاه طوال فترة اشتراكي.
          </p>
        </div>
      </div>

      {/* Warning message if button clicked without checking */}
      {showWarning && !agreed && (
        <div className="p-2.5 bg-red-100 border border-red-300 rounded-xl text-red-800 text-xs flex items-center gap-2 font-bold shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>يرجى التأشير على «قرأت ووافقت على كل البنود» أولاً للمتابعة.</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting}
          className={`w-full py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] ${
            agreed
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
              : 'bg-navy hover:bg-navy-dark text-white'
          }`}
        >
          {isSubmitting ? (
            <span>جاري إتمام التسجيل...</span>
          ) : isForGoogle ? (
            <>
              <Check className="w-4 h-4" />
              <span>قرأت ووافقت على كل البنود - إتمام التسجيل بواسطة Google</span>
            </>
          ) : (
            <>
              <span>قرأت ووافقت على كل البنود - المتابعة للتسجيل</span>
              <ArrowLeft className="w-4 h-4" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full text-center text-xs text-slate-500 hover:text-navy hover:underline py-1.5 transition cursor-pointer"
        >
          لديك حساب بالفعل؟ تسجيل الدخول
        </button>
      </div>

    </div>
  );
}
