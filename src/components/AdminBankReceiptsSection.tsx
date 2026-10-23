/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Landmark, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trash2, 
  MessageCircle, 
  Phone, 
  Eye, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  Calendar,
  CreditCard,
  Check,
  X,
  Filter,
  User as UserIcon,
  HelpCircle
} from 'lucide-react';
import { BankReceipt, PLATFORM_BANK_ACCOUNTS } from '../types';
import { FirebaseService } from '../lib/firebase';
import ImageLightboxModal from './ImageLightboxModal';

interface AdminBankReceiptsSectionProps {
  onNotification?: (msg: string, type?: 'success' | 'error') => void;
}

export default function AdminBankReceiptsSection({ onNotification }: AdminBankReceiptsSectionProps) {
  const [receipts, setReceipts] = useState<BankReceipt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [bankFilter, setBankFilter] = useState<'all' | string>('all');

  // Review / Decision Modal
  const [reviewModalReceipt, setReviewModalReceipt] = useState<BankReceipt | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [adminNoteInput, setAdminNoteInput] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Delete Confirm Modal
  const [deleteReceiptId, setDeleteReceiptId] = useState<string | null>(null);

  // Lightbox Modal for Full Image Inspection
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxTitle, setLightboxTitle] = useState<string>('');

  // Fetch all receipts
  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      const list = await FirebaseService.getBankReceipts();
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReceipts(list);
    } catch (err) {
      console.error('Failed to load bank receipts', err);
      if (onNotification) onNotification('فشل تحميل الإيصالات المرفوعة', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  // Quick Status Update
  const handleQuickStatusChange = async (receiptId: string, newStatus: 'approved' | 'rejected' | 'pending', note?: string) => {
    try {
      await FirebaseService.updateBankReceiptStatus(receiptId, newStatus, note);
      setReceipts((prev) =>
        prev.map((r) =>
          r.id === receiptId
            ? {
                ...r,
                status: newStatus,
                adminNotes: note !== undefined ? note : r.adminNotes,
                reviewedAt: new Date().toISOString()
              }
            : r
        )
      );
      if (onNotification) {
        const msg = newStatus === 'approved' 
          ? 'تم اعتماد الإيصال بنجاح ✓' 
          : newStatus === 'rejected' 
          ? 'تم رفض الإيصال وتحديث الحالة' 
          : 'تمت إعادة الإيصال لقيد المراجعة';
        onNotification(msg, 'success');
      }
    } catch (err) {
      console.error('Failed to update receipt status', err);
      if (onNotification) onNotification('حدث خطأ أثناء تحديث حالة الإيصال', 'error');
    }
  };

  // Submit Detailed Review (with notes)
  const handleSubmitReview = async () => {
    if (!reviewModalReceipt) return;
    setIsSubmittingReview(true);
    try {
      await handleQuickStatusChange(reviewModalReceipt.id, reviewDecision, adminNoteInput.trim() || undefined);
      setReviewModalReceipt(null);
      setAdminNoteInput('');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteReceiptId) return;
    try {
      await FirebaseService.deleteBankReceipt(deleteReceiptId);
      setReceipts((prev) => prev.filter((r) => r.id !== deleteReceiptId));
      setDeleteReceiptId(null);
      if (onNotification) onNotification('تم حذف الإيصال بنجاح', 'success');
    } catch (err) {
      console.error('Failed to delete receipt', err);
      if (onNotification) onNotification('فشل حذف الإيصال', 'error');
    }
  };

  // Open Lightbox
  const handleOpenLightbox = (images: string[], index: number = 0, title: string = '') => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxTitle(title);
    setIsLightboxOpen(true);
  };

  // Filtered List
  const filteredReceipts = receipts.filter((r) => {
    // Status filter
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    // Bank filter
    if (bankFilter !== 'all' && !r.bankName.includes(bankFilter)) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = r.userName?.toLowerCase().includes(q);
      const matchPhone = r.userPhone?.toLowerCase().includes(q);
      const matchPurpose = r.purpose?.toLowerCase().includes(q);
      const matchNotes = r.notes?.toLowerCase().includes(q);
      const matchId = r.id?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchPurpose && !matchNotes && !matchId) return false;
    }
    return true;
  });

  // Metrics
  const totalCount = receipts.length;
  const pendingCount = receipts.filter((r) => r.status === 'pending').length;
  const approvedCount = receipts.filter((r) => r.status === 'approved').length;
  const rejectedCount = receipts.filter((r) => r.status === 'rejected').length;

  return (
    <div className="bg-white rounded-b-2xl p-4 sm:p-6 border border-t-0 border-slate-200/60 shadow-xs space-y-6">
      
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-emerald-900 to-[#142926] text-white p-5 sm:p-6 rounded-2xl shadow-md border border-emerald-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-300 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
            <Landmark className="w-7 h-7 text-emerald-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black tracking-wide">
                صفحة الحسابات المرفوعة من المستخدمين وإيصالات السداد
              </h2>
              <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow-2xs">
                خاص بالإدارة 🛡️
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              هنا تظهر صور إيداع الحسابات المحولة من المستخدمين مع التاريخ والغرض من دفع الحساب لمراجعتها واعتمادها فوراً.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
          <button
            onClick={fetchReceipts}
            disabled={isLoading}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-white/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث الإيصالات</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-500 block">إجمالي الإيصالات المرفوعة</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-black text-slate-900 font-mono">{totalCount}</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-md">الكل</span>
          </div>
        </div>

        <div className="p-3.5 bg-amber-50/80 border border-amber-300/80 rounded-2xl">
          <span className="text-[11px] font-bold text-amber-900 block">بانتظار المراجعة والاعتماد</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-black text-amber-950 font-mono">{pendingCount}</span>
            {pendingCount > 0 ? (
              <span className="text-[10px] bg-amber-500 text-white font-black px-2 py-0.5 rounded-md animate-pulse">
                جديد ⏳
              </span>
            ) : (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                مكتمل ✓
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5 bg-emerald-50/80 border border-emerald-300/80 rounded-2xl">
          <span className="text-[11px] font-bold text-emerald-900 block">الإيصالات المعتمدة</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-black text-emerald-950 font-mono">{approvedCount}</span>
            <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-md">
              معتمد ✓
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-rose-50/80 border border-rose-200/80 rounded-2xl">
          <span className="text-[11px] font-bold text-rose-900 block">الإيصالات المرفوضة</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-black text-rose-950 font-mono">{rejectedCount}</span>
            <span className="text-[10px] bg-rose-200 text-rose-800 font-bold px-2 py-0.5 rounded-md">
              مرفوضة
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث بالاسم، الهاتف، أو الغرض..."
              className="w-full bg-white border border-slate-300 rounded-xl pr-9 pl-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">جميع الحالات ({totalCount})</option>
              <option value="pending">بانتظار المراجعة ({pendingCount}) ⏳</option>
              <option value="approved">المعتمدة فقط ({approvedCount}) ✓</option>
              <option value="rejected">المرفوضة ({rejectedCount}) ❌</option>
            </select>
          </div>

          {/* Bank Filter */}
          <div>
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">جميع البنوك والحسابات</option>
              <option value="فيصل">حساب بنك فيصل الإسلامي (8542412232100)</option>
              <option value="السعودي">حساب البنك السعودي (21546522122)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Receipts List */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-sm font-bold">جارٍ تحميل الإيصالات المرفوعة من المستخدمين...</p>
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-200/70 p-6 space-y-2">
          <Landmark className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-sm sm:text-base font-black text-slate-700">
            لا توجد إيصالات تطابق معايير البحث
          </h4>
          <p className="text-xs text-slate-500">
            {searchQuery || statusFilter !== 'all' || bankFilter !== 'all'
              ? 'جرّب تغيير خيارات البحث أو تصفية الحالات'
              : 'لم يقم أي مستخدم برفع إيصالات بنكية حتى الآن'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span>عدد النتائج: {filteredReceipts.length} إيصال</span>
            <span>مرتبة من الأحدث إلى الأقدم</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredReceipts.map((receipt) => {
              const isPending = receipt.status === 'pending';
              const isApproved = receipt.status === 'approved';
              const isRejected = receipt.status === 'rejected';

              return (
                <div
                  key={receipt.id}
                  className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
                    isPending
                      ? 'bg-amber-50/40 border-amber-300/90 hover:border-amber-400 ring-1 ring-amber-200'
                      : isApproved
                      ? 'bg-emerald-50/30 border-emerald-300/80 hover:border-emerald-400'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    
                    {/* LEFT / CENTER: Images, Purpose, Date & Details */}
                    <div className="flex-1 space-y-4">
                      
                      {/* Top Row: User Info & Status Badge */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-black">
                            <UserIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm sm:text-base font-black text-slate-900">
                                {receipt.userName}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-mono">
                                #{receipt.id.substring(receipt.id.length - 6)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                              {receipt.userPhone && (
                                <span className="font-mono dir-ltr font-bold text-slate-700">
                                  {receipt.userPhone}
                                </span>
                              )}
                              {receipt.userEmail && (
                                <>
                                  <span>•</span>
                                  <span>{receipt.userEmail}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isPending && (
                            <span className="bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                              <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                              <span>بانتظار المراجعة والاعتماد ⏳</span>
                            </span>
                          )}
                          {isApproved && (
                            <span className="bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>تم الاعتماد والتأكيد بنجاح ✓</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="bg-rose-100 text-rose-950 border border-rose-300 text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                              <XCircle className="w-3.5 h-3.5 text-rose-700" />
                              <span>تم الرفض ❌</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* THE CRITICAL SECTION AS REQUESTED BY USER:
                          "الصور دى هتروح للمدير فى قسم الادمن فى صفحه الحسابات المرفوعه من المستخدمين وجنبها التاريخ والغرض من دفع الحساب"
                      */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
                        
                        {/* 1. Deposit Images Column (4 cols) */}
                        <div className="md:col-span-5 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-black text-slate-700 flex items-center gap-1.5">
                              <Eye className="w-4 h-4 text-emerald-600" />
                              <span>صور إيداع الحساب ({receipt.images?.length || 0}):</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              اضغط للتكبير بشاشة كاملة
                            </span>
                          </div>

                          {receipt.images && receipt.images.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                              {receipt.images.map((img, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleOpenLightbox(receipt.images, idx, `إيصال: ${receipt.purpose} - ${receipt.userName}`)}
                                  className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative group cursor-pointer hover:border-emerald-500 shadow-2xs"
                                  title="اضغط للتكبير والفحص الدقيق"
                                >
                                  <img src={img} alt="إيصال إيداع" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                    <Eye className="w-5 h-5" />
                                  </div>
                                  <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1 rounded-sm">
                                    #{idx + 1}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                              لا توجد صورة مرفوعة
                            </div>
                          )}
                        </div>

                        {/* 2. Date & Purpose Column (7 cols) - Side by Side as requested! */}
                        <div className="md:col-span-7 space-y-3 md:border-r md:border-slate-100 md:pr-4 flex flex-col justify-between">
                          
                          {/* Purpose: الغرض من دفع الحساب */}
                          <div>
                            <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 inline-block mb-1">
                              الغرض من دفع الحساب / التحويل:
                            </span>
                            <p className="text-sm sm:text-base font-black text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                              {receipt.purpose}
                            </p>
                          </div>

                          {/* Date: التاريخ جنب الغرض */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                              <span className="text-[10px] font-bold text-slate-400 block flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                تاريخ رفع الإيصال:
                              </span>
                              <span className="text-slate-900 font-black block mt-0.5">
                                {new Date(receipt.createdAt).toLocaleDateString('ar-EG', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(receipt.createdAt).toLocaleTimeString('ar-EG', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>

                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                              <span className="text-[10px] font-bold text-slate-400 block flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                تاريخ التحويل الفعلي:
                              </span>
                              <span className="text-slate-900 font-black block mt-0.5">
                                {receipt.transferDate || 'غير محدد'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {receipt.amount ? `${receipt.amount} ريال / جنيه` : 'المبلغ غير محدد'}
                              </span>
                            </div>
                          </div>

                          {/* Bank Info */}
                          <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70 text-xs flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block">البنك المحول إليه:</span>
                              <span className="font-bold text-slate-800">{receipt.bankName}</span>
                            </div>
                            <span className="font-mono text-xs font-black text-slate-900 bg-white px-2 py-1 rounded-md border border-slate-200 dir-ltr">
                              {receipt.accountNumber}
                            </span>
                          </div>

                          {/* Notes if any */}
                          {receipt.notes && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                              <span className="font-bold text-slate-700">ملاحظة المستخدم:</span> {receipt.notes}
                            </p>
                          )}

                          {/* Admin Note if already reviewed */}
                          {receipt.adminNotes && (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs">
                              <span className="font-black text-amber-900 block mb-0.5">ملاحظة الإدارة المسجلة:</span>
                              <p className="text-amber-800 font-bold">{receipt.adminNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT / ACTIONS COLUMN */}
                    <div className="lg:w-48 shrink-0 flex flex-col gap-2 pt-2 lg:pt-0 lg:border-r lg:border-slate-200/80 lg:pr-4">
                      <span className="text-[11px] font-bold text-slate-400 mb-1 block">إجراءات الإدارة:</span>

                      {/* WhatsApp Button to chat with user */}
                      {receipt.userPhone && (
                        <a
                          href={`https://wa.me/${receipt.userPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `السلام عليكم ورحمة الله أخي ${receipt.userName}، بخصوص إيصال التحويل المرفوع عبر منصة إستابلي:\n- الغرض: ${receipt.purpose}\n- البنك: ${receipt.bankName}`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 transition shadow-2xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>مراسلة واتساب</span>
                        </a>
                      )}

                      {/* Direct Phone Call */}
                      {receipt.userPhone && (
                        <a
                          href={`tel:${receipt.userPhone}`}
                          className="w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition border border-slate-200"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>اتصال هاتفي</span>
                        </a>
                      )}

                      {/* Decision: Approve Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setReviewModalReceipt(receipt);
                          setReviewDecision('approved');
                          setAdminNoteInput('تم التحقق من الإيداع البنكي واعتماد العملية بنجاح.');
                        }}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span>{isApproved ? 'إعادة اعتماد الإيصال' : 'اعتماد وتأكيد السداد ✓'}</span>
                      </button>

                      {/* Decision: Reject Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setReviewModalReceipt(receipt);
                          setReviewDecision('rejected');
                          setAdminNoteInput('يرجى إعادة رفع صورة إيداع واضحة أو التواصل مع الإدارة.');
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <X className="w-4 h-4 text-rose-600" />
                        <span>رفض الإيصال مع سبب</span>
                      </button>

                      {/* Reset to Pending if not pending */}
                      {!isPending && (
                        <button
                          type="button"
                          onClick={() => handleQuickStatusChange(receipt.id, 'pending')}
                          className="w-full py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>إرجاع لقيد المراجعة ⏳</span>
                        </button>
                      )}

                      {/* Delete Receipt */}
                      <button
                        type="button"
                        onClick={() => setDeleteReceiptId(receipt.id)}
                        className="w-full py-1.5 px-2 rounded-xl text-rose-600 hover:bg-rose-50 text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer mt-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>حذف الإيصال</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- REVIEW & DECISION MODAL --- */}
      {reviewModalReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  reviewDecision === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {reviewDecision === 'approved' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {reviewDecision === 'approved' ? 'اعتماد وتأكيد إيصال الإيداع' : 'رفض إيصال الإيداع'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalReceipt(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Summary Box */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">المستخدم:</span>
                <span className="font-black text-slate-900">{reviewModalReceipt.userName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">الغرض من التحويل:</span>
                <span className="font-black text-emerald-800">{reviewModalReceipt.purpose}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">البنك:</span>
                <span className="font-bold text-slate-800">{reviewModalReceipt.bankName}</span>
              </div>
              {reviewModalReceipt.amount && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">المبلغ:</span>
                  <span className="font-black text-slate-900">{reviewModalReceipt.amount} ريال / جنيه</span>
                </div>
              )}
            </div>

            {/* Decision Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReviewDecision('approved')}
                className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                  reviewDecision === 'approved'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>اعتماد الإيصال ✓</span>
              </button>
              <button
                type="button"
                onClick={() => setReviewDecision('rejected')}
                className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                  reviewDecision === 'rejected'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <X className="w-3.5 h-3.5" />
                <span>رفض الإيصال ❌</span>
              </button>
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                ملاحظة الإدارة (تظهر للمستخدم في حسابه):
              </label>
              <textarea
                rows={3}
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
                placeholder="اكتب ملاحظة أو تأكيد أو سبب الرفض..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={handleSubmitReview}
                className={`flex-1 py-3 px-4 rounded-xl text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md transition cursor-pointer ${
                  reviewDecision === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isSubmittingReview ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>حفظ القرار وتحديث الحالة</span>
              </button>
              <button
                type="button"
                onClick={() => setReviewModalReceipt(null)}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRM MODAL --- */}
      {deleteReceiptId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">هل أنت متأكد من حذف هذا الإيصال؟</h3>
              <p className="text-xs text-slate-500">لا يمكن التراجع عن هذه الخطوة وسيتم حذف صور الإيصال المرفوعة.</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition cursor-pointer shadow-xs"
              >
                تأكيد الحذف
              </button>
              <button
                type="button"
                onClick={() => setDeleteReceiptId(null)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={lightboxImages}
        initialIndex={lightboxIndex}
        title={lightboxTitle || 'معاينة إيصال الإيداع المرفوع'}
      />
    </div>
  );
}
