// ============================================
// DATABASE.JS - Sistema Multi-Almacenamiento
// ============================================
// Prioridad:
// 1. Google Sheets (persistente, gratis)
// 2. localStorage (respaldo offline)
// ============================================

// Pegar aqui tu URL de Google Apps Script o definir GOOGLE_SCRIPT_URL en public/env.js
const DEFAULT_GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyev686okgRpuIf4nRC1lpvqDNFK-It7imerTJZFn34xvmQ-vHOdmhRwPYyEBzRga-z/exec";

function getRuntimeEnv(name, fallback = "") {
  const value = window.ENV?.[name];
  if (!value || value.startsWith("%%")) return fallback;
  return value;
}

const GOOGLE_SCRIPT_URL = getRuntimeEnv("GOOGLE_SCRIPT_URL", DEFAULT_GOOGLE_SCRIPT_URL);

// ============================================
// CLASE PRINCIPAL DE BASE DE DATOS
// ============================================
class Database {
  constructor() {
    this.googleURL = GOOGLE_SCRIPT_URL;
    this.token = getRuntimeEnv("SECRET_TOKEN", "abc123xyz789");
    this.isOnline = navigator.onLine;
    this.pendingSync = [];

    // Escuchar cambios de conexión
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.syncPendientes();
    });
    window.addEventListener("offline", () => {
      this.isOnline = false;
    });
  }

  // ============================================
  // RESERVAS
  // ============================================

  async crearReserva(datos) {
    // Generar código único
    const codigo = datos.codigo || "RES-" + Date.now().toString(36).toUpperCase().slice(-6);
    const reserva = {
      ...datos,
      codigo,
      estado: datos.estado || "confirmada",
      timestamp: datos.timestamp || new Date().toISOString(),
    };

    // 1. Guardar en localStorage siempre (respaldo)
    this.guardarLocal("reservas", reserva, "codigo");

    // 2. Intentar guardar en Google Sheets
    try {
      const response = await this.postGoogle({
        action: "nuevaReserva",
        ...reserva,
      });

      if (response.status === "success") {
        console.log("Reserva guardada en Google Sheets");
        return { success: true, codigo: response.codigo || codigo };
      }

      return {
        success: false,
        codigo,
        error: response.message || "Google Sheets rechazó la reserva",
        detalles: response.errores || [],
      };
    } catch (error) {
      console.warn("Sin conexión a Google Sheets, guardado localmente");
      this.agregarPendiente("nuevaReserva", reserva);
      return {
        success: false,
        codigo,
        offline: true,
        error: "No se pudo conectar con Google Sheets",
      };
    }
  }

  async obtenerReservas(filtros = {}) {
    // 1. Intentar obtener de Google Sheets
    try {
      const params = new URLSearchParams({
        action: "getReservas",
        ...filtros,
      });

      const response = await this.getGoogle(params);

      if (response.status === "success") {
        // Actualizar cache local
        const reservas = this.normalizarReservas(response.reservas || []);
        this.guardarCache("reservas_cache", reservas);
        return reservas;
      }
    } catch (error) {
      console.warn("Usando datos locales");
    }

    // 2. Fallback: localStorage
    return this.obtenerCache("reservas_cache", this.obtenerLocal("reservas"));
  }

  async actualizarEstadoReserva(codigo, estado) {
    // 1. Actualizar localmente
    this.actualizarLocal("reservas", "codigo", codigo, { estado });
    this.actualizarCache("reservas_cache", "codigo", codigo, { estado });

    // 2. Intentar actualizar en Google Sheets
    try {
      const response = await this.postGoogle({
        action: "actualizarReserva",
        codigo,
        estado,
      });
      return response.status === "success";
    } catch (error) {
      this.agregarPendiente("actualizarReserva", { codigo, estado });
      return true; // Éxito local
    }
  }

  // ============================================
  // CONTACTOS
  // ============================================

  async crearContacto(datos) {
    const contacto = {
      ...datos,
      timestamp: new Date().toISOString(),
    };

    this.guardarLocal("contactos", contacto, "timestamp");

    try {
      await this.postGoogle({
        action: "nuevoContacto",
        ...contacto,
      });
      console.log("Contacto guardado en Google Sheets");
    } catch (error) {
      this.agregarPendiente("nuevoContacto", contacto);
    }

    return { success: true };
  }

  async obtenerContactos() {
    try {
      const params = new URLSearchParams({ action: "getContactos" });
      const response = await this.getGoogle(params);
      if (response.status === "success") {
        const contactos = response.contactos || [];
        this.guardarCache("contactos_cache", contactos);
        return contactos;
      }
    } catch (error) {}

    return this.obtenerCache("contactos_cache", this.obtenerLocal("contactos"));
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  async obtenerStats() {
    try {
      const params = new URLSearchParams({ action: "getStats" });
      const response = await this.getGoogle(params);
      if (response.status === "success") return response.stats;
    } catch (error) {}

    // Fallback: calcular desde localStorage
    return this.calcularStatsLocal();
  }

  calcularStatsLocal() {
    const reservas = this.obtenerLocal("reservas");
    const hoy = new Date().toISOString().split("T")[0];

    const reservasHoy = reservas.filter((r) => r.fecha === hoy);

    return {
      totalReservas: reservas.length,
      reservasHoy: reservasHoy.length,
      personasHoy: reservasHoy.reduce(
        (sum, r) => sum + parseInt(r.personas || 0),
        0,
      ),
      pendientes: reservas.filter((r) => r.estado === "pendiente").length,
      confirmadas: reservas.filter((r) => r.estado === "confirmada").length,
      canceladas: reservas.filter((r) => r.estado === "cancelada").length,
      totalVisitas: parseInt(localStorage.getItem("menu_visits") || "0"),
    };
  }

  // ============================================
  // VISITAS DEL MENÚ
  // ============================================

  async registrarVisita(pagina = "menu") {
    // Incrementar contador local
    const visitas = parseInt(localStorage.getItem("menu_visits") || "0");
    localStorage.setItem("menu_visits", (visitas + 1).toString());

    // Enviar a Google Sheets (no bloquear)
    try {
      void this.postGoogle({
        action: "registrarVisita",
        pagina,
        userAgent: navigator.userAgent,
      }).catch(() => {});
    } catch (e) {}
  }

  // ============================================
  // COMUNICACIÓN CON GOOGLE SHEETS
  // ============================================

  async getGoogle(params) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    params.set('token', this.token); 

    try {
      const response = await fetch(`${this.googleURL}?${params}`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) throw new Error("Error en la respuesta");
      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  async postGoogle(data) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch(this.googleURL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        // Incluir token en cada petición
        body: JSON.stringify({ ...data, token: this.token }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  // ============================================
  // LOCALSTORAGE (RESPALDO)
  // ============================================

  guardarLocal(coleccion, item, campoUnico = null) {
    try {
      const datos = JSON.parse(localStorage.getItem(coleccion) || "[]");
      if (campoUnico && item[campoUnico]) {
        const index = datos.findIndex((actual) => actual[campoUnico] === item[campoUnico]);
        if (index !== -1) {
          datos[index] = { ...datos[index], ...item };
        } else {
          datos.push(item);
        }
      } else {
        datos.push(item);
      }
      localStorage.setItem(coleccion, JSON.stringify(datos));
    } catch (e) {
      console.error("Error guardando localmente:", e);
    }
  }

  obtenerLocal(coleccion) {
    try {
      return JSON.parse(localStorage.getItem(coleccion) || "[]");
    } catch {
      return [];
    }
  }

  actualizarLocal(coleccion, campoId, valorId, cambios) {
    try {
      const datos = JSON.parse(localStorage.getItem(coleccion) || "[]");
      const index = datos.findIndex((item) => item[campoId] === valorId);
      if (index !== -1) {
        datos[index] = { ...datos[index], ...cambios };
        localStorage.setItem(coleccion, JSON.stringify(datos));
      }
    } catch (e) {
      console.error("Error actualizando localmente:", e);
    }
  }

  guardarCache(clave, datos) {
    localStorage.setItem(clave, JSON.stringify(datos));
    localStorage.setItem(`${clave}_time`, Date.now().toString());
  }

  obtenerCache(clave, fallback = []) {
    try {
      const cache = JSON.parse(localStorage.getItem(clave) || "[]");
      return cache.length ? cache : fallback;
    } catch {
      return fallback;
    }
  }

  actualizarCache(clave, campoId, valorId, cambios) {
    try {
      const datos = JSON.parse(localStorage.getItem(clave) || "[]");
      const index = datos.findIndex((item) => item[campoId] === valorId);
      if (index !== -1) {
        datos[index] = { ...datos[index], ...cambios };
        localStorage.setItem(clave, JSON.stringify(datos));
      }
    } catch (e) {}
  }

  normalizarReservas(reservas) {
    return reservas.map((reserva) => ({
      ...reserva,
      codigo: reserva.codigo || reserva.Codigo || reserva.Código || "",
      nombre: reserva.nombre || reserva.Nombre || "",
      telefono: reserva.telefono || reserva.Telefono || reserva.Teléfono || "",
      email: reserva.email || reserva.Email || "",
      fecha: reserva.fecha || reserva.Fecha || "",
      hora: reserva.hora || reserva.Hora || "",
      personas: reserva.personas || reserva.Personas || "",
      notas: reserva.notas || reserva.Notas || "",
      estado: reserva.estado || reserva.Estado || "pendiente",
    }));
  }

  eliminarLocal(coleccion, campoId, valorId) {
    try {
      const datos = JSON.parse(localStorage.getItem(coleccion) || "[]");
      const filtrados = datos.filter((item) => item[campoId] !== valorId);
      localStorage.setItem(coleccion, JSON.stringify(filtrados));
    } catch (e) {}
  }

  // ============================================
  // SINCRONIZACIÓN OFFLINE → ONLINE
  // ============================================

  agregarPendiente(action, data) {
    this.pendingSync.push({ action, data, timestamp: Date.now() });
    localStorage.setItem("pending_sync", JSON.stringify(this.pendingSync));
    console.log(`Pendiente de sync: ${action}`);
  }

  async syncPendientes() {
    const pendientes = JSON.parse(localStorage.getItem("pending_sync") || "[]");
    if (pendientes.length === 0) return;

    console.log(
      `Sincronizando ${pendientes.length} operaciones pendientes...`,
    );

    const fallidos = [];

    for (const item of pendientes) {
      try {
        await this.postGoogle({
          action: item.action,
          ...item.data,
        });
        console.log(`Sincronizado: ${item.action}`);
      } catch (error) {
        fallidos.push(item);
        console.warn(`Fallo al sincronizar: ${item.action}`);
      }
    }

    localStorage.setItem("pending_sync", JSON.stringify(fallidos));
    this.pendingSync = fallidos;

    if (fallidos.length === 0) {
      console.log("Todo sincronizado correctamente");
    }
  }

  // ============================================
  // ESTADO DE CONEXIÓN
  // ============================================

  async verificarConexion() {
    try {
      const params = new URLSearchParams({ action: "ping" });
      const response = await this.getGoogle(params);
      return response.status === "ok";
    } catch {
      return false;
    }
  }

  getEstadoConexion() {
    const pendientes = JSON.parse(localStorage.getItem("pending_sync") || "[]");
    return {
      online: this.isOnline,
      pendientesDeSincronizar: pendientes.length,
      ultimaSync: localStorage.getItem("last_sync") || "nunca",
    };
  }
}

// ============================================
// EXPORTAR INSTANCIA ÚNICA
// ============================================
export const db = new Database();

// Hacer disponible globalmente también
window.db = db;
