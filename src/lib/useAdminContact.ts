/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { getStoredAdminPhone, getStoredAdminWhatsApp } from './subscriptionService';

export function useAdminContact() {
  const [adminPhone, setAdminPhone] = useState<string>(getStoredAdminPhone);
  const [adminWhatsApp, setAdminWhatsApp] = useState<string>(getStoredAdminWhatsApp);

  useEffect(() => {
    const updateNumbers = (e?: any) => {
      if (e?.detail) {
        if (e.detail.adminPhone) setAdminPhone(e.detail.adminPhone);
        if (e.detail.adminWhatsApp) setAdminWhatsApp(e.detail.adminWhatsApp);
      } else {
        setAdminPhone(getStoredAdminPhone());
        setAdminWhatsApp(getStoredAdminWhatsApp());
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('site_settings_changed', updateNumbers);
      window.addEventListener('storage', updateNumbers);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('site_settings_changed', updateNumbers);
        window.removeEventListener('storage', updateNumbers);
      }
    };
  }, []);

  return { adminPhone, adminWhatsApp };
}
