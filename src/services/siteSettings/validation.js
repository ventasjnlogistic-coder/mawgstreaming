const DEFAULT_SITE_SETTINGS = [
  {
    id: "ventas_whatsapp",
    nombre: "WhatsApp ventas",
    valor: "51921217484",
    tipo: "telefono",
    estado: "activo",
    orden: 1,
  },
  {
    id: "ventas_mensaje",
    nombre: "Mensaje ventas",
    valor: "Hola, quiero consultar productos disponibles",
    tipo: "texto",
    estado: "activo",
    orden: 2,
  },
  {
    id: "soporte_whatsapp",
    nombre: "WhatsApp soporte",
    valor: "51921217484",
    tipo: "telefono",
    estado: "activo",
    orden: 3,
  },
  {
    id: "soporte_mensaje",
    nombre: "Mensaje soporte",
    valor: "Hola, necesito soporte con mi cuenta",
    tipo: "texto",
    estado: "activo",
    orden: 4,
  },
  {
    id: "horario_titulo",
    nombre: "Titulo horario",
    valor: "Horario de atencion",
    tipo: "texto",
    estado: "activo",
    orden: 5,
  },
  {
    id: "horario_linea_1",
    nombre: "Horario linea 1",
    valor: "Lunes a sabado: 9:00 a.m. - 10:00 p.m.",
    tipo: "texto",
    estado: "activo",
    orden: 6,
  },
  {
    id: "horario_linea_1_nombre",
    nombre: "Nombre horario linea 1",
    valor: "Atencion",
    tipo: "texto",
    estado: "activo",
    orden: 7,
  },
  {
    id: "horario_linea_2",
    nombre: "Horario linea 2",
    valor: "Domingos y feriados: atencion por disponibilidad",
    tipo: "texto",
    estado: "activo",
    orden: 8,
  },
  {
    id: "horario_linea_2_nombre",
    nombre: "Nombre horario linea 2",
    valor: "Especial",
    tipo: "texto",
    estado: "activo",
    orden: 9,
  },
  {
    id: "horario_nota",
    nombre: "Nota de horario",
    valor: "Los pedidos y renovaciones se atienden por orden de llegada.",
    tipo: "texto",
    estado: "activo",
    orden: 10,
  },
  {
    id: "horario_nota_nombre",
    nombre: "Nombre nota horario",
    valor: "Nota",
    tipo: "texto",
    estado: "activo",
    orden: 11,
  },
];

function normalizeSiteSetting(setting = {}) {
  const orden = Number(setting.orden);

  return {
    id: String(setting.id || "").trim(),
    nombre: String(setting.nombre || "").trim(),
    valor: String(setting.valor || "").trim(),
    tipo: String(setting.tipo || "texto").trim(),
    estado: setting.estado === "inactivo" ? "inactivo" : "activo",
    orden: Number.isFinite(orden) ? orden : 999,
  };
}

function getDefaultSiteSettings() {
  return DEFAULT_SITE_SETTINGS.map(normalizeSiteSetting);
}

function validateSiteSetting(setting) {
  if (!setting.id) {
    return "El ID de configuracion es obligatorio.";
  }

  if (!setting.nombre) {
    return "El nombre de configuracion es obligatorio.";
  }

  return "";
}

module.exports = {
  DEFAULT_SITE_SETTINGS,
  getDefaultSiteSettings,
  normalizeSiteSetting,
  validateSiteSetting,
};
