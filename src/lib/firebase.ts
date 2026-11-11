/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Stable, Horse, Shelter, Transport, User, ChatMessage, Review, AnnouncementBanner, SiteSettings, ArchivedDeletedAd, BankReceipt, AdNotification } from '../types';

const RTDB_BASE_URL = 'https://horses-835f1-default-rtdb.asia-southeast1.firebasedatabase.app';

// Helper to check if we can reach the database
async function checkNetwork(): Promise<boolean> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/site_settings.json?shallow=true`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Local storage fallback helper
const getLocal = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(`horses_forum_${key}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const setLocal = <T>(key: string, data: T[]) => {
  try {
    localStorage.setItem(`horses_forum_${key}`, JSON.stringify(data));
  } catch (err) {
    console.warn(`Local storage quota exceeded or disabled for ${key}`, err);
  }
};

const getDeletedIds = (): string[] => {
  try {
    const data = localStorage.getItem(`horses_forum_deleted_ids`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const addDeletedId = (id: string) => {
  try {
    const list = getDeletedIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(`horses_forum_deleted_ids`, JSON.stringify(list));
    }
  } catch {}
};

// Global cache of deleted IDs fetched from cloud
let cloudDeletedIdsSet = new Set<string>();

async function fetchCloudDeletedIds(): Promise<Set<string>> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/deleted_records.json`, {
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(id => {
          cloudDeletedIdsSet.add(id);
          addDeletedId(id);
        });
      }
    }
  } catch (e) {
    // Network offline or timeout, use local deleted IDs
  }
  return cloudDeletedIdsSet;
}

// In-flight request deduplication map to prevent multiple parallel downloads of the same collection
const inFlightRequests = new Map<string, Promise<any>>();

// Helper function to sort any array of items descending by createdAt (newest first)
function sortDescendingByDate<T extends { createdAt?: string; updatedAt?: string }>(items: T[]): T[] {
  return items.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    const upA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const upB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return upB - upA;
  });
}

// --- GENERIC FIREBASE RTDB FETCH ---
async function getCollection<T extends { id: string; updatedAt?: string; createdAt?: string }>(nodeName: string): Promise<T[]> {
  // If a request for this collection is already ongoing, share the promise
  if (inFlightRequests.has(nodeName)) {
    return inFlightRequests.get(nodeName)!;
  }

  const fetchPromise = (async (): Promise<T[]> => {
    try {
      // Fetch cloud data and cloud deleted records with 15s timeout and no-store
      const [response, cloudDeletedSet] = await Promise.all([
        fetch(`${RTDB_BASE_URL}/${nodeName}.json`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
        }),
        fetchCloudDeletedIds(),
      ]);

      if (!response.ok) {
        throw new Error(`Database response not ok: ${response.status}`);
      }

      const data = await response.json();
      const localDeleted = new Set(getDeletedIds());

      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        // Server has no items in this collection
        setLocal(nodeName, []);
        return [];
      }

      const serverItems: T[] = Object.keys(data).map((key) => {
        const item = data[key];
        return {
          id: key,
          ...item,
        };
      });

      // Filter out any items that have been marked as deleted
      const validServerItems = serverItems.filter(
        (item) => !cloudDeletedSet.has(item.id) && !localDeleted.has(item.id)
      );

      // Enforce newest-first order
      sortDescendingByDate(validServerItems);

      // Save the authentic cloud items to local cache to keep cache in sync
      setLocal(nodeName, validServerItems);
      return validServerItems;
    } catch (error) {
      console.warn(`Firebase RTDB fetch failed for ${nodeName}, using local cache`, error);
      const deletedIds = getDeletedIds();
      const local = getLocal<T>(nodeName).filter((item) => !deletedIds.includes(item.id) && !cloudDeletedIdsSet.has(item.id));
      return sortDescendingByDate(local);
    } finally {
      // Clear in-flight promise after a short cooldown to coalesce rapid consecutive calls
      setTimeout(() => {
        inFlightRequests.delete(nodeName);
      }, 300);
    }
  })();

  inFlightRequests.set(nodeName, fetchPromise);
  return fetchPromise;
}

async function saveDocument<T extends { id: string; email?: string; updatedAt?: string; createdAt?: string }>(nodeName: string, doc: T): Promise<boolean> {
  // Update timestamp to ensure LWW consistency
  doc.updatedAt = new Date().toISOString();

  // If this ID was previously marked deleted, unmark it
  cloudDeletedIdsSet.delete(doc.id);
  const deleted = getDeletedIds().filter(id => id !== doc.id);
  try {
    localStorage.setItem(`horses_forum_deleted_ids`, JSON.stringify(deleted));
  } catch {}

  const local = getLocal<T>(nodeName);
  const existingIndex = local.findIndex((item) => {
    if (item.id === doc.id) return true;
    if (nodeName === 'users' && item.email && doc.email && item.email.toLowerCase() === doc.email.toLowerCase()) return true;
    return false;
  });

  if (existingIndex > -1) {
    const existing = local[existingIndex] as any;
    // CRITICAL: For user accounts, never erase an existing nationalId if the incoming doc has undefined nationalId
    if (nodeName === 'users' && existing.nationalId && !(doc as any).nationalId) {
      (doc as any).nationalId = existing.nationalId;
    }
    local[existingIndex] = { ...existing, ...doc };
  } else {
    local.unshift(doc);
  }
  sortDescendingByDate(local);
  setLocal(nodeName, local);

  // Attempt sync to cloud with retry up to 3 times
  let savedToCloud = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${RTDB_BASE_URL}/${nodeName}/${doc.id}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(doc),
        signal: AbortSignal.timeout(12000),
      });

      if (response.ok) {
        savedToCloud = true;
        // Also remove from deleted_records on cloud if it existed
        fetch(`${RTDB_BASE_URL}/deleted_records/${doc.id}.json`, {
          method: 'DELETE',
        }).catch(() => {});
        break;
      }
    } catch (e) {
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 600 * attempt));
      }
    }
  }

  // Broadcast sync event to all local components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('horses_forum_sync_complete', {
      detail: { [nodeName]: local }
    }));
  }

  return savedToCloud;
}

async function archiveDeletedAdRecord(archivedAd: ArchivedDeletedAd): Promise<void> {
  try {
    const local = getLocal<ArchivedDeletedAd>('deleted_ads_archive');
    const filtered = local.filter(a => a.id !== archivedAd.id && a.originalId !== archivedAd.originalId);
    filtered.unshift(archivedAd);
    setLocal('deleted_ads_archive', filtered);

    await fetch(`${RTDB_BASE_URL}/deleted_ads_archive/${archivedAd.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(archivedAd)
    }).catch(() => {});
  } catch (e) {
    console.warn('Archiving deleted ad failed:', e);
  }
}

async function deleteDocument(nodeName: string, docId: string): Promise<boolean> {
  // Record deletion locally and in memory
  addDeletedId(docId);
  cloudDeletedIdsSet.add(docId);

  const local = getLocal<any>(nodeName);
  const itemToArchive = local.find((item) => item.id === docId);

  // If this is an ad from horses, stables, shelters, or transports, archive it for user dashboard
  if (itemToArchive && (nodeName === 'horses' || nodeName === 'stables' || nodeName === 'shelters' || nodeName === 'transports')) {
    const category = nodeName === 'horses' ? 'horse' : nodeName === 'stables' ? 'stable' : nodeName === 'shelters' ? 'shelter' : 'transport';
    const title = itemToArchive.name || itemToArchive.title || itemToArchive.vehicleType || 'إعلان';
    const archivedAd: ArchivedDeletedAd = {
      id: `del_${docId}`,
      originalId: docId,
      category,
      userId: itemToArchive.userId || '',
      userName: itemToArchive.userName || '',
      title,
      images: itemToArchive.images || [],
      price: itemToArchive.price,
      createdAt: itemToArchive.createdAt || new Date().toISOString(),
      deletedAt: new Date().toISOString(),
      data: itemToArchive
    };
    archiveDeletedAdRecord(archivedAd);
  }

  const updated = local.filter((item) => item.id !== docId);
  setLocal(nodeName, updated);

  try {
    // 1. Delete the item from RTDB
    const deletePromise = fetch(`${RTDB_BASE_URL}/${nodeName}/${docId}.json`, {
      method: 'DELETE',
    });

    // 2. Put tombstone in deleted_records so ALL devices know this item is deleted
    const tombstonePromise = fetch(`${RTDB_BASE_URL}/deleted_records/${docId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: docId,
        node: nodeName,
        deletedAt: new Date().toISOString()
      }),
    });

    const [deleteRes] = await Promise.all([deletePromise, tombstonePromise]);

    if (!deleteRes.ok) {
      throw new Error('Delete failed');
    }
    return true;
  } catch (error) {
    console.warn(`Firebase RTDB delete failed for ${nodeName}/${docId}, deleted locally`, error);
    return false;
  }
}

async function syncLocalToCloud<T extends { id: string }>(nodeName: string, items: T[]): Promise<void> {
  try {
    for (const item of items) {
      await fetch(`${RTDB_BASE_URL}/${nodeName}/${item.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
    }
  } catch (e) {
    console.error('Bulk sync failed', e);
  }
}

export const DAILY_FREE_ADS_LIMIT = 1;

export const FirebaseService = {
  // --- DAILY ADS LIMIT HELPER (1 Free Ad every 24 Hours) ---
  async getUserTodayAdsCount(userId: string): Promise<number> {
    if (!userId) return 0;
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    try {
      const [horses, stables, shelters, transports] = await Promise.all([
        this.getHorses(),
        this.getStables(),
        this.getShelters(),
        this.getTransports()
      ]);

      let count = 0;
      const isWithin24Hours = (createdAt?: string) => {
        if (!createdAt) return false;
        try {
          const t = new Date(createdAt).getTime();
          return !isNaN(t) && (now - t < TWENTY_FOUR_HOURS_MS);
        } catch {
          return false;
        }
      };

      horses.forEach(h => { if (h.userId === userId && isWithin24Hours(h.createdAt)) count++; });
      stables.forEach(s => { if (s.userId === userId && isWithin24Hours(s.createdAt)) count++; });
      shelters.forEach(sh => { if (sh.userId === userId && isWithin24Hours(sh.createdAt)) count++; });
      transports.forEach(t => { if (t.userId === userId && isWithin24Hours(t.createdAt)) count++; });

      return count;
    } catch {
      return 0;
    }
  },
  // --- UTILS ---
  initFallbackData() {
    if (localStorage.getItem('horses_forum_initialized_v2')) return;

    const sampleUsers: User[] = [
      {
        id: 'admin_mfc',
        name: 'المدير العام (MFC)',
        email: 'mfc@m-estably.com',
        phone: '0559595055',
        nickname: 'mfc',
        password: '1155',
        role: 'admin',
        isVerified: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'admin_user',
        name: 'المدير العام للمنصة',
        email: 'admin@m-estably.com',
        phone: '0559595055',
        nickname: 'admin',
        password: 'admin',
        role: 'admin',
        isVerified: true,
        createdAt: new Date().toISOString()
      }
    ];

    const existingUsers = getLocal<User>('users');
    if (existingUsers.length === 0) {
      setLocal('users', sampleUsers);
    }
    
    localStorage.setItem('horses_forum_initialized_v2', 'true');
  },

  // --- STABLES API ---
  async getStables(): Promise<Stable[]> {
    return getCollection<Stable>('stables');
  },

  async saveStable(stable: Stable): Promise<boolean> {
    return saveDocument<Stable>('stables', stable);
  },

  async deleteStable(id: string): Promise<boolean> {
    return deleteDocument('stables', id);
  },

  // --- HORSES API ---
  async getHorses(): Promise<Horse[]> {
    return getCollection<Horse>('horses');
  },

  async saveHorse(horse: Horse): Promise<boolean> {
    return saveDocument<Horse>('horses', horse);
  },

  async deleteHorse(id: string): Promise<boolean> {
    return deleteDocument('horses', id);
  },

  // --- SHELTERS API ---
  async getShelters(): Promise<Shelter[]> {
    return getCollection<Shelter>('shelters');
  },

  async saveShelter(shelter: Shelter): Promise<boolean> {
    return saveDocument<Shelter>('shelters', shelter);
  },

  async deleteShelter(id: string): Promise<boolean> {
    return deleteDocument('shelters', id);
  },

  // --- TRANSPORTS API ---
  async getTransports(): Promise<Transport[]> {
    return getCollection<Transport>('transports');
  },

  async saveTransport(transport: Transport): Promise<boolean> {
    return saveDocument<Transport>('transports', transport);
  },

  async deleteTransport(id: string): Promise<boolean> {
    return deleteDocument('transports', id);
  },

  // --- USER API & AUTHENTICATION ---
  async getUsers(): Promise<User[]> {
    return getCollection<User>('users');
  },

  getLocalUsers(): User[] {
    return getLocal<User>('users');
  },

  async getUserDirect(idOrEmailOrNick: string): Promise<User | null> {
    if (!idOrEmailOrNick) return null;
    const clean = idOrEmailOrNick.trim().toLowerCase();
    try {
      const res = await fetch(`${RTDB_BASE_URL}/users.json`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || typeof data !== 'object') return null;
      for (const key of Object.keys(data)) {
        const u = data[key];
        const userObj: User = { id: key, ...u };
        if (
          key.toLowerCase() === clean ||
          (userObj.email && userObj.email.toLowerCase() === clean) ||
          (userObj.nickname && userObj.nickname.toLowerCase() === clean) ||
          (userObj.phone && userObj.phone.replace(/[\s\-\+]/g, '') === clean.replace(/[\s\-\+]/g, ''))
        ) {
          return userObj;
        }
      }
    } catch (e) {
      console.warn('getUserDirect fetch warning:', e);
    }
    // Fallback to local cache
    const local = getLocal<User>('users');
    return (
      local.find(
        (u) =>
          u.id.toLowerCase() === clean ||
          (u.email && u.email.toLowerCase() === clean) ||
          (u.nickname && u.nickname.toLowerCase() === clean)
      ) || null
    );
  },

  async saveUser(user: User): Promise<boolean> {
    return saveDocument<User>('users', user);
  },

  async deleteUser(id: string): Promise<boolean> {
    return deleteDocument('users', id);
  },

  // --- CHATS API ---
  async getChats(): Promise<ChatMessage[]> {
    return getCollection<ChatMessage>('chats');
  },

  async sendChatMessage(msg: ChatMessage): Promise<boolean> {
    return saveDocument<ChatMessage>('chats', msg);
  },

  async deleteChatMessage(id: string): Promise<boolean> {
    return deleteDocument('chats', id);
  },

  // --- ANNOUNCEMENT BANNER API ---
  async getBanner(): Promise<AnnouncementBanner | null> {
    const list = await getCollection<AnnouncementBanner>('banner');
    if (list && list.length > 0) {
      return list[0];
    }
    // Check local storage fallback if no server banner
    const local = getLocal<AnnouncementBanner>('banner');
    return local.length > 0 ? local[0] : null;
  },

  async saveBanner(banner: AnnouncementBanner): Promise<boolean> {
    return saveDocument<AnnouncementBanner>('banner', banner);
  },

  // --- SITE SETTINGS & BOOKMARK IDENTITY API ---
  async getSiteSettings(): Promise<SiteSettings> {
    const defaultSettings: SiteSettings = {
      id: 'main_site_settings',
      siteName: 'Estably - إستابلي للخيول العربية الأصيلة',
      siteDescription: 'منصة متكاملة للاستطبلات، بيع وتأجير الخيول العربية الأصيلة، الإيواء، ونقل الخيول.',
      logoUrl: '/logo.jpg',
      screensaverEnabled: true,
      screensaverTimeoutSeconds: 60,
      screensaverShowClock: true,
      adminPhone: '0559595055',
      adminWhatsApp: '966559595055',
      updatedAt: new Date().toISOString()
    };

    try {
      const directRes = await fetch(`${RTDB_BASE_URL}/site_settings/main_site_settings.json`, {
        signal: AbortSignal.timeout(4000)
      });
      if (directRes.ok) {
        const directData = await directRes.json();
        if (directData && directData.siteName) {
          const item: SiteSettings = {
            ...defaultSettings,
            ...directData,
            screensaverEnabled: directData.screensaverEnabled !== undefined ? directData.screensaverEnabled : true,
            screensaverTimeoutSeconds: directData.screensaverTimeoutSeconds || 60,
            screensaverShowClock: directData.screensaverShowClock !== undefined ? directData.screensaverShowClock : true,
          };
          if (!item.logoUrl || item.logoUrl === '/logomaster.jpg') {
            item.logoUrl = '/logo.jpg';
          }
          setLocal('site_settings', [item]);
          return item;
        }
      }

      const list = await getCollection<SiteSettings>('site_settings');
      const foundSetting = list.find(s => s && (s.siteName || s.id === 'main_site_settings'));
      if (foundSetting && foundSetting.siteName) {
        const item: SiteSettings = { 
          ...defaultSettings, 
          ...foundSetting,
          screensaverEnabled: foundSetting.screensaverEnabled !== undefined ? foundSetting.screensaverEnabled : true,
          screensaverTimeoutSeconds: foundSetting.screensaverTimeoutSeconds || 60,
          screensaverShowClock: foundSetting.screensaverShowClock !== undefined ? foundSetting.screensaverShowClock : true,
        };
        if (!item.logoUrl || item.logoUrl === '/logomaster.jpg') {
          item.logoUrl = '/logo.jpg';
        }
        return item;
      }
      const local = getLocal<SiteSettings>('site_settings');
      if (local && local.length > 0 && local[0].siteName) {
        const item: SiteSettings = { 
          ...defaultSettings, 
          ...local[0],
          screensaverEnabled: local[0].screensaverEnabled !== undefined ? local[0].screensaverEnabled : true,
          screensaverTimeoutSeconds: local[0].screensaverTimeoutSeconds || 60,
          screensaverShowClock: local[0].screensaverShowClock !== undefined ? local[0].screensaverShowClock : true,
        };
        if (!item.logoUrl || item.logoUrl === '/logomaster.jpg') {
          item.logoUrl = '/logo.jpg';
        }
        return item;
      }
    } catch (e) {
      console.warn('Could not fetch site settings, using default', e);
    }
    return defaultSettings;
  },

  async saveSiteSettings(settings: SiteSettings): Promise<boolean> {
    const ok = await saveDocument<SiteSettings>('site_settings', {
      ...settings,
      id: 'main_site_settings',
      updatedAt: new Date().toISOString()
    });
    if (ok) {
      this.applySiteSettings(settings);
    }
    return ok;
  },

  applySiteSettings(settings: SiteSettings) {
    if (typeof document === 'undefined') return;

    try {
      localStorage.setItem('site_settings_cache', JSON.stringify(settings));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('site_settings_changed', { detail: settings }));
      }
    } catch (e) {}

    // 1. Update Document Title
    if (settings.siteName) {
      document.title = settings.siteName;
    }

    // 2. Update Favicon & Apple Touch Icon & Shortcut Icon (Firefox/Safari/Chrome)
    if (settings.logoUrl) {
      const mimeType = settings.logoUrl.startsWith('data:image/png')
        ? 'image/png'
        : settings.logoUrl.startsWith('data:image/jpeg')
        ? 'image/jpeg'
        : settings.logoUrl.startsWith('data:image/svg+xml')
        ? 'image/svg+xml'
        : 'image/x-icon';

      const rels = ['icon', 'shortcut icon', 'apple-touch-icon', 'apple-touch-icon-precomposed'];
      rels.forEach(rel => {
        let link = document.querySelector(`link[rel='${rel}']`) as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = rel;
          document.head.appendChild(link);
        }
        link.type = mimeType;
        link.href = settings.logoUrl;
      });
    }

    // 3. Update Meta Description
    if (settings.siteDescription) {
      let metaDesc = document.querySelector("meta[name='description']") as HTMLMetaElement;
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = settings.siteDescription;
    }

    // 4. Update OpenGraph and Twitter Tags
    const setMeta = (attrName: 'property' | 'name', attrValue: string, content: string) => {
      if (!content) return;
      let meta = document.querySelector(`meta[${attrName}='${attrValue}']`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attrName, attrValue);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    setMeta('property', 'og:title', settings.siteName);
    setMeta('property', 'og:description', settings.siteDescription);
    setMeta('property', 'og:image', settings.logoUrl);
    setMeta('name', 'twitter:title', settings.siteName);
    setMeta('name', 'twitter:description', settings.siteDescription);
    setMeta('name', 'twitter:image', settings.logoUrl);
  },

  // --- LOCAL CACHE ACCESSORS ---
  getLocalStables(): Stable[] {
    const deletedIds = getDeletedIds();
    const items = getLocal<Stable>('stables').filter(s => !deletedIds.includes(s.id) && !cloudDeletedIdsSet.has(s.id));
    return sortDescendingByDate(items);
  },

  getLocalHorses(): Horse[] {
    const deletedIds = getDeletedIds();
    const items = getLocal<Horse>('horses').filter(h => !deletedIds.includes(h.id) && !cloudDeletedIdsSet.has(h.id));
    return sortDescendingByDate(items);
  },

  getLocalShelters(): Shelter[] {
    const deletedIds = getDeletedIds();
    const items = getLocal<Shelter>('shelters').filter(sh => !deletedIds.includes(sh.id) && !cloudDeletedIdsSet.has(sh.id));
    return sortDescendingByDate(items);
  },

  getLocalTransports(): Transport[] {
    const deletedIds = getDeletedIds();
    const items = getLocal<Transport>('transports').filter(t => !deletedIds.includes(t.id) && !cloudDeletedIdsSet.has(t.id));
    return sortDescendingByDate(items);
  },

  /**
   * Retrieves a specific ad by its ID and optional type.
   * Checks fast local storage cache first, then cloud direct document lookup, then collection fallback.
   */
  async getAdById(
    adId: string,
    preferredType?: 'horse' | 'stable' | 'shelter' | 'transport'
  ): Promise<{ item: any; type: 'horse' | 'stable' | 'shelter' | 'transport' } | null> {
    if (!adId) return null;
    const cleanId = String(adId).trim();
    if (!cleanId) return null;

    // Check if definitely marked deleted
    const deletedIds = getDeletedIds();
    if (deletedIds.includes(cleanId) || cloudDeletedIdsSet.has(cleanId)) {
      return null;
    }

    // 1. Fast path: check local storage cache first
    if (preferredType === 'horse') {
      const h = this.getLocalHorses().find(i => i.id === cleanId);
      if (h) return { item: h, type: 'horse' };
    } else if (preferredType === 'stable') {
      const s = this.getLocalStables().find(i => i.id === cleanId);
      if (s) return { item: s, type: 'stable' };
    } else if (preferredType === 'shelter') {
      const sh = this.getLocalShelters().find(i => i.id === cleanId);
      if (sh) return { item: sh, type: 'shelter' };
    } else if (preferredType === 'transport') {
      const t = this.getLocalTransports().find(i => i.id === cleanId);
      if (t) return { item: t, type: 'transport' };
    }

    // Check all local collections if not found by preferred type
    const localHorse = this.getLocalHorses().find(i => i.id === cleanId);
    if (localHorse) return { item: localHorse, type: 'horse' };
    const localStable = this.getLocalStables().find(i => i.id === cleanId);
    if (localStable) return { item: localStable, type: 'stable' };
    const localShelter = this.getLocalShelters().find(i => i.id === cleanId);
    if (localShelter) return { item: localShelter, type: 'shelter' };
    const localTransport = this.getLocalTransports().find(i => i.id === cleanId);
    if (localTransport) return { item: localTransport, type: 'transport' };

    // 2. Direct Cloud Lookup: Fetch the specific single document by ID (Lightning-fast, ~60ms)
    const fetchDirectDoc = async (node: string): Promise<any | null> => {
      try {
        const res = await fetch(`${RTDB_BASE_URL}/${node}/${cleanId}.json`, {
          signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data && typeof data === 'object' && !data.error && (data.name || data.title || data.vehicleType || data.id)) {
          return { id: cleanId, ...data };
        }
      } catch (e) {}
      return null;
    };

    try {
      // First check preferred type directly
      if (preferredType) {
        const node = preferredType === 'horse' ? 'horses' : preferredType === 'stable' ? 'stables' : preferredType === 'shelter' ? 'shelters' : 'transports';
        const doc = await fetchDirectDoc(node);
        if (doc) {
          // Cache locally
          const local = getLocal<any>(node);
          if (!local.some(i => i.id === doc.id)) {
            setLocal(node, [doc, ...local]);
          }
          return { item: doc, type: preferredType };
        }
      }

      // Check all 4 collections directly in parallel
      const [hDoc, sDoc, shDoc, tDoc] = await Promise.all([
        preferredType !== 'horse' ? fetchDirectDoc('horses') : Promise.resolve(null),
        preferredType !== 'stable' ? fetchDirectDoc('stables') : Promise.resolve(null),
        preferredType !== 'shelter' ? fetchDirectDoc('shelters') : Promise.resolve(null),
        preferredType !== 'transport' ? fetchDirectDoc('transports') : Promise.resolve(null),
      ]);

      if (hDoc) {
        const local = getLocal<any>('horses');
        if (!local.some(i => i.id === hDoc.id)) setLocal('horses', [hDoc, ...local]);
        return { item: hDoc, type: 'horse' };
      }
      if (sDoc) {
        const local = getLocal<any>('stables');
        if (!local.some(i => i.id === sDoc.id)) setLocal('stables', [sDoc, ...local]);
        return { item: sDoc, type: 'stable' };
      }
      if (shDoc) {
        const local = getLocal<any>('shelters');
        if (!local.some(i => i.id === shDoc.id)) setLocal('shelters', [shDoc, ...local]);
        return { item: shDoc, type: 'shelter' };
      }
      if (tDoc) {
        const local = getLocal<any>('transports');
        if (!local.some(i => i.id === tDoc.id)) setLocal('transports', [tDoc, ...local]);
        return { item: tDoc, type: 'transport' };
      }
    } catch (e) {
      console.warn('Direct document fetch failed:', e);
    }

    // 3. Fallback: Full collection scan (if direct key is different or under full scan)
    try {
      if (preferredType === 'horse') {
        const horses = await this.getHorses();
        const found = horses.find(i => i.id === cleanId);
        if (found) return { item: found, type: 'horse' };
      } else if (preferredType === 'stable') {
        const stables = await this.getStables();
        const found = stables.find(i => i.id === cleanId);
        if (found) return { item: found, type: 'stable' };
      } else if (preferredType === 'shelter') {
        const shelters = await this.getShelters();
        const found = shelters.find(i => i.id === cleanId);
        if (found) return { item: found, type: 'shelter' };
      } else if (preferredType === 'transport') {
        const transports = await this.getTransports();
        const found = transports.find(i => i.id === cleanId);
        if (found) return { item: found, type: 'transport' };
      }

      // Check all remote collections
      const [horses, stables, shelters, transports] = await Promise.all([
        this.getHorses(),
        this.getStables(),
        this.getShelters(),
        this.getTransports()
      ]);

      const foundHorse = horses.find(i => i.id === cleanId);
      if (foundHorse) return { item: foundHorse, type: 'horse' };
      const foundStable = stables.find(i => i.id === cleanId);
      if (foundStable) return { item: foundStable, type: 'stable' };
      const foundShelter = shelters.find(i => i.id === cleanId);
      if (foundShelter) return { item: foundShelter, type: 'shelter' };
      const foundTransport = transports.find(i => i.id === cleanId);
      if (foundTransport) return { item: foundTransport, type: 'transport' };
    } catch (e) {
      console.warn('Failed to load ad by ID from cloud collections:', e);
    }

    return null;
  },

  /**
   * Performs an immediate, deep cloud synchronization on browser startup.
   * Cleans phantom / deleted ads and syncs all devices with the single source of truth.
   */
  async performInitialCloudSync(): Promise<{ horses: Horse[]; stables: Stable[]; shelters: Shelter[]; transports: Transport[] }> {
    try {
      // 1. Fetch deleted records list from cloud
      const cloudDeleted = await fetchCloudDeletedIds();

      // 2. Fetch all collections in parallel from Firebase RTDB
      const [horses, stables, shelters, transports] = await Promise.all([
        this.getHorses(),
        this.getStables(),
        this.getShelters(),
        this.getTransports()
      ]);

      const cleanHorses = horses.filter(h => !cloudDeleted.has(h.id));
      const cleanStables = stables.filter(s => !cloudDeleted.has(s.id));
      const cleanShelters = shelters.filter(sh => !cloudDeleted.has(sh.id));
      const cleanTransports = transports.filter(t => !cloudDeleted.has(t.id));

      setLocal('horses', cleanHorses);
      setLocal('stables', cleanStables);
      setLocal('shelters', cleanShelters);
      setLocal('transports', cleanTransports);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('horses_forum_sync_complete', {
          detail: { horses: cleanHorses, stables: cleanStables, shelters: cleanShelters, transports: cleanTransports }
        }));
      }

      return { horses: cleanHorses, stables: cleanStables, shelters: cleanShelters, transports: cleanTransports };
    } catch (e) {
      console.warn('Initial cloud sync error:', e);
      return {
        horses: this.getLocalHorses(),
        stables: this.getLocalStables(),
        shelters: this.getLocalShelters(),
        transports: this.getLocalTransports()
      };
    }
  },

  /**
   * Fetches all active & ended ads belonging to a specific user across all 4 sections.
   */
  async getUserAllAds(userId: string): Promise<{
    horses: Horse[];
    stables: Stable[];
    shelters: Shelter[];
    transports: Transport[];
    totalCount: number;
    activeCount: number;
    endedCount: number;
  }> {
    if (!userId) {
      return { horses: [], stables: [], shelters: [], transports: [], totalCount: 0, activeCount: 0, endedCount: 0 };
    }

    try {
      const [allHorses, allStables, allShelters, allTransports] = await Promise.all([
        this.getHorses(),
        this.getStables(),
        this.getShelters(),
        this.getTransports()
      ]);

      const userHorses = allHorses.filter(h => h.userId === userId);
      const userStables = allStables.filter(s => s.userId === userId);
      const userShelters = allShelters.filter(sh => sh.userId === userId);
      const userTransports = allTransports.filter(t => t.userId === userId);

      const totalCount = userHorses.length + userStables.length + userShelters.length + userTransports.length;

      let endedCount = 0;
      userHorses.forEach(h => { if (h.isSold) endedCount++; });
      userStables.forEach(s => { if (s.isEnded) endedCount++; });
      userShelters.forEach(sh => { if (sh.isEnded) endedCount++; });
      userTransports.forEach(t => { if (t.isEnded) endedCount++; });

      const activeCount = totalCount - endedCount;

      return {
        horses: userHorses,
        stables: userStables,
        shelters: userShelters,
        transports: userTransports,
        totalCount,
        activeCount,
        endedCount
      };
    } catch (e) {
      console.warn('Failed to fetch user all ads:', e);
      const horses = this.getLocalHorses().filter(h => h.userId === userId);
      const stables = this.getLocalStables().filter(s => s.userId === userId);
      const shelters = this.getLocalShelters().filter(sh => sh.userId === userId);
      const transports = this.getLocalTransports().filter(t => t.userId === userId);
      const totalCount = horses.length + stables.length + shelters.length + transports.length;
      return { horses, stables, shelters, transports, totalCount, activeCount: totalCount, endedCount: 0 };
    }
  },

  /**
   * Fetches deleted ads archive for a user.
   */
  async getUserDeletedAds(userId: string): Promise<ArchivedDeletedAd[]> {
    if (!userId) return [];
    try {
      const res = await fetch(`${RTDB_BASE_URL}/deleted_ads_archive.json`, {
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          const list: ArchivedDeletedAd[] = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          })).filter(a => a.userId === userId);

          list.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
          setLocal('deleted_ads_archive', list);
          return list;
        }
      }
    } catch (e) {
      console.warn('Failed to load deleted ads archive from cloud:', e);
    }

    const local = getLocal<ArchivedDeletedAd>('deleted_ads_archive');
    return local.filter(a => a.userId === userId).sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  },

  /**
   * Restores a deleted ad back into its original collection.
   */
  async restoreDeletedAd(archivedAd: ArchivedDeletedAd): Promise<boolean> {
    try {
      const nodeName = archivedAd.category === 'horse' ? 'horses'
        : archivedAd.category === 'stable' ? 'stables'
        : archivedAd.category === 'shelter' ? 'shelters'
        : 'transports';

      // 1. Remove docId from deleted IDs
      cloudDeletedIdsSet.delete(archivedAd.originalId);
      const currentDeleted = getDeletedIds().filter(id => id !== archivedAd.originalId);
      try {
        localStorage.setItem('horses_forum_deleted_ids', JSON.stringify(currentDeleted));
      } catch {}

      // 2. Remove tombstone from cloud
      fetch(`${RTDB_BASE_URL}/deleted_records/${archivedAd.originalId}.json`, {
        method: 'DELETE'
      }).catch(() => {});

      // 3. Remove from deleted archive
      const localArchive = getLocal<ArchivedDeletedAd>('deleted_ads_archive').filter(a => a.id !== archivedAd.id && a.originalId !== archivedAd.originalId);
      setLocal('deleted_ads_archive', localArchive);
      fetch(`${RTDB_BASE_URL}/deleted_ads_archive/${archivedAd.id}.json`, {
        method: 'DELETE'
      }).catch(() => {});

      // 4. Save back to collection
      await saveDocument(nodeName, {
        ...archivedAd.data,
        id: archivedAd.originalId,
        updatedAt: new Date().toISOString()
      });

      return true;
    } catch (e) {
      console.error('Failed to restore deleted ad:', e);
      return false;
    }
  },

  /**
   * Permanently deletes an archived ad.
   */
  async permanentlyDeleteArchivedAd(archivedId: string): Promise<boolean> {
    try {
      const localArchive = getLocal<ArchivedDeletedAd>('deleted_ads_archive').filter(a => a.id !== archivedId);
      setLocal('deleted_ads_archive', localArchive);
      await fetch(`${RTDB_BASE_URL}/deleted_ads_archive/${archivedId}.json`, {
        method: 'DELETE'
      });
      return true;
    } catch (e) {
      console.warn('Failed to permanently delete archived ad:', e);
      return false;
    }
  },

  /**
   * Bank Receipts & Deposit Slips operations
   * Uses cloud-authorized site_settings/bank_receipts and backend /api/bank-receipts with local fallback
   */
  async getBankReceipts(): Promise<BankReceipt[]> {
    const receiptsMap = new Map<string, BankReceipt>();

    // 1. Fast local storage cache
    const local = getLocal<BankReceipt>('bank_receipts');
    local.forEach((r) => {
      if (r && r.id) receiptsMap.set(r.id, r);
    });

    // 2. Fetch from Firebase RTDB under site_settings/bank_receipts (Open full permission without auth)
    try {
      const res = await fetch(`${RTDB_BASE_URL}/site_settings/bank_receipts.json`, {
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          Object.keys(data).forEach((k) => {
            const item = { id: k, ...data[k] } as BankReceipt;
            if (item && item.id) {
              const existing = receiptsMap.get(item.id);
              if (
                !existing ||
                new Date(item.reviewedAt || item.createdAt).getTime() >=
                  new Date(existing.reviewedAt || existing.createdAt).getTime()
              ) {
                receiptsMap.set(item.id, item);
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn('Firebase RTDB bank receipts fetch:', e);
    }

    // 3. Fetch from Server API backend (/api/bank-receipts)
    try {
      const apiRes = await fetch('/api/bank-receipts', { signal: AbortSignal.timeout(4000) });
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && Array.isArray(data.receipts)) {
          data.receipts.forEach((item: BankReceipt) => {
            if (item && item.id) {
              const existing = receiptsMap.get(item.id);
              if (
                !existing ||
                new Date(item.reviewedAt || item.createdAt).getTime() >=
                  new Date(existing.reviewedAt || existing.createdAt).getTime()
              ) {
                receiptsMap.set(item.id, item);
              }
            }
          });
        }
      }
    } catch (e) {
      // Backend api offline or dev mode
    }

    const mergedList = Array.from(receiptsMap.values());
    mergedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Update local cache
    setLocal('bank_receipts', mergedList);

    // Auto-sync any unsynced local receipts to cloud
    local.forEach((localR) => {
      if (localR && localR.id) {
        try {
          fetch(`${RTDB_BASE_URL}/site_settings/bank_receipts/${localR.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localR)
          }).catch(() => {});
          fetch('/api/bank-receipts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localR)
          }).catch(() => {});
        } catch {}
      }
    });

    return mergedList;
  },

  async getUserBankReceipts(userId: string): Promise<BankReceipt[]> {
    const all = await this.getBankReceipts();
    return all.filter((r) => r.userId === userId);
  },

  async saveBankReceipt(receipt: BankReceipt): Promise<void> {
    receipt.createdAt = receipt.createdAt || new Date().toISOString();

    // 1. Update local storage immediately for zero-delay UX
    const local = getLocal<BankReceipt>('bank_receipts');
    const existingIdx = local.findIndex((r) => r.id === receipt.id);
    if (existingIdx > -1) {
      local[existingIdx] = { ...local[existingIdx], ...receipt };
    } else {
      local.unshift(receipt);
    }
    setLocal('bank_receipts', local);

    // 2. Save to Firebase RTDB under site_settings/bank_receipts
    try {
      await fetch(`${RTDB_BASE_URL}/site_settings/bank_receipts/${receipt.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receipt)
      });
    } catch (err) {
      console.warn('Failed to save bank receipt to RTDB site_settings:', err);
    }

    // 3. Save to server backend
    try {
      await fetch('/api/bank-receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receipt)
      });
    } catch (err) {
      console.warn('Failed to save bank receipt to /api/bank-receipts:', err);
    }
  },

  async deleteBankReceipt(id: string): Promise<void> {
    // 1. Local remove
    const local = getLocal<BankReceipt>('bank_receipts').filter((r) => r.id !== id);
    setLocal('bank_receipts', local);

    // 2. Cloud RTDB remove
    try {
      await fetch(`${RTDB_BASE_URL}/site_settings/bank_receipts/${id}.json`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Failed to delete bank receipt from RTDB:', err);
    }

    // 3. Server backend remove
    try {
      await fetch(`/api/bank-receipts/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Failed to delete bank receipt from backend:', err);
    }
  },

  async updateBankReceiptStatus(
    id: string,
    status: 'approved' | 'rejected' | 'pending',
    adminNotes?: string
  ): Promise<void> {
    const receipts = await this.getBankReceipts();
    const existing = receipts.find((r) => r.id === id);
    if (!existing) return;

    const updated: BankReceipt = {
      ...existing,
      status,
      adminNotes: adminNotes !== undefined ? adminNotes : existing.adminNotes,
      reviewedAt: new Date().toISOString()
    };

    // 1. Local update
    const local = getLocal<BankReceipt>('bank_receipts');
    const idx = local.findIndex((r) => r.id === id);
    if (idx > -1) {
      local[idx] = updated;
    } else {
      local.push(updated);
    }
    setLocal('bank_receipts', local);

    // 2. Cloud update in RTDB
    try {
      await fetch(`${RTDB_BASE_URL}/site_settings/bank_receipts/${id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.warn('Failed to update bank receipt status in RTDB:', err);
    }

    // 3. Cloud update in server backend
    try {
      await fetch(`/api/bank-receipts/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes })
      });
    } catch (err) {
      console.warn('Failed to update bank receipt status in backend:', err);
    }
  },

  async createAdNotification(notification: AdNotification): Promise<void> {
    try {
      // 1. Local update
      const local = getLocal<AdNotification>('ad_notifications');
      const updated = [notification, ...local.filter((n) => n.id !== notification.id)].slice(0, 100);
      setLocal('ad_notifications', updated);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ad_notifications_changed'));
      }

      // 2. Cloud RTDB save
      await fetch(`${RTDB_BASE_URL}/ad_notifications/${notification.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });
    } catch (err) {
      console.warn('Failed to save ad notification to RTDB:', err);
    }
  },

  async getAdNotifications(userId: string): Promise<AdNotification[]> {
    if (!userId) return [];
    
    // 1. Fetch from Cloud RTDB
    try {
      const res = await fetch(`${RTDB_BASE_URL}/ad_notifications.json`, {
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          const cloudList: AdNotification[] = Object.values(data);
          const localList = getLocal<AdNotification>('ad_notifications');
          const map = new Map<string, AdNotification>();
          cloudList.forEach((n) => { if (n && n.id) map.set(n.id, n); });
          localList.forEach((n) => { if (n && n.id && !map.has(n.id)) map.set(n.id, n); });
          
          const merged = Array.from(map.values())
            .filter((n) => n && (n.recipientUserId === userId || n.recipientUserId === 'all'))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          setLocal('ad_notifications', Array.from(map.values()).slice(0, 100));
          return merged;
        }
      }
    } catch (err) {
      // Fallback to local
    }

    // Fallback: Local storage
    const local = getLocal<AdNotification>('ad_notifications');
    return local
      .filter((n) => n && (n.recipientUserId === userId || n.recipientUserId === 'all'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async markNotificationAsRead(notifId: string): Promise<void> {
    const local = getLocal<AdNotification>('ad_notifications');
    const idx = local.findIndex((n) => n.id === notifId);
    if (idx > -1) {
      local[idx].read = true;
      setLocal('ad_notifications', local);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ad_notifications_changed'));
      }
    }

    try {
      await fetch(`${RTDB_BASE_URL}/ad_notifications/${notifId}/read.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(true)
      });
    } catch (err) {}
  },

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const local = getLocal<AdNotification>('ad_notifications');
    local.forEach((n) => {
      if (n.recipientUserId === userId || n.recipientUserId === 'all') {
        n.read = true;
      }
    });
    setLocal('ad_notifications', local);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ad_notifications_changed'));
    }

    // Cloud update
    try {
      const allNotifs = await this.getAdNotifications(userId);
      await Promise.all(
        allNotifs.filter((n) => !n.read).map((n) => 
          fetch(`${RTDB_BASE_URL}/ad_notifications/${n.id}/read.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(true)
          }).catch(() => {})
        )
      );
    } catch (err) {}
  }
};
