import { db } from '../shared/database.js';
import {
    getMenuData,
    getMenuItems as getStoredMenuItems,
    getSettings,
    saveSettings,
    updateMenuItemAvailability,
    upsertMenuItem
} from '../shared/menu-store.js';

const adminState = {
    currentView: 'dashboard',
    reservas: [],
    contactos: [],
    directorio: JSON.parse(localStorage.getItem('admin_contact_directory') || '[]'),
    settings: getSettings(),
    stats: {},
    menuFiltro: {
        categoria: 'all',
        busqueda: ''
    },
    charts: {},
    filtros: {
        estado: 'all',
        fecha: '',
        busqueda: ''
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
});

async function inicializarAdmin() {
    pintarFechaActual();
    initNavegacion();
    initFiltros();
    initForms();
    initModals();
    document.getElementById('refreshAdmin')?.addEventListener('click', cargarDashboard);

    cambiarVista(getViewFromHash());
    renderMenuAdmin();
    renderMenuCategoryTabs();
    renderConfiguracion();
    renderDirectorio();

    await Promise.all([
        verificarConexion(),
        cargarDashboard()
    ]);

    setInterval(cargarDashboard, 60000);
}

function initForms() {
    document.getElementById('menuItemForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        upsertMenuItem({
            nombre: getValue('menuNombre'),
            categoria: getValue('menuCategoria'),
            precio: getValue('menuPrecio'),
            etiquetas: getValue('menuEtiquetas'),
            descripcion: getValue('menuDescripcion'),
            imagen: getValue('menuImagen'),
            disponible: Boolean(document.getElementById('menuDisponible')?.checked)
        });
        event.target.reset();
        document.getElementById('menuDisponible').checked = true;
        renderMenuAdmin();
        renderMenuCategoryOptions();
        renderMenuCategoryTabs();
        renderAnalytics();
        closeModal('menuModal');
    });

    document.getElementById('directorioForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        adminState.directorio.unshift({
            id: Date.now(),
            nombre: getValue('directorioNombre'),
            tipo: getValue('directorioTipo'),
            telefono: getValue('directorioTelefono'),
            email: getValue('directorioEmail'),
            notas: getValue('directorioNotas'),
            creado: new Date().toISOString()
        });
        localStorage.setItem('admin_contact_directory', JSON.stringify(adminState.directorio));
        event.target.reset();
        renderDirectorio();
        closeModal('contactModal');
    });

    document.getElementById('settingsForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        adminState.settings = saveSettings({
            negocio: getValue('settingNegocio'),
            descripcion: getValue('settingDescripcion'),
            whatsapp: getValue('settingWhatsapp'),
            capacidad: Number(getValue('settingCapacidad') || 0),
            intervaloReservas: Number(getValue('settingIntervalo') || 0),
            adminPin: getValue('settingPin') || adminState.settings.adminPin,
            autoConfirmar: Boolean(document.getElementById('settingAutoConfirmar')?.checked),
            emailConfirmacion: Boolean(document.getElementById('settingEmail')?.checked),
            calendarioCliente: Boolean(document.getElementById('settingCalendario')?.checked)
        });
        renderConfiguracion();
        renderMenuAdmin();
    });

    renderMenuCategoryOptions();
    hydrateSettingsForm();

    document.getElementById('menuSearch')?.addEventListener('input', (event) => {
        adminState.menuFiltro.busqueda = event.target.value.trim().toLowerCase();
        renderMenuAdmin();
    });
}

function initModals() {
    document.getElementById('openMenuModal')?.addEventListener('click', () => openModal('menuModal'));
    document.getElementById('openContactModal')?.addEventListener('click', () => openModal('contactModal'));
    document.querySelectorAll('[data-close-modal]').forEach((button) => {
        button.addEventListener('click', () => closeModal(button.dataset.closeModal));
    });
    document.querySelectorAll('.modal-shell').forEach((modal) => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModal(modal.id);
        });
    });
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
}

function initAuth() {
    const isAuthenticated = sessionStorage.getItem('admin_authenticated') === 'true';
    const loginScreen = document.getElementById('loginScreen');
    const adminLayout = document.querySelector('.admin-layout');
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutAdmin');

    if (isAuthenticated) {
        if (loginScreen) loginScreen.style.display = 'none';
        if (adminLayout) adminLayout.hidden = false;
        inicializarAdmin();
    } else {
        if (loginScreen) loginScreen.style.display = 'grid';
        if (adminLayout) adminLayout.hidden = true;
    }

    loginForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const pin = document.getElementById('adminPin')?.value || '';
        const error = document.getElementById('loginError');
        adminState.settings = getSettings();

        if (pin === String(adminState.settings.adminPin || '1234')) {
            sessionStorage.setItem('admin_authenticated', 'true');
            if (loginScreen) loginScreen.style.display = 'none';
            if (adminLayout) adminLayout.hidden = false;
            inicializarAdmin();
            return;
        }

        if (error) error.textContent = 'PIN incorrecto';
    });

    logoutBtn?.addEventListener('click', () => {
        sessionStorage.removeItem('admin_authenticated');
        window.location.href = '../landing/';
    });
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
                <span>${escapeHTML(formatDateOnly(reserva.fecha))} · ${escapeHTML(formatTimeOnly(reserva.hora))}</span>
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

    const data = getMenuData();
    const items = getMenuItems();
    const activos = items.filter((item) => item.disponible).length;
    setText('stat-menu-activos', activos);
    if (info) info.textContent = `${activos} activos de ${items.length}`;

    const categorias = data.categorias
        .filter((categoria) => adminState.menuFiltro.categoria === 'all' || categoria.id === adminState.menuFiltro.categoria)
        .map((categoria) => ({
            ...categoria,
            items: categoria.items.filter((item) => {
                const query = adminState.menuFiltro.busqueda;
                if (!query) return true;
                return [item.nombre, item.descripcion, ...(item.etiquetas || [])]
                    .join(' ')
                    .toLowerCase()
                    .includes(query);
            })
        }))
        .filter((categoria) => categoria.items.length);

    if (!categorias.length) {
        container.innerHTML = emptyHTML('ph-magnifying-glass', 'Sin platillos', 'No hay platillos con estos filtros.', true);
        return;
    }

    container.innerHTML = `<div class="menu-admin-grid">${categorias.map((categoria) => `
        <section class="menu-category-admin">
            <header>
                <h3>${escapeHTML(categoria.nombre)}</h3>
                <span>${categoria.items.length} platillos</span>
            </header>
            ${categoria.items.map((item) => renderMenuItemAdmin(item)).join('')}
        </section>
    `).join('')}</div>`;

    container.querySelectorAll('[data-menu-toggle]').forEach((input) => {
        input.addEventListener('change', () => {
            updateMenuItemAvailability(input.dataset.menuToggle, input.checked);
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

function renderMenuCategoryTabs() {
    const container = document.getElementById('menuCategoryTabs');
    if (!container) return;

    const data = getMenuData();
    const tabs = [
        { id: 'all', nombre: 'Todos', count: getMenuItems().length },
        ...data.categorias.map((categoria) => ({
            id: categoria.id,
            nombre: categoria.nombre,
            count: categoria.items.length
        }))
    ];

    container.innerHTML = tabs.map((tab) => `
        <button type="button" class="segmented-tab ${adminState.menuFiltro.categoria === tab.id ? 'active' : ''}"
                data-menu-category="${escapeAttribute(tab.id)}">
            ${escapeHTML(tab.nombre)} <span>${tab.count}</span>
        </button>
    `).join('');

    container.querySelectorAll('[data-menu-category]').forEach((button) => {
        button.addEventListener('click', () => {
            adminState.menuFiltro.categoria = button.dataset.menuCategory;
            renderMenuCategoryTabs();
            renderMenuAdmin();
        });
    });
}

function renderMenuCategoryOptions() {
    const select = document.getElementById('menuCategoria');
    if (!select) return;

    const data = getMenuData();
    select.innerHTML = data.categorias.map((categoria) => (
        `<option value="${escapeAttribute(categoria.id)}">${escapeHTML(categoria.nombre)}</option>`
    )).join('');
}

function renderDirectorio() {
    const container = document.getElementById('directorio-container');
    if (!container) return;

    if (!adminState.directorio.length) {
        container.innerHTML = emptyHTML('ph-address-book', 'Sin contactos operativos', 'Agrega proveedores, clientes frecuentes o personal clave.', true);
        return;
    }

    container.innerHTML = `<div class="contact-list">${adminState.directorio.map((contacto) => `
        <article class="contact-item">
            <div class="contact-avatar"><i class="ph ph-buildings"></i></div>
            <div class="contact-body">
                <div class="contact-meta">
                    <strong>${escapeHTML(contacto.nombre)}</strong>
                    <span>${escapeHTML(contacto.tipo)}</span>
                </div>
                <div class="contact-actions-line">
                    ${contacto.telefono ? `<a href="https://wa.me/${escapeAttribute(contacto.telefono.replace(/\D/g, ''))}" target="_blank">${escapeHTML(contacto.telefono)}</a>` : ''}
                    ${contacto.email ? `<a href="mailto:${escapeAttribute(contacto.email)}">${escapeHTML(contacto.email)}</a>` : ''}
                </div>
                <p>${escapeHTML(contacto.notas || '')}</p>
            </div>
        </article>
    `).join('')}</div>`;
}

function renderAnalytics() {
    const estadoCounts = contarPor(adminState.reservas, 'estado');
    const horaCounts = contarPor(adminState.reservas, 'hora');
    const fechas = contarReservasPorFecha(adminState.reservas);

    renderChart('chart-estados', 'doughnut', {
        labels: ['Confirmadas', 'Pendientes', 'Canceladas'],
        datasets: [{
            data: [estadoCounts.confirmada || 0, estadoCounts.pendiente || 0, estadoCounts.cancelada || 0],
            backgroundColor: ['#6B8F71', '#C99726', '#C1694F'],
            borderWidth: 0
        }]
    });

    const horas = Object.entries(horaCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    renderChart('chart-horas', 'bar', {
        labels: horas.map(([hora]) => formatTimeOnly(hora)),
        datasets: [{
            label: 'Reservas',
            data: horas.map(([, value]) => value),
            backgroundColor: '#D4738C',
            borderRadius: 8
        }]
    });

    renderChart('chart-tendencia', 'line', {
        labels: fechas.map(([fecha]) => formatDateShort(fecha)),
        datasets: [{
            label: 'Reservas',
            data: fechas.map(([, value]) => value),
            borderColor: '#4A6FA5',
            backgroundColor: 'rgba(74,111,165,0.12)',
            fill: true,
            tension: 0.35
        }]
    });
}

function renderChart(canvasId, type, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    if (adminState.charts[canvasId]) {
        adminState.charts[canvasId].destroy();
    }

    adminState.charts[canvasId] = new Chart(canvas, {
        type,
        data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: type === 'doughnut' ? 'bottom' : 'top',
                    labels: { boxWidth: 10, color: '#5C4033', font: { family: 'DM Sans' } }
                }
            },
            scales: type === 'doughnut' ? {} : {
                x: { grid: { display: false }, ticks: { color: '#8B7355' } },
                y: { beginAtZero: true, grid: { color: 'rgba(232,213,183,0.55)' }, ticks: { precision: 0, color: '#8B7355' } }
            }
        }
    });
}

function renderConfiguracion() {
    const container = document.getElementById('configuracion-container');
    if (!container) return;

    const env = window.ENV || {};
    adminState.settings = getSettings();
    hydrateSettingsForm();
    const rows = [
        ['Google Apps Script', env.GOOGLE_SCRIPT_URL ? 'Configurado' : 'Pendiente', env.GOOGLE_SCRIPT_URL || 'Sin URL pública'],
        ['Token de seguridad', env.SECRET_TOKEN ? 'Configurado' : 'Pendiente', env.SECRET_TOKEN ? 'Disponible en build' : 'Sin token público'],
        ['WhatsApp', adminState.settings.whatsapp, 'Número usado para mensajes'],
        ['Nombre del negocio', adminState.settings.negocio, 'Nombre usado en confirmaciones'],
        ['Capacidad', `${adminState.settings.capacidad} personas`, 'Control operativo por turno'],
        ['Confirmación', adminState.settings.autoConfirmar ? 'Automática' : 'Manual', 'Estado inicial de nuevas reservas'],
        ['Resend', env.RESEND_FROM ? 'Configurado' : 'Pendiente', 'Configurar RESEND_FROM y RESEND_API_KEY en Vercel']
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

function hydrateSettingsForm() {
    const settings = getSettings();
    setValue('settingNegocio', settings.negocio);
    setValue('settingDescripcion', settings.descripcion);
    setValue('settingWhatsapp', settings.whatsapp);
    setValue('settingCapacidad', settings.capacidad);
    setValue('settingIntervalo', settings.intervaloReservas);
    setValue('settingPin', settings.adminPin);
    setChecked('settingAutoConfirmar', settings.autoConfirmar);
    setChecked('settingEmail', settings.emailConfirmacion);
    setChecked('settingCalendario', settings.calendarioCliente);
}

function aplicarFiltros(reservas) {
    const busqueda = adminState.filtros.busqueda.trim().toLowerCase();
    return reservas.filter((reserva) => {
        const coincideBusqueda = !busqueda ||
            (reserva.nombre || '').toLowerCase().includes(busqueda) ||
            (reserva.codigo || '').toLowerCase().includes(busqueda) ||
            (reserva.telefono || '').toLowerCase().includes(busqueda);
        const coincideEstado = adminState.filtros.estado === 'all' || reserva.estado === adminState.filtros.estado;
        const coincideFecha = !adminState.filtros.fecha || normalizarFecha(reserva.fecha) === adminState.filtros.fecha;
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
            <td>${escapeHTML(formatDateOnly(reserva.fecha))}</td>
            <td>${escapeHTML(formatTimeOnly(reserva.hora))}</td>
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
    adminState.reservas = adminState.reservas.map((reserva) => (
        reserva.codigo === codigo ? { ...reserva, estado: 'cancelada' } : reserva
    ));
    renderReservas();
    renderDashboardReservas();
    renderAnalytics();

    db.actualizarEstadoReserva(codigo, 'cancelada')
        .then(() => cargarStats())
        .catch(() => {
            alert('No se pudo cancelar en Google Sheets. Refresca e intenta de nuevo.');
            void cargarDashboard();
        });
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
    return getStoredMenuItems();
}

function contarPor(items, key) {
    return items.reduce((acc, item) => {
        const value = item[key] || 'Sin dato';
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
}

function contarReservasPorFecha(reservas) {
    const counts = reservas.reduce((acc, reserva) => {
        const fecha = normalizarFecha(reserva.fecha);
        if (!fecha) return acc;
        acc[fecha] = (acc[fecha] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(counts)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14);
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

function formatDateOnly(value) {
    const normalized = normalizarFecha(value);
    if (!normalized) return '';
    const [year, month, day] = normalized.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatDateShort(value) {
    const normalized = normalizarFecha(value);
    if (!normalized) return '';
    const [year, month, day] = normalized.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short'
    });
}

function formatTimeOnly(value) {
    if (!value) return '';
    const raw = String(value);
    const match = raw.match(/(\d{1,2}):(\d{2})/);
    if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;

    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
        return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    return raw;
}

function normalizarFecha(value) {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function getValue(id) {
    return document.getElementById(id)?.value?.trim() || '';
}

function setChecked(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(value);
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
