import { createHash } from 'node:crypto';

function sendJSON(res, statusCode, payload) {
  res.status(statusCode).setHeader('content-type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(payload));
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = String(raw || req.socket?.remoteAddress || '').split(',')[0].trim();
  return first || 'unknown';
}

function maskIp(ip) {
  if (!ip || ip === 'unknown') return 'unknown';
  if (ip.includes(':')) {
    return ip.split(':').slice(0, 4).join(':') + ':****';
  }
  const parts = ip.split('.');
  if (parts.length !== 4) return 'unknown';
  return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
}

function hashIp(ip) {
  if (!ip || ip === 'unknown') return 'unknown';
  const salt = process.env.IP_HASH_SALT || process.env.SECRET_TOKEN || 'proyecto-negocios';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 24);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJSON(res, 405, { status: 'error', message: 'Método no permitido' });
    return;
  }

  const googleURL = process.env.GOOGLE_SCRIPT_URL;
  const token = process.env.SECRET_TOKEN;

  if (!googleURL || !token) {
    sendJSON(res, 500, { status: 'error', message: 'GOOGLE_SCRIPT_URL o SECRET_TOKEN no configurado' });
    return;
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    sendJSON(res, 400, { status: 'error', message: 'JSON inválido' });
    return;
  }

  const ip = getClientIp(req);
  const payload = {
    ...body,
    action: 'nuevaReserva',
    token,
    ipHash: hashIp(ip),
    ipMasked: maskIp(ip),
    ipSource: 'vercel',
  };

  try {
    const response = await fetch(googleURL, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({
      status: 'error',
      message: 'Respuesta inválida de Google Apps Script',
    }));

    sendJSON(res, response.ok ? 200 : response.status, data);
  } catch {
    sendJSON(res, 502, { status: 'error', message: 'No se pudo conectar con Google Apps Script' });
  }
}
