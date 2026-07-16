const PROVIDER_STATUSES = ["activo", "observado", "inactivo"];
const PURCHASE_STATUSES = ["pendiente", "pagado", "recibido", "parcial", "cancelado"];

const DEFAULT_PROVIDER = {
  proveedor_id: "",
  nombre: "",
  contacto: "",
  producto_principal: "",
  costo_referencial: "",
  estado: "activo",
  notas: "",
  creado_en: "",
  actualizado_en: "",
};

const DEFAULT_PROVIDER_PURCHASE = {
  compra_id: "",
  proveedor_id: "",
  proveedor_nombre: "",
  producto_id: "",
  producto_nombre: "",
  cantidad: "",
  costo_total: "",
  costo_unitario: "",
  cuenta_usuario: "",
  cuenta_clave: "",
  url_producto: "",
  metodo_pago: "",
  referencia_pago: "",
  fecha_compra: "",
  fecha_vencimiento_proveedor: "",
  estado: "pendiente",
  notas: "",
  creado_en: "",
  actualizado_en: "",
};

function generateProviderId(date = new Date()) {
  const timestamp = date.toISOString().replace(/\D/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PROV-${timestamp}-${suffix}`;
}

function generateProviderPurchaseId(date = new Date()) {
  const timestamp = date.toISOString().replace(/\D/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CPR-${timestamp}-${suffix}`;
}

function normalizeAmount(value) {
  const number = Number(value);
  return value === "" || value === undefined || value === null || !Number.isFinite(number) ? "" : number;
}

function normalizeProvider(provider = {}) {
  const now = new Date().toISOString();
  const estado = PROVIDER_STATUSES.includes(provider.estado) ? provider.estado : DEFAULT_PROVIDER.estado;

  return {
    ...DEFAULT_PROVIDER,
    ...provider,
    proveedor_id: String(provider.proveedor_id || generateProviderId()).trim(),
    nombre: String(provider.nombre || "").trim(),
    contacto: String(provider.contacto || "").trim(),
    producto_principal: String(provider.producto_principal || "").trim(),
    costo_referencial: normalizeAmount(provider.costo_referencial),
    estado,
    notas: String(provider.notas || "").trim(),
    creado_en: provider.creado_en || now,
    actualizado_en: provider.actualizado_en || now,
  };
}

function normalizeProviderPurchase(purchase = {}) {
  const now = new Date().toISOString();
  const estado = PURCHASE_STATUSES.includes(purchase.estado) ? purchase.estado : DEFAULT_PROVIDER_PURCHASE.estado;
  const cantidad = normalizeAmount(purchase.cantidad);
  const costoTotal = normalizeAmount(purchase.costo_total);
  const costoUnitario = normalizeAmount(purchase.costo_unitario);

  return {
    ...DEFAULT_PROVIDER_PURCHASE,
    ...purchase,
    compra_id: String(purchase.compra_id || generateProviderPurchaseId()).trim(),
    proveedor_id: String(purchase.proveedor_id || "").trim(),
    proveedor_nombre: String(purchase.proveedor_nombre || "").trim(),
    producto_id: String(purchase.producto_id || "").trim(),
    producto_nombre: String(purchase.producto_nombre || "").trim(),
    cantidad,
    costo_total: costoTotal,
    costo_unitario: costoUnitario,
    cuenta_usuario: String(purchase.cuenta_usuario || "").trim(),
    cuenta_clave: String(purchase.cuenta_clave || "").trim(),
    url_producto: String(purchase.url_producto || "").trim(),
    metodo_pago: String(purchase.metodo_pago || "").trim(),
    referencia_pago: String(purchase.referencia_pago || "").trim(),
    fecha_compra: String(purchase.fecha_compra || "").trim(),
    fecha_vencimiento_proveedor: String(purchase.fecha_vencimiento_proveedor || "").trim(),
    estado,
    notas: String(purchase.notas || "").trim(),
    creado_en: purchase.creado_en || now,
    actualizado_en: purchase.actualizado_en || now,
  };
}

function validateProvider(provider) {
  if (!provider.proveedor_id) {
    return "El proveedor_id es obligatorio.";
  }

  if (!provider.nombre) {
    return "El nombre del proveedor es obligatorio.";
  }

  if (!PROVIDER_STATUSES.includes(provider.estado)) {
    return "Estado de proveedor no soportado.";
  }

  return "";
}

function validateProviderPurchase(purchase) {
  if (!purchase.compra_id) {
    return "El compra_id es obligatorio.";
  }

  if (!purchase.proveedor_id && !purchase.proveedor_nombre) {
    return "Selecciona o ingresa el proveedor.";
  }

  if (!purchase.producto_id && !purchase.producto_nombre) {
    return "Selecciona o ingresa el producto comprado.";
  }

  if (!PURCHASE_STATUSES.includes(purchase.estado)) {
    return "Estado de compra proveedor no soportado.";
  }

  return "";
}

module.exports = {
  DEFAULT_PROVIDER,
  DEFAULT_PROVIDER_PURCHASE,
  PROVIDER_STATUSES,
  PURCHASE_STATUSES,
  generateProviderId,
  generateProviderPurchaseId,
  normalizeProvider,
  normalizeProviderPurchase,
  validateProvider,
  validateProviderPurchase,
};
