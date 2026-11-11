import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Check, ExternalLink, X, Clock, MessageCircle, ArrowLeft } from 'lucide-react';
import { AdNotification, User as AppUser } from '../types';
import { FirebaseService } from '../lib/firebase';
import RatingStars from './RatingStars';

interface AdNotificationCenterProps {
  currentUser: AppUser | null;
  onOpenAd: (adId: string, adType: 'horse' | 'stable' | 'shelter' | 'transport', reviewId?: string) => void;
  className?: string;
}

export const AdNotificationCenter: React.FC<AdNotificationCenterProps> = ({
  currentUser,
  onOpenAd,
  className = ''
}) => {
  const [notifications, setNotifications] = useState<AdNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }
    try {
      const data = await FirebaseService.getAdNotifications(currentUser.id);
      setNotifications(data || []);
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const handleUpdate = () => {
      fetchNotifications();
    };

    window.addEventListener('ad_notifications_changed', handleUpdate);
    const interval = setInterval(fetchNotifications, 10000);

    return () => {
      window.removeEventListener('ad_notifications_changed', handleUpdate);
      clearInterval(interval);
    };
  }, [currentUser?.id]);

  // Close dropdown on outside click (for desktop)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!currentUser) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (notif: AdNotification) => {
    try {
      if (!notif.read) {
        await FirebaseService.markNotificationAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      }
      setIsOpen(false);
      onOpenAd(notif.adId, notif.adType, notif.id);
    } catch (e) {
      console.error(e);
      setIsOpen(false);
      onOpenAd(notif.adId, notif.adType, notif.id);
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      await FirebaseService.markAllNotificationsAsRead(currentUser.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.warn('Error marking all as read:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (isoDate: string) => {
    try {
      const diffMs = Date.now() - new Date(isoDate).getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      if (diffMin < 1) return 'الآن';
      if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      const diffDays = Math.floor(diffHours / 24);
      return `منذ ${diffDays} يوم`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Red Notification Message Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-1.5 sm:p-2 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 ${
          unreadCount > 0
            ? 'bg-red-50 text-red-600 border border-red-300 hover:bg-red-100 shadow-sm animate-pulse'
            : 'text-slate-500 hover:text-red-600 hover:bg-red-50/70 border border-transparent'
        }`}
        title={
          unreadCount > 0
            ? `لديك ${unreadCount} تعليق جديد على إعلاناتك!`
            : 'إشعارات التعليقات على إعلاناتك'
        }
        aria-label="إشعارات التعليقات"
      >
        <MessageSquare
          className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${
            unreadCount > 0 ? 'text-red-600 fill-red-100' : 'text-slate-600'
          }`}
        />

        {/* Red Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-md border-2 border-white animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Mobile Backdrop Overlay (only on mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 sm:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Dropdown Menu / Responsive Modal */}
      {isOpen && (
        <div
          className="fixed inset-x-3 top-16 max-h-[82vh] sm:max-h-[520px] sm:top-full sm:inset-x-auto sm:right-0 sm:left-auto sm:mt-2 w-auto sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 origin-top"
          dir="rtl"
        >
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-red-50 via-white to-red-50/60 border-b border-red-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 leading-tight">
                  إشعارات التعليقات والرسائل
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} تعليق جديد بحاجة لقراءتك` : 'لا توجد تعليقات غير مقروءة'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="text-[10px] font-bold text-red-700 hover:text-red-800 bg-red-100 hover:bg-red-200 px-2 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="تحديد الكل كمقروء"
                >
                  <Check className="w-3 h-3" />
                  <span>تحديد الكل</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 overscroll-contain">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 text-red-400 flex items-center justify-center mb-2.5">
                  <MessageSquare className="w-7 h-7 stroke-[1.5]" />
                </div>
                <p className="text-sm font-bold text-slate-800">لا توجد إشعارات حتى الآن</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                  عندما يترك أحد المستخدمين تعليقاً على أي من إعلاناتك، سيصلك إشعار فوري هنا باللون الأحمر.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 hover:bg-red-50/30 transition cursor-pointer flex items-start gap-3 relative ${
                    !notif.read ? 'bg-red-50/40 font-medium' : 'bg-white'
                  }`}
                >
                  {/* Unread red dot indicator */}
                  {!notif.read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0 mt-1 animate-pulse" />
                  )}

                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Commenter info & time */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-900 truncate">
                        {notif.commenterName}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0 font-sans">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    {/* Target Ad Title and rating */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-medium">علّق على إعلان:</span>
                      <span className="text-[11px] font-bold text-navy truncate max-w-[170px] sm:max-w-[200px]">
                        {notif.adTitle}
                      </span>
                      {notif.rating > 0 && (
                        <div className="mr-auto shrink-0">
                          <RatingStars
                            rating={notif.rating}
                            reviewsCount={1}
                            variant="compact"
                            size="xs"
                            showCount={false}
                          />
                        </div>
                      )}
                    </div>

                    {/* Comment quote */}
                    <p className="text-xs text-slate-700 bg-white border border-slate-200/80 p-2.5 rounded-xl leading-relaxed shadow-2xs italic line-clamp-3">
                      "{notif.commentText}"
                    </p>

                    {/* Call to action bar */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-red-600 hover:text-red-700">
                        <span>فتح الإعلان والتعليق</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </span>
                      {!notif.read && (
                        <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">
                          جديد
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center shrink-0">
              <span className="text-[10px] text-slate-500 font-medium">
                💡 اضغط على الإشعار للانتقال مباشرة للتعليق داخل الإعلان
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdNotificationCenter;
