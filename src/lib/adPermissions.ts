/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from '../types';

/**
 * Checks whether the current user is authorized to edit, delete, or mark an ad as sold.
 * - System Admins ALWAYS have permission.
 * - Regular ad owners require an active (non-expired) 12-hour permission granted by the Admin.
 */
export function hasEditPermission(
  ad: { editPermissionExpiresAt?: string; userId?: string } | null | undefined,
  currentUser?: User | null
): boolean {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  if (!ad?.editPermissionExpiresAt) return false;

  const expiresTime = new Date(ad.editPermissionExpiresAt).getTime();
  if (isNaN(expiresTime)) return false;

  return expiresTime > Date.now();
}

/**
 * Calculates the remaining time on a 12-hour permission window.
 */
export function getEditPermissionRemaining(expiresAt?: string): {
  active: boolean;
  hours: number;
  minutes: number;
  text: string;
} {
  if (!expiresAt) {
    return { active: false, hours: 0, minutes: 0, text: '' };
  }

  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (isNaN(diffMs) || diffMs <= 0) {
    return { active: false, hours: 0, minutes: 0, text: '' };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let text = '';
  if (hours > 0) {
    text = `${hours} ساعة و ${minutes} دقيقة`;
  } else {
    text = `${minutes} دقيقة`;
  }

  return {
    active: true,
    hours,
    minutes,
    text
  };
}

/**
 * Checks whether an ad is verified by the admin.
 */
export function isAdVerified(ad: any): boolean {
  if (!ad) return false;
  return Boolean(ad.isVerified === true || ad.verified === 'verified');
}

/**
 * Translates ad category to human-readable Arabic.
 */
export function getAdCategoryTitle(category: string): string {
  switch (category) {
    case 'horse':
      return 'خيول للبيع والتأجير';
    case 'stable':
      return 'مرابط وإسطبلات';
    case 'shelter':
      return 'خدمات الإيواء';
    case 'transport':
      return 'نقل الخيول';
    default:
      return 'إعلان';
  }
}

/**
 * Extracts a friendly title for any ad type.
 */
export function getAdTitle(item: any): string {
  if (!item) return 'إعلان';
  return item.name || item.title || item.vehicleType || 'إعلان بدون عنوان';
}

/**
 * Generates a WhatsApp request URL with a polite, prefilled template
 * asking the platform administration for the 12-hour edit/delete/sold permission.
 */
export function generateWhatsAppEditRequestUrl(
  ad: any,
  category: string,
  adminWhatsApp: string = '966559595055',
  actionType: 'edit' | 'delete' | 'sold' | 'all' = 'all'
): string {
  const cleanPhone = (adminWhatsApp || '966559595055').replace(/[^0-9]/g, '');
  const finalPhone = cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : cleanPhone;

  const categoryName = getAdCategoryTitle(category);
  const title = getAdTitle(ad);
  const adId = ad?.id || 'غير معروف';
  const ownerName = ad?.userName || 'المعلن';
  const ownerPhone = ad?.phone || 'غير مسجل';

  let actionText = 'تعديل / حذف / تم البيع';
  if (actionType === 'edit') actionText = 'تعديل بيانات وصور الإعلان';
  else if (actionType === 'delete') actionText = 'حذف الإعلان نهائياً';
  else if (actionType === 'sold') actionText = 'تمييز الإعلان كمباع / مكتمل';

  const message = `السلام عليكم ورحمة الله وبركاته،
أرغب في الحصول على صلاحية (${actionText}) لإعلاني في منصة إستابلي:

📌 *بيانات الإعلان:*
• القسم: ${categoryName}
• عنوان الإعلان: ${title}
• كود/معرف الإعلان: ${adId}
• اسم المعلن: ${ownerName}
• رقم هاتف المعلن: ${ownerPhone}
• الإجراء المطلوب: ${actionText}

برجاء التكرم بالموافقة ومنح الصلاحية المؤقتة المتاحة (12 ساعة فقط) لتحديث الإعلان.
شاكرين لكم حسن تعاونكم.`;

  return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates a WhatsApp verification request URL
 * to request official ad verification or account verification from the platform management.
 */
export function generateWhatsAppVerificationRequestUrl(
  type: 'ad' | 'account' | 'all_ads',
  options: {
    ad?: any;
    category?: string;
    currentUser?: User | null;
    adminWhatsApp?: string;
    notes?: string;
  }
): string {
  const { ad, category = 'horse', currentUser, adminWhatsApp = '966559595055', notes } = options;
  const cleanPhone = (adminWhatsApp || '966559595055').replace(/[^0-9]/g, '');
  const finalPhone = cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : cleanPhone;

  let message = '';

  if (type === 'ad' && ad) {
    const categoryName = getAdCategoryTitle(category);
    const title = getAdTitle(ad);
    const adId = ad?.id || 'غير معروف';
    const ownerName = ad?.userName || currentUser?.name || 'المعلن';
    const ownerPhone = ad?.phone || currentUser?.phone || 'غير مسجل';

    message = `السلام عليكم ورحمة الله وبركاته،
أرغب في *طلب توثيق إعلان رسمي* في منصة إستابلي:

🛡️ *بيانات الإعلان المطلوب توثيقه:*
• القسم: ${categoryName}
• عنوان الإعلان: ${title}
• كود الإعلان: #${adId}
• اسم صاحب الإعلان: ${ownerName}
• رقم التواصل: ${ownerPhone}
${notes ? `• ملاحظات إضافية: ${notes}\n` : ''}
يرجى من الإدارة التكرم بمراجعة بيانات الإعلان وشهاداته ومنحه شارة التوثيق والاعتماد الرسمية.
شاكرين ومقدرين جهودكم.`;
  } else if (type === 'all_ads') {
    const userName = currentUser?.name || 'المعلن';
    const userPhone = currentUser?.phone || 'غير مسجل';
    const userEmail = currentUser?.email || 'غير مسجل';

    message = `السلام عليكم ورحمة الله وبركاته،
أرغب في *طلب توثيق ومراجعة إعلاناتي* في منصة إستابلي:

🛡️ *بيانات الحساب:*
• اسم المعلن: ${userName}
• رقم الهاتف: ${userPhone}
• البريد الإلكتروني: ${userEmail}
${notes ? `• تفاصيل الطلب: ${notes}\n` : ''}
يرجى من الإدارة التكرم بفحص إعلاناتي وتوثيقها لتظهر بشارة التوثيق المعتمدة في المنصة.
شاكرين لكم حسن التعاون.`;
  } else {
    // Account verification
    const userName = currentUser?.name || 'المعلن';
    const userPhone = currentUser?.phone || 'غير مسجل';
    const userEmail = currentUser?.email || 'غير مسجل';
    const city = currentUser?.city || 'المملكة العربية السعودية';

    message = `السلام عليكم ورحمة الله وبركاته،
أرغب في *طلب توثيق حسابي كمعلن معتمد* في منصة إستابلي:

🛡️ *بيانات الحساب:*
• اسم المستخدم: ${userName}
• رقم الهاتف / واتساب: ${userPhone}
• البريد الإلكتروني: ${userEmail}
• المدينة / المنطقة: ${city}
${notes ? `• ملاحظات التوثيق: ${notes}\n` : ''}
أرجو من إدارة المنصة التكرم بتوثيق حسابي ومنحي شارة التوثيق المعتمدة.
شكراً جزيلاً لكم.`;
  }

  return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
}
