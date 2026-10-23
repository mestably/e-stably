/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, X, MessageCircle, Clock } from 'lucide-react';
import { generateWhatsAppEditRequestUrl, getAdTitle, getAdCategoryTitle } from '../lib/adPermissions';

interface AdActionPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ad: any;
  category: 'horse' | 'stable' | 'shelter' | 'transport';
  action: 'edit' | 'delete' | 'sold';
  adminWhatsApp?: string;
}

export default function AdActionPermissionModal({
  isOpen,
  onClose,
  ad,
  category,
  action,
  adminWhatsApp = '966559595055'
}: AdActionPermissionModalProps) {
  if (!isOpen || !ad) return null;

  const actionLabel =
    action === 'edit'
      ? 'تعديل الإعلان'
      : action === 'delete'
      ? 'حذف الإعلان'
      : category === 'horse'
      ? 'تمييز كمباع (تم البيع)'
      : 'تمييز كـ منتهي / مكتمل';

  const actionDescription =
    action === 'edit'
      ? 'تعديل بيانات أو صور أو سعر الإعلان'
      : action === 'delete'
      ? 'حذف الإعلان ونقله إلى سجل المحذوفات'
      : 'تغيير حالة الإعلان إلى تم البيع أو إتاحة';

  const title = getAdTitle(ad);
  const categoryName = getAdCategoryTitle(category);
  const whatsappUrl = generateWhatsAppEditRequestUrl(ad, category, adminWhatsApp, action);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col text-right animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-200 shrink-0" />
            <h3 className="font-extrabold text-sm sm:text-base">طلب صلاحية مؤقتة (12 ساعة)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg text-white transition cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          
          {/* Main User Notification Required Text */}
          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-950 font-bold leading-relaxed shadow-2xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11.5px] sm:text-xs">
              لتعديل او حذف او تم البيع للاعلان برجاء الضغط لارسال طلب للاداره وبعد الموافقه يكون الصلاحيه المتاحه للتعديل او الحذف او تميز كمباع تكون فى خلال 12 ساعه فقط
            </p>
          </div>

          {/* Ad & Requested Action Summary */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">القسم: {categoryName}</span>
              <span className="text-[10.5px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                #{ad.id}
              </span>
            </div>

            <div className="font-extrabold text-slate-900 text-xs sm:text-sm line-clamp-1">
              {title}
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-600 font-semibold">الإجراء المطلوب:</span>
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black border ${
                action === 'edit'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : action === 'delete'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}>
                {actionLabel}
              </span>
            </div>

            <div className="text-[10px] text-slate-500 italic">
              {actionDescription}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>إرسال طلب الصلاحية للإدارة عبر الواتساب (12 ساعة)</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              إلغاء التراجع
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
