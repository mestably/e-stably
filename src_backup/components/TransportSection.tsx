/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { Plus, Check, Calendar, MapPin, Truck, AlertCircle, DollarSign, ArrowLeftRight, HelpCircle, Navigation, Trash2, Edit2 } from 'lucide-react';
import { Transport, User } from '../types';
import { FirebaseService } from '../lib/firebase';
import DetailModal from './DetailModal';
import ConfirmModal from './ConfirmModal';

// Reference the generated beautiful clipart image
const TRANSPORT_BG = '/src/assets/images/horse_transport_bg_1784414679042.jpg';

interface TransportSectionProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  searchQuery: string;
}

export default function TransportSection({ currentUser, onOpenAuth, searchQuery }: TransportSectionProps) {
  const [transports, setTransports] = useState<Transport[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<Transport | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Form Fields
  const [vehicleType, setVehicleType] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [horseCount, setHorseCount] = useState(1);
  const [date, setDate] = useState('');
  const [price, setPrice] = useState(0);
  
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

  const fetchTransports = async () => {
    // 1. Load instantly from cache
    const cached = FirebaseService.getLocalTransports();
    if (cached.length > 0) setTransports(cached);

    // 2. Fetch fresh from background database
    try {
      const data = await FirebaseService.getTransports();
      setTransports(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTransports();
  }, []);

  const handleOpenAdd = () => {
    setEditingItemId(null);
    setVehicleType('');
    setCapacity(2);
    setHorseCount(1);
    setDate('');
    setPrice(0);
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

    if (!vehicleType || !date || !price || !pickupAddress || !deliveryAddress) {
      setError('يرجى ملء جميع حقول تفاصيل النقل ومواقع الاستلام والتسليم.');
      return;
    }

    const transportData: Transport = {
      id: editingItemId ? editingItemId : 'trp_' + Date.now(),
      userId: editingItemId ? (transports.find(t => t.id === editingItemId)?.userId || currentUser.id) : currentUser.id,
      userName: editingItemId ? (transports.find(t => t.id === editingItemId)?.userName || currentUser.name) : currentUser.name,
      vehicleType: vehicleType.trim(),
      capacity,
      horseCount,
      date,
      price,
      pickupAddress: pickupAddress.trim(),
      pickupCoords: { lat: pickupLat, lng: pickupLng },
      deliveryAddress: deliveryAddress.trim(),
      deliveryCoords: { lat: deliveryLat, lng: deliveryLng },
      createdAt: editingItemId ? (transports.find(t => t.id === editingItemId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    try {
      await FirebaseService.saveTransport(transportData);
      setSuccess(editingItemId ? 'تم تعديل عملية النقل بنجاح!' : 'تم إضافة عملية النقل المجدولة بنجاح!');
      
      // Clear fields
      setVehicleType('');
      setCapacity(2);
      setHorseCount(1);
      setDate('');
      setPrice(0);
      setPickupAddress('');
      setDeliveryAddress('');

      setTimeout(() => {
        setIsAddOpen(false);
        fetchTransports();
      }, 1500);
    } catch (err) {
      setError('حدث خطأ أثناء حفظ عملية النقل.');
    }
  };

  const filteredTransports = transports.filter((trans) => {
    const matchesSearch = 
      trans.vehicleType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trans.pickupAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trans.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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

      {/* Main Bar Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-navy text-sm">عروض وطلبات النقل</h3>
          <p className="text-[11px] text-slate-400">تصفح المواعيد المتاحة أو أضف رحلة نقل جديدة</p>
        </div>
        <button
          onClick={() => {
            if (!currentUser) onOpenAuth();
            else handleOpenAdd();
          }}
          className="bg-navy hover:bg-navy-dark text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition shadow"
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

              {/* Capacity & Horses & Date & Price */}
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
                      className="bg-white border border-slate-200 hover:border-gold px-2 py-0.5 rounded-md text-[9px] font-semibold text-slate-600"
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
                      className="bg-white border border-slate-200 hover:border-gold px-2 py-0.5 rounded-md text-[9px] font-semibold text-slate-600"
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
          filteredTransports.map((trans) => (
            <div
              key={trans.id}
              onClick={() => setSelectedTransport(trans)}
              className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer group"
            >
              {/* Card Header Info */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <span className="text-[9px] font-bold text-navy flex items-center gap-1 bg-white border border-navy/10 px-2 py-0.5 rounded-full">
                  <Truck className="w-3.5 h-3.5" /> نقل مجدول
                </span>
                <span className="text-xs font-bold text-green-700 font-mono">{trans.price} ريال</span>
              </div>

              {/* Card Body content */}
              <div className="p-4 flex-1 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs leading-tight line-clamp-1">{trans.vehicleType}</h4>
                
                {/* Visual Route */}
                <div className="space-y-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-[10px] text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-gold shrink-0"></span>
                    <span className="truncate"><strong>الاستلام:</strong> {trans.pickupAddress}</span>
                  </div>
                  <div className="w-0.5 h-3 border-r border-dashed border-slate-400 mr-1"></div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-navy shrink-0"></span>
                    <span className="truncate"><strong>التسليم:</strong> {trans.deliveryAddress}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1">
                  <span>التاريخ: <strong>{trans.date}</strong></span>
                  <span>عدد الخيول: <strong>{trans.horseCount} خيول</strong></span>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-center text-[9px] text-slate-400">
                  <span>المعلن: {trans.userName}</span>
                  <span className="font-bold text-navy">عرض التفاصيل ←</span>
                </div>

                {/* Edit & Delete Actions for owner/admin */}
                {(currentUser?.role === 'admin' || currentUser?.id === trans.userId) && (
                  <div className="flex gap-2 pt-2 border-t border-slate-100/50 justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEditClick(trans)}
                      className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                    >
                      <Edit2 className="w-3 h-3" /> تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteClick(trans.id)}
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

    </div>
  );
}
