/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, ChangeEvent, FormEvent } from 'react';
import {
  User as UserIcon,
  Calendar,
  Clock,
  Tag,
  Trash2,
  Edit2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Plus,
  Search,
  Filter,
  Sparkles,
  Crown,
  Shield,
  Key,
  Copy,
  ExternalLink,
  MessageCircle,
  Phone,
  RefreshCw,
  Check,
  X,
  Award,
  Home,
  Truck,
  ShieldCheck,
  MapPin,
  Camera,
  Layers,
  Archive,
  Info,
  Landmark,
  CreditCard
} from 'lucide-react';
import { User, Horse, Stable, Shelter, Transport, SubscriptionCode, ArchivedDeletedAd } from '../types';
import { FirebaseService, DAILY_FREE_ADS_LIMIT } from '../lib/firebase';
import { SubscriptionService, FREE_USER_ADS_LIMIT } from '../lib/subscriptionService';
import { getVipRemainingTime } from '../lib/countdownHelper';
import { compressImage } from '../lib/imageUtils';
import DetailModal from './DetailModal';
import ConfirmModal from './ConfirmModal';
import RequestSubscriptionCodeModal from './RequestSubscriptionCodeModal';
import AdVerifiedBadge from './AdVerifiedBadge';
import AdPermissionNotice from './AdPermissionNotice';
import AdActionPermissionModal from './AdActionPermissionModal';
import UserBankAccountsSection from './UserBankAccountsSection';
import EditTermsAgreementModal from './EditTermsAgreementModal';
import { hasEditPermission, isAdVerified, generateWhatsAppEditRequestUrl, generateWhatsAppVerificationRequestUrl } from '../lib/adPermissions';
import { useAdminContact } from '../lib/useAdminContact';
import { formatHorseAge } from '../lib/horseUtils';

interface UserDashboardSectionProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenSubscriptions: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export type AdCategory = 'horse' | 'stable' | 'shelter' | 'transport';

export interface UnifiedUserAd {
  id: string;
  category: AdCategory;
  title: string;
  subtitle?: string;
  images: string[];
  thumbnail: string;
  createdAt: string;
  price?: number;
  phone?: string;
  status: 'active' | 'ended' | 'sold';
  endedAt?: string;
  isPendingEditApproval?: boolean;
  pendingEditAt?: string;
  rawItem: any;
}

export default function UserDashboardSection({
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onOpenSubscriptions,
  onNavigateToTab
}: UserDashboardSectionProps) {
  // Main Tabs: 'ads' | 'bank_accounts' | 'verification' | 'codes' | 'subscription'
  const [activeMainTab, setActiveMainTab] = useState<'ads' | 'bank_accounts' | 'verification' | 'codes' | 'subscription'>('ads');

  // Ads Filter: 'all' | 'active' | 'ended' | 'deleted'
  const [adsFilterStatus, setAdsFilterStatus] = useState<'all' | 'active' | 'ended' | 'deleted'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | AdCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [activeAds, setActiveAds] = useState<UnifiedUserAd[]>([]);
  const [deletedAds, setDeletedAds] = useState<ArchivedDeletedAd[]>([]);
  const [userCodes, setUserCodes] = useState<SubscriptionCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [previewAd, setPreviewAd] = useState<{ item: any; category: AdCategory } | null>(null);
  const [deleteConfirmAd, setDeleteConfirmAd] = useState<{ id: string; category: AdCategory; title: string } | null>(null);
  const [restoreConfirmAd, setRestoreConfirmAd] = useState<ArchivedDeletedAd | null>(null);
  const [permanentDeleteAd, setPermanentDeleteAd] = useState<ArchivedDeletedAd | null>(null);
  const [isRequestCodeOpen, setIsRequestCodeOpen] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // 12-Hour Permission Request Modal state
  const { adminWhatsApp } = useAdminContact();
  const [permissionModalAd, setPermissionModalAd] = useState<{ ad: UnifiedUserAd; action: 'edit' | 'sold' | 'delete' } | null>(null);

  // Notification Toast
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Editing Ad State
  const [editingAd, setEditingAd] = useState<{ item: any; category: AdCategory } | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editTermsModalData, setEditTermsModalData] = useState<{ updatedItem: any; category: AdCategory; title: string; adId: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Load user data
  const loadUserData = async () => {
    if (!currentUser?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const [allAdsRes, deletedList, codesList] = await Promise.all([
        FirebaseService.getUserAllAds(currentUser.id),
        FirebaseService.getUserDeletedAds(currentUser.id),
        SubscriptionService.getUserCodes(currentUser.id, currentUser.email, currentUser.phone)
      ]);

      // Normalize into UnifiedUserAd
      const unifiedList: UnifiedUserAd[] = [];

      // 1. Horses
      allAdsRes.horses.forEach((h) => {
        unifiedList.push({
          id: h.id,
          category: 'horse',
          title: h.name || 'خيل معروض',
          subtitle: `${h.breed === 'arabian' ? 'عربي أصيل' : h.breed === 'shabi' ? 'شعبي' : 'سيسي'} • ${h.adType === 'sale' ? 'للبيع' : 'للإيجار'}`,
          images: h.images || [],
          thumbnail: h.images && h.images.length > 0 ? h.images[0] : 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=400',
          createdAt: h.createdAt,
          price: h.price,
          phone: h.phone,
          status: h.isSold ? 'sold' : 'active',
          endedAt: h.soldAt,
          isPendingEditApproval: !!h.isPendingEditApproval,
          pendingEditAt: h.pendingEditAt,
          rawItem: h
        });
      });

      // 2. Stables
      allAdsRes.stables.forEach((s) => {
        unifiedList.push({
          id: s.id,
          category: 'stable',
          title: s.name || 'إسطبل خيول',
          subtitle: `طاقة استيعابية: ${s.horseCount || 0} خيل`,
          images: s.images || [],
          thumbnail: s.images && s.images.length > 0 ? s.images[0] : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=400',
          createdAt: s.createdAt,
          phone: s.phone,
          status: s.isEnded ? 'ended' : 'active',
          endedAt: s.endedAt,
          isPendingEditApproval: !!s.isPendingEditApproval,
          pendingEditAt: s.pendingEditAt,
          rawItem: s
        });
      });

      // 3. Shelters
      allAdsRes.shelters.forEach((sh) => {
        unifiedList.push({
          id: sh.id,
          category: 'shelter',
          title: sh.title || 'خدمة إيواء خيل',
          subtitle: `نظام: ${sh.type === 'monthly' ? 'شهري' : 'يومي'}${sh.stableName ? ` • إسطبل: ${sh.stableName}` : ''}`,
          images: sh.images || [],
          thumbnail: sh.images && sh.images.length > 0 ? sh.images[0] : 'https://images.unsplash.com/photo-1598974357801-cbca100e6571?auto=format&fit=crop&q=80&w=400',
          createdAt: sh.createdAt,
          phone: sh.phone,
          status: sh.isEnded ? 'ended' : 'active',
          endedAt: sh.endedAt,
          isPendingEditApproval: !!sh.isPendingEditApproval,
          pendingEditAt: sh.pendingEditAt,
          rawItem: sh
        });
      });

      // 4. Transports
      allAdsRes.transports.forEach((t) => {
        unifiedList.push({
          id: t.id,
          category: 'transport',
          title: t.vehicleType || 'خدمة نقل خيل',
          subtitle: `من: ${t.pickupAddress || 'الموقع'} إلى: ${t.deliveryAddress || 'الوجهة'}`,
          images: t.images || [],
          thumbnail: t.images && t.images.length > 0 ? t.images[0] : 'https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?auto=format&fit=crop&q=80&w=400',
          createdAt: t.createdAt,
          price: t.price,
          phone: t.phone,
          status: t.isEnded ? 'ended' : 'active',
          endedAt: t.endedAt,
          isPendingEditApproval: !!t.isPendingEditApproval,
          pendingEditAt: t.pendingEditAt,
          rawItem: t
        });
      });

      // Sort newest first
      unifiedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setActiveAds(unifiedList);
      setDeletedAds(deletedList);
      setUserCodes(codesList);
    } catch (err) {
      console.warn('Failed to load user dashboard data', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [currentUser?.id]);

  // Handle Refresh button
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadUserData();
  };

  // Helper date formatter: e.g. "12 أكتوبر 2026 - الساعة 05:30 م"
  const formatArabicDateTime = (dateStr?: string) => {
    if (!dateStr) return 'غير محدد';
    try {
      const d = new Date(dateStr);
      const datePart = d.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const timePart = d.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return `${datePart} • ${timePart}`;
    } catch {
      return dateStr;
    }
  };

  // Relative time helper: e.g. "منذ يومين"
  const getRelativeTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) return 'الآن';
      if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      if (diffDays === 1) return 'أمس';
      if (diffDays === 2) return 'منذ يومين';
      if (diffDays <= 10) return `منذ ${diffDays} أيام`;
      if (diffDays < 30) return `منذ ${diffDays} يوماً`;
      const diffMonths = Math.floor(diffDays / 30);
      return `منذ ${diffMonths} شهر`;
    } catch {
      return '';
    }
  };

  // Toggle Sold / Ended status
  const handleToggleStatus = async (ad: UnifiedUserAd) => {
    try {
      if (ad.category === 'horse') {
        const newStatus = ad.status !== 'sold';
        const updated: Horse = {
          ...ad.rawItem,
          isSold: newStatus,
          soldAt: newStatus ? new Date().toISOString() : undefined
        };
        await FirebaseService.saveHorse(updated);
        showNotification(newStatus ? `تم تمييز "${ad.title}" كـ "تم البيع" 🏷️` : `تم إعادة عرض "${ad.title}" كـ "متاح" ✅`);
      } else if (ad.category === 'stable') {
        const newStatus = ad.status !== 'ended';
        const updated: Stable = {
          ...ad.rawItem,
          isEnded: newStatus,
          endedAt: newStatus ? new Date().toISOString() : undefined
        };
        await FirebaseService.saveStable(updated);
        showNotification(newStatus ? `تم تمييز الإسطبل كـ "مكتمل الاستيعاب" ⚠️` : `تم إعادة فتح الإسطبل كـ "متاح" ✅`);
      } else if (ad.category === 'shelter') {
        const newStatus = ad.status !== 'ended';
        const updated: Shelter = {
          ...ad.rawItem,
          isEnded: newStatus,
          endedAt: newStatus ? new Date().toISOString() : undefined
        };
        await FirebaseService.saveShelter(updated);
        showNotification(newStatus ? `تم تمييز خدمة الإيواء كـ "محجوزة بالكامل" 🏨` : `تم إعادة إتاحة خدمة الإيواء ✅`);
      } else if (ad.category === 'transport') {
        const newStatus = ad.status !== 'ended';
        const updated: Transport = {
          ...ad.rawItem,
          isEnded: newStatus,
          endedAt: newStatus ? new Date().toISOString() : undefined
        };
        await FirebaseService.saveTransport(updated);
        showNotification(newStatus ? `تم تمييز الرحلة كـ "مكتملة / تم النقل" 🚚` : `تم إعادة فتح الرحلة للحجز ✅`);
      }
      loadUserData();
    } catch (e) {
      showNotification('حدث خطأ أثناء تعديل الحالة.', 'error');
    }
  };

  // Delete Ad
  const handleDeleteClick = (ad: UnifiedUserAd) => {
    setDeleteConfirmAd({ id: ad.id, category: ad.category, title: ad.title });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmAd) return;
    try {
      const { id, category, title } = deleteConfirmAd;
      if (category === 'horse') {
        await FirebaseService.deleteHorse(id);
      } else if (category === 'stable') {
        await FirebaseService.deleteStable(id);
      } else if (category === 'shelter') {
        await FirebaseService.deleteShelter(id);
      } else if (category === 'transport') {
        await FirebaseService.deleteTransport(id);
      }
      setDeleteConfirmAd(null);
      showNotification(`تم حذف إعلان "${title}" ونقله إلى سجل الإعلانات المحذوفة.`);
      loadUserData();
    } catch (e) {
      showNotification('فشل حذف الإعلان.', 'error');
    }
  };

  // Restore deleted ad
  const handleRestoreAd = async (archivedAd: ArchivedDeletedAd) => {
    try {
      const success = await FirebaseService.restoreDeletedAd(archivedAd);
      if (success) {
        setRestoreConfirmAd(null);
        showNotification(`تمت استعادة إعلان "${archivedAd.title}" بنجاح وأصبح نشطاً في المنصة! 🎉`);
        loadUserData();
      } else {
        showNotification('فشلت استعادة الإعلان.', 'error');
      }
    } catch (e) {
      showNotification('حدث خطأ أثناء الاستعادة.', 'error');
    }
  };

  // Permanently delete from archive
  const handlePermanentDelete = async (archivedId: string) => {
    try {
      await FirebaseService.permanentlyDeleteArchivedAd(archivedId);
      setPermanentDeleteAd(null);
      showNotification('تم حذف الإعلان نهائياً من سجل المحذوفات.');
      loadUserData();
    } catch (e) {
      showNotification('فشل الحذف النهائي.', 'error');
    }
  };

  // Start Editing Ad - User is allowed to edit directly without upfront permission blocking!
  const handleStartEdit = (ad: UnifiedUserAd) => {
    setEditingAd({ item: ad.rawItem, category: ad.category });
    setEditFormData({ ...ad.rawItem });
  };

  // Image management in edit modal
  const handleEditImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          try {
            const compressed = await compressImage(reader.result, 800, 800, 0.7);
            setEditFormData((prev: any) => ({
              ...prev,
              images: [...(prev.images || []), compressed]
            }));
          } catch (err) {
            console.error('Failed to compress image:', err);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveEditImage = (indexToRemove: number) => {
    setEditFormData((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Handle Edit form submission
  const handleSaveEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingAd) return;

    const { category } = editingAd;
    const updatedItem = {
      ...editFormData,
      updatedAt: new Date().toISOString()
    };
    const title = updatedItem.name || updatedItem.title || updatedItem.vehicleType || 'إعلان';

    if (currentUser?.role === 'admin') {
      // Admin saves and publishes directly
      setIsSavingEdit(true);
      try {
        if (category === 'horse') {
          await FirebaseService.saveHorse(updatedItem);
        } else if (category === 'stable') {
          await FirebaseService.saveStable(updatedItem);
        } else if (category === 'shelter') {
          await FirebaseService.saveShelter(updatedItem);
        } else if (category === 'transport') {
          await FirebaseService.saveTransport(updatedItem);
        }

        setEditingAd(null);
        showNotification('تم حفظ وتحديث تفاصيل الإعلان بنجاح!');
        loadUserData();
      } catch (err) {
        showNotification('حدث خطأ أثناء حفظ التعديلات.', 'error');
      } finally {
        setIsSavingEdit(false);
      }
    } else {
      // Regular user: Show terms agreement modal before sending to admin for approval via WhatsApp
      setEditTermsModalData({
        updatedItem,
        category,
        title,
        adId: updatedItem.id || 'ad_' + Date.now()
      });
    }
  };

  // Confirm edit after user agrees to terms and sends WhatsApp message to admin
  const handleConfirmEditWithTerms = async () => {
    if (!editTermsModalData) return;
    const { updatedItem, category } = editTermsModalData;
    const rawOriginal = editingAd?.item || {};

    // Keep the live ad data intact so nothing changes publicly until admin approves!
    const itemWithPendingApproval = {
      ...rawOriginal,
      id: updatedItem.id || rawOriginal.id,
      isPendingEditApproval: true,
      pendingEditAt: new Date().toISOString(),
      pendingEditData: updatedItem // Saved as draft until admin approves
    };

    setIsSavingEdit(true);
    try {
      if (category === 'horse') {
        await FirebaseService.saveHorse(itemWithPendingApproval);
      } else if (category === 'stable') {
        await FirebaseService.saveStable(itemWithPendingApproval);
      } else if (category === 'shelter') {
        await FirebaseService.saveShelter(itemWithPendingApproval);
      } else if (category === 'transport') {
        await FirebaseService.saveTransport(itemWithPendingApproval);
      }

      setEditingAd(null);
      setEditTermsModalData(null);
      showNotification('تم حفظ التعديلات وإرسال طلب الموافقة للمدير عبر الواتساب بنجاح! الإعلان الآن بانتظار الموافقة.');
      loadUserData();
    } catch (err) {
      showNotification('حدث خطأ أثناء حفظ التعديلات.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Copy code string
  const handleCopyCode = async (code: string, id: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      }
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2500);
      showNotification(`تم نسخ الكود ${code} بنجاح!`);
    } catch {}
  };

  // Filtered ads
  const filteredAds = useMemo(() => {
    return activeAds.filter((ad) => {
      // Status filter
      if (adsFilterStatus === 'active' && ad.status !== 'active') return false;
      if (adsFilterStatus === 'ended' && ad.status === 'active') return false;

      // Category filter
      if (selectedCategory !== 'all' && ad.category !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = ad.title.toLowerCase().includes(q);
        const matchesSubtitle = ad.subtitle?.toLowerCase().includes(q);
        const matchesPhone = ad.phone?.includes(q);
        if (!matchesTitle && !matchesSubtitle && !matchesPhone) return false;
      }

      return true;
    });
  }, [activeAds, adsFilterStatus, selectedCategory, searchQuery]);

  // Filtered deleted ads
  const filteredDeletedAds = useMemo(() => {
    return deletedAds.filter((ad) => {
      if (selectedCategory !== 'all' && ad.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!ad.title.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [deletedAds, selectedCategory, searchQuery]);

  // VIP Countdown info
  const vipCountdown = currentUser?.isGold
    ? getVipRemainingTime(currentUser.subscriptionExpiresAt, currentUser.updatedAt || currentUser.createdAt)
    : null;

  // Counts
  const totalUserAdsCount = activeAds.length;
  const activeAdsCount = activeAds.filter((a) => a.status === 'active').length;
  const endedAdsCount = activeAds.filter((a) => a.status !== 'active').length;
  const deletedAdsCount = deletedAds.length;
  const totalCodesCount = userCodes.length;
  const unverifiedAdsCount = activeAds.filter((a) => !isAdVerified(a.rawItem)).length;
  const verifiedAdsCount = activeAds.filter((a) => isAdVerified(a.rawItem)).length;

  // Unauthenticated screen
  if (!currentUser) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-navy/10 border-2 border-navy/20 flex items-center justify-center text-navy shadow-inner">
          <UserIcon className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-navy">صفحة المستخدم وإدارة الإعلانات</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            يرجى تسجيل الدخول أو إنشاء حساب جديد لتتمكن من استعراض إعلاناتك، متابعة تواريخ نشرها وتعديلها أو حذفها، ومتابعة اشتراكاتك وأكواد النشر.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onOpenAuth}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-navy hover:bg-navy-dark text-white font-extrabold text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserIcon className="w-4 h-4" />
            <span>تسجيل الدخول / إنشاء حساب</span>
          </button>
          <button
            onClick={onOpenSubscriptions}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Crown className="w-4 h-4 text-amber-600" />
            <span>الاطلاع على باقات الاشتراك</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300" dir="rtl">
      
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border transition animate-in fade-in slide-in-from-top-4 ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-red-600 text-white border-red-500'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Banner / User Profile Card with Warm Beige & Brown Palette */}
      <div className="bg-white rounded-3xl border border-[#E5D7C7] shadow-xs overflow-hidden">
        {/* Warm Beige & Brown Eye-Friendly Header Banner */}
        <div className="relative bg-gradient-to-r from-[#FAF6F0] via-[#F4ECE1] to-[#EFE5D7] p-5 sm:p-6 text-[#382618] overflow-hidden border-b border-[#E2D4C3]">
          {/* Subtle Ambient Warm Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#6B4E3D]/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            {/* User Avatar + Details with crystal-clear readability & eye-comfort */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden ring-4 ring-[#D8C7B5] bg-[#EFE6DC] shadow-md flex items-center justify-center text-[#4A3525] font-black text-2xl">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name.charAt(0)
                  )}
                </div>
                {currentUser.isGold && (
                  <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 rounded-full p-1.5 shadow-md border-2 border-white" title="عضوية ذهبية VIP 👑">
                    <Crown className="w-4 h-4 text-slate-950" />
                  </span>
                )}
              </div>

              {/* User Info (High Contrast, Eye-Pleasing Warm Brown on Beige) */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-black text-[#382618] tracking-wide">
                    {currentUser.name}
                  </h1>
                  {currentUser.role === 'admin' ? (
                    <span className="bg-[#4A3525] text-[#FAF2E6] text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs border border-[#3B291A]">
                      <Shield className="w-3.5 h-3.5 text-[#E6C687]" /> مدير المنصة
                    </span>
                  ) : currentUser.isGold ? (
                    <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                      <Crown className="w-3.5 h-3.5 text-slate-950" /> VIP ذهبي
                    </span>
                  ) : (
                    <span className="bg-[#EAE0D2] text-[#553F2D] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#D9CABB]">
                      عضو المنصة
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs">
                  <span className="text-[#6D533F] font-mono font-bold bg-[#EFE6DA] px-2.5 py-0.5 rounded-lg border border-[#DCCEC0]">
                    @{currentUser.nickname || 'مستخدم'}
                  </span>
                  
                  {/* Clean, comfortable join date badge */}
                  <span className="inline-flex items-center gap-1.5 bg-[#EAE0D2] border border-[#D5C4B1] text-[#4F3927] font-semibold px-2.5 py-0.5 rounded-lg shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-[#8C6443] shrink-0" />
                    <span>تاريخ الانضمام: <strong className="font-bold text-[#352315]">{new Date(currentUser.createdAt).toLocaleDateString('ar-SA')}</strong></span>
                  </span>
                </div>
              </div>

            </div>

            {/* Actions: Refresh + Edit Profile + Request Code with warm, comfortable styling */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end pt-3 sm:pt-0 border-t border-[#E5D7C7] sm:border-0 w-full sm:w-auto">
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="px-3 py-2 rounded-xl bg-white/90 hover:bg-white text-[#5C4033] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 border border-[#D5C4B1] shadow-2xs"
                title="تحديث البيانات فوراً"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#8C6443] ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">تحديث</span>
              </button>

              <button
                onClick={onOpenProfile}
                className="px-3.5 py-2 rounded-xl bg-white/90 hover:bg-white text-[#4A3525] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-[#D5C4B1] shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#8C6443]" />
                <span>تعديل البيانات</span>
              </button>

              <button
                onClick={() => setIsRequestCodeOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-[#5C4033] hover:bg-[#483227] text-[#FAF5EF] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs border border-[#483227]"
              >
                <Key className="w-3.5 h-3.5 text-[#E6C687]" />
                <span>طلب كود نشر</span>
              </button>

              <button
                onClick={() => setActiveMainTab('verification')}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs border border-emerald-800"
                title="الانتقال إلى قسم طلب التوثيق والاعتماد من الإدارة"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                <span>طلب التوثيق 🛡️</span>
              </button>
            </div>

          </div>
        </div>

        {/* Profile Content Details */}
        <div className="px-5 sm:px-8 pb-6 pt-4 relative">

          {/* Quick Badges & Contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>الجوال / واتساب: <strong className="font-mono text-slate-800">{currentUser.phone || 'غير مسجل'}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span>المدينة / المنطقة: <strong className="text-slate-800">{currentUser.city || 'المملكة العربية السعودية'}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>إجمالي الإعلانات المنشورة: <strong className="text-navy">{totalUserAdsCount} إعلان</strong></span>
            </div>
          </div>

          {/* Membership & Quota Status Card */}
          <div className="mt-4">
            {currentUser.role === 'admin' ? (
              <div className="bg-gradient-to-r from-navy/10 via-slate-100 to-navy/5 border border-navy/20 p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-navy text-gold flex items-center justify-center font-bold text-sm shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-navy block">صلاحية مدير النظام (Admin) 🛡️</span>
                    <span className="text-[11px] text-slate-500 block">لديك صلاحية كاملة لنشر وإدارة وتعديل الإعلانات بلا حدود</span>
                  </div>
                </div>
                <span className="bg-navy text-gold text-xs font-black px-3 py-1 rounded-full shadow-xs">
                  إعلانات غير محدودة
                </span>
              </div>
            ) : currentUser.isGold ? (
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-100/60 to-gold/10 border border-amber-400/50 p-4 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-amber-950 block">العضوية الذهبية VIP (100 ريال شهرياً) 👑</span>
                      <span className="text-[11px] text-amber-800 block">إعلانات غير محدودة وشارة توثيق الحساب</span>
                    </div>
                  </div>

                  {vipCountdown && (
                    <div className="flex items-center gap-2 bg-white/80 border border-amber-300 px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-amber-950">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>متبقي: {vipCountdown.formattedDetailed}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      totalUserAdsCount >= FREE_USER_ADS_LIMIT ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 block">
                        رصيد الإعلانات المجاني: {totalUserAdsCount} من {FREE_USER_ADS_LIMIT} إعلان مستهلك
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        يحق للمستخدم المجاني نشر إعلان واحد فقط. لنشر إعلان إضافي يمكنك الترقية أو طلب كود نشر.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={onOpenSubscriptions}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer hover:opacity-95"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>ترقية الباقة</span>
                  </button>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${totalUserAdsCount >= FREE_USER_ADS_LIMIT ? 'bg-red-600' : 'bg-emerald-600'}`}
                    style={{ width: `${Math.min(100, (totalUserAdsCount / FREE_USER_ADS_LIMIT) * 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation (Responsive, Compact on mobile, with horizontal scroll track) */}
      <div className="w-full bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 pb-2 sm:pb-0 scroll-smooth -mx-0.5 px-0.5">
          
          {/* Tab 1: إدارة إعلاناتي */}
          <button
            onClick={() => setActiveMainTab('ads')}
            className={`shrink-0 sm:flex-1 py-2 sm:py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer whitespace-nowrap ${
              activeMainTab === 'ads'
                ? 'bg-navy text-white shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-navy border border-slate-200/70'
            }`}
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold shrink-0" />
            <span>إدارة إعلاناتي</span>
            <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold shrink-0 ${
              activeMainTab === 'ads' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {totalUserAdsCount}
            </span>
          </button>

          {/* Tab 2: الحسابات البنكية وإيداع الإيصال */}
          <button
            onClick={() => setActiveMainTab('bank_accounts')}
            className={`shrink-0 sm:flex-1 py-2 sm:py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer whitespace-nowrap ${
              activeMainTab === 'bank_accounts'
                ? 'bg-gradient-to-r from-emerald-800 to-teal-900 text-white shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-emerald-800 border border-slate-200/70'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <span>الحسابات البنكية وإيداع الإيصال</span>
            <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold shrink-0 ${
              activeMainTab === 'bank_accounts' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              إيداع بنكي 💳
            </span>
          </button>

          {/* Tab 3: طلب التوثيق من الإدارة */}
          <button
            onClick={() => setActiveMainTab('verification')}
            className={`shrink-0 sm:flex-1 py-2 sm:py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer whitespace-nowrap ${
              activeMainTab === 'verification'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-emerald-800 border border-slate-200/70'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 shrink-0" />
            <span>طلب التوثيق من الإدارة</span>
            {unverifiedAdsCount > 0 ? (
              <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold shrink-0 ${
                activeMainTab === 'verification' ? 'bg-amber-400 text-amber-950' : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {unverifiedAdsCount} بحاجة توثيق
              </span>
            ) : (
              <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold shrink-0 ${
                activeMainTab === 'verification' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                موثق ✓
              </span>
            )}
          </button>

          {/* Tab 4: الأكواد المستخدمة والنشطة */}
          <button
            onClick={() => setActiveMainTab('codes')}
            className={`shrink-0 sm:flex-1 py-2 sm:py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer whitespace-nowrap ${
              activeMainTab === 'codes'
                ? 'bg-navy text-white shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-navy border border-slate-200/70'
            }`}
          >
            <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold shrink-0" />
            <span>الأكواد المستخدمة والنشطة</span>
            <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold shrink-0 ${
              activeMainTab === 'codes' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {totalCodesCount}
            </span>
          </button>

          {/* Tab 5: الاشتراكات والباقات */}
          <button
            onClick={() => setActiveMainTab('subscription')}
            className={`shrink-0 sm:flex-1 py-2 sm:py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer whitespace-nowrap ${
              activeMainTab === 'subscription'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-navy border border-slate-200/70'
            }`}
          >
            <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
            <span>الاشتراكات والباقات</span>
            {currentUser.isGold && (
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-white/20 text-white shrink-0">
                VIP
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: ADS MANAGEMENT */}
      {activeMainTab === 'ads' && (
        <div className="space-y-4">

          {/* Prominent Bank Accounts & Deposit Slips Quick Card inside ads */}
          <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-emerald-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-xs">
                <Landmark className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-white">
                    الحسابات البنكية للمنصة ورفع إيصال الإيداع
                  </h4>
                  <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded-md">
                    حسابات المنصة 💳
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100/90 mt-0.5">
                  بنك فيصل الإسلامي (8542412232100) • البنك السعودي (21546522122) - ارفع إيصال التحويل للمدير
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveMainTab('bank_accounts')}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>عرض الحسابات البنكية ورفع الإيصال</span>
            </button>
          </div>
          
          {/* Filter Sub-Tabs & Actions Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              {/* Status Filter Tabs (Horizontally scrollable on mobile) */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-1.5 sm:pb-1">
                <button
                  onClick={() => setAdsFilterStatus('all')}
                  className={`shrink-0 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    adsFilterStatus === 'all' ? 'bg-white text-navy shadow-xs' : 'text-slate-600 hover:text-navy'
                  }`}
                >
                  الكل ({totalUserAdsCount})
                </button>
                <button
                  onClick={() => setAdsFilterStatus('active')}
                  className={`shrink-0 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    adsFilterStatus === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-navy'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>النشطة ({activeAdsCount})</span>
                </button>
                <button
                  onClick={() => setAdsFilterStatus('ended')}
                  className={`shrink-0 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    adsFilterStatus === 'ended' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-navy'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span>المنتهية / تم البيع ({endedAdsCount})</span>
                </button>
                <button
                  onClick={() => setAdsFilterStatus('deleted')}
                  className={`shrink-0 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    adsFilterStatus === 'deleted' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-navy'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>المحذوفة ({deletedAdsCount})</span>
                </button>
              </div>

              {/* Publish New Ad Button */}
              {onNavigateToTab && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigateToTab('horses')}
                    className="w-full sm:w-auto px-3.5 py-2 bg-navy hover:bg-navy-dark text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-gold" />
                    <span>نشر إعلان جديد</span>
                  </button>
                </div>
              )}

            </div>

            {/* Category Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-slate-100">
              
              {/* Category Pills (Horizontally scrollable on mobile) */}
              <div className="flex items-center gap-1 text-xs overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-1 sm:pb-0">
                <span className="text-slate-400 font-bold ml-1 text-[11px] shrink-0">القسم:</span>
                {[
                  { id: 'all', label: 'جميع الأقسام' },
                  { id: 'horse', label: 'الخيول' },
                  { id: 'stable', label: 'الإسطبلات' },
                  { id: 'shelter', label: 'الإيواء' },
                  { id: 'transport', label: 'النقل' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`shrink-0 py-1 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-navy text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-navy'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search box */}
              <div className="flex-1 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في إعلاناتي..."
                  className="w-full text-xs pr-8 pl-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-2 text-[10px] text-slate-400 hover:text-navy font-bold"
                  >
                    مسح
                  </button>
                )}
              </div>

            </div>

          </div>

          {/* ACTIVE & ENDED ADS LIST */}
          {adsFilterStatus !== 'deleted' && (
            <div>
              {isLoading ? (
                <div className="p-12 text-center text-slate-400 text-xs">جاري تحميل إعلاناتك...</div>
              ) : filteredAds.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <Layers className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-navy text-sm">لا توجد إعلانات تطابق هذا الاختيار</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {searchQuery ? 'لم نجد أي إعلان يطابق عبارة البحث الخاصة بك.' : 'لم تقم بنشر أي إعلانات في هذا القسم بعد.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {filteredAds.map((ad) => {
                    const isSoldOrEnded = ad.status === 'sold' || ad.status === 'ended';
                    const categoryLabel =
                      ad.category === 'horse' ? 'خيل'
                      : ad.category === 'stable' ? 'إسطبل'
                      : ad.category === 'shelter' ? 'إيواء'
                      : 'نقل خيل';

                    return (
                      <div
                        key={ad.id}
                        onClick={() => setPreviewAd({ item: ad.rawItem, category: ad.category })}
                        className={`bg-white rounded-xl sm:rounded-2xl border overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group ${
                          isSoldOrEnded ? 'border-red-200 bg-red-50/20' : 'border-slate-200'
                        }`}
                      >
                        <div>
                          {/* Image & Badges */}
                          <div className="relative h-32 sm:h-44 w-full bg-slate-100 overflow-hidden">
                            <img
                              src={ad.thumbnail}
                              alt={ad.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=400';
                              }}
                            />
                            
                            {/* Category Badge top right */}
                            <span className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 bg-navy/90 text-white text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-xs backdrop-blur-xs">
                              {categoryLabel}
                            </span>

                            {/* Status Badge top left */}
                            <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 flex flex-col items-start gap-1">
                              <span className={`text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-xs backdrop-blur-xs flex items-center gap-0.5 sm:gap-1 ${
                                isSoldOrEnded
                                  ? 'bg-red-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}>
                                {isSoldOrEnded ? (
                                  <>
                                    <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    <span>{ad.category === 'horse' ? 'مُباع' : 'مكتمل'}</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    <span>نشط</span>
                                  </>
                                )}
                              </span>

                              {/* Pending Edit Approval Badge */}
                              {ad.isPendingEditApproval && (
                                <span className="bg-amber-400 text-slate-950 font-black text-[7.5px] sm:text-[9.5px] px-1.5 sm:px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs flex items-center gap-1 border border-amber-300 animate-pulse">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>بانتظار موافقة التعديل ⏳</span>
                                </span>
                              )}
                            </div>

                            {/* Verification Badge bottom right */}
                            <div className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5">
                              {isAdVerified(ad.rawItem) ? (
                                <AdVerifiedBadge item={ad.rawItem} variant="compact" />
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-900/85 text-amber-300 text-[8px] sm:text-[9px] font-bold rounded shadow-xs backdrop-blur-xs">
                                  <span>بانتظار التوثيق ⏳</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Body Details */}
                          <div className="p-2.5 sm:p-4 space-y-1.5 sm:space-y-2.5">
                            <div>
                              <h4 className="font-bold text-navy text-xs sm:text-sm line-clamp-1">{ad.title}</h4>
                              {ad.subtitle && (
                                <p className="text-[9px] sm:text-[11px] text-slate-500 line-clamp-1 mt-0.5">{ad.subtitle}</p>
                              )}
                            </div>

                            {/* Pending Edit Approval Notice (Visible only in user's page) */}
                            {ad.isPendingEditApproval && (
                              <div className="p-2 sm:p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-[10px] sm:text-xs text-amber-950 font-bold flex items-center gap-1.5 shadow-2xs">
                                <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0 animate-pulse" />
                                <span>الإعلان في انتظار موافقة الإدارة على التعديلات لنشرها (الإعلان معروض حالياً للزوار ببياناته الأصلية).</span>
                              </div>
                            )}

                            {/* Published Date & Time */}
                            <div className="bg-slate-50 p-1.5 sm:p-2.5 rounded-xl border border-slate-100 text-[9px] sm:text-[11px] space-y-0.5 sm:space-y-1">
                              <div className="flex items-center justify-between text-slate-600">
                                <span className="flex items-center gap-1 font-semibold truncate">
                                  <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-navy shrink-0" />
                                  <span className="truncate">النشر:</span>
                                </span>
                                <span className="font-bold text-slate-800 font-mono text-[9px] sm:text-[10.5px] truncate">
                                  {formatArabicDateTime(ad.createdAt)}
                                </span>
                              </div>
                              <div className="text-[8px] sm:text-[10px] text-slate-400 flex items-center justify-end">
                                <span>({getRelativeTime(ad.createdAt)})</span>
                              </div>
                            </div>

                            {/* Price / Contact snippet */}
                            <div className="flex items-center justify-between text-[10px] sm:text-xs pt-1 border-t border-slate-100">
                              <span className="font-bold text-slate-700 truncate">
                                {ad.price && ad.price > 0 ? (
                                  <span className="text-navy font-mono font-black">{ad.price.toLocaleString('ar-SA')} ريال</span>
                                ) : (
                                  <span className="text-amber-800 text-[10px] sm:text-[11px]">حسب الاتفاق</span>
                                )}
                              </span>
                              {ad.phone && (
                                <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono flex items-center gap-0.5 truncate">
                                  <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 shrink-0" />
                                  <span className="truncate">{ad.phone}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Active Permission Indicator (Only when granted 12-hour permission) */}
                        {hasEditPermission(ad.rawItem, currentUser) && (
                          <div className="px-2 pb-2">
                            <AdPermissionNotice
                              ad={ad.rawItem}
                              category={ad.category}
                              currentUser={currentUser}
                            />
                          </div>
                        )}

                        {/* Direct quick contact buttons on card (Call & WhatsApp) - exactly like original section cards */}
                        <div className="grid grid-cols-2 gap-1 sm:gap-1.5 px-2.5 sm:px-3 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={`tel:${ad.phone || '0559595055'}`}
                            className="py-1 sm:py-1.5 px-1 sm:px-2 bg-navy hover:bg-navy-dark text-white rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center justify-center gap-1 transition shadow-xs cursor-pointer active:scale-95"
                            title={`اتصال هاتفي: ${ad.phone || '0559595055'}`}
                          >
                            <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                            <span>اتصال</span>
                          </a>
                          <a
                            href={`https://wa.me/${(ad.phone || '0559595055').replace(/^0/, '966')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="py-1 sm:py-1.5 px-1 sm:px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center justify-center gap-1 transition shadow-xs cursor-pointer active:scale-95"
                            title={`واتساب مباشر: ${ad.phone || '0559595055'}`}
                          >
                            <MessageCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                            <span>واتساب</span>
                          </a>
                        </div>

                        {/* Card Action Controls - Exactly matching original sections styling & behavior */}
                        <div className="p-2 sm:p-2.5 bg-slate-50 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                          <div className="grid grid-cols-4 gap-1">
                            
                            {/* Preview Details Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewAd({ item: ad.rawItem, category: ad.category });
                              }}
                              className="py-1.5 px-1 text-[8.5px] sm:text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center gap-0.5 transition cursor-pointer active:scale-95 shadow-2xs"
                              title="معاينة بطاقة الإعلان بالكامل"
                            >
                              <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-navy shrink-0" />
                              <span className="truncate">معاينة</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(ad);
                              }}
                              className="py-1.5 px-1 text-[8.5px] sm:text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center justify-center gap-0.5 transition cursor-pointer active:scale-95 shadow-2xs"
                              title="تعديل بيانات وصور الإعلان"
                            >
                              <Edit2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                              <span className="truncate">تعديل</span>
                            </button>

                            {/* Toggle Sold / Ended Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(ad);
                              }}
                              className={`py-1.5 px-1 text-[8.5px] sm:text-[10px] font-bold rounded-lg flex items-center justify-center gap-0.5 transition cursor-pointer border active:scale-95 shadow-2xs ${
                                isSoldOrEnded
                                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                  : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                              }`}
                              title={isSoldOrEnded ? 'إعادة عرض كمتاح' : 'وضع علامة تم البيع / مكتمل'}
                            >
                              {isSoldOrEnded ? (
                                <>
                                  <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 shrink-0" />
                                  <span className="truncate">{ad.category === 'horse' ? 'متاح' : 'إتاحة'}</span>
                                </>
                              ) : (
                                <>
                                  <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600 shrink-0" />
                                  <span className="truncate">
                                    {ad.category === 'horse' ? 'تم البيع' : ad.category === 'stable' ? 'كمكتمل' : ad.category === 'shelter' ? 'كمحجوز' : 'كمنجز'}
                                  </span>
                                </>
                              )}
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(ad);
                              }}
                              className="py-1.5 px-1 text-[8.5px] sm:text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center justify-center gap-0.5 transition cursor-pointer active:scale-95 shadow-2xs"
                              title="حذف الإعلان"
                            >
                              <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                              <span className="truncate">حذف</span>
                            </button>

                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* DELETED ADS ARCHIVE LIST */}
          {adsFilterStatus === 'deleted' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <span className="font-black block">سجل الإعلانات المحذوفة الخاصة بك:</span>
                  <p className="text-[11px] leading-relaxed">
                    هنا تجد جميع الإعلانات التي قمت بحذفها سابقاً وتاريخ حذفها. يمكنك دائماً <strong>استعادة أي إعلان</strong> بنقرة واحدة ليعود نشطاً ومتاحاً للجميع، أو حذفه نهائياً.
                  </p>
                </div>
              </div>

              {filteredDeletedAds.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <Archive className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-navy text-sm">سجل المحذوفات فارغ</h3>
                  <p className="text-xs text-slate-500">لا توجد لديك أي إعلانات محذوفة حالياً.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                  {filteredDeletedAds.map((archived) => {
                    const thumb = archived.images && archived.images.length > 0
                      ? archived.images[0]
                      : 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=400';

                    return (
                      <div
                        key={archived.id}
                        className="bg-white rounded-xl sm:rounded-2xl border border-red-200/80 overflow-hidden shadow-xs flex flex-col justify-between opacity-95"
                      >
                        <div>
                          {/* Image */}
                          <div className="relative h-28 sm:h-40 w-full bg-slate-100 overflow-hidden grayscale">
                            <img src={thumb} alt={archived.title} className="w-full h-full object-cover" />
                            <span className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 bg-red-600 text-white text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-xs">
                              محذوف
                            </span>
                          </div>

                          {/* Body */}
                          <div className="p-2.5 sm:p-4 space-y-1.5 sm:space-y-2">
                            <h4 className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-1">{archived.title}</h4>

                            {/* Dates */}
                            <div className="bg-slate-50 p-1.5 sm:p-2.5 rounded-xl border border-slate-100 text-[8px] sm:text-[10px] space-y-0.5 sm:space-y-1">
                              <div className="flex items-center justify-between text-slate-500">
                                <span>نُشر:</span>
                                <span className="font-mono text-slate-700 truncate">{formatArabicDateTime(archived.createdAt)}</span>
                              </div>
                              <div className="flex items-center justify-between text-red-600 font-bold border-t border-slate-200/60 pt-0.5 sm:pt-1">
                                <span>الحذف:</span>
                                <span className="font-mono truncate">{formatArabicDateTime(archived.deletedAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="p-2 sm:p-2.5 bg-slate-50 border-t border-slate-100">
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => setRestoreConfirmAd(archived)}
                              className="py-1.5 sm:py-2 px-1.5 sm:px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9.5px] sm:text-xs font-black flex items-center justify-center gap-1 transition cursor-pointer shadow-xs"
                              title="استعادة الإعلان ليعود متاحاً للجميع"
                            >
                              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">استعادة</span>
                            </button>
                            <button
                              onClick={() => setPermanentDeleteAd(archived)}
                              className="py-1.5 sm:py-2 px-1.5 sm:px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[9.5px] sm:text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                              title="حذف نهائي للإعلان"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                              <span className="truncate">حذف نهائي</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* TAB 2: BANK ACCOUNTS & DEPOSIT SLIPS (الحسابات البنكية وإيداع الإيصال) */}
      {activeMainTab === 'bank_accounts' && (
        <UserBankAccountsSection
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onSuccessToast={showNotification}
          onBackToAds={() => setActiveMainTab('ads')}
        />
      )}

      {/* TAB 3: VERIFICATION REQUEST SECTION (قسم طلب التوثيق من الإدارة) */}
      {activeMainTab === 'verification' && (
        <div className="space-y-6">

          {/* Official WhatsApp & Verification Header Card */}
          <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-navy text-white p-5 sm:p-7 rounded-3xl shadow-lg border border-emerald-700/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

            <div className="relative z-10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 rounded-full text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>خدمة الاعتماد الرسمي ومراجعة الإعلانات</span>
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black text-white">
                    قسم طلب التوثيق من الإدارة 🛡️
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                    يتم فحص وتوثيق الإعلانات والحسابات يدوياً من قِبل إدارة منصة إستابلي لضمان المصداقية ومنع العشوائية. يتم إرسال طلب التوثيق مباشرة إلى إدارة المنصة عبر رقم الواتساب المعتمد للمراسلات والأكواد.
                  </p>
                </div>

                <div className="flex flex-col items-center sm:items-end gap-2 shrink-0 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                  <span className="text-[11px] font-bold text-emerald-200">إحصائية توثيق إعلاناتك:</span>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <span className="block text-lg font-black text-white">{verifiedAdsCount}</span>
                      <span className="text-[10px] text-emerald-200 font-semibold">موثق معتمد</span>
                    </div>
                    <div className="w-px h-7 bg-white/20"></div>
                    <div className="text-center">
                      <span className="block text-lg font-black text-amber-300">{unverifiedAdsCount}</span>
                      <span className="text-[10px] text-amber-200 font-semibold">بانتظار التوثيق</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dedicated Official WhatsApp Box */}
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
                <div className="space-y-1">
                  <span className="text-[11px] text-emerald-200 font-bold block">
                    رقم الواتساب المعتمد للمراسلات والأكواد والتوثيق بالمنصة:
                  </span>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-base sm:text-lg font-black font-mono tracking-wider text-white dir-ltr">
                      +{adminWhatsApp || '966559595055'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(adminWhatsApp || '966559595055', 'whatsapp_number')}
                    className="py-2 px-3 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-white/20"
                  >
                    {copiedCodeId === 'whatsapp_number' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>نسخ الرقم</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`https://wa.me/${(adminWhatsApp || '966559595055').replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>مراسلة واتساب مباشرة</span>
                  </a>
                </div>
              </div>

            </div>
          </div>

          {/* Account Verification Card */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <h4 className="font-black text-navy text-sm sm:text-base flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-navy" />
                  <span>توثيق حسابك الشخصي (معلن موثوق ومفحوص)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  توثيق الحساب يمنحك علامة التوثيق الدائمة ويزيد من مصداقية كافة إعلاناتك المعروضة في المنصة.
                </p>
              </div>

              <div>
                {currentUser.isGold ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    <span>عضوية VIP موثقة 👑</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>حساب بانتظار التوثيق الرسمي</span>
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">اسم المستخدم:</span>
                <strong className="text-slate-800">{currentUser.name || 'غير مسجل'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">رقم الهاتف / واتساب:</span>
                <strong className="text-slate-800 font-mono">{currentUser.phone || 'غير مسجل'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">البريد الإلكتروني:</span>
                <strong className="text-slate-800 font-mono truncate block">{currentUser.email || 'غير مسجل'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">المدينة / المنطقة:</span>
                <strong className="text-slate-800">{currentUser.city || 'المملكة العربية السعودية'}</strong>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-500">
                يتم إرسال طلب التوثيق عبر الواتساب المعتمد لمراجعة الهوية أو السجل وتفعيل شارة التوثيق.
              </span>
              <a
                href={generateWhatsAppVerificationRequestUrl('account', { currentUser, adminWhatsApp })}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs transition cursor-pointer shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                <span>إرسال طلب توثيق الحساب عبر الواتساب</span>
              </a>
            </div>
          </div>

          {/* User Ads Verification List */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <h4 className="font-black text-navy text-sm sm:text-base flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>إعلاناتك المسجلة وحالة التوثيق من الإدارة</span>
                </h4>
                <p className="text-xs text-slate-500">
                  يمكنك طلب توثيق أي إعلان محدد (خيل، إسطبل، إيواء، نقل) أو طلب توثيق كافة الإعلانات دفعة واحدة عبر واتساب الإدارة.
                </p>
              </div>

              {unverifiedAdsCount > 0 && (
                <a
                  href={generateWhatsAppVerificationRequestUrl('all_ads', { currentUser, adminWhatsApp })}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>طلب توثيق كل الإعلانات ({unverifiedAdsCount}) دفعة واحدة 🚀</span>
                </a>
              )}
            </div>

            {activeAds.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <p className="text-xs text-slate-500">ليس لديك أي إعلانات نشطة حالياً لطلب توثيقها.</p>
                <button
                  onClick={() => setActiveMainTab('ads')}
                  className="px-4 py-2 bg-navy text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  نشر إعلان جديد
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {activeAds.map((ad) => {
                  const verified = isAdVerified(ad.rawItem);
                  const whatsappAdUrl = generateWhatsAppVerificationRequestUrl('ad', {
                    ad: ad.rawItem,
                    category: ad.category,
                    currentUser,
                    adminWhatsApp
                  });

                  return (
                    <div
                      key={ad.id}
                      className={`p-3 sm:p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        verified ? 'bg-emerald-50/30 border-emerald-200' : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={ad.thumbnail}
                          alt={ad.title}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-slate-200"
                        />
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] font-bold bg-navy/90 text-white px-2 py-0.5 rounded-full">
                              {ad.category === 'horse' ? 'خيل' : ad.category === 'stable' ? 'إسطبل' : ad.category === 'shelter' ? 'إيواء' : 'نقل'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-bold">
                              #{ad.id}
                            </span>
                          </div>
                          <h5 className="font-bold text-navy text-xs sm:text-sm truncate">{ad.title}</h5>
                          {ad.subtitle && <p className="text-[10px] text-slate-500 truncate">{ad.subtitle}</p>}
                          <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1">
                            <span className="font-mono font-bold text-emerald-800">
                              {ad.price && ad.price > 0 ? `${ad.price.toLocaleString('ar-SA')} ريال` : 'حسب الاتفاق'}
                            </span>
                            <span className="text-slate-400 text-[9px]">{formatArabicDateTime(ad.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                        <div>
                          {verified ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-lg border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>إعلان موثق ومعتمد رسمياً</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              <span>بانتظار التوثيق من الإدارة</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewAd({ item: ad.rawItem, category: ad.category })}
                            className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 transition cursor-pointer"
                          >
                            معاينة
                          </button>

                          {!verified ? (
                            <a
                              href={whatsappAdUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-[10.5px] font-black flex items-center gap-1 transition cursor-pointer shadow-xs"
                              title="إرسال رسالة واتساب للإدارة لطلب فحص وتوثيق هذا الإعلان"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>طلب توثيق الإعلان 📲</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-bold px-1.5">
                              معتمد من الإدارة ✓
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Benefits of Verification Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <h5 className="font-black text-navy text-xs">ثقة المشترين وهواة الخيل</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                الإعلانات والحسابات الموثقة تمنح المشترين شعوراً بالأمان وتزيد فرصة إتمام الصفقات بسرعة ومصداقية.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Award className="w-4 h-4" />
              </div>
              <h5 className="font-black text-navy text-xs">فحص واعتماد الشهادات</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                يقوم فريق الإدارة بمراجعة أوراق النسب والبيانات الرسمية قبل وضع شارة الاعتماد الذهبية على الإعلان.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                <MessageCircle className="w-4 h-4" />
              </div>
              <h5 className="font-black text-navy text-xs">مراسلة مباشرة وسريعة</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                يتم التنسيق والمتابعة مباشرة مع الإدارة عبر رقم الواتساب المعتمد للمراسلات والأكواد لخدمتك على مدار الساعة.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: CODES MANAGEMENT */}
      {activeMainTab === 'codes' && (
        <div className="space-y-4">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-black text-navy text-sm sm:text-base flex items-center gap-2">
                <Key className="w-4 h-4 text-gold" />
                <span>أكواد النشر والاشتراك الخاصة بك</span>
              </h3>
              <p className="text-xs text-slate-500">
                هنا تجد كافة الأكواد التي طلبتها أو استخدمتها لنشر إعلانات إضافية في المنصة وتاريخ كل كود وحالته.
              </p>
            </div>

            <button
              onClick={() => setIsRequestCodeOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-xs flex items-center gap-2 shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>طلب كود نشر جديد (20 ريال)</span>
            </button>
          </div>

          {userCodes.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Key className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-navy text-sm">لم تقم باستخدام أي أكواد بعد</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                عند طلبك لكود نشر إضافي، سيظهر هنا مباشرة لمتابعة تفعيله واستخدامه في أي وقت.
              </p>
              <button
                onClick={() => setIsRequestCodeOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>طلب كود الآن</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userCodes.map((codeObj) => {
                const isUsed = codeObj.status === 'used';
                const isActive = codeObj.status === 'active';
                const isPending = codeObj.status === 'pending';

                return (
                  <div
                    key={codeObj.id}
                    className={`bg-white rounded-2xl border p-4.5 space-y-3 shadow-xs ${
                      isUsed
                        ? 'border-slate-200 bg-slate-50/60'
                        : isActive
                        ? 'border-emerald-300 bg-emerald-50/30'
                        : 'border-amber-300 bg-amber-50/30'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        isUsed
                          ? 'bg-slate-200 text-slate-700'
                          : isActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}>
                        {isUsed ? 'مُستخدم ✓' : isActive ? 'نشط جاهز للاستخدام' : 'قيد الانتظار والتفعيل'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatArabicDateTime(codeObj.createdAt)}
                      </span>
                    </div>

                    {/* Code String with Copy */}
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2.5">
                      <span className="font-mono font-black text-sm text-navy tracking-wider">{codeObj.code}</span>
                      <button
                        onClick={() => handleCopyCode(codeObj.code, codeObj.id)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-navy cursor-pointer"
                        title="نسخ الكود"
                      >
                        {copiedCodeId === codeObj.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Details */}
                    <div className="text-[11px] space-y-1 text-slate-600">
                      <div className="flex justify-between">
                        <span>عدد الإعلانات المسموحة:</span>
                        <strong className="text-slate-800 font-mono">{codeObj.allowedAdsCount || 1} إعلان</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>المستهلك من الكود:</span>
                        <strong className="text-slate-800 font-mono">{codeObj.usedAdsCount || (isUsed ? 1 : 0)} إعلان</strong>
                      </div>
                      {codeObj.note && (
                        <div className="pt-1 text-[10px] text-slate-400 truncate">
                          ملاحظة: {codeObj.note}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* TAB 3: SUBSCRIPTIONS & MEMBERSHIPS */}
      {activeMainTab === 'subscription' && (
        <div className="space-y-4">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-600">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-navy text-base">خطة اشتراكك الحالية</h3>
                  <p className="text-xs text-slate-500">تفاصيل العضوية، الصلاحيات، وتاريخ الانتهاء</p>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-black ${
                currentUser.role === 'admin'
                  ? 'bg-navy text-gold'
                  : currentUser.isGold
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {currentUser.role === 'admin' ? 'مدير نظام 🛡️' : currentUser.isGold ? 'عضوية ذهبية VIP 👑' : 'باقة مجانية'}
              </span>
            </div>

            {/* Current details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[11px] text-slate-400 font-bold block">حد نشر الإعلانات</span>
                <span className="text-sm font-black text-navy block">
                  {currentUser.role === 'admin' || currentUser.isGold ? 'إعلانات غير محدودة بدون قيود' : 'إعلان واحد فقط مجاناً'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[11px] text-slate-400 font-bold block">شارة توثيق الحساب والظهور</span>
                <span className="text-sm font-black text-navy block">
                  {currentUser.role === 'admin' ? 'موثق كمدير نظام 🛡️' : currentUser.isGold ? 'شارة التوثيق الذهبية VIP 👑' : 'عضو عادي'}
                </span>
              </div>
            </div>

            {/* Upgrade CTA */}
            {!currentUser.isGold && currentUser.role !== 'admin' && (
              <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                <div className="space-y-1">
                  <span className="font-black text-sm sm:text-base block">الترقية إلى العضوية الذهبية VIP (100 ريال شهرياً) 👑</span>
                  <p className="text-xs text-amber-100 leading-relaxed">
                    احصل على صلاحية نشر إعلانات غير محدودة، شارة VIP لجميع إعلاناتك، وأولوية الظهور في نتائج البحث.
                  </p>
                </div>
                <a
                  href={SubscriptionService.getUpgradeWhatsAppUrl(currentUser, 'العضوية الذهبية VIP (100 ريال شهرياً)')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-amber-950 font-black text-xs transition shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>تفعيل عبر الواتساب</span>
                </a>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={onOpenSubscriptions}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>عرض صفحة الاشتراكات الكاملة ومقارنة الباقات</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* DETAIL MODAL (Public Preview) */}
      {previewAd && (
        <DetailModal
          item={previewAd.item}
          type={previewAd.category}
          isOpen={true}
          onClose={() => setPreviewAd(null)}
          currentUser={currentUser}
          onRefresh={loadUserData}
          onEdit={(rawItem) => {
            setPreviewAd(null);
            handleStartEdit({
              id: rawItem.id,
              category: previewAd.category,
              title: rawItem.name || rawItem.title || rawItem.vehicleType || '',
              status: rawItem.isSold || rawItem.isEnded ? 'ended' : 'active',
              createdAt: rawItem.createdAt || '',
              images: rawItem.images || [],
              thumbnail: rawItem.images?.[0] || '',
              rawItem
            });
          }}
        />
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={deleteConfirmAd !== null}
        title="تأكيد حذف الإعلان"
        message={`هل أنت متأكد من رغبتك في حذف إعلان "${deleteConfirmAd?.title}"؟ سيتم نقله إلى سجل الإعلانات المحذوفة ويمكنك استعادته في أي وقت.`}
        confirmText="نعم، احذف الإعلان"
        cancelText="إلغاء"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmAd(null)}
      />

      {/* CONFIRM RESTORE MODAL */}
      <ConfirmModal
        isOpen={restoreConfirmAd !== null}
        title="تأكيد استعادة الإعلان"
        message={`هل ترغب في استعادة إعلان "${restoreConfirmAd?.title}" وإعادته نشطاً ومتاحاً للزوار في المنصة؟`}
        confirmText="نعم، استعد الإعلان"
        cancelText="إلغاء"
        onConfirm={() => restoreConfirmAd && handleRestoreAd(restoreConfirmAd)}
        onCancel={() => setRestoreConfirmAd(null)}
      />

      {/* CONFIRM PERMANENT DELETE MODAL */}
      <ConfirmModal
        isOpen={permanentDeleteAd !== null}
        title="تأكيد الحذف النهائي"
        message={`تحذير: سيتم حذف هذا الإعلان نهائياً من سجل المحذوفات ولن تتمكن من استعادته مرة أخرى. هل تود المتابعة؟`}
        confirmText="نعم، احذف نهائياً"
        cancelText="إلغاء"
        onConfirm={() => permanentDeleteAd && handlePermanentDelete(permanentDeleteAd.id)}
        onCancel={() => setPermanentDeleteAd(null)}
      />

      {/* REQUEST SUBSCRIPTION CODE MODAL */}
      <RequestSubscriptionCodeModal
        isOpen={isRequestCodeOpen}
        currentUser={currentUser}
        onClose={() => {
          setIsRequestCodeOpen(false);
          loadUserData();
        }}
      />

      {/* EDIT TERMS & CONDITIONS AGREEMENT MODAL */}
      {editTermsModalData && (
        <EditTermsAgreementModal
          isOpen={!!editTermsModalData}
          onClose={() => setEditTermsModalData(null)}
          onConfirm={handleConfirmEditWithTerms}
          adTitle={editTermsModalData.title}
          adCategoryName={
            editTermsModalData.category === 'horse' ? 'الخيول'
            : editTermsModalData.category === 'stable' ? 'الإسطبلات'
            : editTermsModalData.category === 'shelter' ? 'الإيواء'
            : 'نقل الخيل'
          }
          adId={editTermsModalData.adId}
          userName={currentUser?.name}
          userPhone={currentUser?.phone}
          isSubmitting={isSavingEdit}
        />
      )}

      {/* EDIT AD MODAL */}
      {editingAd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-navy p-4 sm:p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gold/20 flex items-center justify-center text-gold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">تعديل الإعلان</h3>
                  <p className="text-[11px] text-slate-300">قم بتحديث التفاصيل والأسعار والصور</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAd(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              
              {/* Optional Link to Section */}
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => {
                    const targetTab = editingAd.category === 'horse' ? 'horses' : editingAd.category === 'stable' ? 'stables' : editingAd.category === 'shelter' ? 'shelter' : 'transport';
                    setEditingAd(null);
                    onNavigateToTab(targetTab);
                  }}
                  className="w-full p-2.5 bg-navy/5 hover:bg-navy/10 text-navy border border-navy/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>أو الانتقال للتعديل المباشر داخل قسم {editingAd.category === 'horse' ? 'الخيل' : editingAd.category === 'stable' ? 'الإسطبلات' : editingAd.category === 'shelter' ? 'الإيواء' : 'النقل'}</span>
                </button>
              )}

              {/* Title / Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editingAd.category === 'horse' ? 'اسم الخيل' : editingAd.category === 'stable' ? 'اسم الإسطبل' : editingAd.category === 'shelter' ? 'عنوان خدمة الإيواء' : 'نوع المركبة / المقطورة'} *
                </label>
                <input
                  type="text"
                  value={editFormData.name || editFormData.title || editFormData.vehicleType || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (editingAd.category === 'horse' || editingAd.category === 'stable') {
                      setEditFormData({ ...editFormData, name: val });
                    } else if (editingAd.category === 'shelter') {
                      setEditFormData({ ...editFormData, title: val });
                    } else {
                      setEditFormData({ ...editFormData, vehicleType: val });
                    }
                  }}
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف للتواصل المباشر *</label>
                <input
                  type="tel"
                  value={editFormData.phone || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy font-mono"
                />
              </div>

              {/* Price (if applicable) */}
              {(editingAd.category === 'horse' || editingAd.category === 'transport' || editingAd.category === 'shelter') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السعر (ريال سعودي)</label>
                  <input
                    type="number"
                    value={editFormData.price || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, price: parseInt(e.target.value) || 0 })}
                    placeholder="0 في حال كان السعر حسب الاتفاق"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy font-mono"
                  />
                </div>
              )}

              {/* Location: Region & City */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المنطقة</label>
                  <input
                    type="text"
                    value={editFormData.region || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, region: e.target.value })}
                    placeholder="مثال: منطقة الرياض"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المدينة / الموقع</label>
                  <input
                    type="text"
                    value={editFormData.city || editFormData.location || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value, location: e.target.value })}
                    placeholder="مثال: الرياض - الجنادرية"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                </div>
              </div>

              {/* Horse-specific fields */}
              {editingAd.category === 'horse' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">نوع الإعلان</label>
                      <select
                        value={editFormData.adType || 'sale'}
                        onChange={(e) => setEditFormData({ ...editFormData, adType: e.target.value as any })}
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy bg-white"
                      >
                        <option value="sale">بيع خيل</option>
                        <option value="rent">تأجير خيل</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">السلالة</label>
                      <select
                        value={editFormData.breed || 'arabian'}
                        onChange={(e) => setEditFormData({ ...editFormData, breed: e.target.value as any })}
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy bg-white"
                      >
                        <option value="arabian">خيل عربي أصيل</option>
                        <option value="shabi">خيل شعبي</option>
                        <option value="sisi">سيسي (بوني)</option>
                      </select>
                    </div>
                  </div>

                  {editFormData.breed === 'arabian' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأب (Sire)</label>
                        <input
                          type="text"
                          value={editFormData.sireName || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, sireName: e.target.value })}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأم (Dam)</label>
                        <input
                          type="text"
                          value={editFormData.damName || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, damName: e.target.value })}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الجنس</label>
                      <select
                        value={editFormData.gender || 'stallion'}
                        onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value as any })}
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy bg-white"
                      >
                        <option value="stallion">فحل (ذكر)</option>
                        <option value="mare">فرس (أنثى)</option>
                        <option value="gelding">مخصي</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">اللون</label>
                      <input
                        type="text"
                        value={editFormData.color || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الارتفاع</label>
                      <input
                        type="text"
                        value={editFormData.height || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, height: e.target.value })}
                        placeholder="152 سم"
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                      />
                    </div>
                  </div>

                  {/* Horse Age (Years & Months) */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-navy flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gold-dark" />
                        <span>عمر الخيل (بالسنوات والشهور)</span>
                      </label>
                      <span className="text-[10px] font-bold text-navy bg-white px-2 py-0.5 rounded border border-slate-200">
                        {formatHorseAge(
                          editFormData.age,
                          editFormData.ageMonths,
                          editFormData.ageYears !== undefined ? editFormData.ageYears : (editFormData.age ? Math.floor(editFormData.age) : 0)
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">السنوات</label>
                        <select
                          value={editFormData.ageYears !== undefined ? editFormData.ageYears : (editFormData.age ? Math.floor(editFormData.age) : 0)}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const currentMonths = editFormData.ageMonths || 0;
                            const effective = val > 0 ? (currentMonths > 0 ? val + parseFloat((currentMonths / 12).toFixed(2)) : val) : (currentMonths > 0 ? parseFloat((currentMonths / 12).toFixed(2)) : 0);
                            setEditFormData({
                              ...editFormData,
                              ageYears: val,
                              age: effective
                            });
                          }}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy bg-white font-bold"
                        >
                          {Array.from({ length: 36 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? '0 سنة (أقل من سنة)' : i === 1 ? '1 سنة' : i === 2 ? '2 سنتان' : `${i} سنوات`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">الشهور</label>
                        <select
                          value={editFormData.ageMonths || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const currentYears = editFormData.ageYears !== undefined ? editFormData.ageYears : (editFormData.age ? Math.floor(editFormData.age) : 0);
                            const effective = currentYears > 0 ? (val > 0 ? currentYears + parseFloat((val / 12).toFixed(2)) : currentYears) : (val > 0 ? parseFloat((val / 12).toFixed(2)) : 0);
                            setEditFormData({
                              ...editFormData,
                              ageMonths: val,
                              age: effective
                            });
                          }}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy bg-white font-bold"
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? '0 شهر' : i === 1 ? '1 شهر' : i === 2 ? 'شهران' : `${i} أشهر`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الحالة الصحية والسلامة</label>
                    <input
                      type="text"
                      value={editFormData.healthStatus || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, healthStatus: e.target.value })}
                      placeholder="سليم خالي من العيوب"
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                    />
                  </div>
                </div>
              )}

              {/* Stable-specific fields */}
              {editingAd.category === 'stable' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">سعة الخيول (العدد)</label>
                    <input
                      type="number"
                      value={editFormData.horseCount || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, horseCount: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">التقييم العام</label>
                    <input
                      type="number"
                      max={5}
                      min={1}
                      value={editFormData.rating || 5}
                      onChange={(e) => setEditFormData({ ...editFormData, rating: parseFloat(e.target.value) || 5 })}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Transport-specific fields */}
              {editingAd.category === 'transport' && (
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">من مدينة</label>
                    <input
                      type="text"
                      value={editFormData.fromCity || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, fromCity: e.target.value })}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">إلى مدينة</label>
                    <input
                      type="text"
                      value={editFormData.toCity || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, toCity: e.target.value })}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">حمولة الرؤوس</label>
                    <input
                      type="text"
                      value={editFormData.capacity || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, capacity: e.target.value })}
                      placeholder="رأسين، 4 رؤوس..."
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الوصف التفصيلي</label>
                <textarea
                  value={editFormData.description || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={3}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                />
              </div>

              {/* Images Management */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">صور الإعلان ({(editFormData.images || []).length})</label>
                  <label className="text-[11px] font-bold text-navy hover:text-navy-dark cursor-pointer flex items-center gap-1 bg-navy/5 px-2.5 py-1 rounded-lg">
                    <Camera className="w-3.5 h-3.5" />
                    <span>إضافة صور جديدة</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleEditImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {(editFormData.images || []).length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {(editFormData.images || []).map((imgUrl: string, idx: number) => (
                      <div key={idx} className="relative h-16 rounded-xl overflow-hidden border border-slate-200 group">
                        <img src={imgUrl} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveEditImage(idx)}
                          className="absolute top-1 left-1 bg-red-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 transition shadow-xs cursor-pointer"
                          title="حذف الصورة"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">لا توجد صور مضافة للإعلان حالياً.</p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 bg-navy hover:bg-navy-dark text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAd(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* --- 12-HOUR PERMISSION REQUEST MODAL --- */}
      {permissionModalAd && (
        <AdActionPermissionModal
          isOpen={!!permissionModalAd}
          onClose={() => setPermissionModalAd(null)}
          ad={permissionModalAd.ad.rawItem}
          category={permissionModalAd.ad.category}
          action={permissionModalAd.action}
          adminWhatsApp={adminWhatsApp}
        />
      )}

    </div>
  );
}
