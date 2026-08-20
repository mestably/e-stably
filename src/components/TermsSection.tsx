/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Shield, FileText, CheckCircle2 } from 'lucide-react';

export default function TermsSection() {
  const terms = [
    "رسوم إضافة الإعلانات:\n* لإضافة أي إعلان على المنصة (20) ريال.",
    "إتمام عمليات البيع والنقل القانوني (وخاصة الخيل العربي):\n* عند إتمام عملية البيع وخصوصاً الخيل العربي يتم تحويل الأموال إلى المنصة، وتكون المنصة ملزمة بعملية النقل وإتمام عملية البيع من خلالها وبالطرق القانونية المعتمدة لضمان حقوق كافة الأطراف.",
    "حظر التلاعب والتحايل وإجراءات الملاحقة القانونية:\n* إذا لا قدر الله تم التلاعب من المشتري أو البائع بإتمام عملية البيع أو الشراء خارج المنصة وتم العلم بهذا، فإن للمنصة الحق الكامل في اتخاذ كافة الإجراءات القانونية حيال هذا الموقف أو ما شابه لضمان حقها كاملاً.",
    "المنصة وسيط إلكتروني بين البائع والمشتري فقط.",
    "المنصة لا تتحمل مسؤولية أي خلاف أو نزاع ينشأ بين البائع والمشتري بعد الاتفاق، مع احتفاظها بحق مراجعة البلاغات واتخاذ الإجراءات المناسبة.",
    "يجب على المستخدم قراءة جميع المعلومات والبيانات الموضحة في الإعلان قبل الشراء أو دفع العربون.",
    "لا يحق للمشتري استرداد العربون في حال التراجع عن الشراء أو عدم الجدية، ما لم يثبت وجود معلومات غير صحيحة أو إخفاء عيب مؤثر من قبل البائع.",
    "يمنح المشتري مهلة 48 ساعة للفحص واستكمال إجراءات الشراء والتخليص.",
    "يلتزم البائع بالإفصاح عن جميع العيوب أو المشاكل أو الحالات الصحية أو السلوكية التي تؤثر على سلامة الجواد أو قيمته.",
    "لا يقبل أي عربون بعد انتهاء المدة المحددة للمبايعة أو بعد إغلاق الإعلان.",
    "بعد استلام الجواد وخروجه من المربط أو الإسطبل لا يحق للمشتري المطالبة بالاسترجاع، إلا إذا ثبت وجود تدليس أو إخفاء عيب مؤثر لم يتم الإفصاح عنه.",
    "عمولة المنصة:\n* 2.5% من قيمة البيع إذا تجاوزت قيمة الجواد 10,000 ريال.\n* 130 ريال إذا كانت قيمة الجواد أقل من 10,000 ريال.\n* العمولة مستحقة عند إتمام البيع أو الاتفاق النهائي.",
    "يمنح المشتري مهلة يومين لاستلام الجواد بعد البيع، وبعد ذلك يتحمل رسوم إيواء بقيمة 50 ريال عن كل يوم تأخير.",
    "البائع مسؤول مسؤولية كاملة عن صحة الصور والمعلومات والمستندات المرفقة في الإعلان.",
    "يحق للمنصة حذف أو إيقاف أي إعلان مخالف أو مضلل أو يحتوي على معلومات غير صحيحة.",
    "الصدق والشفافية: أن يكون الوسيط أميناً ولا يغش البائع أو المشتري؛ لقوله ﷺ: «البَيِّعانِ بالخِيارِ ما لَمْ يَتَفَرَّقا، فإنْ صَدَقا وبَيَّنا بُورِكَ لهما في بَيْعِهِما، وإنْ كَتَبا وكَذَبا مُحِقَتْ بَرَكةُ بَيْعِهِما».\nيُحرم على التاجر أو البائع أن يبيع سلعة لا يملكها ولا تدخل في حيازته وقت البيع، إلا في حالات البيع المباحة شرعاً والمضبوطة بشروطها كعقد \"السلم\"."
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Header info */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-navy rounded-xl shrink-0">
            <FileText className="w-6 h-6 text-navy" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-black text-navy leading-tight">
              الشروط والأحكام الخاصة بمنصة ملتقى الخيول العربية
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              يرجى قراءة الشروط والأحكام التالية بعناية لضمان سلامة التعاملات والتعاون الكامل بين كافة أطراف المنصة.
            </p>
          </div>
        </div>

        {/* Sacred Texts & Guidance Banner */}
        <div className="pt-3 border-t border-slate-200/80 space-y-2">
          {/* Red Font Quranic Verse */}
          <div className="bg-red-50/80 border border-red-200/80 rounded-xl p-3 text-center">
            <p className="text-red-600 font-extrabold text-xs sm:text-sm leading-relaxed">
              نتبع قوله تعالى: &#123;يَا أَيُّهَا الَّذِينَ آمَنُوا أَوْفُوا بِالْعُقُودِ&#125;
            </p>
          </div>

          {/* Gold Font Hadith */}
          <div className="bg-amber-50/80 border border-gold/40 rounded-xl p-3 text-center">
            <p className="text-gold-dark font-black text-xs sm:text-sm leading-relaxed">
              قول رسول الله ﷺ «مَنْ حَمَلَ عَلَيْنَا السِّلَاحَ فَلَيْسَ مِنَّا، وَمَنْ غَشَّنَا فَلَيْسَ مِنَّا»
            </p>
          </div>
        </div>
      </div>

      {/* Verbatim rules list */}
      <div className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-50 overflow-hidden shadow-xs">
        {terms.map((term, index) => (
          <div key={index} className="p-4 flex items-start gap-3 hover:bg-slate-50/40 transition duration-150">
            <span className="flex items-center justify-center w-6 h-6 bg-gold-light text-gold-dark rounded-full text-xs font-extrabold shrink-0">
              {index + 1}
            </span>
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
              {term}
            </div>
          </div>
        ))}
      </div>

      {/* Safety Badge */}
      <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-4 flex gap-3 items-center">
        <Shield className="w-5 h-5 text-amber-500 shrink-0" />
        <span className="text-[11px] text-amber-800 font-medium leading-relaxed">
          إن استخدامك للمنصة ونشرك لأي إعلان يعد موافقة صريحة وكاملة منك على الالتزام بكافة الشروط والأحكام المذكورة أعلاه.
        </span>
      </div>

    </div>
  );
}
