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
  isVerified?: boolean; // هل الإعلان موثق رسمياً من الإدارة
  verifiedAt?: string; // تاريخ التوثيق
  editPermissionExpiresAt?: string; // تاريخ ووقت انتهاء صلاحية التعديل والحذف (12 ساعة)
  horseCount: number;
  rating: number;
  reviews?: Review[];
  isEnded?: boolean; // هل تم تمييز الإعلان كمنتهي / غير متاح / مكتمل الاستيعاب
  endedAt?: string;
  isPendingEditApproval?: boolean; // هل الإعلان في انتظار موافقة الإدارة على التعديلات
  pendingEditAt?: string; // تاريخ ووقت تقديم التعديلات
  pendingEditNotes?: string; // ملاحظات أو ملخص التعديلات
  pendingEditData?: any; // البيانات والتعديلات المقترحة المحفوظة لحين موافقة الإدارة
  createdAt: string;
  updatedAt?: string; // تاريخ آخر تعديل
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
  ageYears?: number; // العمر بالسنوات
  ageMonths?: number; // العمر بالشهور (0-11)
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
  isVerified?: boolean; // هل الإعلان موثق رسمياً من الإدارة
  verifiedAt?: string; // تاريخ التوثيق
  editPermissionExpiresAt?: string; // تاريخ ووقت انتهاء صلاحية التعديل والحذف (12 ساعة)
  rating?: number;
  reviews?: Review[];
  isPendingEditApproval?: boolean; // هل الإعلان في انتظار موافقة الإدارة على التعديلات
  pendingEditAt?: string; // تاريخ ووقت تقديم التعديلات
  pendingEditNotes?: string; // ملاحظات أو ملخص التعديلات
  pendingEditData?: any; // البيانات والتعديلات المقترحة المحفوظة لحين موافقة الإدارة
  createdAt: string;
  updatedAt?: string; // تاريخ آخر تعديل
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
  isVerified?: boolean; // هل الإعلان موثق رسمياً من الإدارة
  verifiedAt?: string; // تاريخ التوثيق
  editPermissionExpiresAt?: string; // تاريخ ووقت انتهاء صلاحية التعديل والحذف (12 ساعة)
  isPendingEditApproval?: boolean; // هل الإعلان في انتظار موافقة الإدارة على التعديلات
  pendingEditAt?: string; // تاريخ ووقت تقديم التعديلات
  pendingEditNotes?: string; // ملاحظات أو ملخص التعديلات
  pendingEditData?: any; // البيانات والتعديلات المقترحة المحفوظة لحين موافقة الإدارة
  createdAt: string;
  updatedAt?: string; // تاريخ آخر تعديل
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
  isVerified?: boolean; // هل الإعلان موثق رسمياً من الإدارة
  verifiedAt?: string; // تاريخ التوثيق
  editPermissionExpiresAt?: string; // تاريخ ووقت انتهاء صلاحية التعديل والحذف (12 ساعة)
  isPendingEditApproval?: boolean; // هل الإعلان في انتظار موافقة الإدارة على التعديلات
  pendingEditAt?: string; // تاريخ ووقت تقديم التعديلات
  pendingEditNotes?: string; // ملاحظات أو ملخص التعديلات
  pendingEditData?: any; // البيانات والتعديلات المقترحة المحفوظة لحين موافقة الإدارة
  createdAt: string;
  updatedAt?: string; // تاريخ آخر تعديل
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

export interface ArchivedDeletedAd {
  id: string;
  originalId: string;
  category: 'horse' | 'stable' | 'shelter' | 'transport';
  userId: string;
  userName?: string;
  title: string;
  images?: string[];
  price?: number;
  createdAt: string;
  deletedAt: string;
  reason?: string;
  data: any;
}

export interface BankReceipt {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  userEmail?: string;
  bankName: string; // 'حساب بنك فيصل الإسلامي' | 'حساب البنك السعودي'
  accountNumber: string; // '8542412232100' | '21546522122'
  images: string[]; // Base64 or URLs (صورة إيداع الحساب - يمكن عدد من الصور)
  purpose: string; // الغرض من التحويل / دفع الحساب
  amount?: number; // المبلغ المحول بالريال
  transferDate?: string; // تاريخ التحويل
  notes?: string; // تفاصيل أو ملاحظات إضافية
  status: 'pending' | 'approved' | 'rejected'; // حالة المراجعة من الإدارة
  createdAt: string; // تاريخ ووقت رفع الإيصال
  reviewedAt?: string; // تاريخ مراجعة الإدارة
  adminNotes?: string; // ملاحظة الإدارة عند المراجعة
}

export interface PlatformBankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  iban?: string;
  accountHolder: string;
  currency: string;
  colorScheme: 'emerald' | 'amber';
  badge: string;
}

export const PLATFORM_BANK_ACCOUNTS: PlatformBankAccount[] = [
  {
    id: 'faisal_islamic_bank',
    bankName: 'حساب بنك فيصل الإسلامي',
    accountNumber: '8542412232100',
    iban: 'EG8542412232100',
    accountHolder: 'منصة إستابلي لخدمات الخيل',
    currency: 'ريال / جنيه',
    colorScheme: 'emerald',
    badge: 'حساب معتمد ورسمي'
  },
  {
    id: 'saudi_bank',
    bankName: 'حساب البنك السعودي',
    accountNumber: '21546522122',
    iban: 'SA21546522122',
    accountHolder: 'منصة إستابلي لخدمات الخيل',
    currency: 'ريال سعودي (SAR)',
    colorScheme: 'amber',
    badge: 'حساب معتمد ورسمي'
  }
];
