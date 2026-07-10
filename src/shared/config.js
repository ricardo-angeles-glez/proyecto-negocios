// ============================================
// CONFIG.JS - Configuración del proyecto
// ============================================
// Las variables con VITE_ o que vienen de
// Vercel Environment Variables son seguras
// para el frontend (son públicas de todas formas)
// ============================================

const config = {
    // ── Google Sheets API ─────────────────
    // Esta URL es semi-pública (está bien)
    // La protección real está en el Apps Script
    googleScriptURL: typeof __GOOGLE_SCRIPT_URL__ !== 'undefined'
        ? __GOOGLE_SCRIPT_URL__
        : window.ENV?.GOOGLE_SCRIPT_URL
        ?? 'PENDIENTE_CONFIGURAR',

    // ── Negocio ───────────────────────────
    whatsapp: window.ENV?.WHATSAPP
        ?? '1234567890',

    nombreNegocio: window.ENV?.NOMBRE_NEGOCIO
        ?? 'Tu Restaurante',

    // ── Seguridad ─────────────────────────
    // Token secreto que valida que las peticiones
    // vienen de TU sitio web (no de un bot)
    secretToken: window.ENV?.SECRET_TOKEN
        ?? 'mi-token-secreto-cambiar',

    // ── Rate Limiting ──────────────────────
    maxReservasPorDia: 3,     // Máx reservas por IP por día
    maxContactosPorDia: 2,    // Máx mensajes por IP por día

    // ── Configuración general ─────────────
    moneda: '$',
    zonaHoraria: 'America/Mexico_City',
    maxPersonasPorReserva: 20,
    diasAnticipacionMaxima: 30,
};

export default config;