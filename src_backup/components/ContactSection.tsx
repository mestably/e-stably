/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Mail, Phone, ExternalLink, Calendar, HelpCircle, Check, MessageSquare } from 'lucide-react';
import { useState, FormEvent } from 'react';

export default function ContactSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSuccess('تم إرسال رسالتك بنجاح! فريق ملتقى الخيول العربية سيتواصل معك قريباً.');
    setName('');
    setEmail('');
    setMessage('');
    setTimeout(() => setSuccess(''), 4000);
  };

  return (
    <div className="space-y-6">
      
      {/* Visual Header */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-start gap-4">
        <div className="p-3 bg-blue-50 text-navy rounded-xl shrink-0">
          <MessageSquare className="w-6 h-6 text-navy" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-navy leading-tight">تواصل معنا</h2>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            نسعد دائماً بخدمتكم والرد على كافة استفساراتكم المتعلقة بالمرابط والخيول والإيواء والنقل.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Contact Info Panel */}
        <div className="space-y-6">
          
          <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4 shadow-xs">
            <h3 className="font-bold text-navy text-sm border-b border-slate-50 pb-2">بيانات الاتصال الرسمية</h3>
            
            {/* Email */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-navy shrink-0">
                <Mail className="w-4 h-4 text-navy" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">بريد الموقع الرسمي</span>
                <a href="mailto:info@m-estably.com" className="text-xs font-bold text-slate-700 hover:text-gold transition">
                  info@m-estably.com
                </a>
              </div>
            </div>

            {/* Phone numbers */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] text-slate-400 block">هاتف الإدارة والعلاقات المالية</span>
              
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-gold shrink-0">
                  <Phone className="w-4 h-4 text-gold" />
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-slate-400 block">رقم الاتصال المباشر 1</span>
                    <a href="tel:0559595055" className="text-xs font-bold text-slate-700 hover:text-navy transition font-mono">
                      0559595055
                    </a>
                  </div>
                  <a
                    href="https://wa.me/966559595055"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-green-500 hover:bg-green-600 text-white p-1.5 rounded-lg text-xs"
                    title="تواصل عبر الواتساب"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.528 1.977 14.053.953 11.428.951 5.992.951 1.566 5.323 1.563 10.753c-.002 1.708.452 3.377 1.313 4.843l-.974 3.556 3.649-.947z" />
                    </svg>
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-gold shrink-0">
                  <Phone className="w-4 h-4 text-gold" />
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-slate-400 block">رقم الاتصال المباشر 2</span>
                    <a href="tel:0555612055" className="text-xs font-bold text-slate-700 hover:text-navy transition font-mono">
                      0555612055
                    </a>
                  </div>
                  <a
                    href="https://wa.me/966555612055"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-green-500 hover:bg-green-600 text-white p-1.5 rounded-lg text-xs"
                    title="تواصل عبر الواتساب"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.528 1.977 14.053.953 11.428.951 5.992.951 1.566 5.323 1.563 10.753c-.002 1.708.452 3.377 1.313 4.843l-.974 3.556 3.649-.947z" />
                    </svg>
                  </a>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Messaging Box */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
          <h3 className="font-bold text-navy text-sm border-b border-slate-50 pb-2 mb-4">أرسل رسالة سريعة</h3>
          
          <form onSubmit={handleSendMessage} className="space-y-4">
            {success && (
              <div className="p-3 bg-green-50 border-r-4 border-green-500 text-green-700 text-xs rounded-l flex items-start gap-2 animate-bounce">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">الاسم الكريم</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسمك"
                required
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">البريد الإلكتروني للرد</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@yourmail.com"
                required
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy text-left"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">تفاصيل الرسالة أو الملاحظات</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب استفسارك هنا وسنقوم بالرد عليك في أسرع وقت..."
                required
                rows={3}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-navy hover:bg-navy-dark text-white font-bold py-2.5 rounded-xl cursor-pointer text-xs transition shadow"
            >
              إرسال الرسالة للإدارة
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
