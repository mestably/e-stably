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
