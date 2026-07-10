// reservas/reservas.js
import { db } from "../shared/database.js";

// ============ CONFIGURACIÓN ============
const CONFIG = {
  whatsapp: "1234567890", // Tu número de WhatsApp
  restaurante: "Tu Restaurante",
  horarioAlmuerzo: ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30"],
  horarioCena: ["19:00", "19:30", "20:00", "20:30", "21:00", "21:30"],
  maxPersonas: 10,
  diasAnticipacion: 30,
};

// ============ ESTADO ============
let reserva = {
  personas: 3,
  fecha: null,
  hora: null,
  nombre: "",
  telefono: "",
  email: "",
  notas: "",
};

let currentStep = 1;
let currentMonth = new Date();

// ============ INICIALIZACIÓN ============
function init() {
  renderCalendar();
  setupEventListeners();
}

// ============ CALENDARIO ============
function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  document.getElementById("currentMonth").textContent =
    `${monthNames[month]} ${year}`;

  const daysContainer = document.getElementById("calendarDays");
  daysContainer.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + CONFIG.diasAnticipacion);

  // Espacios vacíos
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day empty";
    daysContainer.appendChild(empty);
  }

  // Días del mes
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const btn = document.createElement("button");
    btn.className = "calendar-day";
    btn.textContent = day;

    if (date < today) {
      btn.classList.add("disabled");
    } else if (date > maxDate) {
      btn.classList.add("disabled");
    } else {
      btn.addEventListener("click", () => selectDate(date, btn));
    }

    if (date.toDateString() === today.toDateString()) {
      btn.classList.add("today");
    }

    if (reserva.fecha && date.toDateString() === reserva.fecha.toDateString()) {
      btn.classList.add("selected");
    }

    daysContainer.appendChild(btn);
  }
}

function selectDate(date, btn) {
  document
    .querySelectorAll(".calendar-day")
    .forEach((d) => d.classList.remove("selected"));
  btn.classList.add("selected");
  reserva.fecha = date;
  updateStepButtons();
}

// ============ NAVEGACIÓN DE PASOS ============
function goToStep(step) {
  // Ocultar paso actual
  document
    .querySelectorAll(".step-content")
    .forEach((s) => s.classList.remove("active"));
  document
    .querySelectorAll(".stepper .step")
    .forEach((s) => s.classList.remove("active", "completed"));
  document
    .querySelectorAll(".step-line")
    .forEach((l) => l.classList.remove("active"));

  // Marcar pasos completados
  for (let i = 1; i < step; i++) {
    document
      .querySelector(`.step[data-step="${i}"]`)
      .classList.add("completed");
  }

  // Activar líneas
  const lines = document.querySelectorAll(".step-line");
  for (let i = 0; i < step - 1 && i < lines.length; i++) {
    lines[i].classList.add("active");
  }

  // Mostrar paso actual
  document.getElementById(`step${step}`).classList.add("active");
  document.querySelector(`.step[data-step="${step}"]`).classList.add("active");
  currentStep = step;

  // Actualizar info contextual
  if (step === 2) {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    document.getElementById("selectedDateInfo").textContent =
      `📅 ${reserva.fecha.toLocaleDateString("es-ES", options)} · ${reserva.personas} persona(s)`;
  }

  if (step === 3) {
    document.getElementById("selectedTimeInfo").textContent =
      `📅 ${formatDate(reserva.fecha)} · ⏰ ${reserva.hora} · 👥 ${reserva.personas} persona(s)`;
  }

  if (step === 4) {
    updateSummary();
  }

  // Scroll arriba
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function formatDate(date) {
  const options = { weekday: "short", day: "numeric", month: "short" };
  return date.toLocaleDateString("es-ES", options);
}

function updateStepButtons() {
  document.getElementById("toStep2").disabled = !reserva.fecha;
  document.getElementById("toStep3").disabled = !reserva.hora;
}

function updateSummary() {
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  document.getElementById("summaryDate").textContent =
    reserva.fecha.toLocaleDateString("es-ES", options);
  document.getElementById("summaryTime").textContent = reserva.hora;
  document.getElementById("summaryPersonas").textContent =
    `${reserva.personas} persona(s)`;
  document.getElementById("summaryNombre").textContent = reserva.nombre;
  document.getElementById("summaryTelefono").textContent = reserva.telefono;

  if (reserva.notas) {
    document.getElementById("summaryNotasContainer").style.display = "flex";
    document.getElementById("summaryNotas").textContent = reserva.notas;
  }
}

// ============ CONFIRMAR RESERVA ============
async function confirmarReserva() {
  const btnConfirm = document.getElementById("confirmReserva");

  // Deshabilitar botón
  btnConfirm.disabled = true;
  btnConfirm.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" 
             stroke="currentColor" style="animation: spin 0.8s linear infinite;">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        Procesando...
        <style>@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }</style>
    `;

  try {
    // ── Guardar en Database (Google Sheets + localStorage) ──
    const resultado = await db.crearReserva({
      nombre: reserva.nombre,
      telefono: reserva.telefono,
      email: reserva.email || "",
      fecha: reserva.fecha.toISOString().split("T")[0],
      hora: reserva.hora,
      personas: reserva.personas,
      notas: reserva.notas || "",
    });

    const code = resultado.codigo;
    document.getElementById("reservaCode").textContent = code;

    // ── Mostrar indicador offline si aplica ──
    if (resultado.offline) {
      const offlineMsg = document.createElement("p");
      offlineMsg.style.cssText =
        "color:#FFC107;font-size:0.85rem;margin-top:8px;";
      offlineMsg.textContent =
        "⚠️ Guardado localmente. Se sincronizará cuando haya conexión.";
      document.querySelector(".reserva-code").appendChild(offlineMsg);
    }

    // ── Preparar mensaje de WhatsApp ──
    const fechaFormateada = reserva.fecha.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const mensaje = `🍽️ *NUEVA RESERVA - ${CONFIG.restaurante}*

📋 Código: *${code}*
👤 Nombre: ${reserva.nombre}
📞 Teléfono: ${reserva.telefono}
📅 Fecha: ${fechaFormateada}
⏰ Hora: ${reserva.hora}
👥 Personas: ${reserva.personas}
${reserva.notas ? `📝 Notas: ${reserva.notas}` : ""}

✅ Reserva confirmada automáticamente`;

    const whatsappURL = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensaje)}`;

    // ── Google Calendar ──
    const startDate = new Date(reserva.fecha);
    const [hours, minutes] = reserva.hora.split(":");
    startDate.setHours(parseInt(hours), parseInt(minutes));
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2);

    const fmt = (d) =>
      d
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    const calendarURL = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Reserva en ${CONFIG.restaurante}`)}&dates=${fmt(startDate)}/${fmt(endDate)}&details=${encodeURIComponent(`Reserva para ${reserva.personas} personas. Código: ${code}`)}`;

    document.getElementById("addToCalendar").href = calendarURL;

    // ── Ir al paso de éxito ──
    goToStep(5);

    // ── Abrir WhatsApp ──
    setTimeout(() => {
      window.open(whatsappURL, "_blank");
    }, 1500);
  } catch (error) {
    console.error("Error al crear reserva:", error);
    btnConfirm.disabled = false;
    btnConfirm.innerHTML = '<i class="fas fa-check"></i> Confirmar Reserva';
    alert("Hubo un error. Tu reserva se guardó localmente.");
  }
}

// ============ EVENT LISTENERS ============
function setupEventListeners() {
  // Personas
  document.querySelectorAll(".persona-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".persona-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      reserva.personas = btn.dataset.personas;
    });
  });

  // Calendario navegación
  document.getElementById("prevMonth").addEventListener("click", () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById("nextMonth").addEventListener("click", () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  });

  // Time slots
  document.querySelectorAll(".time-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("unavailable")) return;
      document
        .querySelectorAll(".time-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      reserva.hora = btn.dataset.time;
      updateStepButtons();
    });
  });

  // Navegación entre pasos
  document
    .getElementById("toStep2")
    .addEventListener("click", () => goToStep(2));
  document
    .getElementById("toStep3")
    .addEventListener("click", () => goToStep(3));
  document
    .getElementById("backToStep1")
    .addEventListener("click", () => goToStep(1));
  document
    .getElementById("backToStep2")
    .addEventListener("click", () => goToStep(2));
  document
    .getElementById("backToStep3")
    .addEventListener("click", () => goToStep(3));

  // Paso 3 a 4 (recoger datos)
  document.getElementById("toStep4").addEventListener("click", () => {
    const nombre = document.getElementById("nombre").value;
    const telefono = document.getElementById("telefono").value;

    if (!nombre || !telefono) {
      alert("Por favor completa nombre y teléfono");
      return;
    }

    reserva.nombre = nombre;
    reserva.telefono = telefono;
    reserva.email = document.getElementById("email").value;
    reserva.notas = document.getElementById("notas").value;

    goToStep(4);
  });

  // Confirmar
  document
    .getElementById("confirmReserva")
    .addEventListener("click", confirmarReserva);

  // Nueva reserva
  document.getElementById("newReserva").addEventListener("click", () => {
    reserva = {
      personas: 3,
      fecha: null,
      hora: null,
      nombre: "",
      telefono: "",
      email: "",
      notas: "",
    };
    document.getElementById("reservaForm").reset();
    document
      .querySelectorAll(".time-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".persona-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelector('.persona-btn[data-personas="3"]')
      .classList.add("active");
    renderCalendar();
    goToStep(1);
  });
}

// ============ INICIAR ============
document.addEventListener("DOMContentLoaded", init);
