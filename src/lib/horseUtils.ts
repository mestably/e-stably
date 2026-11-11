/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format horse age cleanly in Arabic with support for both years and months.
 * e.g. "3 سنوات و 6 أشهر", "سنة واحدة و شهران", "6 أشهر", "سنتان"
 */
export function formatHorseAge(
  age?: number | null,
  ageMonths?: number | null,
  ageYears?: number | null
): string {
  const years = ageYears !== undefined && ageYears !== null 
    ? Math.max(0, Math.floor(ageYears)) 
    : (age !== undefined && age !== null ? Math.max(0, Math.floor(age)) : 0);

  const months = ageMonths !== undefined && ageMonths !== null 
    ? Math.max(0, Math.floor(ageMonths)) 
    : 0;

  if (years === 0 && months === 0) {
    if (age !== undefined && age !== null && age > 0) {
      return `${age} ${age === 1 ? 'سنة' : age === 2 ? 'سنتان' : age <= 10 ? 'سنوات' : 'سنة'}`;
    }
    return 'غير محدد';
  }

  const parts: string[] = [];

  if (years > 0) {
    if (years === 1) parts.push('سنة واحدة');
    else if (years === 2) parts.push('سنتان');
    else if (years >= 3 && years <= 10) parts.push(`${years} سنوات`);
    else parts.push(`${years} سنة`);
  }

  if (months > 0) {
    if (months === 1) parts.push('شهر واحد');
    else if (months === 2) parts.push('شهران');
    else if (months >= 3 && months <= 10) parts.push(`${months} أشهر`);
    else parts.push(`${months} شهر`);
  }

  return parts.join(' و ');
}

/**
 * Checks if a rental horse's available date has passed.
 * Handles YYYY-MM-DD format as expiring at the end of that day.
 */
export function isHorseRentExpired(horse: { adType?: string; rentEnd?: string } | null | undefined): boolean {
  if (!horse || horse.adType !== 'rent' || !horse.rentEnd) return false;
  try {
    const raw = horse.rentEnd.trim();
    if (!raw) return false;
    // If date is YYYY-MM-DD, end of that day is 23:59:59
    const end = new Date(raw.includes('T') ? raw : `${raw}T23:59:59`);
    return !isNaN(end.getTime()) && Date.now() > end.getTime();
  } catch {
    return false;
  }
}

/**
 * Determines whether a horse ad is considered ended or sold.
 * Automatically marks rent horses as ended if their available rentEnd date has expired.
 */
export function isHorseEndedOrSold(horse: { adType?: string; isSold?: boolean; isEnded?: boolean; rentEnd?: string } | null | undefined): boolean {
  if (!horse) return false;
  if (horse.adType === 'rent') {
    return !!(horse.isEnded || horse.isSold || isHorseRentExpired(horse));
  }
  return !!horse.isSold;
}
