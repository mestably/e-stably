/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, MessageSquare, CheckCircle, Clock, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { 
  hasEditPermission, 
  getEditPermissionRemaining, 
  generateWhatsAppEditRequestUrl 
} from '../lib/adPermissions';
import { useAdminContact } from '../lib/useAdminContact';

interface AdPermissionNoticeProps {
  ad: any;
  category: 'horse' | 'stable' | 'shelter' | 'transport';
  currentUser: User | null;
  compact?: boolean;
  className?: string;
  onGrantPermission?: (hours?: number) => void;
  onRevokePermission?: () => void;
}

export default function AdPermissionNotice({
  ad,
  category,
  currentUser,
  compact = false,
  className = '',
  onGrantPermission,
  onRevokePermission
}: AdPermissionNoticeProps) {
  const { adminWhatsApp } = useAdminContact();

  const isAdmin = currentUser?.role === 'admin';
  const isOwner = currentUser?.id && currentUser?.id === ad?.userId;

  // If neither admin nor owner, do not show ownership permission notices
  if (!isAdmin && !isOwner) {
    return null;
  }

  const isPermitted = hasEditPermission(ad, currentUser);
  const remaining = getEditPermissionRemaining(ad?.editPermissionExpiresAt);

  const whatsappUrl = generateWhatsAppEditRequestUrl(
    ad,
    category,
    adminWhatsApp || '966559595055',
    'all'
  );

  // --- ADMIN VIEW ---
  if (isAdmin) {
    return (
      <div className={`p-2 bg-slate-50 border border-slate-200 rounded-lg text-right ${className}`}>
        <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1 font-bold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-navy shrink-0" />
            <span>صلاحية التعديل (12 ساعة):</span>
            {remaining.active ? (
              <span className="text-emerald-700 font-mono font-black bg-emerald-100/80 px-1.5 py-0.5 rounded text-[9.5px]">
                مفعلة (متبقي {remaining.text})
              </span>
            ) : (
              <span className="text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded text-[9.5px]">
                غير مفعلة
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onGrantPermission && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGrantPermission(12);
                }}
                className="py-1 px-2 bg-navy hover:bg-navy-dark text-white rounded text-[9px] sm:text-[10px] font-bold transition cursor-pointer shadow-2xs"
                title="منح المعلن 12 ساعة للتعديل أو الحذف أو تمييز كمباع"
              >
                {remaining.active ? 'تمديد 12 ساعة ⏱️' : 'منح 12 ساعة ⏱️'}
              </button>
            )}
            {remaining.active && onRevokePermission && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRevokePermission();
                }}
                className="py-1 px-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[9px] font-bold transition cursor-pointer"
                title="إلغاء صلاحية التعديل فوراً"
              >
                إلغاء
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- REGULAR USER / OWNER VIEW ---
  if (isPermitted && remaining.active) {
    return (
      <div className={`p-2 sm:p-2.5 bg-emerald-50/90 border border-emerald-200/90 rounded-lg text-right ${className}`}>
        <div className="flex items-center justify-between gap-1.5 text-emerald-900 text-[10px] sm:text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>صلاحية التعديل والحذف مفعلة لك من الإدارة</span>
          </div>
          <span className="font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[9.5px] sm:text-[10.5px]">
            متبقي: {remaining.text}
          </span>
        </div>
        <p className="text-[9px] sm:text-[10px] text-emerald-800/80 mt-1">
          يمكنك الآن تعديل بيانات وصور الإعلان، أو حذفه، أو تمييزه كـ تم البيع خلال هذه المهلة.
        </p>
      </div>
    );
  }

  // User is Owner but does NOT have active permission:
  // Do not render static notice block on ad card; user triggers modal by clicking the action button.
  return null;
}
