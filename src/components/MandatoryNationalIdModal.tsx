/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, AlertCircle, CheckCircle, X } from 'lucide-react';
import { User } from '../types';
import { FirebaseService } from '../lib/firebase';

interface MandatoryNationalIdModalProps {
  isOpen: boolean;
  currentUser: User;
  onSuccess: (updatedUser: User) => void;
  onDismissTemporarily: () => void;
}

export default function MandatoryNationalIdModal({
  isOpen,
  currentUser,
  onSuccess,
  onDismissTemporarily,
}: MandatoryNationalIdModalProps) {
  const [nationalId, setNationalId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const clean = nationalId.trim().replace(/[^\d]/g, '');
    if (!clean || clean.length < 8) {
      setError('يرجى إدخال رقم هوية وطنية أو إقامة صحيح لا يقل عن 8 أرقام.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser: User = {
        ...currentUser,
        nationalId: clean,
        updatedAt: new Date().toISOString(),
      };

      await FirebaseService.saveUser(updatedUser);
      localStorage.setItem('horses_forum_session', JSON.stringify(updatedUser));
      setSuccess('تم حفظ وتوثيق رقم الهوية الوطنية بنجاح!');
      setTimeout(() => {
        onSuccess(updatedUser);
      }, 700);
    } catch (err: any) {
      console.error('Failed to save national ID', err);
      setError('تعذر حفظ رقم الهوية، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border-2 border-amber-400 flex flex-col text-right animate-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 p-5 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white">تأكيد رقم الهوية الوطنية</h3>
              <p className="text-xs text-amber-100 font-medium">مطلوب لاستكمال توثيق الحساب بالمنصة</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismissTemporarily}
            title="تأجيل التذكير لمدة 3 دقائق"
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border-r-4 border-red-500 text-red-700 text-xs rounded-xl flex items-start gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-bold leading-relaxed">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border-r-4 border-emerald-500 text-emerald-800 text-xs rounded-xl flex items-start gap-2 shadow-xs">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="font-bold leading-relaxed">{success}</span>
            </div>
          )}

          {/* User Notice */}
          <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 text-xs text-amber-950 space-y-2 leading-relaxed">
            <div className="flex items-center gap-2 font-black text-amber-900">
              <span className="text-sm">مرحباً {currentUser.name || 'عزيزنا المستخدم'} 👋</span>
            </div>
            <p>
              لوحظ أن حسابك (المسجل عبر {currentUser.authProvider === 'google' ? 'Google' : 'المنصة'}) لم يكتمل تسجيل <strong>رقم الهوية الوطنية أو الإقامة</strong> بعد.
            </p>
            <p className="text-[11px] text-amber-800">
              وفقاً للوائح حماية المعاملات وموثوقية الإعلانات والحوالات البنكية، يلزم تسجيل رقم الهوية للتحقق من هوية المعلن وصاحب الحساب.
            </p>
          </div>

          {/* National ID Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-black text-slate-800">
                رقم الهوية الوطنية أو الإقامة <span className="text-rose-500">*</span>
              </label>
              {nationalId.trim().length >= 8 && (
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> مكتمل
                </span>
              )}
            </div>

            <div className="relative">
              <Shield className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                inputMode="numeric"
                required
                autoFocus
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="أدخل رقم الهوية أو الإقامة (مثال: 10XXXXXXXX)"
                maxLength={15}
                className="w-full text-sm pl-4 pr-11 py-3 border-2 border-slate-300 focus:border-amber-500 rounded-2xl focus:outline-hidden font-mono text-right bg-slate-50 focus:bg-white transition shadow-inner"
                dir="ltr"
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              يُحفظ بأمان وسرية تامة ولا يظهر للعامة، ويُستخدم فقط للمطابقة الأمنية والمصرفية.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={isSaving || nationalId.trim().length < 8}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-black py-3 rounded-2xl transition shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري الحفظ والتوثيق...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>حفظ وتوثيق رقم الهوية الآن</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onDismissTemporarily}
              className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-bold transition rounded-xl cursor-pointer hover:bg-slate-100"
            >
              تذكيري لاحقاً (خلال 3 دقائق)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
