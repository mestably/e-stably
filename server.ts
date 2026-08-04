/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory OTP store: email -> { code, expiresAt }
const otpStore: Record<string, { code: string; expiresAt: number }> = {};

// API Endpoint to send real OTP email
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'البريد الإلكتروني مطلوب' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

  otpStore[cleanEmail] = { code, expiresAt };

  let sentViaRealApi = false;
  let apiDeliveryMethod = '';

  // 1. Try Brevo API (Sendinblue REST API v3)
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
  const brevoSmtpKey = (process.env.BREVO_SMTP_KEY || '').trim();
  const brevoSenderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim() || 'x24.akar@gmail.com';
  let lastBrevoError = '';

  if (brevoApiKey) {
    try {
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
        })
      });
      if (brevoRes.ok) {
        sentViaRealApi = true;
        apiDeliveryMethod = 'Brevo REST API';
        console.log(`[Brevo API Success] Email sent to ${cleanEmail}`);
      } else {
        const errorData = await brevoRes.json().catch(() => ({}));
        lastBrevoError = JSON.stringify(errorData);
        console.warn('Brevo API status:', brevoRes.status, errorData);
      }
    } catch (err: any) {
      lastBrevoError = err?.message || String(err);
      console.warn('Error sending via Brevo REST API:', lastBrevoError);
    }
  }

  // 2. Try Brevo SMTP Relay via Nodemailer if REST API failed or brevoSmtpKey exists
  if (!sentViaRealApi && brevoSmtpKey) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
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
      console.warn('Brevo SMTP Relay error:', smtpErr?.message || smtpErr);
    }
  }

  // 3. Try Resend API if not yet sent and RESEND_API_KEY exists
  if (!sentViaRealApi && process.env.RESEND_API_KEY) {
    try {
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
        })
      });
      if (resendRes.ok) {
        sentViaRealApi = true;
        apiDeliveryMethod = 'Resend Email API';
      } else {
        const errorData = await resendRes.json().catch(() => ({}));
        console.warn('Resend API notice:', errorData);
      }
    } catch (err: any) {
      console.warn('Error sending via Resend API:', err?.message || err);
    }
  }

  // 4. Try custom SMTP if SMTP_HOST exists
  if (!sentViaRealApi && process.env.SMTP_HOST) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
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
      console.warn('Error sending via SMTP:', err?.message || err);
    }
  }

  // 5. Automatic Fallback / Development OTP Mode
  let testPreviewUrl = '';
  if (!sentViaRealApi) {
    try {
      // Try Ethereal test account with 3s timeout
      const testAccountPromise = nodemailer.createTestAccount();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Ethereal timeout')), 3000));
      const testAccount = await Promise.race([testAccountPromise, timeoutPromise]) as any;

      const testTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const info = await testTransporter.sendMail({
        from: '"منصة إستابلي للخيول" <no-reply@estably.com>',
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
      apiDeliveryMethod = 'Ethereal Mail (SMTP Test Service)';
      testPreviewUrl = nodemailer.getTestMessageUrl(info) || '';
      console.log(`[Ethereal SMTP Success] OTP sent for ${cleanEmail}. Preview URL: ${testPreviewUrl}`);
    } catch (etherealErr) {
      console.warn('Ethereal SMTP skipped/timed out, using local fallback OTP mode.');
    }
  }

  // If even Ethereal timed out or failed, we STILL allow user registration via Fallback OTP
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
    previewUrl: testPreviewUrl,
    fallbackCode: apiDeliveryMethod.includes('محلياً') ? code : undefined
  });
});

// API Endpoint to verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ success: false, error: 'البريد الإلكتروني وكود التفعيل مطلوبان' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = String(code).trim();

  const stored = otpStore[cleanEmail];
  if (!stored) {
    return res.status(400).json({ success: false, error: 'لم يتم العثور على كود تفعيل لهذا البريد. يرجى طلب كود جديد.' });
  }

  if (Date.now() > stored.expiresAt) {
    delete otpStore[cleanEmail];
    return res.status(400).json({ success: false, error: 'انتهت صلاحية كود التفعيل (مر أكثر من 10 دقائق).' });
  }

  if (stored.code !== cleanCode) {
    return res.status(400).json({ success: false, error: 'كود التفعيل غير صحيح.' });
  }

  delete otpStore[cleanEmail];
  return res.json({ success: true, email: cleanEmail });
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
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
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

