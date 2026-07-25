const DEFAULT_ORDER = {
  pedido_id: "",
  producto_id: "",
  producto_nombre: "",
  producto_precio: "",
  plantilla_entrega: "",
  metodo_pago: "",
  cliente_nombre: "",
  cliente_contacto: "",
  comprobante_url: "",
  comprobante_referencia: "",
  comprobante_notas: "",
  estado: "pendiente de pago",
  inventario_id: "",
  proveedor: "",
  costo_proveedor: "",
  fecha_entrega: "",
  fecha_vencimiento_cliente: "",
  datos_entrega: "",
  asignaciones_inventario: [],
  canal_venta: "web",
  creado_en: "",
  actualizado_en: "",
};

const VALID_STATUSES = [
  "pendiente de pago",
  "comprobante recibido",
  "pagado",
  "entregado",
  "cancelado",
];

function generateOrderId(date = new Date()) {
  const timestamp = date
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PED-${timestamp}-${suffix}`;
}

function normalizeOrder(order = {}) {
  const now = new Date().toISOString();
  const estado = VALID_STATUSES.includes(order.estado) ? order.estado : DEFAULT_ORDER.estado;
  const asignaciones_inventario = normalizeInventoryAssignments(order.asignaciones_inventario, order);

  return {
    ...DEFAULT_ORDER,
    ...order,
    pedido_id: String(order.pedido_id || generateOrderId()).trim(),
    producto_id: String(order.producto_id || "").trim(),
    producto_nombre: String(order.producto_nombre || "").trim(),
    producto_precio: order.producto_precio ?? "",
    plantilla_entrega: String(order.plantilla_entrega || "").trim(),
    metodo_pago: String(order.metodo_pago || "").trim(),
    cliente_nombre: String(order.cliente_nombre || "").trim(),
    cliente_contacto: String(order.cliente_contacto || "").trim(),
    comprobante_url: String(order.comprobante_url || "").trim(),
    comprobante_referencia: String(order.comprobante_referencia || "").trim(),
    comprobante_notas: String(order.comprobante_notas || "").trim(),
    estado,
    inventario_id: String(order.inventario_id || "").trim(),
    proveedor: String(order.proveedor || "").trim(),
    costo_proveedor: order.costo_proveedor ?? "",
    fecha_entrega: String(order.fecha_entrega || "").trim(),
    fecha_vencimiento_cliente: String(order.fecha_vencimiento_cliente || "").trim(),
    datos_entrega: String(order.datos_entrega || "").trim(),
    asignaciones_inventario,
    canal_venta: String(order.canal_venta || "web").trim(),
    creado_en: order.creado_en || now,
    actualizado_en: order.actualizado_en || now,
  };
}

function normalizeInventoryAssignments(value, order = {}) {
  let entries = value;

  if (typeof entries === "string") {
    try {
      entries = JSON.parse(entries);
    } catch {
      entries = entries
        .split(",")
        .map((inventario_id) => ({ inventario_id: inventario_id.trim() }))
        .filter((entry) => entry.inventario_id);
    }
  }

  if (!Array.isArray(entries)) {
    entries = [];
  }

  if (entries.length === 0 && order.inventario_id) {
    entries = [{ inventario_id: order.inventario_id }];
  }

  return entries
    .map((entry, index) => ({
      componente_id: String(entry.componente_id || entry.component_id || entry.id || (index === 0 ? "principal" : `componente-${index + 1}`)).trim(),
      componente_nombre: String(entry.componente_nombre || entry.component_name || entry.nombre || entry.producto_nombre || "").trim(),
      producto_id: String(entry.producto_id || "").trim(),
      inventario_id: String(entry.inventario_id || entry.inventory_id || "").trim(),
      proveedor: String(entry.proveedor || "").trim(),
      costo_proveedor: entry.costo_proveedor ?? "",
      precio_lista: entry.precio_lista ?? "",
      precio_venta: entry.precio_venta ?? "",
      margen_estimado: entry.margen_estimado ?? "",
      fecha_entrega: String(entry.fecha_entrega || "").trim(),
      fecha_vencimiento_cliente: String(entry.fecha_vencimiento_cliente || "").trim(),
      datos_entrega: String(entry.datos_entrega || "").trim(),
      cuenta_usuario: String(entry.cuenta_usuario || "").trim(),
      cuenta_clave: String(entry.cuenta_clave ?? "").trim(),
      url_producto: String(entry.url_producto || "").trim(),
      link_bot: String(entry.link_bot || "").trim(),
      usuario_bot: String(entry.usuario_bot ?? "").trim(),
      contrasena_bot: String(entry.contrasena_bot ?? "").trim(),
      notas_entrega: String(entry.notas_entrega || "").trim(),
    }))
    .filter((entry) => entry.inventario_id || entry.componente_nombre || entry.producto_id);
}

function validateOrder(order) {
  if (!order.pedido_id) {
    return "El pedido_id es obligatorio.";
  }

  if (!order.producto_id && !order.producto_nombre) {
    return "El producto es obligatorio.";
  }

  return "";
}

function validateProof(order) {
  if (!order.cliente_nombre) {
    return "Ingresa tu nombre.";
  }

  if (!order.cliente_contacto) {
    return "Ingresa tu WhatsApp o correo.";
  }

  if (!order.comprobante_url && !order.comprobante_referencia && !order.comprobante_notas && !order.comprobante_archivo) {
    return "Adjunta el archivo del comprobante o agrega un detalle del pago.";
  }

  return "";
}

module.exports = {
  DEFAULT_ORDER,
  VALID_STATUSES,
  generateOrderId,
  normalizeOrder,
  normalizeInventoryAssignments,
  validateOrder,
  validateProof,
};
