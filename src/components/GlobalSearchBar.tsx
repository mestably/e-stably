import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, ArrowLeft, Award, Home as HomeIcon, ShieldCheck, Truck, Sparkles, Filter, ExternalLink } from 'lucide-react';
import { Horse, Stable, Shelter, Transport } from '../types';
import { FirebaseService } from '../lib/firebase';
import RatingStars, { getItemRating } from './RatingStars';
import { isHorseEndedOrSold } from '../lib/horseUtils';

export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove diacritics
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[-_]/g, ' ');
}

export interface SearchResultItem {
  id: string;
  type: 'horse' | 'stable' | 'shelter' | 'transport';
  title: string;
  subtitle: string;
  categoryLabel: string;
  categoryColor: string;
  price?: string;
  image: string;
  item: Horse | Stable | Shelter | Transport;
  ratingData: { rating: number; reviewsCount: number };
}

interface GlobalSearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectAd: (item: any, type: 'horse' | 'stable' | 'shelter' | 'transport') => void;
  onNavigateToSection: (section: 'horses' | 'stables' | 'shelter' | 'transport') => void;
  placeholder?: string;
  className?: string;
  isMobileFullscreen?: boolean;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  onSelectAd,
  onNavigateToSection,
  placeholder = 'بحث عن إعلانات، خيول، إسطبلات، إيواء...',
  className = '',
  isMobileFullscreen = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'horse' | 'stable' | 'shelter' | 'transport'>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  // Cached pool of ads for quick responsive filtering
  const [pool, setPool] = useState<{
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

  // Background refresh of ads pool
  useEffect(() => {
    let isMounted = true;
    const fetchLatest = async () => {
      try {
        const [horses, stables, shelters, transports] = await Promise.all([
          FirebaseService.getHorses(),
          FirebaseService.getStables(),
          FirebaseService.getShelters(),
          FirebaseService.getTransports(),
        ]);
        if (isMounted) {
          setPool({ horses, stables, shelters, transports });
        }
      } catch (e) {
        console.warn('Failed to load search data:', e);
      }
    };
    fetchLatest();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Filtered Results Calculation
  const filteredResults = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    if (!q || q.length === 0) return [];

    const results: SearchResultItem[] = [];

    // 1. Horses search
    pool.horses.forEach((h) => {
      const matchText = normalizeArabic(
        `${h.name} ${h.breed === 'arabian' ? 'عربي اصيل' : h.breed === 'shabi' ? 'شعبي' : 'سيسي'} ` +
        `${h.adType === 'sale' ? 'بيع للبيع' : 'ايجار للايجار'} ${h.damName || ''} ${h.sireName || ''} ` +
        `${h.color || ''} ${h.stableName || ''} ${h.userName || ''} ${h.healthStatus || ''} ${h.height || ''} ` +
        `${h.gender === 'stallion' ? 'ذكر حصان' : h.gender === 'mare' ? 'انثى فرس' : 'مخصي'}`
      );

      if (matchText.includes(q)) {
        const isEnded = isHorseEndedOrSold(h);
        results.push({
          id: h.id,
          type: 'horse',
          title: h.name,
          subtitle: `${h.breed === 'arabian' ? 'عربي أصيل' : h.breed === 'shabi' ? 'شعبي' : 'سيسي'} • ${h.color || ''} • ${h.stableName || 'إعلان مستخدم'}`,
          categoryLabel: isEnded ? (h.adType === 'rent' ? 'الاعلان منتهي' : 'تم البيع') : (h.adType === 'sale' ? 'خيل للبيع' : 'خيل للإيجار'),
          categoryColor: isEnded ? 'bg-red-600 text-white' : (h.adType === 'sale' ? 'bg-amber-500 text-white' : 'bg-navy text-gold'),
          price: h.price ? `${h.price.toLocaleString('ar-SA')} ريال` : 'عند التواصل',
          image: (h.images && h.images[0]) || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=400',
          item: h,
          ratingData: getItemRating(h),
        });
      }
    });

    // 2. Stables search
    pool.stables.forEach((s) => {
      const matchText = normalizeArabic(`${s.name} ${s.description} ${s.userName} اسطبل مربط مرابط`);
      if (matchText.includes(q)) {
        results.push({
          id: s.id,
          type: 'stable',
          title: s.name,
          subtitle: s.description || 'مربط وإسطبل معتمد لتربية ورعاية الخيول',
          categoryLabel: s.verified === 'verified' ? 'إسطبل موثق' : 'إسطبل ومربط',
          categoryColor: 'bg-navy text-gold',
          price: s.horseCount ? `${s.horseCount} جواد` : undefined,
          image: (s.images && s.images[0]) || 'https://images.unsplash.com/photo-1598974357801-cbca100e65d3?auto=format&fit=crop&q=80&w=400',
          item: s,
          ratingData: getItemRating(s),
        });
      }
    });

    // 3. Shelters search
    pool.shelters.forEach((sh) => {
      const matchText = normalizeArabic(`${sh.title} ${sh.description} ${sh.stableName || ''} ${sh.userName} ايواء بوكسات`);
      if (matchText.includes(q)) {
        results.push({
          id: sh.id,
          type: 'shelter',
          title: sh.title,
          subtitle: `${sh.type === 'monthly' ? 'إيواء شهري' : 'إيواء يومي'} • ${sh.stableName || 'مركز إيواء'}`,
          categoryLabel: sh.type === 'monthly' ? 'إيواء شهري' : 'إيواء يومي',
          categoryColor: 'bg-indigo-600 text-white',
          price: 'رعاية متكاملة',
          image: (sh.images && sh.images[0]) || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&q=80&w=400',
          item: sh,
          ratingData: getItemRating(sh),
        });
      }
    });

    // 4. Transport search
    pool.transports.forEach((t) => {
      const matchText = normalizeArabic(`${t.vehicleType} ${t.pickupAddress} ${t.deliveryAddress} ${t.description || ''} ${t.userName} نقل شحن مقطورة`);
      if (matchText.includes(q)) {
        results.push({
          id: t.id,
          type: 'transport',
          title: `${t.vehicleType || 'مقطورة نقل'} (من ${t.pickupAddress} إلى ${t.deliveryAddress})`,
          subtitle: `السعة: ${t.capacity} خيول • ${t.description || 'خدمة نقل آمنة وسريعة'}`,
          categoryLabel: 'خدمة نقل',
          categoryColor: 'bg-emerald-600 text-white',
          price: t.price ? `${t.price.toLocaleString('ar-SA')} ريال` : 'عند التواصل',
          image: (t.images && t.images[0]) || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=400',
          item: t,
          ratingData: { rating: 0, reviewsCount: 0 },
        });
      }
    });

    return results;
  }, [searchQuery, pool]);

  // Filtered by sub-category tab
  const displayedResults = useMemo(() => {
    if (activeFilter === 'all') return filteredResults;
    return filteredResults.filter((r) => r.type === activeFilter);
  }, [filteredResults, activeFilter]);

  const counts = useMemo(() => {
    return {
      all: filteredResults.length,
      horse: filteredResults.filter((r) => r.type === 'horse').length,
      stable: filteredResults.filter((r) => r.type === 'stable').length,
      shelter: filteredResults.filter((r) => r.type === 'shelter').length,
      transport: filteredResults.filter((r) => r.type === 'transport').length,
    };
  }, [filteredResults]);

  const handleItemClick = (res: SearchResultItem) => {
    setIsOpen(false);
    onSelectAd(res.item, res.type);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (displayedResults.length > 0) {
        handleItemClick(displayedResults[0]);
      } else if (searchQuery.trim().length > 0) {
        onNavigateToSection('horses');
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Search Input Box */}
      <div className="relative w-full">
        <Search className="absolute right-3.5 top-3 w-4 h-4 text-navy pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (searchQuery.trim().length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full text-xs pl-12 pr-10 py-2.5 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy bg-navy-light/40 transition font-medium"
        />

        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              setIsOpen(false);
            }}
            className="absolute left-2.5 top-2 text-slate-400 hover:text-navy text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-200/70 hover:bg-slate-200 active:scale-95 transition cursor-pointer"
            title="مسح البحث"
          >
            مسح
          </button>
        )}
      </div>

      {/* Floating Live Search Dropdown Panel */}
      {isOpen && searchQuery.trim().length > 0 && (
        <div
          className="fixed inset-x-3 top-16 sm:inset-x-auto sm:top-full sm:right-0 sm:left-auto sm:mt-2 w-auto sm:w-[460px] md:w-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[500px] animate-in fade-in zoom-in-95 duration-150 origin-top"
          dir="rtl"
        >
          {/* Header with Search Stats */}
          <div className="p-3 bg-gradient-to-r from-navy-light/50 via-white to-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-gold fill-current" />
              <span className="text-xs font-black text-navy">
                نتائج البحث الشامل ({counts.all})
              </span>
              <span className="text-[10px] text-slate-500 font-medium">عن: "{searchQuery}"</span>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category Filter Chips */}
          <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1 overflow-x-auto shrink-0 text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-navy text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              الكل ({counts.all})
            </button>
            <button
              onClick={() => setActiveFilter('horse')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                activeFilter === 'horse'
                  ? 'bg-navy text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              الخيول ({counts.horse})
            </button>
            <button
              onClick={() => setActiveFilter('stable')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                activeFilter === 'stable'
                  ? 'bg-navy text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              الإسطبلات ({counts.stable})
            </button>
            <button
              onClick={() => setActiveFilter('shelter')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                activeFilter === 'shelter'
                  ? 'bg-navy text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              الإيواء ({counts.shelter})
            </button>
            <button
              onClick={() => setActiveFilter('transport')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                activeFilter === 'transport'
                  ? 'bg-navy text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              النقل ({counts.transport})
            </button>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 overscroll-contain">
            {displayedResults.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Search className="w-10 h-10 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-700">لم نجد أي نتائج تطابق "{searchQuery}"</p>
                <p className="text-[10.5px] text-slate-400 mt-1 max-w-[260px] mx-auto leading-relaxed">
                  جرّب البحث باسم الخيل، السلالة (عربي، شعبي)، المدينة، أو اسم الإسطبل.
                </p>
              </div>
            ) : (
              displayedResults.map((item) => (
                <div
                  key={`${item.type}_${item.id}`}
                  onClick={() => handleItemClick(item)}
                  className="p-3 hover:bg-slate-50 transition cursor-pointer flex items-center gap-3 group"
                >
                  {/* Thumbnail Image */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0 relative">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${item.categoryColor}`}>
                        {item.categoryLabel}
                      </span>
                      {item.price && (
                        <span className="text-[11px] font-mono font-black text-navy mr-auto">
                          {item.price}
                        </span>
                      )}
                    </div>

                    <h5 className="text-xs font-black text-slate-900 truncate group-hover:text-gold-dark transition">
                      {item.title}
                    </h5>

                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.subtitle}</p>

                    {item.ratingData.reviewsCount > 0 && (
                      <div className="mt-1">
                        <RatingStars
                          rating={item.ratingData.rating}
                          reviewsCount={item.ratingData.reviewsCount}
                          variant="compact"
                          size="xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Open Arrow */}
                  <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-navy group-hover:text-gold text-slate-400 transition shrink-0">
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Navigation */}
          {displayedResults.length > 0 && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
              <span className="text-[10.5px] text-slate-500 font-medium">
                اضغط على أي إعلان لفتح كامل تفاصيله
              </span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (activeFilter === 'stable') onNavigateToSection('stables');
                  else if (activeFilter === 'shelter') onNavigateToSection('shelter');
                  else if (activeFilter === 'transport') onNavigateToSection('transport');
                  else onNavigateToSection('horses');
                }}
                className="text-navy hover:text-gold font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <span>الانتقال وتصفح القسم</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearchBar;
