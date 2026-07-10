const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function sendJSON(res, statusCode, payload) {
  res.status(statusCode).setHeader('content-type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(payload));
}

function escapeHTML(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildEmailHTML(reserva, negocio) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#2C1810">
      <h1 style="font-size:24px;margin:0 0 12px">Reserva confirmada</h1>
      <p style="font-size:15px;line-height:1.6">Hola ${escapeHTML(reserva.nombre)}, tu reserva en ${escapeHTML(negocio)} quedó registrada.</p>
      <div style="border:1px solid #E8D5B7;border-radius:12px;padding:18px;margin:20px 0;background:#FDF6EC">
        <p><strong>Código:</strong> ${escapeHTML(reserva.codigo)}</p>
        <p><strong>Fecha:</strong> ${escapeHTML(reserva.fecha)}</p>
        <p><strong>Hora:</strong> ${escapeHTML(reserva.hora)}</p>
        <p><strong>Personas:</strong> ${escapeHTML(reserva.personas)}</p>
        ${reserva.notas ? `<p><strong>Notas:</strong> ${escapeHTML(reserva.notas)}</p>` : ''}
      </div>
      <p style="font-size:14px;color:#8B7355">Si necesitas cambiar algo, responde este correo o contacta al negocio directamente.</p>
    </div>
  `;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJSON(res, 405, { success: false, message: 'Método no permitido' });
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    sendJSON(res, 200, { success: false, configured: false, message: 'RESEND_API_KEY no configurada' });
    return;
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    sendJSON(res, 400, { success: false, message: 'JSON inválido' });
    return;
  }
  const reserva = body.reserva || {};

  if (!reserva.email || !reserva.nombre || !reserva.fecha || !reserva.hora) {
    sendJSON(res, 400, { success: false, message: 'Faltan datos de la reserva' });
    return;
  }

  const negocio = process.env.NOMBRE_NEGOCIO || body.negocio || 'Tu negocio';
  const from = process.env.RESEND_FROM || `${negocio} <onboarding@resend.dev>`;

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [reserva.email],
      subject: `Reserva confirmada - ${negocio}`,
      html: buildEmailHTML(reserva, negocio),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    sendJSON(res, response.status, { success: false, configured: true, error: data });
    return;
  }

  sendJSON(res, 200, { success: true, configured: true, data });
}
