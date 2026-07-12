const RENEWAL_STATUSES = ["pendiente_aviso", "avisado", "comprobante_recibido", "pagado", "renovado", "vencido", "cancelado"];

const DEFAULT_RENEWAL = {
  renovacion_id: "",
  pedido_id: "",
  inventario_id: "",
  cliente_nombre: "",
  cliente_contacto: "",
  producto_nombre: "",
  monto: "",
  metodo_pago: "",
  comprobante_url: "",
  comprobante_referencia: "",
  comprobante_notas: "",
  estado: "pendiente_aviso",
  fecha_aviso: "",
  fecha_pago: "",
  fecha_confirmacion: "",
  vencimiento_anterior: "",
  vencimiento_nuevo: "",
  notas: "",
  creado_en: "",
  actualizado_en: "",
};

function generateRenewalId(date = new Date()) {
  const timestamp = date.toISOString().replace(/\D/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `REN-${timestamp}-${suffix}`;
}

function normalizeRenewal(renewal = {}) {
  const now = new Date().toISOString();
  const monto = renewal.monto === "" || renewal.monto === undefined || renewal.monto === null ? "" : Number(renewal.monto);
  const estado = RENEWAL_STATUSES.includes(renewal.estado) ? renewal.estado : DEFAULT_RENEWAL.estado;

  return {
    ...DEFAULT_RENEWAL,
    ...renewal,
    renovacion_id: String(renewal.renovacion_id || generateRenewalId()).trim(),
    pedido_id: String(renewal.pedido_id || "").trim(),
    inventario_id: String(renewal.inventario_id || "").trim(),
    cliente_nombre: String(renewal.cliente_nombre || "").trim(),
    cliente_contacto: String(renewal.cliente_contacto || "").trim(),
    producto_nombre: String(renewal.producto_nombre || "").trim(),
    monto: Number.isFinite(monto) ? monto : "",
    metodo_pago: String(renewal.metodo_pago || "").trim(),
    comprobante_url: String(renewal.comprobante_url || "").trim(),
    comprobante_referencia: String(renewal.comprobante_referencia || "").trim(),
    comprobante_notas: String(renewal.comprobante_notas || "").trim(),
    estado,
    fecha_aviso: String(renewal.fecha_aviso || "").trim(),
    fecha_pago: String(renewal.fecha_pago || "").trim(),
    fecha_confirmacion: String(renewal.fecha_confirmacion || "").trim(),
    vencimiento_anterior: String(renewal.vencimiento_anterior || "").trim(),
    vencimiento_nuevo: String(renewal.vencimiento_nuevo || "").trim(),
    notas: String(renewal.notas || "").trim(),
    creado_en: renewal.creado_en || now,
    actualizado_en: renewal.actualizado_en || now,
  };
}

function validateRenewal(renewal) {
  if (!renewal.renovacion_id) {
    return "El renovacion_id es obligatorio.";
  }

  if (!renewal.inventario_id) {
    return "Selecciona la cuenta de inventario.";
  }

  if (!RENEWAL_STATUSES.includes(renewal.estado)) {
    return "Estado de renovacion no soportado.";
  }

  return "";
}

function validateRenewalConfirmation(renewal) {
  if (!renewal.vencimiento_nuevo) {
    return "Indica el nuevo vencimiento.";
  }

  if (!renewal.comprobante_url && !renewal.comprobante_referencia && !renewal.comprobante_notas) {
    return "Registra un comprobante, referencia o nota de pago.";
  }

  return "";
}

module.exports = {
  DEFAULT_RENEWAL,
  RENEWAL_STATUSES,
  generateRenewalId,
  normalizeRenewal,
  validateRenewal,
  validateRenewalConfirmation,
};
