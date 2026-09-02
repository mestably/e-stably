/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { X, Star, Calendar, Shield, Phone, MessageSquare, Award, Trash2, Edit2, Share2, Check, CheckCircle2, RotateCcw, Tag, AlertCircle, ZoomIn, Eye, Maximize2 } from 'lucide-react';
import { Stable, Horse, Shelter, Transport, User, Review } from '../types';
import { FirebaseService } from '../lib/firebase';
import ConfirmModal from './ConfirmModal';
import ImageLightboxModal from './ImageLightboxModal';
import { getRentDurationLabel } from './HorsesSection';

import defaultTransportImg from '../assets/images/horse_transport_default_1788309609008.jpg';

interface DetailModalProps {
  item: any; // Stable | Horse | Shelter | Transport
  type: 'stable' | 'horse' | 'shelter' | 'transport';
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onRefresh: () => void;
  onEdit?: (item: any) => void;
}

const DEFAULT_TRANSPORT_IMG = defaultTransportImg;

export default function DetailModal({ item, type, isOpen, onClose, currentUser, onRefresh, onEdit }: DetailModalProps) {
  const defaultFallback = type === 'transport'
    ? DEFAULT_TRANSPORT_IMG
    : 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=800';

  const hasItemImages = item?.images && Array.isArray(item.images) && item.images.length > 0;
  const initialImage = hasItemImages ? item.images[0] : defaultFallback;

  const [activeImage, setActiveImage] = useState(initialImage);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDeleteAdConfirmOpen, setIsDeleteAdConfirmOpen] = useState(false);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);

  // Lightbox viewer state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxSubtitle, setLightboxSubtitle] = useState('');

  if (!isOpen || !item) return null;

  const itemImages: string[] = hasItemImages ? item.images : [defaultFallback];

  const openGalleryAt = (index: number) => {
    setLightboxImages(itemImages);
    setLightboxIndex(Math.max(0, Math.min(index, itemImages.length - 1)));
    setLightboxTitle(item.name || item.title || item.vehicleType || 'صور الإعلان');
    setLightboxSubtitle(
      type === 'horse'
        ? `جواد: ${item.name} (${item.breed === 'arabian' ? 'عربي أصيل' : item.breed === 'shabi' ? 'شعبي' : 'خيل'})`
        : type === 'stable'
        ? `إسطبل: ${item.name}`
        : type === 'shelter'
        ? `خدمة إيواء: ${item.name || item.title}`
        : `خدمة نقل ومقطورات: ${item.vehicleType || 'مركبة مجهزة'}`
    );
    setIsLightboxOpen(true);
  };

  const openCertificateLightbox = () => {
    if (!item.certificate) return;
    setLightboxImages([item.certificate]);
    setLightboxIndex(0);
    setLightboxTitle(`شهادة النسب والتوثيق الرسمية - ${item.name}`);
    setLightboxSubtitle('تكبير وفحص تفاصيل النسب والأختام والبيانات الرسمية');
    setIsLightboxOpen(true);
  };

  const isAdmin = currentUser?.role === 'admin';
  const isOwner = currentUser?.id === item.userId;

  const handleDeleteAd = async () => {
    setIsDeleteAdConfirmOpen(true);
  };

  const handleConfirmDeleteAd = async () => {
    try {
      if (type === 'stable') await FirebaseService.deleteStable(item.id);
      else if (type === 'horse') await FirebaseService.deleteHorse(item.id);
      else if (type === 'shelter') await FirebaseService.deleteShelter(item.id);
      else if (type === 'transport') await FirebaseService.deleteTransport(item.id);
      
      setIsDeleteAdConfirmOpen(false);
      onRefresh();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleEndedStatus = async () => {
    try {
      if (type === 'horse') {
        const newStatus = !item.isSold;
        const updatedHorse: Horse = {
          ...item,
          isSold: newStatus,
          soldAt: newStatus ? new Date().toISOString() : undefined,
        };
        await FirebaseService.saveHorse(updatedHorse);
        item.isSold = newStatus;
        item.soldAt = updatedHorse.soldAt;
        setSuccess(newStatus ? 'تم تحديد الجواد كـ "تم البيع" بنجاح!' : 'تم إعادة تعيين الجواد كـ "متاح" بنجاح!');
      } else if (type === 'stable') {
        const newStatus = !item.isEnded;
        const updatedStable: Stable = {
          ...item,
          isEnded: newStatus,
          endedAt: newStatus ? new Date().toISOString() : undefined,
        };
        await FirebaseService.saveStable(updatedStable);
        item.isEnded = newStatus;
        item.endedAt = updatedStable.endedAt;
        setSuccess(newStatus ? 'تم تمييز الإسطبل كـ "مكتمل / غير متاح" بنجاح!' : 'تم إعادة فتح الإسطبل كـ "متاح ونشط" بنجاح!');
      } else if (type === 'shelter') {
        const newStatus = !item.isEnded;
        const updatedShelter: Shelter = {
          ...item,
          isEnded: newStatus,
          endedAt: newStatus ? new Date().toISOString() : undefined,
        };
        await FirebaseService.saveShelter(updatedShelter);
        item.isEnded = newStatus;
        item.endedAt = updatedShelter.endedAt;
        setSuccess(newStatus ? 'تم تمييز الإيواء كـ "محجوز بالكامل" بنجاح!' : 'تم إعادة إتاحة خدمة الإيواء بنجاح!');
      } else if (type === 'transport') {
        const newStatus = !item.isEnded;
        const updatedTransport: Transport = {
          ...item,
          isEnded: newStatus,
          endedAt: newStatus ? new Date().toISOString() : undefined,
        };
        await FirebaseService.saveTransport(updatedTransport);
        item.isEnded = newStatus;
        item.endedAt = updatedTransport.endedAt;
        setSuccess(newStatus ? 'تم تمييز رحلة النقل كـ "تم النقل / منتهية" بنجاح!' : 'تم إعادة فتح رحلة النقل كـ "متاحة للحجز" بنجاح!');
      }
      onRefresh();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      console.error('Failed to toggle ended status:', e);
      setError('حدث خطأ أثناء تعديل حالة الإعلان.');
    }
  };

  const handleAddReview = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentUser) {
      setError('يجب تسجيل الدخول لإضافة تقييم.');
      return;
    }

    if (!comment.trim()) {
      setError('يرجى كتابة تعليق.');
      return;
    }

    const newReview: Review = {
      id: 'rev_' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      rating,
      comment: comment.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      const currentReviews = item.reviews || [];
      const updatedReviews = [...currentReviews, newReview];
      
      // Calculate new average rating
      const totalRating = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = Math.round((totalRating / updatedReviews.length) * 10) / 10;

      const updatedItem = {
        ...item,
        reviews: updatedReviews,
        rating: avgRating
      };

      if (type === 'stable') {
        await FirebaseService.saveStable(updatedItem);
      } else if (type === 'shelter') {
        await FirebaseService.saveShelter(updatedItem);
      } else if (type === 'horse') {
        await FirebaseService.saveHorse(updatedItem);
      }

      setSuccess('تم إضافة تقييمك بنجاح!');
      setComment('');
      onRefresh();
      item.reviews = updatedReviews;
      item.rating = avgRating;
    } catch (err) {
      setError('حدث خطأ أثناء حفظ التقييم.');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    setDeleteReviewId(reviewId);
  };

  const handleConfirmDeleteReview = async () => {
    if (!deleteReviewId) return;
    try {
      const updatedReviews = (item.reviews || []).filter((r: Review) => r.id !== deleteReviewId);
      const totalRating = updatedReviews.length > 0 ? updatedReviews.reduce((sum: number, r: Review) => sum + r.rating, 0) : 5;
      const avgRating = updatedReviews.length > 0 ? Math.round((totalRating / updatedReviews.length) * 10) / 10 : 5;

      const updatedItem = {
        ...item,
        reviews: updatedReviews,
        rating: avgRating
      };

      if (type === 'stable') {
        await FirebaseService.saveStable(updatedItem);
      } else if (type === 'shelter') {
        await FirebaseService.saveShelter(updatedItem);
      } else if (type === 'horse') {
        await FirebaseService.saveHorse(updatedItem);
      }

      setDeleteReviewId(null);
      onRefresh();
      item.reviews = updatedReviews;
      item.rating = avgRating;
    } catch (e) {
      console.error(e);
    }
  };

  // Safe share handler
  const handleShare = () => {
    const text = `شاهد هذا الإعلان الرائع على ملتقى الخيول العربية: ${item.name || item.title}`;
    if (navigator.share) {
      navigator.share({ title: 'ملتقى الخيول العربية', text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(`${text} \n ${window.location.href}`);
      alert('تم نسخ رابط الإعلان بنجاح!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="bg-gold-light text-gold-dark text-xs px-2.5 py-1 rounded-full font-bold">
              {type === 'stable' ? 'إسطبل' : type === 'horse' ? 'جواد' : type === 'shelter' ? 'إيواء' : 'نقل خيل'}
            </span>
            <h3 className="font-bold text-navy text-base leading-tight">{item.name || item.title || item.vehicleType || 'تفاصيل الإعلان'}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Status Banner when marked as ended / sold / booked */}
          {((type === 'horse' && item.isSold) || (type !== 'horse' && item.isEnded)) && (
            <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-3.5 rounded-xl flex items-center justify-between shadow-md border border-red-500/30 animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5">
                <span className="bg-white/20 p-2 rounded-lg text-lg">🏷️</span>
                <div>
                  <span className="font-black text-xs sm:text-sm block">
                    {type === 'horse'
                      ? 'تم بيع هذا الجواد بنجاح (مُباع)'
                      : type === 'stable'
                      ? 'تم إغلاق استقبال الخيول مؤقتاً (مكتمل الاستيعاب)'
                      : type === 'shelter'
                      ? 'خدمة الإيواء محجوزة بالكامل حالياً'
                      : 'تمت هذه الرحلة بنجاح (رحلة مكتملة / تم النقل)'}
                  </span>
                  <span className="text-[10px] text-white/80">
                    {type === 'horse'
                      ? 'هذا الإعلان معلم كـ "تم البيع" وأصبح غير متاح للشراء حالياً'
                      : type === 'stable'
                      ? 'هذا الإسطبل معلم كـ "مكتمل الاستيعاب" وغير متاح لاستقبال خيول جديدة حالياً'
                      : type === 'shelter'
                      ? 'هذه الخدمة معلمة كـ "محجوزة بالكامل" وغير متاحة للحجز حالياً'
                      : 'طلب النقل هذا معلم كـ "تم النقل / مكتمل"'}
                  </span>
                </div>
              </div>
              <span className="bg-white text-red-700 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-xs shrink-0">
                {type === 'horse' ? 'تم البيع ✓' : type === 'stable' ? 'مكتمل ✓' : type === 'shelter' ? 'محجوز بالكامل ✓' : 'تم النقل ✓'}
              </span>
            </div>
          )}

          {/* Success / Error notification */}
          {success && (
            <div className="p-3 bg-green-50 border-r-4 border-green-500 text-green-700 text-xs rounded-l flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border-r-4 border-red-500 text-red-700 text-xs rounded-l flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Photos Panel */}
          {itemImages.length > 0 && (
            <div className="space-y-2">
              <div 
                className="w-full h-64 sm:h-72 rounded-xl overflow-hidden bg-slate-100 relative group cursor-zoom-in border border-slate-200"
                onClick={() => openGalleryAt(itemImages.indexOf(activeImage))}
                title="اضغط لتكبير الصورة وعرض كافة الصور بالكامل"
              >
                <img
                  src={activeImage}
                  referrerPolicy="no-referrer"
                  alt="Detail"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                
                {/* Dark Gradient on hover */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="bg-black/75 backdrop-blur-xs text-white text-xs font-bold px-3.5 py-2 rounded-full flex items-center gap-1.5 shadow-xl border border-white/30 transform group-hover:scale-105 transition">
                    <Maximize2 className="w-3.5 h-3.5 text-gold" /> اضغط للتكبير وعرض الصور بالكامل ({itemImages.length})
                  </span>
                </div>

                {item.verified === 'verified' && (
                  <span className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-bold shadow-md">
                    <Shield className="w-3.5 h-3.5" /> موثق
                  </span>
                )}
                {((type === 'horse' && item.isSold) || (type !== 'horse' && item.isEnded)) && (
                  <span className="absolute top-3 left-3 bg-red-600/95 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-black shadow-lg border border-white/20 backdrop-blur-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    {type === 'horse' ? 'تم البيع' : type === 'stable' ? 'مكتمل الاستيعاب' : type === 'shelter' ? 'محجوز بالكامل' : 'تم النقل'}
                  </span>
                )}

                {/* Floating Enlarge Hint at bottom right */}
                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium shadow-md border border-white/20">
                  <ZoomIn className="w-3.5 h-3.5 text-gold" />
                  <span>تكبير المعرض</span>
                  {itemImages.length > 1 && (
                    <span className="text-[10px] text-gold font-bold">({itemImages.length} صور)</span>
                  )}
                </div>
              </div>

              {/* Thumbnails row */}
              {itemImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 items-center">
                  {itemImages.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      onDoubleClick={() => openGalleryAt(idx)}
                      title={`صورة ${idx + 1} (اضغط مرتين للتكبير الفوري)`}
                      className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition cursor-pointer group ${
                        activeImage === img ? 'border-gold shadow-xs scale-102' : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img src={img} referrerPolicy="no-referrer" alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <ZoomIn className="w-3.5 h-3.5 text-white" />
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => openGalleryAt(itemImages.indexOf(activeImage))}
                    className="h-12 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                    title="فتح معرض الصور بالكامل"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-navy" />
                    <span>عرض الكل ({itemImages.length})</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Controls: Deletion / Editing / Sold Status / Share */}
          <div className="flex flex-wrap gap-2 items-center justify-between border-b border-slate-100 pb-4">
            <div className="text-xs text-slate-400">
              بواسطة: <strong>{item.userName || 'معلن'}</strong> • {new Date(item.createdAt).toLocaleDateString('ar-SA')}
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Owner / Admin toggle status button */}
              {(isAdmin || isOwner) && (
                <button
                  onClick={handleToggleEndedStatus}
                  className={`p-2 rounded-xl transition text-xs flex items-center gap-1.5 cursor-pointer font-bold border ${
                    (type === 'horse' ? item.isSold : item.isEnded)
                      ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                      : 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800'
                  }`}
                  title={
                    type === 'horse'
                      ? item.isSold ? 'إلغاء وضع تم البيع وإعادة عرضه كمتاح' : 'وضع علامة تم البيع على الإعلان'
                      : type === 'stable'
                      ? item.isEnded ? 'إعادة فتح الإسطبل واستقبال الخيول' : 'تمييز الإسطبل كـ مكتمل / غير متاح'
                      : type === 'shelter'
                      ? item.isEnded ? 'إعادة إتاحة خدمة الإيواء' : 'تمييز الخدمة كـ محجوزة بالكامل'
                      : item.isEnded ? 'إعادة فتح الرحلة للحجز' : 'تمييز الرحلة كـ تم النقل / منتهية'
                  }
                >
                  {(type === 'horse' ? item.isSold : item.isEnded) ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {type === 'horse' ? 'إعادة عرض (متاح)' : type === 'stable' ? 'إعادة فتح (متاح)' : type === 'shelter' ? 'إعادة إتاحة' : 'إعادة فتح الرحلة'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        {type === 'horse' ? 'وضع علامة "تم البيع"' : type === 'stable' ? 'تمييز كـ "مكتمل"' : type === 'shelter' ? 'تمييز كـ "محجوز بالكامل"' : 'تمييز كـ "تم النقل"'}
                      </span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleShare}
                className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> مشاركة
              </button>
              {(isAdmin || isOwner) && (
                <>
                  {onEdit && (
                    <button
                      onClick={() => {
                        onClose();
                        onEdit(item);
                      }}
                      className="p-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition text-xs flex items-center gap-1.5 cursor-pointer font-semibold"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> تعديل
                    </button>
                  )}
                  <button
                    onClick={handleDeleteAd}
                    className="p-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl transition text-xs flex items-center gap-1.5 cursor-pointer font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> حذف
                  </button>
                </>
              )}
            </div>
          </div>

          {type === 'horse' && item.adType === 'rent' && (
            <div className="p-3.5 bg-red-600 text-white rounded-xl flex items-center justify-between gap-3 shadow-md border border-red-700">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-white shrink-0" />
                <div className="text-xs font-bold leading-tight">
                  <span className="text-red-100">تنبيه تأجير الخيل: </span>
                  <span className="text-white underline decoration-white/60">يجب تأكيد الحجز قبل الموعد بيوم</span>
                </div>
              </div>
              <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold shrink-0">
                شرط الحجز ⚠️
              </span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-sm">الوصف التفصيلي</h4>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              {item.description || 'لا يوجد وصف إضافي.'}
            </p>
          </div>

          {/* Type-Specific Details */}
          {type === 'stable' && (
            <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100/80">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block">رقم التواصل</span>
                <span className="text-xs font-bold text-navy-medium">{item.phone}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block">عدد الخيول الحالية</span>
                <span className="text-xs font-bold text-slate-800">{item.horseCount} خيول</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block">حالة التوثيق</span>
                <span className={`text-xs font-bold ${item.verified === 'verified' ? 'text-green-600' : 'text-amber-600'}`}>
                  {item.verified === 'verified' ? 'موثق ومعتمد' : 'تحت المراجعة'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block">التقييم العام</span>
                <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-current" /> {item.rating || 5} / 5
                </div>
              </div>
            </div>
          )}

          {type === 'horse' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">نوع الإعلان</span>
                  <span className="text-xs font-bold text-gold-dark">
                    {item.adType === 'sale' ? 'خيل للبيع' : 'خيل للإيجار'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">
                    {item.adType === 'rent' ? 'سعر الإيجار' : 'السعر المطلوب'}
                  </span>
                  <span className="text-xs font-bold text-navy font-mono">
                    {item.adType === 'sale' ? (
                      item.price && item.price > 0 ? (
                        `${item.price.toLocaleString('ar-SA')} ريال`
                      ) : (
                        <span className="text-amber-800 font-sans font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block">
                          حسب الاتفاق بين الطرفين
                        </span>
                      )
                    ) : (
                      item.price && item.price > 0 ? (
                        `${item.price.toLocaleString('ar-SA')} ريال لكل ${getRentDurationLabel(item.rentType)}`
                      ) : (
                        <span className="text-slate-600 font-sans font-bold">عند التواصل</span>
                      )
                    )}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">السلالة / النوع</span>
                  <span className="text-xs font-bold text-slate-800">
                    {item.breed === 'arabian' ? 'عربي أصيل' : item.breed === 'shabi' ? 'شعبي' : 'سيسي'}
                  </span>
                </div>
                {item.adType === 'sale' && (
                  <>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block">اسم الأب</span>
                      <span className="text-xs font-bold text-slate-800">
                        {item.breed === 'arabian' ? (item.sireName || 'غير مسجل') : 'لا يوجد'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block">اسم الأم</span>
                      <span className="text-xs font-bold text-slate-800">
                        {item.breed === 'arabian' ? (item.damName || 'غير مسجل') : 'لا يوجد'}
                      </span>
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">العمر</span>
                  <span className="text-xs font-bold text-slate-800">{item.age} سنوات</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">الجنس</span>
                  <span className="text-xs font-bold text-slate-800">
                    {item.gender === 'stallion' ? 'ذكر (حصان)' : item.gender === 'mare' ? 'أنثى (فرس)' : 'مخصى'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">اللون</span>
                  <span className="text-xs font-bold text-slate-800">{item.color || 'غير محدد'}</span>
                </div>
                {item.adType === 'sale' && item.height && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block">الطول / الارتفاع</span>
                    <span className="text-xs font-bold text-slate-800">{item.height}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">
                    {item.adType === 'rent' ? 'الحالة والجاهزية' : 'الحالة الصحية والسلامة'}
                  </span>
                  <span className={`text-xs font-bold ${
                    item.healthStatus?.includes('سليم') 
                      ? 'text-emerald-700' 
                      : item.adType === 'rent'
                        ? 'text-blue-700'
                        : 'text-amber-700'
                  }`}>
                    {item.healthStatus || (item.adType === 'rent' ? 'سليم وصحة ممتازة' : 'سليم خالي من العيوب')}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">التقييم العام</span>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-current" /> {item.rating || 5} / 5
                  </div>
                </div>
                {item.stableName && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block">الإسطبل المرتبط</span>
                    <span className="text-xs font-bold text-navy-medium">{item.stableName}</span>
                  </div>
                )}
                {item.phone && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block">رقم التواصل المباشر</span>
                    <span className="text-xs font-bold text-navy font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-navy" /> {item.phone}
                    </span>
                  </div>
                )}
                {item.adType === 'rent' && item.rentStart && (
                  <div className="space-y-1 col-span-2">
                    <span className="text-[10px] text-slate-400 block">فترة الحجز المتاحة</span>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-navy" /> من {item.rentStart} إلى {item.rentEnd}
                    </span>
                  </div>
                )}
              </div>

              {/* Pedigree Certificate Link (Only for Sale) */}
              {item.adType === 'sale' && item.certificate && (
                <div className="space-y-2 border border-slate-200 p-4 rounded-xl bg-amber-50/20">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-gold" />
                      <span>شهادة النسب والتوثيق المرفقة</span>
                    </h5>
                    <button
                      onClick={openCertificateLightbox}
                      className="text-[11px] font-bold text-navy hover:text-gold flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs transition cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>تكبير وفحص الشهادة</span>
                    </button>
                  </div>
                  <div 
                    className="w-full h-44 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative group cursor-zoom-in flex items-center justify-center bg-white"
                    onClick={openCertificateLightbox}
                    title="اضغط لتكبير وفحص شهادة النسب والتوثيق"
                  >
                    <img
                      src={item.certificate}
                      referrerPolicy="no-referrer"
                      alt="Certificate"
                      className="w-full h-full object-contain group-hover:scale-102 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-black/80 backdrop-blur-xs text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg border border-white/20">
                        <ZoomIn className="w-3.5 h-3.5 text-gold" /> اضغط لتكبير الشهادة والأختام
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {type === 'shelter' && (
            <div className="space-y-4">
              {item.stableName && (
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏛️</span>
                    <div>
                      <span className="text-[10px] text-amber-800 font-bold block">تابع لإسطبل مسجل بالمنصة:</span>
                      <span className="text-xs font-black text-navy">{item.stableName}</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-gold-light text-gold-dark font-bold px-2 py-0.5 rounded-full border border-gold/30">
                    موثق ومعتمد ✓
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">نوع الإيواء</span>
                  <span className="text-xs font-bold text-navy-medium">
                    {item.type === 'monthly' ? 'شهري' : 'يومي'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">رقم التواصل</span>
                  <span className="text-xs font-bold text-slate-800">{item.phone}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-800 text-xs">الخدمات المشمولة:</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${item.nutrition ? 'border-green-200 bg-green-50/50 text-green-800' : 'border-slate-200 bg-slate-50 text-slate-400 line-through'}`}>
                    <span className="font-bold">●</span> تغذية كاملة ومخصصة
                  </div>
                  <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${item.cleaning ? 'border-green-200 bg-green-50/50 text-green-800' : 'border-slate-200 bg-slate-50 text-slate-400 line-through'}`}>
                    <span className="font-bold">●</span> تنظيف يومي للبوكسات
                  </div>
                  <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${item.training ? 'border-green-200 bg-green-50/50 text-green-800' : 'border-slate-200 bg-slate-50 text-slate-400 line-through'}`}>
                    <span className="font-bold">●</span> برامج تدريب وتمشية
                  </div>
                  <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${item.veterinary ? 'border-green-200 bg-green-50/50 text-green-800' : 'border-slate-200 bg-slate-50 text-slate-400 line-through'}`}>
                    <span className="font-bold">●</span> فحص بيطري ورعاية صحية
                  </div>
                </div>
              </div>
            </div>
          )}

          {type === 'transport' && (
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block">نوع المركبة</span>
                <span className="text-xs font-bold text-slate-800">{item.vehicleType}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block">تاريخ النقل المجدول</span>
                <span className="text-xs font-bold text-navy-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-navy" /> {item.date}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block">السعر المطلوب</span>
                <span className="text-xs font-bold text-green-700 font-mono">{item.price} ريال</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block">السعة الكلية</span>
                <span className="text-xs font-bold text-slate-800">{item.capacity} خيل</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block">عدد الخيول المراد نقلها</span>
                <span className="text-xs font-bold text-slate-800">{item.horseCount} خيول</span>
              </div>
              <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3">
                <span className="text-[10px] text-slate-400 block">عنوان الاستلام</span>
                <span className="text-xs text-slate-800">{item.pickupAddress}</span>
              </div>
              <div className="space-y-1 col-span-2 border-t border-slate-100 pt-1">
                <span className="text-[10px] text-slate-400 block">عنوان التسليم</span>
                <span className="text-xs text-slate-800">{item.deliveryAddress}</span>
              </div>
            </div>
          )}

          {/* Contact Actions Drawer/Panel */}
          <div className="bg-navy-light border border-navy/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="text-right">
              <span className="text-xs font-bold text-navy">تواصل مباشر وسريع</span>
              <p className="text-[10px] text-slate-500 leading-none">تواصل مع المعلن فوراً للاستفسار أو حجز المواعيد</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <a
                href={`tel:${item.phone || '0559595055'}`}
                className="flex-1 sm:flex-initial text-center bg-navy hover:bg-navy-dark text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <Phone className="w-3.5 h-3.5" /> اتصال هاتفي
              </a>
              <a
                href={`https://wa.me/${(item.phone || '0559595055').replace(/^0/, '966')}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-initial text-center bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" /> واتساب مباشر
              </a>
            </div>
          </div>

          {/* Reviews Rating Panel for Stables, Shelter & Horses */}
          {(type === 'stable' || type === 'shelter' || type === 'horse') && (
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-800 text-sm">تقييمات وآراء المستخدمين</h4>
                <div className="text-xs font-semibold text-slate-500">{(item.reviews || []).length} تعليقات</div>
              </div>

              {/* Add Review form */}
              {currentUser ? (
                <form onSubmit={handleAddReview} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">تقييمك بالنجوم:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-0.5 text-amber-400 hover:scale-110 transition cursor-pointer"
                        >
                          <Star className={`w-5 h-5 ${rating >= star ? 'fill-current' : 'text-slate-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="أضف تعليقك وتجربتك الشخصية مع هذا المعلن..."
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-navy bg-white"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    {error && <span className="text-[10px] text-red-600 font-semibold">{error}</span>}
                    {success && <span className="text-[10px] text-green-600 font-semibold">{success}</span>}
                    <button
                      type="submit"
                      className="bg-navy hover:bg-navy-dark text-white font-bold py-1.5 px-4 rounded-lg text-xs cursor-pointer mr-auto transition"
                    >
                      إرسال تقييمك
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200/50">
                  يرجى تسجيل الدخول لتتمكن من تقييم هذا الإعلان وترك تعليقك.
                </div>
              )}

              {/* Reviews List */}
              <div className="space-y-3">
                {item.reviews && item.reviews.length > 0 ? (
                  item.reviews.map((rev: Review) => (
                    <div key={rev.id} className="p-3 border border-slate-100 rounded-xl space-y-1 relative group">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800">{rev.userName}</span>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>{new Date(rev.createdAt).toLocaleDateString('ar-SA')}</span>
                        {(isAdmin || currentUser?.id === rev.userId) && (
                          <button
                            onClick={() => handleDeleteReview(rev.id)}
                            className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> حذف
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-slate-400 py-4">لا توجد تقييمات حالياً، كن أول من يقيم!</p>
                )}
              </div>

            </div>
          )}

        </div>

         {/* Modal Footer with Actions for Owner / Admin and Share */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Share button */}
            <button
              onClick={handleShare}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
              title="مشاركة رابط الإعلان"
            >
              <Share2 className="w-3.5 h-3.5 text-navy" />
              <span>مشاركة</span>
            </button>

            {/* Owner & Admin Action Controls */}
            {(isAdmin || isOwner) && (
              <>
                {/* Toggle Sold / Ended Status */}
                <button
                  onClick={handleToggleEndedStatus}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs ${
                    ((type === 'horse' && item.isSold) || (type !== 'horse' && item.isEnded))
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                  }`}
                  title={
                    ((type === 'horse' && item.isSold) || (type !== 'horse' && item.isEnded))
                      ? 'إعادة التنشيط والإتاحة'
                      : 'تمييز الإعلان كـ منتهي / مكتمل / مباع'
                  }
                >
                  {((type === 'horse' && item.isSold) || (type !== 'horse' && item.isEnded)) ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>إعادة تنشيط</span>
                    </>
                  ) : (
                    <>
                      <Tag className="w-3.5 h-3.5" />
                      <span>
                        {type === 'horse'
                          ? 'تمييز كمباع'
                          : type === 'transport'
                          ? 'تمييز كمنجز'
                          : type === 'shelter'
                          ? 'تمييز كمحجوز'
                          : 'تمييز كمكتمل'}
                      </span>
                    </>
                  )}
                </button>

                {/* Edit Ad Button */}
                {onEdit && (
                  <button
                    onClick={() => {
                      onClose();
                      onEdit(item);
                    }}
                    className="bg-navy hover:bg-navy-dark text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition shadow-2xs"
                    title="تعديل بيانات الإعلان"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>
                )}

                {/* Delete Ad Button */}
                <button
                  onClick={handleDeleteAd}
                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  title="حذف الإعلان نهائياً"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-5 rounded-xl text-xs cursor-pointer transition mr-auto"
          >
            إغلاق
          </button>
        </div>

      </div>

      <ConfirmModal
        isOpen={isDeleteAdConfirmOpen}
        title="تأكيد حذف الإعلان"
        message="هل أنت متأكد من رغبتك في حذف هذا الإعلان نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="نعم، احذف الإعلان"
        cancelText="إلغاء"
        onConfirm={handleConfirmDeleteAd}
        onCancel={() => setIsDeleteAdConfirmOpen(false)}
      />

      <ConfirmModal
        isOpen={deleteReviewId !== null}
        title="تأكيد حذف التعليق"
        message="هل أنت متأكد من رغبتك في حذف هذا التقييم/التعليق؟"
        confirmText="نعم، احذف"
        cancelText="إلغاء"
        onConfirm={handleConfirmDeleteReview}
        onCancel={() => setDeleteReviewId(null)}
      />

      <ImageLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={lightboxImages}
        initialIndex={lightboxIndex}
        title={lightboxTitle}
        subtitle={lightboxSubtitle}
      />

    </div>
  );
}
