/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string; // WhatsApp
  nickname: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number; // 1 to 5 stars
  comment: string;
  createdAt: string;
}

export interface Stable {
  id: string;
  userId: string;
  userName: string;
  name: string;
  description: string;
  phone: string;
  images: string[]; // Base64 or URLs
  verified: 'verified' | 'pending' | 'unverified';
  horseCount: number;
  rating: number;
  reviews?: Review[];
  createdAt: string;
}

export interface Horse {
  id: string;
  userId: string;
  userName: string;
  adType: 'sale' | 'rent';
  name: string;
  damName: string;
  sireName: string;
  certificate: string; // certificate photo URL or Base64
  breed: 'arabian' | 'shabi' | 'sisi' | 'foreign'; // عربي, شعبي, سيسي, أجنبي
  age: number;
  gender: 'stallion' | 'mare' | 'gelding'; // ذكر, أنثى, مخصى
  color: string;
  healthStatus: string;
  images: string[]; // Base64 or URLs
  stableId: string; // Associated stable ID (optional or manual entry)
  stableName?: string;
  price?: number; // Price or rent price
  rentType?: 'hour' | 'day'; // hour or day
  rentStart?: string;
  rentEnd?: string;
  createdAt: string;
}

export interface Shelter {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string;
  type: 'monthly' | 'daily'; // شهري / يومي
  nutrition: boolean;
  cleaning: boolean;
  training: boolean;
  veterinary: boolean;
  phone: string;
  images: string[];
  rating: number;
  reviews?: Review[];
  createdAt: string;
}

export interface Transport {
  id: string;
  userId: string;
  userName: string;
  vehicleType: string;
  capacity: number;
  horseCount: number;
  date: string;
  price: number;
  pickupAddress: string;
  pickupCoords?: { lat: number; lng: number };
  deliveryAddress: string;
  deliveryCoords?: { lat: number; lng: number };
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  message: string;
  createdAt: string;
}
