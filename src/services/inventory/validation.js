const DEFAULT_INVENTORY_ITEM = {
  inventario_id: "",
  compra_id: "",
  producto_id: "",
  producto_nombre: "",
  proveedor: "",
  celular_proveedor: "",
  costo_proveedor: "",
  precio_venta_sugerido: "",
  referencia_compra: "",
  cuenta_usuario: "",
  cuenta_clave: "",
  perfil_nombre: "",
  pin: "",
  estado: "disponible",
  estado_control: "",
  pedido_id: "",
  cliente_nombre: "",
  cliente_contacto: "",
  fecha_compra: "",
  fecha_vencimiento_proveedor: "",
  fecha_entrega: "",
  fecha_vencimiento_cliente: "",
  notas: "",
  creado_en: "",
  actualizado_en: "",
};

const INVENTORY_STATUSES = ["pendiente_revision", "disponible", "ocupado", "reservado", "por_vencer", "vencido", "reclamo", "baja"];

function generateInventoryId(date = new Date()) {
  const timestamp = date
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${timestamp}-${suffix}`;
}

function normalizeInventoryItem(item = {}) {
  const now = new Date().toISOString();
  const estado = INVENTORY_STATUSES.includes(item.estado) ? item.estado : DEFAULT_INVENTORY_ITEM.estado;

  return {
    ...DEFAULT_INVENTORY_ITEM,
    ...item,
    inventario_id: String(item.inventario_id || generateInventoryId()).trim(),
    compra_id: String(item.compra_id || "").trim(),
    producto_id: String(item.producto_id || "").trim(),
    producto_nombre: String(item.producto_nombre || "").trim(),
    proveedor: String(item.proveedor || "").trim(),
    celular_proveedor: String(item.celular_proveedor || "").trim(),
    costo_proveedor: item.costo_proveedor ?? "",
    precio_venta_sugerido: item.precio_venta_sugerido ?? "",
    referencia_compra: String(item.referencia_compra || "").trim(),
    cuenta_usuario: String(item.cuenta_usuario || "").trim(),
    cuenta_clave: String(item.cuenta_clave || "").trim(),
    perfil_nombre: String(item.perfil_nombre || "").trim(),
    pin: String(item.pin || "").trim(),
    estado,
    estado_control: String(item.estado_control || "").trim(),
    pedido_id: String(item.pedido_id || "").trim(),
    cliente_nombre: String(item.cliente_nombre || "").trim(),
    cliente_contacto: String(item.cliente_contacto || "").trim(),
    fecha_compra: String(item.fecha_compra || "").trim(),
    fecha_vencimiento_proveedor: String(item.fecha_vencimiento_proveedor || "").trim(),
    fecha_entrega: String(item.fecha_entrega || "").trim(),
    fecha_vencimiento_cliente: String(item.fecha_vencimiento_cliente || "").trim(),
    notas: String(item.notas || "").trim(),
    creado_en: item.creado_en || now,
    actualizado_en: item.actualizado_en || now,
  };
}

function validateInventoryItem(item) {
  if (!item.inventario_id) {
    return "El inventario_id es obligatorio.";
  }

  if (!item.producto_id && !item.producto_nombre) {
    return "El producto del inventario es obligatorio.";
  }

  if (!item.proveedor) {
    return "El proveedor es obligatorio.";
  }

  if (!INVENTORY_STATUSES.includes(item.estado)) {
    return "Estado de inventario no soportado.";
  }

  return "";
}

module.exports = {
  DEFAULT_INVENTORY_ITEM,
  INVENTORY_STATUSES,
  generateInventoryId,
  normalizeInventoryItem,
  validateInventoryItem,
};
