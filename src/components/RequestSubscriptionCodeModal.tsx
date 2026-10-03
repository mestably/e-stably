/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  ShieldCheck, 
  MessageCircle,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { User, SubscriptionCode } from '../types';
import { SubscriptionService } from '../lib/subscriptionService';
import { useAdminContact } from '../lib/useAdminContact';

interface RequestSubscriptionCodeModalProps {
  isOpen: boolean;
  currentUser: User | null;
  onClose: () => void;
  onCodeGenerated?: (code: string) => void;
  onOpenAuth?: () => void;
  adType?: string;
}

export default function RequestSubscriptionCodeModal({
  isOpen,
  currentUser,
  onClose,
  onCodeGenerated,
  onOpenAuth,
  adType = 'إعلان جديد'
}: RequestSubscriptionCodeModalProps) {
  const { adminWhatsApp } = useAdminContact();
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasSentToWhatsapp, setHasSentToWhatsapp] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      handleGenerateNewCode();
    }
  }, [isOpen, currentUser?.id]);

  if (!isOpen) return null;

  const handleGenerateNewCode = async () => {
    if (!currentUser) return;
    setIsGenerating(true);
    setHasSentToWhatsapp(false);
    try {
      const res = await SubscriptionService.requestSubscriptionCode(currentUser, { adType });
      setGeneratedCode(res.code.code);
      setWhatsappUrl(res.whatsappUrl);
      if (onCodeGenerated) {
        onCodeGenerated(res.code.code);
      }
    } catch (e) {
      console.error('Failed to request subscription code', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenWhatsapp = () => {
    if (!whatsappUrl) return;
    const targetWa = adminWhatsApp || '966559595055';
    const finalUrl = whatsappUrl.replace(/wa\.me\/[0-9]+/, `wa.me/${targetWa}`);
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
    setHasSentToWhatsapp(true);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col my-8 animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-navy via-navy to-slate-900 p-5 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-base text-white">طلب كود نشر إضافي</h2>
                <span className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full shadow-xs">
                  السعر: 20 ريال
                </span>
              </div>
              <p className="text-xs text-slate-300">كود متغير فوري بقيمة 20 ريال للتفعيل المباشر عبر واتساب الإدارة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {!currentUser ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800">يرجى تسجيل الدخول أولاً</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  لتتمكن من إنشاء كود اشتراك مرتبط بحسابك وإرساله للإدارة عبر واتساب.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  if (onOpenAuth) onOpenAuth();
                }}
                className="bg-navy hover:bg-navy-dark text-white font-bold text-xs px-6 py-2.5 rounded-xl transition cursor-pointer shadow-sm"
              >
                تسجيل الدخول / إنشاء حساب
              </button>
            </div>
          ) : (
            <>
              {/* Note / Policy alert */}
              <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3 text-right">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs text-blue-950 space-y-1">
                  <p className="font-black">سياسة نشر الإعلانات للمستخدم المجاني:</p>
                  <p className="text-blue-800 leading-relaxed">
                    يحق للمستخدم المجاني نشر <strong>إعلان واحد فقط مجاناً</strong>. لنشر إعلان إضافي، يمكنك استخدام كود الاشتراك هذا بعد إرساله للإدارة عبر الواتساب لتفعيله، أو ترقية اشتراكك للاستمتاع بإعلانات غير محدودة.
                  </p>
                </div>
              </div>

              {/* Dynamic Code Display Box */}
              <div className="bg-gradient-to-b from-slate-50 to-slate-100/70 border-2 border-dashed border-gold/60 rounded-2xl p-5 text-center space-y-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  الكود المتغير المولد لطلبك:
                </div>
                
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-3xl font-black text-navy tracking-widest bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm select-all">
                    {isGenerating ? 'جاري التوليد...' : generatedCode}
                  </span>
                  
                  <button
                    onClick={handleCopyCode}
                    disabled={!generatedCode || isGenerating}
                    className="p-3 bg-white hover:bg-slate-50 text-navy border border-slate-200 rounded-xl transition cursor-pointer shadow-xs active:scale-95 shrink-0"
                    title="نسخ الكود"
                  >
                    {isCopied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                {isCopied && (
                  <p className="text-[11px] text-emerald-600 font-bold animate-pulse">
                    تم نسخ الكود بنجاح إلى الحافظة!
                  </p>
                )}
              </div>

              {/* Step By Step Instructions */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                  <HelpCircle className="w-4 h-4 text-gold-dark" />
                  <span>طريقة التفعيل والاستخدام (3 خطوات بسيطة):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-right">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs space-y-1">
                    <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center">1</span>
                    <p className="text-[11px] font-extrabold text-slate-800">إرسال لواتساب الإدارة</p>
                    <p className="text-[10px] text-slate-500 leading-tight">اضغط الزر الأخضر بالأسفل لإرسال الكود وبياناتك مباشرة للواتساب.</p>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs space-y-1">
                    <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center">2</span>
                    <p className="text-[11px] font-extrabold text-slate-800">تفعيل فوري من الإدارة</p>
                    <p className="text-[10px] text-slate-500 leading-tight">تقوم إدارة إستابلي بتأكيد وتفعيل الكود الخاص بك فور استلام الرسالة.</p>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs space-y-1">
                    <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center">3</span>
                    <p className="text-[11px] font-extrabold text-slate-800">وضع الكود عند النشر</p>
                    <p className="text-[10px] text-slate-500 leading-tight">انسخ الكود وضعه في حقل "كود الاشتراك" بنافذة نشر الإعلان لتنزيله فوراً.</p>
                  </div>
                </div>
              </div>

              {/* Primary Action Button: Send to WhatsApp */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleOpenWhatsapp}
                  disabled={!whatsappUrl || isGenerating}
                  className="w-full bg-[#25D366] hover:bg-[#1ebc59] text-white font-extrabold py-3.5 px-4 rounded-2xl transition cursor-pointer shadow-md flex items-center justify-center gap-2.5 text-sm"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>إرسال طلب الكود إلى واتساب الإدارة</span>
                  <ExternalLink className="w-4 h-4 opacity-75" />
                </button>

                {hasSentToWhatsapp && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs text-center font-bold">
                    ✓ تم فتح واتساب الإدارة. بعد تأكيد الإدارة، استخدم الكود أعلاه مباشرة في نافذة نشر الإعلان!
                  </div>
                )}
              </div>

              {/* Bottom Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleGenerateNewCode}
                  disabled={isGenerating}
                  className="text-xs font-bold text-slate-600 hover:text-navy py-2 px-3 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  توليد كود آخر جديد
                </button>

                <div className="flex-1"></div>

                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-5 rounded-xl transition cursor-pointer"
                >
                  تم / إغلاق
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
