import { db } from '../shared/database.js';

// ============================================
// RESERVAS.JS - VERSIÓN FINAL
// Con validaciones, selector de país, envío a
// Google Sheets y formato correcto
// ============================================

// ============================================
// CONFIGURACIÓN
// ============================================
var CONFIG = {
    whatsapp: '5215578053787',
    restaurante: 'La Casona',
    moneda: '$',
    diasAnticipacion: 30
};

// Códigos de país
var COUNTRY_CODES = [
    { code: '+52', name: 'México', maxLen: 10 },
    { code: '+1',  name: 'Estados Unidos', maxLen: 10 },
    { code: '+57', name: 'Colombia', maxLen: 10 },
    { code: '+54', name: 'Argentina', maxLen: 10 },
    { code: '+56', name: 'Chile', maxLen: 9 },
    { code: '+51', name: 'Perú', maxLen: 9 },
    { code: '+593', name: 'Ecuador', maxLen: 9 },
    { code: '+58', name: 'Venezuela', maxLen: 10 },
    { code: '+34', name: 'España', maxLen: 9 },
    { code: '+502', name: 'Guatemala', maxLen: 8 },
    { code: '+503', name: 'El Salvador', maxLen: 8 },
    { code: '+504', name: 'Honduras', maxLen: 8 }
];

// ============================================
// ESTADO GLOBAL
// ============================================
var reserva = {
    personas: 2,
    fecha: null,
    hora: null,
    nombre: '',
    countryCode: '+52',
    telefono: '',
    email: '',
    notas: ''
};

var currentStep = 1;
var currentMonth = new Date();
var formErrors = {};
var ultimaReservaConfirmada = null;

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    verificarElementos();
    renderCalendar();
    renderCountrySelector();
    setupEventListeners();
    setupPhoneValidation();
});

function verificarElementos() {
    var ids = [
        'step1', 'step2', 'step3', 'step4', 'step5',
        'calendarDays', 'currentMonth',
        'toStep2', 'toStep3', 'toStep4', 'confirmReserva'
    ];

    ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (!el) {
            console.warn('Elemento no encontrado: #' + id);
        }
    });
}

// ============================================
// SELECTOR DE PAÍS
// ============================================
function renderCountrySelector() {
    var container = document.getElementById('phoneContainer');
    if (!container) return;

    var html = '<div class="phone-input-group">' +
        '<div class="country-select-wrapper">' +
        '<select id="countryCode" class="country-select" aria-label="Código de país">';

    COUNTRY_CODES.forEach(function(c) {
        var selected = c.code === '+52' ? ' selected' : '';
        html += '<option value="' + c.code + '"' + selected + ' data-maxlen="' + c.maxLen + '">' +
            c.name + ' ' + c.code +
            '</option>';
    });

    html += '</select></div>' +
        '<div class="phone-input-wrapper">' +
        '<input type="tel" id="telefono" required ' +
        'placeholder="55 1234 5678" ' +
        'maxlength="10" ' +
        'inputmode="numeric" ' +
        'autocomplete="tel-national" ' +
        'aria-label="Número de teléfono">' +
        '</div></div>' +
        '<span class="field-hint" id="phoneHint">10 dígitos sin espacios</span>' +
        '<span class="field-error" id="phoneError"></span>';

    container.innerHTML = html;
}

function setupPhoneValidation() {
    var phoneInput = document.getElementById('telefono');
    var countrySelect = document.getElementById('countryCode');

    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            // Solo permitir números
            var clean = e.target.value.replace(/\D/g, '');
            var maxLen = getMaxPhoneLength();
            if (clean.length > maxLen) {
                clean = clean.substring(0, maxLen);
            }
            e.target.value = clean;
            clearFieldError('telefono');
        });
    }

    if (countrySelect) {
        countrySelect.addEventListener('change', function() {
            var maxLen = getMaxPhoneLength();
            var phoneInput = document.getElementById('telefono');
            if (phoneInput) {
                phoneInput.maxLength = maxLen;
                phoneInput.value = phoneInput.value.substring(0, maxLen);
            }
            var hint = document.getElementById('phoneHint');
            if (hint) hint.textContent = maxLen + ' dígitos sin espacios';
            reserva.countryCode = this.value;
        });
    }
}

function getMaxPhoneLength() {
    var select = document.getElementById('countryCode');
    if (!select) return 10;
    var option = select.options[select.selectedIndex];
    return parseInt(option.getAttribute('data-maxlen')) || 10;
}

// ============================================
// VALIDACIONES
// ============================================
function validarPaso3() {
    formErrors = {};
    var isValid = true;

    // Nombre
    var nombre = document.getElementById('nombre');
    if (!nombre || !nombre.value.trim()) {
        setFieldError('nombre', 'El nombre es obligatorio');
        isValid = false;
    } else if (nombre.value.trim().length < 3) {
        setFieldError('nombre', 'Ingresa tu nombre completo');
        isValid = false;
    }

    // Teléfono
    var telefono = document.getElementById('telefono');
    var maxLen = getMaxPhoneLength();
    if (!telefono || !telefono.value.trim()) {
        setFieldError('telefono', 'El teléfono es obligatorio');
        isValid = false;
    } else if (telefono.value.replace(/\D/g, '').length < maxLen) {
        setFieldError('telefono', 'Debe tener ' + maxLen + ' dígitos');
        isValid = false;
    }

    // Email
    var email = document.getElementById('email');
    if (!email || !email.value.trim()) {
        setFieldError('email', 'El email es obligatorio para enviarte la confirmación');
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        setFieldError('email', 'Ingresa un email válido');
        isValid = false;
    }

    return isValid;
}

function setFieldError(fieldId, message) {
    formErrors[fieldId] = message;
    var input = document.getElementById(fieldId);
    var errorEl = document.getElementById(fieldId + 'Error');

    if (input) {
        input.classList.add('input-error');
        input.setAttribute('aria-invalid', 'true');
    }

    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

function clearFieldError(fieldId) {
    delete formErrors[fieldId];
    var input = document.getElementById(fieldId);
    var errorEl = document.getElementById(fieldId + 'Error');

    if (input) {
        input.classList.remove('input-error');
        input.removeAttribute('aria-invalid');
    }

    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
}

function clearAllErrors() {
    ['nombre', 'telefono', 'email'].forEach(function(id) {
        clearFieldError(id);
    });
}

// ============================================
// NAVEGACIÓN ENTRE PASOS
// ============================================
function goToStep(step) {
    var stepEl = document.getElementById('step' + step);
    if (!stepEl) {
        console.error('No existe el paso ' + step);
        return;
    }

    // Ocultar todos
    for (var i = 1; i <= 5; i++) {
        var el = document.getElementById('step' + i);
        if (el) el.classList.remove('active');
    }

    // Stepper visual
    document.querySelectorAll('.stepper .step').forEach(function(s) {
        s.classList.remove('active', 'completed');
    });
    document.querySelectorAll('.step-line').forEach(function(l) {
        l.classList.remove('active');
    });

    for (var j = 1; j < step; j++) {
        var sb = document.querySelector('.step[data-step="' + j + '"]');
        if (sb) sb.classList.add('completed');
    }

    var lines = document.querySelectorAll('.step-line');
    for (var k = 0; k < step - 1 && k < lines.length; k++) {
        lines[k].classList.add('active');
    }

    stepEl.classList.add('active');
    var stepBtn = document.querySelector('.step[data-step="' + step + '"]');
    if (stepBtn) stepBtn.classList.add('active');

    currentStep = step;
    actualizarInfoContextual(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function actualizarInfoContextual(step) {
    if (step === 2 && reserva.fecha) {
        var el = document.getElementById('selectedDateInfo');
        if (el) {
            el.innerHTML =
                '<i class="ph ph-calendar"></i> ' +
                reserva.fecha.toLocaleDateString('es-MX', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                }) + ' &middot; ' + reserva.personas + ' persona(s)';
        }
    }

    if (step === 3 && reserva.hora) {
        var el2 = document.getElementById('selectedTimeInfo');
        if (el2) {
            el2.innerHTML =
                '<i class="ph ph-calendar"></i> ' +
                formatearFechaCorta(reserva.fecha) +
                ' &middot; <i class="ph ph-clock"></i> ' + reserva.hora +
                ' &middot; <i class="ph ph-users"></i> ' + reserva.personas;
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
    var year  = currentMonth.getFullYear();
    var month = currentMonth.getMonth();

    var meses = [
        'Enero','Febrero','Marzo','Abril','Mayo','Junio',
        'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
    ];

    var mesEl = document.getElementById('currentMonth');
    if (mesEl) mesEl.textContent = meses[month] + ' ' + year;

    var daysContainer = document.getElementById('calendarDays');
    if (!daysContainer) return;
    daysContainer.innerHTML = '';

    var primerDia = new Date(year, month, 1).getDay();
    var diasEnMes = new Date(year, month + 1, 0).getDate();
    var hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    var maxFecha = new Date();
    maxFecha.setDate(maxFecha.getDate() + CONFIG.diasAnticipacion);

    for (var i = 0; i < primerDia; i++) {
        var empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        daysContainer.appendChild(empty);
    }

    for (var day = 1; day <= diasEnMes; day++) {
        var fecha = new Date(year, month, day);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'calendar-day';
        btn.textContent = day;

        if (fecha < hoy || fecha > maxFecha) {
            btn.classList.add('disabled');
            btn.disabled = true;
        } else {
            (function(f, b) {
                b.addEventListener('click', function() {
                    seleccionarFecha(f, b);
                });
            })(fecha, btn);
        }

        if (fecha.toDateString() === hoy.toDateString()) {
            btn.classList.add('today');
        }
        if (reserva.fecha && fecha.toDateString() === reserva.fecha.toDateString()) {
            btn.classList.add('selected');
        }

        daysContainer.appendChild(btn);
    }
}

function seleccionarFecha(fecha, btn) {
    document.querySelectorAll('.calendar-day').forEach(function(d) {
        d.classList.remove('selected');
    });
    btn.classList.add('selected');
    reserva.fecha = fecha;
    actualizarBotonesNavegacion();
}

// ============================================
// RESUMEN
// ============================================
function actualizarResumen() {
    var opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

    setText('summaryDate', reserva.fecha
        ? reserva.fecha.toLocaleDateString('es-MX', opciones) : '-');
    setText('summaryTime', reserva.hora || '-');
    setText('summaryPersonas', reserva.personas + ' persona(s)');
    setText('summaryNombre', reserva.nombre);
    setText('summaryTelefono', reserva.countryCode + ' ' + reserva.telefono);
    setText('summaryEmail', reserva.email);

    var notasContainer = document.getElementById('summaryNotasContainer');
    if (notasContainer) {
        if (reserva.notas) {
            notasContainer.style.display = 'flex';
            setText('summaryNotas', reserva.notas);
        } else {
            notasContainer.style.display = 'none';
        }
    }
}

function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ============================================
// CONFIRMAR RESERVA
// ============================================
async function confirmarReserva() {
    var btnConfirm = document.getElementById('confirmReserva');

    if (btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.innerHTML = '<span class="btn-loading"></span> Procesando...';
    }

    var code = generarCodigo();
    var telefonoCompleto = reserva.countryCode + reserva.telefono;

    // Guardar localmente
    var reservaData = {
        codigo: code,
        nombre: reserva.nombre,
        telefono: telefonoCompleto,
        email: reserva.email,
        fecha: reserva.fecha.toISOString().split('T')[0],
        hora: reserva.hora,
        personas: reserva.personas,
        notas: reserva.notas || '',
        estado: 'confirmada',
        createdAt: new Date().toISOString()
    };

    var resultado;
    try {
        resultado = await db.crearReserva(reservaData);
    } catch (error) {
        console.warn('No se pudo guardar la reserva:', error);
        guardarReservaLocal(reservaData);
        resultado = { success: true, codigo: code, offline: true };
    }

    if (resultado && resultado.codigo) {
        code = resultado.codigo;
        reservaData.codigo = code;
    }

    ultimaReservaConfirmada = reservaData;

    // Mostrar código
    setText('reservaCode', code);

    // Configurar Google Calendar
    configurarCalendario(code);
    configurarCalendarioTelefono(code);
    configurarCorreoConfirmacion(reservaData);
    enviarCorreoConfirmacion(reservaData);

    // Ir al paso 5
    goToStep(5);

    // WhatsApp (abrir en nueva pestaña, no redirigir)
    var fechaFormateada = reserva.fecha.toLocaleDateString('es-MX', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    var mensaje =
        '*RESERVA CONFIRMADA - ' + CONFIG.restaurante + '*\n\n' +
        'Codigo: *' + code + '*\n' +
        'Nombre: ' + reserva.nombre + '\n' +
        'Telefono: ' + telefonoCompleto + '\n' +
        'Fecha: ' + fechaFormateada + '\n' +
        'Hora: ' + reserva.hora + '\n' +
        'Personas: ' + reserva.personas +
        (reserva.notas ? '\nNotas: ' + reserva.notas : '');

    var whatsappURL = 'https://wa.me/' + CONFIG.whatsapp +
        '?text=' + encodeURIComponent(mensaje);

    // Mostrar botón de WhatsApp en paso 5
    var wpBtn = document.getElementById('sendWhatsapp');
    if (wpBtn) {
        wpBtn.href = whatsappURL;
        wpBtn.style.display = 'flex';
    }

    // Restaurar botón
    if (btnConfirm) {
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = '<i class="ph ph-check"></i> Confirmar';
    }
}

function guardarReservaLocal(data) {
    try {
        var reservas = JSON.parse(localStorage.getItem('reservas') || '[]');
        reservas.push(data);
        localStorage.setItem('reservas', JSON.stringify(reservas));
    } catch (e) {
        console.warn('Error guardando localmente:', e);
    }
}

function configurarCalendario(code) {
    var btn = document.getElementById('addToCalendar');
    if (!btn || !reserva.fecha) return;

    var start = new Date(reserva.fecha);
    var parts = reserva.hora.split(':');
    start.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);

    var end = new Date(start);
    end.setHours(end.getHours() + 2);

    var fmt = function(d) {
        return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    btn.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
        '&text=' + encodeURIComponent('Reserva en ' + CONFIG.restaurante) +
        '&dates=' + fmt(start) + '/' + fmt(end) +
        '&details=' + encodeURIComponent('Reserva ' + code + ' para ' + reserva.personas + ' personas');
}

function configurarCalendarioTelefono(code) {
    var btn = document.getElementById('downloadCalendar');
    if (!btn || !reserva.fecha) return;

    var ics = crearICS(code);
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);

    btn.href = url;
    btn.download = 'reserva-' + code + '.ics';
}

function configurarCorreoConfirmacion(data) {
    var btn = document.getElementById('sendEmail');
    if (!btn) return;

    var subject = 'Reserva confirmada - ' + CONFIG.restaurante;
    var body =
        'Hola ' + data.nombre + ',\n\n' +
        'Tu reserva quedó confirmada.\n\n' +
        'Código: ' + data.codigo + '\n' +
        'Fecha: ' + data.fecha + '\n' +
        'Hora: ' + data.hora + '\n' +
        'Personas: ' + data.personas + '\n\n' +
        'Te esperamos.';

    btn.href = 'mailto:' + encodeURIComponent(data.email) +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
}

function enviarCorreoConfirmacion(data) {
    fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            negocio: CONFIG.restaurante,
            reserva: data
        })
    })
    .then(function(response) { return response.json(); })
    .then(function(result) {
        if (!result.success) {
            console.info('Correo no enviado:', result.message || result.error || 'sin detalle');
        }
    })
    .catch(function(error) {
        console.info('Correo de confirmación pendiente:', error);
    });
}

function crearICS(code) {
    var start = new Date(reserva.fecha);
    var parts = reserva.hora.split(':');
    start.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);

    var end = new Date(start);
    end.setHours(end.getHours() + 2);

    var stamp = new Date();
    var fmt = function(d) {
        return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    var description = 'Reserva ' + code + ' para ' + reserva.personas + ' personas';
    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Proyecto Negocios//Reservas//ES',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        'UID:' + code + '@proyecto-negocios',
        'DTSTAMP:' + fmt(stamp),
        'DTSTART:' + fmt(start),
        'DTEND:' + fmt(end),
        'SUMMARY:Reserva en ' + CONFIG.restaurante,
        'DESCRIPTION:' + description,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
}

// ============================================
// UTILIDADES
// ============================================
function generarCodigo() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = 'RES-';
    for (var i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function formatearFechaCorta(fecha) {
    if (!fecha) return '';
    return fecha.toLocaleDateString('es-MX', {
        weekday: 'short', day: 'numeric', month: 'short'
    });
}

function actualizarBotonesNavegacion() {
    var toStep2 = document.getElementById('toStep2');
    var toStep3 = document.getElementById('toStep3');
    if (toStep2) toStep2.disabled = !reserva.fecha;
    if (toStep3) toStep3.disabled = !reserva.hora;
}

function resetearFormulario() {
    reserva = {
        personas: 2, fecha: null, hora: null,
        nombre: '', countryCode: '+52',
        telefono: '', email: '', notas: ''
    };
    ultimaReservaConfirmada = null;

    var form = document.getElementById('reservaForm');
    if (form) form.reset();

    document.querySelectorAll('.time-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.persona-btn').forEach(function(b) { b.classList.remove('active'); });

    var def = document.querySelector('.persona-btn[data-personas="2"]');
    if (def) def.classList.add('active');

    var cs = document.getElementById('countryCode');
    if (cs) cs.value = '+52';

    clearAllErrors();
    currentMonth = new Date();
    renderCalendar();
    goToStep(1);
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {

    // Personas
    document.querySelectorAll('.persona-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.persona-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            reserva.personas = btn.getAttribute('data-personas');
        });
    });

    // Calendario nav
    var prev = document.getElementById('prevMonth');
    var next = document.getElementById('nextMonth');

    if (prev) {
        prev.addEventListener('click', function() {
            var hoy = new Date();
            if (currentMonth.getFullYear() > hoy.getFullYear() ||
                currentMonth.getMonth() > hoy.getMonth()) {
                currentMonth.setMonth(currentMonth.getMonth() - 1);
                renderCalendar();
            }
        });
    }

    if (next) {
        next.addEventListener('click', function() {
            currentMonth.setMonth(currentMonth.getMonth() + 1);
            renderCalendar();
        });
    }

    // Time slots
    document.querySelectorAll('.time-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (btn.classList.contains('unavailable')) return;
            document.querySelectorAll('.time-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            reserva.hora = btn.getAttribute('data-time');
            actualizarBotonesNavegacion();
        });
    });

    // Paso 1 → 2
    var toStep2 = document.getElementById('toStep2');
    if (toStep2) {
        toStep2.addEventListener('click', function() {
            if (!reserva.fecha) return;
            goToStep(2);
        });
    }

    // Paso 2 → 3
    var toStep3 = document.getElementById('toStep3');
    if (toStep3) {
        toStep3.addEventListener('click', function() {
            if (!reserva.hora) return;
            goToStep(3);
        });
    }

    // Paso 3 → 4 (con validación)
    var toStep4 = document.getElementById('toStep4');
    if (toStep4) {
        toStep4.addEventListener('click', function() {
            clearAllErrors();

            if (!validarPaso3()) {
                // Focus en primer campo con error
                var firstError = Object.keys(formErrors)[0];
                var el = document.getElementById(firstError);
                if (el) el.focus();
                return;
            }

            reserva.nombre = document.getElementById('nombre').value.trim();
            reserva.telefono = document.getElementById('telefono').value.replace(/\D/g, '');
            reserva.email = document.getElementById('email').value.trim();
            reserva.notas = document.getElementById('notas')
                ? document.getElementById('notas').value.trim() : '';

            var cs = document.getElementById('countryCode');
            if (cs) reserva.countryCode = cs.value;

            goToStep(4);
        });
    }

    // Clear errors on input
    ['nombre', 'email'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', function() {
                clearFieldError(id);
            });
        }
    });

    // Back buttons
    var backs = {
        'backToStep1': 1,
        'backToStep2': 2,
        'backToStep3': 3
    };

    Object.keys(backs).forEach(function(btnId) {
        var btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', function() {
                goToStep(backs[btnId]);
            });
        }
    });

    // Confirmar
    var confirmBtn = document.getElementById('confirmReserva');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmarReserva);
    }

    // Nueva reserva
    var newBtn = document.getElementById('newReserva');
    if (newBtn) {
        newBtn.addEventListener('click', resetearFormulario);
    }
}
