// ============================================
// GOOGLE APPS SCRIPT - PROYECTO NEGOCIOS
// Reemplaza el contenido de Apps Script con este archivo.
// ============================================

const CONFIG = {
  SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
  SECRET_TOKEN: 'CAMBIAR_POR_EL_MISMO_SECRET_TOKEN_DE_VERCEL',

  MAX_RESERVAS_POR_CLIENTE_POR_DIA: 3,
  MAX_CONTACTOS_POR_EMAIL_POR_DIA: 2,
  MAX_REGISTROS_TOTALES: 10000,

  MAX_PERSONAS: 20,
  MIN_PERSONAS: 1,
  HORAS_VALIDAS: [
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'
  ],
  DIAS_ANTICIPACION_MAX: 30,

  SHEETS: {
    RESERVAS: 'Reservas',
    CONTACTOS: 'Contactos',
    VISITAS: 'MenuVisitas',
    RATE_LIMIT: 'RateLimit'
  }
};

function doGet(e) {
  try {
    if (!validarToken(e.parameter.token)) {
      return respuestaError('No autorizado', 401);
    }

    switch (e.parameter.action) {
      case 'ping':
        return respuestaOK({ status: 'ok', message: 'API activa' });
      case 'getReservas':
        return respuestaOK(getReservas(e.parameter));
      case 'getStats':
        return respuestaOK(getStats());
      case 'getContactos':
        return respuestaOK(getContactos());
      default:
        return respuestaOK({ status: 'ok', message: 'API activa' });
    }
  } catch (error) {
    Logger.log('Error en doGet: ' + error.message);
    return respuestaError(error.message);
  }
}

function doPost(e) {
  try {
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch {
      return respuestaError('Datos inválidos');
    }

    if (!validarToken(data.token)) {
      return respuestaError('No autorizado', 401);
    }

    switch (data.action) {
      case 'nuevaReserva':
        return respuestaOK(crearReserva(data));
      case 'actualizarReserva':
        return respuestaOK(actualizarReserva(data));
      case 'nuevoContacto':
        return respuestaOK(crearContacto(data));
      case 'registrarVisita':
        return respuestaOK(registrarVisita(data));
      default:
        return respuestaError('Acción no reconocida');
    }
  } catch (error) {
    Logger.log('Error en doPost: ' + error.message);
    return respuestaError('Error interno del servidor');
  }
}

function validarToken(token) {
  return token === CONFIG.SECRET_TOKEN;
}

function verificarRateLimit(clave, action, limite) {
  const sheet = obtenerOCrearHoja(CONFIG.SHEETS.RATE_LIMIT, [
    'Clave', 'Accion', 'Count', 'Fecha', 'UltimoAcceso'
  ]);

  const hoy = fechaISO(new Date());
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === clave && data[i][1] === action && data[i][3] === hoy) {
      const count = parseInt(data[i][2], 10) || 0;
      if (count >= limite) return false;

      sheet.getRange(i + 1, 3).setValue(count + 1);
      sheet.getRange(i + 1, 5).setValue(new Date().toISOString());
      return true;
    }
  }

  sheet.appendRow([clave, action, 1, hoy, new Date().toISOString()]);
  return true;
}

function validarDatosReserva(data) {
  const errores = [];

  if (!data.nombre || data.nombre.trim().length < 2) errores.push('Nombre inválido');
  if (data.nombre && data.nombre.length > 100) errores.push('Nombre demasiado largo');
  if (!data.telefono || !/^[+\d\s\-()]{7,20}$/.test(data.telefono)) errores.push('Teléfono inválido');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errores.push('Email inválido');

  if (!data.fecha) {
    errores.push('Fecha requerida');
  } else {
    const fecha = parseFechaLocal(data.fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const maxFecha = new Date();
    maxFecha.setDate(maxFecha.getDate() + CONFIG.DIAS_ANTICIPACION_MAX);

    if (fecha < hoy) errores.push('Fecha en el pasado');
    if (fecha > maxFecha) errores.push(`Fecha máxima: ${CONFIG.DIAS_ANTICIPACION_MAX} días`);
  }

  if (!CONFIG.HORAS_VALIDAS.includes(data.hora)) errores.push('Hora no válida');

  const personas = parseInt(data.personas, 10);
  if (isNaN(personas) || personas < CONFIG.MIN_PERSONAS || personas > CONFIG.MAX_PERSONAS) {
    errores.push(`Personas debe ser entre ${CONFIG.MIN_PERSONAS} y ${CONFIG.MAX_PERSONAS}`);
  }

  if (data.notas && data.notas.length > 500) errores.push('Notas demasiado largas');
  if (contieneHTML(data.nombre) || contieneHTML(data.notas)) errores.push('Contenido no permitido detectado');

  return errores;
}

function validarDatosContacto(data) {
  const errores = [];

  if (!data.nombre || data.nombre.trim().length < 2) errores.push('Nombre inválido');
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errores.push('Email inválido');
  if (!data.mensaje || data.mensaje.trim().length < 10) errores.push('Mensaje muy corto');
  if (data.mensaje && data.mensaje.length > 1000) errores.push('Mensaje demasiado largo');
  if (contieneHTML(data.mensaje)) errores.push('Contenido no permitido');

  return errores;
}

function contieneHTML(texto) {
  if (!texto) return false;
  return /<[^>]*>|javascript:|on\w+=/i.test(texto);
}

function sanitizar(texto, max = 500) {
  if (!texto) return '';
  return String(texto)
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .substring(0, max);
}

function crearReserva(data) {
  const errores = validarDatosReserva(data);
  if (errores.length > 0) {
    return { status: 'error', message: errores.join(', '), errores };
  }

  const rateKey = sanitizar(data.telefono);
  if (!verificarRateLimit(rateKey, 'nuevaReserva', CONFIG.MAX_RESERVAS_POR_CLIENTE_POR_DIA)) {
    return { status: 'error', message: 'Límite de reservas alcanzado por hoy' };
  }

  const sheet = obtenerHoja(CONFIG.SHEETS.RESERVAS);
  if (sheet && sheet.getLastRow() > CONFIG.MAX_REGISTROS_TOTALES) {
    return { status: 'error', message: 'Sistema temporalmente no disponible' };
  }

  if (existeReservaDuplicada(data.telefono, data.fecha, data.hora)) {
    return { status: 'error', message: 'Ya existe una reserva con este teléfono para esa fecha y hora' };
  }

  const codigo = generarCodigo();
  const reservaLimpia = {
    codigo,
    nombre: sanitizar(data.nombre, 100),
    telefono: sanitizar(data.telefono, 30),
    email: sanitizar(data.email || '', 120),
    fecha: data.fecha,
    hora: data.hora,
    personas: parseInt(data.personas, 10),
    notas: sanitizar(data.notas || '', 500),
    estado: 'confirmada',
    timestamp: new Date().toISOString()
  };

  const targetSheet = obtenerOCrearHoja(CONFIG.SHEETS.RESERVAS, [
    'Codigo', 'Nombre', 'Telefono', 'Email', 'Fecha',
    'Hora', 'Personas', 'Notas', 'Estado', 'Timestamp'
  ]);

  targetSheet.appendRow([
    reservaLimpia.codigo,
    reservaLimpia.nombre,
    reservaLimpia.telefono,
    reservaLimpia.email,
    reservaLimpia.fecha,
    reservaLimpia.hora,
    reservaLimpia.personas,
    reservaLimpia.notas,
    reservaLimpia.estado,
    reservaLimpia.timestamp
  ]);

  try {
    enviarEmailNotificacion(reservaLimpia);
  } catch (e) {
    Logger.log('Error enviando email admin: ' + e.message);
  }

  return { status: 'success', message: 'Reserva creada exitosamente', codigo };
}

function existeReservaDuplicada(telefono, fecha, hora) {
  const sheet = obtenerHoja(CONFIG.SHEETS.RESERVAS);
  if (!sheet || sheet.getLastRow() <= 1) return false;

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (
      data[i][2] === telefono &&
      data[i][4] === fecha &&
      data[i][5] === hora &&
      data[i][8] !== 'cancelada'
    ) {
      return true;
    }
  }
  return false;
}

function getReservas(params) {
  const sheet = obtenerHoja(CONFIG.SHEETS.RESERVAS);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { status: 'success', reservas: [], total: 0 };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => normalizarHeader(h));
  let reservas = [];

  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = data[i][index];
    });
    reservas.push(row);
  }

  if (params.estado && params.estado !== 'all') {
    reservas = reservas.filter(r => r.estado === params.estado);
  }
  if (params.fecha) {
    reservas = reservas.filter(r => r.fecha === params.fecha);
  }
  if (params.busqueda) {
    const q = params.busqueda.toLowerCase();
    reservas = reservas.filter(r =>
      (r.nombre || '').toLowerCase().includes(q) ||
      (r.codigo || '').toLowerCase().includes(q) ||
      (r.telefono || '').toLowerCase().includes(q)
    );
  }

  reservas.reverse();
  return { status: 'success', reservas, total: reservas.length };
}

function actualizarReserva(data) {
  const estadosValidos = ['confirmada', 'pendiente', 'cancelada', 'completada'];
  if (!estadosValidos.includes(data.estado)) {
    return { status: 'error', message: 'Estado no válido' };
  }

  const sheet = obtenerHoja(CONFIG.SHEETS.RESERVAS);
  if (!sheet) return { status: 'error', message: 'Sheet no encontrado' };

  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === data.codigo) {
      sheet.getRange(i + 1, 9).setValue(data.estado);
      return { status: 'success', message: `Reserva actualizada a: ${data.estado}` };
    }
  }

  return { status: 'error', message: 'Reserva no encontrada' };
}

function crearContacto(data) {
  const errores = validarDatosContacto(data);
  if (errores.length > 0) {
    return { status: 'error', message: errores.join(', ') };
  }

  const rateKey = sanitizar(data.email, 120);
  if (!verificarRateLimit(rateKey, 'nuevoContacto', CONFIG.MAX_CONTACTOS_POR_EMAIL_POR_DIA)) {
    return { status: 'error', message: 'Límite de mensajes alcanzado por hoy' };
  }

  const sheet = obtenerOCrearHoja(CONFIG.SHEETS.CONTACTOS, [
    'Nombre', 'Email', 'Mensaje', 'Origen', 'Timestamp', 'Leido'
  ]);

  sheet.appendRow([
    sanitizar(data.nombre, 100),
    sanitizar(data.email, 120),
    sanitizar(data.mensaje, 1000),
    sanitizar(data.origen || 'web', 50),
    new Date().toISOString(),
    false
  ]);

  return { status: 'success', message: 'Mensaje recibido' };
}

function registrarVisita(data) {
  const sheet = obtenerOCrearHoja(CONFIG.SHEETS.VISITAS, [
    'Pagina', 'Fecha', 'Timestamp'
  ]);

  const ultimaFila = sheet.getLastRow();
  if (ultimaFila > 1) {
    const ultimaVisita = sheet.getRange(ultimaFila, 3).getValue();
    const diferencia = new Date() - new Date(ultimaVisita);
    if (diferencia < 5 * 60 * 1000) return { status: 'success' };
  }

  sheet.appendRow([
    sanitizar(data.pagina || 'menu', 60),
    fechaISO(new Date()),
    new Date().toISOString()
  ]);

  return { status: 'success' };
}

function getStats() {
  const reservasSheet = obtenerHoja(CONFIG.SHEETS.RESERVAS);
  const hoy = fechaISO(new Date());
  const stats = {
    totalReservas: 0,
    reservasHoy: 0,
    personasHoy: 0,
    pendientes: 0,
    confirmadas: 0,
    canceladas: 0,
    totalVisitas: 0
  };

  if (reservasSheet && reservasSheet.getLastRow() > 1) {
    const data = reservasSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      stats.totalReservas++;
      const fecha = normalizarFechaValor(data[i][4]);
      const estado = data[i][8];

      if (estado === 'pendiente') stats.pendientes++;
      else if (estado === 'confirmada') stats.confirmadas++;
      else if (estado === 'cancelada') stats.canceladas++;

      if (fecha === hoy) {
        stats.reservasHoy++;
        stats.personasHoy += parseInt(data[i][6], 10) || 0;
      }
    }
  }

  const visitasSheet = obtenerHoja(CONFIG.SHEETS.VISITAS);
  if (visitasSheet) {
    stats.totalVisitas = Math.max(0, visitasSheet.getLastRow() - 1);
  }

  return { status: 'success', stats };
}

function getContactos() {
  const sheet = obtenerHoja(CONFIG.SHEETS.CONTACTOS);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { status: 'success', contactos: [], total: 0 };
  }

  const data = sheet.getDataRange().getValues();
  const contactos = [];

  for (let i = 1; i < data.length; i++) {
    contactos.push({
      nombre: data[i][0],
      email: data[i][1],
      mensaje: data[i][2],
      origen: data[i][3],
      timestamp: data[i][4],
      leido: data[i][5]
    });
  }

  contactos.reverse();
  return { status: 'success', contactos, total: contactos.length };
}

function enviarEmailNotificacion(reserva) {
  const emailAdmin = Session.getActiveUser().getEmail();
  if (!emailAdmin) return;

  MailApp.sendEmail({
    to: emailAdmin,
    subject: `Nueva reserva: ${reserva.codigo}`,
    htmlBody: `
      <div style="font-family:Arial,sans-serif;max-width:500px;padding:20px;">
        <h2 style="color:#D4738C;">Nueva reserva recibida</h2>
        <div style="background:#FDF6EC;padding:20px;border-radius:12px">
          <p><strong>Código:</strong> ${reserva.codigo}</p>
          <p><strong>Nombre:</strong> ${reserva.nombre}</p>
          <p><strong>Teléfono:</strong> ${reserva.telefono}</p>
          <p><strong>Email:</strong> ${reserva.email}</p>
          <p><strong>Fecha:</strong> ${reserva.fecha}</p>
          <p><strong>Hora:</strong> ${reserva.hora}</p>
          <p><strong>Personas:</strong> ${reserva.personas}</p>
          ${reserva.notas ? `<p><strong>Notas:</strong> ${reserva.notas}</p>` : ''}
        </div>
        <p style="font-size:11px;color:#777;margin-top:12px">
          <a href="https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}">Abrir Google Sheet</a>
        </p>
      </div>
    `
  });
}

function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = 'RES-';
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

function obtenerHoja(nombre) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
}

function obtenerOCrearHoja(nombre, headers) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(nombre);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#D4738C')
      .setFontColor('#ffffff');
  }
  return sheet;
}

function respuestaOK(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function respuestaError(mensaje, codigo = 400) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'error', message: mensaje, code: codigo }))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizarHeader(header) {
  return String(header)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseFechaLocal(value) {
  const parts = String(value).split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function fechaISO(date) {
  return Utilities.formatDate(date, 'America/Mexico_City', 'yyyy-MM-dd');
}

function normalizarFechaValor(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return fechaISO(value);
  }
  return String(value).substring(0, 10);
}

function testCompleto() {
  Logger.log('=== TEST DEL SISTEMA ===');
  Logger.log(JSON.stringify(getStats()));
  Logger.log(JSON.stringify(validarDatosReserva({
    nombre: 'Test',
    telefono: '1234567890',
    fecha: fechaISO(new Date()),
    hora: '19:00',
    personas: 2
  })));
  Logger.log('Tests completados');
}
