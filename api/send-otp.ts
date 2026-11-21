import type { IncomingMessage, ServerResponse } from 'http';

function normalizePhone(rawPhone?: string): string {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  if (cleaned.startsWith('00')) cleaned = cleaned.slice(2);

  if (/^05\d{8}$/.test(cleaned)) {
    cleaned = '966' + cleaned.slice(1);
  } else if (/^5\d{8}$/.test(cleaned)) {
    cleaned = '966' + cleaned;
  } else if (/^01[0125]\d{8}$/.test(cleaned)) {
    cleaned = '20' + cleaned.slice(1);
  } else if (/^1[0125]\d{8}$/.test(cleaned)) {
    cleaned = '20' + cleaned;
  } else if (/^05[024568]\d{7}$/.test(cleaned)) {
    cleaned = '971' + cleaned.slice(1);
  } else if (/^[569]\d{7}$/.test(cleaned)) {
    cleaned = '965' + cleaned;
  } else if (/^[3567]\d{7}$/.test(cleaned)) {
    cleaned = '974' + cleaned;
  } else if (/^[369]\d{7}$/.test(cleaned)) {
    cleaned = '973' + cleaned;
  } else if (/^07[789]\d{7}$/.test(cleaned)) {
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
    return { isValid: false, error: 'نطاق البريد المدخل يعتبر بريداً مؤقتاً أو وهمياً. يرجى إدخال بريدك الحقيقي الدائم.' };
  }

  if (username === domainParts[0]) {
    return { isValid: false, error: 'البريد الإلكتروني يبدو وهمياً. يرجى كتابة بريدك الإلكتروني الحقيقي.' };
  }

  return { isValid: true };
}

function generateOtpToken(identifier: string, code: string, expiresAt: number): string {
  const payload = `${identifier}:${code}:${expiresAt}:estably_secret_2026`;
  return Buffer.from(payload).toString('base64');
}

async function readJsonBody(req: IncomingMessage & { body?: any }): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res: ServerResponse & { status?: (c: number) => any; json?: (d: any) => any }, statusCode: number, data: any) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

async function sendAutomatedWhatsAppMessage(phone: string, message: string): Promise<{ sent: boolean; provider?: string }> {
  const ultramsgInstance = process.env.ULTRAMSG_INSTANCE_ID;
  const ultramsgToken = process.env.ULTRAMSG_TOKEN;
  if (ultramsgInstance && ultramsgToken) {
    try {
      const res = await fetch(`https://api.ultramsg.com/${ultramsgInstance}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: ultramsgToken, to: phone, body: message })
      });
      const data = (await res.json()) as any;
      if (data?.sent === 'true' || data?.id) {
        return { sent: true, provider: 'بوابة UltraMsg الرسمية للواتساب' };
      }
    } catch {}
  }

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
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const data = (await res.json()) as any;
      if (data?.sid) return { sent: true, provider: 'بوابة Twilio WhatsApp API' };
    } catch {}
  }

  const metaToken = process.env.META_WHATSAPP_TOKEN;
  const metaPhoneId = process.env.META_WHATSAPP_PHONE_ID;
  if (metaToken && metaPhoneId) {
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${metaPhoneId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone.replace(/^\+/, ''),
          type: 'text',
          text: { body: message }
        })
      });
      const data = (await res.json()) as any;
      if (data?.messages?.[0]?.id) return { sent: true, provider: 'بوابة Meta WhatsApp Cloud API' };
    } catch {}
  }

  return { sent: false };
}

export default async function handler(req: IncomingMessage & { body?: any; query?: any }, res: ServerResponse) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);
    const { email, phone, method = 'email', type = 'activation' } = { ...(req.query || {}), ...(body || {}) };
    if (!email && !phone) {
      return sendJson(res, 400, { success: false, error: 'البريد الإلكتروني أو رقم الهاتف مطلوب' });
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (cleanEmail) {
      const emailCheck = validateRealEmail(cleanEmail);
      if (!emailCheck.isValid) {
        return sendJson(res, 400, { success: false, error: emailCheck.error || 'البريد الإلكتروني المدخل غير صالح.' });
      }
    }

    const cleanPhone = normalizePhone(phone);
    const isWhatsApp = method === 'whatsapp' || (!cleanEmail && Boolean(cleanPhone));
    const isReset = type === 'password_reset';
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const tokenTarget = isWhatsApp && cleanPhone ? cleanPhone : cleanEmail;
    const otpToken = generateOtpToken(tokenTarget, code, expiresAt);

    if (isWhatsApp && cleanPhone) {
      const whatsappMsg = isReset
        ? `🐎 منصة إستابلي للخيول العربية الأصيلة\nرمز استعادة كلمة المرور هو: *${code}*\n\nالرمز صالح لمدة 10 دقائق لتعيين كلمة مرور جديدة لحسابك.`
        : `🐎 منصة إستابلي للخيول العربية الأصيلة\nرمز تفعيل حسابك (OTP) هو: *${code}*\n\nالرمز صالح لمدة 10 دقائق لتأكيد رقم هاتفك وتفعيل اشتراكك في المنصة.`;
      const encodedMsg = encodeURIComponent(whatsappMsg);
      const autoResult = await sendAutomatedWhatsAppMessage(cleanPhone, whatsappMsg);

      return sendJson(res, 200, {
        success: true,
        method: 'whatsapp',
        type,
        email: cleanEmail,
        phone: cleanPhone,
        code,
        fallbackCode: code,
        whatsappUrl: `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`,
        whatsappWebUrl: `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`,
        whatsappMessage: whatsappMsg,
        sentViaRealApi: autoResult.sent,
        automatedDispatch: autoResult.sent,
        apiDeliveryMethod: autoResult.sent ? (autoResult.provider || 'بوابة الواتساب التلقائية') : 'رابط محادثة الواتساب المباشر (WhatsApp Direct)',
        otpToken
      });
    }

    let sentViaRealApi = false;
    let apiDeliveryMethod = '';
    const deliveryErrors: string[] = [];

    const emailSubject = isReset
      ? 'رمز استعادة كلمة المرور في منصة إستابلي للخيول العربية'
      : 'رمز تفعيل حسابك في منصة إستابلي للخيول العربية';

    const emailHtml = `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 24px; background-color: #f8fafc; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin-top: 0;">${isReset ? 'استعادة كلمة المرور 🔐' : 'أهلاً بك في منصة إستابلي 🐎'}</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          ${isReset ? 'تلقينا طلباً لاستعادة وتعيين كلمة المرور لحسابك. رمز التحقق هو:' : 'رمز تفعيل حسابك المكون من 6 أرقام هو:'}
        </p>
        <div style="background-color: #0f172a; color: #fbbf24; font-size: 32px; font-weight: bold; padding: 18px; text-align: center; border-radius: 12px; letter-spacing: 6px; margin: 24px 0;">
          ${code}
        </div>
        <p style="color: #64748b; font-size: 13px;">هذا الرمز صالح لمدة 10 دقائق فقط. إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">منصة إستابلي للخيول العربية الأصيلة © 2026</p>
      </div>
    `;

    const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
    const brevoSmtpKey = (process.env.BREVO_SMTP_KEY || '').trim();
    const brevoSenderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM || '').trim();

    if (brevoApiKey && brevoSenderEmail) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': brevoApiKey,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: 'منصة إستابلي للخيول', email: brevoSenderEmail },
            to: [{ email: cleanEmail, name: cleanEmail }],
            subject: emailSubject,
            htmlContent: emailHtml
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (brevoRes.ok) {
          sentViaRealApi = true;
          apiDeliveryMethod = 'Brevo REST API';
        } else {
          const errText = await brevoRes.text().catch(() => '');
          deliveryErrors.push(`Brevo API (${brevoRes.status}: ${errText.slice(0, 140)})`);
        }
      } catch (err: any) {
        deliveryErrors.push(`Brevo API (${err?.message || 'error'})`);
      }
    }

    if (!sentViaRealApi && brevoSmtpKey && (process.env.SMTP_USER || brevoSenderEmail)) {
      try {
        const nodemailerMod = await import('nodemailer');
        const nodemailer = nodemailerMod.default || nodemailerMod;
        const transporter = nodemailer.createTransport({
          host: 'smtp-relay.brevo.com',
          port: 587,
          secure: false,
          connectionTimeout: 6000,
          greetingTimeout: 5000,
          socketTimeout: 8000,
          auth: {
            user: (process.env.SMTP_USER || brevoSenderEmail).trim(),
            pass: brevoSmtpKey
          }
        });
        await transporter.sendMail({
          from: `"منصة إستابلي للخيول" <${brevoSenderEmail || process.env.SMTP_USER}>`,
          to: cleanEmail,
          subject: emailSubject,
          html: emailHtml
        });
        sentViaRealApi = true;
        apiDeliveryMethod = 'Brevo SMTP Relay';
      } catch (smtpErr: any) {
        deliveryErrors.push(`Brevo SMTP (${smtpErr?.message || 'error'})`);
      }
    }

    if (!sentViaRealApi && process.env.RESEND_API_KEY) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: (process.env.SMTP_FROM || process.env.RESEND_FROM || 'Estably <onboarding@resend.dev>').trim(),
            to: [cleanEmail],
            subject: emailSubject,
            html: emailHtml
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (resendRes.ok) {
          sentViaRealApi = true;
          apiDeliveryMethod = 'Resend Email API';
        } else {
          const errText = await resendRes.text().catch(() => '');
          deliveryErrors.push(`Resend API (${resendRes.status}: ${errText.slice(0, 140)})`);
        }
      } catch (err: any) {
        deliveryErrors.push(`Resend API (${err?.message || 'error'})`);
      }
    }

    if (!sentViaRealApi && process.env.SMTP_HOST) {
      try {
        const nodemailerMod = await import('nodemailer');
        const nodemailer = nodemailerMod.default || nodemailerMod;
        const port = Number(process.env.SMTP_PORT) || 587;
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST.trim(),
          port,
          secure: port === 465,
          connectionTimeout: 5000,
          greetingTimeout: 4000,
          socketTimeout: 6000,
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER.trim(), pass: (process.env.SMTP_PASS || '').trim() }
            : undefined
        });
        await transporter.sendMail({
          from: (process.env.SMTP_FROM || `"Estably" <${process.env.SMTP_USER || 'noreply@estably.com'}>`).trim(),
          to: cleanEmail,
          subject: emailSubject,
          html: emailHtml
        });
        sentViaRealApi = true;
        apiDeliveryMethod = 'SMTP Transport';
      } catch (err: any) {
        deliveryErrors.push(`SMTP (${err?.message || 'error'})`);
      }
    }

    if (!sentViaRealApi) {
      const hasAnyProvider = Boolean(
        (brevoApiKey && brevoSenderEmail) ||
        brevoSmtpKey ||
        process.env.RESEND_API_KEY ||
        process.env.SMTP_HOST
      );
      const errorMsg = hasAnyProvider
        ? `تعذر إرسال رسالة التفعيل إلى البريد الإلكتروني (${deliveryErrors.join(' / ')}). يرجى مراجعة صلاحية مفتاح الإرسال وبريد المرسل في إعدادات Vercel أو اختيار التفعيل عبر الواتساب.`
        : 'خدمة البريد غير مضبوطة على الاستضافة: يرجى إضافة BREVO_API_KEY و BREVO_SENDER_EMAIL في Vercel Environment Variables ثم عمل Redeploy.';

      return sendJson(res, 502, {
        success: false,
        email: cleanEmail,
        sentViaRealApi: false,
        error: errorMsg,
        details: deliveryErrors
      });
    }

    return sendJson(res, 200, {
      success: true,
      email: cleanEmail,
      sentViaRealApi: true,
      apiDeliveryMethod,
      otpToken
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      success: false,
      sentViaRealApi: false,
      error: `خطأ في خادم إرسال البريد: ${err?.message || 'Unexpected error'}`
    });
  }
}
