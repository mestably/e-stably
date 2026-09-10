/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Plus, Search, Star, Phone, Info, Eye, Image, ShieldAlert, Award, Calendar, RefreshCw, AlertCircle, Check, Trash2, Edit2 } from 'lucide-react';
import { Horse, Stable, User } from '../types';
import { FirebaseService } from '../lib/firebase';
import DetailModal from './DetailModal';
import ConfirmModal from './ConfirmModal';
import { compressImage } from '../lib/imageUtils';

interface HorsesSectionProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  searchQuery: string;
}

export default function HorsesSection({ currentUser, onOpenAuth, searchQuery }: HorsesSectionProps) {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [stables, setStables] = useState<Stable[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'rent'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

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
  const [healthStatus, setHealthStatus] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [stableId, setStableId] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [rentType, setRentType] = useState<'hour' | 'day'>('hour');
  const [rentStart, setRentStart] = useState('');
  const [rentEnd, setRentEnd] = useState('');
  
  // UI States
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchData = async () => {
    // 1. Load from cache instantly
    const cachedHorses = FirebaseService.getLocalHorses();
    const cachedStables = FirebaseService.getLocalStables();
    if (cachedHorses.length > 0) setHorses(cachedHorses);
    if (cachedStables.length > 0) setStables(cachedStables);

    // 2. Load fresh from background database
    try {
      const hData = await FirebaseService.getHorses();
      const sData = await FirebaseService.getStables();
      setHorses(hData);
      setStables(sData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
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
    setHealthStatus('');
    setImages([]);
    setStableId('');
    setPrice(0);
    setRentStart('');
    setRentEnd('');
    setError('');
    setSuccess('');
    setIsAddOpen(true);
  };

  const handleEditClick = (horse: Horse) => {
    setEditingItemId(horse.id);
    setName(horse.name);
    setDamName(horse.damName);
    setSireName(horse.sireName);
    setCertificate(horse.certificate);
    setBreed(horse.breed);
    setAge(horse.age);
    setGender(horse.gender);
    setColor(horse.color);
    setHealthStatus(horse.healthStatus);
    setImages(horse.images || []);
    setStableId(horse.stableId || '');
    setPrice(horse.price || 0);
    setRentType(horse.rentType || 'hour');
    setRentStart(horse.rentStart || '');
    setRentEnd(horse.rentEnd || '');
    setAdType(horse.adType);
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

    if (!name || !damName || !sireName || !certificate || !color || !healthStatus) {
      setError('يرجى ملء جميع الحقول المطلوبة ورفع الشهادة.');
      return;
    }

    const linkedStable = stables.find((s) => s.id === stableId);

    const horseData: Horse = {
      id: editingItemId ? editingItemId : 'hrs_' + Date.now(),
      userId: editingItemId ? (horses.find(h => h.id === editingItemId)?.userId || currentUser.id) : currentUser.id,
      userName: editingItemId ? (horses.find(h => h.id === editingItemId)?.userName || currentUser.name) : currentUser.name,
      adType,
      name: name.trim(),
      damName: damName.trim(),
      sireName: sireName.trim(),
      certificate,
      breed,
      age,
      gender,
      color: color.trim(),
      healthStatus: healthStatus.trim(),
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800'],
      stableId,
      stableName: linkedStable ? linkedStable.name : 'غير مرتبط بإسطبل محدد',
      price: price > 0 ? price : undefined,
      rentType: adType === 'rent' ? rentType : undefined,
      rentStart: adType === 'rent' && rentStart ? rentStart : undefined,
      rentEnd: adType === 'rent' && rentEnd ? rentEnd : undefined,
      createdAt: editingItemId ? (horses.find(h => h.id === editingItemId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    try {
      await FirebaseService.saveHorse(horseData);
      setSuccess(editingItemId ? 'تم تعديل الإعلان بنجاح!' : 'تم إضافة إعلان الجواد بنجاح!');
      
      // Clear fields
      setName('');
      setDamName('');
      setSireName('');
      setCertificate('');
      setBreed('arabian');
      setAge(1);
      setGender('stallion');
      setColor('');
      setHealthStatus('');
      setImages([]);
      setStableId('');
      setPrice(0);
      setRentStart('');
      setRentEnd('');

      setTimeout(() => {
        setIsAddOpen(false);
        fetchData();
      }, 1500);
    } catch (err) {
      setError('حدث خطأ أثناء حفظ الإعلان.');
    }
  };

  // Filter based on Type Tab and Global Search Query
  const filteredHorses = horses.filter((horse) => {
    const matchesTab = 
      filterType === 'all' || 
      (filterType === 'sale' && horse.adType === 'sale') ||
      (filterType === 'rent' && horse.adType === 'rent');

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
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 sm:flex-initial py-1.5 px-4 rounded-lg font-bold text-xs transition ${
              filterType === 'all' ? 'bg-white text-navy shadow-xs' : 'text-slate-500 hover:text-navy'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilterType('sale')}
            className={`flex-1 sm:flex-initial py-1.5 px-4 rounded-lg font-bold text-xs transition ${
              filterType === 'sale' ? 'bg-white text-navy shadow-xs' : 'text-slate-500 hover:text-navy'
            }`}
          >
            خيول للبيع
          </button>
          <button
            onClick={() => setFilterType('rent')}
            className={`flex-1 sm:flex-initial py-1.5 px-4 rounded-lg font-bold text-xs transition ${
              filterType === 'rent' ? 'bg-white text-navy shadow-xs' : 'text-slate-500 hover:text-navy'
            }`}
          >
            خيول للإيجار
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

      {/* Add Horse Modal Form */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-navy text-sm">{editingItemId ? 'تعديل إعلان الخيل' : 'إضافة إعلان خيل جديد'}</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-500 hover:text-navy text-xs font-bold">إغلاق</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
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
                  onClick={() => setAdType('sale')}
                  className={`py-2 text-center text-xs font-bold rounded-lg transition ${adType === 'sale' ? 'bg-white text-navy shadow' : 'text-slate-500'}`}
                >
                  خيل للبيع
                </button>
                <button
                  type="button"
                  onClick={() => setAdType('rent')}
                  className={`py-2 text-center text-xs font-bold rounded-lg transition ${adType === 'rent' ? 'bg-white text-navy shadow' : 'text-slate-500'}`}
                >
                  خيل للإيجار
                </button>
              </div>

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
                    placeholder="مثال: 55000"
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy text-left"
                  />
                </div>
                {adType === 'rent' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">مدة الإيجار *</label>
                    <select
                      value={rentType}
                      onChange={(e: any) => setRentType(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                    >
                      <option value="hour">ساعة</option>
                      <option value="day">يوم</option>
                    </select>
                  </div>
                )}
              </div>

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
                    onChange={(e: any) => setBreed(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  >
                    <option value="arabian">عربي أصيل</option>
                    <option value="shabi">شعبي</option>
                    <option value="sisi">سيسي</option>
                    <option value="foreign">أجنبي</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">اسم أب الخيل *</label>
                  <input
                    type="text"
                    value={sireName}
                    onChange={(e) => setSireName(e.target.value)}
                    placeholder="اسم الأب"
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">اسم أم الخيل *</label>
                  <input
                    type="text"
                    value={damName}
                    onChange={(e) => setDamName(e.target.value)}
                    placeholder="اسم الأم"
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                </div>
              </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">اللون *</label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="مثال: أدهم / أشقر"
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">الحالة الصحية *</label>
                  <input
                    type="text"
                    value={healthStatus}
                    onChange={(e) => setHealthStatus(e.target.value)}
                    placeholder="سليم تماماً"
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
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

              {/* Pedigree Certificate Upload */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">شهادة النسب والتوثيق * (مطلوب مستقل)</label>
                <div className="relative flex items-center gap-2 border border-slate-200 rounded-xl p-3 bg-slate-50 justify-center hover:bg-slate-100 transition duration-150">
                  <Award className="w-5 h-5 text-gold" />
                  <span className="text-xs text-slate-500">رفع صورة الشهادة من ملفاتك</span>
                  <input
                    type="file"
                    accept="image/*"
                    required={!editingItemId}
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
              className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer group"
            >
              {/* Image Container */}
              <div className="h-48 bg-slate-100 relative overflow-hidden">
                <img
                  src={horse.images?.[0] || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800'}
                  referrerPolicy="no-referrer"
                  alt={horse.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                
                {/* Sale / Rent Badge */}
                <span className={`absolute top-3 right-3 text-[9px] px-2.5 py-0.5 rounded-full font-bold shadow-md text-white ${
                  horse.adType === 'sale' ? 'bg-amber-500' : 'bg-navy'
                }`}>
                  {horse.adType === 'sale' ? 'خيل للبيع' : 'خيل للإيجار'}
                </span>

                {/* Price Display */}
                {horse.price && (
                  <div className="absolute bottom-3 right-3 text-white font-bold">
                    <span className="text-sm font-mono">{horse.price}</span>
                    <span className="text-[10px] mr-1">
                      ريال {horse.adType === 'rent' ? `/ ${horse.rentType === 'hour' ? 'ساعة' : 'يوم'}` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Horse Info Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="font-bold text-navy group-hover:text-gold transition text-xs leading-tight">{horse.name}</h4>
                  
                  {/* Small attributes */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-[10px] text-slate-500 border-b border-slate-50 pb-2">
                    <span>السلالة: <strong>{horse.breed === 'arabian' ? 'عربي أصيل' : 'شعبي'}</strong></span>
                    <span>العمر: <strong>{horse.age} سنوات</strong></span>
                    <span>الجنس: <strong>{horse.gender === 'stallion' ? 'ذكر' : 'أنثى'}</strong></span>
                    <span className="truncate">اللون: <strong>{horse.color}</strong></span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] text-slate-400">
                  <span>بواسطة: {horse.userName}</span>
                  {horse.stableName && <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-100">{horse.stableName}</span>}
                </div>

                {/* Edit & Delete Actions for owner/admin */}
                {(currentUser?.role === 'admin' || currentUser?.id === horse.userId) && (
                  <div className="flex gap-2 pt-2 border-t border-slate-50 justify-end" onClick={(e) => e.stopPropagation()}>
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

    </div>
  );
}
