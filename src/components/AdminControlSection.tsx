/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  Trash2, 
  Edit, 
  Search, 
  Plus, 
  Award, 
  Home, 
  ShieldCheck, 
  Truck, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  X,
  Save,
  Lock,
  Phone,
  Mail,
  User as UserIcon,
  Sparkles,
  Crown,
  RefreshCw,
  Eye,
  Megaphone,
  Camera,
  Link,
  Clock,
  Image as ImageIcon,
  Globe,
  Bookmark
} from 'lucide-react';
import { User, Horse, Stable, Shelter, Transport, AnnouncementBanner, SiteSettings } from '../types';
import { FirebaseService } from '../lib/firebase';
import { compressImage } from '../lib/imageUtils';
import ConfirmModal from './ConfirmModal';

interface AdminControlSectionProps {
  currentUser: User;
  onSiteSettingsUpdated?: (settings: SiteSettings) => void;
}

export default function AdminControlSection({ currentUser, onSiteSettingsUpdated }: AdminControlSectionProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'listings' | 'banner' | 'logo' | 'site'>('logo');
  const [listingCategory, setListingCategory] = useState<'all' | 'horses' | 'stables' | 'shelters' | 'transports'>('all');
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [stables, setStables] = useState<Stable[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [banner, setBanner] = useState<AnnouncementBanner | null>(null);
  
  // Banner Form State
  const [bannerEnabled, setBannerEnabled] = useState(true);
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerLinkUrl, setBannerLinkUrl] = useState('');
  const [bannerDuration, setBannerDuration] = useState(7);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isSavingBanner, setIsSavingBanner] = useState(false);

  // Site Identity & Bookmark Icon State
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    siteName: 'Estably - إستابلي للخيول العربية الأصيلة',
    siteDescription: 'منصة متكاملة للاستطبلات، بيع وتأجير الخيول العربية الأصيلة، الإيواء، ونقل الخيول.',
    logoUrl: '/logomaster.jpg'
  });
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSavingSiteSettings, setIsSavingSiteSettings] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Modal / Editing state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  
  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'user' | 'horse' | 'stable' | 'shelter' | 'transport'; id: string; name: string } | null>(null);

  // Edit Listing Modal state
  const [editingListing, setEditingListing] = useState<{
    type: 'horse' | 'stable' | 'shelter' | 'transport';
    item: any;
  } | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load All Admin Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [u, h, s, sh, t, b, st] = await Promise.all([
        FirebaseService.getUsers(),
        FirebaseService.getHorses(),
        FirebaseService.getStables(),
        FirebaseService.getShelters(),
        FirebaseService.getTransports(),
        FirebaseService.getBanner(),
        FirebaseService.getSiteSettings()
      ]);
      setUsers(u);
      setHorses(h);
      setStables(s);
      setShelters(sh);
      setTransports(t);
      if (b) {
        setBanner(b);
        setBannerEnabled(b.enabled ?? true);
        setBannerImageUrl(b.imageUrl || '');
        setBannerTitle(b.title || '');
        setBannerLinkUrl(b.linkUrl || '');
        setBannerDuration(b.durationSeconds || 7);
      }
      if (st) {
        setSiteSettings(st);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBannerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const rawBase64 = reader.result as string;
        const compressed = await compressImage(rawBase64, 900, 700, 0.85);
        setBannerImageUrl(compressed);
        showNotify('success', 'تم تحميل صورة البنر بنجاح. يرجى الضغط على حفظ الإعدادات.');
      } catch (err) {
        showNotify('error', 'فشل ضغط ومعالجة الصورة.');
      } finally {
        setIsUploadingBanner(false);
      }
    };
    reader.onerror = () => {
      showNotify('error', 'فشل قراءة ملف الصورة.');
      setIsUploadingBanner(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerImageUrl) {
      showNotify('error', 'يرجى تحميل أو إضافة رابط صورة البنر أولاً.');
      return;
    }

    setIsSavingBanner(true);
    const newBannerObj: AnnouncementBanner = {
      id: 'main_app_banner',
      enabled: bannerEnabled,
      imageUrl: bannerImageUrl,
      title: bannerTitle.trim(),
      linkUrl: bannerLinkUrl.trim(),
      durationSeconds: bannerDuration || 7,
      updatedAt: new Date().toISOString()
    };

    try {
      const ok = await FirebaseService.saveBanner(newBannerObj);
      if (ok) {
        setBanner(newBannerObj);
        showNotify('success', 'تم حفظ وتحديث إعدادات البنر الإعلاني بنجاح!');
      } else {
        showNotify('error', 'فشل حفظ إعدادات البنر.');
      }
    } catch (err) {
      showNotify('error', 'حدث خطأ أثناء حفظ الإعلان.');
    } finally {
      setIsSavingBanner(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const rawBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const compressed = await compressImage(rawBase64, 400, 400, 0.85);
      setSiteSettings(prev => ({ ...prev, logoUrl: compressed }));
      showNotify('success', 'تم رفع وتعديل صورة اللوجو/الأيقونة بنجاح! يرجى ضغط حفظ لتثبيت البيانات.');
    } catch (err) {
      console.error('Logo upload error:', err);
      showNotify('error', 'فشل معالجة الصورة. يرجى اختيار صورة بصيغة JPG أو PNG.');
    } finally {
      setIsUploadingLogo(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteSettings.siteName.trim()) {
      showNotify('error', 'يرجى إدخال اسم الموقع.');
      return;
    }

    setIsSavingSiteSettings(true);
    try {
      const ok = await FirebaseService.saveSiteSettings(siteSettings);
      if (ok) {
        if (onSiteSettingsUpdated) {
          onSiteSettingsUpdated(siteSettings);
        }
        showNotify('success', 'تم حفظ وتحديث الشعار أعلى يمين الموقع وهوية الموقع بنجاح!');
      } else {
        showNotify('error', 'فشل حفظ إعدادات الموقع.');
      }
    } catch (err) {
      showNotify('error', 'حدث خطأ أثناء حفظ إعدادات الموقع.');
    } finally {
      setIsSavingSiteSettings(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSync = () => {
      loadData();
    };
    window.addEventListener('horses_forum_sync_complete', handleSync);
    return () => {
      window.removeEventListener('horses_forum_sync_complete', handleSync);
    };
  }, []);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // --- USER ACTIONS ---

  const handleToggleSuspend = async (userToToggle: User) => {
    const updated: User = {
      ...userToToggle,
      isSuspended: !userToToggle.isSuspended,
      updatedAt: new Date().toISOString()
    };
    const ok = await FirebaseService.saveUser(updated);
    if (ok) {
      setUsers(users.map(u => u.id === updated.id ? updated : u));
      showNotify('success', `تم ${updated.isSuspended ? 'إيقاف' : 'تفعيل'} حساب ${updated.name} بنجاح.`);
    } else {
      showNotify('error', 'فشل تغيير حالة الحساب.');
    }
  };

  const handleToggleGold = async (userToToggle: User) => {
    const updated: User = {
      ...userToToggle,
      isGold: !userToToggle.isGold,
      updatedAt: new Date().toISOString()
    };
    const ok = await FirebaseService.saveUser(updated);
    if (ok) {
      setUsers(users.map(u => u.id === updated.id ? updated : u));
      showNotify('success', `تم ${updated.isGold ? 'منح العضوية الذهبية 👑 لـ' : 'إلغاء العضوية الذهبية عن'} ${updated.name} بنجاح.`);
    } else {
      showNotify('error', 'فشل تغيير العضوية الذهبية.');
    }
  };

  const handleSaveUser = async (userToSave: User) => {
    const ok = await FirebaseService.saveUser(userToSave);
    if (ok) {
      setUsers(users.map(u => u.id === userToSave.id ? userToSave : u));
      showNotify('success', `تم تحديث بيانات المستخدم ${userToSave.name} بنجاح.`);
      setEditingUser(null);
    } else {
      showNotify('error', 'فشل حفظ التعديلات.');
    }
  };

  const handleCreateUser = async (newUser: User) => {
    const ok = await FirebaseService.saveUser(newUser);
    if (ok) {
      setUsers([...users, newUser]);
      showNotify('success', `تم إضافة المستخدم الجديد ${newUser.name} بنجاح.`);
      setIsAddUserOpen(false);
    } else {
      showNotify('error', 'فشل إضافة المستخدم.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'user') {
        await FirebaseService.deleteUser(deleteTarget.id);
        setUsers(users.filter(u => u.id !== deleteTarget.id));
        showNotify('success', `تم حذف المستخدم ${deleteTarget.name} بنجاح.`);
      } else if (deleteTarget.type === 'horse') {
        await FirebaseService.deleteHorse(deleteTarget.id);
        setHorses(horses.filter(h => h.id !== deleteTarget.id));
        showNotify('success', `تم حذف إعلان الخيل ${deleteTarget.name} بنجاح.`);
      } else if (deleteTarget.type === 'stable') {
        await FirebaseService.deleteStable(deleteTarget.id);
        setStables(stables.filter(s => s.id !== deleteTarget.id));
        showNotify('success', `تم حذف الإسطبل ${deleteTarget.name} بنجاح.`);
      } else if (deleteTarget.type === 'shelter') {
        await FirebaseService.deleteShelter(deleteTarget.id);
        setShelters(shelters.filter(s => s.id !== deleteTarget.id));
        showNotify('success', `تم حذف خدمة الإيواء ${deleteTarget.name} بنجاح.`);
      } else if (deleteTarget.type === 'transport') {
        await FirebaseService.deleteTransport(deleteTarget.id);
        setTransports(transports.filter(t => t.id !== deleteTarget.id));
        showNotify('success', `تم حذف خدمة النقل ${deleteTarget.name} بنجاح.`);
      }
    } catch (err) {
      showNotify('error', 'حدث خطأ أثناء الحذف.');
    } finally {
      setDeleteTarget(null);
    }
  };

  // --- LISTING ACTIONS ---

  const handleSaveListing = async (updatedItem: any) => {
    if (!editingListing) return;
    const { type } = editingListing;

    try {
      if (type === 'horse') {
        await FirebaseService.saveHorse(updatedItem);
        setHorses(horses.map(h => h.id === updatedItem.id ? updatedItem : h));
      } else if (type === 'stable') {
        await FirebaseService.saveStable(updatedItem);
        setStables(stables.map(s => s.id === updatedItem.id ? updatedItem : s));
      } else if (type === 'shelter') {
        await FirebaseService.saveShelter(updatedItem);
        setShelters(shelters.map(s => s.id === updatedItem.id ? updatedItem : s));
      } else if (type === 'transport') {
        await FirebaseService.saveTransport(updatedItem);
        setTransports(transports.map(t => t.id === updatedItem.id ? updatedItem : t));
      }
      showNotify('success', 'تم تعديل الإعلان بنجاح.');
      setEditingListing(null);
    } catch (err) {
      showNotify('error', 'فشل حفظ تعديلات الإعلان.');
    }
  };

  // Filtered lists
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery) ||
      u.nickname.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'suspended' ? u.isSuspended === true :
      !u.isSuspended;

    return matchesSearch && matchesStatus;
  });

  const allListings = [
    ...horses.map(h => ({ ...h, listingType: 'horse' as const, title: h.name })),
    ...stables.map(s => ({ ...s, listingType: 'stable' as const, title: s.name })),
    ...shelters.map(sh => ({ ...sh, listingType: 'shelter' as const, title: sh.title })),
    ...transports.map(t => ({ ...t, listingType: 'transport' as const, title: `نقل: ${t.vehicleType}` }))
  ];

  const filteredListings = allListings.filter(item => {
    const matchesCat = listingCategory === 'all' ? true : item.listingType === listingCategory.replace(/s$/, '');
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.userName && item.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.phone && item.phone.includes(searchQuery));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Toast notification */}
      {notification && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold border flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-green-600 text-white border-green-700' : 'bg-red-600 text-white border-red-700'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Admin Banner */}
      <div className="bg-navy text-white rounded-2xl p-6 shadow-xl border border-navy-dark flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black flex items-center gap-2">
              لوحة التحكم والإدارة الشاملة
              <span className="bg-gold text-navy text-[10px] font-bold px-2 py-0.5 rounded-md">ADMIN</span>
            </h1>
            <p className="text-xs text-slate-300 mt-1">إدارة جميع المستخدمين، الصلاحيات، الإيقاف، والتعديل الكامل للإعلانات والخدمات</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition border border-white/20 shrink-0 self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث البيانات</span>
        </button>
      </div>

      {/* Statistics Header Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي المستخدمين</span>
            <span className="text-xl font-extrabold text-navy">{users.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-navy/5 text-navy flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">الحسابات الموقوفة</span>
            <span className="text-xl font-extrabold text-red-600">{users.filter(u => u.isSuspended).length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي الإعلانات</span>
            <span className="text-xl font-extrabold text-gold-dark">{allListings.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gold-light text-gold-dark flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">عدد الخيول المعروضة</span>
            <span className="text-xl font-extrabold text-navy">{horses.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-navy/5 text-navy flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-3">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 font-bold text-xs sm:text-sm border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'users' ? 'border-navy text-navy font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>إدارة المستخدمين ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('listings')}
          className={`px-6 py-3 font-bold text-xs sm:text-sm border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'listings' ? 'border-navy text-navy font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>إدارة الإعلانات والخدمات ({allListings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('banner')}
          className={`px-6 py-3 font-bold text-xs sm:text-sm border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'banner' ? 'border-navy text-navy font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Megaphone className="w-4 h-4 text-gold-dark" />
          <span>بنر الإعلان الافتتاحي</span>
          {bannerEnabled && bannerImageUrl && (
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('logo')}
          className={`px-5 py-3 font-bold text-xs sm:text-sm border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'logo' ? 'border-gold-dark text-gold-dark font-black bg-gold/5' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Camera className="w-4 h-4 text-gold-dark" />
          <span>شعار أعلى يمين الشاشة</span>
          <span className="bg-gold/20 text-gold-dark text-[10px] px-1.5 py-0.5 rounded-md font-extrabold">مستقل</span>
        </button>

        <button
          onClick={() => setActiveTab('site')}
          className={`px-5 py-3 font-bold text-xs sm:text-sm border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'site' ? 'border-navy text-navy font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Globe className="w-4 h-4 text-navy" />
          <span>هوية الموقع والـ Bookmark Icon</span>
        </button>
      </div>

      {/* TAB 1: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-b-2xl p-4 sm:p-6 border border-t-0 border-slate-200/60 shadow-xs space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم المستخدم، الإيميل أو الجوال..."
                className="w-full text-xs pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
              />
            </div>

            {/* Filters & Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${statusFilter === 'all' ? 'bg-white text-navy shadow-xs' : 'text-slate-500'}`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${statusFilter === 'active' ? 'bg-white text-navy shadow-xs' : 'text-slate-500'}`}
                >
                  النشطين
                </button>
                <button
                  onClick={() => setStatusFilter('suspended')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${statusFilter === 'suspended' ? 'bg-white text-navy shadow-xs' : 'text-slate-500'}`}
                >
                  الموقوفين
                </button>
              </div>

              <button
                onClick={() => setIsAddUserOpen(true)}
                className="bg-navy hover:bg-navy-dark text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مستخدم</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <tr>
                  <th className="p-3.5">المستخدم</th>
                  <th className="p-3.5">الاسم المستعار</th>
                  <th className="p-3.5">التواصل</th>
                  <th className="p-3.5">الرتبة</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات والتحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-400 font-medium">
                      لا يوجد مستخدمين يطابقون خيارات البحث.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-navy/10 text-navy font-black flex items-center justify-center shrink-0 border border-navy/20">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              u.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block">{u.name}</span>
                            <span className="text-[10px] text-slate-400">{u.city || 'المدينة غير محددة'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-slate-600">
                        @{u.nickname}
                      </td>

                      <td className="p-3.5 space-y-0.5">
                        <div className="text-slate-700 font-semibold">{u.phone}</div>
                        <div className="text-slate-400 text-[10px]">{u.email}</div>
                      </td>

                      <td className="p-3.5">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 bg-gold-light text-gold-dark font-extrabold px-2.5 py-1 rounded-lg text-[10px]">
                            <Sparkles className="w-3 h-3" /> مدير النظام
                          </span>
                        ) : u.isGold ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-extrabold px-2.5 py-1 rounded-lg text-[10px] border border-amber-300">
                            <Crown className="w-3 h-3 text-amber-600" /> عضوية ذهبية 👑
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-lg text-[10px]">
                            عادي (5 يومياً)
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {u.isSuspended ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-lg text-[10px]">
                            <XCircle className="w-3 h-3" /> موقوف
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 font-bold px-2.5 py-1 rounded-lg text-[10px]">
                            <CheckCircle className="w-3 h-3" /> نشط
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          
                          {/* Toggle Gold Membership */}
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleToggleGold(u)}
                              className={`p-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer ${
                                u.isGold 
                                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300' 
                                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs'
                              }`}
                              title={u.isGold ? 'إلغاء العضوية الذهبية' : 'منح العضوية الذهبية (إعلانات غير محدودة)'}
                            >
                              <Crown className="w-3.5 h-3.5" />
                              <span>{u.isGold ? 'إلغاء الذهبية' : 'ترقية للذهبية 👑'}</span>
                            </button>
                          )}

                          {/* Toggle Suspend */}
                          <button
                            onClick={() => handleToggleSuspend(u)}
                            className={`p-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer ${
                              u.isSuspended 
                                ? 'bg-green-50 hover:bg-green-100 text-green-700' 
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                            }`}
                            title={u.isSuspended ? 'تفعيل الحساب' : 'إيقاف الحساب'}
                          >
                            {u.isSuspended ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                            <span>{u.isSuspended ? 'تفعيل' : 'إيقاف'}</span>
                          </button>

                          {/* Edit User */}
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                            title="تعديل البيانات"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => setDeleteTarget({ type: 'user', id: u.id, name: u.name })}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                            title="حذف الحساب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 2: LISTINGS MANAGEMENT */}
      {activeTab === 'listings' && (
        <div className="bg-white rounded-b-2xl p-4 sm:p-6 border border-t-0 border-slate-200/60 shadow-xs space-y-4">
          
          {/* Category Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Category Filters */}
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
              <button
                onClick={() => setListingCategory('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${listingCategory === 'all' ? 'bg-white text-navy shadow-xs' : 'text-slate-500'}`}
              >
                الكل ({allListings.length})
              </button>
              <button
                onClick={() => setListingCategory('horses')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${listingCategory === 'horses' ? 'bg-white text-navy shadow-xs' : 'text-slate-500'}`}
              >
                الخيول ({horses.length})
              </button>
              <button
                onClick={() => setListingCategory('stables')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${listingCategory === 'stables' ? 'bg-white text-navy shadow-xs' : 'text-slate-500'}`}
              >
                الإسطبلات ({stables.length})
              </button>
              <button
                onClick={() => setListingCategory('shelters')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${listingCategory === 'shelters' ? 'bg-white text-navy shadow-xs' : 'text-slate-500'}`}
              >
                الإيواء ({shelters.length})
              </button>
              <button
                onClick={() => setListingCategory('transports')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${listingCategory === 'transports' ? 'bg-white text-navy shadow-xs' : 'text-slate-500'}`}
              >
                النقل ({transports.length})
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الإعلانات حسب العنوان أو صاحب الإعلان..."
                className="w-full text-xs pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
              />
            </div>
          </div>

          {/* Listings Grid / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredListings.length === 0 ? (
              <div className="col-span-full text-center p-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-medium">
                لا توجد إعلانات مطابقة لخيارات الفلترة.
              </div>
            ) : (
              filteredListings.map((item) => (
                <div key={item.id} className="bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between space-y-3 transition">
                  <div className="flex gap-3">
                    {/* Image preview */}
                    <div className="w-20 h-20 rounded-xl bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                      {item.images && item.images.length > 0 ? (
                        <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">بدون صورة</div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md ${
                          item.listingType === 'horse' ? 'bg-blue-100 text-blue-700' :
                          item.listingType === 'stable' ? 'bg-amber-100 text-amber-700' :
                          item.listingType === 'shelter' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {item.listingType === 'horse' ? 'خيل' : item.listingType === 'stable' ? 'إسطبل' : item.listingType === 'shelter' ? 'إيواء' : 'نقل'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{new Date(item.createdAt).toLocaleDateString('ar-SA')}</span>
                      </div>

                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 truncate">{item.title}</h4>
                      
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <UserIcon className="w-3 h-3 text-slate-400" />
                        <span>صاحب الإعلان: <strong className="text-navy">{item.userName || 'غير معروف'}</strong></span>
                      </div>

                      {'price' in item && item.price && (
                        <div className="text-xs font-black text-gold-dark">
                          {item.price.toLocaleString()} ريال
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                    <button
                      onClick={() => setEditingListing({ type: item.listingType, item })}
                      className="px-3 py-1.5 bg-navy text-white hover:bg-navy-dark rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-xs"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>تعديل الإعلان</span>
                    </button>

                    <button
                      onClick={() => setDeleteTarget({ type: item.listingType, id: item.id, name: item.title })}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف الإعلان</span>
                    </button>
                  </div>

                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* TAB 3: ANNOUNCEMENT BANNER MANAGEMENT */}
      {activeTab === 'banner' && (
        <div className="bg-white rounded-b-2xl p-4 sm:p-6 border border-t-0 border-slate-200/60 shadow-xs space-y-6">
          
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gold/20 text-gold-dark flex items-center justify-center border border-gold/40 shrink-0">
                <Megaphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">إعلان البنر الافتتاحي المنبثق</h3>
                <p className="text-xs text-slate-500 mt-0.5">يظهر هذا البنر تلقائياً في منتصف الشاشة لجميع الزوار عند فتح الموقع لمدة 7 ثوانٍ ثم يختفي.</p>
              </div>
            </div>

            {/* Enable/Disable Toggle Switch */}
            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs shrink-0">
              <span className="text-xs font-extrabold text-slate-700">حالة الإعلان:</span>
              <button
                type="button"
                onClick={() => setBannerEnabled(!bannerEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  bannerEnabled ? 'bg-green-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    bannerEnabled ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-xs font-extrabold ${bannerEnabled ? 'text-green-600' : 'text-slate-400'}`}>
                {bannerEnabled ? 'مفعل (يعمل)' : 'معطل (مخفي)'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveBanner} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Banner Image Upload & Input */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-slate-700 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-navy" />
                  <span>صورة البنر الإعلاني</span>
                </h4>

                {/* Upload box */}
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isUploadingBanner}
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-navy/5 text-navy flex items-center justify-center">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {isUploadingBanner ? 'جاري معالجة الصورة...' : 'اضغط هنا لرفع صورة البنر الإعلاني من جهازك'}
                    </span>
                    <span className="text-[10px] text-slate-400">يدعم صيغ JPG, PNG, WEBP بصورة واضحة وجذابة</span>
                  </div>
                </div>

                {/* Direct Image URL fallback */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">أو أدخل رابط الصورة المباشر (URL)</label>
                  <input
                    type="url"
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    placeholder="https://example.com/banner.jpg"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                </div>

                {/* Optional Title & Link */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">عنوان توضيحي (اختياري)</label>
                    <input
                      type="text"
                      value={bannerTitle}
                      onChange={(e) => setBannerTitle(e.target.value)}
                      placeholder="عروض خيل الموسم الحصرية..."
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رابط التوجيه (اختياري)</label>
                    <div className="relative">
                      <Link className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="url"
                        value={bannerLinkUrl}
                        onChange={(e) => setBannerLinkUrl(e.target.value)}
                        placeholder="https://wa.me/..."
                        className="w-full text-xs pl-3 pr-9 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                      />
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-navy" />
                    <span>مدة ظهور الإعلان بالشاشة (بالثواني)</span>
                  </label>
                  <select
                    value={bannerDuration}
                    onChange={(e) => setBannerDuration(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy font-bold"
                  >
                    <option value={5}>5 ثوانٍ</option>
                    <option value={7}>7 ثوانٍ (الافتراضي)</option>
                    <option value={10}>10 ثوانٍ</option>
                    <option value={12}>12 ثانية</option>
                    <option value={15}>15 ثانية</option>
                  </select>
                </div>

              </div>

              {/* Live Preview Panel */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-700 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gold-dark" />
                  <span>معاينة الإعلان كما يظهر للمستخدمين</span>
                </h4>

                <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-xl min-h-[260px] flex flex-col items-center justify-center relative overflow-hidden">
                  
                  {bannerImageUrl ? (
                    <div className="relative w-full max-h-[300px] rounded-xl overflow-hidden border border-gold/40 shadow-2xl">
                      {/* Fake countdown bar */}
                      <div className="w-full bg-slate-700 h-1">
                        <div className="h-full bg-gold w-3/4 animate-pulse"></div>
                      </div>

                      <img src={bannerImageUrl} alt="معاينة البنر" className="w-full h-[220px] object-cover" />

                      {bannerTitle && (
                        <div className="absolute bottom-0 inset-x-0 bg-navy/90 p-3 text-white text-xs font-bold">
                          {bannerTitle}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-8 text-slate-500 space-y-2">
                      <ImageIcon className="w-12 h-12 mx-auto text-slate-600" />
                      <p className="text-xs font-bold text-slate-400">لم يتم اختيار صورة بنر بعد</p>
                      <p className="text-[10px] text-slate-500">قم برفع صورة ليظهر شكل الإعلان هنا فوراً</p>
                    </div>
                  )}

                  <div className="mt-3 text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-gold" />
                    <span>سيظهر الإعلان فور فتح أي مستخدم للموقع في منتصف الشاشة لمقدار {bannerDuration} ثوانٍ</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={isSavingBanner || isUploadingBanner}
                className="bg-navy hover:bg-navy-dark text-white font-extrabold py-3 px-8 rounded-xl transition text-xs flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-gold" />
                <span>{isSavingBanner ? 'جاري حفظ الإعدادات...' : 'حفظ إعدادات البنر الإعلاني'}</span>
              </button>
            </div>

          </form>

        </div>
      )}

      {/* TAB 4: STANDALONE TOP-RIGHT HEADER LOGO MANAGEMENT */}
      {activeTab === 'logo' && (
        <div className="bg-white rounded-b-2xl p-6 border border-t-0 border-slate-200/60 shadow-xs space-y-6">
          
          {/* Section Header */}
          <div className="bg-gradient-to-r from-navy via-navy-dark to-slate-900 border border-gold/30 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-gold/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gold/20 border border-gold/40 text-gold flex items-center justify-center shrink-0 shadow-inner">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-white">
                      قسم إدارة وصورة الشعار أعلى يمين الشاشة
                    </h3>
                    <span className="bg-gold text-navy font-black text-[10px] px-2 py-0.5 rounded-full">
                      خاص بالمدير
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                    يمكنك هنا بشكل مستقل رفع صورة الشعار الخاصة بـ (أعلى يمين الموقع) أو استعادة اللوجو الافتراضي. سيتم حفظ وتحديث هذه الصورة في قواعد بيانات الموقع وتطبيقها فوراً على جميع الأجهزة عند التصفح والنشر.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Control Panel (Upload & Form) */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-5">
                <h4 className="font-bold text-sm text-navy flex items-center gap-2 border-b border-slate-200 pb-3">
                  <ImageIcon className="w-4 h-4 text-gold-dark" />
                  <span>رفع صورة جديدة أو إدخال الرابط</span>
                </h4>

                {/* Upload Drag & Drop Area */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    رفع ملف صورة الشعار من الجهاز (PNG / JPG / WEBP / SVG):
                  </label>
                  
                  <div className="border-2 border-dashed border-gold/50 hover:border-gold bg-white hover:bg-gold/5 rounded-2xl p-6 text-center transition relative shadow-xs cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-gold-light text-gold-dark flex items-center justify-center group-hover:scale-110 transition">
                        <Camera className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        {isUploadingLogo ? 'جاري معالجة وتصغير الشعار...' : 'اضغط هنا لرفع صورة اللوجو الجديدة'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        سوف يتم حفظها تلقائياً بالدقة المناسبة لأعلى يمين الشاشة
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Image URL input */}
                <div className="space-y-1.5 pt-2">
                  <label className="block text-xs font-bold text-slate-700">
                    أو أدخل رابط صورة مباشر (Image URL):
                  </label>
                  <input
                    type="text"
                    value={siteSettings.logoUrl}
                    onChange={(e) => setSiteSettings({ ...siteSettings, logoUrl: e.target.value })}
                    placeholder="/logomaster.jpg أو https://example.com/logo.png"
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-navy font-mono dir-ltr bg-white"
                  />
                  <p className="text-[10px] text-slate-400">
                    الرابط المباشر أو مسار الصورة المحفوظة في الموقع.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...siteSettings, logoUrl: '/logomaster.jpg' };
                      setSiteSettings(updated);
                      FirebaseService.saveSiteSettings(updated);
                      if (onSiteSettingsUpdated) onSiteSettingsUpdated(updated);
                      showNotify('success', 'تمت استعادة الشعار الافتراضي بنجاح');
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 font-bold underline cursor-pointer"
                  >
                    إعادة للشعار الافتراضي (/logomaster.jpg)
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setIsSavingSiteSettings(true);
                      try {
                        const ok = await FirebaseService.saveSiteSettings(siteSettings);
                        if (ok) {
                          if (onSiteSettingsUpdated) onSiteSettingsUpdated(siteSettings);
                          showNotify('success', 'تم حفظ وتطبيق صورة الشعار أعـلى يمين الشاشة بنجاح!');
                        } else {
                          showNotify('error', 'حدث خطأ أثناء حفظ الشعار');
                        }
                      } finally {
                        setIsSavingSiteSettings(false);
                      }
                    }}
                    disabled={isSavingSiteSettings || isUploadingLogo}
                    className="bg-navy hover:bg-navy-dark text-white font-extrabold py-3 px-6 rounded-xl transition text-xs flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 text-gold" />
                    <span>{isSavingSiteSettings ? 'جاري الحفظ والتحديث...' : 'حفظ وتطبيق صورة الشعار أعـلى اليمين'}</span>
                  </button>
                </div>

              </div>

            </div>

            {/* Live Header Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold text-gold flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>معاينة حيّة للشعار أعـلى يمين الشاشة:</span>
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                    مستمر ومباشر
                  </span>
                </div>

                {/* Simulated Header Container */}
                <div className="bg-white text-slate-900 rounded-xl p-3 border border-slate-200 shadow-sm space-y-2">
                  <div className="text-[10px] text-slate-400 font-bold">شريط أعلى الشاشة المستهدف (Header Bar):</div>
                  
                  <div className="flex items-center justify-between bg-[#f0f2f5] p-2.5 rounded-lg border border-slate-200">
                    
                    {/* Top Right Logo Preview */}
                    <div className="flex items-center gap-2 border-2 border-dashed border-gold p-1 rounded-lg bg-white">
                      <img 
                        src={siteSettings.logoUrl || '/logomaster.jpg'} 
                        alt="شعار أعلى اليمين" 
                        className="h-10 max-w-[140px] object-contain rounded-md"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/logomaster.jpg'; }}
                      />
                    </div>

                    {/* Fake Header Nav */}
                    <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-500">
                      <span className="text-navy font-extrabold">الرئيسية</span>
                      <span>الإسطبلات</span>
                      <span>الخيول</span>
                    </div>

                    {/* Fake Profile button */}
                    <div className="w-7 h-7 rounded-full bg-navy text-gold text-[10px] font-black flex items-center justify-center">
                      م
                    </div>

                  </div>
                </div>

                <div className="text-[11px] text-slate-300 space-y-1.5 leading-relaxed pt-1">
                  <p className="font-bold text-gold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>تطبيق تلقائي ودائم:</span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    بمجرد حفظ الصورة، سيتم عرض الشعار في شريط التصفح بالرأس وتحديثه مباشرة لدى جميع المستخدمين والزوار على سيرفرات Vercel والشبكة دون الحاجة لأي تعديلات برمجية أخرى.
                  </p>
                </div>

              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 5: SITE IDENTITY & BOOKMARK ICON MANAGEMENT */}
      {activeTab === 'site' && (
        <div className="bg-white rounded-b-2xl p-6 border border-t-0 border-slate-200/60 shadow-xs space-y-6">
          
          {/* Info Header */}
          <div className="bg-navy/5 border border-navy/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-navy text-gold flex items-center justify-center shrink-0 shadow-xs">
                <Bookmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm text-navy flex items-center gap-2">
                  إعدادات شعار أعلى يمين الموقع وهوية الـ Bookmark Icon
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  يمكنك هنا رفع صورة الشعار الخاصة بـ (أعلى يمين الموقع) ليحل محل نص اسم الموقع. كما يتم اعتماد الشعار تلقائياً كأيقونة للمفضلة (Bookmark) والإنشاء على الشاشة الرئيسية للهواتف.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveSiteSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Form Controls */}
              <div className="space-y-4">
                
                {/* Site Name Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-navy" />
                    <span>اسم الموقع (Site Title / Bookmark Name)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={siteSettings.siteName}
                    onChange={(e) => setSiteSettings({ ...siteSettings, siteName: e.target.value })}
                    placeholder="مثال: Estably - إستابلي للخيول العربية الأصيلة"
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-navy font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">يظهر هذا العنوان في شريط أعلى المتصفح وعند حفظ المفضلة (Bookmark).</p>
                </div>

                {/* Site Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وصف الموقع (Site Meta Description)</label>
                  <textarea
                    rows={3}
                    value={siteSettings.siteDescription}
                    onChange={(e) => setSiteSettings({ ...siteSettings, siteDescription: e.target.value })}
                    placeholder="اكتب وصفاً مختصراً للموقع يظهر في محركات البحث والمشاركة..."
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                </div>

                {/* Logo / Favicon Upload & URL */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-navy" />
                    <span>شعار وأيقونة الموقع (Favicon & Apple Touch Icon)</span>
                  </label>

                  {/* Drag & drop / upload button */}
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center bg-slate-50 hover:bg-slate-100/80 transition relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center gap-1.5">
                      <Camera className="w-6 h-6 text-navy" />
                      <span className="text-xs font-bold text-slate-700">
                        {isUploadingLogo ? 'جاري رفع ومعالجة الشعار...' : 'اضغط هنا لرفع صورة اللوجو الجديدة من جهازك'}
                      </span>
                      <span className="text-[10px] text-slate-400">يفضل صورة مربعة بحجم واضح (PNG أو JPG)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">أو أدخل رابط الصورة المباشر (URL)</label>
                    <input
                      type="text"
                      value={siteSettings.logoUrl}
                      onChange={(e) => setSiteSettings({ ...siteSettings, logoUrl: e.target.value })}
                      placeholder="/logo.jpg أو https://example.com/logo.png"
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy font-mono dir-ltr"
                    />
                  </div>
                </div>

              </div>

              {/* Live Preview Column */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-slate-700 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gold-dark" />
                  <span>معاينة كيف يظهر الـ Bookmark للشعار والموقع</span>
                </h4>

                {/* Simulated Microsoft Edge / Browser Bookmark Bar */}
                <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-xl space-y-4">
                  
                  <div className="text-[11px] font-bold text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                    <Bookmark className="w-3.5 h-3.5 text-gold" />
                    <span>شريط المفضلة في المتصفح (Edge / Chrome Bookmark Bar):</span>
                  </div>

                  {/* Browser Tab preview */}
                  <div className="bg-slate-800/80 rounded-xl p-2.5 flex items-center gap-3 border border-slate-700">
                    <img 
                      src={siteSettings.logoUrl || '/logomaster.jpg'} 
                      alt="Favicon Preview" 
                      className="w-6 h-6 rounded-lg object-cover border border-gold/40 shrink-0 bg-white"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/logomaster.jpg'; }}
                    />
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate">{siteSettings.siteName || 'اسم الموقع'}</div>
                      <div className="text-[10px] text-slate-400 truncate">{window.location.host || 'estably.app'}</div>
                    </div>
                  </div>

                  <div className="text-[11px] font-bold text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-2 pt-2">
                    <Sparkles className="w-3.5 h-3.5 text-gold" />
                    <span>أيقونة الاختصار على الشاشة الرئيسية للهاتف (Home Screen Shortcut):</span>
                  </div>

                  {/* Mobile Shortcut preview */}
                  <div className="flex items-center gap-4 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                    <div className="flex flex-col items-center gap-1.5">
                      <img 
                        src={siteSettings.logoUrl || '/logomaster.jpg'} 
                        alt="Mobile App Icon" 
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-gold/60 shadow-lg bg-white"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/logomaster.jpg'; }}
                      />
                      <span className="text-[10px] font-bold text-slate-300 max-w-[70px] truncate text-center">
                        {siteSettings.siteName?.split('-')[0]?.trim() || 'Estably'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-1">
                      <p className="font-bold text-gold">أيقونة واضحة عند الإضافة لسطح المكتب</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        عندما يضغط الزائر على "Add to Home screen" في متصفح Edge أو Chrome أو Safari، ستظهر الأيقونة والشعار بهذا الشكل الأنيق.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={isSavingSiteSettings || isUploadingLogo}
                className="bg-navy hover:bg-navy-dark text-white font-extrabold py-3 px-8 rounded-xl transition text-xs flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-gold" />
                <span>{isSavingSiteSettings ? 'جاري الحفظ والربط...' : 'حفظ وتحديث هوية الموقع والـ Bookmark Icon'}</span>
              </button>
            </div>

          </form>

        </div>
      )}

      {/* --- EDIT USER MODAL FOR ADMIN --- */}
      {editingUser && (
        <EditUserAdminModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleSaveUser}
        />
      )}

      {/* --- ADD USER MODAL FOR ADMIN --- */}
      {isAddUserOpen && (
        <AddUserAdminModal
          onClose={() => setIsAddUserOpen(false)}
          onAdd={handleCreateUser}
        />
      )}

      {/* --- EDIT LISTING MODAL FOR ADMIN --- */}
      {editingListing && (
        <EditListingAdminModal
          listingInfo={editingListing}
          onClose={() => setEditingListing(null)}
          onSave={handleSaveListing}
        />
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="تأكيد الحذف نهائياً"
        message={`هل أنت تأكد من رغبتك في حذف ${deleteTarget?.type === 'user' ? 'المستخدم' : 'الإعلان'} "${deleteTarget?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="نعم، احذف الآن"
        cancelText="إلغاء"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

    </div>
  );
}

// Sub-component: Edit User Admin Modal
function EditUserAdminModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (u: User) => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [nickname, setNickname] = useState(user.nickname);
  const [role, setRole] = useState<'admin' | 'user'>(user.role);
  const [isSuspended, setIsSuspended] = useState(user.isSuspended || false);
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...user,
      name,
      email,
      phone,
      nickname,
      role,
      isSuspended,
      password: password ? password : user.password,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
        <div className="bg-navy p-4 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-sm">تعديل بيانات المستخدم (بصلاحيات المدير)</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold mb-1">الاسم الكامل</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="block font-bold mb-1">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="block font-bold mb-1">رقم الجوال</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="block font-bold mb-1">الاسم المستعار</label>
              <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} required className="w-full p-2.5 border rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold mb-1">الرتبة / الصلاحية</label>
              <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full p-2.5 border rounded-xl">
                <option value="user">مستخدم عادي</option>
                <option value="admin">مدير نظام (Admin)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">حالة الحساب</label>
              <select value={isSuspended ? 'suspended' : 'active'} onChange={e => setIsSuspended(e.target.value === 'suspended')} className="w-full p-2.5 border rounded-xl">
                <option value="active">نشط (مفعل)</option>
                <option value="suspended">موقوف (محظور)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">تغيير كلمة السر (اتركه فارغاً للإبقاء على الحالية)</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة سر جديدة..." className="w-full text-xs p-2.5 border rounded-xl" />
          </div>

          <div className="flex gap-3 pt-3">
            <button type="submit" className="flex-1 bg-navy text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer">حفظ التعديلات</button>
            <button type="button" onClick={onClose} className="px-5 bg-slate-100 font-bold py-2.5 rounded-xl text-xs cursor-pointer">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sub-component: Add User Admin Modal
function AddUserAdminModal({ onClose, onAdd }: { onClose: () => void; onAdd: (u: User) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !nickname) return;
    onAdd({
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      nickname: nickname.trim(),
      role: role,
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
        <div className="bg-navy p-4 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-sm">إضافة مستخدم جديد تلقائياً</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold mb-1">الاسم الكامل</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="مثال: خالد الحربي" className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="block font-bold mb-1">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="user@gmail.com" className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="block font-bold mb-1">رقم الجوال</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="055XXXXXXX" className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="block font-bold mb-1">الاسم المستعار</label>
              <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} required placeholder="khalid_99" className="w-full p-2.5 border rounded-xl" />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-bold mb-1">الصلاحية</label>
            <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full p-2.5 border rounded-xl">
              <option value="user">مستخدم عادي</option>
              <option value="admin">مدير نظام</option>
            </select>
          </div>

          <div className="flex gap-3 pt-3">
            <button type="submit" className="flex-1 bg-navy text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer">إضافة المستخدم</button>
            <button type="button" onClick={onClose} className="px-5 bg-slate-100 font-bold py-2.5 rounded-xl text-xs cursor-pointer">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sub-component: Edit Listing Admin Modal
function EditListingAdminModal({ listingInfo, onClose, onSave }: { listingInfo: { type: string; item: any }; onClose: () => void; onSave: (item: any) => void }) {
  const { type, item } = listingInfo;
  const [title, setTitle] = useState(item.name || item.title || '');
  const [userName, setUserName] = useState(item.userName || '');
  const [phone, setPhone] = useState(item.phone || '');
  const [price, setPrice] = useState(item.price ? String(item.price) : '');
  const [description, setDescription] = useState(item.description || item.healthStatus || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...item,
      name: type === 'horse' || type === 'stable' ? title : item.name,
      title: type === 'shelter' || type === 'transport' ? title : item.title,
      userName,
      phone,
      price: price ? Number(price) : item.price,
      description: item.description !== undefined ? description : item.description,
      healthStatus: item.healthStatus !== undefined ? description : item.healthStatus,
      updatedAt: new Date().toISOString()
    };
    onSave(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
        <div className="bg-navy p-4 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-sm">تعديل الإعلان (بصلاحيات المدير)</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold mb-1">عنوان / اسم الإعلان</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2.5 border rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">اسم صاحب الإعلان</label>
              <input type="text" value={userName} onChange={e => setUserName(e.target.value)} required className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="block font-bold mb-1">رقم جوال التواصل</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
          </div>

          {'price' in item && (
            <div>
              <label className="block font-bold mb-1">السعر (ريال)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
          )}

          <div>
            <label className="block font-bold mb-1">تفاصيل / الوصف</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2.5 border rounded-xl" />
          </div>

          <div className="flex gap-3 pt-3">
            <button type="submit" className="flex-1 bg-navy text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer">حفظ التعديلات</button>
            <button type="button" onClick={onClose} className="px-5 bg-slate-100 font-bold py-2.5 rounded-xl text-xs cursor-pointer">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
