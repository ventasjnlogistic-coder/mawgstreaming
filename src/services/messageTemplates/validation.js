const DEFAULT_MESSAGE_TEMPLATES = [
  {
    id: "entrega",
    nombre: "Entrega",
    asunto: "Datos de acceso",
    contenido:
      ":estrella: Hola {{cliente_nombre}}, tu servicio {{producto_nombre}} esta listo.\n\n{{datos_entrega}}\n\n:calendario: Vence: {{vencimiento_formateado}}",
    estado: "activo",
    orden: 1,
  },
  {
    id: "renovacion",
    nombre: "Renovacion",
    asunto: "Renovacion de servicio",
    contenido:
      ":estrella: Hola {{cliente_nombre}}, tu servicio {{producto_nombre}} esta por vencer el {{vencimiento_formateado}}.\n\n:alerta: Puedes renovar por {{monto}}.",
    estado: "activo",
    orden: 2,
  },
  {
    id: "corte_servicio",
    nombre: "Corte de servicio",
    asunto: "Servicio cortado",
    contenido:
      ":alerta: Hola {{cliente_nombre}}, tu servicio {{producto_nombre}} ha sido cortado por falta de pago.\n\nPedido: {{pedido_id}}\nVencimiento: {{vencimiento_formateado}}\n\n:estrella: Para reactivarlo, por favor realiza el pago de {{monto}}.",
    estado: "activo",
    orden: 3,
  },
  {
    id: "actualizacion_datos",
    nombre: "Actualizacion de datos",
    asunto: "Actualizacion de credenciales",
    contenido:
      ":alerta::megafono: MAWG Streaming te informa: :check::pin_marcador:\n\n:check: ACTUALIZACION DE DATOS :check: | {{producto_nombre}}\n\n:laptop: CORREO: {{cuenta_usuario}}\n:candado: CONTRASENA: {{cuenta_clave}}\n\n:perfil_hombre: PERFIL: {{perfil_nombre}}\n:pin_personal: PIN: {{pin}}\n:calendario: FECHA DE RENOVACION: {{vencimiento_formateado}}",
    estado: "activo",
    orden: 4,
  },
  {
    id: "confirmacion_pago",
    nombre: "Confirmacion de pago",
    asunto: "Pago confirmado",
    contenido: "Hola {{cliente_nombre}}, confirmamos el pago de {{producto_nombre}}. Estamos preparando la entrega.",
    estado: "activo",
    orden: 5,
  },
  {
    id: "reclamo",
    nombre: "Reclamo proveedor",
    asunto: "Revision de cuenta",
    contenido: "Hola {{proveedor}}, necesitamos revisar la cuenta {{cuenta_usuario}} del producto {{producto_nombre}}.",
    estado: "activo",
    orden: 6,
  },
];

function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeMessageTemplate(template = {}) {
  const nombre = String(template.nombre || template.name || "").trim();
  const id = String(template.id || slugify(nombre)).trim();
  const orden = Number(template.orden);

  return {
    id,
    nombre,
    asunto: String(template.asunto || "").trim(),
    contenido: String(template.contenido || template.mensaje || "").trim(),
    estado: template.estado === "inactivo" ? "inactivo" : "activo",
    orden: Number.isFinite(orden) ? orden : 999,
  };
}

function validateMessageTemplate(template) {
  if (!template.id) {
    return "El ID de la plantilla es obligatorio.";
  }

  if (!template.nombre) {
    return "El nombre de la plantilla es obligatorio.";
  }

  if (!template.contenido) {
    return "El contenido de la plantilla es obligatorio.";
  }

  return "";
}

function getDefaultMessageTemplates() {
  return DEFAULT_MESSAGE_TEMPLATES.map(normalizeMessageTemplate);
}

module.exports = {
  DEFAULT_MESSAGE_TEMPLATES,
  getDefaultMessageTemplates,
  normalizeMessageTemplate,
  validateMessageTemplate,
};
