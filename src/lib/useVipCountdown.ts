/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { getVipRemainingTime, VipCountdownInfo } from './countdownHelper';

export function useVipCountdown(
  expiresAt?: string,
  fallbackStartDate?: string,
  enabled: boolean = true
): VipCountdownInfo {
  const [countdown, setCountdown] = useState<VipCountdownInfo>(() =>
    getVipRemainingTime(expiresAt, fallbackStartDate)
  );

  useEffect(() => {
    if (!enabled) return;

    // Immediate update
    setCountdown(getVipRemainingTime(expiresAt, fallbackStartDate));

    // Update every second for smooth countdown
    const interval = setInterval(() => {
      setCountdown(getVipRemainingTime(expiresAt, fallbackStartDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, fallbackStartDate, enabled]);

  return countdown;
}
