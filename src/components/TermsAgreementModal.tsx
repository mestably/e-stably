/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Check, AlertCircle, X, ScrollText, Sparkles, Scale, BookOpen } from 'lucide-react';

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
  title = 'الشروط والأحكام الخاصة بنشر الإعلانات',
  categoryName = 'الإعلان',
  isSubmitting = false,
}: TermsAgreementModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  if (!isOpen) return null;

  const termsList = [
    {
      title: 'رسوم إضافة الإعلانات',
      desc: 'لإضافة أي إعلان على المنصة (20) ريال.',
    },
    {
      title: 'إتمام عمليات البيع والنقل القانوني (وخاصة الخيل العربي)',
      desc: 'عند إتمام عملية البيع وخصوصاً الخيل العربي يتم تحويل الأموال إلى المنصة، وتكون المنصة ملزمة بعملية النقل وإتمام عملية البيع من خلالها وبالطرق القانونية المعتمدة لضمان حقوق كافة الأطراف.',
    },
    {
      title: 'حظر التلاعب والتحايل وإجراءات الملاحقة القانونية',
      desc: 'إذا لا قدر الله تم التلاعب من المشتري أو البائع بإتمام عملية البيع أو الشراء خارج المنصة وتم العلم بهذا، فإن للمنصة الحق الكامل في اتخاذ كافة الإجراءات القانونية حيال هذا الموقف أو ما شابه لضمان حقها كاملاً.',
    },
    {
      title: 'طبيعة عمل المنصة كـوسيط إلكتروني',
      desc: 'المنصة وسيط إلكتروني بين البائع والمشتري فقط.',
    },
    {
      title: 'إخلاء المسؤولية بعد إتمام الاتفاق',
      desc: 'المنصة لا تتحمل مسؤولية أي خلاف أو نزاع ينشأ بين البائع والمشتري بعد الاتفاق، مع احتفاظها بحق مراجعة البلاغات واتخاذ الإجراءات المناسبة.',
    },
    {
      title: 'واجب التحقق وقراءة كافة البيانات',
      desc: 'يجب على المستخدم قراءة جميع المعلومات والبيانات الموضحة في الإعلان قبل الشراء أو دفع العربون.',
    },
    {
      title: 'سياسة العربون وعدم الجدية',
      desc: 'لا يحق للمشتري استرداد العربون في حال التراجع عن الشراء أو عدم الجدية، ما لم يثبت وجود معلومات غير صحيحة أو إخفاء عيب مؤثر من قبل البائع.',
    },
    {
      title: 'مهلة الفحص والتخليص (48 ساعة)',
      desc: 'يمنح المشتري مهلة 48 ساعة للفحص واستكمال إجراءات الشراء والتخليص.',
    },
    {
      title: 'الصدق والأمانة والإفصاح عن العيوب',
      desc: 'يلتزم البائع بالإفصاح عن جميع العيوب أو المشاكل أو الحالات الصحية أو السلوكية التي تؤثر على سلامة الجواد أو قيمته.',
    },
    {
      title: 'توقيت وقبول دفع العربون',
      desc: 'لا يقبل أي عربون بعد انتهاء المدة المحددة للمبايعة أو بعد إغلاق الإعلان.',
    },
    {
      title: 'استلام الجواد ومعاينة الخروج من المربط',
      desc: 'بعد استلام الجواد وخروجه من المربط أو الإسطبل لا يحق للمشتري المطالبة بالاسترجاع، إلا إذا ثبت وجود تدليس أو إخفاء عيب مؤثر لم يتم الإفصاح عنه.',
    },
    {
      title: 'عمولة المنصة والمستحقات المالية',
      desc: 'عمولة المنصة 2.5% من قيمة البيع إذا تجاوزت قيمة الجواد 10,000 ريال، أو 130 ريال إذا كانت قيمة الجواد أقل من 10,000 ريال، وتعتبر العمولة مستحقة عند إتمام البيع أو الاتفاق النهائي.',
    },
    {
      title: 'مهلة الاستلام ورسوم الإيواء اليومية',
      desc: 'يمنح المشتري مهلة يومين لاستلام الجواد بعد البيع، وبعد ذلك يتحمل رسوم إيواء بقيمة 50 ريال عن كل يوم تأخير.',
    },
    {
      title: 'صحة البيانات والصور والوثائق المرفقة',
      desc: 'البائع مسؤول مسؤولية كاملة عن صحة الصور والمعلومات والمستندات وأرقام التواصل المرفقة في الإعلان.',
    },
    {
      title: 'صلاحيات الإدارة والرقابة والحذف',
      desc: 'يحق للمنصة حذف أو إيقاف أي إعلان مخالف أو مضلل أو يحتوي على معلومات غير صحيحة دون أي التزام.',
    },
    {
      title: 'الصدق والشفافية وحظر بيع ما لا يملك',
      desc: 'أن يكون الوسيط أميناً ولا يغش البائع أو المشتري؛ لقوله ﷺ: «البَيِّعانِ بالخِيارِ ما لَمْ يَتَفَرَّقا، فإنْ صَدَقا وبَيَّنا بُورِكَ لهما في بَيْعِهِما، وإنْ كَتَبا وكَذَبا مُحِقَتْ بَرَكةُ بَيْعِهِما». ويُحرم على التاجر أو البائع أن يبيع سلعة لا يملكها ولا تدخل في حيازته وقت البيع، إلا في حالات البيع المباحة شرعاً والمضبوطة بشروطها كعقد "السلم".',
    },
  ];

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
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden my-auto z-10"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-amber-50/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/15 text-gold-dark flex items-center justify-center shrink-0 border border-gold/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-navy text-sm sm:text-base leading-tight">
                  {title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  خطوة أساسية قبل إتمام نشر {categoryName} على المنصة
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 text-slate-400 hover:text-navy hover:bg-slate-100 rounded-lg transition"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Terms Content */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-700 text-xs">
            
            {/* Islamic Sacred Text Guidance */}
            <div className="space-y-2 bg-amber-50/60 p-3.5 rounded-xl border border-gold/30">
              <div className="flex items-center gap-2 text-gold-dark font-bold text-xs pb-1 border-b border-gold/20">
                <BookOpen className="w-4 h-4" />
                <span>الضوابط الشرعية والأمانة في التعامل</span>
              </div>
              <p className="text-red-700 font-extrabold text-xs text-center py-1 bg-red-50/80 rounded-lg border border-red-200/60">
                قال الله تعالى: &#123;يَا أَيُّهَا الَّذِينَ آمَنُوا أَوْفُوا بِالْعُقُودِ&#125;
              </p>
              <p className="text-navy font-bold text-[11px] text-center">
                قول رسول الله ﷺ: «مَنْ حَمَلَ عَلَيْنَا السِّلَاحَ فَلَيْسَ مِنَّا، وَمَنْ غَشَّنَا فَلَيْسَ مِنَّا»
              </p>
              <p className="text-slate-600 text-[10.5px] leading-relaxed text-center">
                «البَيِّعانِ بالخِيارِ ما لَمْ يَتَفَرَّقا، فإنْ صَدَقا وبَيَّنا بُورِكَ لهما في بَيْعِهِما، وإنْ كَتَبا وكَذَبا مُحِقَتْ بَرَكةُ بَيْعِهِما»
              </p>
            </div>

            {/* Terms List */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-navy text-xs">
                <Scale className="w-4 h-4 text-gold-dark" />
                <span>بنود وشروط النشر المعتمدة:</span>
              </div>
              
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/40">
                {termsList.map((t, idx) => (
                  <div key={idx} className="p-3 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-navy text-xs">{t.title}</h4>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{t.desc}</p>
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
              className={`p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex items-start gap-3 ${
                agreed
                  ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                  : showWarning
                  ? 'bg-red-50 border-red-400 animate-pulse'
                  : 'bg-white border-slate-300 hover:border-gold hover:bg-amber-50/30'
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
                <label className="font-extrabold text-navy text-xs sm:text-sm cursor-pointer block">
                  قرأت الشروط والأحكام جيداً وأتعهد بالالتزام بها
                </label>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  أقر بأن كافة المعلومات والبيانات والصور المرفقة في الإعلان صحيحة ودقيقة، وأتحمل كامل المسؤولية الشرعية والقانونية عنها.
                </p>
              </div>
            </div>

            {/* Validation Warning if attempted without checking */}
            {showWarning && !agreed && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 bg-red-100/80 border border-red-300 rounded-xl text-red-800 text-xs flex items-center gap-2 font-bold"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>يجب التأشير على خانة الموافقة على الشروط والأحكام أولاً لإتمام النشر.</span>
              </motion.div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
            <button
              onClick={handleConfirmClick}
              disabled={isSubmitting}
              className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                agreed
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-navy hover:bg-navy-dark text-white opacity-85'
              }`}
            >
              {isSubmitting ? (
                <span>جاري النشر...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>تأكيد ونشر الإعلان الآن</span>
                </>
              )}
            </button>

            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="py-3 px-5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition text-xs cursor-pointer"
            >
              تراجع وتعديل
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
