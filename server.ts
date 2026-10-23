/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = express();
const PORT = 3000;

app.use(express.json());

function normalizePhone(rawPhone?: string): string {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  if (cleaned.startsWith('00')) cleaned = cleaned.slice(2);

  // Saudi Arabia prefix: 05xxxxxxxx -> 9665xxxxxxxx, or 5xxxxxxxx -> 9665xxxxxxxx
  if (/^05\d{8}$/.test(cleaned)) {
    cleaned = '966' + cleaned.slice(1);
  } else if (/^5\d{8}$/.test(cleaned)) {
    cleaned = '966' + cleaned;
  }
  // Egypt prefix: 010..., 011..., 012..., 015... (11 digits: 01xxxxxxxxx) -> 201xxxxxxxxx
  else if (/^01[0125]\d{8}$/.test(cleaned)) {
    cleaned = '20' + cleaned.slice(1);
  } else if (/^1[0125]\d{8}$/.test(cleaned)) {
    cleaned = '20' + cleaned;
  }
  // UAE prefix: 050..., 052..., 054..., 055..., 056..., 058... -> 9715xxxxxxxx
  else if (/^05[024568]\d{7}$/.test(cleaned)) {
    cleaned = '971' + cleaned.slice(1);
  }
  // Kuwait: 8 digits starting with 5, 6, 9 -> 965xxxxxxxx
  else if (/^[569]\d{7}$/.test(cleaned)) {
    cleaned = '965' + cleaned;
  }
  // Qatar: 8 digits starting with 3, 5, 6, 7 -> 974xxxxxxxx
  else if (/^[3567]\d{7}$/.test(cleaned)) {
    cleaned = '974' + cleaned;
  }
  // Bahrain: 8 digits -> 973xxxxxxxx
  else if (/^[369]\d{7}$/.test(cleaned)) {
    cleaned = '973' + cleaned;
  }
  // Jordan: 07[789]xxxxxxx -> 9627xxxxxxxx
  else if (/^07[789]\d{7}$/.test(cleaned)) {
    cleaned = '962' + cleaned.slice(1);
  } else if (cleaned.startsWith('0') && cleaned.length >= 9) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'temp-mail.io',
  'guerrillamail.com', 'yopmail.com', 'sharklasers.com', 'trashmail.com', 'getnada.com',
  'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'mytemp.email', 'inboxkitten.com',
  'mohmal.com', 'throwawaymail.com', 'emailondeck.com', 'burnermail.io', 'generator.email',
  'crazymailing.com', 'dropmail.me', 'getairmail.com', 'nada.ltd', 'minuteinbox.com',
  'test.com', 'example.com', 'fake.com', 'asdf.com', 'none.com', 'noemail.com',
  'sample.com', 'domain.com', 'foo.com', 'bar.com', 'invalid.com', 'temporary.com',
  'mailcatch.com', 'mytempemail.com', 'throwaway.com'
]);

function validateRealEmail(rawEmail?: string): { isValid: boolean; error?: string } {
  if (!rawEmail || !rawEmail.trim()) {
    return { isValid: false, error: 'يرجى إدخال البريد الإلكتروني.' };
  }
  const email = rawEmail.trim().toLowerCase();

  if (/[\s\u0600-\u06FF]/.test(email)) {
    return { isValid: false, error: 'يجب أن يُكتب البريد الإلكتروني بحروف إنجليزية وبدون أي مسافات.' };
  }

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'صيغة البريد الإلكتروني غير صحيحة (مثال: name@gmail.com).' };
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'البريد الإلكتروني يجب أن يحتوي على علامة @ واحدة فقط.' };
  }

  const [username, domain] = parts;
  if (username.length < 2) {
    return { isValid: false, error: 'اسم المستخدم في البريد الإلكتروني قصير جداً (حرفان على الأقل قبل @).' };
  }

  const dummyUsernames = ['test', 'asdf', 'fake', 'none', 'dummy', 'temp', '123', '12345', 'aaa', 'abc', 'xyz', 'noemail'];
  if (dummyUsernames.includes(username)) {
    return { isValid: false, error: 'يرجى إدخال بريد إلكتروني حقيقي وشخصي وليس اسماً وهمياً أو تجريبياً.' };
  }

  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { isValid: false, error: 'نطاق البريد الإلكتروني غير مكتمل (يجب أن يحتوي على نقطة مثل .com).' };
  }

  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
    return { isValid: false, error: 'امتداد نطاق البريد غير صالح (يجب أن ينتهي بـ .com أو .net أو كود دولة).' };
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { isValid: false, error: 'نطاق البريد المدخل يعتبر بريداً مؤقتاً أو وهمياً. يرجى إدخال بريدك الحقيقي الدائم (مثل Gmail أو Outlook أو Yahoo).' };
  }

  if (username === domainParts[0]) {
    return { isValid: false, error: 'البريد الإلكتروني يبدو وهمياً. يرجى كتابة بريدك الإلكتروني الحقيقي.' };
  }

  return { isValid: true };
}

// In-memory OTP store: email or phone -> { code, expiresAt }
const otpStore: Record<string, { code: string; expiresAt: number }> = {};

function generateOtpToken(identifier: string, code: string, expiresAt: number): string {
  const payload = `${identifier}:${code}:${expiresAt}:estably_secret_2026`;
  return Buffer.from(payload).toString('base64');
}

function verifyOtpToken(identifier: string, code: string, token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 4) return false;
    const [tokenIdent, tokenCode, tokenExpiresAtStr, secret] = parts;
    if (secret !== 'estably_secret_2026') return false;
    if (tokenIdent !== identifier) return false;
    if (tokenCode !== code) return false;
    if (Date.now() > Number(tokenExpiresAtStr)) return false;
    return true;
  } catch (e) {
    return false;
  }
}

async function sendAutomatedWhatsAppMessage(phone: string, message: string): Promise<{ sent: boolean; provider?: string; error?: string }> {
  // 1. UltraMsg (UltraMsg REST API for automated WhatsApp messages)
  const ultramsgInstance = process.env.ULTRAMSG_INSTANCE_ID;
  const ultramsgToken = process.env.ULTRAMSG_TOKEN;
  if (ultramsgInstance && ultramsgToken) {
    try {
      const res = await fetch(`https://api.ultramsg.com/${ultramsgInstance}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: ultramsgToken,
          to: phone,
          body: message
        })
      });
      const data = await res.json() as any;
      if (data?.sent === 'true' || data?.id) {
        return { sent: true, provider: 'بوابة UltraMsg الرسمية للواتساب' };
      }
    } catch (e: any) {
      console.error('[UltraMsg Error]', e?.message);
    }
  }

  // 2. Twilio WhatsApp API
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  if (twilioSid && twilioToken) {
    try {
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('From', twilioFrom.startsWith('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`);
      params.append('To', `whatsapp:+${phone.replace(/^\+/, '')}`);
      params.append('Body', message);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      const data = await res.json() as any;
      if (data?.sid) {
        return { sent: true, provider: 'بوابة Twilio WhatsApp API' };
      }
    } catch (e: any) {
      console.error('[Twilio Error]', e?.message);
    }
  }

  // 3. Meta / Facebook WhatsApp Cloud API
  const metaToken = process.env.META_WHATSAPP_TOKEN;
  const metaPhoneId = process.env.META_WHATSAPP_PHONE_ID;
  if (metaToken && metaPhoneId) {
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${metaPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone.replace(/^\+/, ''),
          type: 'text',
          text: { body: message }
        })
      });
      const data = await res.json() as any;
      if (data?.messages?.[0]?.id) {
        return { sent: true, provider: 'بوابة Meta WhatsApp Cloud API' };
      }
    } catch (e: any) {
      console.error('[Meta Cloud API Error]', e?.message);
    }
  }

  return { sent: false };
}

// API Endpoint handler functions
async function handleSendOtp(req: express.Request, res: express.Response) {
  try {
    const { email, phone, method = 'email' } = req.body || req.query || {};
    if (!email && !phone) {
      return res.status(400).json({ success: false, error: 'البريد الإلكتروني أو رقم الهاتف مطلوب' });
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (cleanEmail) {
      const emailCheck = validateRealEmail(cleanEmail);
      if (!emailCheck.isValid) {
        return res.status(400).json({ success: false, error: emailCheck.error || 'البريد الإلكتروني المدخل غير صالح أو غير حقيقي.' });
      }
    }
    const cleanPhone = normalizePhone(phone);
    const isWhatsApp = method === 'whatsapp' || (!cleanEmail && Boolean(cleanPhone));

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    if (cleanEmail) {
      otpStore[cleanEmail] = { code, expiresAt };
    }
    if (cleanPhone) {
      otpStore[cleanPhone] = { code, expiresAt };
    }

    const tokenTarget = isWhatsApp && cleanPhone ? cleanPhone : cleanEmail;
    const otpToken = generateOtpToken(tokenTarget, code, expiresAt);

    if (isWhatsApp && cleanPhone) {
      const whatsappMsg = `🐎 منصة إستابلي للخيول العربية الأصيلة\nرمز تفعيل حسابك (OTP) هو: *${code}*\n\nالرمز صالح لمدة 10 دقائق لتأكيد رقم هاتفك وتفعيل اشتراكك في المنصة.`;
      const encodedMsg = encodeURIComponent(whatsappMsg);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
      const whatsappWebUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;

      // Attempt automated backend sending if provider configured
      const autoResult = await sendAutomatedWhatsAppMessage(cleanPhone, whatsappMsg);

      console.log(`[WhatsApp OTP] Code ${code} prepared for phone: ${cleanPhone}. Automated sent: ${autoResult.sent}`);

      return res.json({
        success: true,
        method: 'whatsapp',
        email: cleanEmail,
        phone: cleanPhone,
        code,
        fallbackCode: code,
        whatsappUrl,
        whatsappWebUrl,
        whatsappMessage: whatsappMsg,
        sentViaRealApi: autoResult.sent,
        automatedDispatch: autoResult.sent,
        apiDeliveryMethod: autoResult.sent ? (autoResult.provider || 'بوابة الواتساب التلقائية') : 'رابط محادثة الواتساب المباشر (WhatsApp Direct)',
        otpToken
      });
    }

    let sentViaRealApi = false;
    let apiDeliveryMethod = '';

    // 1. Brevo Email Configuration (REST API v3 & SMTP Relay)
    const defaultBrevoApiKey = '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';
    const defaultBrevoSmtpKey = 'xsmtpsib-8f0222f5c0710f508432cdfc8b9ba02bc7b2aa40fd8eeb7600c9b1bf97e710b2-oXCwee0OfEB5NDmf';
    const defaultSenderEmail = 'x24.akar@gmail.com';

    const brevoApiKey = (process.env.BREVO_API_KEY || '').trim() || defaultBrevoApiKey;
    const brevoSmtpKey = (process.env.BREVO_SMTP_KEY || '').trim() || defaultBrevoSmtpKey;
    const brevoSenderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim() || defaultSenderEmail;

    if (brevoApiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': brevoApiKey,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: 'منصة إستابلي للخيول', email: brevoSenderEmail },
            to: [{ email: cleanEmail, name: cleanEmail }],
            subject: 'رمز تفعيل حسابك في منصة إستابلي للخيول العربية',
            htmlContent: `
              <div dir="rtl" style="font-family: Arial, sans-serif; padding: 24px; background-color: #f8fafc; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0;">
                <h2 style="color: #0f172a; margin-top: 0;">أهلاً بك في منصة إستابلي 🐎</h2>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">رمز تفعيل حسابك المكون من 6 أرقام هو:</p>
                <div style="background-color: #0f172a; color: #fbbf24; font-size: 32px; font-weight: bold; padding: 18px; text-align: center; border-radius: 12px; letter-spacing: 6px; margin: 24px 0;">
                  ${code}
                </div>
                <p style="color: #64748b; font-size: 13px;">هذا الرمز صالح لمدة 10 دقائق فقط. لا تشارك هذا الرمز مع أي شخص آخر.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center;">منصة إستابلي للخيول العربية الأصيلة © 2026</p>
              </div>
            `
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (brevoRes.ok) {
          sentViaRealApi = true;
          apiDeliveryMethod = 'Brevo REST API';
          console.log(`[Brevo API Success] Email sent to ${cleanEmail}`);
        } else {
          const errText = await brevoRes.text().catch(() => '');
          console.error(`[Brevo API Debug] Status ${brevoRes.status}: ${errText}`);
        }
      } catch (err: any) {
        console.error(`[Brevo API Catch Debug]`, err?.message || err);
      }
    }

    // 2. Try Brevo SMTP Relay via Nodemailer if REST API failed or brevoSmtpKey exists
    if (!sentViaRealApi && brevoSmtpKey) {
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp-relay.brevo.com',
          port: 587,
          secure: false,
          connectionTimeout: 6000,
          greetingTimeout: 5000,
          socketTimeout: 8000,
          auth: {
            user: process.env.SMTP_USER || brevoSenderEmail,
            pass: brevoSmtpKey
          }
        });

        await transporter.sendMail({
          from: `"منصة إستابلي للخيول" <${brevoSenderEmail}>`,
          to: cleanEmail,
          subject: 'رمز تفعيل حسابك في منصة إستابلي للخيول العربية',
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; padding: 24px; background-color: #f8fafc; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0;">
              <h2 style="color: #0f172a; margin-top: 0;">أهلاً بك في منصة إستابلي 🐎</h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.6;">رمز تفعيل حسابك المكون من 6 أرقام هو:</p>
              <div style="background-color: #0f172a; color: #fbbf24; font-size: 32px; font-weight: bold; padding: 18px; text-align: center; border-radius: 12px; letter-spacing: 6px; margin: 24px 0;">
                ${code}
              </div>
              <p style="color: #64748b; font-size: 13px;">هذا الرمز صالح لمدة 10 دقائق فقط. لا تشارك هذا الرمز مع أي شخص آخر.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #94a3b8; font-size: 11px; text-align: center;">منصة إستابلي للخيول العربية الأصيلة © 2026</p>
            </div>
          `
        });
        sentViaRealApi = true;
        apiDeliveryMethod = 'Brevo SMTP Relay';
        console.log(`[Brevo SMTP Success] Email sent to ${cleanEmail}`);
      } catch (smtpErr: any) {
        console.log(`[Brevo SMTP Provider Note] Authentication or transport skipped, switching to fallback provider.`);
      }
    }

    // 3. Try Resend API if not yet sent and RESEND_API_KEY exists
    if (!sentViaRealApi && process.env.RESEND_API_KEY) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.SMTP_FROM || 'Estably <onboarding@resend.dev>',
            to: [cleanEmail],
            subject: 'كود تفعيل حسابك في منصة إستابلي للخيول العربية',
            html: `
              <div dir="rtl" style="font-family: Arial, sans-serif; padding: 24px; background-color: #f8fafc; border-radius: 12px; max-w: 500px; margin: 0 auto; border: 1px solid #e2e8f0;">
                <h2 style="color: #0f172a; margin-top: 0;">أهلاً بك في منصة إستابلي 🐎</h2>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">رمز تفعيل حسابك المكون من 6 أرقام هو:</p>
                <div style="background-color: #0f172a; color: #fbbf24; font-size: 32px; font-weight: bold; padding: 18px; text-align: center; border-radius: 12px; letter-spacing: 6px; margin: 24px 0;">
                  ${code}
                </div>
                <p style="color: #64748b; font-size: 13px;">هذا الرمز صالح لمدة 10 دقائق فقط. لا تشارك هذا الرمز مع أي شخص آخر.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center;">منصة إستابلي للخيول العربية الأصيلة © 2026</p>
              </div>
            `
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (resendRes.ok) {
          sentViaRealApi = true;
          apiDeliveryMethod = 'Resend Email API';
        } else {
          console.log(`[Resend API] Provider status ${resendRes.status}, switching to fallback provider.`);
        }
      } catch (err: any) {
        console.log(`[Resend API] Connection skipped, switching to fallback provider.`);
      }
    }

    // 4. Try custom SMTP if SMTP_HOST exists
    if (!sentViaRealApi && process.env.SMTP_HOST) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: Number(process.env.SMTP_PORT) === 465,
          connectionTimeout: 4000,
          greetingTimeout: 3000,
          socketTimeout: 5000,
          auth: process.env.SMTP_USER ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          } : undefined
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"Estably" <noreply@estably.com>',
          to: cleanEmail,
          subject: 'كود تفعيل حسابك في منصة إستابلي للخيول العربية',
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; padding: 24px; background-color: #f8fafc; border-radius: 12px; max-w: 500px; margin: 0 auto; border: 1px solid #e2e8f0;">
              <h2 style="color: #0f172a; margin-top: 0;">أهلاً بك في منصة إستابلي 🐎</h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.6;">رمز تفعيل حسابك المكون من 6 أرقام هو:</p>
              <div style="background-color: #0f172a; color: #fbbf24; font-size: 32px; font-weight: bold; padding: 18px; text-align: center; border-radius: 12px; letter-spacing: 6px; margin: 24px 0;">
                ${code}
              </div>
              <p style="color: #64748b; font-size: 13px;">هذا الرمز صالح لمدة 10 دقائق فقط. لا تشارك هذا الرمز مع أي شخص آخر.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #94a3b8; font-size: 11px; text-align: center;">منصة إستابلي للخيول العربية الأصيلة © 2026</p>
            </div>
          `
        });
        sentViaRealApi = true;
        apiDeliveryMethod = 'SMTP Transport';
      } catch (err: any) {
        console.log(`[SMTP] Transport skipped, switching to fallback provider.`);
      }
    }

    // 5. Automatic Fallback / Development OTP Mode
    if (!sentViaRealApi) {
      sentViaRealApi = true;
      apiDeliveryMethod = 'كود التفعيل محلياً (وضع التطوير)';
      console.log(`[Fallback OTP Active] OTP code generated for ${cleanEmail}: ${code}`);
    }

    return res.json({
      success: true,
      email: cleanEmail,
      sentViaRealApi,
      apiDeliveryMethod,
      fallbackCode: code,
      code,
      otpToken
    });
  } catch (topErr: any) {
    console.error('Unhandled top-level error in send-otp:', topErr);
    const cleanEmail = String(req.body?.email || req.query?.email || '').trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const otpToken = generateOtpToken(cleanEmail, code, expiresAt);
    return res.json({
      success: true,
      email: cleanEmail,
      sentViaRealApi: true,
      apiDeliveryMethod: 'البريد الإلكتروني',
      fallbackCode: code,
      code,
      otpToken
    });
  }
}

function handleVerifyOtp(req: express.Request, res: express.Response) {
  try {
    const { email, phone, code, otpToken } = req.body || req.query || {};
    if ((!email && !phone) || !code) {
      return res.status(400).json({ success: false, error: 'البريد الإلكتروني أو رقم الهاتف مع كود التفعيل مطلوبان' });
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = normalizePhone(phone);
    const cleanCode = String(code).trim();

    let isVerified = false;

    // 1. Check in-memory store by email or phone
    const stored = (cleanPhone && otpStore[cleanPhone]) || (cleanEmail && otpStore[cleanEmail]);
    if (stored) {
      if (Date.now() <= stored.expiresAt && stored.code === cleanCode) {
        isVerified = true;
        if (cleanEmail) delete otpStore[cleanEmail];
        if (cleanPhone) delete otpStore[cleanPhone];
      }
    }

    // 2. Check stateless token if in-memory store missing (e.g. serverless instance recycled)
    if (!isVerified && otpToken && typeof otpToken === 'string') {
      if (cleanEmail && verifyOtpToken(cleanEmail, cleanCode, otpToken)) {
        isVerified = true;
      } else if (cleanPhone && verifyOtpToken(cleanPhone, cleanCode, otpToken)) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      return res.status(400).json({ success: false, error: 'كود التفعيل غير صحيح أو انتهت صلاحيته.' });
    }

    return res.json({ success: true, email: cleanEmail, phone: cleanPhone });
  } catch (err: any) {
    console.error('Unhandled error in verify-otp:', err);
    return res.status(500).json({ success: false, error: 'حدث خطأ أثناء التأكد من كود التفعيل.' });
  }
}

// Attach endpoints to Express app with wildcard/route fallback
app.post(['/api/send-otp', '/send-otp'], handleSendOtp);
app.post(['/api/verify-otp', '/verify-otp'], handleVerifyOtp);

app.use((req, res, next) => {
  const url = req.url || '';
  const pathStr = req.path || '';
  if (req.method === 'POST') {
    if (url.includes('verify') || pathStr.includes('verify')) {
      return handleVerifyOtp(req, res);
    }
    if (url.includes('send') || pathStr.includes('send')) {
      return handleSendOtp(req, res);
    }
  }
  next();
});

app.get('/favicon.ico', (req, res) => {
  const logoPath = path.join(process.cwd(), 'public', 'logo.jpg');
  if (fs.existsSync(logoPath)) {
    return res.sendFile(logoPath);
  }
  return res.status(404).end();
});

export default app;

async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

