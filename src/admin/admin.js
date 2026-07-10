// ============================================
// ADMIN PANEL - LÓGICA PRINCIPAL
// ============================================

import { supabase } from '../shared/supabase-config.js';
import {
    formatearFecha,
    formatearFechaCorta,
    formatearHora,
    mostrarToast,
    mostrarLoading,
    ocultarLoading,
    exportarCSV,
    crearEmptyState,
    crearSkeleton
} from '../shared/utils.js';
import { crearBadgeEstado, crearModal } from '../shared/components.js';

// ============================================
// ESTADO GLOBAL DEL ADMIN
// ============================================
const adminState = {
    reservas: [],
    menuItems: [],
    categorias: [],
    config: {},
    filtros: {
        estado: 'all',
        fecha: '',
        busqueda: ''
    }
};

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    await cargarDashboard();
    setInterval(cargarDashboard, 60000); // Refresh cada 60s
});

// ============================================
// SIDEBAR MOBILE
// ============================================
function initSidebar() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');

    toggleBtn?.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !toggleBtn?.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // Marcar enlace activo
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        const href = link.getAttribute('href').split('/').pop();
        if (href === currentPage) {
            link.classList.add('active');
        }
    });
}

// ============================================
// DASHBOARD
// ============================================
export async function cargarDashboard() {
    try {
        await Promise.all([
            cargarStatsReservas(),
            cargarReservasRecientes(),
            cargarConfig()
        ]);
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        mostrarToast('Error al cargar datos', 'error');
    }
}

async function cargarStatsReservas() {
    const hoy = new Date().toISOString().split('T')[0];

    const { data: todasReservas, error } = await supabase
        .from('reservas')
        .select('*');

    if (error) {
        console.error(error);
        return;
    }

    adminState.reservas = todasReservas || [];

    const reservasHoy = todasReservas.filter(r => r.fecha === hoy);
    const personasHoy = reservasHoy.reduce((sum, r) => sum + parseInt(r.personas || 0), 0);
    const pendientes = todasReservas.filter(r => r.estado === 'pendiente');

    // Actualizar UI
    updateStat('stat-total', todasReservas.length);
    updateStat('stat-hoy', reservasHoy.length);
    updateStat('stat-personas', personasHoy);
    updateStat('stat-pendientes', pendientes.length);

    // Badge en sidebar
    const badge = document.getElementById('pendientes-badge');
    if (badge) {
        badge.textContent = pendientes.length;
        badge.style.display = pendientes.length > 0 ? 'block' : 'none';
    }
}

function updateStat(id, valor) {
    const el = document.getElementById(id);
    if (el) {
        // Animación de conteo
        const start = parseInt(el.textContent) || 0;
        const end = parseInt(valor);
        const duration = 500;
        const step = (end - start) / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += step;
            if ((step > 0 && current >= end) || (step < 0 && current <= end)) {
                el.textContent = end;
                clearInterval(timer);
            } else {
                el.textContent = Math.floor(current);
            }
        }, 16);
    }
}

// ============================================
// RESERVAS
// ============================================
export async function cargarReservasRecientes(limite = 10) {
    const container = document.getElementById('reservas-table-container');
    if (!container) return;

    container.innerHTML = crearSkeleton(5);

    try {
        let query = supabase
            .from('reservas')
            .select('*')
            .order('created_at', { ascending: false });

        // Aplicar filtros
        if (adminState.filtros.estado !== 'all') {
            query = query.eq('estado', adminState.filtros.estado);
        }
        if (adminState.filtros.fecha) {
            query = query.eq('fecha', adminState.filtros.fecha);
        }
        if (adminState.filtros.busqueda) {
            query = query.ilike('nombre', `%${adminState.filtros.busqueda}%`);
        }

        if (limite) query = query.limit(limite);

        const { data, error } = await query;
        if (error) throw error;

        adminState.reservas = data || [];
        renderTablaReservas(data || []);

    } catch (error) {
        container.innerHTML = crearEmptyState({
            icono: '⚠️',
            titulo: 'Error al cargar reservas',
            descripcion: error.message
        });
    }
}

function renderTablaReservas(reservas) {
    const container = document.getElementById('reservas-table-container');
    if (!container) return;

    if (reservas.length === 0) {
        container.innerHTML = crearEmptyState({
            icono: '📅',
            titulo: 'No hay reservas',
            descripcion: 'Las reservas aparecerán aquí cuando los clientes hagan una solicitud'
        });
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
                <tbody id="reservas-tbody">
                    ${reservas.map(r => renderFilaReserva(r)).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Agregar event listeners a botones
    reservas.forEach(r => {
        document.getElementById(`btn-confirmar-${r.id}`)?.addEventListener('click', () => {
            cambiarEstadoReserva(r.id, 'confirmada');
        });
        document.getElementById(`btn-cancelar-${r.id}`)?.addEventListener('click', () => {
            confirmarCancelacion(r);
        });
        document.getElementById(`btn-whatsapp-${r.id}`)?.addEventListener('click', () => {
            contactarPorWhatsApp(r);
        });
    });
}

function renderFilaReserva(r) {
    const esPasada = new Date(r.fecha) < new Date();
    return `
        <tr style="${esPasada ? 'opacity:0.6' : ''}">
            <td><code style="font-size:0.8rem;color:#6C63FF">${r.codigo}</code></td>
            <td>
                <div style="font-weight:600">${r.nombre}</div>
                <div style="font-size:0.78rem;color:#6c757d">${r.telefono}</div>
            </td>
            <td>${formatearFechaCorta(r.fecha)}</td>
            <td>${formatearHora(r.hora)}</td>
            <td style="text-align:center">
                <strong>${r.personas}</strong>
            </td>
            <td>${crearBadgeEstado(r.estado)}</td>
            <td>
                <div style="display:flex;gap:4px;flex-wrap:wrap">
                    ${r.estado === 'pendiente' ? `
                        <button id="btn-confirmar-${r.id}" class="btn btn-sm btn-primary">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button id="btn-whatsapp-${r.id}" class="btn btn-sm btn-icon"
                            style="background:rgba(37,211,102,0.1);color:#25D366">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    ${r.estado !== 'cancelada' ? `
                        <button id="btn-cancelar-${r.id}" class="btn btn-sm btn-icon"
                                style="background:rgba(255,107,107,0.1);color:#FF6B6B">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

async function cambiarEstadoReserva(id, nuevoEstado) {
    const { error } = await supabase
        .from('reservas')
        .update({ estado: nuevoEstado })
        .eq('id', id);

    if (error) {
        mostrarToast('Error al actualizar reserva', 'error');
        return;
    }

    mostrarToast(`Reserva ${nuevoEstado} ✓`, 'success');
    await cargarReservasRecientes();
    await cargarStatsReservas();
}

function confirmarCancelacion(reserva) {
    crearModal({
        id: 'modal-cancelar',
        titulo: '❌ Cancelar Reserva',
        contenido: `¿Estás seguro de cancelar la reserva de <strong>${reserva.nombre}</strong> 
                    para el ${formatearFechaCorta(reserva.fecha)} a las ${reserva.hora}?`,
        textoConfirmar: 'Sí, cancelar',
        onConfirm: () => cambiarEstadoReserva(reserva.id, 'cancelada')
    });
}

function contactarPorWhatsApp(reserva) {
    const mensaje = `Hola ${reserva.nombre}! 👋 

Te contactamos desde *${adminState.config.nombre_negocio || 'Tu Negocio'}* 
sobre tu reserva del ${formatearFechaCorta(reserva.fecha)} a las ${formatearHora(reserva.hora)}.

¿En qué podemos ayudarte?`;

    window.open(`https://wa.me/${reserva.telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

// ============================================
// FILTROS DE RESERVAS
// ============================================
export function initFiltros() {
    document.getElementById('filtro-estado')?.addEventListener('change', (e) => {
        adminState.filtros.estado = e.target.value;
        cargarReservasRecientes();
    });

    document.getElementById('filtro-fecha')?.addEventListener('change', (e) => {
        adminState.filtros.fecha = e.target.value;
        cargarReservasRecientes();
    });

    document.getElementById('filtro-busqueda')?.addEventListener('input', debounce((e) => {
        adminState.filtros.busqueda = e.target.value;
        cargarReservasRecientes();
    }, 400));

    document.getElementById('btn-limpiar-filtros')?.addEventListener('click', () => {
        adminState.filtros = { estado: 'all', fecha: '', busqueda: '' };
        document.getElementById('filtro-estado').value = 'all';
        document.getElementById('filtro-fecha').value = '';
        document.getElementById('filtro-busqueda').value = '';
        cargarReservasRecientes();
    });

    document.getElementById('btn-exportar')?.addEventListener('click', () => {
        exportarCSV(adminState.reservas.map(r => ({
            Código: r.codigo,
            Nombre: r.nombre,
            Teléfono: r.telefono,
            Email: r.email || '',
            Fecha: formatearFechaCorta(r.fecha),
            Hora: r.hora,
            Personas: r.personas,
            Notas: r.notas || '',
            Estado: r.estado,
            Creada: new Date(r.created_at).toLocaleString('es-ES')
        })), 'reservas');
        mostrarToast('Exportando CSV...', 'info');
    });
}

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// ============================================
// CONFIGURACIÓN
// ============================================
async function cargarConfig() {
    const { data, error } = await supabase
        .from('configuracion')
        .select('*');

    if (error) return;

    adminState.config = {};
    data?.forEach(item => {
        adminState.config[item.clave] = item.valor;
    });
}

export async function guardarConfig(clave, valor) {
    const { error } = await supabase
        .from('configuracion')
        .upsert({ clave, valor }, { onConflict: 'clave' });

    if (error) {
        mostrarToast('Error al guardar', 'error');
        return false;
    }

    adminState.config[clave] = valor;
    mostrarToast('Configuración guardada ✓', 'success');
    return true;
}

// ============================================
// MENÚ ADMIN
// ============================================
export async function cargarMenuAdmin() {
    const { data: items, error } = await supabase
        .from('menu_items')
        .select('*, menu_categorias(nombre, emoji)')
        .order('orden');

    if (error) {
        mostrarToast('Error al cargar menú', 'error');
        return;
    }

    adminState.menuItems = items || [];
    renderMenuAdmin(items || []);
}

function renderMenuAdmin(items) {
    const container = document.getElementById('menu-admin-container');
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = crearEmptyState({
            icono: '🍽️',
            titulo: 'Menú vacío',
            descripcion: 'Agrega tu primer plato al menú'
        });
        return;
    }

    container.innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Imagen</th>
                        <th>Plato</th>
                        <th>Categoría</th>
                        <th>Precio</th>
                        <th>Disponible</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>
                                <img src="${item.imagen || 'https://via.placeholder.com/50'}"
                                     style="width:48px;height:48px;border-radius:8px;object-fit:cover"
                                     alt="${item.nombre}">
                            </td>
                            <td>
                                <div style="font-weight:600">${item.nombre}</div>
                                <div style="font-size:0.78rem;color:#6c757d;max-width:200px;
                                     overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                                    ${item.descripcion || ''}
                                </div>
                            </td>
                            <td>
                                ${item.menu_categorias?.emoji || ''} 
                                ${item.menu_categorias?.nombre || 'Sin categoría'}
                            </td>
                            <td><strong>$${parseFloat(item.precio).toFixed(2)}</strong></td>
                            <td>
                                <label class="toggle-switch">
                                    <input type="checkbox" ${item.disponible ? 'checked' : ''}
                                           onchange="toggleDisponibilidad(${item.id}, this.checked)">
                                    <span class="toggle-slider"></span>
                                </label>
                            </td>
                            <td>
                                <div style="display:flex;gap:4px">
                                    <button class="btn btn-sm btn-icon" onclick="editarItem(${item.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-icon"
                                            style="background:rgba(255,107,107,0.1);color:#FF6B6B"
                                            onclick="eliminarItem(${item.id}, '${item.nombre}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

export async function toggleDisponibilidad(id, disponible) {
    const { error } = await supabase
        .from('menu_items')
        .update({ disponible })
        .eq('id', id);

    if (error) {
        mostrarToast('Error al actualizar', 'error');
        return;
    }
    mostrarToast(`Item ${disponible ? 'activado' : 'desactivado'} ✓`, 'success');
}

export async function eliminarItem(id, nombre) {
    crearModal({
        id: 'modal-eliminar',
        titulo: '🗑️ Eliminar Item',
        contenido: `¿Eliminar <strong>${nombre}</strong> del menú? Esta acción no se puede deshacer.`,
        textoConfirmar: 'Eliminar',
        onConfirm: async () => {
            const { error } = await supabase.from('menu_items').delete().eq('id', id);
            if (error) {
                mostrarToast('Error al eliminar', 'error');
                return;
            }
            mostrarToast('Item eliminado ✓', 'success');
            cargarMenuAdmin();
        }
    });
}

// Exponer funciones globalmente para los onclick del HTML
window.toggleDisponibilidad = toggleDisponibilidad;
window.eliminarItem = eliminarItem;
window.editarItem = (id) => {
    const item = adminState.menuItems.find(i => i.id === id);
    if (item) {
        // Aquí puedes abrir un modal de edición
        console.log('Editar:', item);
    }
};