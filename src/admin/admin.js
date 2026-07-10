import { db } from '../shared/database.js';

const adminState = {
    reservas: [],
    contactos: [],
    filtros: {
        estado: 'all',
        fecha: '',
        busqueda: ''
    }
};

document.addEventListener('DOMContentLoaded', () => {
    inicializarAdmin();
});

async function inicializarAdmin() {
    pintarFechaActual();
    initFiltros();
    await verificarConexion();
    await cargarDashboard();

    setInterval(cargarDashboard, 60000);
}

function pintarFechaActual() {
    const currentDate = document.getElementById('currentDate');
    if (!currentDate) return;

    currentDate.textContent = new Date().toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

async function verificarConexion() {
    const statusEl = document.getElementById('conexion-status');
    if (!statusEl) return;

    try {
        const online = await db.verificarConexion();
        if (!online) throw new Error('offline');

        statusEl.className = 'connection-pill is-online';
        statusEl.innerHTML = '<i class="ph ph-check-circle"></i> Google Sheets conectado';
    } catch {
        statusEl.className = 'connection-pill is-offline';
        statusEl.innerHTML = '<i class="ph ph-warning-circle"></i> Modo offline';
    }
}

async function cargarDashboard() {
    await Promise.all([
        cargarStats(),
        cargarReservas(),
        cargarContactos()
    ]);
}

async function cargarStats() {
    const stats = await db.obtenerStats();

    setText('stat-hoy', stats.reservasHoy || 0);
    setText('stat-total', stats.totalReservas || 0);
    setText('stat-personas', stats.personasHoy || 0);
    setText('stat-visitas', stats.totalVisitas || 0);

    const badge = document.getElementById('pendientes-badge');
    if (!badge) return;

    const pendientes = stats.pendientes || 0;
    badge.textContent = pendientes;
    badge.style.display = pendientes > 0 ? 'block' : 'none';
}

async function cargarReservas() {
    const container = document.getElementById('reservas-table-container');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">
            <i class="ph ph-circle-notch spin"></i>
            <p>Cargando reservas...</p>
        </div>
    `;

    const reservas = await db.obtenerReservas();
    adminState.reservas = Array.isArray(reservas) ? reservas : [];
    renderReservas();
}

async function cargarContactos() {
    const container = document.getElementById('contactos-table-container');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state compact">
            <i class="ph ph-circle-notch spin"></i>
            <p>Cargando contactos...</p>
        </div>
    `;

    const contactos = await db.obtenerContactos();
    adminState.contactos = Array.isArray(contactos) ? contactos : [];
    renderContactos();
}

function renderReservas() {
    const container = document.getElementById('reservas-table-container');
    const info = document.getElementById('tabla-info');
    if (!container) return;

    if (adminState.reservas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="ph ph-calendar-x"></i></div>
                <h3>No hay reservas todavía</h3>
                <p>Las reservas aparecerán aquí cuando los clientes las hagan.</p>
            </div>
        `;
        if (info) info.textContent = '0 reservas';
        return;
    }

    const filtradas = aplicarFiltros(adminState.reservas);
    if (info) info.textContent = `${filtradas.length} de ${adminState.reservas.length} reservas`;

    if (filtradas.length === 0) {
        container.innerHTML = `
            <div class="empty-state compact">
                <p>No se encontraron reservas con estos filtros.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Personas</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtradas.map(renderFilaReserva).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.querySelectorAll('[data-action="whatsapp"]').forEach((button) => {
        button.addEventListener('click', () => {
            contactarWhatsApp(button.dataset.telefono, button.dataset.nombre);
        });
    });

    container.querySelectorAll('[data-action="cancelar"]').forEach((button) => {
        button.addEventListener('click', async () => {
            await cancelarReserva(button.dataset.codigo);
        });
    });
}

function renderContactos() {
    const container = document.getElementById('contactos-table-container');
    const info = document.getElementById('contactos-info');
    if (!container) return;

    const contactos = adminState.contactos.slice(0, 8);
    if (info) info.textContent = `${adminState.contactos.length} contactos`;

    if (contactos.length === 0) {
        container.innerHTML = `
            <div class="empty-state compact">
                <div class="empty-icon"><i class="ph ph-envelope-simple"></i></div>
                <h3>No hay contactos todavía</h3>
                <p>Los mensajes del formulario aparecerán aquí.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="contact-list">
            ${contactos.map(renderContacto).join('')}
        </div>
    `;
}

function renderContacto(contacto) {
    const fecha = contacto.timestamp || contacto.createdAt || contacto.fecha || '';
    return `
        <article class="contact-item">
            <div class="contact-avatar"><i class="ph ph-user"></i></div>
            <div class="contact-body">
                <div class="contact-meta">
                    <strong>${escapeHTML(contacto.nombre || contacto.Nombre || '')}</strong>
                    <span>${formatDateTime(fecha)}</span>
                </div>
                <a href="mailto:${escapeAttribute(contacto.email || contacto.Email || '')}">
                    ${escapeHTML(contacto.email || contacto.Email || '')}
                </a>
                <p>${escapeHTML(contacto.mensaje || contacto.Mensaje || '')}</p>
            </div>
        </article>
    `;
}

function aplicarFiltros(reservas) {
    const busqueda = adminState.filtros.busqueda.trim().toLowerCase();

    return reservas.filter((reserva) => {
        const coincideBusqueda = !busqueda ||
            (reserva.nombre || '').toLowerCase().includes(busqueda) ||
            (reserva.codigo || '').toLowerCase().includes(busqueda) ||
            (reserva.telefono || '').toLowerCase().includes(busqueda);

        const coincideEstado = adminState.filtros.estado === 'all' ||
            reserva.estado === adminState.filtros.estado;

        const coincideFecha = !adminState.filtros.fecha ||
            reserva.fecha === adminState.filtros.fecha;

        return coincideBusqueda && coincideEstado && coincideFecha;
    });
}

function renderFilaReserva(reserva) {
    return `
        <tr>
            <td><code>${escapeHTML(reserva.codigo || 'N/A')}</code></td>
            <td>
                <div class="table-primary">${escapeHTML(reserva.nombre || '')}</div>
                <div class="table-secondary">${escapeHTML(reserva.telefono || '')}</div>
            </td>
            <td>${escapeHTML(reserva.fecha || '')}</td>
            <td>${escapeHTML(reserva.hora || '')}</td>
            <td class="td-center"><strong>${escapeHTML(String(reserva.personas || ''))}</strong></td>
            <td>${getBadge(reserva.estado)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-icon btn-sm btn-whatsapp-action"
                            data-action="whatsapp"
                            data-telefono="${escapeAttribute(reserva.telefono || '')}"
                            data-nombre="${escapeAttribute(reserva.nombre || '')}"
                            aria-label="Contactar por WhatsApp">
                        <i class="ph ph-whatsapp-logo"></i>
                    </button>
                    ${reserva.estado !== 'cancelada' ? `
                        <button class="btn btn-icon btn-sm btn-danger-soft"
                                data-action="cancelar"
                                data-codigo="${escapeAttribute(reserva.codigo || '')}"
                                aria-label="Cancelar reserva">
                            <i class="ph ph-x"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

function getBadge(estado = 'pendiente') {
    const configs = {
        confirmada: { cls: 'badge-success', icon: 'ph-check-circle', text: 'Confirmada' },
        pendiente: { cls: 'badge-warning', icon: 'ph-clock', text: 'Pendiente' },
        cancelada: { cls: 'badge-danger', icon: 'ph-x-circle', text: 'Cancelada' }
    };
    const config = configs[estado] || configs.pendiente;

    return `<span class="badge ${config.cls}"><i class="ph ${config.icon}"></i> ${config.text}</span>`;
}

function initFiltros() {
    document.getElementById('filtro-busqueda')?.addEventListener('input', (event) => {
        adminState.filtros.busqueda = event.target.value;
        renderReservas();
    });

    document.getElementById('filtro-estado')?.addEventListener('change', (event) => {
        adminState.filtros.estado = event.target.value;
        renderReservas();
    });

    document.getElementById('filtro-fecha')?.addEventListener('change', (event) => {
        adminState.filtros.fecha = event.target.value;
        renderReservas();
    });

    document.getElementById('btn-limpiar-filtros')?.addEventListener('click', () => {
        adminState.filtros = { estado: 'all', fecha: '', busqueda: '' };
        setValue('filtro-busqueda', '');
        setValue('filtro-estado', 'all');
        setValue('filtro-fecha', '');
        renderReservas();
    });

    document.getElementById('btn-exportar')?.addEventListener('click', exportarReservas);
}

async function cancelarReserva(codigo) {
    if (!codigo || !confirm(`¿Cancelar reserva ${codigo}?`)) return;

    await db.actualizarEstadoReserva(codigo, 'cancelada');
    await cargarDashboard();
}

function contactarWhatsApp(telefono, nombre) {
    const msg = `Hola ${nombre}. Te contactamos sobre tu reserva. ¿En qué podemos ayudarte?`;
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(msg)}`, '_blank');
}

function exportarReservas() {
    const reservas = aplicarFiltros(adminState.reservas);
    if (!reservas.length) {
        alert('No hay datos para exportar');
        return;
    }

    const csv = [
        'Codigo,Nombre,Telefono,Email,Fecha,Hora,Personas,Notas,Estado',
        ...reservas.map((reserva) => [
            reserva.codigo,
            reserva.nombre,
            reserva.telefono,
            reserva.email || '',
            reserva.fecha,
            reserva.hora,
            reserva.personas,
            reserva.notas || '',
            reserva.estado
        ].map(csvValue).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function csvValue(value = '') {
    const text = String(value).replace(/"/g, '""');
    return /[",\n]/.test(text) ? `"${text}"` : text;
}

function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttribute(value) {
    return escapeHTML(value).replace(/`/g, '&#096;');
}
