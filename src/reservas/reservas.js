// ============================================
// RESERVAS.JS - VERSIÓN CORREGIDA Y COMPLETA
// Sin imports externos por ahora
// Todo funciona con localStorage
// ============================================

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    whatsapp: '1234567890',        // ← Cambiar por tu número
    restaurante: 'Tu Restaurante', // ← Cambiar por tu nombre
    moneda: '$',
    horarioAlmuerzo: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30'],
    horarioCena:     ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30'],
    maxPersonas: 10,
    diasAnticipacion: 30
};

// ============================================
// ESTADO GLOBAL
// ============================================
let reserva = {
    personas: 2,
    fecha: null,
    hora: null,
    nombre: '',
    telefono: '',
    email: '',
    notas: ''
};

let currentStep = 1;
let currentMonth = new Date();

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Reservas iniciando...');
    verificarElementos();
    renderCalendar();
    setupEventListeners();
    console.log('✅ Reservas listo');
});

// ── Verificar que todos los elementos existen ──
function verificarElementos() {
    const elementosRequeridos = [
        'step1', 'step2', 'step3', 'step4', 'step5',
        'categoryNav', 'calendarDays', 'currentMonth',
        'toStep2', 'toStep3', 'toStep4', 'confirmReserva'
    ];

    elementosRequeridos.forEach(id => {
        const el = document.getElementById(id);
        if (!el) {
            console.error(`❌ Elemento no encontrado: #${id}`);
        } else {
            console.log(`✅ Encontrado: #${id}`);
        }
    });
}

// ============================================
// NAVEGACIÓN ENTRE PASOS
// ============================================
function goToStep(step) {
    console.log(`➡️ Navegando a paso ${step}`);

    // Verificar que el paso existe antes de continuar
    const stepEl = document.getElementById(`step${step}`);
    if (!stepEl) {
        console.error(`❌ No existe #step${step} en el HTML`);
        return;
    }

    // Ocultar todos los pasos
    for (let i = 1; i <= 5; i++) {
        const el = document.getElementById(`step${i}`);
        if (el) el.classList.remove('active');
    }

    // Actualizar stepper visual
    document.querySelectorAll('.stepper .step').forEach(s => {
        s.classList.remove('active', 'completed');
    });
    document.querySelectorAll('.step-line').forEach(l => {
        l.classList.remove('active');
    });

    // Marcar pasos completados
    for (let i = 1; i < step; i++) {
        const stepBtn = document.querySelector(`.step[data-step="${i}"]`);
        if (stepBtn) stepBtn.classList.add('completed');
    }

    // Activar líneas
    const lines = document.querySelectorAll('.step-line');
    for (let i = 0; i < step - 1 && i < lines.length; i++) {
        lines[i].classList.add('active');
    }

    // Mostrar paso actual
    stepEl.classList.add('active');

    // Marcar step actual en stepper
    const stepBtn = document.querySelector(`.step[data-step="${step}"]`);
    if (stepBtn) stepBtn.classList.add('active');

    currentStep = step;

    // Actualizar info contextual
    actualizarInfoContextual(step);

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function actualizarInfoContextual(step) {
    if (step === 2 && reserva.fecha) {
        const el = document.getElementById('selectedDateInfo');
        if (el) {
            const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            el.textContent = `📅 ${reserva.fecha.toLocaleDateString('es-ES', opciones)} · 👥 ${reserva.personas} persona(s)`;
        }
    }

    if (step === 3 && reserva.hora) {
        const el = document.getElementById('selectedTimeInfo');
        if (el) {
            el.textContent = `📅 ${formatearFechaCorta(reserva.fecha)} · ⏰ ${reserva.hora} · 👥 ${reserva.personas} persona(s)`;
        }
    }

    if (step === 4) {
        actualizarResumen();
    }
}

// ============================================
// CALENDARIO
// ============================================
function renderCalendar() {
    const year  = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const meses = [
        'Enero','Febrero','Marzo','Abril','Mayo','Junio',
        'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
    ];

    const mesEl = document.getElementById('currentMonth');
    if (mesEl) mesEl.textContent = `${meses[month]} ${year}`;

    const daysContainer = document.getElementById('calendarDays');
    if (!daysContainer) return;

    daysContainer.innerHTML = '';

    const primerDia    = new Date(year, month, 1).getDay();
    const diasEnMes    = new Date(year, month + 1, 0).getDate();
    const hoy          = new Date();
    hoy.setHours(0, 0, 0, 0);
    const maxFecha     = new Date();
    maxFecha.setDate(maxFecha.getDate() + CONFIG.diasAnticipacion);

    // Espacios vacíos al inicio
    for (let i = 0; i < primerDia; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        daysContainer.appendChild(empty);
    }

    // Días del mes
    for (let day = 1; day <= diasEnMes; day++) {
        const fecha = new Date(year, month, day);
        const btn   = document.createElement('button');
        btn.type    = 'button';
        btn.className = 'calendar-day';
        btn.textContent = day;

        const isPasado  = fecha < hoy;
        const isFuturo  = fecha > maxFecha;
        const isHoy     = fecha.toDateString() === hoy.toDateString();
        const isSelected = reserva.fecha &&
            fecha.toDateString() === reserva.fecha.toDateString();

        if (isPasado || isFuturo) {
            btn.classList.add('disabled');
            btn.disabled = true;
        } else {
            btn.addEventListener('click', () => seleccionarFecha(fecha, btn));
        }

        if (isHoy)      btn.classList.add('today');
        if (isSelected) btn.classList.add('selected');

        daysContainer.appendChild(btn);
    }
}

function seleccionarFecha(fecha, btn) {
    document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
    btn.classList.add('selected');
    reserva.fecha = fecha;
    console.log('📅 Fecha seleccionada:', fecha.toLocaleDateString());
    actualizarBotonesNavegacion();
}

// ============================================
// RESUMEN (PASO 4)
// ============================================
function actualizarResumen() {
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

    const campos = {
        'summaryDate':     reserva.fecha?.toLocaleDateString('es-ES', opciones) || '',
        'summaryTime':     reserva.hora || '',
        'summaryPersonas': `${reserva.personas} persona(s)`,
        'summaryNombre':   reserva.nombre,
        'summaryTelefono': reserva.telefono
    };

    Object.entries(campos).forEach(([id, valor]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
    });

    // Notas (mostrar solo si hay)
    const notasContainer = document.getElementById('summaryNotasContainer');
    const notasEl = document.getElementById('summaryNotas');
    if (notasContainer && notasEl) {
        if (reserva.notas) {
            notasContainer.style.display = 'flex';
            notasEl.textContent = reserva.notas;
        } else {
            notasContainer.style.display = 'none';
        }
    }
}

// ============================================
// CONFIRMAR RESERVA
// ============================================
function confirmarReserva() {
    console.log('🎯 Confirmando reserva...');

    const btnConfirm = document.getElementById('confirmReserva');

    // Deshabilitar botón mientras procesa
    if (btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.innerHTML = `
            <span style="display:inline-flex;align-items:center;gap:8px">
                ⏳ Procesando...
            </span>
        `;
    }

    try {
        // Generar código único
        const code = generarCodigo();

        // Guardar en localStorage
        guardarReserva(code);

        // Mostrar código en pantalla
        const codeEl = document.getElementById('reservaCode');
        if (codeEl) codeEl.textContent = code;

        // Preparar mensaje WhatsApp
        const fechaFormateada = reserva.fecha.toLocaleDateString('es-ES', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });

        const mensaje =
`🍽️ *NUEVA RESERVA - ${CONFIG.restaurante}*

📋 Código: *${code}*
👤 Nombre: ${reserva.nombre}
📞 Teléfono: ${reserva.telefono}
📅 Fecha: ${fechaFormateada}
⏰ Hora: ${reserva.hora}
👥 Personas: ${reserva.personas}
${reserva.notas ? `📝 Notas: ${reserva.notas}` : ''}

✅ Reserva confirmada`;

        const whatsappURL = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensaje)}`;

        // Configurar enlace de calendario
        configurarEnlaceCalendario(code);

        // Ir al paso de éxito
        goToStep(5);

        // Abrir WhatsApp después de un momento
        setTimeout(() => {
            window.open(whatsappURL, '_blank');
        }, 1500);

        console.log('✅ Reserva confirmada:', code);

    } catch (error) {
        console.error('❌ Error al crear reserva:', error);

        // Restaurar botón
        if (btnConfirm) {
            btnConfirm.disabled = false;
            btnConfirm.innerHTML = '<i class="fas fa-check"></i> Confirmar Reserva';
        }

        alert('Hubo un error al procesar tu reserva. Por favor intenta de nuevo.');
    }
}

function guardarReserva(code) {
    const reservas = JSON.parse(localStorage.getItem('reservas') || '[]');
    reservas.push({
        codigo: code,
        nombre: reserva.nombre,
        telefono: reserva.telefono,
        email: reserva.email || '',
        fecha: reserva.fecha.toISOString().split('T')[0],
        hora: reserva.hora,
        personas: reserva.personas,
        notas: reserva.notas || '',
        estado: 'confirmada',
        createdAt: new Date().toISOString()
    });
    localStorage.setItem('reservas', JSON.stringify(reservas));
}

function configurarEnlaceCalendario(code) {
    const addToCalBtn = document.getElementById('addToCalendar');
    if (!addToCalBtn || !reserva.fecha) return;

    const startDate = new Date(reserva.fecha);
    const [hours, minutes] = reserva.hora.split(':');
    startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2);

    const fmt = (d) =>
        d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const titulo = encodeURIComponent(`Reserva en ${CONFIG.restaurante}`);
    const detalle = encodeURIComponent(
        `Reserva para ${reserva.personas} personas. Código: ${code}`
    );

    addToCalBtn.href =
        `https://calendar.google.com/calendar/render?action=TEMPLATE` +
        `&text=${titulo}&dates=${fmt(startDate)}/${fmt(endDate)}` +
        `&details=${detalle}`;
}

// ============================================
// UTILIDADES
// ============================================
function generarCodigo() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'RES-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function formatearFechaCorta(fecha) {
    if (!fecha) return '';
    return fecha.toLocaleDateString('es-ES', {
        weekday: 'short', day: 'numeric', month: 'short'
    });
}

function actualizarBotonesNavegacion() {
    const toStep2 = document.getElementById('toStep2');
    const toStep3 = document.getElementById('toStep3');

    if (toStep2) toStep2.disabled = !reserva.fecha;
    if (toStep3) toStep3.disabled = !reserva.hora;
}

function resetearFormulario() {
    reserva = {
        personas: 2,
        fecha: null,
        hora: null,
        nombre: '',
        telefono: '',
        email: '',
        notas: ''
    };

    // Reset formulario
    const form = document.getElementById('reservaForm');
    if (form) form.reset();

    // Reset hora seleccionada
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));

    // Reset personas
    document.querySelectorAll('.persona-btn').forEach(b => b.classList.remove('active'));
    const defaultPersonas = document.querySelector('.persona-btn[data-personas="2"]');
    if (defaultPersonas) defaultPersonas.classList.add('active');

    // Reset calendario
    currentMonth = new Date();
    renderCalendar();

    // Ir al paso 1
    goToStep(1);
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {

    // ── Selector de personas ─────────────────
    document.querySelectorAll('.persona-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.persona-btn')
                .forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            reserva.personas = btn.dataset.personas;
            console.log('👥 Personas:', reserva.personas);
        });
    });

    // ── Navegación del calendario ────────────
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const hoy = new Date();
            // No ir a meses anteriores al actual
            if (
                currentMonth.getFullYear() > hoy.getFullYear() ||
                currentMonth.getMonth() > hoy.getMonth()
            ) {
                currentMonth.setMonth(currentMonth.getMonth() - 1);
                renderCalendar();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentMonth.setMonth(currentMonth.getMonth() + 1);
            renderCalendar();
        });
    }

    // ── Time slots ───────────────────────────
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('unavailable')) return;
            document.querySelectorAll('.time-btn')
                .forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            reserva.hora = btn.dataset.time;
            console.log('⏰ Hora:', reserva.hora);
            actualizarBotonesNavegacion();
        });
    });

    // ── Navegación paso 1 → 2 ───────────────
    const toStep2 = document.getElementById('toStep2');
    if (toStep2) {
        toStep2.addEventListener('click', () => {
            if (!reserva.fecha) {
                alert('Por favor selecciona una fecha');
                return;
            }
            goToStep(2);
        });
    }

    // ── Navegación paso 2 → 3 ───────────────
    const toStep3 = document.getElementById('toStep3');
    if (toStep3) {
        toStep3.addEventListener('click', () => {
            if (!reserva.hora) {
                alert('Por favor selecciona una hora');
                return;
            }
            goToStep(3);
        });
    }

    // ── Regresar paso 2 → 1 ─────────────────
    const backToStep1 = document.getElementById('backToStep1');
    if (backToStep1) {
        backToStep1.addEventListener('click', () => goToStep(1));
    }

    // ── Navegación paso 3 → 4 ───────────────
    const toStep4 = document.getElementById('toStep4');
    if (toStep4) {
        toStep4.addEventListener('click', () => {
            // Recoger datos del formulario
            const nombre    = document.getElementById('nombre')?.value?.trim();
            const telefono  = document.getElementById('telefono')?.value?.trim();
            const email     = document.getElementById('email')?.value?.trim();
            const notas     = document.getElementById('notas')?.value?.trim();

            // Validar campos requeridos
            if (!nombre) {
                alert('Por favor ingresa tu nombre');
                document.getElementById('nombre')?.focus();
                return;
            }
            if (!telefono) {
                alert('Por favor ingresa tu teléfono');
                document.getElementById('telefono')?.focus();
                return;
            }

            // Guardar en estado
            reserva.nombre   = nombre;
            reserva.telefono = telefono;
            reserva.email    = email || '';
            reserva.notas    = notas || '';

            console.log('📝 Datos:', { nombre, telefono });
            goToStep(4);
        });
    }

    // ── Regresar paso 3 → 2 ─────────────────
    const backToStep2 = document.getElementById('backToStep2');
    if (backToStep2) {
        backToStep2.addEventListener('click', () => goToStep(2));
    }

    // ── Regresar paso 4 → 3 ─────────────────
    const backToStep3 = document.getElementById('backToStep3');
    if (backToStep3) {
        backToStep3.addEventListener('click', () => goToStep(3));
    }

    // ── Confirmar reserva ────────────────────
    const confirmBtn = document.getElementById('confirmReserva');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmarReserva);
    }

    // ── Nueva reserva ────────────────────────
    const newReservaBtn = document.getElementById('newReserva');
    if (newReservaBtn) {
        newReservaBtn.addEventListener('click', resetearFormulario);
    }
}