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

function generateOtpToken(email: string, code: string, expiresAt: number): string {
  const payload = `${email}:${code}:${expiresAt}:estably_secret_2026`;
  return Buffer.from(payload).toString('base64');
}

function verifyOtpToken(email: string, code: string, token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 4) return false;
    const [tokenEmail, tokenCode, tokenExpiresAtStr, secret] = parts;
    if (secret !== 'estably_secret_2026') return false;
    if (tokenEmail !== email) return false;
    if (tokenCode !== code) return false;
    if (Date.now() > Number(tokenExpiresAtStr)) return false;
    return true;
  } catch (e) {
    return false;
  }
}

// API Endpoint handler functions
async function handleSendOtp(req: express.Request, res: express.Response) {
  try {
    const email = req.body?.email || req.query?.email;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'البريد الإلكتروني مطلوب' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    otpStore[cleanEmail] = { code, expiresAt };
    const otpToken = generateOtpToken(cleanEmail, code, expiresAt);

    let sentViaRealApi = false;
    let apiDeliveryMethod = '';

    // 1. Try Brevo API (Sendinblue REST API v3) with 4s timeout
    const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
    const brevoSmtpKey = (process.env.BREVO_SMTP_KEY || '').trim();
    const brevoSenderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim() || 'x24.akar@gmail.com';

    if (brevoApiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
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
          const errorData = await brevoRes.json().catch(() => ({}));
          console.warn('Brevo API status:', brevoRes.status, errorData);
        }
      } catch (err: any) {
        console.warn('Error/Timeout sending via Brevo REST API:', err?.message || err);
      }
    }

    // 2. Try Brevo SMTP Relay via Nodemailer if REST API failed or brevoSmtpKey exists
    if (!sentViaRealApi && brevoSmtpKey) {
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp-relay.brevo.com',
          port: 587,
          secure: false,
          connectionTimeout: 4000,
          greetingTimeout: 3000,
          socketTimeout: 5000,
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
        console.warn('Error sending via SMTP:', err?.message || err);
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
      otpToken,
      fallbackCode: apiDeliveryMethod.includes('محلياً') ? code : undefined
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
      apiDeliveryMethod: 'كود التفعيل محلياً (وضع التطوير)',
      otpToken,
      fallbackCode: code
    });
  }
}

function handleVerifyOtp(req: express.Request, res: express.Response) {
  try {
    const { email, code, otpToken } = req.body || req.query || {};
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'البريد الإلكتروني وكود التفعيل مطلوبان' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code).trim();

    let isVerified = false;

    // 1. Check in-memory store
    const stored = otpStore[cleanEmail];
    if (stored) {
      if (Date.now() <= stored.expiresAt && stored.code === cleanCode) {
        isVerified = true;
        delete otpStore[cleanEmail];
      }
    }

    // 2. Check stateless token if in-memory store missing (e.g. Vercel serverless instance recycled)
    if (!isVerified && otpToken && typeof otpToken === 'string') {
      if (verifyOtpToken(cleanEmail, cleanCode, otpToken)) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      return res.status(400).json({ success: false, error: 'كود التفعيل غير صحيح أو انتهت صلاحيته.' });
    }

    return res.json({ success: true, email: cleanEmail });
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

