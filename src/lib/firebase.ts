/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Stable, Horse, Shelter, Transport, User, ChatMessage, Review } from '../types';

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
  const data = localStorage.getItem(`horses_forum_${key}`);
  return data ? JSON.parse(data) : [];
};

const setLocal = <T>(key: string, data: T[]) => {
  try {
    localStorage.setItem(`horses_forum_${key}`, JSON.stringify(data));
  } catch (err) {
    console.warn(`Local storage quota exceeded or disabled for ${key}`, err);
    // Try to remove older non-essential cache if needed, or fail gracefully
  }
};

const getDeletedIds = (): string[] => {
  const data = localStorage.getItem(`horses_forum_deleted_ids`);
  return data ? JSON.parse(data) : [];
};

const addDeletedId = (id: string) => {
  const list = getDeletedIds();
  if (!list.includes(id)) {
    list.push(id);
    localStorage.setItem(`horses_forum_deleted_ids`, JSON.stringify(list));
  }
};

// --- GENERIC FIREBASE RTDB FETCH ---
async function getCollection<T extends { id: string; updatedAt?: string; createdAt?: string }>(nodeName: string): Promise<T[]> {
  try {
    const deletedIds = getDeletedIds();
    const isOnline = await checkNetwork();
    if (!isOnline) {
      const local = getLocal<T>(nodeName);
      return local.filter((item) => !deletedIds.includes(item.id));
    }

    const response = await fetch(`${RTDB_BASE_URL}/${nodeName}.json`);
    if (!response.ok) {
      throw new Error('Database response not ok');
    }

    const data = await response.json();
    if (!data) {
      const local = getLocal<T>(nodeName);
      const filteredLocal = local.filter((item) => !deletedIds.includes(item.id));
      if (filteredLocal.length > 0) {
        await syncLocalToCloud(nodeName, filteredLocal);
        return filteredLocal;
      }
      return [];
    }

    const serverItems: T[] = Object.keys(data).map((key) => {
      const item = data[key];
      return {
        id: key,
        ...item,
      };
    });

    // Merge server items with local items using Last-Write-Wins (LWW) based on updatedAt
    const localItems = getLocal<T>(nodeName);
    const localMap = new Map<string, T>(localItems.map(item => [item.id, item]));
    
    const mergedItems = serverItems.map((serverItem) => {
      const localItem = localMap.get(serverItem.id);
      if (localItem) {
        const localUpdate = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
        const serverUpdate = serverItem.updatedAt ? new Date(serverItem.updatedAt).getTime() : 0;
        if (localUpdate > serverUpdate) {
          // Local is newer, sync it back in background
          saveDocument(nodeName, localItem).catch(err => console.warn('Delayed background sync failed', err));
          return localItem;
        }
      }
      return serverItem;
    });

    // Add any offline-created local items that are not yet on the server
    const serverItemIds = new Set(serverItems.map(item => item.id));
    for (const localItem of localItems) {
      if (!serverItemIds.has(localItem.id)) {
        mergedItems.push(localItem);
        saveDocument(nodeName, localItem).catch(err => console.warn('Delayed background sync failed', err));
      }
    }

    // Filter out deleted items
    const finalItems = mergedItems.filter((item) => !deletedIds.includes(item.id));

    setLocal(nodeName, finalItems);
    return finalItems;
  } catch (error) {
    console.warn(`Firebase RTDB fetch failed for ${nodeName}, using local cache`, error);
    const deletedIds = getDeletedIds();
    return getLocal<T>(nodeName).filter((item) => !deletedIds.includes(item.id));
  }
}

async function saveDocument<T extends { id: string; updatedAt?: string }>(nodeName: string, doc: T): Promise<boolean> {
  // Update timestamp to ensure LWW consistency
  doc.updatedAt = new Date().toISOString();

  const local = getLocal<T>(nodeName);
  const existingIndex = local.findIndex((item) => item.id === doc.id);
  if (existingIndex > -1) {
    local[existingIndex] = doc;
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
  // Record deletion locally so it can't be overwritten by server state
  addDeletedId(docId);

  const local = getLocal<any>(nodeName);
  const updated = local.filter((item) => item.id !== docId);
  setLocal(nodeName, updated);

  try {
    const response = await fetch(`${RTDB_BASE_URL}/${nodeName}/${docId}.json`, {
      method: 'DELETE',
    });

    if (!response.ok) {
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

export const FirebaseService = {
  // --- UTILS ---
  initFallbackData() {
    if (localStorage.getItem('horses_forum_initialized')) return;

    const sampleStables: Stable[] = [
      {
        id: 'stable_1',
        userId: 'admin_user',
        userName: 'المدير العام',
        name: 'إسطبل الخيول العربية الأصيلة',
        description: 'إسطبل رائد لتربية وتدريب الخيول العربية الأصيلة، نوفر رعاية صحية متكاملة وغذاء مخصص مع طاقم فني محترف.',
        phone: '0559595055',
        images: ['https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=800'],
        verified: 'verified',
        horseCount: 12,
        rating: 5,
        createdAt: new Date().toISOString(),
        reviews: [
          { id: 'rev_1', userId: 'user_1', userName: 'أبو فهد', rating: 5, comment: 'من أفضل الإسطبلات رعاية واهتمام بالخيل ونظافة ممتازة.', createdAt: new Date().toISOString() }
        ]
      },
      {
        id: 'stable_2',
        userId: 'stable_owner_1',
        userName: 'خالد العتيبي',
        name: 'مربط النخبة العربي',
        description: 'مربط متخصص في إيواء وتدريب الخيل وإنتاج السلالات العربية الفاخرة للسباقات والجمال.',
        phone: '0555612055',
        images: ['https://images.unsplash.com/photo-1598974357801-cbca100e65d3?auto=format&fit=crop&q=80&w=800'],
        verified: 'pending',
        horseCount: 8,
        rating: 4,
        createdAt: new Date().toISOString(),
        reviews: []
      }
    ];

    const sampleHorses: Horse[] = [
      {
        id: 'horse_1',
        userId: 'stable_owner_1',
        userName: 'خالد العتيبي',
        adType: 'sale',
        name: 'كحيلان الشقب',
        damName: 'دهمة الشقب',
        sireName: 'غزال الشقب',
        certificate: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=400',
        breed: 'arabian',
        age: 4,
        gender: 'stallion',
        color: 'أشعل (ذهبي مائل للأبيض)',
        healthStatus: 'ممتازة وخالٍ من العيوب وسليم تماماً للفحص وجاهز للركوب والتشبيه',
        images: [
          'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=800'
        ],
        stableId: 'stable_1',
        stableName: 'إسطبل الخيول العربية الأصيلة',
        price: 85000,
        createdAt: new Date().toISOString()
      },
      {
        id: 'horse_2',
        userId: 'admin_user',
        userName: 'المدير العام',
        adType: 'rent',
        name: 'غلا الخالدية',
        damName: 'مروج الخالدية',
        sireName: 'بندر الخالدية',
        certificate: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80&w=400',
        breed: 'arabian',
        age: 3,
        gender: 'mare',
        color: 'أدهم (أسود داكن)',
        healthStatus: 'سليم وصحة ممتازة ونشيط جداً ومناسب للتدريب والسباقات والفروسية للمبتدئين والمحترفين',
        images: [
          'https://images.unsplash.com/photo-1598974357801-cbca100e65d3?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800'
        ],
        stableId: 'stable_1',
        stableName: 'إسطبل الخيول العربية الأصيلة',
        price: 250,
        rentType: 'hour',
        rentStart: '2026-07-01',
        rentEnd: '2026-12-31',
        createdAt: new Date().toISOString()
      }
    ];

    const sampleShelters: Shelter[] = [
      {
        id: 'shelter_1',
        userId: 'admin_user',
        userName: 'المدير العام',
        title: 'بوكسات إيواء خيل النخبة - باقة ملكية شاملة',
        description: 'خدمات إيواء ممتازة في غرف (بوكسات) مهواة ومغسولة يومياً. نوفر رعاية طبية متكاملة تحت إشراف أطباء بيطريين مع جدول تغذية علمي مخصص لكل جواد وتدريب يومي في الميدان.',
        type: 'monthly',
        nutrition: true,
        cleaning: true,
        training: true,
        veterinary: true,
        phone: '0559595055',
        images: ['https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&q=80&w=800'],
        rating: 5,
        createdAt: new Date().toISOString(),
        reviews: []
      }
    ];

    const sampleTransports: Transport[] = [
      {
        id: 'transport_1',
        userId: 'user_1',
        userName: 'أحمد الحربي',
        vehicleType: 'مقطورة شحن فخمة مزدوجة ومكيفة مع كاميرات مراقبة وحماية كاملة للجياد',
        capacity: 2,
        horseCount: 1,
        date: '2026-08-15',
        price: 1200,
        pickupAddress: 'الرياض - مربط الشقب',
        pickupCoords: { lat: 24.7136, lng: 46.6753 },
        deliveryAddress: 'جدة - إسطبل الصواري',
        deliveryCoords: { lat: 21.4858, lng: 39.1925 },
        createdAt: new Date().toISOString()
      }
    ];

    const sampleUsers: User[] = [
      {
        id: 'admin_user',
        name: 'المدير العام للمنصة',
        email: 'admin@m-estably.com',
        phone: '0559595055',
        nickname: 'admin',
        role: 'admin',
        createdAt: new Date().toISOString()
      },
      {
        id: 'user_1',
        name: 'أحمد الحربي',
        email: 'ahmed@gmail.com',
        phone: '0555612055',
        nickname: 'ahmed_harbi',
        role: 'user',
        createdAt: new Date().toISOString()
      }
    ];

    setLocal('stables', sampleStables);
    setLocal('horses', sampleHorses);
    setLocal('shelters', sampleShelters);
    setLocal('transports', sampleTransports);
    setLocal('users', sampleUsers);
    
    localStorage.setItem('horses_forum_initialized', 'true');
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

  // --- LOCAL CACHE ACCESSORS ---
  getLocalStables(): Stable[] {
    return getLocal<Stable>('stables');
  },

  getLocalHorses(): Horse[] {
    return getLocal<Horse>('horses');
  },

  getLocalShelters(): Shelter[] {
    return getLocal<Shelter>('shelters');
  },

  getLocalTransports(): Transport[] {
    return getLocal<Transport>('transports');
  }
};
