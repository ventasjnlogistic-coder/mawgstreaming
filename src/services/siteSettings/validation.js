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
  {
    id: "hero_showcase_label",
    nombre: "Vista previa etiqueta",
    valor: "Stock actualizado",
    tipo: "texto",
    estado: "activo",
    orden: 12,
  },
  {
    id: "hero_showcase_title",
    nombre: "Vista previa titulo",
    valor: "Compra directa",
    tipo: "texto",
    estado: "activo",
    orden: 13,
  },
  {
    id: "hero_showcase_status",
    nombre: "Vista previa estado",
    valor: "Disponible",
    tipo: "texto",
    estado: "activo",
    orden: 14,
  },
  ...[1, 2, 3, 4].flatMap((index) => {
    const defaults = [
      ["Streaming", "Netflix Perfil", "Entrega inmediata"],
      ["Cuenta", "Disney Premium", "Acceso activo"],
      ["Combo", "Netflix + Disney", "Precio especial"],
      ["Curso", "Ventas Digitales", "Acceso digital"],
    ][index - 1];

    return [
      {
        id: `hero_card_${index}_categoria`,
        nombre: `Cuadrante ${index} categoria`,
        valor: defaults[0],
        tipo: "texto",
        estado: "activo",
        orden: 14 + index * 4 - 3,
      },
      {
        id: `hero_card_${index}_titulo`,
        nombre: `Cuadrante ${index} titulo`,
        valor: defaults[1],
        tipo: "texto",
        estado: "activo",
        orden: 14 + index * 4 - 2,
      },
      {
        id: `hero_card_${index}_texto`,
        nombre: `Cuadrante ${index} texto`,
        valor: defaults[2],
        tipo: "texto",
        estado: "activo",
        orden: 14 + index * 4 - 1,
      },
      {
        id: `hero_card_${index}_imagen`,
        nombre: `Cuadrante ${index} imagen`,
        valor: "",
        tipo: "imagen",
        estado: "activo",
        orden: 14 + index * 4,
      },
    ];
  }),
  {
    id: "categorias_label",
    nombre: "Categorias etiqueta",
    valor: "Categorias",
    tipo: "texto",
    estado: "activo",
    orden: 31,
  },
  {
    id: "categorias_titulo",
    nombre: "Categorias titulo",
    valor: "Explora productos listos para compra en pocos pasos.",
    tipo: "texto",
    estado: "activo",
    orden: 32,
  },
  {
    id: "categorias_texto",
    nombre: "Categorias texto",
    valor: "Revisa disponibilidad, compara precios y compra sin perder tiempo entre mensajes.",
    tipo: "texto",
    estado: "activo",
    orden: 33,
  },
  ...[1, 2, 3].flatMap((index) => {
    const defaults = [
      ["TV", "Cuentas de streaming", "Perfiles y cuentas completas para peliculas, series y deportes.", "Comprar ahora"],
      ["ED", "Cursos digitales", "Accesos educativos, herramientas y capacitaciones con entrega digital.", "Ver opciones"],
      ["PK", "Combos especiales", "Paquetes con varios servicios agrupados en una sola compra.", "Cotizar combo"],
    ][index - 1];

    return [
      {
        id: `categoria_card_${index}_icono`,
        nombre: `Categoria ${index} icono`,
        valor: defaults[0],
        tipo: "texto",
        estado: "activo",
        orden: 33 + index * 6 - 5,
      },
      {
        id: `categoria_card_${index}_titulo`,
        nombre: `Categoria ${index} titulo`,
        valor: defaults[1],
        tipo: "texto",
        estado: "activo",
        orden: 33 + index * 6 - 4,
      },
      {
        id: `categoria_card_${index}_texto`,
        nombre: `Categoria ${index} texto`,
        valor: defaults[2],
        tipo: "texto",
        estado: "activo",
        orden: 33 + index * 6 - 3,
      },
      {
        id: `categoria_card_${index}_cta`,
        nombre: `Categoria ${index} boton`,
        valor: defaults[3],
        tipo: "texto",
        estado: "activo",
        orden: 33 + index * 6 - 2,
      },
      {
        id: `categoria_card_${index}_link`,
        nombre: `Categoria ${index} enlace`,
        valor: "#pedido",
        tipo: "texto",
        estado: "activo",
        orden: 33 + index * 6 - 1,
      },
      {
        id: `categoria_card_${index}_imagen`,
        nombre: `Categoria ${index} imagen`,
        valor: "",
        tipo: "imagen",
        estado: "activo",
        orden: 33 + index * 6,
      },
    ];
  }),
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
