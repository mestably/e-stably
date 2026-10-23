/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { 
  Landmark, 
  Copy, 
  Check, 
  Upload, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MessageCircle, 
  Eye, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  CreditCard,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { User, BankReceipt, PLATFORM_BANK_ACCOUNTS, PlatformBankAccount } from '../types';
import { FirebaseService } from '../lib/firebase';
import { compressImage } from '../lib/imageUtils';
import { useAdminContact } from '../lib/useAdminContact';
import ImageLightboxModal from './ImageLightboxModal';

interface UserBankAccountsSectionProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onSuccessToast?: (msg: string) => void;
  onBackToAds?: () => void;
}

export default function UserBankAccountsSection({
  currentUser,
  onOpenAuth,
  onSuccessToast,
  onBackToAds
}: UserBankAccountsSectionProps) {
  const { adminWhatsApp, adminPhone } = useAdminContact();

  // Copy feedback states
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);
  const [copiedIbanId, setCopiedIbanId] = useState<string | null>(null);

  // Form states for uploading deposit slip
  const [selectedBankId, setSelectedBankId] = useState<string>('faisal_islamic_bank');
  const [purpose, setPurpose] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');

  // User receipts history
  const [userReceipts, setUserReceipts] = useState<BankReceipt[]>([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState<boolean>(true);

  // Lightbox modal for viewing receipts
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);
  const [lightboxTitle, setLightboxTitle] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load user receipts
  const fetchUserReceipts = async () => {
    if (!currentUser?.id) {
      setUserReceipts([]);
      setIsLoadingReceipts(false);
      return;
    }
    setIsLoadingReceipts(true);
    try {
      const list = await FirebaseService.getUserBankReceipts(currentUser.id);
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUserReceipts(list);
    } catch (err) {
      console.error('Failed to load user bank receipts', err);
    } finally {
      setIsLoadingReceipts(false);
    }
  };

  useEffect(() => {
    fetchUserReceipts();
  }, [currentUser?.id]);

  // Handle Copy to clipboard
  const handleCopy = (text: string, type: 'account' | 'iban', id: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'account') {
      setCopiedBankId(id);
      setTimeout(() => setCopiedBankId(null), 2500);
    } else {
      setCopiedIbanId(id);
      setTimeout(() => setCopiedIbanId(null), 2500);
    }
    if (onSuccessToast) {
      onSuccessToast(`تم نسخ ${type === 'account' ? 'رقم الحساب' : 'الآيبان'} بنجاح!`);
    }
  };

  // Handle file uploads (multiple images supported)
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingImages(true);
    setFormError('');

    try {
      const fileList: File[] = Array.from(files);
      for (const file of fileList) {
        if (!file.type.startsWith('image/')) {
          setFormError('يرجى اختيار ملفات صور صالحة فقط (JPG, PNG, WebP).');
          continue;
        }

        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onload = async () => {
            if (typeof reader.result === 'string') {
              try {
                // Compress image to ensure reliable storage and quick loading
                const compressed = await compressImage(reader.result, 1200, 1200, 0.8);
                setUploadedImages((prev) => [...prev, compressed]);
              } catch (err) {
                console.error('Image compression failed, using original', err);
                setUploadedImages((prev) => [...prev, reader.result as string]);
              }
            }
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsDataURL(file);
        });
      }
    } catch (err) {
      console.error('Error reading files', err);
      setFormError('حدث خطأ أثناء قراءة الصور. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessingImages(false);
      // Reset input so same file can be re-selected if removed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove single uploaded image
  const handleRemoveImage = (indexToRemove: number) => {
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Quick chips for purpose
  const quickPurposes = [
    'توثيق إعلان رسمي 🛡️',
    'ترقية باقة اشتراك المنصة 👑',
    'رسوم نشر إعلان إضافي 📢',
    'عمولة منصة عن بيع خيل 🐎',
    'سداد حجز إسطبل / إيواء 🏠',
    'سداد نقل خيل 🚚'
  ];

  // Submit deposit slip
  const handleSubmitDepositSlip = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (uploadedImages.length === 0) {
      setFormError('يرجى رفع صورة إيداع الحساب (يمكن رفع صورة واحدة أو عدة صور من الجهاز).');
      return;
    }

    if (!purpose.trim()) {
      setFormError('يرجى تحديد أو كتابة الغرض من التحويل / دفع الحساب.');
      return;
    }

    const selectedBank = PLATFORM_BANK_ACCOUNTS.find((b) => b.id === selectedBankId) || PLATFORM_BANK_ACCOUNTS[0];

    setIsSubmitting(true);

    try {
      const newReceipt: BankReceipt = {
        id: `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUser.id,
        userName: currentUser.name || 'مستخدم منصة إستابلي',
        userPhone: currentUser.phone || '',
        userEmail: currentUser.email || '',
        bankName: selectedBank.bankName,
        accountNumber: selectedBank.accountNumber,
        images: uploadedImages,
        purpose: purpose.trim(),
        amount: amount ? parseFloat(amount) : undefined,
        transferDate: transferDate || new Date().toISOString().split('T')[0],
        notes: notes.trim() || undefined,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await FirebaseService.saveBankReceipt(newReceipt);

      // Reset form
      setUploadedImages([]);
      setPurpose('');
      setAmount('');
      setNotes('');
      setFormSuccess('تم إرسال إيصال الإيداع للمدير بنجاح! سيتم مراجعته واعتماده في أقرب وقت.');
      if (onSuccessToast) {
        onSuccessToast('تم إرسال إيصال الإيداع للمدير بنجاح!');
      }

      // Refresh user's receipts list
      fetchUserReceipts();
    } catch (err) {
      console.error('Failed to submit bank receipt', err);
      setFormError('حدث خطأ أثناء حفظ الإيصال. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Lightbox
  const handleOpenLightbox = (images: string[], index: number = 0, title: string = '') => {
    setLightboxImages(images);
    setLightboxInitialIndex(index);
    setLightboxTitle(title);
    setIsLightboxOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-5 sm:p-7 shadow-lg border border-emerald-700/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500 text-slate-950 font-black text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs">
                <Landmark className="w-3.5 h-3.5" />
                الحسابات الرسمية المعتمدة
              </span>
              <span className="bg-white/10 text-emerald-200 text-xs px-2.5 py-1 rounded-lg font-bold border border-white/15">
                سداد آمن 100% 🛡️
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              الحسابات البنكية للمنصة ورفع إيصالات الإيداع
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              يمكنك التحويل إلى أي من حسابات المنصة الرسمية أدناه، ثم رفع صورة إيداع الحساب وتحديد الغرض من التحويل ليتم إرسالها مباشرة لمدير المنصة لمراجعتها واعتمادها.
            </p>
          </div>

          {onBackToAds && (
            <button
              onClick={onBackToAds}
              className="self-start md:self-auto px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition cursor-pointer border border-white/20"
            >
              <ChevronRight className="w-4 h-4" />
              <span>العودة لإعلاناتي</span>
            </button>
          )}
        </div>
      </div>

      {/* --- SECTION 1: THE TWO PLATFORM BANK ACCOUNTS (حسابات المنصة) --- */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
              <CreditCard className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                أرقام الحسابات البنكية الخاصة بالمنصة
              </h3>
              <p className="text-xs text-slate-500">
                اضغط على زر النسخ لنسخ رقم الحساب أو الآيبان مباشرة
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLATFORM_BANK_ACCOUNTS.map((bank, index) => {
            const isFaisal = bank.id === 'faisal_islamic_bank';
            const isCopiedAcc = copiedBankId === bank.id;
            const isCopiedIban = copiedIbanId === bank.id;

            return (
              <div
                key={bank.id}
                className={`rounded-2xl p-5 border shadow-sm transition-all relative overflow-hidden flex flex-col justify-between ${
                  isFaisal
                    ? 'bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 border-emerald-300 hover:border-emerald-500'
                    : 'bg-gradient-to-br from-amber-50/80 via-white to-orange-50/60 border-amber-300 hover:border-amber-500'
                }`}
              >
                {/* Bank Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-sm ${
                          isFaisal
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gradient-to-tr from-amber-600 to-amber-500 text-white'
                        }`}
                      >
                        <Landmark className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 block mb-0.5">
                          الحساب رقم #{index + 1}
                        </span>
                        <h4 className="text-base sm:text-lg font-black text-slate-900">
                          {bank.bankName}
                        </h4>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 ${
                        isFaisal
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/80'
                          : 'bg-amber-100 text-amber-900 border border-amber-300/80'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {bank.badge}
                    </span>
                  </div>

                  {/* Account Number Box */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2.5 mb-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span className="font-bold">رقم الحساب البنكي:</span>
                        <span className="text-[11px] text-slate-400">للتحويل المباشر</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                        <span className="font-mono text-base sm:text-lg font-black text-slate-900 tracking-wider dir-ltr select-all">
                          {bank.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(bank.accountNumber, 'account', bank.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                            isCopiedAcc
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                          }`}
                        >
                          {isCopiedAcc ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>تم النسخ ✓</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ الرقم</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* IBAN Box if available */}
                    {bank.iban && (
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span className="font-bold">رقم الآيبان (IBAN):</span>
                          <span className="text-[11px] text-slate-400">للتحويلات الدولية والمحلية</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                          <span className="font-mono text-xs sm:text-sm font-black text-slate-800 tracking-wider dir-ltr select-all truncate">
                            {bank.iban}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(bank.iban!, 'iban', bank.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs shrink-0 ${
                              isCopiedIban
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                            }`}
                          >
                            {isCopiedIban ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>تم النسخ ✓</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>نسخ الآيبان</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Beneficiary Name & Currency */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
                      <span className="text-slate-500 block text-[10px] font-bold">اسم المستفيد:</span>
                      <span className="text-slate-900 font-black truncate block mt-0.5">
                        {bank.accountHolder}
                      </span>
                    </div>
                    <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
                      <span className="text-slate-500 block text-[10px] font-bold">العملة المقبولة:</span>
                      <span className="text-slate-900 font-black truncate block mt-0.5">
                        {bank.currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Quick Action: Choose this bank for deposit form */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBankId(bank.id);
                      const el = document.getElementById('upload-deposit-form');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      selectedBankId === bank.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                  >
                    <span>{selectedBankId === bank.id ? '✓ البنك المحدد للتحويل' : 'اختر هذا الحساب للرفع'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- SECTION 2: UPLOAD DEPOSIT SLIP FORM (رفع صورة إيداع الحساب) --- */}
      <div id="upload-deposit-form" className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black">
            <Upload className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              رفع صورة إيداع الحساب والتحويل
            </h3>
            <p className="text-xs text-slate-500">
              ارفع صورة أو عدة صور لإيصال الإيداع أو إشعار التحويل مع توضيح الغرض من الدفع
            </p>
          </div>
        </div>

        {formError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSubmitDepositSlip} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Bank Selector */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                الحساب المحول إليه: <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition cursor-pointer"
              >
                {PLATFORM_BANK_ACCOUNTS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} - رقم: {b.accountNumber}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Amount (optional) */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                المبلغ المحول (إن وجد):
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="مثال: 500 ريال"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* 3. Purpose of Transfer (الغرض من التحويل / دفع الحساب) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black text-slate-700">
                الغرض من التحويل / دفع الحساب: <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-bold">مطلوب لمراجعة المدير</span>
            </div>

            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="اكتب الغرض (مثال: رسوم توثيق إعلان خيل، باقة اشتراك، عمولة بيع...)"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition mb-2"
            />

            {/* Quick Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 ml-1">اقتراحات سريعة:</span>
              {quickPurposes.map((qp) => (
                <button
                  key={qp}
                  type="button"
                  onClick={() => setPurpose(qp)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer border ${
                    purpose === qp
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Transfer Date & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                تاريخ التحويل:
              </label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                ملاحظات أو تفاصيل إضافية:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="اسم المحول منه، رقم المرجع، أو أي ملاحظة..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* 5. Upload Images Section (تحميل من الجهاز ويمكن عدد من الصور) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-black text-slate-700">
                صور إيداع الحساب (إيصال السداد): <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                يمكن رفع عدد من الصور من جهازك
              </span>
            </div>

            {/* Hidden Input for multiple files */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="receipt-file-input"
            />

            {/* Dropzone / Upload Trigger Button */}
            <label
              htmlFor="receipt-file-input"
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs group-hover:scale-105 transition flex items-center justify-center text-emerald-600 border border-slate-200">
                {isProcessingImages ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-black text-slate-800 block">
                  {isProcessingImages ? 'جارٍ معالجة الصور...' : 'اضغط لاختيار صورة أو صور إيداع الحساب من جهازك'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  يدعم صور JPG, PNG, WebP (يمكنك تحديد عدة صور دفعة واحدة)
                </span>
              </div>
            </label>

            {/* Preview of Uploaded Images */}
            {uploadedImages.length > 0 && (
              <div className="mt-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>الصور المحددة ({uploadedImages.length} صور):</span>
                  <button
                    type="button"
                    onClick={() => setUploadedImages([])}
                    className="text-rose-600 hover:text-rose-700 text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    مسح جميع الصور
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {uploadedImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square shadow-2xs"
                    >
                      <img
                        src={img}
                        alt={`إيصال ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Overlay action */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenLightbox(uploadedImages, idx, 'معاينة إيصال الإيداع')}
                          className="w-7 h-7 rounded-lg bg-white/90 text-slate-900 flex items-center justify-center hover:bg-white cursor-pointer transition shadow-xs"
                          title="معاينة بالحجم الكامل"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 cursor-pointer transition shadow-xs"
                          title="حذف الصورة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}

                  {/* Add more images button */}
                  <label
                    htmlFor="receipt-file-input"
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition text-slate-500 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50/50 aspect-square"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] font-bold">إضافة صور</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting || isProcessingImages}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>جارٍ إرسال الإيصال للمدير...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>إرسال إيصال الإيداع للمدير للاعتماد ✓</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* --- SECTION 3: USER'S PREVIOUS RECEIPTS (سجل إيصالاتي السابقة) --- */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black">
              <FileText className="w-4 h-4 text-slate-700" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                سجل إيصالات الإيداع المرفوعة من قبلك
              </h3>
              <p className="text-xs text-slate-500">
                متابعة حالة الإيصالات المرسلة للمدير (قيد المراجعة / معتمد / مرفوض)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchUserReceipts}
            disabled={isLoadingReceipts}
            className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReceipts ? 'animate-spin' : ''}`} />
            <span>تحديث السجل</span>
          </button>
        </div>

        {isLoadingReceipts ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-emerald-600" />
            <p className="text-xs font-bold">جارٍ تحميل سجل الإيصالات...</p>
          </div>
        ) : userReceipts.length === 0 ? (
          <div className="py-10 text-center bg-slate-50 rounded-2xl border border-slate-200/70 p-6 space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 mx-auto flex items-center justify-center">
              <Landmark className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-black text-slate-700">لا توجد إيصالات إيداع مرفوعة حتى الآن</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              عند تحويل أي مبلغ لحسابات المنصة، ارفع صورة إيداع الحساب من النموذج أعلاه وستظهر هنا مع حالتها وملاحظات الإدارة.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userReceipts.map((receipt) => {
              const statusBadge = {
                pending: {
                  label: 'قيد المراجعة من الإدارة ⏳',
                  class: 'bg-amber-100 text-amber-900 border-amber-300'
                },
                approved: {
                  label: 'تم الاعتماد والتأكيد بنجاح ✓',
                  class: 'bg-emerald-100 text-emerald-900 border-emerald-300'
                },
                rejected: {
                  label: 'تم الرفض أو يرجى مراجعة الإدارة ❌',
                  class: 'bg-rose-100 text-rose-900 border-rose-300'
                }
              }[receipt.status] || {
                label: 'قيد المراجعة',
                class: 'bg-slate-100 text-slate-800 border-slate-300'
              };

              return (
                <div
                  key={receipt.id}
                  className="rounded-2xl p-4 sm:p-5 border border-slate-200/90 bg-slate-50/60 hover:bg-slate-50 transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Status & Date */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full border shadow-2xs ${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>
                      <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(receipt.createdAt).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Purpose (الغرض من دفع الحساب) */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                        الغرض من دفع الحساب:
                      </span>
                      <p className="text-sm font-black text-slate-900">
                        {receipt.purpose}
                      </p>
                    </div>

                    {/* Bank & Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] font-bold text-slate-400 block">البنك المحول إليه:</span>
                        <span className="text-slate-800 font-bold block truncate mt-0.5">
                          {receipt.bankName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block dir-ltr text-right">
                          {receipt.accountNumber}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] font-bold text-slate-400 block">المبلغ:</span>
                        <span className="text-slate-900 font-black block mt-0.5">
                          {receipt.amount ? `${receipt.amount} ريال / جنيه` : 'غير محدد'}
                        </span>
                        {receipt.transferDate && (
                          <span className="text-[10px] text-slate-500 block">
                            بتاريخ: {receipt.transferDate}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Notes if any */}
                    {receipt.notes && (
                      <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-700">ملاحظتك:</span> {receipt.notes}
                      </p>
                    )}

                    {/* Admin notes if any */}
                    {receipt.adminNotes && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs">
                        <span className="font-black text-amber-900 block mb-0.5">ملاحظة الإدارة:</span>
                        <p className="text-amber-800 font-bold">{receipt.adminNotes}</p>
                      </div>
                    )}

                    {/* Deposit Images Thumbnails */}
                    {receipt.images && receipt.images.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                          صور الإيصال المرفوعة ({receipt.images.length} صور):
                        </span>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {receipt.images.map((img, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleOpenLightbox(receipt.images, idx, `إيصال: ${receipt.purpose}`)}
                              className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative group cursor-pointer hover:border-emerald-500 shadow-2xs"
                              title="اضغط للتكبير"
                            >
                              <img src={img} alt="إيصال" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                <Eye className="w-4 h-4" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contact WhatsApp with admin regarding this receipt */}
                  {adminWhatsApp && (
                    <div className="pt-2 border-t border-slate-200/70">
                      <a
                        href={`https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(
                          `السلام عليكم ورحمة الله، بخصوص إيصال التحويل الخاص بي على منصة إستابلي:\n- الغرض: ${receipt.purpose}\n- البنك: ${receipt.bankName}\n- كود الإيصال: ${receipt.id}\nأرجو التكرم بالاعتماد.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 transition shadow-2xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>مراسلة الإدارة عبر الواتساب للاستفسار</span>
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image Lightbox Modal for zooming and inspecting receipts */}
      <ImageLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={lightboxImages}
        initialIndex={lightboxInitialIndex}
        title={lightboxTitle || 'معاينة إيصال الإيداع'}
      />
    </div>
  );
}
