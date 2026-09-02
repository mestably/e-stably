/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ChangeEvent, FormEvent, MouseEvent, useMemo } from 'react';
import { Plus, Check, Star, Phone, Home, Heart, Activity, ClipboardCheck, Image, ShieldAlert, AlertCircle, Trash2, Edit2, Crown, Shield, Building2, Search, MapPin, CheckCircle2, Lock, RotateCcw, Tag } from 'lucide-react';
import { Shelter, Stable, User } from '../types';
import { FirebaseService, DAILY_FREE_ADS_LIMIT } from '../lib/firebase';
import DetailModal from './DetailModal';
import ConfirmModal from './ConfirmModal';
import TermsAgreementModal from './TermsAgreementModal';
import { compressImage } from '../lib/imageUtils';

interface ShelterSectionProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  searchQuery: string;
  onAdCreated?: () => void;
}

export default function ShelterSection({ currentUser, onOpenAuth, searchQuery, onAdCreated }: ShelterSectionProps) {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [stables, setStables] = useState<Stable[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [userTodayAds, setUserTodayAds] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'ended'>('all');

  useEffect(() => {
    if (currentUser?.id) {
      FirebaseService.getUserTodayAdsCount(currentUser.id).then((cnt) => {
        setUserTodayAds(cnt);
      });
    }
  }, [currentUser?.id, isAddOpen]);

  // Form Fields
  const [stableId, setStableId] = useState('');
  const [stableSearchText, setStableSearchText] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'monthly' | 'daily'>('monthly');
  const [nutrition, setNutrition] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [training, setTraining] = useState(false);
  const [veterinary, setVeterinary] = useState(false);
  const [phone, setPhone] = useState('');
  const [images, setImages] = useState<string[]>([]);
  
  // UI states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);

  const fetchSheltersAndStables = async () => {
    // 1. Load instantly from sanitized cache
    const cachedShelters = FirebaseService.getLocalShelters();
    setShelters(cachedShelters);
    const cachedStables = FirebaseService.getLocalStables();
    setStables(cachedStables);

    // 2. Fetch fresh from background database
    try {
      const [sheltersData, stablesData] = await Promise.all([
        FirebaseService.getShelters(),
        FirebaseService.getStables()
      ]);
      setShelters(sheltersData);
      setStables(stablesData);
    } catch (e) {
      console.error('Error fetching shelters & stables:', e);
    }
  };

  useEffect(() => {
    fetchSheltersAndStables();

    const handleSync = (e: any) => {
      if (e?.detail?.shelters) {
        setShelters(e.detail.shelters);
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

  const filteredStablesForSelection = useMemo(() => {
    if (!stableSearchText.trim()) return stables;
    const q = stableSearchText.toLowerCase();
    return stables.filter((s) => 
      s.name.toLowerCase().includes(q) ||
      (s.userName && s.userName.toLowerCase().includes(q)) ||
      (s.location && s.location.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q))
    );
  }, [stables, stableSearchText]);

  const selectedStable = useMemo(() => {
    return stables.find((s) => s.id === stableId);
  }, [stables, stableId]);

  const handleOpenAdd = () => {
    setEditingItemId(null);
    setStableId('');
    setStableSearchText('');
    setTitle('');
    setDescription('');
    setType('monthly');
    setNutrition(false);
    setCleaning(false);
    setTraining(false);
    setVeterinary(false);
    setPhone(currentUser?.phone || '');
    setImages([]);
    setError('');
    setSuccess('');
    setIsAddOpen(true);
  };

  const handleEditClick = (shelter: Shelter) => {
    setEditingItemId(shelter.id);
    setStableId(shelter.stableId || '');
    setStableSearchText('');
    setTitle(shelter.title);
    setDescription(shelter.description);
    setType(shelter.type);
    setNutrition(shelter.nutrition || false);
    setCleaning(shelter.cleaning || false);
    setTraining(shelter.training || false);
    setVeterinary(shelter.veterinary || false);
    setPhone(shelter.phone);
    setImages(shelter.images || []);
    setError('');
    setSuccess('');
    setIsAddOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const id = deleteConfirmId;
      setDeleteConfirmId(null);
      // Optimistic delete
      setShelters((prev) => prev.filter((s) => s.id !== id));
      await FirebaseService.deleteShelter(id);
    } catch (e) {
      console.error(e);
      fetchSheltersAndStables();
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          try {
            const compressed = await compressImage(reader.result, 800, 800, 0.7);
            setImages((prev) => [...prev, compressed]);
          } catch (err) {
            console.error('Failed to compress image, using fallback raw result', err);
            setImages((prev) => [...prev, reader.result as string]);
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

    if (!stableId) {
      setError('عذراً! لا يُسمح بإدخال مراكز إيواء إلا للإسطبلات المسجلة فقط في قسم الإسطبلات لدينا. يرجى اختيار الإسطبل المسجل التابع له المركز.');
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

    const linkedStable = stables.find((s) => s.id === stableId);
    const resolvedTitle = linkedStable ? `مركز إيواء ${linkedStable.name}` : (title.trim() || 'مركز إيواء');

    if (!resolvedTitle || !description || !phone) {
      setError('يرجى ملء كافة البيانات المطلوبة واختيار الإسطبل.');
      return;
    }

    // Open terms modal before publishing
    setIsTermsModalOpen(true);
  };

  const handleToggleEndedStatus = async (shelter: Shelter, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const newStatus = !shelter.isEnded;
      const updated: Shelter = {
        ...shelter,
        isEnded: newStatus,
        endedAt: newStatus ? new Date().toISOString() : undefined,
      };
      setShelters((prev) => prev.map((s) => (s.id === shelter.id ? updated : s)));
      await FirebaseService.saveShelter(updated);
    } catch (err) {
      console.error('Failed to toggle shelter status:', err);
      fetchSheltersAndStables();
    }
  };

  const handleConfirmedPublishShelter = async () => {
    if (!currentUser) return;
    setIsSubmittingAd(true);
    setError('');

    const linkedStable = stables.find((s) => s.id === stableId);
    const resolvedTitle = linkedStable ? `مركز إيواء ${linkedStable.name}` : (title.trim() || 'مركز إيواء');
    const existing = editingItemId ? shelters.find(s => s.id === editingItemId) : null;

    const shelterData: Shelter = {
      id: editingItemId ? editingItemId : 'shl_' + Date.now(),
      userId: existing ? existing.userId : currentUser.id,
      userName: existing ? existing.userName : currentUser.name,
      stableId,
      stableName: linkedStable ? linkedStable.name : (existing?.stableName || 'إسطبل مسجل'),
      title: resolvedTitle,
      description: description.trim(),
      type,
      nutrition,
      cleaning,
      training,
      veterinary,
      phone: phone.trim(),
      images: images.length > 0 ? images : (linkedStable?.images?.length ? linkedStable.images : ['https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&q=80&w=800']),
      rating: existing?.rating || 5,
      reviews: existing?.reviews || [],
      isEnded: existing?.isEnded || false,
      endedAt: existing?.endedAt,
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    try {
      await FirebaseService.saveShelter(shelterData);
      setSuccess(editingItemId ? 'تم تعديل الإعلان بنجاح!' : 'تم إضافة إعلان الإيواء بنجاح!');
      setIsTermsModalOpen(false);
      
      // Clear fields
      setStableId('');
      setTitle('');
      setDescription('');
      setType('monthly');
      setNutrition(false);
      setCleaning(false);
      setTraining(false);
      setVeterinary(false);
      setPhone('');
      setImages([]);

      setTimeout(() => {
        setIsAddOpen(false);
        fetchSheltersAndStables();
        onAdCreated?.();
      }, 1500);
    } catch (err) {
      setError('حدث خطأ أثناء حفظ الإيواء.');
    } finally {
      setIsSubmittingAd(false);
    }
  };

  // Filter based on Search and statusFilter
  const filteredShelters = shelters.filter((shelter) => {
    const matchesSearch = 
      shelter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shelter.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shelter.stableName && shelter.stableName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      shelter.phone.includes(searchQuery);
    if (!matchesSearch) return false;
    if (statusFilter === 'active') return !shelter.isEnded;
    if (statusFilter === 'ended') return !!shelter.isEnded;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-navy rounded-xl">
            <Home className="w-5 h-5 text-navy" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">مراكز الإيواء</span>
            <span className="text-sm font-extrabold text-navy font-mono">{shelters.length} مراكز</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <Heart className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">خدمات بيطرية</span>
            <span className="text-xs font-bold text-slate-700">مشمولة دائماً</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="p-3 bg-amber-50 text-gold rounded-xl">
            <Activity className="w-5 h-5 text-gold" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">برامج التدريب</span>
            <span className="text-xs font-bold text-slate-700">يومية مكثفة</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="p-3 bg-red-50 text-red-500 rounded-xl">
            <ClipboardCheck className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">مستويات الرعاية</span>
            <span className="text-xs font-bold text-slate-700">تصنيف ملكي ممتاز</span>
          </div>
        </div>
      </div>

      {/* Category / Status Filter & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-navy text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            جميع خدمات الإيواء ({shelters.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            المتاحة ({shelters.filter(s => !s.isEnded).length})
          </button>
          <button
            onClick={() => setStatusFilter('ended')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'ended'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            المحجوزة بالكامل ({shelters.filter(s => !!s.isEnded).length})
          </button>
        </div>

        <button
          onClick={() => {
            if (!currentUser) onOpenAuth();
            else handleOpenAdd();
          }}
          className="bg-navy hover:bg-navy-dark text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" /> إضافة إيواء جديد+
        </button>
      </div>

      {/* Add Shelter Modal Form */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gold" />
                <h3 className="font-bold text-navy text-sm">{editingItemId ? 'تعديل بيانات الإيواء' : 'إدخال مركز إيواء جديد'}</h3>
              </div>
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

              {/* Policy alert banner */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-navy text-[11px] flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-navy shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">شرط إدخال مراكز الإيواء:</span>
                  <span>لا يُسمح بإدخال مراكز إيواء إلا للإسطبلات المسجلة فقط في قسم الإسطبلات بالمنصة لضمان سلامة وجودة رعاية الجياد.</span>
                </div>
              </div>

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

              {/* Mandatory Registered Stable Selection Box */}
              <div className="bg-amber-50/50 border border-amber-200/90 rounded-2xl p-3 sm:p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-navy flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-gold shrink-0" />
                    <span>اختيار الإسطبل المسجل * (إلزامي من القائمة)</span>
                  </label>
                  <span className="text-[10px] bg-gold-light text-gold-dark px-2 py-0.5 rounded-full font-black border border-gold/30">
                    إسطبل مسجل فقط ✓
                  </span>
                </div>

                {stables.length === 0 ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
                    <p className="font-bold">⚠️ لا توجد إسطبلات مسجلة حالياً بالمنصة!</p>
                    <p className="text-[11px] leading-relaxed">
                      يجب تسجيل الإسطبل أولاً من خلال <strong>قسم الإسطبلات</strong> حتى تتمكن من إضافة مركز إيواء تابع له.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Quick filter input if list has items */}
                    {stables.length > 3 && (
                      <div className="relative">
                        <input
                          type="text"
                          value={stableSearchText}
                          onChange={(e) => setStableSearchText(e.target.value)}
                          placeholder="🔍 ابحث في قائمة الإسطبلات المسجلة (الاسم، المسؤول، الموقع)..."
                          className="w-full text-[11px] py-1.5 pr-8 pl-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-navy text-navy placeholder:text-slate-400 font-medium"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    )}

                    {/* Compact Mobile-friendly Select Dropdown */}
                    <div className="relative">
                      <select
                        value={stableId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setStableId(selectedId);
                          const found = stables.find((s) => s.id === selectedId);
                          if (found) {
                            if (!phone) setPhone(found.phone || '');
                            setTitle(`مركز إيواء ${found.name}`);
                          } else {
                            setTitle('');
                          }
                        }}
                        required
                        className="w-full text-[11px] sm:text-xs py-2 px-3 border border-amber-300 rounded-xl focus:outline-none focus:border-navy bg-white font-bold text-navy truncate"
                      >
                        <option value="">-- اضغط لاختيار الإسطبل المسجل ({filteredStablesForSelection.length} متاح) --</option>
                        {filteredStablesForSelection.map((s) => (
                          <option key={s.id} value={s.id}>
                            🏛️ {s.name} {s.location ? `(${s.location})` : ''} - المسؤول: {s.userName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Selected Stable Confirmation Card */}
                    {selectedStable && (
                      <div className="p-2.5 bg-white border border-amber-200 rounded-xl flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold text-navy block text-xs">{selectedStable.name}</span>
                            <span className="text-[10px] text-slate-500">المسؤول: {selectedStable.userName} | 📞 {selectedStable.phone}</span>
                          </div>
                        </div>
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                          تم التوثيق
                        </span>
                      </div>
                    )}

                    <span className="text-[10px] text-slate-500 block leading-tight">
                      * النظام يربط اسم الإسطبل المعتمد وبياناته تلقائياً ولا يسمح بكتابة إسطبل يدوي خارج القائمة المسجلة.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span>اسم العرض / عنوان إعلان الإيواء</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-200">
                    <Lock className="w-2.5 h-2.5 text-slate-500" />
                    <span>تلقائي من الإسطبل</span>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedStable ? `مركز إيواء ${selectedStable.name}` : (title || '')}
                    readOnly
                    tabIndex={-1}
                    placeholder="يتم تعيينه وعرضه تلقائياً فور اختيار الإسطبل من القائمة أعلاه"
                    required
                    className="w-full text-xs p-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-navy font-bold cursor-not-allowed select-none focus:outline-none placeholder:text-slate-400"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  * هذا الحقل مقفل ولا يمكن تعديله يدوياً، حيث يعتمد على اسم الإسطبل المعتمد المختار من القائمة.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">الوصف والخدمات التفصيلية *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب وصفاً للغرف، البوكسات، المساحات المتوفرة، الرعاية اليومية، النظافة، التغذية..."
                  rows={4}
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">نوع الإيواء *</label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy bg-white"
                  >
                    <option value="monthly">شهري</option>
                    <option value="daily">يومي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">رقم التواصل والواتساب *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="055XXXXXXX"
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy text-left"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <span className="block text-xs font-bold text-slate-700 mb-2">الخدمات المتوفرة:</span>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nutrition}
                      onChange={(e) => setNutrition(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-navy focus:ring-navy accent-navy"
                    />
                    <span>تغذية</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cleaning}
                      onChange={(e) => setCleaning(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-navy focus:ring-navy accent-navy"
                    />
                    <span>تنظيف</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={training}
                      onChange={(e) => setTraining(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-navy focus:ring-navy accent-navy"
                    />
                    <span>تدريب</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={veterinary}
                      onChange={(e) => setVeterinary(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-navy focus:ring-navy accent-navy"
                    />
                    <span>بيطري ورعاية صحية</span>
                  </label>
                </div>
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">صور مركز الإيواء</label>
                <div className="relative flex items-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 justify-center hover:bg-slate-100 transition duration-150">
                  <Image className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium">اضغط لرفع الصور من ملفاتك</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
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

              <button
                type="submit"
                disabled={stables.length === 0}
                className={`w-full font-bold py-3 rounded-xl transition text-xs shadow ${
                  stables.length === 0 
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                    : 'bg-navy hover:bg-navy-dark text-white cursor-pointer'
                }`}
              >
                {editingItemId ? 'حفظ التعديلات' : 'حفظ ونشر مركز الإيواء'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Directory listings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {filteredShelters.length > 0 ? (
          filteredShelters.map((shelter) => (
            <div
              key={shelter.id}
              onClick={() => setSelectedShelter(shelter)}
              className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer group"
            >
              {/* Photo */}
              <div className="h-44 bg-slate-100 relative overflow-hidden">
                <img
                  src={shelter.images?.[0] || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&q=80&w=800'}
                  referrerPolicy="no-referrer"
                  alt={shelter.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                
                {/* Type Badge */}
                <span className="absolute top-3 right-3 bg-navy text-white text-[9px] px-2.5 py-0.5 rounded-full font-bold shadow-md">
                  إيواء {shelter.type === 'monthly' ? 'شهري' : 'يومي'}
                </span>

                {shelter.isEnded && (
                  <span className="absolute top-3 left-3 bg-red-600/95 text-white text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 font-black shadow-md border border-white/20">
                    <CheckCircle2 className="w-3 h-3" /> محجوز بالكامل
                  </span>
                )}

                <div className="absolute bottom-3 left-3 flex gap-1 items-center bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full text-white text-[9px]">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span className="font-bold">{shelter.rating || 5} / 5</span>
                </div>
              </div>

              {/* Text info */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  {/* Stable association badge */}
                  {shelter.stableName && (
                    <div className="inline-flex items-center gap-1 text-[10px] text-amber-900 font-bold bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-md mb-1.5">
                      <Shield className="w-3 h-3 text-gold" />
                      <span>إسطبل: {shelter.stableName}</span>
                    </div>
                  )}

                  <h4 className="font-bold text-navy group-hover:text-gold transition text-xs leading-tight line-clamp-1">{shelter.title}</h4>
                  <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">{shelter.description}</p>
                </div>

                {/* Micro services indicators */}
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {shelter.nutrition && <span className="bg-green-50 text-green-700 border border-green-100 text-[8px] font-bold px-1.5 py-0.5 rounded-md">تغذية</span>}
                  {shelter.cleaning && <span className="bg-green-50 text-green-700 border border-green-100 text-[8px] font-bold px-1.5 py-0.5 rounded-md">تنظيف</span>}
                  {shelter.training && <span className="bg-green-50 text-green-700 border border-green-100 text-[8px] font-bold px-1.5 py-0.5 rounded-md">تدريب</span>}
                  {shelter.veterinary && <span className="bg-green-50 text-green-700 border border-green-100 text-[8px] font-bold px-1.5 py-0.5 rounded-md">رعاية صحية</span>}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-50 text-[10px] text-slate-400">
                  <span>بواسطة: {shelter.userName}</span>
                  <span className="font-bold text-navy flex items-center gap-0.5">
                    <Phone className="w-3 h-3" /> {shelter.phone}
                  </span>
                </div>

                {/* Edit & Delete & Toggle Status Actions for owner/admin */}
                {(currentUser?.role === 'admin' || currentUser?.id === shelter.userId) && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-50 justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleToggleEndedStatus(shelter, e)}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg flex items-center gap-1 transition cursor-pointer ${
                        shelter.isEnded
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                      }`}
                      title={shelter.isEnded ? 'إعادة إتاحة خدمة الإيواء' : 'تمييز الخدمة كـ محجوزة بالكامل'}
                    >
                      {shelter.isEnded ? <RotateCcw className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                      <span>{shelter.isEnded ? 'إعادة إتاحة' : 'تمييز كمحجوز'}</span>
                    </button>
                    <button
                      onClick={() => handleEditClick(shelter)}
                      className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteClick(shelter.id)}
                      className="px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> حذف
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-slate-400 text-xs py-8 col-span-2">لم نجد أي إيواء يطابق معايير البحث.</p>
        )}
      </div>

      {/* Detail Modal */}
      {selectedShelter && (
        <DetailModal
          item={selectedShelter}
          type="shelter"
          isOpen={true}
          onClose={() => setSelectedShelter(null)}
          currentUser={currentUser}
          onRefresh={fetchSheltersAndStables}
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
        onConfirm={handleConfirmedPublishShelter}
        onCancel={() => setIsTermsModalOpen(false)}
        categoryName="إعلان الإيواء"
        isSubmitting={isSubmittingAd}
      />

    </div>
  );
}
