/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Home, 
  Award, 
  ShieldCheck, 
  Truck, 
  FileText, 
  Mail, 
  Search, 
  User as UserIcon, 
  LogOut, 
  Sparkles, 
  MessageSquare, 
  Menu, 
  X,
  Compass,
  Cloud,
  ShieldAlert,
  Crown,
  Edit
} from 'lucide-react';
import { User, AnnouncementBanner, SiteSettings } from './types';
import { FirebaseService } from './lib/firebase';
import StablesSection from './components/StablesSection';
import HorsesSection from './components/HorsesSection';
import ShelterSection from './components/ShelterSection';
import TransportSection from './components/TransportSection';
import TermsSection from './components/TermsSection';
import ContactSection from './components/ContactSection';
import AuthModal from './components/AuthModal';
import HomeSection from './components/HomeSection';
import DriveBackupSection from './components/DriveBackupSection';
import UserProfileModal from './components/UserProfileModal';
import AdminControlSection from './components/AdminControlSection';
import BannerModal from './components/BannerModal';

import { AuthService, isSystemAdminEmail } from './lib/authService';
import { DAILY_FREE_ADS_LIMIT } from './lib/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'stables' | 'horses' | 'shelter' | 'transport' | 'terms' | 'contact' | 'backup' | 'admin'>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [banner, setBanner] = useState<AnnouncementBanner | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [todayAdsCount, setTodayAdsCount] = useState<number>(0);

  const refreshDailyAdsCount = useCallback(async () => {
    if (currentUser?.id) {
      const cnt = await FirebaseService.getUserTodayAdsCount(currentUser.id);
      setTodayAdsCount(cnt);
    } else {
      setTodayAdsCount(0);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    refreshDailyAdsCount();
  }, [refreshDailyAdsCount, activeTab]);

  const remainingDailyAds = Math.max(0, DAILY_FREE_ADS_LIMIT - todayAdsCount);

  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    id: 'main_site_settings',
    siteName: 'Estably - منصة الخيول العربية الأصيلة',
    siteDescription: 'منصة متكاملة للاستطبلات، بيع وتأجير الخيول العربية الأصيلة، الإيواء، ونقل الخيول.',
    logoUrl: '/logomaster.jpg'
  });

  // Initialize data cache on mount & fetch announcement banner
  useEffect(() => {
    FirebaseService.initFallbackData();
    
    // Check if user session exists in local storage
    const savedUser = localStorage.getItem('horses_forum_session');
    if (savedUser) {
      try {
        let u: User = JSON.parse(savedUser);
        if (u.authProvider === 'google') {
          u.role = 'user';
        } else if (isSystemAdminEmail(u.email)) {
          u.role = 'admin';
        }
        setCurrentUser(u);

        // Fetch fresh user profile from DB to preserve all profile edits (avatar, phone, etc.)
        FirebaseService.getUsers().then((users) => {
          const freshUser = users.find(
            (dbUser) => dbUser.id === u.id || (dbUser.email && u.email && dbUser.email.toLowerCase() === u.email.toLowerCase())
          );
          if (freshUser) {
            if (freshUser.authProvider === 'google') {
              freshUser.role = 'user';
            } else if (isSystemAdminEmail(freshUser.email)) {
              freshUser.role = 'admin';
            }
            setCurrentUser(freshUser);
            localStorage.setItem('horses_forum_session', JSON.stringify(freshUser));
          }
        }).catch(err => console.warn('Could not sync fresh user profile', err));
      } catch (e) {}
    }

    // Load Announcement Banner & Site Settings
    FirebaseService.getBanner().then((b) => {
      if (b) setBanner(b);
    }).catch(err => console.warn('Could not load banner', err));

    FirebaseService.getSiteSettings().then((settings) => {
      if (settings) {
        if (!settings.logoUrl || settings.logoUrl === '/logo.jpg') {
          settings.logoUrl = '/logomaster.jpg';
        }
        setSiteSettings(settings);
        FirebaseService.applySiteSettings(settings);
      }
    }).catch(err => console.warn('Could not load site settings', err));
  }, []);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('horses_forum_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('horses_forum_session');
  };

  const isAdmin = Boolean(currentUser && currentUser.authProvider !== 'google' && (currentUser.role === 'admin' || isSystemAdminEmail(currentUser.email)));

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col font-sans selection:bg-gold/30 selection:text-navy" dir="rtl">
      
      {/* Header Panel */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs px-4 sm:px-6 py-3 flex items-center justify-between">
        
        {/* Brand Logo - Top Right Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition group"
            title={siteSettings.siteName || 'الصفحة الرئيسية'}
          >
            {siteSettings.logoUrl ? (
              <img 
                src={siteSettings.logoUrl} 
                alt={siteSettings.siteName || 'شعار الموقع'} 
                className="h-10 sm:h-12 max-w-[180px] object-contain rounded-lg transition-transform group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logomaster.jpg';
                }}
              />
            ) : (
              <img 
                src="/logomaster.jpg" 
                alt="شعار الموقع" 
                className="h-10 sm:h-12 max-w-[180px] object-contain rounded-lg transition-transform group-hover:scale-105" 
              />
            )}
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="hidden md:flex items-center relative w-80 max-w-xs">
          <Search className="absolute right-3.5 top-3 w-4 h-4 text-navy" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن إعلانات، خيول، إسطبلات..."
            className="w-full text-xs pl-4 pr-10 py-2.5 border border-slate-200/60 rounded-xl focus:outline-none focus:border-navy bg-navy-light/40"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute left-3 top-2.5 text-slate-400 hover:text-navy text-xs font-bold p-1">
              مسح
            </button>
          )}
        </div>

        {/* Action Controls & Session manager */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200/60 p-1.5 rounded-xl">
              
              {/* User Profile Quick Click */}
              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-2 hover:bg-slate-100/80 p-1 rounded-lg transition cursor-pointer"
                title="تعديل ملفك الشخصي"
              >
                <div className="w-8 h-8 rounded-lg bg-navy/10 text-navy font-bold text-xs shrink-0 overflow-hidden flex items-center justify-center border border-navy/20">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name.charAt(0)
                  )}
                </div>
                <div className="text-right flex flex-col justify-center max-w-[120px] sm:max-w-[160px]">
                  <span className="text-[10px] font-bold text-slate-800 block truncate">{currentUser.name}</span>
                  <span className="text-[8px] text-gold-dark font-semibold block truncate">@{currentUser.nickname} {isAdmin ? '(مدير)' : currentUser.isGold ? '(عضو ذهبي)' : ''}</span>
                  {isAdmin ? (
                    <span className="text-[8px] font-extrabold text-navy bg-navy/10 px-1.5 py-0.2 rounded border border-navy/20 mt-0.5 block truncate" title="إعلانات غير محدودة لمدير النظام">
                      🛡️ إعلانات غير محدودة
                    </span>
                  ) : currentUser.isGold ? (
                    <span className="text-[8px] font-extrabold text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 mt-0.5 block truncate" title="إعلانات غير محدودة للعضوية الذهبية">
                      👑 ذهبي: غير محدود
                    </span>
                  ) : (
                    <span className="text-[8px] font-extrabold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.2 rounded border border-emerald-300 mt-0.5 block truncate" title={`المتبقي من الإعلانات المجانية اليومية: ${remainingDailyAds} من ${DAILY_FREE_ADS_LIMIT}`}>
                      المتبقي اليومي: {remainingDailyAds} من {DAILY_FREE_ADS_LIMIT}
                    </span>
                  )}
                </div>
              </button>

              {/* Edit profile icon */}
              <button
                onClick={() => setIsProfileOpen(true)}
                className="p-1.5 bg-navy/5 hover:bg-navy/10 text-navy rounded-lg transition cursor-pointer shrink-0 text-xs flex items-center gap-1 font-bold"
                title="تعديل الملف الشخصي"
              >
                <Edit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">تعديل</span>
              </button>

              {/* Admin Button if user is Admin */}
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className="p-1.5 bg-gold-light hover:bg-gold/20 text-gold-dark rounded-lg transition cursor-pointer shrink-0 text-xs flex items-center gap-1 font-extrabold border border-gold/30"
                  title="لوحة التحكم الإدارية"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-gold-dark" />
                  <span className="hidden sm:inline text-[10px]">المدير</span>
                </button>
              )}

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition cursor-pointer shrink-0"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="bg-navy hover:bg-navy-dark text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>دخول / اشتراك</span>
            </button>
          )}

          {/* Mobile navigation drawer toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border border-slate-100 hover:bg-slate-50 text-slate-600 cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </header>

      {/* Main Content & Navigation Shell */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row pb-16 md:pb-0">
        
        {/* Sidebar Navigation - Desktop */}
        <aside className="hidden md:block w-64 border-l border-slate-100 bg-white p-4 space-y-2 shrink-0">
          <div className="text-[10px] text-slate-400 font-bold px-3 pb-2 uppercase tracking-wider">الأقسام الرئيسية</div>
          
          <nav className="space-y-1">
            <button
              onClick={() => { setActiveTab('home'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'home' 
                  ? 'bg-navy text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
              }`}
            >
              <Compass className={`w-4 h-4 ${activeTab === 'home' ? 'text-gold' : 'text-navy'}`} />
              <span>الرئيسية</span>
            </button>

            <button
              onClick={() => { setActiveTab('horses'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'horses' 
                  ? 'bg-navy text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
              }`}
            >
              <Award className={`w-4 h-4 ${activeTab === 'horses' ? 'text-gold' : 'text-navy'}`} />
              <span>الخيول (بيع وإيجار)</span>
            </button>

            <button
              onClick={() => { setActiveTab('stables'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'stables' 
                  ? 'bg-navy text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
              }`}
            >
              <Home className={`w-4 h-4 ${activeTab === 'stables' ? 'text-gold' : 'text-navy'}`} />
              <span>الإسطبلات والمشروعات</span>
            </button>

            <button
              onClick={() => { setActiveTab('shelter'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'shelter' 
                  ? 'bg-navy text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${activeTab === 'shelter' ? 'text-gold' : 'text-navy'}`} />
              <span>خدمات الإيواء</span>
            </button>

            <button
              onClick={() => { setActiveTab('transport'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'transport' 
                  ? 'bg-navy text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
              }`}
            >
              <Truck className={`w-4 h-4 ${activeTab === 'transport' ? 'text-gold' : 'text-navy'}`} />
              <span>نقل الخيول والمقطورات</span>
            </button>

            {/* Admin navigation tab if user is Admin */}
            {isAdmin && (
              <>
                <div className="h-px bg-slate-100 my-4"></div>
                <div className="text-[10px] text-gold-dark font-extrabold px-3 pb-2 uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>لوحة الإدارة</span>
                </div>
                <button
                  onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'admin' 
                      ? 'bg-navy text-gold shadow-md border border-gold/30 font-black' 
                      : 'text-gold-dark bg-gold-light hover:bg-gold/20'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-gold-dark" />
                  <span>لوحة التحكم الإدارية</span>
                </button>

                <button
                  onClick={() => { setActiveTab('backup'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'backup' 
                      ? 'bg-navy text-white shadow-md' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
                  }`}
                >
                  <Cloud className={`w-4 h-4 ${activeTab === 'backup' ? 'text-gold' : 'text-navy'}`} />
                  <span>النسخ الاحتياطي (Drive)</span>
                </button>
              </>
            )}

            <div className="h-px bg-slate-100 my-4"></div>
            <div className="text-[10px] text-slate-400 font-bold px-3 pb-2 uppercase tracking-wider">المنصة والاتصال</div>

            <button
              onClick={() => { setActiveTab('terms'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'terms' 
                  ? 'bg-navy text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
              }`}
            >
              <FileText className={`w-4 h-4 ${activeTab === 'terms' ? 'text-gold' : 'text-navy'}`} />
              <span>الشروط والأحكام</span>
            </button>

            <button
              onClick={() => { setActiveTab('contact'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'contact' 
                  ? 'bg-navy text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
              }`}
            >
              <Mail className={`w-4 h-4 ${activeTab === 'contact' ? 'text-gold' : 'text-navy'}`} />
              <span>تواصل معنا</span>
            </button>
          </nav>
        </aside>

         {/* Mobile menu navigation drawer overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-black/60 z-30 pt-20 px-4">
            <div className="bg-white rounded-2xl p-4 space-y-3 shadow-2xl border border-slate-100 flex flex-col">
              
              {currentUser && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-navy text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 block">{currentUser.name}</span>
                      <span className="text-[10px] text-slate-500 block">@{currentUser.nickname} {isAdmin ? '(مدير النظام)' : currentUser.isGold ? '(عضوية ذهبية)' : ''}</span>
                      {isAdmin ? (
                        <div className="text-[10px] font-bold text-navy bg-navy/10 px-2.5 py-1 rounded-lg border border-navy/20 mt-1 inline-flex items-center gap-1">
                          <span>🛡️ مدير النظام: إعلانات غير محدودة</span>
                        </div>
                      ) : currentUser.isGold ? (
                        <div className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 mt-1 inline-flex items-center gap-1">
                          <span>👑 عضوية ذهبية: إعلانات غير محدودة</span>
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 mt-1 inline-flex items-center gap-1">
                          <span>المتبقي من الإعلانات المجانية اليومية:</span>
                          <span className="font-black text-emerald-900 bg-emerald-200/80 px-1.5 py-0.5 rounded">{remainingDailyAds} من {DAILY_FREE_ADS_LIMIT}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                    className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>خروج</span>
                  </button>
                </div>
              )}

              <span className="text-[10px] text-slate-400 font-bold pb-1 block border-b border-slate-50">الأقسام والخدمات</span>
              
              <button
                onClick={() => { setActiveTab('home'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'home' ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Compass className="w-4 h-4 text-gold" />
                <span>الرئيسية</span>
              </button>

              <button
                onClick={() => { setActiveTab('horses'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'horses' ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Award className="w-4 h-4 text-gold" />
                <span>الخيول (بيع وإيجار)</span>
              </button>

              <button
                onClick={() => { setActiveTab('stables'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'stables' ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Home className="w-4 h-4 text-gold" />
                <span>الإسطبلات والمشروعات</span>
              </button>

              <button
                onClick={() => { setActiveTab('shelter'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'shelter' ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <ShieldCheck className="w-4 h-4 text-gold" />
                <span>خدمات الإيواء</span>
              </button>

              <button
                onClick={() => { setActiveTab('transport'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'transport' ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Truck className="w-4 h-4 text-gold" />
                <span>نقل الخيول والمقطورات</span>
              </button>

              <button
                onClick={() => { setActiveTab('terms'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'terms' ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <FileText className="w-4 h-4 text-gold" />
                <span>الشروط والأحكام</span>
              </button>

              <button
                onClick={() => { setActiveTab('contact'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'contact' ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Mail className="w-4 h-4 text-gold" />
                <span>تواصل معنا</span>
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'admin' ? 'bg-navy text-gold font-black' : 'text-gold-dark bg-gold-light'}`}
                  >
                    <ShieldAlert className="w-4 h-4 text-gold-dark" />
                    <span>لوحة التحكم الإدارية</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('backup'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'backup' ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <Cloud className="w-4 h-4 text-gold" />
                    <span>النسخ الاحتياطي (Drive)</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Main Body Section Panel */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          
          {/* Mobile search bar */}
          {activeTab !== 'home' && activeTab !== 'terms' && activeTab !== 'contact' && (
            <div className="block md:hidden mb-4 relative">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-navy" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث عن إعلان في ملتقى الخيول العربية..."
                className="w-full text-xs pl-4 pr-10 py-2 border border-slate-200/60 rounded-xl focus:outline-none focus:border-navy bg-navy-light/40"
              />
            </div>
          )}

          {/* Conditional Sections Render */}
          {activeTab === 'home' && (
            <HomeSection onSelectTab={(tab) => setActiveTab(tab)} />
          )}

          {activeTab === 'horses' && (
            <HorsesSection 
              currentUser={currentUser} 
              onOpenAuth={() => setIsAuthOpen(true)} 
              searchQuery={searchQuery} 
              onAdCreated={refreshDailyAdsCount}
            />
          )}

          {activeTab === 'stables' && (
            <StablesSection 
              currentUser={currentUser} 
              onOpenAuth={() => setIsAuthOpen(true)} 
              searchQuery={searchQuery} 
              onAdCreated={refreshDailyAdsCount}
            />
          )}

          {activeTab === 'shelter' && (
            <ShelterSection 
              currentUser={currentUser} 
              onOpenAuth={() => setIsAuthOpen(true)} 
              searchQuery={searchQuery} 
              onAdCreated={refreshDailyAdsCount}
            />
          )}

          {activeTab === 'transport' && (
            <TransportSection 
              currentUser={currentUser} 
              onOpenAuth={() => setIsAuthOpen(true)} 
              searchQuery={searchQuery} 
              onAdCreated={refreshDailyAdsCount}
            />
          )}

          {activeTab === 'terms' && (
            <TermsSection />
          )}

          {activeTab === 'contact' && (
            <ContactSection />
          )}

          {activeTab === 'backup' && (
            <DriveBackupSection currentUser={currentUser} />
          )}

          {activeTab === 'admin' && currentUser && (
            <AdminControlSection 
              currentUser={currentUser} 
              onSiteSettingsUpdated={(updatedSettings) => {
                setSiteSettings(updatedSettings);
                FirebaseService.applySiteSettings(updatedSettings);
              }}
            />
          )}

        </main>

      </div>

      {/* Navigation - Bottom bar strictly for mobile experience */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-navy border-t border-navy-dark z-40 px-2 py-1 flex justify-around shadow-lg">
        
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'home' ? 'text-gold font-bold' : 'text-white/70 hover:text-white'}`}
        >
          <Compass className={`w-5 h-5 ${activeTab === 'home' ? 'text-gold' : 'text-white/70'}`} />
          <span className="text-[9px]">الرئيسية</span>
        </button>

        <button
          onClick={() => setActiveTab('horses')}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'horses' ? 'text-gold font-bold' : 'text-white/70 hover:text-white'}`}
        >
          <Award className={`w-5 h-5 ${activeTab === 'horses' ? 'text-gold' : 'text-white/70'}`} />
          <span className="text-[9px]">الخيول</span>
        </button>

        <button
          onClick={() => setActiveTab('stables')}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'stables' ? 'text-gold font-bold' : 'text-white/70 hover:text-white'}`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'stables' ? 'text-gold' : 'text-white/70'}`} />
          <span className="text-[9px]">الإسطبلات</span>
        </button>

        <button
          onClick={() => setActiveTab('shelter')}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'shelter' ? 'text-gold font-bold' : 'text-white/70 hover:text-white'}`}
        >
          <ShieldCheck className={`w-5 h-5 ${activeTab === 'shelter' ? 'text-gold' : 'text-white/70'}`} />
          <span className="text-[9px]">الإيواء</span>
        </button>

        <button
          onClick={() => setActiveTab('transport')}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'transport' ? 'text-gold font-bold' : 'text-white/70 hover:text-white'}`}
        >
          <Truck className={`w-5 h-5 ${activeTab === 'transport' ? 'text-gold' : 'text-white/70'}`} />
          <span className="text-[9px]">النقل</span>
        </button>

        <button
          onClick={() => setActiveTab('contact')}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'contact' ? 'text-gold font-bold' : 'text-white/70 hover:text-white'}`}
        >
          <Mail className={`w-5 h-5 ${activeTab === 'contact' ? 'text-gold' : 'text-white/70'}`} />
          <span className="text-[9px]">تواصل</span>
        </button>

      </footer>

      {/* Auth Modal wrapper */}
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onAuthSuccess={handleAuthSuccess} 
      />

      {/* User Profile Edit Modal wrapper */}
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileOpen}
          currentUser={currentUser}
          onClose={() => setIsProfileOpen(false)}
          onUpdateUser={(updatedUser) => {
            setCurrentUser(updatedUser);
            localStorage.setItem('horses_forum_session', JSON.stringify(updatedUser));
          }}
        />
      )}

      {/* Announcement Banner Modal */}
      <BannerModal banner={banner} />

    </div>
  );
}
