/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Camera, 
  Lock, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  X,
  Save,
  Shield,
  FileText
} from 'lucide-react';
import { User } from '../types';
import { FirebaseService } from '../lib/firebase';
import { compressImage } from '../lib/imageUtils';

interface UserProfileModalProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onUpdateUser: (updatedUser: User) => void;
}

export default function UserProfileModal({
  isOpen,
  currentUser,
  onClose,
  onUpdateUser
}: UserProfileModalProps) {
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [nickname, setNickname] = useState(currentUser.nickname || '');
  const [city, setCity] = useState(currentUser.city || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [newPassword, setNewPassword] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reset form when modal opens or user changes
  useEffect(() => {
    setName(currentUser.name || '');
    setEmail(currentUser.email || '');
    setPhone(currentUser.phone || '');
    setNickname(currentUser.nickname || '');
    setCity(currentUser.city || '');
    setBio(currentUser.bio || '');
    setAvatar(currentUser.avatar || '');
    setNewPassword('');
    setError('');
    setSuccess('');
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const rawBase64 = reader.result as string;
        const compressed = await compressImage(rawBase64, 400, 400, 0.85);
        setAvatar(compressed);
        setIsUploading(false);
      };
      reader.onerror = () => {
        setError('فشل قراءة ملف الصورة.');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('فشل تحميل الصورة، يرجى اختيار صورة أخرى.');
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('يرجى ملء الاسم، البريد الإلكتروني، ورقم الهاتف.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser: User = {
        ...currentUser,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        nickname: nickname.trim(),
        city: city.trim(),
        bio: bio.trim(),
        avatar: avatar,
        password: newPassword ? newPassword : currentUser.password,
        updatedAt: new Date().toISOString()
      };

      await FirebaseService.saveUser(updatedUser);
      
      // Update local storage session
      localStorage.setItem('horses_forum_session', JSON.stringify(updatedUser));
      
      onUpdateUser(updatedUser);
      setSuccess('تم تحديث ملفك الشخصي بنجاح!');
      
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError('حدث خطأ أثناء حفظ التعديلات.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-navy p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base">تعديل الملف الشخصي</h2>
              <p className="text-[11px] text-slate-300">قم بتحديث بياناتك وصورتك الشخصية بسهولة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border-r-4 border-red-500 text-red-700 text-xs rounded-l flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border-r-4 border-green-500 text-green-700 text-xs rounded-l flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Avatar Upload */}
          <div className="flex flex-col items-center justify-center gap-3 pb-3 border-b border-slate-100">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-gold bg-slate-100 flex items-center justify-center shadow-md">
                {avatar ? (
                  <img src={avatar} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-navy text-2xl font-black">{name.charAt(0)}</span>
                )}
              </div>
              <label className="absolute bottom-0 left-0 bg-navy hover:bg-navy-dark text-white p-2 rounded-full cursor-pointer shadow-lg transition">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            <span className="text-[11px] text-slate-500">اضغط على أيقونة الكاميرا لتغيير الصورة الشخصية</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل</label>
              <div className="relative">
                <UserIcon className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد العتيبي"
                  required
                  className="w-full text-xs pl-3 pr-9 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  required
                  className="w-full text-xs pl-3 pr-9 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الجوال / واتساب</label>
              <div className="relative">
                <Phone className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="055XXXXXXX"
                  required
                  className="w-full text-xs pl-3 pr-9 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                />
              </div>
            </div>

            {/* Nickname */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الاسم المستعار</label>
              <div className="relative">
                <Sparkles className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="ahmed_99"
                  className="w-full text-xs pl-3 pr-9 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                />
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المدينة / المنطقة</label>
              <div className="relative">
                <MapPin className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="الرياض، جدة، مكة..."
                  className="w-full text-xs pl-3 pr-9 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                />
              </div>
            </div>

            {/* Change Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تغيير كلمة السر (اختياري)</label>
              <div className="relative">
                <Lock className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="كلمة سر جديدة..."
                  className="w-full text-xs pl-3 pr-9 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                />
              </div>
            </div>

          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نبذة تعريفية (الخبرة، اهتمامات الخيل...)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="مثال: مربي خيل عربية أصيلة وخبير تدريب وقفز..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
            />
          </div>

          {/* Badges / Account Status Info */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-navy" />
              <span>نوع الحساب: <strong className="text-navy">{currentUser.role === 'admin' ? 'مدير نظام' : 'عضو مسجل'}</strong></span>
            </div>
            <div>
              تاريخ الانضمام: {new Date(currentUser.createdAt).toLocaleDateString('ar-SA')}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="flex-1 bg-navy hover:bg-navy-dark text-white font-bold py-3 rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'جاري حفظ التعديلات...' : 'حفظ التعديلات'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition text-xs cursor-pointer"
            >
              إلغاء
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
