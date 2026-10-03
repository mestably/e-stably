/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VipCountdownInfo {
  isExpired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedShort: string;     // e.g. "29 يوم" or "18 ساعة"
  formattedDetailed: string;  // e.g. "متبقي: 29 يوم و 14 ساعة"
}

export function getVipRemainingTime(expiresAt?: string, fallbackStartDate?: string): VipCountdownInfo {
  let targetTime: number;
  
  if (expiresAt && !isNaN(new Date(expiresAt).getTime())) {
    targetTime = new Date(expiresAt).getTime();
  } else if (fallbackStartDate && !isNaN(new Date(fallbackStartDate).getTime())) {
    // Fallback: 30 days from fallback start
    targetTime = new Date(fallbackStartDate).getTime() + 30 * 24 * 60 * 60 * 1000;
  } else {
    // Default 30 days from current timestamp
    targetTime = Date.now() + 30 * 24 * 60 * 60 * 1000;
  }

  const diff = targetTime - Date.now();

  if (diff <= 0) {
    return {
      isExpired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formattedShort: 'منتهي الصلاحية',
      formattedDetailed: 'انتهت صلاحية العضوية الذهبية'
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let formattedShort = '';
  let formattedDetailed = '';

  if (days > 0) {
    formattedShort = `${days} يوم`;
    formattedDetailed = `متبقي: ${days} يوم و ${hours} ساعة`;
  } else if (hours > 0) {
    formattedShort = `${hours} ساعة`;
    formattedDetailed = `متبقي: ${hours} ساعة و ${minutes} دقيقة`;
  } else {
    formattedShort = `${minutes} دقيقة`;
    formattedDetailed = `متبقي: ${minutes} دقيقة و ${seconds} ثانية`;
  }

  return {
    isExpired: false,
    days,
    hours,
    minutes,
    seconds,
    formattedShort,
    formattedDetailed
  };
}
