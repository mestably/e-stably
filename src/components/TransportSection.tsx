/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent, ChangeEvent, MouseEvent } from 'react';
import { Plus, Check, Calendar, MapPin, Truck, AlertCircle, DollarSign, ArrowLeftRight, HelpCircle, Navigation, Trash2, Edit2, Crown, Camera, Image, Upload, X, Phone, FileText, RotateCcw, Tag, CheckCircle2 } from 'lucide-react';
import { Transport, User } from '../types';
import { FirebaseService, DAILY_FREE_ADS_LIMIT } from '../lib/firebase';
import DetailModal from './DetailModal';
import ConfirmModal from './ConfirmModal';
import TermsAgreementModal from './TermsAgreementModal';
import { compressImage } from '../lib/imageUtils';
import transportBgImage from '../assets/images/horse_transport_bg_1784414679042.jpg';
import defaultTransportImg from '../assets/images/horse_transport_default_1788309609008.jpg';

// Reference the generated beautiful clipart image & default transport vehicle image
const TRANSPORT_BG = transportBgImage;
export const DEFAULT_TRANSPORT_IMAGE = defaultTransportImg;

interface TransportSectionProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  searchQuery: string;
  onAdCreated?: () => void;
}

export default function TransportSection({ currentUser, onOpenAuth, searchQuery, onAdCreated }: TransportSectionProps) {
  const [transports, setTransports] = useState<Transport[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<Transport | null>(null);
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
  const [vehicleType, setVehicleType] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [horseCount, setHorseCount] = useState(1);
  const [date, setDate] = useState('');
  const [price, setPrice] = useState(0);
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  
  // Locations
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLat, setPickupLat] = useState(24.7136);
  const [pickupLng, setPickupLng] = useState(46.6753);
  
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLat, setDeliveryLat] = useState(21.4858);
  const [deliveryLng, setDeliveryLng] = useState(39.1925);

  // UI States
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<'pickup' | 'delivery' | null>(null);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);

  const fetchTransports = async () => {
    // 1. Load instantly from sanitized cache
    const cached = FirebaseService.getLocalTransports();
    setTransports(cached);

    // 2. Fetch fresh from background database
    try {
      const data = await FirebaseService.getTransports();
      setTransports(data);
    } catch (e) {
      console.error('Error fetching transports:', e);
    }
  };

  useEffect(() => {
    fetchTransports();

    const handleSync = (e: any) => {
      if (e?.detail?.transports) {
        setTransports(e.detail.transports);
      }
    };

    window.addEventListener('horses_forum_sync_complete', handleSync);
    return () => {
      window.removeEventListener('horses_forum_sync_complete', handleSync);
    };
  }, []);

  const handleOpenAdd = () => {
    setEditingItemId(null);
    setVehicleType('');
    setCapacity(2);
    setHorseCount(1);
    setDate('');
    setPrice(0);
    setPhone(currentUser?.phone || '');
    setDescription('');
    setImages([]);
    setPickupAddress('');
    setPickupLat(24.7136);
    setPickupLng(46.6753);
    setDeliveryAddress('');
    setDeliveryLat(21.4858);
    setDeliveryLng(39.1925);
    setError('');
    setSuccess('');
    setIsAddOpen(true);
  };

  const handleEditClick = (transport: Transport) => {
    setEditingItemId(transport.id);
    setVehicleType(transport.vehicleType);
    setCapacity(transport.capacity);
    setHorseCount(transport.horseCount);
    setDate(transport.date);
    setPrice(transport.price);
    setPhone(transport.phone || '');
    setDescription(transport.description || '');
    setImages(transport.images || []);
    setPickupAddress(transport.pickupAddress);
    setPickupLat(transport.pickupCoords?.lat || 24.7136);
    setPickupLng(transport.pickupCoords?.lng || 46.6753);
    setDeliveryAddress(transport.deliveryAddress);
    setDeliveryLat(transport.deliveryCoords?.lat || 21.4858);
    setDeliveryLng(transport.deliveryCoords?.lng || 39.1925);
    setError('');
    setSuccess('');
    setIsAddOpen(true);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    const fileList = Array.from(files);

    Promise.all(
      fileList.map((file: File) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            if (typeof reader.result === 'string') {
              try {
                const compressed = await compressImage(reader.result, 900, 900, 0.75);
                resolve(compressed);
              } catch (err) {
                console.error('Failed to compress vehicle image, using raw', err);
                resolve(reader.result as string);
              }
            } else {
              resolve('');
            }
          };
          reader.readAsDataURL(file);
        });
      })
    ).then((newImages) => {
      const validImages = newImages.filter((img) => img.length > 0);
      setImages((prev) => [...prev, ...validImages]);
      setIsUploadingImages(false);
      if (e.target) {
        e.target.value = '';
      }
    });
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
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
      setTransports((prev) => prev.filter((t) => t.id !== id));
      await FirebaseService.deleteTransport(id);
    } catch (e) {
      console.error(e);
      fetchTransports();
    }
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

    if (!vehicleType || !date || !price || !pickupAddress || !deliveryAddress) {
      setError('يرجى ملء جميع حقول تفاصيل النقل ومواقع الاستلام والتسليم.');
      return;
    }

    // Open terms modal before publishing
    setIsTermsModalOpen(true);
  };

  const handleToggleEndedStatus = async (transport: Transport, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const newStatus = !transport.isEnded;
      const updated: Transport = {
        ...transport,
        isEnded: newStatus,
        endedAt: newStatus ? new Date().toISOString() : undefined,
      };
      setTransports((prev) => prev.map((t) => (t.id === transport.id ? updated : t)));
      await FirebaseService.saveTransport(updated);
    } catch (err) {
      console.error('Failed to toggle transport status:', err);
      fetchTransports();
    }
  };

  const handleConfirmedPublishTransport = async () => {
    if (!currentUser) return;
    setIsSubmittingAd(true);
    setError('');

    const existing = editingItemId ? transports.find(t => t.id === editingItemId) : null;

    const transportData: Transport = {
      id: editingItemId ? editingItemId : 'trp_' + Date.now(),
      userId: existing ? existing.userId : currentUser.id,
      userName: existing ? existing.userName : currentUser.name,
      vehicleType: vehicleType.trim(),
      capacity,
      horseCount,
      date,
      price,
      pickupAddress: pickupAddress.trim(),
      pickupCoords: { lat: pickupLat, lng: pickupLng },
      deliveryAddress: deliveryAddress.trim(),
      deliveryCoords: { lat: deliveryLat, lng: deliveryLng },
      images: images && images.length > 0 ? images : undefined,
      phone: phone.trim() || undefined,
      description: description.trim() || undefined,
      isEnded: existing?.isEnded || false,
      endedAt: existing?.endedAt,
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    try {
      await FirebaseService.saveTransport(transportData);
      setSuccess(editingItemId ? 'تم تعديل عملية النقل بنجاح!' : 'تم إضافة عملية النقل المجدولة بنجاح!');
      setIsTermsModalOpen(false);
      
      // Clear fields
      setVehicleType('');
      setCapacity(2);
      setHorseCount(1);
      setDate('');
      setPrice(0);
      setPhone('');
      setDescription('');
      setImages([]);
      setPickupAddress('');
      setDeliveryAddress('');

      setTimeout(() => {
        setIsAddOpen(false);
        fetchTransports();
        onAdCreated?.();
      }, 1500);
    } catch (err) {
      setError('حدث خطأ أثناء حفظ عملية النقل.');
    } finally {
      setIsSubmittingAd(false);
    }
  };

  const filteredTransports = transports.filter((trans) => {
    const matchesSearch = 
      trans.vehicleType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trans.pickupAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trans.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'active') return !trans.isEnded;
    if (statusFilter === 'ended') return !!trans.isEnded;
    return true;
  });

  // Simulated Coordinates Picker for cities in Saudi Arabia
  const handleCitySelect = (city: string, type: 'pickup' | 'delivery') => {
    const coords: Record<string, { lat: number; lng: number; name: string }> = {
      riyadh: { lat: 24.7136, lng: 46.6753, name: 'الرياض، المملكة العربية السعودية' },
      jeddah: { lat: 21.4858, lng: 39.1925, name: 'جدة، المملكة العربية السعودية' },
      dammam: { lat: 26.4207, lng: 50.0888, name: 'الدمام، المملكة العربية السعودية' },
      mecca: { lat: 21.3891, lng: 39.8579, name: 'مكة المكرمة، المملكة العربية السعودية' },
      medina: { lat: 24.5247, lng: 39.5692, name: 'المدينة المنورة، المملكة العربية السعودية' },
      taif: { lat: 21.2854, lng: 40.4244, name: 'الطائف، المملكة العربية السعودية' },
    };

    const target = coords[city];
    if (target) {
      if (type === 'pickup') {
        setPickupAddress(target.name);
        setPickupLat(target.lat);
        setPickupLng(target.lng);
      } else {
        setDeliveryAddress(target.name);
        setDeliveryLat(target.lat);
        setDeliveryLng(target.lng);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Visual Header Banner - Requested Clipart background */}
      <div
        className="w-full h-44 rounded-2xl overflow-hidden relative border border-slate-100 shadow-sm bg-cover bg-center"
        style={{ backgroundImage: `url(${TRANSPORT_BG})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/60 to-transparent flex items-center p-6 sm:p-8">
          <div className="text-right max-w-md text-white space-y-1">
            <h2 className="text-lg font-extrabold text-gold leading-tight">نقل خيل آمن ومريح</h2>
            <p className="text-[11px] text-slate-100 leading-relaxed">
              نوفر وننظم أسطولاً من المقطورات الفاخرة المجهزة لنقل الخيول بين كافة مدن ومناطق المملكة بكل أمان واحترافية.
            </p>
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
            جميع رحلات النقل ({transports.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            المتاحة ({transports.filter(t => !t.isEnded).length})
          </button>
          <button
            onClick={() => setStatusFilter('ended')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'ended'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            المنجزة / المنتهية ({transports.filter(t => !!t.isEnded).length})
          </button>
        </div>

        <button
          onClick={() => {
            if (!currentUser) onOpenAuth();
            else handleOpenAdd();
          }}
          className="bg-navy hover:bg-navy-dark text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" /> إضافة نقل جديد+
        </button>
      </div>

      {/* Add Transport Modal Form */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-navy text-sm">{editingItemId ? 'تعديل بيانات رحلة النقل' : 'إدخال نقل جديد'}</h3>
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

              {/* Vehicle Photos Upload (Optional) */}
              <div className="space-y-2 border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-navy" />
                    <span>صور المركبة / المقطورة</span>
                    <span className="text-[10px] font-normal text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">اختياري</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {images.length > 0 ? `${images.length} صور مختارة` : 'صورة افتراضية متاحة'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  يمكنك إضافة صور لمركبتك أو مقطورة النقل (اختياري). في حال عدم إضافة أي صورة، سيتم نشر الإعلان تلقائياً بصورة افتراضية تعبر عن مركبة وخيول النقل.
                </p>

                {/* Previews */}
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1 pb-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100 shadow-2xs">
                        <img src={img} alt={`Vehicle ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition cursor-pointer"
                          title="حذف الصورة"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* File upload input button */}
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-navy hover:bg-navy-50/30 rounded-xl p-3.5 cursor-pointer transition text-center group">
                  <Upload className="w-5 h-5 text-slate-400 group-hover:text-navy mb-1 transition" />
                  <span className="text-xs font-bold text-slate-700 group-hover:text-navy">
                    {isUploadingImages ? 'جاري معالجة الصور...' : 'اضغط لاختيار صور المركبة من جهازك'}
                  </span>
                  <span className="text-[10px] text-slate-400">JPG, PNG, WEBP (يمكنك اختيار عدة صور)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={isUploadingImages}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">نوع المركبة وتجهيزاتها *</label>
                <input
                  type="text"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  placeholder="مثال: مقطورة مزدوجة مكيفة مجهزة بكاميرات"
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                />
              </div>

              {/* Capacity & Horses */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">السعة الكلية للمركبة *</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                    min={1}
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy text-left"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">عدد الخيول المراد نقلها *</label>
                  <input
                    type="number"
                    value={horseCount}
                    onChange={(e) => setHorseCount(parseInt(e.target.value) || 1)}
                    min={1}
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy text-left"
                  />
                </div>
              </div>

              {/* Date & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">تاريخ النقل *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">السعر المطلوب (ريال) *</label>
                  <input
                    type="number"
                    value={price || ''}
                    onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                    placeholder="مثال: 1500"
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy text-left"
                  />
                </div>
              </div>

              {/* Phone & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">رقم التواصل والواتساب</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy text-left"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ملاحظات إضافية (اختياري)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="تفاصيل التبريد، السائق، التوقفات..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                </div>
              </div>

              {/* Pickup Location - Map style */}
              <div className="space-y-2 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <span className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-gold" /> موقع الاستلام وتحديد العنوان *
                </span>
                
                {/* Cities picker for simulated Google Maps coordinates */}
                <div className="flex gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 self-center">تحديد سريع:</span>
                  {['riyadh', 'jeddah', 'dammam', 'mecca', 'medina'].map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => handleCitySelect(city, 'pickup')}
                      className="bg-white border border-slate-200 hover:border-gold px-2 py-0.5 rounded-md text-[9px] font-semibold text-slate-600 cursor-pointer"
                    >
                      {city === 'riyadh' ? 'الرياض' : city === 'jeddah' ? 'جدة' : city === 'dammam' ? 'الدمام' : city === 'mecca' ? 'مكة' : 'المدينة'}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-slate-500">العنوان يدوي بالتفصيل *</label>
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="اكتب العنوان يدوياً (مثال: مربط الشقب - بوابة رقم 2)"
                    required
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-navy bg-white"
                  />
                </div>
              </div>

              {/* Delivery Location - Map style */}
              <div className="space-y-2 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <span className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-navy" /> موقع التسليم وتحديد العنوان *
                </span>

                <div className="flex gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 self-center">تحديد سريع:</span>
                  {['riyadh', 'jeddah', 'dammam', 'mecca', 'medina'].map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => handleCitySelect(city, 'delivery')}
                      className="bg-white border border-slate-200 hover:border-gold px-2 py-0.5 rounded-md text-[9px] font-semibold text-slate-600 cursor-pointer"
                    >
                      {city === 'riyadh' ? 'الرياض' : city === 'jeddah' ? 'جدة' : city === 'dammam' ? 'الدمام' : city === 'mecca' ? 'مكة' : 'المدينة'}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-slate-500">العنوان يدوي بالتفصيل *</label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="مثال: إسطبل الصواري - مخطط حي الأصالة"
                    required
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-navy bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-navy hover:bg-navy-dark text-white font-bold py-3 rounded-xl cursor-pointer transition text-xs shadow"
              >
                {editingItemId ? 'حفظ التعديلات' : 'حفظ وإدراج عملية النقل'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Directory listings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {filteredTransports.length > 0 ? (
          filteredTransports.map((trans) => {
            const hasCustomImages = trans.images && trans.images.length > 0;
            const coverImage = hasCustomImages ? trans.images![0] : DEFAULT_TRANSPORT_IMAGE;

            return (
              <div
                key={trans.id}
                onClick={() => setSelectedTransport(trans)}
                className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer group"
              >
                {/* Vehicle Image Cover Header */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                  <img
                    src={coverImage}
                    alt={trans.vehicleType}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/30 pointer-events-none" />
                  
                  {/* Badges Top */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-white bg-navy/90 backdrop-blur-xs px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md border border-white/15">
                      <Truck className="w-3 h-3 text-gold" /> نقل مجدول
                    </span>
                  </div>

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    {trans.isEnded ? (
                      <span className="text-[10px] font-black text-white bg-red-600/95 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-md border border-white/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> تم النقل (منجز)
                      </span>
                    ) : (
                      <span className="text-xs font-black text-white bg-green-700/95 backdrop-blur-xs px-3 py-1 rounded-full shadow-md border border-white/20 font-mono">
                        {trans.price} ريال
                      </span>
                    )}
                  </div>

                  {/* Photo tag at bottom */}
                  <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5">
                    {hasCustomImages ? (
                      <span className="text-[10px] font-bold text-white bg-black/70 backdrop-blur-xs px-2.5 py-0.5 rounded-md flex items-center gap-1 border border-white/20">
                        <Camera className="w-3 h-3 text-gold" /> {trans.images!.length} صور للمركبة
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-white/95 bg-black/60 backdrop-blur-xs px-2.5 py-0.5 rounded-md flex items-center gap-1 border border-white/10">
                        <Image className="w-3 h-3 text-gold" /> صورة توضيحية لنقل الخيل
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body content */}
                <div className="p-4 flex-1 space-y-3">
                  <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm leading-tight line-clamp-1 group-hover:text-navy transition">
                    {trans.vehicleType}
                  </h4>
                  
                  {/* Visual Route */}
                  <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-[11px] text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-gold shrink-0 ring-2 ring-gold/20"></span>
                      <span className="truncate"><strong>الاستلام:</strong> {trans.pickupAddress}</span>
                    </div>
                    <div className="w-0.5 h-2.5 border-r-2 border-dashed border-slate-300 mr-1.5"></div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-navy shrink-0 ring-2 ring-navy/20"></span>
                      <span className="truncate"><strong>التسليم:</strong> {trans.deliveryAddress}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>التاريخ: <strong>{trans.date}</strong></span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      <span>الخيول: <strong>{trans.horseCount} من {trans.capacity}</strong></span>
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span>بواسطة:</span>
                      <strong className="text-slate-800">{trans.userName}</strong>
                    </span>
                    <span className="font-bold text-navy flex items-center gap-0.5">
                      عرض التفاصيل والحجز ←
                    </span>
                  </div>

                  {/* Edit & Delete & Toggle Status Actions for owner/admin */}
                  {(currentUser?.role === 'admin' || currentUser?.id === trans.userId) && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/50 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleToggleEndedStatus(trans, e)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg flex items-center gap-1 transition cursor-pointer ${
                          trans.isEnded
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                        }`}
                        title={trans.isEnded ? 'إعادة تنشيط طلب النقل' : 'تمييز طلب النقل كـ منجز / منتهي'}
                      >
                        {trans.isEnded ? <RotateCcw className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                        <span>{trans.isEnded ? 'إعادة تنشيط' : 'تمييز كمنجز'}</span>
                      </button>
                      <button
                        onClick={() => handleEditClick(trans)}
                        className="px-2.5 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> تعديل
                      </button>
                      <button
                        onClick={() => handleDeleteClick(trans.id)}
                        className="px-2.5 py-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> حذف
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-slate-400 text-xs py-8 col-span-2">لم نجد أي طلبات نقل تطابق كلمة البحث.</p>
        )}
      </div>

      {/* Detailed transport view */}
      {selectedTransport && (
        <DetailModal
          item={selectedTransport}
          type="transport"
          isOpen={true}
          onClose={() => setSelectedTransport(null)}
          currentUser={currentUser}
          onRefresh={fetchTransports}
          onEdit={handleEditClick}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="تأكيد حذف طلب النقل"
        message="هل أنت متأكد من رغبتك في حذف طلب النقل هذا نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="نعم، احذف الطلب"
        cancelText="إلغاء"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <TermsAgreementModal
        isOpen={isTermsModalOpen}
        onConfirm={handleConfirmedPublishTransport}
        onCancel={() => setIsTermsModalOpen(false)}
        categoryName="إعلان طلب النقل"
        isSubmitting={isSubmittingAd}
      />

    </div>
  );
}

