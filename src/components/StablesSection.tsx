/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Plus, Search, Shield, Star, Phone, Map, Users, Sparkles, Image, Check, AlertCircle, Trash2, Edit2, Crown } from 'lucide-react';
import { Stable, User } from '../types';
import { FirebaseService, DAILY_FREE_ADS_LIMIT } from '../lib/firebase';
import DetailModal from './DetailModal';
import ConfirmModal from './ConfirmModal';
import TermsAgreementModal from './TermsAgreementModal';
import { compressImage } from '../lib/imageUtils';

interface StablesSectionProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  searchQuery: string;
  onAdCreated?: () => void;
}

export default function StablesSection({ currentUser, onOpenAuth, searchQuery, onAdCreated }: StablesSectionProps) {
  const [stables, setStables] = useState<Stable[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedStable, setSelectedStable] = useState<Stable | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [userTodayAds, setUserTodayAds] = useState(0);

  useEffect(() => {
    if (currentUser?.id) {
      FirebaseService.getUserTodayAdsCount(currentUser.id).then((cnt) => {
        setUserTodayAds(cnt);
      });
    }
  }, [currentUser?.id, isAddOpen]);
  
  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [horseCount, setHorseCount] = useState(0);
  const [verified, setVerified] = useState<'verified' | 'pending' | 'unverified'>('unverified');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);

  const fetchStables = async () => {
    // 1. Load instantly from sanitized cache
    const cached = FirebaseService.getLocalStables();
    setStables(cached);

    // 2. Fetch fresh from background database
    try {
      const data = await FirebaseService.getStables();
      setStables(data);
    } catch (e) {
      console.error('Error fetching stables:', e);
    }
  };

  useEffect(() => {
    fetchStables();

    const handleSync = (e: any) => {
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
    setDescription('');
    setPhone('');
    setImages([]);
    setHorseCount(0);
    setVerified('unverified');
    setError('');
    setSuccess('');
    setIsAddOpen(true);
  };

  const handleEditClick = (stable: Stable) => {
    setEditingItemId(stable.id);
    setName(stable.name);
    setDescription(stable.description);
    setPhone(stable.phone);
    setImages(stable.images || []);
    setHorseCount(stable.horseCount);
    setVerified(stable.verified);
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
      setStables((prev) => prev.filter((s) => s.id !== id));
      await FirebaseService.deleteStable(id);
    } catch (e) {
      console.error(e);
      fetchStables();
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

    const isUnlimited = currentUser?.role === 'admin' || currentUser?.isGold;

    if (!editingItemId && !isUnlimited) {
      const cnt = await FirebaseService.getUserTodayAdsCount(currentUser.id);
      if (cnt >= DAILY_FREE_ADS_LIMIT) {
        setError(`عذراً! لقد استنفذت الحد الأقصى للإعلانات المجانية اليومية (${DAILY_FREE_ADS_LIMIT} إعلانات اليوم). يقتصر الحد اليومي على الحسابات العادية. يمكنك الترقية للعضوية الذهبية 👑 لنشر إعلانات بلا حدود!`);
        return;
      }
    }

    if (!name || !description || !phone) {
      setError('يرجى ملء كافة البيانات المطلوبة.');
      return;
    }

    // Open terms modal before publishing
    setIsTermsModalOpen(true);
  };

  const handleConfirmedPublishStable = async () => {
    if (!currentUser) return;
    setIsSubmittingAd(true);
    setError('');

    const stableData: Stable = {
      id: editingItemId ? editingItemId : 'stb_' + Date.now(),
      userId: editingItemId ? (stables.find(s => s.id === editingItemId)?.userId || currentUser.id) : currentUser.id,
      userName: editingItemId ? (stables.find(s => s.id === editingItemId)?.userName || currentUser.name) : currentUser.name,
      name: name.trim(),
      description: description.trim(),
      phone: phone.trim(),
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=800'],
      verified: editingItemId ? verified : (currentUser.role === 'admin' ? 'verified' : 'pending'),
      horseCount,
      rating: editingItemId ? (stables.find(s => s.id === editingItemId)?.rating || 5) : 5,
      reviews: editingItemId ? (stables.find(s => s.id === editingItemId)?.reviews || []) : [],
      createdAt: editingItemId ? (stables.find(s => s.id === editingItemId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };

    try {
      await FirebaseService.saveStable(stableData);
      setSuccess(editingItemId ? 'تم تعديل الإسطبل بنجاح!' : 'تم إضافة الإسطبل بنجاح! سيتم مراجعته وتوثيقه قريباً.');
      setIsTermsModalOpen(false);
      
      // Clear fields
      setName('');
      setDescription('');
      setPhone('');
      setImages([]);
      setHorseCount(0);
      setVerified('unverified');

      setTimeout(() => {
        setIsAddOpen(false);
        fetchStables();
        onAdCreated?.();
      }, 1500);
    } catch (err) {
      setError('حدث خطأ أثناء حفظ الإسطبل.');
    } finally {
      setIsSubmittingAd(false);
    }
  };

  // Filter stables based on global search query
  const filteredStables = stables.filter((stable) => {
    const matchesSearch = 
      stable.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stable.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stable.phone.includes(searchQuery);
    return matchesSearch;
  });

  // Highlight Stats: Outstanding Stables
  const verifiedCount = stables.filter((s) => s.verified === 'verified').length;
  const totalHorses = stables.reduce((sum, s) => sum + s.horseCount, 0);
  const bestRatedStable = stables.reduce((best, s) => (s.rating > (best?.rating || 0) ? s : best), stables[0] as Stable | undefined);

  return (
    <div className="space-y-6">
      
      {/* Top Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-navy rounded-xl">
            <Shield className="w-5 h-5 text-navy" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">الإسطبلات الموثقة</span>
            <span className="text-sm font-extrabold text-navy font-mono">{verifiedCount} مربط</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-gold rounded-xl">
            <Users className="w-5 h-5 text-gold" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">مجموع الخيول المسجلة</span>
            <span className="text-sm font-extrabold text-navy font-mono">{totalHorses} جواد</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="p-3 bg-gold-light text-gold-dark rounded-xl">
            <Star className="w-5 h-5 fill-current" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">الأعلى تقييماً</span>
            <span className="text-xs font-bold text-slate-800 truncate block max-w-[150px]">
              {bestRatedStable ? bestRatedStable.name : 'لا يوجد'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Action Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-navy">إسطبلات ومصانع الخيول</h2>
          <p className="text-[11px] text-slate-400">تصفح وتواصل مع أشهر المرابط والإسطبلات العربية الأصيلة</p>
        </div>
        <button
          onClick={() => {
            if (!currentUser) onOpenAuth();
            else handleOpenAdd();
          }}
          className="bg-navy hover:bg-navy-dark text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> إضافة إسطبل جديد+
        </button>
      </div>

      {/* Add Stable Form Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-navy text-sm">{editingItemId ? 'تعديل بيانات الإسطبل' : 'إضافة إسطبل جديد'}</h3>
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

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">اسم الإسطبل *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: مربط الشقب للخيول العربية"
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">الوصف والخدمات المتوفرة *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب وصفاً مفصلاً للإسطبل والخيول الموجودة والرعاية والخدمات..."
                  rows={4}
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">عدد الخيول المتواجدة</label>
                  <input
                    type="number"
                    value={horseCount}
                    onChange={(e) => setHorseCount(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">صور الإسطبل (متعددة من هاتفك)</label>
                <div className="relative flex items-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 justify-center hover:bg-slate-100 transition duration-150">
                  <Image className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium">اضغط لرفع الصور من الملفات</span>
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
                {editingItemId ? 'حفظ التعديلات' : 'حفظ وإرسال الإسطبل'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Stables Directory/Listings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {filteredStables.length > 0 ? (
          filteredStables.map((stable) => (
            <div
              key={stable.id}
              onClick={() => setSelectedStable(stable)}
              className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer group"
            >
              {/* Photo */}
              <div className="h-44 bg-slate-100 relative overflow-hidden">
                <img
                  src={stable.images?.[0] || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=800'}
                  referrerPolicy="no-referrer"
                  alt={stable.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                
                {/* Stats overlays */}
                {stable.verified === 'verified' && (
                  <span className="absolute top-3 right-3 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5 font-bold">
                    <Shield className="w-3 h-3" /> موثق
                  </span>
                )}

                <div className="absolute bottom-3 left-3 flex gap-1 items-center bg-black/60 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-white text-[10px]">
                  <Users className="w-3.5 h-3.5 text-gold" />
                  <span className="font-bold">{stable.horseCount} خيول</span>
                </div>
              </div>

              {/* Text content */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-navy group-hover:text-gold transition text-xs leading-tight line-clamp-1">{stable.name}</h4>
                    <div className="flex items-center gap-0.5 text-amber-500 shrink-0 text-[10px]">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-bold text-slate-700">{stable.rating || 5}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">{stable.description}</p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-50 text-[10px] text-slate-400">
                  <span>بواسطة: {stable.userName}</span>
                  <span className="font-bold text-navy-medium flex items-center gap-0.5">
                    <Phone className="w-3 h-3" /> {stable.phone}
                  </span>
                </div>

                {/* Edit & Delete Actions for owner/admin */}
                {(currentUser?.role === 'admin' || currentUser?.id === stable.userId) && (
                  <div className="flex gap-2 pt-2 border-t border-slate-50 justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEditClick(stable)}
                      className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                    >
                      <Edit2 className="w-3 h-3" /> تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteClick(stable.id)}
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
          <p className="text-center text-slate-400 text-xs py-8 col-span-2">لم نجد أي إسطبلات تطابق كلمة البحث.</p>
        )}
      </div>

      {/* Detailed Modal view */}
      {selectedStable && (
        <DetailModal
          item={selectedStable}
          type="stable"
          isOpen={true}
          onClose={() => setSelectedStable(null)}
          currentUser={currentUser}
          onRefresh={fetchStables}
          onEdit={handleEditClick}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="تأكيد حذف الإسطبل"
        message="هل أنت متأكد من رغبتك في حذف هذا الإسطبل نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="نعم، احذف الإسطبل"
        cancelText="إلغاء"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <TermsAgreementModal
        isOpen={isTermsModalOpen}
        onConfirm={handleConfirmedPublishStable}
        onCancel={() => setIsTermsModalOpen(false)}
        categoryName="إعلان الإسطبل"
        isSubmitting={isSubmittingAd}
      />

    </div>
  );
}
