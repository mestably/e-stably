/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ChangeEvent, FormEvent, MouseEvent } from 'react';
import { Plus, Search, Star, Phone, MessageSquare, Info, Eye, Image, ShieldAlert, Award, Calendar, RefreshCw, AlertCircle, Check, Trash2, Edit2, Crown, Tag, CheckCircle2, RotateCcw, Lock, Ruler, HeartPulse } from 'lucide-react';
import { Horse, Stable, User } from '../types';
import { FirebaseService, DAILY_FREE_ADS_LIMIT } from '../lib/firebase';
import DetailModal from './DetailModal';
import ConfirmModal from './ConfirmModal';
import TermsAgreementModal from './TermsAgreementModal';
import { compressImage } from '../lib/imageUtils';

const SALE_HEALTH_CONDITIONS = [
  'سليم خالي من العيوب',
  'تقدم',
  'عظمة',
  'وتر',
  'بداية حمرا',
  'حساسية',
  'رمانات',
  'صدأت / صكأت'
];

const RENT_HEALTH_CONDITIONS = [
  'سليم وصحة ممتازة',
  'نشيط جدا ومناسب للتدريب والسباقات',
  'للمبتدئين',
  'للمحترفين'
];

export const RENT_DURATION_OPTIONS: { id: 'half_hour' | 'hour' | 'two_hour_trip' | 'day'; label: string; shortLabel: string }[] = [
  { id: 'half_hour', label: 'نص ساعة (30 دقيقة)', shortLabel: 'نصف ساعة' },
  { id: 'hour', label: 'ساعة (60 دقيقة)', shortLabel: 'ساعة' },
  { id: 'two_hour_trip', label: 'رحلة ساعتان', shortLabel: 'رحلة ساعتان' },
];

export const getRentDurationLabel = (type?: string) => {
  if (!type) return 'ساعة';
  if (type === 'half_hour') return 'نصف ساعة';
  if (type === 'hour') return 'ساعة';
  if (type === 'two_hour_trip') return 'رحلة ساعتان';
  if (type === 'day') return 'يوم';
  return type;
};

interface HorsesSectionProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  searchQuery: string;
  onAdCreated?: () => void;
}

export default function HorsesSection({ currentUser, onOpenAuth, searchQuery, onAdCreated }: HorsesSectionProps) {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [stables, setStables] = useState<Stable[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'rent' | 'sold'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [userTodayAds, setUserTodayAds] = useState(0);

  // Fetch user daily ads count when modal opens or user changes
  useEffect(() => {
    if (currentUser?.id) {
      FirebaseService.getUserTodayAdsCount(currentUser.id).then((cnt) => {
        setUserTodayAds(cnt);
      });
    }
  }, [currentUser?.id, isAddOpen]);

  // Form Fields
  const [adType, setAdType] = useState<'sale' | 'rent'>('sale');
  const [name, setName] = useState('');
  const [damName, setDamName] = useState('');
  const [sireName, setSireName] = useState('');
  const [certificate, setCertificate] = useState('');
  const [breed, setBreed] = useState<'arabian' | 'shabi' | 'sisi' | 'foreign'>('arabian');
  const [age, setAge] = useState(1);
  const [gender, setGender] = useState<'stallion' | 'mare' | 'gelding'>('stallion');
  const [color, setColor] = useState('');
  const [height, setHeight] = useState('');
  const [healthStatus, setHealthStatus] = useState('سليم خالي من العيوب');
  const [images, setImages] = useState<string[]>([]);
  const [stableId, setStableId] = useState('');
  const [phone, setPhone] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [rentType, setRentType] = useState<'half_hour' | 'hour' | 'two_hour_trip' | 'day' | string>('hour');
  const [rentStart, setRentStart] = useState('');
  const [rentEnd, setRentEnd] = useState('');
  const [isSold, setIsSold] = useState(false);
  
  // UI States
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);

  const fetchData = async () => {
    // 1. Load from sanitized cache instantly
    const cachedHorses = FirebaseService.getLocalHorses();
    const cachedStables = FirebaseService.getLocalStables();
    setHorses(cachedHorses);
    setStables(cachedStables);

    // 2. Load fresh from background database
    try {
      const [hData, sData] = await Promise.all([
        FirebaseService.getHorses(),
        FirebaseService.getStables()
      ]);
      setHorses(hData);
      setStables(sData);
    } catch (e) {
      console.error('Error loading horses data:', e);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen to global sync event from App startup
    const handleSync = (e: any) => {
      if (e?.detail?.horses) {
        setHorses(e.detail.horses);
      }
      if (e?.detail?.stables) {
        setStables(e.detail.stables);
      }
    };

    window.addEventListener('horses_forum_sync_complete', handleSync);
    return () => {
      window.removeEventListener('horses_forum_sync_complete', handleSync);
    };
  }, []);

  const handleOpenAdd = () => {
    setEditingItemId(null);
    setName('');
    setDamName('');
    setSireName('');
    setCertificate('');
    setBreed('arabian');
    setAge(1);
    setGender('stallion');
    setColor('');
    setHeight('');
    setHealthStatus(adType === 'rent' ? 'سليم وصحة ممتازة' : 'سليم خالي من العيوب');
    setImages([]);
    setStableId('');
    setPhone(currentUser?.phone || '');
    setPrice(0);
    setRentStart('');
    setRentEnd('');
    setIsSold(false);
    setError('');
    setSuccess('');
    setIsAddOpen(true);
  };

  const handleAdTypeChange = (newType: 'sale' | 'rent') => {
    setAdType(newType);
    if (newType === 'rent') {
      setSireName('');
      setDamName('');
      setCertificate('');
      setHeight('');
      setHealthStatus('سليم وصحة ممتازة');
    } else {
      setHealthStatus('سليم خالي من العيوب');
    }
  };

  const handleEditClick = (horse: Horse) => {
    setEditingItemId(horse.id);
    setName(horse.name);
    setDamName(horse.damName || '');
    setSireName(horse.sireName || '');
    setCertificate(horse.certificate || '');
    setBreed(horse.breed || 'arabian');
    setAge(horse.age || 1);
    setGender(horse.gender || 'stallion');
    setColor(horse.color || '');
    setHeight(horse.height || '');
    setHealthStatus(horse.healthStatus || (horse.adType === 'rent' ? 'سليم وصحة ممتازة' : 'سليم خالي من العيوب'));
    setImages(horse.images || []);
    setStableId(horse.stableId || '');
    setPhone(horse.phone || currentUser?.phone || '');
    setPrice(horse.price || 0);
    setRentType(horse.rentType || 'hour');
    setRentStart(horse.rentStart || '');
    setRentEnd(horse.rentEnd || '');
    setAdType(horse.adType);
    setIsSold(!!horse.isSold);
    setError('');
    setSuccess('');
    setIsAddOpen(true);
  };

  const handleBreedChange = (newBreed: 'arabian' | 'shabi' | 'sisi' | 'foreign') => {
    setBreed(newBreed);
    if (newBreed !== 'arabian') {
      setSireName('');
      setDamName('');
    }
  };

  const handleToggleHealthCondition = (condition: string) => {
    if (adType === 'rent') {
      if (condition === 'سليم وصحة ممتازة') {
        setHealthStatus('سليم وصحة ممتازة');
        return;
      }

      let tags = healthStatus
        ? healthStatus.split('،').map((t) => t.trim()).filter(Boolean)
        : [];

      tags = tags.filter((t) => t !== 'سليم وصحة ممتازة' && t !== 'سليم خالي من العيوب');

      if (tags.includes(condition)) {
        tags = tags.filter((t) => t !== condition);
      } else {
        tags.push(condition);
      }

      if (tags.length === 0) {
        setHealthStatus('سليم وصحة ممتازة');
      } else {
        setHealthStatus(tags.join('، '));
      }
      return;
    }

    // Sale health condition toggle
    if (condition === 'سليم خالي من العيوب') {
      setHealthStatus('سليم خالي من العيوب');
      return;
    }

    let tags = healthStatus
      ? healthStatus.split('،').map((t) => t.trim()).filter(Boolean)
      : [];

    tags = tags.filter((t) => t !== 'سليم خالي من العيوب' && t !== 'سليم تماماً' && t !== 'سليم وصحة ممتازة');

    if (tags.includes(condition)) {
      tags = tags.filter((t) => t !== condition);
    } else {
      tags.push(condition);
    }

    if (tags.length === 0) {
      setHealthStatus('سليم خالي من العيوب');
    } else {
      setHealthStatus(tags.join('، '));
    }
  };

  const handleToggleSoldStatus = async (horse: Horse, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    const newStatus = !horse.isSold;
    const updatedHorse: Horse = {
      ...horse,
      isSold: newStatus,
      soldAt: newStatus ? new Date().toISOString() : undefined,
    };
    // Optimistic update in state
    setHorses((prev) => prev.map((h) => (h.id === horse.id ? updatedHorse : h)));
    if (selectedHorse?.id === horse.id) {
      setSelectedHorse(updatedHorse);
    }
    try {
      await FirebaseService.saveHorse(updatedHorse);
      setSuccess(newStatus ? `تم تمييز "${horse.name}" كـ "تم البيع" بنجاح! 🏷️` : `تم إعادة عرض "${horse.name}" كـ "متاح للبيع"!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to toggle sold status:', err);
      fetchData();
    }
  };

  const handleDeleteClick = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const id = deleteConfirmId;
      setDeleteConfirmId(null);
      // Optimistic delete from state
      setHorses((prev) => prev.filter((h) => h.id !== id));
      await FirebaseService.deleteHorse(id);
    } catch (e) {
      console.error(e);
      fetchData();
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>, target: 'certificate' | 'images') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          try {
            const compressed = await compressImage(reader.result, 800, 800, 0.7);
            if (target === 'certificate') {
              setCertificate(compressed);
            } else {
              setImages((prev) => [...prev, compressed]);
            }
          } catch (err) {
            console.error('Failed to compress image, using fallback raw result', err);
            if (target === 'certificate') {
              setCertificate(reader.result);
            } else {
              setImages((prev) => [...prev, reader.result as string]);
            }
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const isUnlimited = currentUser?.role === 'admin' || currentUser?.isGold;

    if (!editingItemId && !isUnlimited) {
      const cnt = await FirebaseService.getUserTodayAdsCount(currentUser.id);
      if (cnt >= DAILY_FREE_ADS_LIMIT) {
        setError(`عذراً! لقد استنفذت الحد الأقصى للإعلانات المجانية اليومية (${DAILY_FREE_ADS_LIMIT} إعلانات اليوم). يقتصر الحد اليومي على الحسابات العادية. يمكنك الترقية للعضوية الذهبية 👑 لنشر إعلانات بلا حدود!`);
        return;
      }
    }

    if (adType === 'rent') {
      if (!name.trim() || !color.trim() || !healthStatus.trim()) {
        setError('يرجى ملء جميع الحقول المطلوبة (اسم الخيل، اللون، الحالة الصحية والجاهزية).');
        return;
      }
      if (!price || price <= 0) {
        setError('يرجى تحديد سعر الإيجار.');
        return;
      }
      if (!phone.trim()) {
        setError('يرجى إدخال رقم الهاتف للتواصل المباشر (اتصال وواتساب).');
        return;
      }
    } else {
      const isArabian = breed === 'arabian';
      if (!name || (isArabian && (!damName.trim() || !sireName.trim())) || (isArabian && !certificate) || !color || !healthStatus) {
        setError(isArabian 
          ? 'يرجى ملء جميع الحقول المطلوبة للخيل العربي (اسم الخيل، الأب، الأم، اللون، الحالة الصحية) ورفع شهادة التوثيق.' 
          : 'يرجى ملء جميع الحقول المطلوبة (اسم الخيل، اللون، الحالة الصحية).');
        return;
      }
      if (!phone.trim()) {
        setError('يرجى إدخال رقم الهاتف للتواصل المباشر (اتصال وواتساب).');
        return;
      }
    }

    // Open terms and conditions modal for user confirmation before publishing
    setIsTermsModalOpen(true);
  };

  const handleConfirmedPublishHorse = async () => {
    if (!currentUser) return;
    setIsSubmittingAd(true);
    setError('');

    const linkedStable = stables.find((s) => s.id === stableId);
    const isArabian = breed === 'arabian';
    const isRent = adType === 'rent';

    const horseData: Horse = {
      id: editingItemId ? editingItemId : 'hrs_' + Date.now(),
      userId: editingItemId ? (horses.find(h => h.id === editingItemId)?.userId || currentUser.id) : currentUser.id,
      userName: editingItemId ? (horses.find(h => h.id === editingItemId)?.userName || currentUser.name) : currentUser.name,
      adType,
      name: name.trim(),
      damName: !isRent && isArabian ? damName.trim() : '',
      sireName: !isRent && isArabian ? sireName.trim() : '',
      certificate: !isRent && isArabian ? certificate : (!isRent ? (certificate || '') : ''),
      breed,
      age,
      gender,
      color: color.trim(),
      height: !isRent && height.trim() ? height.trim() : undefined,
      healthStatus: healthStatus.trim() || (isRent ? 'سليم وصحة ممتازة' : 'سليم خالي من العيوب'),
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800'],
      stableId,
      stableName: linkedStable ? linkedStable.name : 'غير مرتبط بإسطبل محدد',
      phone: phone.trim() || currentUser.phone || '',
      price: price > 0 ? price : undefined,
      rentType: adType === 'rent' ? rentType : undefined,
      rentStart: adType === 'rent' && rentStart ? rentStart : undefined,
      rentEnd: adType === 'rent' && rentEnd ? rentEnd : undefined,
      isSold,
      soldAt: isSold ? (editingItemId ? (horses.find(h => h.id === editingItemId)?.soldAt || new Date().toISOString()) : new Date().toISOString()) : undefined,
      createdAt: editingItemId ? (horses.find(h => h.id === editingItemId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    try {
      await FirebaseService.saveHorse(horseData);
      setSuccess(editingItemId ? 'تم تعديل الإعلان بنجاح!' : 'تم إضافة إعلان الجواد بنجاح!');
      setIsTermsModalOpen(false);
      
      // Clear fields
      setName('');
      setDamName('');
      setSireName('');
      setCertificate('');
      setBreed('arabian');
      setAge(1);
      setGender('stallion');
      setColor('');
      setHeight('');
      setHealthStatus('سليم خالي من العيوب');
      setImages([]);
      setStableId('');
      setPhone('');
      setPrice(0);
      setRentStart('');
      setRentEnd('');
      setIsSold(false);

      setTimeout(() => {
        setIsAddOpen(false);
        fetchData();
        onAdCreated?.();
      }, 1500);
    } catch (err) {
      setError('حدث خطأ أثناء حفظ الإعلان.');
    } finally {
      setIsSubmittingAd(false);
    }
  };

  // Filter based on Type Tab and Global Search Query
  const filteredHorses = horses.filter((horse) => {
    const matchesTab = 
      filterType === 'all' || 
      (filterType === 'sale' && horse.adType === 'sale' && !horse.isSold) ||
      (filterType === 'rent' && horse.adType === 'rent') ||
      (filterType === 'sold' && horse.isSold);

    const matchesSearch = 
      horse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      horse.color.toLowerCase().includes(searchQuery.toLowerCase()) ||
      horse.healthStatus.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (horse.stableName && horse.stableName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Search and Tabs Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 sm:flex-initial py-1.5 px-3.5 rounded-lg font-bold text-xs transition ${
              filterType === 'all' ? 'bg-white text-navy shadow-xs' : 'text-slate-500 hover:text-navy'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilterType('sale')}
            className={`flex-1 sm:flex-initial py-1.5 px-3.5 rounded-lg font-bold text-xs transition ${
              filterType === 'sale' ? 'bg-white text-navy shadow-xs' : 'text-slate-500 hover:text-navy'
            }`}
          >
            خيول للبيع
          </button>
          <button
            onClick={() => setFilterType('rent')}
            className={`flex-1 sm:flex-initial py-1.5 px-3.5 rounded-lg font-bold text-xs transition ${
              filterType === 'rent' ? 'bg-white text-navy shadow-xs' : 'text-slate-500 hover:text-navy'
            }`}
          >
            خيول للإيجار
          </button>
          <button
            onClick={() => setFilterType('sold')}
            className={`flex-1 sm:flex-initial py-1.5 px-3.5 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
              filterType === 'sold' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-500 hover:text-navy'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>تم البيع</span>
            {horses.filter(h => h.isSold).length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${filterType === 'sold' ? 'bg-white/30 text-white' : 'bg-red-100 text-red-700'}`}>
                {horses.filter(h => h.isSold).length}
              </span>
            )}
          </button>
        </div>

        {/* Add Button */}
        <button
          onClick={() => {
            if (!currentUser) onOpenAuth();
            else handleOpenAdd();
          }}
          className="w-full sm:w-auto bg-navy hover:bg-navy-dark text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition shadow"
        >
          <Plus className="w-4 h-4" /> إضافة إعلان خيل جديد+
        </button>

      </div>

      {/* Red Alert Notice Bar - For Rental Section */}
      {filterType === 'rent' && (
        <div className="bg-gradient-to-r from-red-600 via-red-600 to-rose-600 text-white px-4 py-3 rounded-2xl shadow-md flex items-center justify-between gap-3 border border-red-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-xs sm:text-sm font-bold leading-snug">
              <span className="text-red-100">تنبيه حجز وتأجير الخيل: </span>
              <span className="text-white font-extrabold underline decoration-white/60">يجب تأكيد الحجز قبل الموعد بيوم</span>
            </div>
          </div>
          <span className="text-[11px] bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full font-bold hidden sm:inline-flex items-center gap-1">
            <span>تأكيد مسبق ⚠️</span>
          </span>
        </div>
      )}

      {/* Add Horse Modal Form */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-navy text-sm">{editingItemId ? 'تعديل إعلان الخيل' : 'إضافة إعلان خيل جديد'}</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-500 hover:text-navy text-xs font-bold">إغلاق</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
              {!editingItemId && (
                (currentUser?.role === 'admin' || currentUser?.isGold) ? (
                  <div className="p-3 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-gold-light/40 text-amber-900 text-xs font-bold flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-600 animate-bounce" />
                      <span>{currentUser?.role === 'admin' ? 'حساب مدير النظام 🛡️' : 'العضوية الذهبية المميزة 👑'}: نشر إعلانات غير محدود</span>
                    </div>
                    <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-2xs">
                      بلا حدود
                    </span>
                  </div>
                ) : (
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    userTodayAds >= DAILY_FREE_ADS_LIMIT 
                      ? 'bg-red-50 border-red-200 text-red-700' 
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>المتبقي من الإعلانات المجانية اليومية (حساب عادي):</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                      userTodayAds >= DAILY_FREE_ADS_LIMIT 
                        ? 'bg-red-600 text-white' 
                        : 'bg-emerald-600 text-white shadow-2xs'
                    }`}>
                      {Math.max(0, DAILY_FREE_ADS_LIMIT - userTodayAds)} من {DAILY_FREE_ADS_LIMIT} إعلانات
                    </span>
                  </div>
                )
              )}

              {error && (
                <div className="p-3 bg-red-50 border-r-4 border-red-500 text-red-700 text-xs rounded-l flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border-r-4 border-green-500 text-green-700 text-xs rounded-l flex items-start gap-2">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              {/* Type selector */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleAdTypeChange('sale')}
                  className={`py-2 text-center text-xs font-bold rounded-lg transition cursor-pointer ${adType === 'sale' ? 'bg-white text-navy shadow' : 'text-slate-500'}`}
                >
                  🏷️ خيل للبيع
                </button>
                <button
                  type="button"
                  onClick={() => handleAdTypeChange('rent')}
                  className={`py-2 text-center text-xs font-bold rounded-lg transition cursor-pointer ${adType === 'rent' ? 'bg-white text-navy shadow' : 'text-slate-500'}`}
                >
                  🏇 خيل للإيجار
                </button>
              </div>

              {/* Red Alert Banner for Rental in Form */}
              {adType === 'rent' && (
                <div className="p-3 bg-red-600 text-white rounded-xl flex items-center gap-2.5 shadow-sm border border-red-700 animate-pulse">
                  <AlertCircle className="w-5 h-5 text-white shrink-0" />
                  <div className="text-xs font-bold leading-tight">
                    <span>تنبيه هام للمستأجرين: </span>
                    <span className="underline decoration-white/60">يجب تأكيد الحجز قبل الموعد بيوم كامل</span>
                  </div>
                </div>
              )}

              {/* Price / Rent Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {adType === 'sale' ? 'السعر المطلوب (ريال) *' : 'سعر الإيجار (ريال) *'}
                  </label>
                  <input
                    type="number"
                    value={price || ''}
                    onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                    placeholder={adType === 'rent' ? 'مثال: 150' : 'مثال: 55000'}
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy text-left font-mono"
                  />
                </div>
                {adType === 'rent' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">مدة الإيجار *</label>
                    <select
                      value={rentType}
                      onChange={(e: any) => setRentType(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy bg-white font-bold text-navy"
                    >
                      {RENT_DURATION_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Contact Phone Number Input (Required for direct call & WhatsApp) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-navy flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-navy" />
                    <span>رقم هاتف التواصل المباشر (مكالمة هاتفية وواتساب) *</span>
                  </label>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                    مربوط بالاتصال والواتساب السريع
                  </span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="مثال: 0551234567"
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy bg-white font-mono text-left"
                />
                <p className="text-[10px] text-slate-400">
                  سيتم ربط هذا الرقم مباشرةً مع أزرار (الاتصال الهاتفي) و(واتساب مباشر) في بطاقة الإعلان وصفحة التفاصيل.
                </p>
              </div>

              {/* Quick Duration Selector Buttons for Rent */}
              {adType === 'rent' && (
                <div className="flex gap-2">
                  {RENT_DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRentType(opt.id)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer text-center ${
                        rentType === opt.id
                          ? 'bg-navy text-white border-navy shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.shortLabel}
                    </button>
                  ))}
                </div>
              )}

              {adType === 'rent' && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">من تاريخ *</label>
                    <input
                      type="date"
                      value={rentStart}
                      onChange={(e) => setRentStart(e.target.value)}
                      required={adType === 'rent'}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-navy"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">إلى تاريخ *</label>
                    <input
                      type="date"
                      value={rentEnd}
                      onChange={(e) => setRentEnd(e.target.value)}
                      required={adType === 'rent'}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-navy"
                    />
                  </div>
                </div>
              )}

              {/* Horse Core Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">اسم الخيل *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="اسم الجواد"
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">نوع السلالة *</label>
                  <select
                    value={breed}
                    onChange={(e: any) => handleBreedChange(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy font-semibold text-navy bg-white"
                  >
                    <option value="arabian">✨ عربي أصيل {adType === 'sale' ? '(معتمد الأنساب)' : ''}</option>
                    <option value="shabi">شعبي</option>
                    <option value="sisi">سيسي</option>
                    <option value="foreign">أجنبي</option>
                  </select>
                </div>
              </div>

              {/* Sire and Dam (ONLY for Sale and Pure Arabian horses - Hidden for Rent) */}
              {adType === 'sale' && (
                <div className={`p-3.5 rounded-xl border transition-all ${
                  breed === 'arabian' 
                    ? 'bg-amber-50/40 border-amber-200/80 shadow-xs' 
                    : 'bg-slate-50 border-slate-200 opacity-75'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Award className={`w-4 h-4 ${breed === 'arabian' ? 'text-gold' : 'text-slate-400'}`} />
                      <span>أنساب الخيل (اسم الأب والأم)</span>
                    </div>
                    {breed === 'arabian' ? (
                      <span className="text-[10px] bg-gold-light text-gold-dark px-2 py-0.5 rounded-full font-bold">
                        مفعل للخيل العربي الأصيل ✓
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-500" /> مخصص للعربي الأصيل فقط
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        اسم أب الخيل {breed === 'arabian' ? '*' : ''}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={sireName}
                          onChange={(e) => setSireName(e.target.value)}
                          placeholder={breed === 'arabian' ? 'اسم الأب (مطلوب)' : 'مغلق (خاص بالعربي الأصيل)'}
                          disabled={breed !== 'arabian'}
                          required={breed === 'arabian'}
                          className={`w-full text-xs p-2.5 border rounded-xl focus:outline-none ${
                            breed === 'arabian'
                              ? 'border-slate-200 focus:border-navy bg-white'
                              : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        />
                        {breed !== 'arabian' && (
                          <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        اسم أم الخيل {breed === 'arabian' ? '*' : ''}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={damName}
                          onChange={(e) => setDamName(e.target.value)}
                          placeholder={breed === 'arabian' ? 'اسم الأم (مطلوب)' : 'مغلق (خاص بالعربي الأصيل)'}
                          disabled={breed !== 'arabian'}
                          required={breed === 'arabian'}
                          className={`w-full text-xs p-2.5 border rounded-xl focus:outline-none ${
                            breed === 'arabian'
                              ? 'border-slate-200 focus:border-navy bg-white'
                              : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        />
                        {breed !== 'arabian' && (
                          <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">عمر الخيل (بالسنوات) *</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 1)}
                    min={1}
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy text-left"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">الجنس *</label>
                  <select
                    value={gender}
                    onChange={(e: any) => setGender(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  >
                    <option value="stallion">ذكر (حصان)</option>
                    <option value="mare">أنثى (فرس)</option>
                    <option value="gelding">مخصى</option>
                  </select>
                </div>
              </div>

              {/* Color and Height: Height is ONLY for Sale, hidden for Rent */}
              {adType === 'sale' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">اللون *</label>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="مثال: أدهم / أشقر / أزرق"
                      required
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                    />
                  </div>
                  {/* Horse Height Field for Sale */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                      <span>طول / ارتفاع الخيل</span>
                      <span className="text-[10px] text-slate-400 font-normal">سم أو بلكات</span>
                    </label>
                    <input
                      type="text"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="مثال: 152 سم أو 7 بلكات"
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                    />
                    {/* Height quick selection pills */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['148 سم', '150 سم', '152 سم', '155 سم', '158 سم', '7 بلكات', '7.5 بلكات', '8 بلكات'].map((hTag) => (
                        <button
                          key={hTag}
                          type="button"
                          onClick={() => setHeight(hTag)}
                          className={`text-[9px] px-2 py-0.5 rounded-full border transition cursor-pointer ${
                            height === hTag
                              ? 'bg-navy text-white border-navy font-bold shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {hTag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">اللون *</label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="مثال: أدهم / أشقر / أزرق / كميت"
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                </div>
              )}

              {/* Health & Readiness Section (Customized differently for Rent vs Sale) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <HeartPulse className={`w-4 h-4 ${adType === 'rent' ? 'text-blue-600' : 'text-rose-500'}`} />
                    <span>{adType === 'rent' ? 'الحالة الصحية والجاهزية للتدريب والركوب *' : 'الحالة الصحية والسلامة *'}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {adType === 'rent' ? 'اختر مستوى جاهزية الخيل للإيجار' : 'اختر خياراً أو أكثر لتحديده تلقائياً'}
                  </span>
                </div>

                {/* Health Condition Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {(adType === 'rent' ? RENT_HEALTH_CONDITIONS : SALE_HEALTH_CONDITIONS).map((cond) => {
                    const isSelected = healthStatus.includes(cond);
                    const isPositive = cond === 'سليم خالي من العيوب' || cond === 'سليم وصحة ممتازة' || cond === 'نشيط جدا ومناسب للتدريب والسباقات';
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => handleToggleHealthCondition(cond)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition flex items-center gap-1 cursor-pointer font-medium ${
                          isSelected
                            ? isPositive
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : adType === 'rent'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : isPositive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : adType === 'rent'
                                ? 'bg-blue-50/60 text-blue-800 border-blue-200 hover:bg-blue-100'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{cond}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Text summary input for health status */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    نص الحالة المعتمد في الإعلان (يمكنك التعديل أو إضافة تفاصيل إضافية):
                  </label>
                  <input
                    type="text"
                    value={healthStatus}
                    onChange={(e) => setHealthStatus(e.target.value)}
                    placeholder={adType === 'rent' ? 'سليم وصحة ممتازة أو حدد مستوى الجاهزية من الأعلى' : 'سليم خالي من العيوب أو حدد الحالات من الأعلى'}
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy bg-white"
                  />
                </div>
              </div>

              {/* Linked Stable dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">الإسطبل المرتبط به الخيل</label>
                <select
                  value={stableId}
                  onChange={(e) => setStableId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy bg-white"
                >
                  <option value="">لا يوجد (إعلان شخصي مستقل)</option>
                  {stables.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pedigree Certificate Upload (ONLY for Sale - Hidden for Rent) */}
              {adType === 'sale' && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    {breed === 'arabian' ? 'شهادة النسب والتوثيق * (مطلوب للخيل العربي الأصيل)' : 'شهادة النسب أو وثيقة الملكية (اختياري)'}
                  </label>
                  <div className="relative flex items-center gap-2 border border-slate-200 rounded-xl p-3 bg-slate-50 justify-center hover:bg-slate-100 transition duration-150">
                    <Award className={`w-5 h-5 ${breed === 'arabian' ? 'text-gold' : 'text-slate-400'}`} />
                    <span className="text-xs text-slate-500">رفع صورة الشهادة من ملفاتك</span>
                    <input
                      type="file"
                      accept="image/*"
                      required={breed === 'arabian' && !editingItemId}
                      onChange={(e) => handleFileUpload(e, 'certificate')}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                  {certificate && (
                    <div className="w-16 h-12 rounded border overflow-hidden mt-1 bg-slate-100">
                      <img src={certificate} referrerPolicy="no-referrer" alt="Cert-Preview" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              )}

              {/* Photo upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">صور وفيديوهات الخيل (متعددة)</label>
                <div className="relative flex items-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 justify-center hover:bg-slate-100 transition duration-150">
                  <Image className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium">اضغط لرفع ملفات الوسائط</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileUpload(e, 'images')}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </div>
                {images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto mt-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        <img src={img} referrerPolicy="no-referrer" alt="preview" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Is Sold Switch (available during edit or new ad) */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Tag className="w-3.5 h-3.5 text-amber-700" />
                    <span>تمييز الإعلان كـ "تم البيع"</span>
                  </div>
                  <p className="text-[10px] text-amber-700">تفعيل هذا الخيار يعلم المشترين بأن الجواد قد بيع بالفعل.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSold}
                    onChange={(e) => setIsSold(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-navy hover:bg-navy-dark text-white font-bold py-3 rounded-xl cursor-pointer transition text-xs shadow"
              >
                {editingItemId ? 'حفظ التعديلات' : 'نشر إعلان الجواد'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Listings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredHorses.length > 0 ? (
          filteredHorses.map((horse) => (
            <div
              key={horse.id}
              onClick={() => setSelectedHorse(horse)}
              className={`bg-white rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col cursor-pointer group relative ${
                horse.isSold
                  ? 'border-red-200/80 shadow-xs hover:shadow-md'
                  : 'border-slate-100 hover:shadow-xl'
              }`}
            >
              {/* Image Container */}
              <div className="h-48 bg-slate-100 relative overflow-hidden">
                <img
                  src={horse.images?.[0] || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800'}
                  referrerPolicy="no-referrer"
                  alt={horse.name}
                  className={`w-full h-full object-cover group-hover:scale-105 transition duration-500 ${
                    horse.isSold ? 'grayscale-30 brightness-90' : ''
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                
                {/* Rating Badge Top Left */}
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1 shadow-md border border-amber-400/30">
                  <Star className="w-3 h-3 fill-current text-amber-400" />
                  <span>{horse.rating || 5}</span>
                  <span className="text-slate-300 text-[9px]">({horse.reviews?.length || 0})</span>
                </div>

                {/* Sold Badge or Sale / Rent Badge */}
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                  {horse.isSold ? (
                    <span className="bg-red-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black shadow-lg flex items-center gap-1 border border-white/30 animate-pulse">
                      <CheckCircle2 className="w-3 h-3 text-white" /> تم البيع
                    </span>
                  ) : (
                    <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold shadow-md text-white ${
                      horse.adType === 'sale' ? 'bg-amber-500' : 'bg-navy'
                    }`}>
                      {horse.adType === 'sale' ? 'خيل للبيع' : 'خيل للإيجار'}
                    </span>
                  )}
                </div>

                {/* Price Display */}
                {horse.price && (
                  <div className="absolute bottom-3 right-3 text-white font-bold">
                    <span className="text-sm font-mono">{horse.price}</span>
                    <span className="text-[10px] mr-1">
                      ريال {horse.adType === 'rent' ? `/ ${getRentDurationLabel(horse.rentType)}` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Horse Info Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-navy group-hover:text-gold transition text-xs leading-tight">{horse.name}</h4>
                    {horse.isSold && (
                      <span className="text-[9px] bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded border border-red-200 shrink-0">
                        مُباع
                      </span>
                    )}
                  </div>
                  
                  {/* Small attributes */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-[10px] text-slate-500 border-b border-slate-50 pb-2">
                    <span>السلالة: <strong>{horse.breed === 'arabian' ? 'عربي أصيل' : horse.breed === 'shabi' ? 'شعبي' : horse.breed === 'sisi' ? 'سيسي' : 'أجنبي'}</strong></span>
                    <span>العمر: <strong>{horse.age} سنوات</strong></span>
                    <span>الجنس: <strong>{horse.gender === 'stallion' ? 'ذكر' : horse.gender === 'mare' ? 'أنثى' : 'مخصى'}</strong></span>
                    <span className="truncate">اللون: <strong>{horse.color}</strong></span>
                    {horse.height && <span className="col-span-2 text-slate-600 font-medium">الارتفاع / الطول: <strong>{horse.height}</strong></span>}
                  </div>

                  {horse.adType === 'rent' && (
                    <div className="mt-2 bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />
                      <span>تأكيد الحجز قبل الموعد بيوم</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-[9px] text-slate-400">
                  <span>بواسطة: {horse.userName}</span>
                  {horse.stableName && <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-100">{horse.stableName}</span>}
                </div>

                {/* Direct quick contact buttons on card (Call & WhatsApp) */}
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`tel:${horse.phone || '0559595055'}`}
                    className="py-1.5 px-2 bg-navy hover:bg-navy-dark text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition shadow-xs cursor-pointer"
                    title={`اتصال هاتفي: ${horse.phone || '0559595055'}`}
                  >
                    <Phone className="w-3 h-3 shrink-0" />
                    <span>اتصال</span>
                  </a>
                  <a
                    href={`https://wa.me/${(horse.phone || '0559595055').replace(/^0/, '966')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition shadow-xs cursor-pointer"
                    title={`واتساب مباشر: ${horse.phone || '0559595055'}`}
                  >
                    <MessageSquare className="w-3 h-3 shrink-0" />
                    <span>واتساب</span>
                  </a>
                </div>

                {/* Edit & Delete & Toggle Sold Actions for owner/admin */}
                {(currentUser?.role === 'admin' || currentUser?.id === horse.userId) && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-50 justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleToggleSoldStatus(horse, e)}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg flex items-center gap-1 transition ${
                        horse.isSold
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                          : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                      }`}
                      title={horse.isSold ? 'إلغاء وسم تم البيع وإعادة العرض' : 'وضع علامة تم البيع'}
                    >
                      {horse.isSold ? (
                        <>
                          <RotateCcw className="w-3 h-3 text-emerald-600" /> متاح
                        </>
                      ) : (
                        <>
                          <Tag className="w-3 h-3 text-amber-600" /> تم البيع
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleEditClick(horse)}
                      className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                    >
                      <Edit2 className="w-3 h-3" /> تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteClick(horse.id)}
                      className="px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3 h-3" /> حذف
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-slate-400 text-xs py-8 col-span-3">لم نجد أي خيل يطابق معايير البحث.</p>
        )}
      </div>

      {/* Detailed view */}
      {selectedHorse && (
        <DetailModal
          item={selectedHorse}
          type="horse"
          isOpen={true}
          onClose={() => setSelectedHorse(null)}
          currentUser={currentUser}
          onRefresh={fetchData}
          onEdit={handleEditClick}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="تأكيد حذف الإعلان"
        message="هل أنت متأكد من رغبتك في حذف هذا الإعلان نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="نعم، احذف الإعلان"
        cancelText="إلغاء"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <TermsAgreementModal
        isOpen={isTermsModalOpen}
        onConfirm={handleConfirmedPublishHorse}
        onCancel={() => setIsTermsModalOpen(false)}
        categoryName="إعلان الجواد"
        isSubmitting={isSubmittingAd}
      />

    </div>
  );
}
