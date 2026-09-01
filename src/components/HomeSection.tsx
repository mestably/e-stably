/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, TouchEvent, MouseEvent } from 'react';
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
  Clock,
  Shuffle,
  Eye,
  Tag
} from 'lucide-react';
import { Horse, Stable, Shelter, Transport, User } from '../types';
import { FirebaseService } from '../lib/firebase';
import DetailModal from './DetailModal';

interface HomeSectionProps {
  onSelectTab: (tab: 'horses' | 'stables' | 'shelter' | 'transport') => void;
  currentUser?: User | null;
}

interface AdSlide {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  badgeColor: string;
  price: string;
  image: string;
  actionTab: 'horses' | 'stables' | 'shelter' | 'transport';
  itemType: 'horse' | 'stable' | 'shelter' | 'transport';
  rawItem?: Horse | Stable | Shelter | Transport;
  isRealAd: boolean;
}

// Fallback curated slides in case database has no items yet
const DEFAULT_CURATED_SLIDES: AdSlide[] = [
  {
    id: 'curated_slide_1',
    title: 'كحيلان الشقب - بطل جمال عربي أصيل',
    subtitle: 'فرصة نادرة لامتلاك حصان عربي مسجل ذو نسب فاخر من سلالات الأبطال',
    tag: 'خيل للبيع',
    badgeColor: 'bg-gold text-navy font-bold shadow-sm',
    price: '85,000 ريال',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1200',
    actionTab: 'horses',
    itemType: 'horse',
    isRealAd: false,
  },
  {
    id: 'curated_slide_2',
    title: 'إيواء ملكي متكامل بالخالدية',
    subtitle: 'غرف مهواة ومكيفة، غذاء مخصص، رعاية بيطرية ٢٤ ساعة مع تدريب يومي',
    tag: 'إيواء فاخر',
    badgeColor: 'bg-indigo-600 text-white',
    price: 'من 1,200 ريال / شهرياً',
    image: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&q=80&w=1200',
    actionTab: 'shelter',
    itemType: 'shelter',
    isRealAd: false,
  },
  {
    id: 'curated_slide_3',
    title: 'مقطورات شحن خيول مزدوجة مكيفة',
    subtitle: 'نقل آمن لجميع مدن المملكة مع كاميرات مراقبة وتأمين صحي للجواد',
    tag: 'خدمات نقل',
    badgeColor: 'bg-emerald-600 text-white',
    price: 'أسعار تبدأ من 500 ريال',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80&w=1200',
    actionTab: 'transport',
    itemType: 'transport',
    isRealAd: false,
  },
  {
    id: 'curated_slide_4',
    title: 'مربط النخبة العربي للخيول الأصيلة',
    subtitle: 'انضم إلينا الآن وتصفح الإسطبلات المسجلة لتصل لأكبر شريحة من عشاق ومربي الخيل',
    tag: 'مرابط معتمدة',
    badgeColor: 'bg-navy text-gold border border-gold/40',
    price: 'مرابط وإنتاج',
    image: 'https://images.unsplash.com/photo-1598974357801-cbca100e65d3?auto=format&fit=crop&q=80&w=1200',
    actionTab: 'stables',
    itemType: 'stable',
    isRealAd: false,
  }
];

// Helper to shuffle an array randomly (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function HomeSection({ onSelectTab, currentUser = null }: HomeSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<AdSlide[]>(DEFAULT_CURATED_SLIDES);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState<{
    item: Horse | Stable | Shelter | Transport;
    type: 'horse' | 'stable' | 'shelter' | 'transport';
  } | null>(null);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const [stats, setStats] = useState({
    horsesCount: 0,
    stablesCount: 0,
    sheltersCount: 0,
    transportsCount: 0,
  });

  // Load real published ads from all sections and shuffle them randomly
  const loadRealAds = useCallback(async () => {
    try {
      const [horses, stables, shelters, transports] = await Promise.all([
        FirebaseService.getHorses(),
        FirebaseService.getStables(),
        FirebaseService.getShelters(),
        FirebaseService.getTransports()
      ]);

      setStats({
        horsesCount: horses.length,
        stablesCount: stables.length,
        sheltersCount: shelters.length,
        transportsCount: transports.length,
      });

      const realSlides: AdSlide[] = [];

      // 1. Map Horses into slides
      horses.forEach((horse) => {
        const breedLabel = horse.breed === 'arabian' ? 'خيل عربي أصيل' : horse.breed === 'shabi' ? 'خيل شعبي' : 'سيسي';
        const priceLabel = horse.adType === 'sale'
          ? (horse.price && horse.price > 0 ? `${horse.price.toLocaleString('ar-SA')} ريال` : 'السعر حسب الاتفاق')
          : (horse.price && horse.price > 0 ? `${horse.price.toLocaleString('ar-SA')} ريال` : 'عند التواصل');
        const healthOrDetails = horse.healthStatus || `العمر: ${horse.age} سنوات • اللون: ${horse.color}`;
        const mainImage = horse.images?.[0] || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1200';

        realSlides.push({
          id: `horse_${horse.id}`,
          title: `${horse.name} (${breedLabel})`,
          subtitle: `${healthOrDetails} • ${horse.stableName || 'إعلان مستخدم'}`,
          tag: horse.adType === 'sale' ? (horse.isSold ? 'تم البيع' : 'خيل للبيع') : 'خيل للإيجار',
          badgeColor: horse.adType === 'sale' ? 'bg-gold text-navy font-bold shadow-sm' : 'bg-emerald-600 text-white',
          price: priceLabel,
          image: mainImage,
          actionTab: 'horses',
          itemType: 'horse',
          rawItem: horse,
          isRealAd: true,
        });
      });

      // 2. Map Stables into slides
      stables.forEach((stable) => {
        const mainImage = stable.images?.[0] || 'https://images.unsplash.com/photo-1598974357801-cbca100e65d3?auto=format&fit=crop&q=80&w=1200';
        realSlides.push({
          id: `stable_${stable.id}`,
          title: stable.name,
          subtitle: stable.description || 'مربط وإسطبل متكامل لتربية وتدريب الخيول العربية',
          tag: stable.verified === 'verified' ? 'إسطبل موثق' : 'إسطبل ومربط',
          badgeColor: 'bg-navy text-gold border border-gold/40',
          price: stable.horseCount ? `${stable.horseCount} خيل متوفر` : 'مرابط وخيول',
          image: mainImage,
          actionTab: 'stables',
          itemType: 'stable',
          rawItem: stable,
          isRealAd: true,
        });
      });

      // 3. Map Shelters into slides
      shelters.forEach((shelter) => {
        const mainImage = shelter.images?.[0] || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&q=80&w=1200';
        realSlides.push({
          id: `shelter_${shelter.id}`,
          title: shelter.title,
          subtitle: shelter.description || 'خدمات إيواء وبوكسات مهواة مع رعاية بيطرية وغذائية كاملة',
          tag: shelter.type === 'monthly' ? 'إيواء شهري' : 'إيواء يومي',
          badgeColor: 'bg-indigo-600 text-white',
          price: 'إيواء ورعاية متكاملة',
          image: mainImage,
          actionTab: 'shelter',
          itemType: 'shelter',
          rawItem: shelter,
          isRealAd: true,
        });
      });

      // 4. Map Transports into slides
      transports.forEach((transport) => {
        const mainImage = 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80&w=1200';
        const priceLabel = transport.price ? `${transport.price.toLocaleString('ar-SA')} ريال` : 'عند الاتفاق';
        realSlides.push({
          id: `transport_${transport.id}`,
          title: `رحلة نقل: من ${transport.pickupAddress || 'الموقع'} إلى ${transport.deliveryAddress || 'الوجهة'}`,
          subtitle: `نوع المركبة: ${transport.vehicleType || 'مقطورة شحن'} • سعة الخيل: ${transport.horseCount || 1} • التاريخ: ${transport.date || 'فوري'}`,
          tag: 'نقل خيول ومقطورات',
          badgeColor: 'bg-amber-600 text-white',
          price: priceLabel,
          image: mainImage,
          actionTab: 'transport',
          itemType: 'transport',
          rawItem: transport,
          isRealAd: true,
        });
      });

      if (realSlides.length > 0) {
        // Shuffle randomly
        const randomized = shuffleArray(realSlides);
        // Take up to 10 slides for optimal performance
        setSlides(randomized.slice(0, 10));
      } else {
        setSlides(shuffleArray(DEFAULT_CURATED_SLIDES));
      }
    } catch (err) {
      console.warn('Failed to load real ads for slider:', err);
      // Fallback
      setSlides(shuffleArray(DEFAULT_CURATED_SLIDES));
    }
  }, []);

  useEffect(() => {
    loadRealAds();

    const handleSync = () => {
      loadRealAds();
    };

    window.addEventListener('horses_forum_sync_complete', handleSync);
    return () => {
      window.removeEventListener('horses_forum_sync_complete', handleSync);
    };
  }, [loadRealAds]);

  // Auto sliding interval (every 4.5 seconds) unless paused by user interaction
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  // Manual navigation handlers
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Reshuffle ads manually on request
  const handleReshuffle = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setSlides((prev) => shuffleArray(prev));
    setCurrentSlide(0);
  };

  // Touch Swipe handlers for mobile
  const handleTouchStart = (e: TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped left -> next
        nextSlide();
      } else {
        // Swiped right -> prev
        prevSlide();
      }
    }
    setTouchStartX(null);
  };

  const handleSlideAction = (slide: AdSlide) => {
    if (slide.rawItem) {
      setSelectedItemForModal({
        item: slide.rawItem,
        type: slide.itemType,
      });
    } else {
      onSelectTab(slide.actionTab);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in" id="home_section_root">
      
      {/* 1. Animated Advertisement Slider Section with Live Published Ads & Real Controls */}
      <div 
        className="relative h-[280px] sm:h-[380px] rounded-3xl overflow-hidden shadow-xl border border-slate-200/60 group bg-slate-950 select-none"
        id="ads_carousel"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-all duration-700 ease-out ${
              index === currentSlide ? 'opacity-100 scale-100 z-10 pointer-events-auto' : 'opacity-0 scale-95 z-0 pointer-events-none'
            }`}
          >
            {/* Background Image overlay with rich contrast gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/30 z-10" />
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover object-center"
              referrerPolicy="no-referrer"
            />
            
            {/* Slide Details overlay */}
            <div className="absolute bottom-0 right-0 left-0 p-5 sm:p-10 z-20 text-white text-right space-y-2 sm:space-y-3.5 max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold ${slide.badgeColor}`}>
                  <Sparkles className="w-3 h-3 text-gold fill-current" />
                  {slide.tag}
                </span>

                {slide.isRealAd && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    إعلان منشور
                  </span>
                )}
              </div>
              
              <h2 className="text-base sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-lg line-clamp-1">
                {slide.title}
              </h2>
              
              <p className="text-xs sm:text-sm md:text-base text-slate-200 max-w-2xl line-clamp-2 leading-relaxed drop-shadow-xs">
                {slide.subtitle}
              </p>
              
              <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4 justify-between sm:justify-start">
                <span className="text-gold font-black text-sm sm:text-xl font-mono drop-shadow-sm">
                  {slide.price}
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSlideAction(slide)}
                    className="bg-gold hover:bg-gold-dark text-navy font-black text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-gold/20 active:scale-95"
                    title="عرض تفاصيل الإعلان كاملاً"
                  >
                    <span>عرض التفاصيل</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onSelectTab(slide.actionTab)}
                    className="bg-white/15 hover:bg-white/25 backdrop-blur-xs text-white text-xs sm:text-sm px-3.5 py-2.5 rounded-xl transition cursor-pointer hidden sm:flex items-center gap-1.5 border border-white/20"
                    title="الذهاب للقسم"
                  >
                    <span>تصفح القسم</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* --- Carousel Arrow Controls: Right & Left Buttons for Hand/Manual Browsing --- */}
        {/* Right Arrow (سهم اليمين) */}
        <button
          onClick={prevSlide}
          className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/65 hover:bg-gold text-white hover:text-navy flex items-center justify-center transition-all duration-200 cursor-pointer backdrop-blur-md border border-white/20 shadow-2xl active:scale-95 group/btn"
          id="prev_slide_btn"
          title="الإعلان السابق (سهم يمين)"
          aria-label="Previous Slide"
        >
          <ChevronRight className="w-6 h-6 stroke-[2.5] group-hover/btn:scale-110 transition-transform" />
        </button>

        {/* Left Arrow (سهم اليسار) */}
        <button
          onClick={nextSlide}
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/65 hover:bg-gold text-white hover:text-navy flex items-center justify-center transition-all duration-200 cursor-pointer backdrop-blur-md border border-white/20 shadow-2xl active:scale-95 group/btn"
          id="next_slide_btn"
          title="الإعلان التالي (سهم يسار)"
          aria-label="Next Slide"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5] group-hover/btn:scale-110 transition-transform" />
        </button>

        {/* Top Floating Controls (Shuffle & Live Badge) */}
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-30 flex items-center gap-2">
          <button
            onClick={handleReshuffle}
            className="bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 transition cursor-pointer shadow-md hover:border-gold hover:text-gold active:scale-95"
            title="إعادة الترتيب عشوائياً"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">عرض عشوائي</span>
          </button>
        </div>

        {/* Indicator dots (Centered at Top) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10" id="carousel_indicators">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                index === currentSlide ? 'bg-gold w-6 shadow-sm shadow-gold/50' : 'bg-white/40 hover:bg-white/70 w-2'
              }`}
              title={`إعلان رقم ${index + 1}`}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Current / Total Counter badge (Top Left) */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-30 hidden sm:block bg-black/60 backdrop-blur-md text-slate-200 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border border-white/15">
          {currentSlide + 1} / {slides.length}
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

      {/* Modal for viewing details directly when clicking "عرض التفاصيل" */}
      {selectedItemForModal && (
        <DetailModal
          isOpen={true}
          onClose={() => setSelectedItemForModal(null)}
          item={selectedItemForModal.item}
          type={selectedItemForModal.type}
          currentUser={currentUser}
          onRefresh={loadRealAds}
        />
      )}

    </div>
  );
}
