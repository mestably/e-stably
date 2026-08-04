/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Plus, Check, Star, Phone, Home, Heart, Activity, ClipboardCheck, Image, ShieldAlert, AlertCircle, Trash2, Edit2 } from 'lucide-react';
import { Shelter, User } from '../types';
import { FirebaseService } from '../lib/firebase';
import DetailModal from './DetailModal';
import ConfirmModal from './ConfirmModal';
import { compressImage } from '../lib/imageUtils';

interface ShelterSectionProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  searchQuery: string;
}

export default function ShelterSection({ currentUser, onOpenAuth, searchQuery }: ShelterSectionProps) {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Form Fields
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

  const fetchShelters = async () => {
    // 1. Load instantly from cache
    const cached = FirebaseService.getLocalShelters();
    if (cached.length > 0) setShelters(cached);

    // 2. Fetch fresh from background database
    try {
      const data = await FirebaseService.getShelters();
      setShelters(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchShelters();
  }, []);

  const handleOpenAdd = () => {
    setEditingItemId(null);
    setTitle('');
    setDescription('');
    setType('monthly');
    setNutrition(false);
    setCleaning(false);
    setTraining(false);
    setVeterinary(false);
    setPhone('');
    setImages([]);
    setError('');
    setSuccess('');
    setIsAddOpen(true);
  };

  const handleEditClick = (shelter: Shelter) => {
    setEditingItemId(shelter.id);
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
      fetchShelters();
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

    if (!title || !description || !phone) {
      setError('يرجى ملء كافة البيانات المطلوبة.');
      return;
    }

    const shelterData: Shelter = {
      id: editingItemId ? editingItemId : 'shl_' + Date.now(),
      userId: editingItemId ? (shelters.find(s => s.id === editingItemId)?.userId || currentUser.id) : currentUser.id,
      userName: editingItemId ? (shelters.find(s => s.id === editingItemId)?.userName || currentUser.name) : currentUser.name,
      title: title.trim(),
      description: description.trim(),
      type,
      nutrition,
      cleaning,
      training,
      veterinary,
      phone: phone.trim(),
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&q=80&w=800'],
      rating: editingItemId ? (shelters.find(s => s.id === editingItemId)?.rating || 5) : 5,
      reviews: editingItemId ? (shelters.find(s => s.id === editingItemId)?.reviews || []) : [],
      createdAt: editingItemId ? (shelters.find(s => s.id === editingItemId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    try {
      await FirebaseService.saveShelter(shelterData);
      setSuccess(editingItemId ? 'تم تعديل الإعلان بنجاح!' : 'تم إضافة إعلان الإيواء بنجاح!');
      
      // Clear fields
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
        fetchShelters();
      }, 1500);
    } catch (err) {
      setError('حدث خطأ أثناء حفظ الإيواء.');
    }
  };

  // Filter based on Search
  const filteredShelters = shelters.filter((shelter) => {
    const matchesSearch = 
      shelter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shelter.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shelter.phone.includes(searchQuery);
    return matchesSearch;
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

      {/* Title block */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-navy">إيواء الخيول والعناية بها</h2>
          <p className="text-[11px] text-slate-400">مراكز إيواء مجهزة بالكامل للخيول ورعاية صحية على مدار الساعة</p>
        </div>
        <button
          onClick={() => {
            if (!currentUser) onOpenAuth();
            else handleOpenAdd();
          }}
          className="bg-navy hover:bg-navy-dark text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition shadow"
        >
          <Plus className="w-4 h-4" /> إضافة إيواء جديد+
        </button>
      </div>

      {/* Add Shelter Modal Form */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-navy text-sm">{editingItemId ? 'تعديل بيانات الإيواء' : 'إدخال إيواء جديد'}</h3>
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

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">اسم العرض / اسم مركز الإيواء *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: إيواء النخبة الملكي"
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">الوصف والخدمات التفصيلية *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب وصفاً للغرف، البوكسات، المساحات المتوفرة، الرعاية اليومية..."
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
                className="w-full bg-navy hover:bg-navy-dark text-white font-bold py-3 rounded-xl cursor-pointer transition text-xs shadow"
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

                <div className="absolute bottom-3 left-3 flex gap-1 items-center bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full text-white text-[9px]">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span className="font-bold">{shelter.rating || 5} / 5</span>
                </div>
              </div>

              {/* Text info */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
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

                {/* Edit & Delete Actions for owner/admin */}
                {(currentUser?.role === 'admin' || currentUser?.id === shelter.userId) && (
                  <div className="flex gap-2 pt-2 border-t border-slate-50 justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEditClick(shelter)}
                      className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                    >
                      <Edit2 className="w-3 h-3" /> تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteClick(shelter.id)}
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
          onRefresh={fetchShelters}
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
