import { db } from '../shared/database.js';

const MENU_DATA = {
    restaurante: {
        nombre: 'La Casona',
        descripcion: 'Cocina mexicana tradicional',
        moneda: '$',
        whatsapp: '1234567890'
    },
    categorias: [
        {
            id: 'entradas',
            nombre: 'Entradas',
            items: [
                { id: 1, nombre: 'Sopa de tortilla', descripcion: 'Caldo de jitomate con tortilla crujiente, aguacate, crema y queso fresco', precio: 95, etiquetas: ['popular'], disponible: true },
                { id: 2, nombre: 'Guacamole de la casa', descripcion: 'Aguacate fresco con cebolla, cilantro, chile serrano y limón. Servido con totopos', precio: 120, etiquetas: ['vegetariano', 'popular'], disponible: true },
                { id: 3, nombre: 'Quesadillas de flor de calabaza', descripcion: 'Tortillas de maíz hechas a mano con queso Oaxaca y flor de calabaza', precio: 110, etiquetas: ['vegetariano'], disponible: true }
            ]
        },
        {
            id: 'principales',
            nombre: 'Platos principales',
            items: [
                { id: 4, nombre: 'Mole poblano', descripcion: 'Pollo bañado en mole de 28 ingredientes, acompañado de arroz rojo y tortillas', precio: 195, etiquetas: ['chef recomienda', 'popular'], disponible: true },
                { id: 5, nombre: 'Tacos de arrachera', descripcion: 'Tres tacos de arrachera a la parrilla con guacamole, cebolla asada y salsa verde', precio: 175, etiquetas: ['popular'], disponible: true },
                { id: 6, nombre: 'Enchiladas suizas', descripcion: 'Tortillas rellenas de pollo con salsa verde cremosa, gratinadas con queso', precio: 165, etiquetas: [], disponible: true },
                { id: 7, nombre: 'Chile en nogada', descripcion: 'Chile poblano relleno de picadillo, bañado en nogada y granada (temporada)', precio: 225, etiquetas: ['chef recomienda'], disponible: true }
            ]
        },
        {
            id: 'bebidas',
            nombre: 'Bebidas',
            items: [
                { id: 8, nombre: 'Agua de horchata', descripcion: 'Bebida tradicional de arroz con canela y un toque de vainilla', precio: 55, etiquetas: ['refrescante'], disponible: true },
                { id: 9, nombre: 'Jamaica', descripcion: 'Infusión fría de flor de jamaica con un toque de limón', precio: 50, etiquetas: ['refrescante'], disponible: true },
                { id: 10, nombre: 'Café de olla', descripcion: 'Café preparado con piloncillo, canela y clavo en olla de barro', precio: 45, etiquetas: [], disponible: true }
            ]
        },
        {
            id: 'postres',
            nombre: 'Postres',
            items: [
                { id: 11, nombre: 'Flan napolitano', descripcion: 'Flan casero con caramelo, preparado con la receta de la abuela', precio: 85, etiquetas: ['popular'], disponible: true },
                { id: 12, nombre: 'Churros con chocolate', descripcion: 'Churros recién hechos con chocolate caliente para dipping', precio: 95, etiquetas: ['chef recomienda'], disponible: true }
            ]
        }
    ]
};

const adminState = {
    currentView: 'dashboard',
    reservas: [],
    contactos: [],
    menuOverrides: JSON.parse(localStorage.getItem('admin_menu_overrides') || '{}'),
    stats: {},
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
    initNavegacion();
    initFiltros();
    document.getElementById('refreshAdmin')?.addEventListener('click', cargarDashboard);

    cambiarVista(getViewFromHash());
    renderMenuAdmin();
    renderConfiguracion();

    await Promise.all([
        verificarConexion(),
        cargarDashboard()
    ]);

    setInterval(cargarDashboard, 60000);
}

function initNavegacion() {
    document.querySelectorAll('[data-view]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            cambiarVista(link.dataset.view);
            history.replaceState(null, '', `#${link.dataset.view}`);
        });
    });

    document.querySelectorAll('[data-view-link]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            cambiarVista(link.dataset.viewLink);
            history.replaceState(null, '', `#${link.dataset.viewLink}`);
        });
    });

    window.addEventListener('hashchange', () => cambiarVista(getViewFromHash()));
}

function getViewFromHash() {
    const view = window.location.hash.replace('#', '');
    return document.getElementById(`view-${view}`) ? view : 'dashboard';
}

function cambiarVista(view) {
    adminState.currentView = view;
    document.querySelectorAll('.admin-view').forEach((section) => {
        section.classList.toggle('active', section.id === `view-${view}`);
    });
    document.querySelectorAll('[data-view]').forEach((link) => {
        link.classList.toggle('active', link.dataset.view === view);
    });

    const section = document.getElementById(`view-${view}`);
    const title = section?.dataset.title || 'Dashboard';
    const icon = section?.dataset.icon || 'ph-squares-four';
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.innerHTML = `<i class="ph ${icon}"></i> ${title}`;
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
    renderMenuAdmin();
    renderAnalytics();
    renderConfiguracion();
}

async function cargarStats() {
    adminState.stats = await db.obtenerStats();

    setText('stat-hoy', adminState.stats.reservasHoy || 0);
    setText('stat-total', adminState.stats.totalReservas || 0);
    setText('stat-personas', adminState.stats.personasHoy || 0);
    setText('stat-visitas', adminState.stats.totalVisitas || 0);
    setText('stat-confirmadas', adminState.stats.confirmadas || 0);
    setText('stat-canceladas', adminState.stats.canceladas || 0);

    const badge = document.getElementById('pendientes-badge');
    if (!badge) return;
    const pendientes = adminState.stats.pendientes || 0;
    badge.textContent = pendientes;
    badge.style.display = pendientes > 0 ? 'block' : 'none';
}

async function cargarReservas() {
    const container = document.getElementById('reservas-table-container');
    if (container) container.innerHTML = loadingHTML('Cargando reservas...');

    const reservas = await db.obtenerReservas();
    adminState.reservas = Array.isArray(reservas) ? reservas : [];
    renderReservas();
    renderDashboardReservas();
}

async function cargarContactos() {
    const container = document.getElementById('contactos-table-container');
    if (container) container.innerHTML = loadingHTML('Cargando contactos...', true);

    const contactos = await db.obtenerContactos();
    adminState.contactos = Array.isArray(contactos) ? contactos : [];
    setText('stat-contactos', adminState.contactos.length);
    renderContactos();
    renderDashboardContactos();
}

function renderDashboardReservas() {
    const container = document.getElementById('dashboard-reservas');
    if (!container) return;

    const proximas = adminState.reservas
        .filter((reserva) => reserva.estado !== 'cancelada')
        .slice(0, 5);

    if (!proximas.length) {
        container.innerHTML = emptyHTML('ph-calendar-x', 'Sin reservas próximas', 'Cuando entren reservas aparecerán aquí.');
        return;
    }

    container.innerHTML = `<div class="mini-list">${proximas.map((reserva) => `
        <div class="mini-row">
            <div>
                <strong>${escapeHTML(reserva.nombre || '')}</strong>
                <span>${escapeHTML(reserva.fecha || '')} · ${escapeHTML(reserva.hora || '')}</span>
            </div>
            ${getBadge(reserva.estado)}
        </div>
    `).join('')}</div>`;
}

function renderDashboardContactos() {
    const container = document.getElementById('dashboard-contactos');
    if (!container) return;

    const recientes = adminState.contactos.slice(0, 5);
    if (!recientes.length) {
        container.innerHTML = emptyHTML('ph-envelope-simple', 'Sin contactos', 'Los mensajes del formulario aparecerán aquí.');
        return;
    }

    container.innerHTML = `<div class="mini-list">${recientes.map((contacto) => `
        <div class="mini-row">
            <div>
                <strong>${escapeHTML(contacto.nombre || contacto.Nombre || '')}</strong>
                <span>${escapeHTML(contacto.email || contacto.Email || '')}</span>
            </div>
            <a class="btn btn-icon btn-sm" href="mailto:${escapeAttribute(contacto.email || contacto.Email || '')}">
                <i class="ph ph-envelope-simple"></i>
            </a>
        </div>
    `).join('')}</div>`;
}

function renderReservas() {
    const container = document.getElementById('reservas-table-container');
    const info = document.getElementById('tabla-info');
    if (!container) return;

    if (adminState.reservas.length === 0) {
        container.innerHTML = emptyHTML('ph-calendar-x', 'No hay reservas todavía', 'Las reservas aparecerán aquí cuando los clientes las hagan.');
        if (info) info.textContent = '0 reservas';
        return;
    }

    const filtradas = aplicarFiltros(adminState.reservas);
    if (info) info.textContent = `${filtradas.length} de ${adminState.reservas.length} reservas`;

    if (filtradas.length === 0) {
        container.innerHTML = emptyHTML('ph-magnifying-glass', 'Sin resultados', 'No se encontraron reservas con estos filtros.', true);
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
                <tbody>${filtradas.map(renderFilaReserva).join('')}</tbody>
            </table>
        </div>
    `;

    container.querySelectorAll('[data-action="whatsapp"]').forEach((button) => {
        button.addEventListener('click', () => contactarWhatsApp(button.dataset.telefono, button.dataset.nombre));
    });
    container.querySelectorAll('[data-action="cancelar"]').forEach((button) => {
        button.addEventListener('click', async () => cancelarReserva(button.dataset.codigo));
    });
}

function renderContactos() {
    const container = document.getElementById('contactos-table-container');
    const info = document.getElementById('contactos-info');
    if (!container) return;

    if (info) info.textContent = `${adminState.contactos.length} contactos`;
    if (!adminState.contactos.length) {
        container.innerHTML = emptyHTML('ph-envelope-simple', 'No hay contactos todavía', 'Los mensajes del formulario aparecerán aquí.', true);
        return;
    }

    container.innerHTML = `<div class="contact-list">${adminState.contactos.map(renderContacto).join('')}</div>`;
}

function renderMenuAdmin() {
    const container = document.getElementById('menu-admin-container');
    const info = document.getElementById('menu-info');
    if (!container) return;

    const items = getMenuItems();
    const activos = items.filter((item) => item.disponible).length;
    setText('stat-menu-activos', activos);
    if (info) info.textContent = `${activos} activos de ${items.length}`;

    container.innerHTML = `<div class="menu-admin-list">${MENU_DATA.categorias.map((categoria) => `
        <section class="menu-category-admin">
            <header>
                <h3>${escapeHTML(categoria.nombre)}</h3>
                <span>${categoria.items.length} platillos</span>
            </header>
            ${categoria.items.map((item) => renderMenuItemAdmin(aplicarMenuOverride(item))).join('')}
        </section>
    `).join('')}</div>`;

    container.querySelectorAll('[data-menu-toggle]').forEach((input) => {
        input.addEventListener('change', () => {
            const id = input.dataset.menuToggle;
            adminState.menuOverrides[id] = { disponible: input.checked };
            localStorage.setItem('admin_menu_overrides', JSON.stringify(adminState.menuOverrides));
            renderMenuAdmin();
            renderAnalytics();
        });
    });
}

function renderMenuItemAdmin(item) {
    return `
        <article class="menu-admin-item">
            <div>
                <strong>${escapeHTML(item.nombre)}</strong>
                <p>${escapeHTML(item.descripcion || '')}</p>
                <div class="tag-row">${(item.etiquetas || []).map((tag) => `<span class="item-tag">${escapeHTML(tag)}</span>`).join('')}</div>
            </div>
            <div class="menu-admin-meta">
                <strong>$${Number(item.precio || 0).toFixed(2)}</strong>
                <label class="toggle-switch" title="Disponible">
                    <input type="checkbox" data-menu-toggle="${item.id}" ${item.disponible ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </article>
    `;
}

function renderAnalytics() {
    const estadoCounts = contarPor(adminState.reservas, 'estado');
    const horaCounts = contarPor(adminState.reservas, 'hora');

    renderBars('analytics-estados', [
        ['Confirmadas', estadoCounts.confirmada || 0],
        ['Pendientes', estadoCounts.pendiente || 0],
        ['Canceladas', estadoCounts.cancelada || 0]
    ]);

    renderBars('analytics-horas', Object.entries(horaCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6));
}

function renderBars(containerId, rows) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const max = Math.max(...rows.map((row) => row[1]), 1);
    container.innerHTML = `<div class="bar-list">${rows.map(([label, value]) => `
        <div class="bar-row">
            <span>${escapeHTML(label || 'Sin dato')}</span>
            <div class="bar-track"><div style="width:${Math.round((value / max) * 100)}%"></div></div>
            <strong>${value}</strong>
        </div>
    `).join('')}</div>`;
}

function renderConfiguracion() {
    const container = document.getElementById('configuracion-container');
    if (!container) return;

    const env = window.ENV || {};
    const rows = [
        ['Google Apps Script', env.GOOGLE_SCRIPT_URL ? 'Configurado' : 'Pendiente', env.GOOGLE_SCRIPT_URL || 'Sin URL pública'],
        ['Token de seguridad', env.SECRET_TOKEN ? 'Configurado' : 'Pendiente', env.SECRET_TOKEN ? 'Disponible en build' : 'Sin token público'],
        ['WhatsApp', env.WHATSAPP || MENU_DATA.restaurante.whatsapp, 'Número usado para mensajes'],
        ['Nombre del negocio', env.NOMBRE_NEGOCIO || MENU_DATA.restaurante.nombre, 'Nombre usado en confirmaciones'],
        ['Resend', 'Serverless', 'Configurar RESEND_API_KEY en Vercel para correo automático']
    ];

    container.innerHTML = rows.map(([title, value, detail]) => `
        <div class="setting-item">
            <div>
                <strong>${escapeHTML(title)}</strong>
                <p>${escapeHTML(detail)}</p>
            </div>
            <span>${escapeHTML(value)}</span>
        </div>
    `).join('');
}

function aplicarFiltros(reservas) {
    const busqueda = adminState.filtros.busqueda.trim().toLowerCase();
    return reservas.filter((reserva) => {
        const coincideBusqueda = !busqueda ||
            (reserva.nombre || '').toLowerCase().includes(busqueda) ||
            (reserva.codigo || '').toLowerCase().includes(busqueda) ||
            (reserva.telefono || '').toLowerCase().includes(busqueda);
        const coincideEstado = adminState.filtros.estado === 'all' || reserva.estado === adminState.filtros.estado;
        const coincideFecha = !adminState.filtros.fecha || reserva.fecha === adminState.filtros.fecha;
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
                    <button class="btn btn-icon btn-sm btn-whatsapp-action" data-action="whatsapp"
                            data-telefono="${escapeAttribute(reserva.telefono || '')}"
                            data-nombre="${escapeAttribute(reserva.nombre || '')}" aria-label="Contactar por WhatsApp">
                        <i class="ph ph-whatsapp-logo"></i>
                    </button>
                    ${reserva.estado !== 'cancelada' ? `
                        <button class="btn btn-icon btn-sm btn-danger-soft" data-action="cancelar"
                                data-codigo="${escapeAttribute(reserva.codigo || '')}" aria-label="Cancelar reserva">
                            <i class="ph ph-x"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

function renderContacto(contacto) {
    const fecha = contacto.timestamp || contacto.createdAt || contacto.fecha || '';
    const email = contacto.email || contacto.Email || '';
    return `
        <article class="contact-item">
            <div class="contact-avatar"><i class="ph ph-user"></i></div>
            <div class="contact-body">
                <div class="contact-meta">
                    <strong>${escapeHTML(contacto.nombre || contacto.Nombre || '')}</strong>
                    <span>${formatDateTime(fecha)}</span>
                </div>
                <a href="mailto:${escapeAttribute(email)}">${escapeHTML(email)}</a>
                <p>${escapeHTML(contacto.mensaje || contacto.Mensaje || '')}</p>
            </div>
        </article>
    `;
}

function getBadge(estado = 'pendiente') {
    const configs = {
        confirmada: { cls: 'badge-success', icon: 'ph-check-circle', text: 'Confirmada' },
        pendiente: { cls: 'badge-warning', icon: 'ph-clock', text: 'Pendiente' },
        cancelada: { cls: 'badge-danger', icon: 'ph-x-circle', text: 'Cancelada' },
        completada: { cls: 'badge-info', icon: 'ph-seal-check', text: 'Completada' }
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

function getMenuItems() {
    return MENU_DATA.categorias.flatMap((categoria) => categoria.items.map(aplicarMenuOverride));
}

function aplicarMenuOverride(item) {
    return { ...item, ...(adminState.menuOverrides[item.id] || {}) };
}

function contarPor(items, key) {
    return items.reduce((acc, item) => {
        const value = item[key] || 'Sin dato';
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
}

function loadingHTML(text, compact = false) {
    return `<div class="loading-state ${compact ? 'compact' : ''}">
        <i class="ph ph-circle-notch spin"></i>
        <p>${escapeHTML(text)}</p>
    </div>`;
}

function emptyHTML(icon, title, description, compact = false) {
    return `<div class="empty-state ${compact ? 'compact' : ''}">
        <div class="empty-icon"><i class="ph ${icon}"></i></div>
        <h3>${escapeHTML(title)}</h3>
        <p>${escapeHTML(description)}</p>
    </div>`;
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
