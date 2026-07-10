// ============================================
// UTILIDADES COMPARTIDAS
// ============================================

// ── Formateo de fechas ──────────────────────
export function formatearFecha(fecha, opciones = {}) {
    const defaults = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return new Date(fecha).toLocaleDateString('es-ES', { ...defaults, ...opciones });
}

export function formatearFechaCorta(fecha) {
    return new Date(fecha).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

export function formatearHora(hora) {
    const [h, m] = hora.split(':');
    const hNum = parseInt(h);
    const periodo = hNum >= 12 ? 'PM' : 'AM';
    const h12 = hNum > 12 ? hNum - 12 : hNum === 0 ? 12 : hNum;
    return `${h12}:${m} ${periodo}`;
}

// ── Generador de códigos ────────────────────
export function generarCodigo(prefijo = 'RES') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefijo}-${timestamp.slice(-4)}${random}`;
}

// ── WhatsApp ────────────────────────────────
export function abrirWhatsApp(numero, mensaje) {
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

export function crearMensajeReserva(reserva, nombreNegocio) {
    return `*RESERVA CONFIRMADA - ${nombreNegocio}*

Codigo: *${reserva.codigo}*
Nombre: ${reserva.nombre}
Telefono: ${reserva.telefono}
Fecha: ${formatearFecha(reserva.fecha)}
Hora: ${formatearHora(reserva.hora)}
Personas: ${reserva.personas}
${reserva.notas ? `Notas: ${reserva.notas}` : ''}

_Gracias por elegirnos. Te esperamos._`;
}

// ── Validaciones ─────────────────────────────
export function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validarTelefono(tel) {
    return /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(tel);
}

export function validarFormulario(campos) {
    const errores = {};
    campos.forEach(({ nombre, valor, tipo, requerido }) => {
        if (requerido && !valor?.trim()) {
            errores[nombre] = 'Este campo es obligatorio';
        } else if (tipo === 'email' && valor && !validarEmail(valor)) {
            errores[nombre] = 'Email no válido';
        } else if (tipo === 'tel' && valor && !validarTelefono(valor)) {
            errores[nombre] = 'Teléfono no válido';
        }
    });
    return errores;
}

// ── Notificaciones Toast ──────────────────────
export function mostrarToast(mensaje, tipo = 'info', duracion = 3000) {
    // Crear contenedor si no existe
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 8px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const colores = {
        success: { bg: '#6B8F71', icon: '' },
        error:   { bg: '#C1694F', icon: '' },
        info:    { bg: '#D4738C', icon: '' },
        warning: { bg: '#C99726', icon: '' }
    };

    const { bg, icon } = colores[tipo] || colores.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
        padding: 14px 24px;
        background: ${bg};
        color: white;
        border-radius: 50px;
        font-family: Inter, sans-serif;
        font-size: 0.9rem;
        font-weight: 600;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        animation: slideUp 0.3s ease;
        white-space: nowrap;
    `;
    toast.textContent = icon ? `${icon} ${mensaje}` : mensaje;

    // Agregar animación CSS
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideDown {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(20px); }
            }
        `;
        document.head.appendChild(style);
    }

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duracion);
}

// ── Loading Spinner ───────────────────────────
export function mostrarLoading(elemento, texto = 'Cargando...') {
    if (typeof elemento === 'string') {
        elemento = document.getElementById(elemento);
    }
    elemento.disabled = true;
    elemento.dataset.originalText = elemento.innerHTML;
    elemento.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 style="animation: spin 0.8s linear infinite;">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            ${texto}
        </span>
        <style>@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }</style>
    `;
}

export function ocultarLoading(elemento) {
    if (typeof elemento === 'string') {
        elemento = document.getElementById(elemento);
    }
    elemento.disabled = false;
    if (elemento.dataset.originalText) {
        elemento.innerHTML = elemento.dataset.originalText;
    }
}

// ── QR Code ──────────────────────────────────
export function generarQR(url, size = 200) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&color=6C63FF&bgcolor=FFFFFF`;
}

// ── Google Calendar ───────────────────────────
export function crearEnlaceCalendario(titulo, fecha, hora, descripcion, duracionHoras = 2) {
    const start = new Date(fecha);
    const [h, m] = hora.split(':');
    start.setHours(parseInt(h), parseInt(m), 0, 0);

    const end = new Date(start);
    end.setHours(end.getHours() + duracionHoras);

    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(descripcion)}`;
}

// ── LocalStorage helpers ──────────────────────
export const storage = {
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch { return defaultValue; }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch { return false; }
    },
    remove: (key) => localStorage.removeItem(key),
    clear: () => localStorage.clear()
};

// ── Debounce ──────────────────────────────────
export function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// ── Exportar a CSV ────────────────────────────
export function exportarCSV(datos, nombreArchivo = 'exportacion') {
    if (!datos.length) return;

    const headers = Object.keys(datos[0]);
    const csv = [
        headers.join(','),
        ...datos.map(row =>
            headers.map(h => {
                const val = row[h] ?? '';
                return typeof val === 'string' && val.includes(',')
                    ? `"${val}"` : val;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}
