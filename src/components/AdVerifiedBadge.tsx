/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShieldCheck } from 'lucide-react';
import { isAdVerified } from '../lib/adPermissions';

interface AdVerifiedBadgeProps {
  item: any;
  variant?: 'compact' | 'badge' | 'banner';
  className?: string;
}

export default function AdVerifiedBadge({ item, variant = 'badge', className = '' }: AdVerifiedBadgeProps) {
  const verified = isAdVerified(item);
  if (!verified) return null;

  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500 text-white text-[8.5px] sm:text-[9.5px] font-black rounded-md shadow-2xs ${className}`}
        title="إعلان موثق رسمياً من الإدارة"
      >
        <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
        <span>موثق</span>
      </span>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        className={`bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 border border-amber-300/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-2xs ${className}`}
      >
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-black text-amber-950 flex items-center gap-1.5">
              <span>إعلان موثق ومعتمد رسمياً</span>
              <span className="text-[9px] sm:text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                موثق 🛡️
              </span>
            </div>
            <p className="text-[9.5px] sm:text-[11px] text-amber-900/80 mt-0.5 leading-tight">
              تم فحص وتوثيق صحة بيانات هذا الإعلان ومطابقتها من قبل إدارة المنصة لضمان أمان وموثوقية المعاملة.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default 'badge'
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] sm:text-[10px] font-black rounded-md shadow-2xs ${className}`}
      title="إعلان موثق رسمياً من إدارة المنصة"
    >
      <ShieldCheck className="w-3 h-3 shrink-0 text-amber-100" />
      <span>موثق رسمياً</span>
    </span>
  );
}
