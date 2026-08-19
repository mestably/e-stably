/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Stable, Horse, Shelter, Transport, User, ChatMessage, Review, AnnouncementBanner, SiteSettings } from '../types';

const RTDB_BASE_URL = 'https://horses-835f1-default-rtdb.asia-southeast1.firebasedatabase.app';

// Helper to check if we can reach the database
async function checkNetwork(): Promise<boolean> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/.json?shallow=true`, {
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

// --- GENERIC FIREBASE RTDB FETCH ---
async function getCollection<T extends { id: string; updatedAt?: string; createdAt?: string }>(nodeName: string): Promise<T[]> {
  try {
    const isOnline = await checkNetwork();
    if (!isOnline) {
      const local = getLocal<T>(nodeName);
      const deletedIds = getDeletedIds();
      return local.filter((item) => !deletedIds.includes(item.id) && !cloudDeletedIdsSet.has(item.id));
    }

    // Fetch cloud data and cloud deleted records in parallel
    const [response, cloudDeletedSet] = await Promise.all([
      fetch(`${RTDB_BASE_URL}/${nodeName}.json`, { signal: AbortSignal.timeout(6000) }),
      fetchCloudDeletedIds()
    ]);

    if (!response.ok) {
      throw new Error('Database response not ok');
    }

    const data = await response.json();
    const localDeleted = new Set(getDeletedIds());

    if (!data || Object.keys(data).length === 0) {
      // Server has no items in this collection
      // Clean local cache to match server reality
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

    // Save the authentic cloud items to local cache to keep cache in sync
    setLocal(nodeName, validServerItems);
    return validServerItems;
  } catch (error) {
    console.warn(`Firebase RTDB fetch failed for ${nodeName}, using local cache`, error);
    const deletedIds = getDeletedIds();
    return getLocal<T>(nodeName).filter((item) => !deletedIds.includes(item.id) && !cloudDeletedIdsSet.has(item.id));
  }
}

async function saveDocument<T extends { id: string; email?: string; updatedAt?: string }>(nodeName: string, doc: T): Promise<boolean> {
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
    local[existingIndex] = { ...local[existingIndex], ...doc };
  } else {
    local.push(doc);
  }
  setLocal(nodeName, local);

  try {
    const response = await fetch(`${RTDB_BASE_URL}/${nodeName}/${doc.id}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(doc),
    });

    // Also remove from deleted_records on cloud if it existed
    fetch(`${RTDB_BASE_URL}/deleted_records/${doc.id}.json`, {
      method: 'DELETE'
    }).catch(() => {});

    if (!response.ok) {
      throw new Error('Sync failed');
    }
    return true;
  } catch (error) {
    console.warn(`Firebase RTDB sync failed for ${nodeName}/${doc.id}, stored locally`, error);
    return false;
  }
}

async function deleteDocument(nodeName: string, docId: string): Promise<boolean> {
  // Record deletion locally and in memory
  addDeletedId(docId);
  cloudDeletedIdsSet.add(docId);

  const local = getLocal<any>(nodeName);
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

export const DAILY_FREE_ADS_LIMIT = 5;

export const FirebaseService = {
  // --- DAILY ADS LIMIT HELPER ---
  async getUserTodayAdsCount(userId: string): Promise<number> {
    if (!userId) return 0;
    const todayStr = new Date().toDateString();

    try {
      const [horses, stables, shelters, transports] = await Promise.all([
        this.getHorses(),
        this.getStables(),
        this.getShelters(),
        this.getTransports()
      ]);

      let count = 0;
      const isToday = (createdAt?: string) => {
        if (!createdAt) return false;
        try {
          return new Date(createdAt).toDateString() === todayStr;
        } catch {
          return false;
        }
      };

      horses.forEach(h => { if (h.userId === userId && isToday(h.createdAt)) count++; });
      stables.forEach(s => { if (s.userId === userId && isToday(s.createdAt)) count++; });
      shelters.forEach(sh => { if (sh.userId === userId && isToday(sh.createdAt)) count++; });
      transports.forEach(t => { if (t.userId === userId && isToday(t.createdAt)) count++; });

      return count;
    } catch {
      return 0;
    }
  },
  // --- UTILS ---
  initFallbackData() {
    // Purge any legacy sample demo items (e.g. horse_1, stable_1, shelter_1, transport_1) from local cache
    try {
      const demoIds = ['horse_1', 'horse_2', 'stable_1', 'stable_2', 'shelter_1', 'transport_1'];
      ['horses', 'stables', 'shelters', 'transports'].forEach(node => {
        const local = getLocal<any>(node);
        if (local.length > 0) {
          const filtered = local.filter(item => !demoIds.includes(item.id));
          if (filtered.length !== local.length) {
            setLocal(node, filtered);
          }
        }
      });
    } catch (e) {}

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
      logoUrl: '/logomaster.jpg',
      updatedAt: new Date().toISOString()
    };

    try {
      const list = await getCollection<SiteSettings>('site_settings');
      if (list && list.length > 0 && list[0].siteName) {
        return { ...defaultSettings, ...list[0] };
      }
      const local = getLocal<SiteSettings>('site_settings');
      if (local && local.length > 0 && local[0].siteName) {
        return { ...defaultSettings, ...local[0] };
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

    // 4. Update OpenGraph Tags (for bookmarks, links, social sharing)
    const setOgMeta = (property: string, content: string) => {
      if (!content) return;
      let meta = document.querySelector(`meta[property='${property}']`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    setOgMeta('og:title', settings.siteName);
    setOgMeta('og:description', settings.siteDescription);
    setOgMeta('og:image', settings.logoUrl);
  },

  // --- LOCAL CACHE ACCESSORS ---
  getLocalStables(): Stable[] {
    const deletedIds = getDeletedIds();
    const demoIds = new Set(['stable_1', 'stable_2']);
    return getLocal<Stable>('stables').filter(s => !deletedIds.includes(s.id) && !cloudDeletedIdsSet.has(s.id) && !demoIds.has(s.id));
  },

  getLocalHorses(): Horse[] {
    const deletedIds = getDeletedIds();
    const demoIds = new Set(['horse_1', 'horse_2']);
    return getLocal<Horse>('horses').filter(h => !deletedIds.includes(h.id) && !cloudDeletedIdsSet.has(h.id) && !demoIds.has(h.id));
  },

  getLocalShelters(): Shelter[] {
    const deletedIds = getDeletedIds();
    const demoIds = new Set(['shelter_1']);
    return getLocal<Shelter>('shelters').filter(sh => !deletedIds.includes(sh.id) && !cloudDeletedIdsSet.has(sh.id) && !demoIds.has(sh.id));
  },

  getLocalTransports(): Transport[] {
    const deletedIds = getDeletedIds();
    const demoIds = new Set(['transport_1']);
    return getLocal<Transport>('transports').filter(t => !deletedIds.includes(t.id) && !cloudDeletedIdsSet.has(t.id) && !demoIds.has(t.id));
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

      // 3. Purge any legacy sample demo items & deleted items
      const demoIds = new Set(['horse_1', 'horse_2', 'stable_1', 'stable_2', 'shelter_1', 'transport_1']);
      const cleanHorses = horses.filter(h => !demoIds.has(h.id) && !cloudDeleted.has(h.id));
      const cleanStables = stables.filter(s => !demoIds.has(s.id) && !cloudDeleted.has(s.id));
      const cleanShelters = shelters.filter(sh => !demoIds.has(sh.id) && !cloudDeleted.has(sh.id));
      const cleanTransports = transports.filter(t => !demoIds.has(t.id) && !cloudDeleted.has(t.id));

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
  }
};
