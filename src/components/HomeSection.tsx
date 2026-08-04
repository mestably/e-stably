/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Award, 
  Home as HomeIcon, 
  ShieldCheck, 
  Truck, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  Users, 
  FileText,
  Clock
} from 'lucide-react';
import { Horse, Stable, Shelter, Transport } from '../types';
import { FirebaseService } from '../lib/firebase';

interface HomeSectionProps {
  onSelectTab: (tab: 'horses' | 'stables' | 'shelter' | 'transport') => void;
}

export default function HomeSection({ onSelectTab }: HomeSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [stats, setStats] = useState({
    horsesCount: 0,
    stablesCount: 0,
    sheltersCount: 0,
    transportsCount: 0,
  });

  // Dynamic slides combining real data & premium announcements
  const slides = [
    {
      id: 'slide_1',
      title: 'كحيلان الشقب - بطل جمال عربي أصيل',
      subtitle: 'فرصة نادرة لامتلاك حصان عربي مسجل ذو نسب فاخر من سلالات الأبطال',
      tag: 'إعلان مميز',
      badgeColor: 'bg-gold text-white',
      price: '85,000 ريال',
      image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1200',
      actionTab: 'horses' as const,
    },
    {
      id: 'slide_2',
      title: 'إيواء ملكي متكامل بالخالدية',
      subtitle: 'غرف مهواة ومكيفة، غذاء مخصص، رعاية بيطرية ٢٤ ساعة مع تدريب يومي',
      tag: 'إيواء فاخر',
      badgeColor: 'bg-navy text-white border border-gold',
      price: 'من ١,٢٠٠ ريال / شهرياً',
      image: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&q=80&w=1200',
      actionTab: 'shelter' as const,
    },
    {
      id: 'slide_3',
      title: 'مقطورات شحن خيول مزدوجة مكيفة',
      subtitle: 'نقل آمن لجميع مدن المملكة مع كاميرات مراقبة وتأمين صحي للجواد',
      tag: 'خدمات نقل',
      badgeColor: 'bg-emerald-600 text-white',
      price: 'أسعار تبدأ من ٥٠0 ريال',
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80&w=1200',
      actionTab: 'transport' as const,
    },
    {
      id: 'slide_4',
      title: 'مربط النخبة العربي للخيول الأصيلة',
      subtitle: 'انضم إلينا الآن وأضف إسطبلك الخاص لتصل لأكبر شريحة من عشاق ومربي الخيل',
      tag: 'مرابط موثقة',
      badgeColor: 'bg-indigo-600 text-white',
      price: 'توثيق فوري مجاني',
      image: 'https://images.unsplash.com/photo-1598974357801-cbca100e65d3?auto=format&fit=crop&q=80&w=1200',
      actionTab: 'stables' as const,
    }
  ];

  // Auto sliding interval (every 4.5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Load counts for dynamic counters
  useEffect(() => {
    const loadStats = async () => {
      try {
        const horses = await FirebaseService.getHorses();
        const stables = await FirebaseService.getStables();
        const shelters = await FirebaseService.getShelters();
        const transports = await FirebaseService.getTransports();
        
        setStats({
          horsesCount: horses.length || 2,
          stablesCount: stables.length || 2,
          sheltersCount: shelters.length || 1,
          transportsCount: transports.length || 1,
        });
      } catch (err) {
        console.warn('Failed to fetch stats for home, using defaults', err);
        setStats({
          horsesCount: 4,
          stablesCount: 3,
          sheltersCount: 2,
          transportsCount: 1,
        });
      }
    };
    loadStats();
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in" id="home_section_root">
      
      {/* 1. Animated Advertisement Slider Section */}
      <div className="relative h-[260px] sm:h-[360px] rounded-3xl overflow-hidden shadow-lg border border-slate-200/50 group bg-slate-900" id="ads_carousel">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            {/* Background Image overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 z-10" />
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover object-center"
              referrerPolicy="no-referrer"
            />
            
            {/* Slide Details */}
            <div className="absolute bottom-0 right-0 left-0 p-6 sm:p-10 z-20 text-white text-right space-y-2 sm:space-y-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold ${slide.badgeColor}`}>
                <Sparkles className="w-3 h-3 text-gold fill-current animate-pulse" />
                {slide.tag}
              </span>
              
              <h2 className="text-lg sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                {slide.title}
              </h2>
              
              <p className="text-xs sm:text-base text-slate-200 max-w-2xl line-clamp-2 leading-relaxed">
                {slide.subtitle}
              </p>
              
              <div className="pt-2 flex flex-wrap items-center gap-4 justify-between sm:justify-start">
                <span className="text-gold font-extrabold text-sm sm:text-xl">
                  {slide.price}
                </span>
                
                <button
                  onClick={() => onSelectTab(slide.actionTab)}
                  className="bg-gold hover:bg-gold-dark text-navy font-extrabold text-[11px] sm:text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1 shadow"
                >
                  <span>عرض التفاصيل</span>
                  <ArrowLeft className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Carousel Arrow Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-gold hover:text-navy transition cursor-pointer backdrop-blur-xs opacity-0 group-hover:opacity-100"
          id="prev_slide_btn"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-gold hover:text-navy transition cursor-pointer backdrop-blur-xs opacity-0 group-hover:opacity-100"
          id="next_slide_btn"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Indicator dots */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5" id="carousel_indicators">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide ? 'bg-gold w-6' : 'bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 2. Main Entry Action Area (الدخول للأقسام) */}
      <div className="text-center space-y-4 max-w-2xl mx-auto py-4" id="main_enter_action_area">
        <h3 className="text-lg sm:text-2xl font-black text-navy tracking-tight">
          ملتقى الخيول العربية الأصيلة
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          المنصة العربية الأولى المتكاملة لعرض وطلب الخيل العربي الأصيل، خدمات الإيواء الفاخر، الإسطبلات المسجلة، ونقل وتأمين الجياد بجميع مدن ومناطق المملكة.
        </p>
        
        <div className="pt-2">
          <button
            onClick={() => onSelectTab('horses')}
            className="relative inline-flex items-center gap-3 bg-navy hover:bg-navy-dark text-white font-extrabold text-sm sm:text-base px-10 py-4.5 rounded-2xl shadow-xl transition-all duration-300 hover:shadow-gold/20 hover:-translate-y-0.5 cursor-pointer group overflow-hidden"
            id="enter_sections_btn"
          >
            {/* Radiant Pulse Glow */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition duration-500" />
            
            <Sparkles className="w-5 h-5 text-gold animate-bounce" />
            <span>الدخول للأقسام وتصفح الإعلانات</span>
            <ArrowLeft className="w-4 h-4 text-gold group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* 3. Bento Grid of Departments / Sections */}
      <div className="space-y-4" id="departments_grid_section">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 bg-gold h-4 rounded-full" />
            <h4 className="font-bold text-navy text-sm sm:text-base">تصفح الأقسام والخدمات الفورية</h4>
          </div>
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium">اختر القسم للبدء</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="departments_grid">
          
          {/* Card 1: Horses */}
          <div
            onClick={() => onSelectTab('horses')}
            className="bg-white hover:border-gold/60 rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group text-right flex flex-col justify-between h-48"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-navy-light text-navy flex items-center justify-center group-hover:bg-navy group-hover:text-gold transition-colors duration-300 mb-4">
                <Award className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-800 text-sm group-hover:text-navy transition-colors">
                الخيول (بيع وإيجار)
              </h5>
              <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">
                عروض الخيل العربية الأصيلة، المهور والجمال، الشعبية والسباقات للبيع أو الإيجار اليومي والشهري.
              </p>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-2">
              <span className="text-[10px] font-bold text-gold-dark bg-gold-light px-2 py-0.5 rounded-md">
                {stats.horsesCount} إعلان متاح
              </span>
              <span className="text-[10px] text-navy font-bold flex items-center gap-1 group-hover:underline">
                تصفح الآن
                <ArrowLeft className="w-3 h-3 text-gold" />
              </span>
            </div>
          </div>

          {/* Card 2: Stables */}
          <div
            onClick={() => onSelectTab('stables')}
            className="bg-white hover:border-gold/60 rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group text-right flex flex-col justify-between h-48"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-navy-light text-navy flex items-center justify-center group-hover:bg-navy group-hover:text-gold transition-colors duration-300 mb-4">
                <HomeIcon className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-800 text-sm group-hover:text-navy transition-colors">
                الإسطبلات والمشروعات
              </h5>
              <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">
                دليل الإسطبلات المسجلة ومرابط إنتاج الجياد المعتمدة مع صور ووسائل التواصل المباشرة والتقييمات.
              </p>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-2">
              <span className="text-[10px] font-bold text-navy bg-navy-light px-2 py-0.5 rounded-md">
                {stats.stablesCount} مربط مسجل
              </span>
              <span className="text-[10px] text-navy font-bold flex items-center gap-1 group-hover:underline">
                تصفح الآن
                <ArrowLeft className="w-3 h-3 text-gold" />
              </span>
            </div>
          </div>

          {/* Card 3: Shelters */}
          <div
            onClick={() => onSelectTab('shelter')}
            className="bg-white hover:border-gold/60 rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group text-right flex flex-col justify-between h-48"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-navy-light text-navy flex items-center justify-center group-hover:bg-navy group-hover:text-gold transition-colors duration-300 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-800 text-sm group-hover:text-navy transition-colors">
                خدمات الإيواء والبوكسات
              </h5>
              <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">
                خدمات حجز البوكسات، الرعاية الطبية، تغذية وتدريب الخيول بشكل احترافي تحت إشراف طاقم فني.
              </p>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-2">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                {stats.sheltersCount} مركز إيواء
              </span>
              <span className="text-[10px] text-navy font-bold flex items-center gap-1 group-hover:underline">
                تصفح الآن
                <ArrowLeft className="w-3 h-3 text-gold" />
              </span>
            </div>
          </div>

          {/* Card 4: Transports */}
          <div
            onClick={() => onSelectTab('transport')}
            className="bg-white hover:border-gold/60 rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group text-right flex flex-col justify-between h-48"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-navy-light text-navy flex items-center justify-center group-hover:bg-navy group-hover:text-gold transition-colors duration-300 mb-4">
                <Truck className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-800 text-sm group-hover:text-navy transition-colors">
                نقل الخيول والمقطورات
              </h5>
              <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">
                رحلات نقل الجياد ومشاركة الرحلات، مقطورات مكيفة، نقل سريع وموثق بمختلف مناطق ومدن المملكة.
              </p>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-2">
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                {stats.transportsCount} رحلة نشطة
              </span>
              <span className="text-[10px] text-navy font-bold flex items-center gap-1 group-hover:underline">
                تصفح الآن
                <ArrowLeft className="w-3 h-3 text-gold" />
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Statistics and Trust Banner */}
      <div className="bg-navy rounded-3xl p-6 text-white text-right relative overflow-hidden shadow-lg border border-gold/20" id="trust_banner">
        {/* Subtle decorative background vector circles */}
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-gold/5 blur-2xl" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold fill-current" />
              <h4 className="font-extrabold text-sm sm:text-base text-gold">لماذا تختار ملتقى الخيول العربية؟</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              نوفر واجهة آمنة ومبسطة للتواصل المباشر عبر واتساب بين البائع والمشتري، جميع الإعلانات والخدمات تخضع للتوثيق والمراجعة ومكافحة الاحتيال لضمان تجربة آمنة تماماً ومريحة وموثوقة.
            </p>
          </div>
          
          <div className="flex items-center justify-around md:justify-end gap-6 border-t md:border-t-0 md:border-r border-slate-200/20 pt-4 md:pt-0 md:pr-6">
            <div className="text-center space-y-1">
              <Users className="w-5 h-5 text-gold mx-auto" />
              <span className="block font-black text-sm sm:text-base">+١,٥٠٠</span>
              <span className="block text-[9px] text-slate-400">عضو نشط</span>
            </div>
            <div className="text-center space-y-1">
              <CheckCircle2 className="w-5 h-5 text-gold mx-auto" />
              <span className="block font-black text-sm sm:text-base">١٠٠٪</span>
              <span className="block text-[9px] text-slate-400">آمن وموثق</span>
            </div>
            <div className="text-center space-y-1">
              <Clock className="w-5 h-5 text-gold mx-auto" />
              <span className="block font-black text-sm sm:text-base">٢٤/٧</span>
              <span className="block text-[9px] text-slate-400">دعم متواصل</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
