/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { X, Star, Calendar, Shield, Phone, MessageSquare, Award, Trash2, Edit2, Share2 } from 'lucide-react';
import { Stable, Horse, Shelter, Transport, User, Review } from '../types';
import { FirebaseService } from '../lib/firebase';
import ConfirmModal from './ConfirmModal';

interface DetailModalProps {
  item: any; // Stable | Horse | Shelter | Transport
  type: 'stable' | 'horse' | 'shelter' | 'transport';
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onRefresh: () => void;
  onEdit?: (item: any) => void;
}

export default function DetailModal({ item, type, isOpen, onClose, currentUser, onRefresh, onEdit }: DetailModalProps) {
  const [activeImage, setActiveImage] = useState(item?.images?.[0] || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=800');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDeleteAdConfirmOpen, setIsDeleteAdConfirmOpen] = useState(false);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);

  if (!isOpen || !item) return null;

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
            <h3 className="font-bold text-navy text-base leading-tight">{item.name || item.title || 'تفاصيل الإعلان'}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Photos Panel */}
          {item.images && item.images.length > 0 && (
            <div className="space-y-2">
              <div className="w-full h-64 rounded-xl overflow-hidden bg-slate-100 relative">
                <img src={activeImage} referrerPolicy="no-referrer" alt="Detail" className="w-full h-full object-cover" />
                {item.verified === 'verified' && (
                  <span className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-bold shadow-md">
                    <Shield className="w-3.5 h-3.5" /> موثق
                  </span>
                )}
              </div>
              {item.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {item.images.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 ${activeImage === img ? 'border-gold' : 'border-slate-200'}`}
                    >
                      <img src={img} referrerPolicy="no-referrer" alt="Thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Controls: Deletion / Editing / Share */}
          <div className="flex flex-wrap gap-2 items-center justify-between border-b border-slate-100 pb-4">
            <div className="text-xs text-slate-400">
              بواسطة: <strong>{item.userName || 'معلن'}</strong> • {new Date(item.createdAt).toLocaleDateString('ar-SA')}
            </div>
            <div className="flex gap-2">
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
                {item.price && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block">السعر المطلوب</span>
                    <span className="text-xs font-bold text-navy-medium font-mono">
                      {item.price} ريال {item.adType === 'rent' ? `لكل ${item.rentType === 'hour' ? 'ساعة' : 'يوم'}` : ''}
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">السلالة / النوع</span>
                  <span className="text-xs font-bold text-slate-800">
                    {item.breed === 'arabian' ? 'عربي أصيل' : item.breed === 'shabi' ? 'شعبي' : item.breed === 'sisi' ? 'سيسي' : 'أجنبي'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">اسم الأب</span>
                  <span className="text-xs font-bold text-slate-800">{item.sireName || 'غير متوفر'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">اسم الأم</span>
                  <span className="text-xs font-bold text-slate-800">{item.damName || 'غير متوفر'}</span>
                </div>
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
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">الحالة الصحية</span>
                  <span className="text-xs font-bold text-slate-800">{item.healthStatus || 'سليم تماماً'}</span>
                </div>
                {item.stableName && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block">الإسطبل المرتبط</span>
                    <span className="text-xs font-bold text-navy-medium">{item.stableName}</span>
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

              {/* Pedigree Certificate Link */}
              {item.certificate && (
                <div className="space-y-2 border border-slate-100 p-4 rounded-xl bg-slate-50/40">
                  <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1">
                    <Award className="w-4 h-4 text-gold" /> شهادة النسب والتوثيق المرفقة
                  </h5>
                  <div className="w-full h-40 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                    <img
                      src={item.certificate}
                      referrerPolicy="no-referrer"
                      alt="Certificate"
                      className="w-full h-full object-contain cursor-zoom-in"
                      onClick={() => window.open(item.certificate, '_blank')}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {type === 'shelter' && (
            <div className="space-y-4">
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

          {/* Reviews Rating Panel for Stables & Shelter */}
          {(type === 'stable' || type === 'shelter') && (
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

         {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-5 rounded-xl text-xs cursor-pointer transition"
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

    </div>
  );
}
