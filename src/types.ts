/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string; // WhatsApp
  nickname: string;
  role: 'admin' | 'user';
  createdAt: string;
  city?: string;
  avatar?: string;
  bio?: string;
  isSuspended?: boolean;
  isVerified?: boolean;
  isGold?: boolean;
  isSubscribed?: boolean; // هل المستخدم لديه اشتراك مفعل
  subscriptionTier?: 'free' | 'silver' | 'gold' | 'platinum'; // باقة الاشتراك
  subscriptionExpiresAt?: string; // تاريخ انتهاء الاشتراك
  extraAdCredits?: number; // رصيد إعلانات إضافي متاح للمستخدم من الأكواد
  password?: string;
  authProvider?: 'google' | 'email';
  updatedAt?: string;
}

export interface SubscriptionCode {
  id: string;
  code: string; // مثل EST-84912
  userId?: string;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  status: 'pending' | 'active' | 'used'; // قيد الانتظار للتفعيل، نشط جاهز للاستخدام، تم استخدامه
  allowedAdsCount: number; // عدد الإعلانات المسموح بها بهذا الكود (افتراضيا 1)
  usedAdsCount: number; // عدد الإعلانات التي استخدمت الكود
  createdAt: string;
  activatedAt?: string;
  usedAt?: string;
  usedByAdId?: string;
  usedByAdType?: 'horse' | 'stable' | 'shelter' | 'transport' | string;
  note?: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number; // 1 to 5 stars
  comment: string;
  createdAt: string;
}

export interface Stable {
  id: string;
  userId: string;
  userName: string;
  name: string;
  description: string;
  phone: string;
  images: string[]; // Base64 or URLs
  verified: 'verified' | 'pending' | 'unverified';
  horseCount: number;
  rating: number;
  reviews?: Review[];
  isEnded?: boolean; // هل تم تمييز الإعلان كمنتهي / غير متاح / مكتمل الاستيعاب
  endedAt?: string;
  createdAt: string;
}

export interface Horse {
  id: string;
  userId: string;
  userName: string;
  adType: 'sale' | 'rent';
  name: string;
  damName: string;
  sireName: string;
  certificate: string; // certificate photo URL or Base64
  breed: 'arabian' | 'shabi' | 'sisi'; // عربي, شعبي, سيسي
  age: number;
  gender: 'stallion' | 'mare' | 'gelding'; // ذكر, أنثى, مخصى
  color: string;
  height?: string; // طول / ارتفاع الخيل (مثال: 152 سم)
  healthStatus: string;
  images: string[]; // Base64 or URLs
  stableId: string; // Associated stable ID (optional or manual entry)
  stableName?: string;
  phone?: string; // رقم هاتف التواصل المباشر
  price?: number; // Price or rent price
  rentType?: 'half_hour' | 'hour' | 'two_hour_trip' | 'day' | string; // نص ساعه, ساعه, رحلة ساعتان
  rentStart?: string;
  rentEnd?: string;
  isSold?: boolean; // هل تم البيع
  soldAt?: string; // تاريخ البيع
  rating?: number;
  reviews?: Review[];
  createdAt: string;
}

export interface Shelter {
  id: string;
  userId: string;
  userName: string;
  stableId: string; // Associated registered stable ID (required)
  stableName?: string; // Associated registered stable name
  title: string;
  description: string;
  type: 'monthly' | 'daily'; // شهري / يومي
  nutrition: boolean;
  cleaning: boolean;
  training: boolean;
  veterinary: boolean;
  phone: string;
  images: string[];
  rating: number;
  reviews?: Review[];
  isEnded?: boolean; // هل تم تمييز الإعلان كمنتهي / محجوز بالكامل / مكتمل
  endedAt?: string;
  createdAt: string;
}

export interface Transport {
  id: string;
  userId: string;
  userName: string;
  vehicleType: string;
  capacity: number;
  horseCount: number;
  date: string;
  price: number;
  pickupAddress: string;
  pickupCoords?: { lat: number; lng: number };
  deliveryAddress: string;
  deliveryCoords?: { lat: number; lng: number };
  images?: string[];
  phone?: string;
  description?: string;
  isEnded?: boolean; // هل تم تمييز الرحلة كمنتهية / تم النقل / مكتملة
  endedAt?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  message: string;
  createdAt: string;
}

export interface AnnouncementBanner {
  id: string;
  enabled: boolean;
  imageUrl: string;
  linkUrl?: string;
  title?: string;
  durationSeconds?: number; // Default 7
  updatedAt?: string;
}

export interface SiteSettings {
  id: string;
  siteName: string;
  siteDescription: string;
  logoUrl: string;
  updatedAt?: string;
  // Screensaver Settings
  screensaverEnabled?: boolean;
  screensaverTimeoutSeconds?: number;
  screensaverShowClock?: boolean;
  // Admin Contact & WhatsApp Settings
  adminPhone?: string; // e.g. '0559595055'
  adminWhatsApp?: string; // e.g. '966559595055'
}
