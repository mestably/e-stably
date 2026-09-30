/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, SubscriptionCode } from '../types';
import { FirebaseService } from './firebase';

export const FREE_USER_ADS_LIMIT = 1;
export const ADMIN_WHATSAPP_NUMBER = '201010049450'; // 00201010049450
export const ADMIN_PHONE_DISPLAY = '00201010049450';
const RTDB_BASE_URL = 'https://horses-835f1-default-rtdb.asia-southeast1.firebasedatabase.app';

// Local storage key for fallback
const LOCAL_CODES_KEY = 'horses_forum_subscription_codes';

const getLocalCodes = (): SubscriptionCode[] => {
  try {
    const data = localStorage.getItem(LOCAL_CODES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const setLocalCodes = (codes: SubscriptionCode[]) => {
  try {
    localStorage.setItem(LOCAL_CODES_KEY, JSON.stringify(codes));
  } catch (e) {
    console.warn('Failed to save subscription codes to localStorage', e);
  }
};

export const SubscriptionService = {
  /**
   * Generates a unique, legible dynamic subscription code like EST-74921
   */
  generateDynamicCode(prefix: string = 'EST'): string {
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}-${randomDigits}`;
  },

  /**
   * Counts the total number of ads posted by a user across all 4 categories:
   * Horses, Stables, Shelters, Transports.
   */
  async getUserTotalAdsCount(userId: string): Promise<number> {
    if (!userId) return 0;
    try {
      const [horses, stables, shelters, transports] = await Promise.all([
        FirebaseService.getHorses(),
        FirebaseService.getStables(),
        FirebaseService.getShelters(),
        FirebaseService.getTransports()
      ]);

      let count = 0;
      horses.forEach(h => { if (h.userId === userId) count++; });
      stables.forEach(s => { if (s.userId === userId) count++; });
      shelters.forEach(sh => { if (sh.userId === userId) count++; });
      transports.forEach(t => { if (t.userId === userId) count++; });

      return count;
    } catch (e) {
      console.warn('Failed to count user total ads', e);
      // Fallback to local accessors
      const horses = FirebaseService.getLocalHorses();
      const stables = FirebaseService.getLocalStables();
      const shelters = FirebaseService.getLocalShelters();
      const transports = FirebaseService.getLocalTransports();
      return (
        horses.filter(h => h.userId === userId).length +
        stables.filter(s => s.userId === userId).length +
        shelters.filter(sh => sh.userId === userId).length +
        transports.filter(t => t.userId === userId).length
      );
    }
  },

  /**
   * Checks if user has reached their ad limit.
   * Free users: 1 ad only.
   * Subscribed / Gold / Admin: unlimited.
   */
  async canUserPostAd(user: User | null): Promise<{
    allowed: boolean;
    totalAds: number;
    limit: number;
    isUnlimited: boolean;
    reason?: string;
  }> {
    if (!user) {
      return {
        allowed: false,
        totalAds: 0,
        limit: FREE_USER_ADS_LIMIT,
        isUnlimited: false,
        reason: 'يرجى تسجيل الدخول أولاً لتتمكن من نشر إعلان.'
      };
    }

    const isUnlimited = user.role === 'admin' || !!user.isGold || !!user.isSubscribed;
    const totalAds = await this.getUserTotalAdsCount(user.id);

    if (isUnlimited) {
      return {
        allowed: true,
        totalAds,
        limit: Infinity,
        isUnlimited: true
      };
    }

    if (totalAds < FREE_USER_ADS_LIMIT) {
      return {
        allowed: true,
        totalAds,
        limit: FREE_USER_ADS_LIMIT,
        isUnlimited: false
      };
    }

    return {
      allowed: false,
      totalAds,
      limit: FREE_USER_ADS_LIMIT,
      isUnlimited: false,
      reason: `عذراً! بصفتك مستخدماً مجانياً، يحق لك نشر إعلان واحد فقط وقد قمت بنشره بالفعل (${totalAds} من ${FREE_USER_ADS_LIMIT}). لنشر إعلان آخر، يرجى ترقية اشتراكك أو إدخال كود اشتراك معتمد.`
    };
  },

  /**
   * Fetches all subscription codes from RTDB or local fallback
   */
  async getAllCodes(): Promise<SubscriptionCode[]> {
    try {
      const res = await fetch(`${RTDB_BASE_URL}/subscription_codes.json`, {
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          const list: SubscriptionCode[] = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));
          // Sort newest first
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setLocalCodes(list);
          return list;
        }
      }
    } catch (e) {
      console.warn('Failed to load subscription codes from cloud, using local cache', e);
    }
    return getLocalCodes();
  },

  /**
   * Saves or updates a subscription code in cloud and local cache
   */
  async saveCode(codeObj: SubscriptionCode): Promise<boolean> {
    try {
      const local = getLocalCodes();
      const idx = local.findIndex(c => c.id === codeObj.id || c.code.toUpperCase() === codeObj.code.toUpperCase());
      if (idx > -1) {
        local[idx] = { ...local[idx], ...codeObj };
      } else {
        local.unshift(codeObj);
      }
      setLocalCodes(local);

      // Save to cloud RTDB
      await fetch(`${RTDB_BASE_URL}/subscription_codes/${codeObj.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(codeObj),
        signal: AbortSignal.timeout(6000)
      });
      return true;
    } catch (e) {
      console.warn('Failed to persist code to cloud RTDB', e);
      return false;
    }
  },

  /**
   * User requests a dynamic subscription code to post an additional ad.
   * Generates a unique code, saves it as 'pending', and crafts a WhatsApp URL to management.
   */
  async requestSubscriptionCode(
    user: User,
    options?: { adType?: string; note?: string }
  ): Promise<{ code: SubscriptionCode; whatsappUrl: string; shareText: string }> {
    const dynamicCode = this.generateDynamicCode('EST');
    const nowIso = new Date().toISOString();
    const formattedDate = new Date().toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const codeObj: SubscriptionCode = {
      id: `code_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      code: dynamicCode,
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      userEmail: user.email,
      status: 'pending',
      allowedAdsCount: 1,
      usedAdsCount: 0,
      createdAt: nowIso,
      note: options?.note || `طلب كود إعلان إضافي (${options?.adType || 'إعلان جديد'})`
    };

    // Save locally and in RTDB
    await this.saveCode(codeObj);

    // Prepare WhatsApp message
    const shareText = `السلام عليكم ورحمة الله،
أرغب في الحصول على كود اشتراك لنشر إعلان إضافي في منصة إستابلي:
• كود الطلب المتغير: ${dynamicCode}
• اسم المستخدم: ${user.name}
• الهاتف: ${user.phone || 'غير مسجل'}
• البريد الإلكتروني: ${user.email}
• التوقيت: ${formattedDate}
نرجو من الإدارة الكريمة اعتماد وتفعيل هذا الكود حتى أتمكن من تنزيل إعلاني. شكراً لكم!`;

    const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(shareText)}`;

    return { code: codeObj, whatsappUrl, shareText };
  },

  /**
   * Generates a direct WhatsApp link for upgrading account to Gold or other tiers.
   */
  getUpgradeWhatsAppUrl(user?: User | null, tierName: string = 'العضوية الذهبية VIP (إعلانات غير محدودة)'): string {
    const userName = user?.name || 'مستخدم جديد';
    const userPhone = user?.phone || 'غير محدد';
    const userEmail = user?.email || 'غير محدد';

    const msg = `السلام عليكم ورحمة الله،
أرغب في ترقية اشتراكي في منصة إستابلي إلى:
🌟 ${tierName}
• الاسم: ${userName}
• الهاتف: ${userPhone}
• البريد الإلكتروني: ${userEmail}
يرجى إفادتي ببيانات السداد وخطوات التفعيل الفوري. شكراً جزيلاً!`;

    return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  },

  /**
   * Validates a code string without consuming it yet (for live UI verification in publishing form).
   */
  async validateCodeOnly(codeString: string): Promise<{
    valid: boolean;
    message: string;
    codeObj?: SubscriptionCode;
  }> {
    if (!codeString || !codeString.trim()) {
      return { valid: false, message: 'يرجى إدخال كود الاشتراك.' };
    }

    const clean = codeString.trim().toUpperCase();
    const allCodes = await this.getAllCodes();
    const found = allCodes.find(c => c.code.trim().toUpperCase() === clean);

    if (!found) {
      return {
        valid: false,
        message: 'عذراً! كود الاشتراك المدخل غير موجود في النظام. يرجى التأكد من كتابة الكود بشكل صحيح أو طلب كود جديد عبر واتساب الإدارة.'
      };
    }

    if (found.status === 'used') {
      return {
        valid: false,
        message: `عذراً! هذا الكود (${found.code}) تم استخدامه مسبقاً لنشر إعلان آخر ولا يمكن إعادة استخدامه.`
      };
    }

    if (found.status === 'pending') {
      return {
        valid: false,
        message: `هذا الكود (${found.code}) تم تسجيل طلبه وهو بانتظار اعتماد الإدارة عبر الواتساب. تواصل مع الإدارة لتفعيله فوراً.`
      };
    }

    if (found.status === 'active') {
      return {
        valid: true,
        message: 'كود اشتراك معتمد وصالح للاستخدام! يمكنك المتابعة ونشر الإعلان الآن.',
        codeObj: found
      };
    }

    return { valid: false, message: 'حالة الكود غير صالحة للاستخدام.' };
  },

  /**
   * Validates and consumes the code upon successful ad publication.
   */
  async redeemCodeForAd(
    codeString: string,
    userId: string,
    adId: string,
    adType: string
  ): Promise<{ success: boolean; message: string; codeObj?: SubscriptionCode }> {
    const validation = await this.validateCodeOnly(codeString);
    if (!validation.valid || !validation.codeObj) {
      return { success: false, message: validation.message };
    }

    const codeObj = validation.codeObj;
    codeObj.status = 'used';
    codeObj.usedAt = new Date().toISOString();
    codeObj.usedByAdId = adId;
    codeObj.usedByAdType = adType;
    codeObj.usedAdsCount = (codeObj.usedAdsCount || 0) + 1;

    await this.saveCode(codeObj);

    return {
      success: true,
      message: 'تم تفعيل كود الاشتراك واستهلاكه بنجاح لنشر هذا الإعلان.',
      codeObj
    };
  },

  /**
   * Admin: Approve a pending code to make it active so the user can publish their ad.
   */
  async adminApproveCode(codeId: string): Promise<boolean> {
    const all = await this.getAllCodes();
    const found = all.find(c => c.id === codeId);
    if (!found) return false;

    found.status = 'active';
    found.activatedAt = new Date().toISOString();
    return await this.saveCode(found);
  },

  /**
   * Admin: Mark code as used or deactivate
   */
  async adminRevokeCode(codeId: string): Promise<boolean> {
    const all = await this.getAllCodes();
    const found = all.find(c => c.id === codeId);
    if (!found) return false;

    found.status = 'used';
    return await this.saveCode(found);
  },

  /**
   * Admin: Delete code completely
   */
  async adminDeleteCode(codeId: string): Promise<boolean> {
    try {
      const local = getLocalCodes().filter(c => c.id !== codeId);
      setLocalCodes(local);
      await fetch(`${RTDB_BASE_URL}/subscription_codes/${codeId}.json`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(5000)
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Admin: Generate one or more ready-to-use active subscription codes
   */
  async adminGenerateBatchCodes(count: number = 1, prefix: string = 'EST', note?: string): Promise<SubscriptionCode[]> {
    const created: SubscriptionCode[] = [];
    for (let i = 0; i < count; i++) {
      const codeStr = this.generateDynamicCode(prefix);
      const codeObj: SubscriptionCode = {
        id: `code_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        code: codeStr,
        status: 'active',
        allowedAdsCount: 1,
        usedAdsCount: 0,
        createdAt: new Date().toISOString(),
        activatedAt: new Date().toISOString(),
        note: note || 'كود مولد مسبقاً من لوحة الإدارة'
      };
      await this.saveCode(codeObj);
      created.push(codeObj);
    }
    return created;
  }
};
