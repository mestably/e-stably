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
  } catch {
    return false;
  }
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

export default async function handler(req: IncomingMessage & { body?: any; query?: any }, res: ServerResponse) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);
    const { email, phone, code, otpToken } = { ...(req.query || {}), ...(body || {}) };
    if ((!email && !phone) || !code) {
      return sendJson(res, 400, { success: false, error: 'البريد الإلكتروني أو رقم الهاتف مع كود التفعيل مطلوبان' });
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = normalizePhone(phone);
    const cleanCode = String(code).trim();

    let isVerified = false;
    if (otpToken && typeof otpToken === 'string') {
      if (cleanEmail && verifyOtpToken(cleanEmail, cleanCode, otpToken)) {
        isVerified = true;
      } else if (cleanPhone && verifyOtpToken(cleanPhone, cleanCode, otpToken)) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      return sendJson(res, 400, { success: false, error: 'كود التفعيل غير صحيح أو انتهت صلاحيته.' });
    }

    return sendJson(res, 200, { success: true, email: cleanEmail, phone: cleanPhone });
  } catch (err: any) {
    return sendJson(res, 500, { success: false, error: `حدث خطأ أثناء التأكد من كود التفعيل: ${err?.message || ''}` });
  }
}
