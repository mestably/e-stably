/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo, TouchEvent, MouseEvent } from 'react';
import { 
  Award, 
  Home as HomeIcon, 
  ShieldCheck, 
  Truck, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft, 
  Shuffle,
  Eye,
  Tag,
  Search,
  X
} from 'lucide-react';
import { Horse, Stable, Shelter, Transport, User } from '../types';
import { FirebaseService } from '../lib/firebase';
import DetailModal from './DetailModal';
import defaultTransportImg from '../assets/images/horse_transport_default_1788309609008.jpg';
import { isHorseEndedOrSold } from '../lib/horseUtils';
import { normalizeArabic } from './GlobalSearchBar';
import RatingStars from './RatingStars';

interface HomeSectionProps {
  onSelectTab: (tab: 'horses' | 'stables' | 'shelter' | 'transport' | 'user-dashboard' | 'subscriptions' | string) => void;
  currentUser?: User | null;
  searchQuery?: string;
  onClearSearch?: () => void;
  onSelectAd?: (item: any, type: 'horse' | 'stable' | 'shelter' | 'transport') => void;
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
    image: defaultTransportImg,
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

function canViewEnded(itemUserId: string, currentUser?: User | null) {
  if (!currentUser) return false;
  return currentUser.role === 'admin' || currentUser.id === itemUserId;
}

function buildSlidesFromData(
  horses: Horse[],
  stables: Stable[],
  shelters: Shelter[],
  transports: Transport[],
  _currentUser?: User | null
): AdSlide[] {
  const realSlides: AdSlide[] = [];

  // 1. Map Horses into slides
  horses.forEach((horse) => {
    const breedLabel = horse.breed === 'arabian' ? 'خيل عربي أصيل' : horse.breed === 'shabi' ? 'خيل شعبي' : 'سيسي';
    const priceLabel = horse.adType === 'sale'
      ? (horse.price && horse.price > 0 ? `${horse.price.toLocaleString('ar-SA')} ريال` : 'السعر حسب الاتفاق')
      : (horse.price && horse.price > 0 ? `${horse.price.toLocaleString('ar-SA')} ريال` : 'عند التواصل');
    const healthOrDetails = horse.healthStatus || `العمر: ${horse.age} سنوات • اللون: ${horse.color}`;
    const mainImage = (horse.images && horse.images.length > 0 && horse.images[0]) || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1200';

    realSlides.push({
      id: `horse_${horse.id}`,
      title: `${horse.name} (${breedLabel})`,
      subtitle: `${healthOrDetails} • ${horse.stableName || 'إعلان مستخدم'}`,
      tag: isHorseEndedOrSold(horse) ? (horse.adType === 'rent' ? 'الاعلان منتهي' : 'تم البيع') : (horse.adType === 'sale' ? 'خيل للبيع' : 'خيل للإيجار'),
      badgeColor: isHorseEndedOrSold(horse) ? 'bg-red-600 text-white' : (horse.adType === 'sale' ? 'bg-gold text-navy font-bold shadow-sm' : 'bg-emerald-600 text-white'),
      price: isHorseEndedOrSold(horse) ? (horse.adType === 'rent' ? 'الاعلان منتهي' : 'تم البيع') : priceLabel,
      image: mainImage,
      actionTab: 'horses',
      itemType: 'horse',
      rawItem: horse,
      isRealAd: true,
    });
  });

  // 2. Map Stables into slides
  stables.forEach((stable) => {
    const mainImage = (stable.images && stable.images.length > 0 && stable.images[0]) || 'https://images.unsplash.com/photo-1598974357801-cbca100e65d3?auto=format&fit=crop&q=80&w=1200';
    realSlides.push({
      id: `stable_${stable.id}`,
      title: stable.name,
      subtitle: stable.description || 'مربط وإسطبل متكامل لتربية وتدريب الخيول العربية',
      tag: stable.isEnded ? 'مكتمل / منتهي' : (stable.verified === 'verified' ? 'إسطبل موثق' : 'إسطبل ومربط'),
      badgeColor: stable.isEnded ? 'bg-red-600 text-white' : 'bg-navy text-gold border border-gold/40',
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
    const mainImage = (shelter.images && shelter.images.length > 0 && shelter.images[0]) || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&q=80&w=1200';
    realSlides.push({
      id: `shelter_${shelter.id}`,
      title: shelter.title,
      subtitle: shelter.description || 'خدمات إيواء وبوكسات مهواة مع رعاية بيطرية وغذائية كاملة',
      tag: shelter.isEnded ? 'مكتمل / منتهي' : (shelter.type === 'monthly' ? 'إيواء شهري' : 'إيواء يومي'),
      badgeColor: shelter.isEnded ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white',
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
    const hasCustomImages = transport.images && Array.isArray(transport.images) && transport.images.length > 0 && !!transport.images[0];
    const mainImage = hasCustomImages ? transport.images![0] : defaultTransportImg;
    const priceLabel = transport.price ? `${transport.price.toLocaleString('ar-SA')} ريال` : 'عند الاتفاق';
    realSlides.push({
      id: `transport_${transport.id}`,
      title: transport.vehicleType || `رحلة نقل خيل: ${transport.pickupAddress || 'الموقع'} ⟵ ${transport.deliveryAddress || 'الوجهة'}`,
      subtitle: `من ${transport.pickupAddress || 'موقع الاستلام'} إلى ${transport.deliveryAddress || 'موقع التسليم'} • ${transport.horseCount || 1} خيل • الموعد: ${transport.date || 'مجدول'}`,
      tag: transport.isEnded ? 'تم النقل (منجز)' : 'نقل خيول ومقطورات',
      badgeColor: transport.isEnded ? 'bg-red-600 text-white' : 'bg-amber-600 text-white',
      price: priceLabel,
      image: mainImage,
      actionTab: 'transport',
      itemType: 'transport',
      rawItem: transport,
      isRealAd: true,
    });
  });

  return realSlides;
}

export default function HomeSection({ 
  onSelectTab, 
  currentUser = null,
  searchQuery = '',
  onClearSearch,
  onSelectAd,
}: HomeSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [rawPool, setRawPool] = useState<{
    horses: Horse[];
    stables: Stable[];
    shelters: Shelter[];
    transports: Transport[];
  }>(() => {
    try {
      return {
        horses: FirebaseService.getLocalHorses(),
        stables: FirebaseService.getLocalStables(),
        shelters: FirebaseService.getLocalShelters(),
        transports: FirebaseService.getLocalTransports(),
      };
    } catch {
      return { horses: [], stables: [], shelters: [], transports: [] };
    }
  });

  const [slides, setSlides] = useState<AdSlide[]>(() => {
    try {
      const horses = FirebaseService.getLocalHorses();
      const stables = FirebaseService.getLocalStables();
      const shelters = FirebaseService.getLocalShelters();
      const transports = FirebaseService.getLocalTransports();
      const list = buildSlidesFromData(horses, stables, shelters, transports);
      return list.length > 0 ? shuffleArray(list).slice(0, 12) : shuffleArray(DEFAULT_CURATED_SLIDES);
    } catch {
      return DEFAULT_CURATED_SLIDES;
    }
  });
  const [isPaused, setIsPaused] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState<{
    item: Horse | Stable | Shelter | Transport;
    type: 'horse' | 'stable' | 'shelter' | 'transport';
  } | null>(null);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const [stats, setStats] = useState(() => {
    try {
      return {
        horsesCount: FirebaseService.getLocalHorses().length,
        stablesCount: FirebaseService.getLocalStables().length,
        sheltersCount: FirebaseService.getLocalShelters().length,
        transportsCount: FirebaseService.getLocalTransports().length,
      };
    } catch {
      return { horsesCount: 0, stablesCount: 0, sheltersCount: 0, transportsCount: 0 };
    }
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

      setRawPool({
        horses,
        stables,
        shelters,
        transports,
      });

      setStats({
        horsesCount: horses.length,
        stablesCount: stables.length,
        sheltersCount: shelters.length,
        transportsCount: transports.length,
      });

      const realSlides = buildSlidesFromData(horses, stables, shelters, transports, currentUser);

      if (realSlides.length > 0) {
        // Shuffle randomly
        const randomized = shuffleArray(realSlides);
        // Take up to 12 slides for optimal performance
        setSlides(randomized.slice(0, 12));
      } else {
        setSlides(shuffleArray(DEFAULT_CURATED_SLIDES));
      }
    } catch (err) {
      console.warn('Failed to load real ads for slider:', err);
      // Fallback to local cached slides if any
      try {
        const list = buildSlidesFromData(
          FirebaseService.getLocalHorses(),
          FirebaseService.getLocalStables(),
          FirebaseService.getLocalShelters(),
          FirebaseService.getLocalTransports()
        );
        if (list.length > 0) {
          setSlides(shuffleArray(list).slice(0, 12));
          return;
        }
      } catch {}
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

  // Search State & Memoized Calculation
  const [selectedSearchCategory, setSelectedSearchCategory] = useState<'all' | 'horse' | 'stable' | 'shelter' | 'transport'>('all');

  const searchResults = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return [];
    const term = normalizeArabic(searchQuery);

    const results: Array<{
      id: string;
      title: string;
      subtitle: string;
      type: 'horse' | 'stable' | 'shelter' | 'transport';
      typeLabel: string;
      categoryColor: string;
      price?: string;
      location?: string;
      image: string;
      item: Horse | Stable | Shelter | Transport;
      isEnded?: boolean;
      isSold?: boolean;
    }> = [];

    // Horses
    rawPool.horses.forEach((h) => {
      const match =
        normalizeArabic(h.name).includes(term) ||
        normalizeArabic(h.breed || '').includes(term) ||
        normalizeArabic(h.description || '').includes(term) ||
        normalizeArabic(h.city || '').includes(term) ||
        normalizeArabic(h.fatherName || '').includes(term) ||
        normalizeArabic(h.motherName || '').includes(term) ||
        normalizeArabic(h.sellerName || '').includes(term) ||
        (h.type === 'rent' ? 'ايجار خيل للايجار' : 'بيع خيل للبيع').includes(term);

      if (match) {
        const isSold = !!h.isSold;
        const isEnded = !!(h.isEnded || (h.type === 'rent' && isHorseEndedOrSold(h)));
        results.push({
          id: h.id,
          title: h.name,
          subtitle: `${h.breed || 'خيل'} - ${h.city || ''} ${h.age ? `• العمر: ${h.age}` : ''}`,
          type: 'horse',
          typeLabel: h.type === 'rent' ? 'خيل للإيجار' : 'خيل للبيع',
          categoryColor: h.type === 'rent' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-gold/20 text-navy border-gold/40',
          price: h.price ? `${h.price.toLocaleString()} ريال` : undefined,
          location: h.city,
          image: h.images?.[0] || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=600',
          item: h,
          isEnded,
          isSold,
        });
      }
    });

    // Stables
    rawPool.stables.forEach((s) => {
      const match =
        normalizeArabic(s.name).includes(term) ||
        normalizeArabic(s.location || '').includes(term) ||
        normalizeArabic(s.city || '').includes(term) ||
        normalizeArabic(s.description || '').includes(term) ||
        normalizeArabic(s.ownerName || '').includes(term) ||
        'اسطبل اسطبلات استضافه تدريب'.includes(term);

      if (match) {
        results.push({
          id: s.id,
          title: s.name,
          subtitle: `${s.city || s.location || 'إسطبل'} ${s.services?.length ? `• ${s.services.slice(0, 2).join(', ')}` : ''}`,
          type: 'stable',
          typeLabel: 'إسطبل',
          categoryColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          price: s.monthlyPrice ? `${s.monthlyPrice.toLocaleString()} ريال/شهر` : undefined,
          location: s.city || s.location,
          image: s.images?.[0] || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=600',
          item: s,
        });
      }
    });

    // Shelters
    rawPool.shelters.forEach((sh) => {
      const match =
        normalizeArabic(sh.name).includes(term) ||
        normalizeArabic(sh.city || '').includes(term) ||
        normalizeArabic(sh.address || '').includes(term) ||
        normalizeArabic(sh.description || '').includes(term) ||
        normalizeArabic(sh.providerName || '').includes(term) ||
        'ايواء رعايه عنايه فندقه'.includes(term);

      if (match) {
        results.push({
          id: sh.id,
          title: sh.name,
          subtitle: `${sh.city || ''} ${sh.capacity ? `• الطاقة: ${sh.capacity} خيل` : ''}`,
          type: 'shelter',
          typeLabel: 'إيواء ورعاية',
          categoryColor: 'bg-blue-100 text-blue-800 border-blue-300',
          price: sh.pricePerMonth ? `${sh.pricePerMonth.toLocaleString()} ريال/شهر` : undefined,
          location: sh.city || sh.address,
          image: sh.images?.[0] || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=600',
          item: sh,
        });
      }
    });

    // Transports
    rawPool.transports.forEach((t) => {
      const match =
        normalizeArabic(t.title || '').includes(term) ||
        normalizeArabic(t.fromCity || '').includes(term) ||
        normalizeArabic(t.toCity || '').includes(term) ||
        normalizeArabic(t.description || '').includes(term) ||
        normalizeArabic(t.driverName || '').includes(term) ||
        normalizeArabic(t.vehicleType || '').includes(term) ||
        'نقل مقطوره شحن دنه سطحه تريلا'.includes(term);

      if (match) {
        results.push({
          id: t.id,
          title: t.title || `نقل من ${t.fromCity} إلى ${t.toCity}`,
          subtitle: `من ${t.fromCity} ➔ ${t.toCity} ${t.vehicleType ? `• ${t.vehicleType}` : ''}`,
          type: 'transport',
          typeLabel: 'نقل خيول',
          categoryColor: 'bg-purple-100 text-purple-800 border-purple-300',
          price: t.cost ? `${t.cost.toLocaleString()} ريال` : undefined,
          location: `${t.fromCity} ➔ ${t.toCity}`,
          image: t.images?.[0] || defaultTransportImg,
          item: t,
        });
      }
    });

    return results;
  }, [searchQuery, rawPool, currentUser]);

  const categoryCounts = useMemo(() => {
    const counts = { all: searchResults.length, horse: 0, stable: 0, shelter: 0, transport: 0 };
    searchResults.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return counts;
  }, [searchResults]);

  const filteredResults = useMemo(() => {
    if (selectedSearchCategory === 'all') return searchResults;
    return searchResults.filter((r) => r.type === selectedSearchCategory);
  }, [searchResults, selectedSearchCategory]);

  const handleSlideAction = (slide: AdSlide) => {
    if (slide.rawItem) {
      if (onSelectAd) {
        onSelectAd(slide.rawItem, slide.itemType);
      } else {
        setSelectedItemForModal({
          item: slide.rawItem,
          type: slide.itemType,
        });
      }
    } else {
      onSelectTab(slide.actionTab);
    }
  };

  if (searchQuery && searchQuery.trim().length > 0) {
    return (
      <div className="space-y-6 pb-12 animate-fade-in" id="search_results_container">
        {/* Header bar */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-navy/5 text-navy rounded-xl">
                <Search className="w-5 h-5 text-navy" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-navy">
                نتائج البحث الشامل في جميع الأقسام
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              البحث عن: <span className="font-bold text-navy underline decoration-gold">{searchQuery}</span>
              {' • '}
              <span>تم العثور على <strong className="text-gold font-bold">{searchResults.length}</strong> إعلان</span>
            </p>
          </div>

          {onClearSearch && (
            <button
              onClick={onClearSearch}
              className="inline-flex items-center gap-1.5 self-start md:self-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95 cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-500" />
              مسح البحث والعودة للرئيسية
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedSearchCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedSearchCategory === 'all'
                ? 'bg-navy text-gold shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            الكل ({categoryCounts.all})
          </button>
          <button
            onClick={() => setSelectedSearchCategory('horse')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedSearchCategory === 'horse'
                ? 'bg-navy text-gold shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            🐎 الخيول ({categoryCounts.horse})
          </button>
          <button
            onClick={() => setSelectedSearchCategory('stable')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedSearchCategory === 'stable'
                ? 'bg-navy text-gold shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            🏛️ الإسطبلات ({categoryCounts.stable})
          </button>
          <button
            onClick={() => setSelectedSearchCategory('shelter')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedSearchCategory === 'shelter'
                ? 'bg-navy text-gold shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            🛡️ الإيواء ({categoryCounts.shelter})
          </button>
          <button
            onClick={() => setSelectedSearchCategory('transport')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedSearchCategory === 'transport'
                ? 'bg-navy text-gold shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            🚛 النقل ({categoryCounts.transport})
          </button>
        </div>

        {/* Results Grid or Empty State */}
        {filteredResults.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200/80 shadow-xs max-w-xl mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">
              لم نجد أي إعلانات تطابق بحثك
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-6">
              جرّب البحث باسم المدينة، أو نوع السلالة، أو كلمة بحث عامة.
            </p>
            {onClearSearch && (
              <button
                onClick={onClearSearch}
                className="px-5 py-2.5 bg-navy text-white hover:bg-navy/90 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                عرض جميع الإعلانات بالرئيسية
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredResults.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  if (onSelectAd) {
                    onSelectAd(item.item, item.type);
                  } else {
                    setSelectedItemForModal({ item: item.item, type: item.type });
                  }
                }}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-gold/60 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-xs ${item.categoryColor}`}>
                        {item.typeLabel}
                      </span>
                      {item.isSold && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                          تم البيع
                        </span>
                      )}
                      {item.isEnded && !item.isSold && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                          منتهي
                        </span>
                      )}
                    </div>

                    {item.price && (
                      <div className="absolute bottom-2.5 left-2.5 bg-slate-900/85 backdrop-blur-xs text-gold font-bold text-xs px-2.5 py-1 rounded-lg">
                        {item.price}
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <h4 className="font-bold text-navy text-sm group-hover:text-gold transition-colors line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.subtitle}
                    </p>
                    <div className="pt-1">
                      <RatingStars targetId={item.id} targetType={item.type} size="sm" showCount={true} />
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    type="button"
                    className="w-full py-2 bg-navy-light/60 hover:bg-navy hover:text-white text-navy font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    عرض تفاصيل الإعلان
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal for viewing details directly when clicking */}
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
        
        {/* زر الدخول المباشر للأقسام */}
        <div className="pt-2 max-w-xl mx-auto" id="enter_sections_container">
          <button
            onClick={() => onSelectTab('horses')}
            className="relative inline-flex items-center gap-3 bg-navy hover:bg-navy-dark text-white font-extrabold text-sm sm:text-base px-10 py-4 rounded-2xl shadow-xl transition-all duration-300 hover:shadow-gold/20 hover:-translate-y-0.5 cursor-pointer group overflow-hidden"
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4" id="departments_grid">
          
          {/* Card 1: Horses */}
          <div
            onClick={() => onSelectTab('horses')}
            className="bg-white hover:border-gold/60 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group text-right flex flex-col justify-between min-h-[175px] sm:h-48"
          >
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-navy-light text-navy flex items-center justify-center group-hover:bg-navy group-hover:text-gold transition-colors duration-300 mb-2 sm:mb-4">
                <Award className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h5 className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-navy transition-colors line-clamp-1">
                الخيول (بيع وإيجار)
              </h5>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                عروض الخيل العربية الأصيلة، المهور والجمال، الشعبية والسباقات للبيع أو الإيجار.
              </p>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-2">
              <span className="text-[9px] sm:text-[10px] font-bold text-gold-dark bg-gold-light px-1.5 sm:px-2 py-0.5 rounded-md truncate">
                {stats.horsesCount} إعلان
              </span>
              <span className="text-[9px] sm:text-[10px] text-navy font-bold flex items-center gap-0.5 sm:gap-1 group-hover:underline shrink-0">
                تصفح
                <ArrowLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gold" />
              </span>
            </div>
          </div>

          {/* Card 2: Stables */}
          <div
            onClick={() => onSelectTab('stables')}
            className="bg-white hover:border-gold/60 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group text-right flex flex-col justify-between min-h-[175px] sm:h-48"
          >
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-navy-light text-navy flex items-center justify-center group-hover:bg-navy group-hover:text-gold transition-colors duration-300 mb-2 sm:mb-4">
                <HomeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h5 className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-navy transition-colors line-clamp-1">
                الإسطبلات والمشروعات
              </h5>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                دليل الإسطبلات المسجلة ومرابط إنتاج الجياد المعتمدة مع صور ووسائل التواصل المباشرة.
              </p>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-2">
              <span className="text-[9px] sm:text-[10px] font-bold text-navy bg-navy-light px-1.5 sm:px-2 py-0.5 rounded-md truncate">
                {stats.stablesCount} مربط
              </span>
              <span className="text-[9px] sm:text-[10px] text-navy font-bold flex items-center gap-0.5 sm:gap-1 group-hover:underline shrink-0">
                تصفح
                <ArrowLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gold" />
              </span>
            </div>
          </div>

          {/* Card 3: Shelters */}
          <div
            onClick={() => onSelectTab('shelter')}
            className="bg-white hover:border-gold/60 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group text-right flex flex-col justify-between min-h-[175px] sm:h-48"
          >
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-navy-light text-navy flex items-center justify-center group-hover:bg-navy group-hover:text-gold transition-colors duration-300 mb-2 sm:mb-4">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h5 className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-navy transition-colors line-clamp-1">
                خدمات الإيواء والبوكسات
              </h5>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                خدمات حجز البوكسات، الرعاية الطبية، تغذية وتدريب الخيول بشكل احترافي.
              </p>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-2">
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-md truncate">
                {stats.sheltersCount} إيواء
              </span>
              <span className="text-[9px] sm:text-[10px] text-navy font-bold flex items-center gap-0.5 sm:gap-1 group-hover:underline shrink-0">
                تصفح
                <ArrowLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gold" />
              </span>
            </div>
          </div>

          {/* Card 4: Transports */}
          <div
            onClick={() => onSelectTab('transport')}
            className="bg-white hover:border-gold/60 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group text-right flex flex-col justify-between min-h-[175px] sm:h-48"
          >
            <div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-navy-light text-navy flex items-center justify-center group-hover:bg-navy group-hover:text-gold transition-colors duration-300 mb-2 sm:mb-4">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h5 className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-navy transition-colors line-clamp-1">
                نقل الخيول والمقطورات
              </h5>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                رحلات نقل الجياد ومشاركة الرحلات، مقطورات مكيفة، نقل سريع وموثق.
              </p>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-2">
              <span className="text-[9px] sm:text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 sm:px-2 py-0.5 rounded-md truncate">
                {stats.transportsCount} رحلة
              </span>
              <span className="text-[9px] sm:text-[10px] text-navy font-bold flex items-center gap-0.5 sm:gap-1 group-hover:underline shrink-0">
                تصفح
                <ArrowLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gold" />
              </span>
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
