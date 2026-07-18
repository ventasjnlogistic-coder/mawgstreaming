const defaultDeliveryTemplate = [
  ":estrella: *MAWG Streaming te da la bienvenida*",
  "",
  ":tv: *Producto:* {{producto_nombre}}",
  "",
  ":correo: *Correo:* {{cuenta_usuario}}",
  ":llave: *Clave:* {{cuenta_clave}}",
  ":link: *URL producto:* {{url_producto}}",
  "",
  ":perfil: *Perfil:* {{perfil_nombre}}",
  ":candado: *PIN:* {{pin}}",
  ":calendario: *Fecha de renovacion:* {{fecha_vencimiento_cliente}}",
  "",
  ":alerta: *IMPORTANTE:*",
  "- Usar solo en un dispositivo.",
  "- No cambiar la clave ni el metodo de facturacion.",
  "- Si no cumple, la garantia expirara sin reclamo.",
  "",
  "Gracias :check:",
].join("\n");

const whatsappEmojiMap = {
  ":estrella:": String.fromCodePoint(0x2b50),
  ":tv:": String.fromCodePoint(0x1f4fa),
  ":correo:": String.fromCodePoint(0x1f4e7),
  ":llave:": String.fromCodePoint(0x1f511),
  ":perfil:": String.fromCodePoint(0x1f464),
  ":candado:": String.fromCodePoint(0x1f510),
  ":link:": String.fromCodePoint(0x1f517),
  ":calendario:": String.fromCodePoint(0x1f5d3, 0xfe0f),
  ":alerta:": String.fromCodePoint(0x26a0, 0xfe0f),
  ":megafono:": String.fromCodePoint(0x1f4e2),
  ":pin_marcador:": String.fromCodePoint(0x1f4cc),
  ":laptop:": String.fromCodePoint(0x1f4bb),
  ":perfil_hombre:": String.fromCodePoint(0x1f9d4),
  ":pin_personal:": String.fromCodePoint(0x1fac6),
  ":check:": String.fromCodePoint(0x2705),
};

const defaultProduct = {
  id: "",
  nombre: "",
  tipo: "",
  precio: "",
  descripcion: "",
  plantilla_entrega: defaultDeliveryTemplate,
  imagen: "",
  estado: "disponible",
  vender: "no",
  categoria: "",
  badge: "",
  cta: "Comprar",
  orden: 999,
  componentes: [],
};

const defaultInventoryItem = {
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
  url_producto: "",
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

const defaultProvider = {
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

const defaultProviderPurchase = {
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

const defaultRenewal = {
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

const defaultMessageTemplate = {
  id: "",
  nombre: "",
  asunto: "",
  contenido: "",
  estado: "activo",
  orden: 999,
};

const productList = document.querySelector("#adminProductList");
const productForm = document.querySelector("#productForm");
const productCount = document.querySelector("#productCount");
const dirtyState = document.querySelector("#dirtyState");
const formTitle = document.querySelector("#formTitle");
const jsonOutput = document.querySelector("#jsonOutput");
const adminStatus = document.querySelector("#adminStatus");
const productPreview = document.querySelector("#productPreview");
const searchProducts = document.querySelector("#searchProducts");
const deleteModal = document.querySelector("#deleteModal");
const confirmDeleteCheck = document.querySelector("#confirmDeleteCheck");
const confirmDeleteButton = document.querySelector("#confirmDeleteButton");
const deleteMessage = document.querySelector("#deleteMessage");
const logoutButton = document.querySelector("#logoutButton");
const orderList = document.querySelector("#adminOrderList");
const orderCount = document.querySelector("#orderCount");
const manualSaleForm = document.querySelector("#manualSaleForm");
const manualSaleProductSelect = document.querySelector("#manualSaleProductSelect");
const manualSalePaymentMethodSelect = document.querySelector("#manualSalePaymentMethodSelect");
const searchOrders = document.querySelector("#searchOrders");
const orderStatusFilter = document.querySelector("#orderStatusFilter");
const orderChannelFilter = document.querySelector("#orderChannelFilter");
const orderStartDate = document.querySelector("#orderStartDate");
const orderEndDate = document.querySelector("#orderEndDate");
const clearOrderFiltersButton = document.querySelector("#clearOrderFiltersButton");
const loadDashboardButton = document.querySelector("#loadDashboardButton");
const loadReportsButton = document.querySelector("#loadReportsButton");
const loadOrdersButton = document.querySelector("#loadOrdersButton");
const loadInventoryButton = document.querySelector("#loadInventoryButton");
const loadSuppliersButton = document.querySelector("#loadSuppliersButton");
const loadRenewalsButton = document.querySelector("#loadRenewalsButton");
const loadTemplatesButton = document.querySelector("#loadTemplatesButton");
const loadAuditButton = document.querySelector("#loadAuditButton");
const inventoryList = document.querySelector("#adminInventoryList");
const inventoryForm = document.querySelector("#inventoryForm");
const inventoryCount = document.querySelector("#inventoryCount");
const inventoryFormTitle = document.querySelector("#inventoryFormTitle");
const inventoryProductSelect = document.querySelector("#inventoryProductSelect");
const searchInventory = document.querySelector("#searchInventory");
const inventoryStatusFilter = document.querySelector("#inventoryStatusFilter");
const newInventoryButton = document.querySelector("#newInventoryButton");
const renewInventoryButton = document.querySelector("#renewInventoryButton");
const notifyRenewalButton = document.querySelector("#notifyRenewalButton");
const cutServiceButton = document.querySelector("#cutServiceButton");
const dataUpdateButton = document.querySelector("#dataUpdateButton");
const releaseInventoryButton = document.querySelector("#releaseInventoryButton");
const toggleInventoryPasswordButton = document.querySelector("#toggleInventoryPassword");
const providerList = document.querySelector("#adminProviderList");
const providerForm = document.querySelector("#providerForm");
const providerCount = document.querySelector("#providerCount");
const providerFormTitle = document.querySelector("#providerFormTitle");
const searchProviders = document.querySelector("#searchProviders");
const newProviderButton = document.querySelector("#newProviderButton");
const providerPurchaseList = document.querySelector("#adminProviderPurchaseList");
const providerPurchaseForm = document.querySelector("#providerPurchaseForm");
const providerPurchaseFormTitle = document.querySelector("#providerPurchaseFormTitle");
const providerPurchaseCount = document.querySelector("#providerPurchaseCount");
const providerPurchaseSummary = document.querySelector("#providerPurchaseSummary");
const newProviderPurchaseButton = document.querySelector("#newProviderPurchaseButton");
const providerPurchaseProviderSelect = document.querySelector("#providerPurchaseProviderSelect");
const providerPurchaseProductSelect = document.querySelector("#providerPurchaseProductSelect");
const searchProviderPurchases = document.querySelector("#searchProviderPurchases");
const providerPurchaseStatusFilter = document.querySelector("#providerPurchaseStatusFilter");
const providerPurchaseInventoryFilter = document.querySelector("#providerPurchaseInventoryFilter");
const providerPurchaseStatusButtons = document.querySelectorAll("[data-provider-purchase-status]");
const renewalList = document.querySelector("#adminRenewalList");
const renewalCount = document.querySelector("#renewalCount");
const renewalDueList = document.querySelector("#renewalDueList");
const renewalEditor = document.querySelector("#renewalEditor");
const searchRenewals = document.querySelector("#searchRenewals");
const renewalStatusFilter = document.querySelector("#renewalStatusFilter");
const auditList = document.querySelector("#adminAuditList");
const auditCount = document.querySelector("#auditCount");
const templateList = document.querySelector("#adminTemplateList");
const templateCount = document.querySelector("#templateCount");
const templateForm = document.querySelector("#templateForm");
const templateFormTitle = document.querySelector("#templateFormTitle");
const adminViews = document.querySelectorAll("[data-admin-view]");
const adminViewLinks = document.querySelectorAll("[data-admin-target]");
const adminViewActions = document.querySelectorAll("[data-admin-action]");
const adminViewTitle = document.querySelector("#adminViewTitle");
const adminViewDescription = document.querySelector("#adminViewDescription");
const sessionUserBadge = document.querySelector("#sessionUserBadge");
const dashboardSummary = document.querySelector("#dashboardSummary");
const dashboardPriorityList = document.querySelector("#dashboardPriorityList");
const dashboardStockList = document.querySelector("#dashboardStockList");
const dashboardAlertsList = document.querySelector("#dashboardAlertsList");
const dashboardUpdated = document.querySelector("#dashboardUpdated");
const reportsSummary = document.querySelector("#reportsSummary");
const reportsUpdated = document.querySelector("#reportsUpdated");
const reportPeriodFilter = document.querySelector("#reportPeriodFilter");
const reportStartDate = document.querySelector("#reportStartDate");
const reportEndDate = document.querySelector("#reportEndDate");
const reportProviderFilter = document.querySelector("#reportProviderFilter");
const reportChannelFilter = document.querySelector("#reportChannelFilter");
const clearReportFiltersButton = document.querySelector("#clearReportFiltersButton");
const reportProductRows = document.querySelector("#reportProductRows");
const reportChannelRows = document.querySelector("#reportChannelRows");
const reportProviderRows = document.querySelector("#reportProviderRows");
const reportRenewalRows = document.querySelector("#reportRenewalRows");
const reportInventoryRows = document.querySelector("#reportInventoryRows");

let products = [];
let orders = [];
let inventoryItems = [];
let providers = [];
let providerPurchases = [];
let renewals = [];
let paymentMethods = [];
let auditEvents = [];
let messageTemplates = [];
let sessionUser = null;
let selectedId = "";
let selectedInventoryId = "";
let selectedProviderId = "";
let selectedProviderPurchaseId = "";
let selectedRenewalId = "";
let selectedTemplateId = "";
let hasChanges = false;
const orderStatuses = ["pendiente de pago", "comprobante recibido", "pagado", "entregado", "cancelado"];
const renewalStatuses = ["pendiente_aviso", "avisado", "comprobante_recibido", "pagado", "renovado", "vencido", "cancelado"];
const adminViewCopy = {
  dashboard: {
    title: "Dashboard",
    description: "Vista rapida de pedidos, inventario, renovaciones, compras proveedor y margen estimado.",
  },
  reportes: {
    title: "Reportes",
    description: "Analiza ingresos, costos y margen estimado por producto, proveedor, canal y renovaciones.",
  },
  compras: {
    title: "Compras",
    description: "Revisa comprobantes, confirma pagos y entrega cuentas disponibles segun la compra del cliente.",
  },
  productos: {
    title: "Productos",
    description: "Mantiene el catalogo publico, precios, estados, imagenes y componentes para combos.",
  },
  inventario: {
    title: "Inventario",
    description: "Administra cuentas reales, proveedor, costo, credenciales, estado y vencimientos.",
  },
  proveedores: {
    title: "Proveedores",
    description: "Controla proveedores, costos referenciales y compras realizadas para alimentar tu inventario.",
  },
  renovaciones: {
    title: "Renovaciones",
    description: "Controla avisos, comprobantes y pagos recurrentes para extender la vigencia de cuentas ocupadas.",
  },
  plantillas: {
    title: "Plantillas",
    description: "Administra textos de entrega, renovacion, confirmacion de pago y reclamos sin tocar codigo.",
  },
  auditoria: {
    title: "Auditoria",
    description: "Revisa cambios recientes en pedidos, inventario, renovaciones, proveedores y compras de proveedor.",
  },
  exportar: {
    title: "Exportar",
    description: "Revisa la vista previa y exporta el respaldo JSON del catalogo cuando trabajes localmente.",
  },
};
const adminViewPermissions = {
  dashboard: "",
  reportes: "reportes",
  compras: "compras",
  productos: "productos",
  inventario: "inventario",
  proveedores: "proveedores",
  renovaciones: "renovaciones",
  plantillas: "plantillas",
  auditoria: "auditoria",
  exportar: "productos",
};

function getSessionPermissions() {
  const permissions = sessionUser?.permisos;

  if (Array.isArray(permissions)) {
    return permissions;
  }

  return String(permissions || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function userCan(permission) {
  if (!permission || !sessionUser) {
    return true;
  }

  const permissions = getSessionPermissions();
  return permissions.includes("*") || permissions.includes(permission);
}

function userCanView(viewName) {
  return userCan(adminViewPermissions[viewName] || "");
}

function getAllowedAdminView(viewName) {
  if (adminViewCopy[viewName] && userCanView(viewName)) {
    return viewName;
  }

  return Object.keys(adminViewCopy).find((name) => userCanView(name)) || "dashboard";
}

function setAdminView(viewName, updateHash = true) {
  const nextView = getAllowedAdminView(viewName);

  adminViews.forEach((view) => {
    view.hidden = view.dataset.adminView !== nextView;
  });

  adminViewLinks.forEach((link) => {
    const isAllowed = userCanView(link.dataset.adminTarget);
    link.hidden = !isAllowed;
    const isActive = link.dataset.adminTarget === nextView;
    link.classList.toggle("is-active", isActive);
    link.setAttribute("aria-current", isActive ? "page" : "false");
  });

  adminViewActions.forEach((action) => {
    action.hidden = action.dataset.adminAction !== nextView || !userCanView(action.dataset.adminAction);
  });

  if (adminViewTitle) {
    adminViewTitle.textContent = adminViewCopy[nextView].title;
  }

  if (adminViewDescription) {
    adminViewDescription.textContent = adminViewCopy[nextView].description;
  }

  if (updateHash && window.location.hash !== `#${nextView}`) {
    history.replaceState(null, "", `#${nextView}`);
  }
}

function getInitialAdminView() {
  const hashView = window.location.hash.replace("#", "");
  return getAllowedAdminView(hashView);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRichText(value) {
  const escaped = escapeHtml(String(value ?? "").replace(/\r\n/g, "\n"));

  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(?!\s)([^*\n]+?)(?<!\s)\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getDriveFileId(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue || !/drive\.google\.com|docs\.google\.com/.test(rawValue)) {
    return "";
  }

  const patterns = [
    /\/file\/d\/([^/]+)/,
    /\/uc\?[^#]*\bid=([^&#]+)/,
    /[?&]id=([^&#]+)/,
    /\/open\?[^#]*\bid=([^&#]+)/,
  ];

  for (const pattern of patterns) {
    const match = rawValue.match(pattern);
    if (match?.[1]) {
      return decodeURIComponent(match[1]).trim();
    }
  }

  return "";
}

function normalizeProductImage(value) {
  const image = String(value || "").trim();
  const driveFileId = getDriveFileId(image);

  if (!driveFileId) {
    return image;
  }

  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveFileId)}&sz=w1200`;
}

function normalizeProduct(product = {}) {
  return {
    ...defaultProduct,
    ...product,
    precio: product.precio ?? "",
    imagen: normalizeProductImage(product.imagen),
    estado: product.estado || "disponible",
    vender: String(product.vender || "no").trim().toLowerCase() === "si" ? "si" : "no",
    cta: product.cta || "Comprar",
    orden: Number.isFinite(Number(product.orden)) ? Number(product.orden) : 999,
    plantilla_entrega: String(product.plantilla_entrega || defaultDeliveryTemplate).trim(),
    componentes: normalizeProductComponents(product.componentes),
  };
}

function sortProductsForDisplay(items = []) {
  return [...items].sort((left, right) => {
    const leftOrder = Number.isFinite(Number(left.orden)) ? Number(left.orden) : 999;
    const rightOrder = Number.isFinite(Number(right.orden)) ? Number(right.orden) : 999;
    return leftOrder - rightOrder || String(left.nombre || "").localeCompare(String(right.nombre || ""));
  });
}

function normalizeProductComponents(value) {
  if (!value) {
    return [];
  }

  let entries = value;
  if (typeof value === "string") {
    try {
      entries = JSON.parse(value);
    } catch {
      entries = value
        .split(/\r?\n|,/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }

  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry, index) => {
      if (typeof entry === "string") {
        const nombre = entry.trim();
        return {
          id: slugify(nombre) || `componente-${index + 1}`,
          nombre,
          producto_id: slugify(nombre),
        };
      }

      const nombre = String(entry.nombre || entry.componente_nombre || entry.producto_nombre || entry.producto_id || entry.id || "").trim();
      const productoId = String(entry.producto_id || entry.id || slugify(nombre)).trim();

      return {
        id: String(entry.id || productoId || `componente-${index + 1}`).trim(),
        nombre,
        producto_id: productoId,
      };
    })
    .filter((entry) => entry.nombre || entry.producto_id);
}

function componentsToText(components) {
  return normalizeProductComponents(components)
    .map((component) => `${component.producto_id || component.id} | ${component.nombre || component.producto_id}`)
    .join("\n");
}

function parseComponentsText(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line, index) => {
      const parts = line
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean);

      if (parts.length === 0) {
        return null;
      }

      const productoId = parts[0];
      const nombre = parts[1] || parts[0];

      return {
        id: productoId || `componente-${index + 1}`,
        producto_id: productoId,
        nombre,
      };
    })
    .filter(Boolean);
}

function normalizeOrderAssignments(value) {
  let entries = value;
  if (typeof entries === "string") {
    try {
      entries = JSON.parse(entries);
    } catch {
      entries = [];
    }
  }

  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry, index) => ({
      componente_id: String(entry.componente_id || entry.id || `componente-${index + 1}`).trim(),
      componente_nombre: String(entry.componente_nombre || entry.nombre || entry.producto_nombre || "").trim(),
      producto_id: String(entry.producto_id || "").trim(),
      inventario_id: String(entry.inventario_id || "").trim(),
      proveedor: String(entry.proveedor || "").trim(),
      costo_proveedor: entry.costo_proveedor ?? "",
      precio_lista: entry.precio_lista ?? "",
      precio_venta: entry.precio_venta ?? "",
      margen_estimado: entry.margen_estimado ?? "",
      fecha_entrega: String(entry.fecha_entrega || "").trim(),
      fecha_vencimiento_cliente: String(entry.fecha_vencimiento_cliente || "").trim(),
      datos_entrega: String(entry.datos_entrega || "").trim(),
      cuenta_usuario: String(entry.cuenta_usuario || "").trim(),
      cuenta_clave: String(entry.cuenta_clave || "").trim(),
      url_producto: String(entry.url_producto || "").trim(),
      notas_entrega: String(entry.notas_entrega || "").trim(),
    }))
    .filter((entry) => entry.inventario_id || entry.componente_nombre || entry.producto_id);
}

function normalizeInventoryItem(item = {}) {
  return {
    ...defaultInventoryItem,
    ...item,
    costo_proveedor: item.costo_proveedor ?? "",
    precio_venta_sugerido: item.precio_venta_sugerido ?? "",
    inventario_id: String(item.inventario_id || "").trim(),
    compra_id: String(item.compra_id || "").trim(),
    producto_id: String(item.producto_id || "").trim(),
    producto_nombre: String(item.producto_nombre || "").trim(),
    proveedor: String(item.proveedor || "").trim(),
    celular_proveedor: String(item.celular_proveedor || "").trim(),
    referencia_compra: String(item.referencia_compra || "").trim(),
    url_producto: String(item.url_producto || "").trim(),
    estado_control: String(item.estado_control || "").trim(),
    fecha_vencimiento_proveedor: String(item.fecha_vencimiento_proveedor || "").trim(),
    estado: String(item.estado || "disponible").trim().toLowerCase(),
  };
}

function normalizeProvider(provider = {}) {
  return {
    ...defaultProvider,
    ...provider,
    proveedor_id: String(provider.proveedor_id || "").trim(),
    nombre: String(provider.nombre || "").trim(),
    contacto: String(provider.contacto || "").trim(),
    producto_principal: String(provider.producto_principal || "").trim(),
    costo_referencial: provider.costo_referencial ?? "",
    estado: provider.estado || "activo",
    notas: String(provider.notas || "").trim(),
  };
}

function normalizeProviderPurchase(purchase = {}) {
  return {
    ...defaultProviderPurchase,
    ...purchase,
    compra_id: String(purchase.compra_id || "").trim(),
    proveedor_id: String(purchase.proveedor_id || "").trim(),
    proveedor_nombre: String(purchase.proveedor_nombre || "").trim(),
    producto_id: String(purchase.producto_id || "").trim(),
    producto_nombre: String(purchase.producto_nombre || "").trim(),
    cantidad: purchase.cantidad ?? "",
    costo_total: purchase.costo_total ?? "",
    costo_unitario: purchase.costo_unitario ?? "",
    cuenta_usuario: String(purchase.cuenta_usuario || "").trim(),
    cuenta_clave: String(purchase.cuenta_clave || "").trim(),
    url_producto: String(purchase.url_producto || "").trim(),
    estado: purchase.estado || "pendiente",
  };
}

function normalizeRenewal(renewal = {}) {
  return {
    ...defaultRenewal,
    ...renewal,
    renovacion_id: String(renewal.renovacion_id || "").trim(),
    inventario_id: String(renewal.inventario_id || "").trim(),
    pedido_id: String(renewal.pedido_id || "").trim(),
    estado: renewalStatuses.includes(renewal.estado) ? renewal.estado : defaultRenewal.estado,
  };
}

function normalizePaymentMethod(method = {}) {
  return {
    id: String(method.id || "").trim(),
    nombre: String(method.nombre || method.id || "").trim(),
    estado: method.estado || "activo",
  };
}

function normalizeMessageTemplate(template = {}) {
  return {
    ...defaultMessageTemplate,
    ...template,
    id: String(template.id || "").trim(),
    nombre: String(template.nombre || "").trim(),
    asunto: String(template.asunto || "").trim(),
    contenido: String(template.contenido || "").trim(),
    estado: template.estado === "inactivo" ? "inactivo" : "activo",
    orden: Number.isFinite(Number(template.orden)) ? Number(template.orden) : 999,
  };
}

async function apiRequest(url, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 401) {
    window.location.href = "/login.html";
    throw new Error("Sesion requerida");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "No se pudo completar la operacion.");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function setStatus(message, isError = false) {
  if (!adminStatus) {
    return;
  }

  adminStatus.textContent = message;
  adminStatus.classList.toggle("is-error", isError);
}

async function loadAdminSession() {
  try {
    const session = await apiRequest("/api/admin/session");
    sessionUser = session.user || null;
    if (sessionUserBadge && sessionUser) {
      sessionUserBadge.textContent = `${sessionUser.nombre || sessionUser.usuario || "Usuario"} | ${sessionUser.rol || "admin"}`;
    }
    setAdminView(getInitialAdminView(), false);
  } catch {
    sessionUser = null;
  }
}

function getJsonText() {
  return JSON.stringify(products, null, 2);
}

function markChanged(changed = true) {
  hasChanges = changed;
  if (dirtyState) {
    dirtyState.textContent = hasChanges ? "Cambios pendientes" : "Sin cambios";
  }
}

function formatPrice(price) {
  if (price === "" || price === null || price === undefined) {
    return "Consultar";
  }

  return typeof price === "number" ? `S/ ${price}` : String(price);
}

function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("es-PE");
}

function formatShortDate(value) {
  if (!value) {
    return "";
  }

  const date = String(value).match(/^\d{4}-\d{2}-\d{2}/)
    ? new Date(`${String(value).slice(0, 10)}T00:00:00`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function formatLocalDateInput(date) {
  const safeDate = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(safeDate.getTime())) {
    return "";
  }

  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultDateInput(daysToAdd = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return formatLocalDateInput(date);
}

function addDaysToDateInput(value, daysToAdd = 0) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setDate(date.getDate() + daysToAdd);
  return formatLocalDateInput(date);
}

function getDefaultClientExpirationDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return formatDateInput(date);
}

function getDateOnly(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).slice(0, 10);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function daysUntil(value) {
  const date = getDateOnly(value);

  if (!date) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function getExpirationStatus(value) {
  const days = daysUntil(value);

  if (days === null) {
    return { label: "Sin vencimiento", level: "muted", isSoon: false };
  }

  if (days < 0) {
    return { label: `Vencido hace ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}`, level: "danger", isSoon: true };
  }

  if (days === 0) {
    return { label: "Vence hoy", level: "danger", isSoon: true };
  }

  if (days <= 3) {
    return { label: `Vence en ${days} dias`, level: "danger", isSoon: true };
  }

  if (days <= 7) {
    return { label: `Vence en ${days} dias`, level: "warning", isSoon: true };
  }

  return { label: `Vence en ${days} dias`, level: "ok", isSoon: false };
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.length === 9 && digits.startsWith("9")) {
    return `51${digits}`;
  }

  return digits;
}

function renderWhatsAppEmojis(message) {
  return Object.entries(whatsappEmojiMap).reduce(
    (currentMessage, [shortcode, emoji]) => currentMessage.replaceAll(shortcode, emoji),
    String(message || "")
  );
}

function getActiveMessageTemplate(templateId) {
  const targetId = String(templateId || "").trim();

  if (!targetId) {
    return null;
  }

  return messageTemplates.find(
    (template) => String(template.id || "").trim() === targetId && String(template.estado || "").trim().toLowerCase() !== "inactivo"
  ) || null;
}

function buildWhatsAppUrl(contact, message) {
  const phone = normalizePhone(contact);

  if (!phone) {
    return "";
  }

  const params = new URLSearchParams({
    phone,
    text: renderWhatsAppEmojis(message),
  });

  return `https://api.whatsapp.com/send?${params.toString()}`;
}

function sumMoney(values) {
  return values.reduce((total, value) => {
    const number = Number(value);
    return Number.isFinite(number) ? total + number : total;
  }, 0);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatReportMoney(value) {
  return `S/ ${toNumber(value).toFixed(2)}`;
}

function isCurrentMonth(value) {
  const date = getDateOnly(value);

  if (!date) {
    return false;
  }

  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
}

function getDashboardMetrics() {
  const pendingProof = orders.filter((order) => order.estado === "comprobante recibido").length;
  const paidPendingDelivery = orders.filter((order) => order.estado === "pagado").length;
  const availableInventory = inventoryItems.filter((item) => item.estado === "disponible").length;
  const occupiedInventory = inventoryItems.filter((item) => item.estado === "ocupado").length;
  const clientDueSoon = inventoryItems.filter((item) => item.estado === "ocupado" && getExpirationStatus(item.fecha_vencimiento_cliente).isSoon).length;
  const providerDueSoon = inventoryItems.filter((item) => getExpirationStatus(item.fecha_vencimiento_proveedor).isSoon).length;
  const pendingRenewals = renewals.filter((renewal) => !["renovado", "cancelado"].includes(renewal.estado)).length;
  const providerPaidNotReceived = providerPurchases.filter((purchase) => purchase.estado === "pagado").length;
  const providerMissing = providerPurchases.filter((purchase) => getProviderPurchaseMetrics(purchase).missing > 0).length;
  const deliveredThisMonth = orders.filter((order) => order.estado === "entregado" && isCurrentMonth(order.fecha_entrega || order.actualizado_en));
  const salesThisMonth = sumMoney(deliveredThisMonth.map((order) => order.producto_precio));
  const costThisMonth = sumMoney(deliveredThisMonth.map((order) => order.costo_proveedor));
  const marginThisMonth = salesThisMonth - costThisMonth;

  return {
    pendingProof,
    paidPendingDelivery,
    availableInventory,
    occupiedInventory,
    clientDueSoon,
    providerDueSoon,
    pendingRenewals,
    providerPaidNotReceived,
    providerMissing,
    salesThisMonth,
    costThisMonth,
    marginThisMonth,
  };
}

function renderDashboardCard({ label, value, hint, target, tone = "neutral" }) {
  return `
    <button class="dashboard-card is-${escapeHtml(tone)}" type="button" data-dashboard-target="${escapeHtml(target || "")}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(hint || "")}</small>
    </button>
  `;
}

function renderDashboard() {
  const metrics = getDashboardMetrics();

  if (dashboardUpdated) {
    dashboardUpdated.textContent = `Actualizado ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`;
  }

  if (dashboardSummary) {
    dashboardSummary.innerHTML = [
      renderDashboardCard({ label: "Pagos por revisar", value: metrics.pendingProof, hint: "Comprobantes recibidos", target: "compras", tone: metrics.pendingProof ? "warning" : "ok" }),
      renderDashboardCard({ label: "Por entregar", value: metrics.paidPendingDelivery, hint: "Pedidos pagados", target: "compras", tone: metrics.paidPendingDelivery ? "danger" : "ok" }),
      renderDashboardCard({ label: "Stock disponible", value: metrics.availableInventory, hint: "Cuentas listas", target: "inventario", tone: metrics.availableInventory ? "ok" : "warning" }),
      renderDashboardCard({ label: "Clientes por vencer", value: metrics.clientDueSoon, hint: "Ocupadas con alerta", target: "renovaciones", tone: metrics.clientDueSoon ? "danger" : "ok" }),
      renderDashboardCard({ label: "Proveedor por vencer", value: metrics.providerDueSoon, hint: "Cuentas con alerta", target: "inventario", tone: metrics.providerDueSoon ? "warning" : "ok" }),
      renderDashboardCard({ label: "Renovaciones", value: metrics.pendingRenewals, hint: "Pendientes de cierre", target: "renovaciones", tone: metrics.pendingRenewals ? "warning" : "ok" }),
      renderDashboardCard({ label: "Compras sin recibir", value: metrics.providerPaidNotReceived, hint: "Proveedor pagado", target: "proveedores", tone: metrics.providerPaidNotReceived ? "warning" : "ok" }),
      renderDashboardCard({ label: "Margen mes", value: formatPrice(metrics.marginThisMonth), hint: `Ventas ${formatPrice(metrics.salesThisMonth)} | Costos ${formatPrice(metrics.costThisMonth)}`, target: "compras", tone: metrics.marginThisMonth >= 0 ? "ok" : "danger" }),
    ].join("");
  }

  if (dashboardPriorityList) {
    const priorities = [
      { label: "Revisar comprobantes", value: metrics.pendingProof, target: "compras" },
      { label: "Entregar pedidos pagados", value: metrics.paidPendingDelivery, target: "compras" },
      { label: "Avisar vencimientos cliente", value: metrics.clientDueSoon, target: "renovaciones" },
      { label: "Revisar vencimientos proveedor", value: metrics.providerDueSoon, target: "inventario" },
      { label: "Recibir compras proveedor", value: metrics.providerPaidNotReceived, target: "proveedores" },
      { label: "Completar lotes con faltantes", value: metrics.providerMissing, target: "proveedores" },
    ].filter((item) => item.value > 0);

    dashboardPriorityList.innerHTML = priorities.length
      ? priorities
          .map(
            (item) => `
              <button class="dashboard-row" type="button" data-dashboard-target="${escapeHtml(item.target)}">
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(item.value)}</strong>
              </button>
            `
          )
          .join("")
      : '<p class="catalog-message">No hay prioridades criticas en este momento.</p>';
  }

  if (dashboardStockList) {
    const stockRows = products
      .map((product) => ({
        product,
        count: inventoryItems.filter((item) => item.estado === "disponible" && productValueMatches(item.producto_id || item.producto_nombre, product.id || product.nombre)).length,
      }))
      .sort((left, right) => right.count - left.count || String(left.product.nombre).localeCompare(String(right.product.nombre)))
      .slice(0, 8);

    dashboardStockList.innerHTML = stockRows.length
      ? stockRows
          .map(
            ({ product, count }) => `
              <button class="dashboard-row" type="button" data-dashboard-target="inventario">
                <span>${escapeHtml(product.nombre || product.id)}</span>
                <strong>${escapeHtml(count)}</strong>
              </button>
            `
          )
          .join("")
      : '<p class="catalog-message">Aun no hay productos o inventario para resumir.</p>';
  }

  if (dashboardAlertsList) {
    const alerts = [
      ...orders
        .filter((order) => order.estado === "comprobante recibido")
        .slice(0, 4)
        .map((order) => ({
          label: `Validar pago ${order.pedido_id}`,
          detail: `${order.cliente_nombre || "Cliente"} | ${order.producto_nombre || "Producto"}`,
          target: "compras",
        })),
      ...orders
        .filter((order) => order.estado === "pagado")
        .slice(0, 4)
        .map((order) => ({
          label: `Entregar ${order.pedido_id}`,
          detail: `${order.producto_nombre || "Producto"} | ${formatPrice(order.producto_precio)}`,
          target: "compras",
        })),
      ...inventoryItems
        .filter((item) => item.estado === "ocupado" && getExpirationStatus(item.fecha_vencimiento_cliente).isSoon)
        .slice(0, 4)
        .map((item) => ({
          label: `Cliente por vencer`,
          detail: `${item.cliente_nombre || item.cliente_contacto || item.pedido_id || "Cliente"} | ${item.producto_nombre || item.producto_id}`,
          target: "renovaciones",
        })),
      ...providerPurchases
        .filter((purchase) => purchase.estado === "pagado")
        .slice(0, 4)
        .map((purchase) => ({
          label: `Compra proveedor sin recibir`,
          detail: `${purchase.compra_id} | ${purchase.proveedor_nombre || "Proveedor"}`,
          target: "proveedores",
        })),
      ...products
        .filter((product) => inventoryItems.filter((item) => item.estado === "disponible" && productValueMatches(item.producto_id || item.producto_nombre, product.id || product.nombre)).length === 0)
        .slice(0, 4)
        .map((product) => ({
          label: `Stock bajo`,
          detail: product.nombre || product.id,
          target: "inventario",
        })),
    ].slice(0, 10);

    dashboardAlertsList.innerHTML = alerts.length
      ? alerts
          .map(
            (alert) => `
              <button class="dashboard-row" type="button" data-dashboard-target="${escapeHtml(alert.target)}">
                <span>${escapeHtml(alert.label)}<small>${escapeHtml(alert.detail)}</small></span>
                <strong>!</strong>
              </button>
            `
          )
          .join("")
      : '<p class="catalog-message">No hay alertas operativas en este momento.</p>';
  }
}

function getReportRows() {
  const sales = [];
  const renewalSales = [];
  const unsoldInventory = [];

  orders
    .map(normalizeInventoryOrder)
    .filter((order) => order.estado === "entregado")
    .forEach((order) => {
      const assignments = normalizeOrderAssignments(order.asignaciones_inventario);
      const date = order.fecha_entrega || order.actualizado_en || order.creado_en;
      const channel = order.canal_venta || "web";

      if (assignments.length > 0) {
        assignments.forEach((assignment) => {
          const inventory = inventoryItems.find((item) => item.inventario_id === assignment.inventario_id);
          const revenue = toNumber(assignment.precio_venta);
          const cost = toNumber(assignment.costo_proveedor !== "" ? assignment.costo_proveedor : inventory?.costo_proveedor);
          const margin = assignment.margen_estimado !== "" ? toNumber(assignment.margen_estimado) : revenue - cost;

          sales.push({
            type: "venta",
            date,
            channel,
            product: assignment.componente_nombre || inventory?.producto_nombre || assignment.producto_id || order.producto_nombre || "Producto",
            provider: assignment.proveedor || inventory?.proveedor || order.proveedor || "Sin proveedor",
            revenue,
            cost,
            margin,
          });
        });
        return;
      }

      const revenue = toNumber(order.producto_precio);
      const cost = toNumber(order.costo_proveedor);
      sales.push({
        type: "venta",
        date,
        channel,
        product: order.producto_nombre || order.producto_id || "Producto",
        provider: order.proveedor || "Sin proveedor",
        revenue,
        cost,
        margin: revenue - cost,
      });
    });

  renewals
    .map(normalizeRenewal)
    .filter((renewal) => ["pagado", "renovado"].includes(renewal.estado))
    .forEach((renewal) => {
      const inventory = inventoryItems.find((item) => item.inventario_id === renewal.inventario_id);
      const revenue = toNumber(renewal.monto);
      const cost = toNumber(inventory?.costo_proveedor);

      renewalSales.push({
        type: "renovacion",
        date: renewal.fecha_confirmacion || renewal.fecha_pago || renewal.actualizado_en || renewal.creado_en,
        channel: "renovacion",
        product: renewal.producto_nombre || inventory?.producto_nombre || "Renovacion",
        provider: inventory?.proveedor || "Sin proveedor",
        revenue,
        cost,
        margin: revenue - cost,
      });
    });

  inventoryItems.map(normalizeInventoryItem).filter(isUnsoldInventoryItem).forEach((item) => {
    const product = products.find((entry) => productValueMatches(entry.id || entry.nombre, item.producto_id || item.producto_nombre));
    const cost = toNumber(item.costo_proveedor);
    const potentialRevenue = toNumber(item.precio_venta_sugerido !== "" ? item.precio_venta_sugerido : product?.precio);

    unsoldInventory.push({
      type: "inventario",
      date: item.fecha_compra || item.creado_en,
      channel: "stock",
      product: item.producto_nombre || product?.nombre || item.producto_id || "Producto",
      provider: item.proveedor || "Sin proveedor",
      revenue: potentialRevenue,
      cost,
      margin: potentialRevenue - cost,
      status: item.estado || "disponible",
    });
  });

  return { sales, renewalSales, unsoldInventory, all: [...sales, ...renewalSales] };
}

function isUnsoldInventoryItem(item) {
  const status = String(item.estado || "").toLowerCase();

  if (item.pedido_id || status === "ocupado" || status === "baja") {
    return false;
  }

  return true;
}

function groupReportRows(rows, keyGetter) {
  return rows.reduce((groups, row) => {
    const key = keyGetter(row) || "Sin dato";
    const current = groups.get(key) || { label: key, count: 0, revenue: 0, cost: 0, margin: 0 };
    current.count += 1;
    current.revenue += row.revenue;
    current.cost += row.cost;
    current.margin += row.margin;
    groups.set(key, current);
    return groups;
  }, new Map());
}

function sortReportGroups(groups) {
  return [...groups.values()].sort((left, right) => right.margin - left.margin || right.revenue - left.revenue || left.label.localeCompare(right.label));
}

function getMonthDateRange(offset = 0) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}

function getReportFilters() {
  const period = reportPeriodFilter?.value || "current-month";
  let range = null;

  if (period === "current-month") {
    range = getMonthDateRange(0);
  } else if (period === "last-month") {
    range = getMonthDateRange(-1);
  } else if (period === "custom") {
    range = {
      start: getDateOnly(reportStartDate?.value),
      end: getDateOnly(reportEndDate?.value),
    };
  }

  return {
    period,
    range,
    provider: reportProviderFilter?.value || "",
    channel: reportChannelFilter?.value || "",
  };
}

function isReportDateInRange(value, range) {
  if (!range || (!range.start && !range.end)) {
    return true;
  }

  const date = getDateOnly(value);

  if (!date) {
    return false;
  }

  if (range.start && date < range.start) {
    return false;
  }

  if (range.end && date > range.end) {
    return false;
  }

  return true;
}

function filterReportMovementRows(rows, filters) {
  return rows.filter((row) => {
    const matchesDate = isReportDateInRange(row.date, filters.range);
    const matchesProvider = !filters.provider || row.provider === filters.provider;
    const matchesChannel = !filters.channel || row.channel === filters.channel;
    return matchesDate && matchesProvider && matchesChannel;
  });
}

function filterReportInventoryRows(rows, filters) {
  return rows.filter((row) => !filters.provider || row.provider === filters.provider);
}

function renderReportFilterOptions(rows) {
  const currentProvider = reportProviderFilter?.value || "";
  const currentChannel = reportChannelFilter?.value || "";
  const providers = [...new Set([...rows.sales, ...rows.renewalSales, ...rows.unsoldInventory].map((row) => row.provider).filter(Boolean))].sort();
  const channels = [...new Set([...rows.sales, ...rows.renewalSales].map((row) => row.channel).filter(Boolean))].sort();

  if (reportProviderFilter) {
    reportProviderFilter.innerHTML = [
      '<option value="">Todos los proveedores</option>',
      ...providers.map((provider) => `<option value="${escapeHtml(provider)}">${escapeHtml(provider)}</option>`),
    ].join("");
    reportProviderFilter.value = providers.includes(currentProvider) ? currentProvider : "";
  }

  if (reportChannelFilter) {
    reportChannelFilter.innerHTML = [
      '<option value="">Todos los canales</option>',
      ...channels.map((channel) => `<option value="${escapeHtml(channel)}">${escapeHtml(channel)}</option>`),
    ].join("");
    reportChannelFilter.value = channels.includes(currentChannel) ? currentChannel : "";
  }
}

function renderReportRows(container, groups, emptyMessage, columns) {
  if (!container) {
    return;
  }

  if (groups.length === 0) {
    container.innerHTML = `<tr><td colspan="${columns}" class="report-empty">${escapeHtml(emptyMessage)}</td></tr>`;
    return;
  }

  container.innerHTML = groups
    .map(
      (group) => `
        <tr>
          <td>${escapeHtml(group.label)}</td>
          <td>${escapeHtml(group.count)}</td>
          <td>${escapeHtml(formatReportMoney(group.revenue))}</td>
          ${columns >= 5 ? `<td>${escapeHtml(formatReportMoney(group.cost))}</td>` : ""}
          <td class="${group.margin < 0 ? "is-negative" : "is-positive"}">${escapeHtml(formatReportMoney(group.margin))}</td>
        </tr>
      `
    )
    .join("");
}

function renderReports() {
  const rows = getReportRows();
  renderReportFilterOptions(rows);
  const filters = getReportFilters();
  const filteredSales = filterReportMovementRows(rows.sales, filters);
  const filteredRenewals = filterReportMovementRows(rows.renewalSales, filters);
  const filteredInventory = filterReportInventoryRows(rows.unsoldInventory, filters);
  const filteredMovements = [...filteredSales, ...filteredRenewals];
  const totalRevenue = sumMoney(filteredMovements.map((row) => row.revenue));
  const totalCost = sumMoney(filteredMovements.map((row) => row.cost));
  const totalMargin = sumMoney(filteredMovements.map((row) => row.margin));
  const unsoldInventoryCost = sumMoney(filteredInventory.map((row) => row.cost));
  const unsoldInventoryPotential = sumMoney(filteredInventory.map((row) => row.revenue));
  const unsoldInventoryMargin = sumMoney(filteredInventory.map((row) => row.margin));
  const realizedHistoricMargin = sumMoney(filteredMovements.map((row) => row.margin));
  const adjustedMargin = realizedHistoricMargin - unsoldInventoryCost;

  if (reportsUpdated) {
    reportsUpdated.textContent = `Actualizado ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`;
  }

  if (reportsSummary) {
    reportsSummary.innerHTML = [
      renderDashboardCard({ label: "Ingresos periodo", value: formatReportMoney(totalRevenue), hint: `${filteredMovements.length} movimientos`, target: "reportes", tone: "ok" }),
      renderDashboardCard({ label: "Costos periodo", value: formatReportMoney(totalCost), hint: "Costo proveedor estimado", target: "reportes", tone: totalCost ? "warning" : "neutral" }),
      renderDashboardCard({ label: "Margen periodo", value: formatReportMoney(totalMargin), hint: "Ventas + renovaciones", target: "reportes", tone: totalMargin >= 0 ? "ok" : "danger" }),
      renderDashboardCard({ label: "Stock no vendido", value: formatReportMoney(unsoldInventoryCost), hint: `${filteredInventory.length} cuentas actuales`, target: "inventario", tone: unsoldInventoryCost ? "warning" : "ok" }),
      renderDashboardCard({ label: "Venta potencial", value: formatReportMoney(unsoldInventoryPotential), hint: `Margen pot. ${formatReportMoney(unsoldInventoryMargin)}`, target: "inventario", tone: "neutral" }),
      renderDashboardCard({ label: "Margen ajustado", value: formatReportMoney(adjustedMargin), hint: "Margen periodo - stock actual", target: "reportes", tone: adjustedMargin >= 0 ? "ok" : "danger" }),
      renderDashboardCard({ label: "Ventas nuevas", value: filteredSales.length, hint: formatReportMoney(sumMoney(filteredSales.map((row) => row.revenue))), target: "compras", tone: "neutral" }),
      renderDashboardCard({ label: "Renovaciones", value: filteredRenewals.length, hint: formatReportMoney(sumMoney(filteredRenewals.map((row) => row.revenue))), target: "renovaciones", tone: "neutral" }),
      renderDashboardCard({ label: "Margen realizado", value: formatReportMoney(realizedHistoricMargin), hint: `${filteredMovements.length} movimientos filtrados`, target: "reportes", tone: "neutral" }),
    ].join("");
  }

  renderReportRows(reportProductRows, sortReportGroups(groupReportRows(filteredSales, (row) => row.product)).slice(0, 12), "No hay ventas entregadas con los filtros actuales.", 5);
  renderReportRows(reportChannelRows, sortReportGroups(groupReportRows(filteredSales, (row) => row.channel)).slice(0, 12), "No hay canales con ventas en los filtros actuales.", 4);
  renderReportRows(reportProviderRows, sortReportGroups(groupReportRows(filteredSales, (row) => row.provider)).slice(0, 12), "No hay proveedores vinculados a ventas con los filtros actuales.", 5);
  renderReportRows(reportRenewalRows, sortReportGroups(groupReportRows(filteredRenewals, (row) => row.product)).slice(0, 12), "No hay renovaciones pagadas o renovadas con los filtros actuales.", 4);
  renderReportRows(reportInventoryRows, sortReportGroups(groupReportRows(filteredInventory, (row) => row.product)).slice(0, 12), "No hay cuentas no vendidas para costear con los filtros actuales.", 5);
}

function refreshOperationalData() {
  return Promise.all([loadProducts(), loadOrders(), loadInventory(), loadSuppliers(), loadRenewals(), loadPaymentMethods(), loadAuditEvents()]).then(() => {
    renderDashboard();
    renderReports();
  });
}

function refreshDashboardData() {
  return refreshOperationalData();
}

function getOrderDeliveryLines(order) {
  const normalizedOrder = normalizeInventoryOrder(order);
  const lines = [];

  normalizedOrder.asignaciones_inventario.forEach((assignment) => {
    const heading = assignment.componente_nombre || assignment.producto_id || "Producto";
    const urlProducto = assignment.url_producto || normalizedOrder.url_producto || "";
    const detailParts = [assignment.datos_entrega, urlProducto ? `URL: ${urlProducto}` : "", assignment.notas_entrega, assignment.inventario_id].filter(Boolean);
    const detail = detailParts.join(" | ");
    lines.push(`${heading}: ${detail}`);
  });

  if (!lines.length && normalizedOrder.datos_entrega) {
    lines.push(normalizedOrder.datos_entrega);
  }

  if (!lines.length && normalizedOrder.inventario_id) {
    lines.push(`Inventario: ${normalizedOrder.inventario_id}`);
  }

  return lines;
}

function getDeliveryTemplateSource(order) {
  const normalizedOrder = normalizeInventoryOrder(order);
  const product = findProductForOrder(normalizedOrder);
  return String(product?.plantilla_entrega || defaultDeliveryTemplate).trim();
}

function findProductForOrder(order) {
  const normalizedOrder = normalizeInventoryOrder(order);
  const targets = [
    normalizedOrder.producto_id,
    normalizedOrder.producto_nombre,
    normalizedOrder.producto_id ? slugify(normalizedOrder.producto_id) : "",
    normalizedOrder.producto_nombre ? slugify(normalizedOrder.producto_nombre) : "",
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return products.find((item) => {
    return targets.some((target) => productValueMatches(item.id, target) || productValueMatches(item.nombre, target));
  });
}

function renderTemplateMessage(template, values = {}) {
  return String(template || "").replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function getDeliveryTemplateValues(order) {
  const normalizedOrder = normalizeInventoryOrder(order);
  const deliveryLines = getOrderDeliveryLines(normalizedOrder);
  const firstAssignment = normalizedOrder.asignaciones_inventario?.[0] || {};
  const firstInventory = findInventoryItemById(firstAssignment.inventario_id || normalizedOrder.inventario_id);
  const resolvedAccount = resolveDeliveryAccount(normalizedOrder, firstAssignment, firstInventory);
  const deliveryData = deliveryLines.join("\n");

  return {
    ...normalizedOrder,
    ...firstAssignment,
    ...resolvedAccount,
    datos_entrega: deliveryData,
    cuenta_usuario: resolvedAccount.cuenta_usuario,
    cuenta_clave: resolvedAccount.cuenta_clave,
    perfil_nombre: resolvedAccount.perfil_nombre,
    pin: resolvedAccount.pin,
    url_producto: resolvedAccount.url_producto,
    fecha_vencimiento_cliente: normalizedOrder.fecha_vencimiento_cliente || firstAssignment.fecha_vencimiento_cliente || "",
    fecha_entrega: normalizedOrder.fecha_entrega || firstAssignment.fecha_entrega || "",
    vencimiento_formateado: normalizedOrder.fecha_vencimiento_cliente ? formatShortDate(normalizedOrder.fecha_vencimiento_cliente) : "",
    entrega_formateada: normalizedOrder.fecha_entrega ? formatShortDate(normalizedOrder.fecha_entrega) : "",
  };
}

function findInventoryItemById(inventoryId) {
  const targetId = String(inventoryId || "").trim();

  if (!targetId) {
    return null;
  }

  return inventoryItems.find((item) => String(item.inventario_id || "").trim() === targetId) || null;
}

function resolveDeliveryAccount(order, assignment = {}, inventoryItem = null) {
  const source = inventoryItem || findInventoryItemById(assignment.inventario_id || order.inventario_id) || {};

  return {
    cuenta_usuario: String(assignment.cuenta_usuario || source.cuenta_usuario || order.cuenta_usuario || "").trim(),
    cuenta_clave: String(assignment.cuenta_clave || source.cuenta_clave || order.cuenta_clave || "").trim(),
    perfil_nombre: String(assignment.perfil_nombre || source.perfil_nombre || order.perfil_nombre || "").trim(),
    pin: String(assignment.pin || source.pin || order.pin || "").trim(),
    url_producto: String(assignment.url_producto || source.url_producto || order.url_producto || "").trim(),
  };
}

function buildDeliveryMessage(order) {
  const normalizedOrder = normalizeInventoryOrder(order);
  const template = getDeliveryTemplateSource(normalizedOrder);

  if (template) {
    return renderTemplateMessage(template, getDeliveryTemplateValues(normalizedOrder)).trim();
  }

  const deliveryLines = getOrderDeliveryLines(normalizedOrder);
  const expiration = formatShortDate(normalizedOrder.fecha_vencimiento_cliente);

  return [
    `Hola ${normalizedOrder.cliente_nombre || ""}`.trim() + ", tu pedido fue entregado.",
    `Pedido: ${normalizedOrder.pedido_id}`,
    `Producto: ${normalizedOrder.producto_nombre || normalizedOrder.producto_id || "Servicio"}`,
    deliveryLines.length ? `Datos de acceso:\n${deliveryLines.join("\n")}` : "",
    normalizedOrder.fecha_vencimiento_cliente ? `Vencimiento: ${expiration}` : "",
    "Por favor conserva estos datos y no cambies la clave ni el metodo de facturacion.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildRenewalMessage(item) {
  const source = resolveRenewalSource(item);
  const expiration = formatShortDate(source.fecha_vencimiento_cliente);
  const template = getActiveMessageTemplate("renovacion");
  const values = {
    ...source,
    fecha_vencimiento_cliente: source.fecha_vencimiento_cliente || "",
    vencimiento_formateado: expiration,
    monto: source.monto || source.precio_venta || source.precio_venta_sugerido || "",
  };

  if (template?.contenido) {
    return renderTemplateMessage(template.contenido, values).trim();
  }

  return [
    `Hola ${source.cliente_nombre || ""}`.trim() + ", te escribimos por tu servicio.",
    `Producto: ${source.producto_nombre || source.producto_id || "Servicio"}`,
    source.pedido_id ? `Pedido: ${source.pedido_id}` : "",
    source.fecha_vencimiento_cliente ? `Vencimiento: ${expiration}` : "",
    "Para mantener el acceso activo, por favor confirma la renovacion o envia tu comprobante de pago.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildServiceCutMessage(item) {
  const source = resolveRenewalSource(item);
  const expiration = formatShortDate(source.fecha_vencimiento_cliente);
  const template = getActiveMessageTemplate("corte_servicio");
  const values = {
    ...source,
    fecha_vencimiento_cliente: source.fecha_vencimiento_cliente || "",
    vencimiento_formateado: expiration,
    monto: source.monto || source.precio_venta || source.precio_venta_sugerido || "",
  };

  if (template?.contenido) {
    return renderTemplateMessage(template.contenido, values).trim();
  }

  return [
    `Hola ${source.cliente_nombre || ""}`.trim() + ", tu servicio ha sido cortado.",
    `Producto: ${source.producto_nombre || source.producto_id || "Servicio"}`,
    source.pedido_id ? `Pedido: ${source.pedido_id}` : "",
    source.fecha_vencimiento_cliente ? `Vencimiento: ${expiration}` : "",
    "Para reactivarlo, por favor realiza el pago pendiente y envianos tu comprobante.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildDataUpdateMessage(item) {
  const source = resolveRenewalSource(item);
  const expiration = formatShortDate(source.fecha_vencimiento_cliente);
  const template = getActiveMessageTemplate("actualizacion_datos");
  const values = {
    ...source,
    fecha_vencimiento_cliente: source.fecha_vencimiento_cliente || "",
    vencimiento_formateado: expiration,
  };

  if (template?.contenido) {
    return renderTemplateMessage(template.contenido, values).trim();
  }

  return [
    ":alerta::megafono: MAWG Streaming te informa: :check::pin_marcador:",
    "",
    `:check: ACTUALIZACION DE DATOS :check: | ${source.producto_nombre || source.producto_id || "Servicio"}`,
    "",
    `:laptop: CORREO: ${source.cuenta_usuario || ""}`,
    `:candado: CONTRASENA: ${source.cuenta_clave || ""}`,
    "",
    `:perfil_hombre: PERFIL: ${source.perfil_nombre || ""}`,
    `:pin_personal: PIN: ${source.pin || ""}`,
    `:calendario: FECHA DE RENOVACION: ${expiration || ""}`,
  ].join("\n");
}

function resolveRenewalSource(item = {}) {
  const normalizedItem = normalizeInventoryItem(item);
  const linkedOrder = normalizedItem.pedido_id ? orders.find((order) => String(order.pedido_id || "").trim() === String(normalizedItem.pedido_id || "").trim()) : null;

  return {
    ...normalizedItem,
    ...(linkedOrder || {}),
    cliente_nombre: String(linkedOrder?.cliente_nombre || normalizedItem.cliente_nombre || "").trim(),
    cliente_contacto: String(linkedOrder?.cliente_contacto || normalizedItem.cliente_contacto || "").trim(),
    fecha_vencimiento_cliente: String(linkedOrder?.fecha_vencimiento_cliente || normalizedItem.fecha_vencimiento_cliente || "").trim(),
    producto_nombre: String(linkedOrder?.producto_nombre || normalizedItem.producto_nombre || "").trim(),
    producto_id: String(linkedOrder?.producto_id || normalizedItem.producto_id || "").trim(),
    pedido_id: String(linkedOrder?.pedido_id || normalizedItem.pedido_id || "").trim(),
    monto: linkedOrder?.producto_precio ?? normalizedItem.monto ?? normalizedItem.precio_venta_sugerido ?? "",
  };
}

function renderNotificationLink(href, label) {
  if (!href) {
    return "";
  }

  return `<a class="button button-secondary compact-button notification-link" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function openWhatsAppLink(href) {
  if (!href) {
    return false;
  }

  const opened = window.open(href, "_blank", "noopener,noreferrer");

  if (!opened) {
    window.location.href = href;
  }

  return true;
}

function renderAssignmentFinancials(assignment) {
  const entries = [
    assignment.precio_lista !== "" ? ["Lista", formatPrice(assignment.precio_lista)] : null,
    assignment.precio_venta !== "" ? ["Venta individual", formatPrice(assignment.precio_venta)] : null,
    assignment.costo_proveedor !== "" ? ["Costo", formatPrice(assignment.costo_proveedor)] : null,
    assignment.margen_estimado !== "" ? ["Margen", formatPrice(assignment.margen_estimado)] : null,
  ].filter(Boolean);

  if (entries.length === 0) {
    return "";
  }

  return `
    <div class="assignment-financials">
      ${entries
        .map(
          ([label, value]) => `
            <span>
              <em>${escapeHtml(label)}</em>
              <strong>${escapeHtml(value)}</strong>
            </span>
          `
        )
        .join("")}
    </div>
  `;
}

function renderInventoryProductOptions() {
  if (!inventoryProductSelect) {
    return;
  }

  const currentValue = inventoryProductSelect.value;
  inventoryProductSelect.innerHTML = [
    '<option value="">Producto no vinculado</option>',
    ...products.map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.nombre || product.id)}</option>`),
  ].join("");
  inventoryProductSelect.value = currentValue;
}

function renderManualSaleProductOptions() {
  if (!manualSaleProductSelect) {
    return;
  }

  const currentValue = manualSaleProductSelect.value;
  manualSaleProductSelect.innerHTML = [
    '<option value="">Selecciona producto</option>',
    ...products.map((product) => `<option value="${escapeHtml(product.id)}" data-price="${escapeHtml(product.precio)}">${escapeHtml(product.nombre || product.id)}</option>`),
  ].join("");
  manualSaleProductSelect.value = currentValue;
}

function renderManualSalePaymentMethodOptions() {
  if (!manualSalePaymentMethodSelect) {
    return;
  }

  const currentValue = manualSalePaymentMethodSelect.value;
  const activeMethods = paymentMethods.filter((method) => method.estado !== "inactivo");
  manualSalePaymentMethodSelect.innerHTML = [
    '<option value="">Selecciona metodo</option>',
    ...activeMethods.map((method) => `<option value="${escapeHtml(method.id)}">${escapeHtml(method.nombre || method.id)}</option>`),
  ].join("");
  manualSalePaymentMethodSelect.value = activeMethods.some((method) => method.id === currentValue) ? currentValue : "";
}

function renderSupplierSelectOptions() {
  if (providerPurchaseProviderSelect) {
    const currentProvider = providerPurchaseProviderSelect.value;
    providerPurchaseProviderSelect.innerHTML = [
      '<option value="">Proveedor no vinculado</option>',
      ...providers.map((provider) => `<option value="${escapeHtml(provider.proveedor_id)}">${escapeHtml(provider.nombre || provider.proveedor_id)}</option>`),
    ].join("");
    providerPurchaseProviderSelect.value = currentProvider;
  }

  if (providerPurchaseProductSelect) {
    const currentProduct = providerPurchaseProductSelect.value;
    providerPurchaseProductSelect.innerHTML = [
      '<option value="">Producto no vinculado</option>',
      ...products.map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.nombre || product.id)}</option>`),
    ].join("");
    providerPurchaseProductSelect.value = currentProduct;
  }
}

function renderProductCard(product) {
  const estado = String(product.estado || "disponible").toLowerCase();
  const venderSinStock = String(product.vender || "").trim().toLowerCase() === "si";
  const disponible = estado === "disponible";
  const imagen = product.imagen
    ? `<img src="${escapeHtml(product.imagen)}" alt="${escapeHtml(product.nombre)}" loading="lazy" />`
    : `<div class="product-placeholder" aria-hidden="true">${escapeHtml(product.tipo || "Producto")}</div>`;

  return `
    <article class="product-card ${disponible ? "" : "is-sold-out"}">
      <div class="product-media">${imagen}</div>
      <div class="product-meta">
        ${product.badge ? `<span class="tag">${escapeHtml(product.badge)}</span>` : ""}
        <span class="status-pill product-status">${disponible ? (venderSinStock ? "Venta activa" : "Disponible") : "Agotado"}</span>
      </div>
      <h3>${escapeHtml(product.nombre || "Producto sin nombre")}</h3>
      <p class="product-type">${escapeHtml(product.categoria || product.tipo || "Producto digital")}</p>
      <p class="product-description">${formatRichText(product.descripcion || "Sin descripcion")}</p>
      <div class="price">${escapeHtml(formatPrice(product.precio))} <span>precio</span></div>
      <button class="button button-primary buy-button" type="button" ${disponible ? "" : "disabled"}>
        ${disponible ? escapeHtml(product.cta || "Comprar") : "Agotado"}
      </button>
    </article>
  `;
}

function getFilteredProducts() {
  const query = (searchProducts?.value || "").toLowerCase().trim();

  if (!query) {
    return products;
  }

  return products.filter((product) =>
    [product.nombre, product.tipo, product.categoria, product.estado, product.badge]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
}

function updateJsonOutput() {
  if (jsonOutput) {
    jsonOutput.value = getJsonText();
  }
}

function updatePreview() {
  if (productPreview) {
    productPreview.innerHTML = renderProductCard(normalizeProduct(getFormProduct()));
  }
}

function renderList() {
  const filtered = sortProductsForDisplay(getFilteredProducts());

  if (productCount) {
    productCount.textContent = `${products.length} ${products.length === 1 ? "item" : "items"}`;
  }

  if (!productList) {
    return;
  }

  if (filtered.length === 0) {
    productList.innerHTML = '<p class="catalog-message">No hay productos para mostrar.</p>';
    return;
  }

  productList.innerHTML = filtered
    .map((product) => {
      const isActive = product.id === selectedId;
      return `
        <button class="admin-product-item ${isActive ? "is-active" : ""}" type="button" data-id="${escapeHtml(product.id)}">
          <span>
            <strong>${escapeHtml(product.nombre || "Sin nombre")}</strong>
            <small>${escapeHtml(product.categoria || product.tipo || "Sin categoria")}</small>
          </span>
          <em>${escapeHtml(product.estado || "disponible")}</em>
        </button>
      `;
    })
    .join("");
}

function fillForm(product) {
  const safeProduct = normalizeProduct(product);
  selectedId = safeProduct.id;
  formTitle.textContent = safeProduct.id ? "Editar producto" : "Nuevo producto";

  Object.entries(defaultProduct).forEach(([key]) => {
    const field = productForm?.elements.namedItem(key);
    if (field) {
      field.value = key === "componentes" ? componentsToText(safeProduct.componentes) : safeProduct[key] ?? "";
    }
  });

  renderList();
  updatePreview();
}

function getFormProduct() {
  const formData = new FormData(productForm);
  const rawProduct = Object.fromEntries(formData.entries());
  rawProduct.componentes = parseComponentsText(rawProduct.componentes);
  rawProduct.imagen = normalizeProductImage(rawProduct.imagen);
  const product = normalizeProduct(rawProduct);
  const numericPrice = Number(product.precio);

  if (product.precio !== "" && Number.isFinite(numericPrice)) {
    product.precio = numericPrice;
  }

  product.id = product.id.trim() || slugify(product.nombre);
  return product;
}

function selectProduct(id) {
  const product = products.find((item) => item.id === id);

  if (product) {
    markChanged(false);
    fillForm(product);
  }
}

async function loadProducts() {
  setStatus("Cargando catalogo...");

  try {
    const data = await apiRequest("/api/admin/productos");
    products = sortProductsForDisplay(data.map(normalizeProduct));
    selectedId = products[0]?.id || "";
    renderInventoryProductOptions();
    renderManualSaleProductOptions();
    renderSupplierSelectOptions();
    if (selectedInventoryId) {
      fillInventoryForm(inventoryItems.find((item) => item.inventario_id === selectedInventoryId) || defaultInventoryItem);
    }
    updateJsonOutput();
    renderList();
    fillForm(products[0] || defaultProduct);
    renderOrders();
    renderDashboard();
    renderReports();
    markChanged(false);
    setStatus("Catalogo cargado.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

function getFilteredInventory() {
  const query = (searchInventory?.value || "").toLowerCase().trim();
  const status = inventoryStatusFilter?.value || "";

  return inventoryItems.filter((item) => {
    const expirationStatus = getExpirationStatus(item.fecha_vencimiento_cliente);
    const matchesStatus = !status || (status === "vence-pronto" ? expirationStatus.isSoon : item.estado === status);
    const matchesQuery =
      !query ||
      [
        item.inventario_id,
        item.compra_id,
        item.producto_id,
        item.producto_nombre,
        item.proveedor,
        item.celular_proveedor,
        item.referencia_compra,
        item.cuenta_usuario,
        item.pedido_id,
        item.cliente_nombre,
        item.cliente_contacto,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

    return matchesStatus && matchesQuery;
  });
}

function renderInventoryList() {
  if (inventoryCount) {
    inventoryCount.textContent = `${inventoryItems.length} ${inventoryItems.length === 1 ? "cuenta" : "cuentas"}`;
  }

  if (!inventoryList) {
    return;
  }

  const filtered = getFilteredInventory();

  if (filtered.length === 0) {
    inventoryList.innerHTML = '<p class="catalog-message">No hay cuentas para mostrar.</p>';
    return;
  }

  inventoryList.innerHTML = filtered
    .map((item) => {
      const isActive = item.inventario_id === selectedInventoryId;
      const expirationStatus = getExpirationStatus(item.fecha_vencimiento_cliente);
      const providerExpirationStatus = getExpirationStatus(item.fecha_vencimiento_proveedor);
      return `
        <button class="admin-product-item ${isActive ? "is-active" : ""}" type="button" data-id="${escapeHtml(item.inventario_id)}">
          <span>
            <strong>${escapeHtml(item.producto_nombre || item.producto_id || "Producto sin nombre")}</strong>
            <small>${escapeHtml(item.inventario_id)} | ${escapeHtml(item.proveedor || "Sin proveedor")}</small>
            ${item.compra_id ? `<small>Compra proveedor: ${escapeHtml(item.compra_id)}</small>` : ""}
            <small>${item.pedido_id ? `Pedido: ${escapeHtml(item.pedido_id)}` : "Sin asignar"} | Vence: ${escapeHtml(formatDate(item.fecha_vencimiento_cliente))}</small>
            <small>Cliente: ${escapeHtml(item.cliente_nombre || "Sin cliente")} | Contacto: ${escapeHtml(item.cliente_contacto || "Sin contacto")}</small>
            <small>
              <span class="expiration-pill is-${escapeHtml(expirationStatus.level)}">Cliente: ${escapeHtml(expirationStatus.label)}</span>
              <span class="expiration-pill is-${escapeHtml(providerExpirationStatus.level)}">Proveedor: ${escapeHtml(providerExpirationStatus.label)}</span>
            </small>
          </span>
          <em>${escapeHtml(item.estado || "disponible")}</em>
        </button>
      `;
    })
    .join("");
}

function fillInventoryForm(item) {
  const isNewItem = !item || !item.inventario_id;
  const safeItem = normalizeInventoryItem(item);

  if (isNewItem) {
    safeItem.fecha_compra = safeItem.fecha_compra || getDefaultDateInput();
    safeItem.fecha_vencimiento_proveedor = safeItem.fecha_vencimiento_proveedor || addDaysToDateInput(safeItem.fecha_compra, 30);
    safeItem.fecha_vencimiento_cliente = safeItem.fecha_vencimiento_cliente || addDaysToDateInput(safeItem.fecha_compra, 30);
  }

  selectedInventoryId = safeItem.inventario_id;

  if (inventoryFormTitle) {
    inventoryFormTitle.textContent = safeItem.inventario_id ? "Editar cuenta" : "Nueva cuenta";
  }

  Object.entries(defaultInventoryItem).forEach(([key]) => {
    const field = inventoryForm?.elements.namedItem(key);
    if (field) {
      field.value = key.startsWith("fecha_") ? formatDateInput(safeItem[key]) : safeItem[key] ?? "";
    }
  });

  renderInventoryList();
}

function getInventoryFormItem() {
  const formData = new FormData(inventoryForm);
  const item = normalizeInventoryItem(Object.fromEntries(formData.entries()));
  const selectedProduct = products.find((product) => product.id === item.producto_id);
  const numericCost = Number(item.costo_proveedor);
  const numericSalePrice = Number(item.precio_venta_sugerido);

  if (item.costo_proveedor !== "" && Number.isFinite(numericCost)) {
    item.costo_proveedor = numericCost;
  }

  if (item.precio_venta_sugerido !== "" && Number.isFinite(numericSalePrice)) {
    item.precio_venta_sugerido = numericSalePrice;
  }

  if (selectedProduct && !item.producto_nombre) {
    item.producto_nombre = selectedProduct.nombre;
  }

  return item;
}

function selectInventoryItem(id) {
  const item = inventoryItems.find((entry) => entry.inventario_id === id);

  if (item) {
    fillInventoryForm(item);
  }
}

async function loadInventory() {
  if (!inventoryList) {
    return;
  }

  inventoryList.innerHTML = '<p class="catalog-message">Cargando inventario...</p>';

  try {
    inventoryItems = (await apiRequest("/api/admin/inventario")).map(normalizeInventoryItem);
    inventoryItems.sort((left, right) => String(left.producto_nombre || left.producto_id).localeCompare(String(right.producto_nombre || right.producto_id)));
    selectedInventoryId = selectedInventoryId || inventoryItems[0]?.inventario_id || "";
    renderInventoryList();
    fillInventoryForm(inventoryItems.find((item) => item.inventario_id === selectedInventoryId) || defaultInventoryItem);
    renderOrders();
    renderRenewals();
    renderProviderPurchases();
    renderDashboard();
    renderReports();
  } catch (error) {
    inventoryList.innerHTML = `<p class="catalog-message">${escapeHtml(error.message)}</p>`;
  }
}

function getFilteredProviders() {
  const query = (searchProviders?.value || "").toLowerCase().trim();

  return providers.filter((provider) => {
    if (!query) {
      return true;
    }

    return [provider.proveedor_id, provider.nombre, provider.contacto, provider.producto_principal, provider.estado]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

function renderProviderList() {
  if (providerCount) {
    providerCount.textContent = `${providers.length} ${providers.length === 1 ? "proveedor" : "proveedores"}`;
  }

  if (!providerList) {
    return;
  }

  const filtered = getFilteredProviders();

  if (filtered.length === 0) {
    providerList.innerHTML = '<p class="catalog-message">No hay proveedores para mostrar.</p>';
    return;
  }

  providerList.innerHTML = filtered
    .map(
      (provider) => `
        <button class="admin-product-item ${provider.proveedor_id === selectedProviderId ? "is-active" : ""}" type="button" data-provider-id="${escapeHtml(provider.proveedor_id)}">
          <span>
            <strong>${escapeHtml(provider.nombre || "Proveedor sin nombre")}</strong>
            <small>${escapeHtml(provider.proveedor_id)} | ${escapeHtml(provider.contacto || "Sin contacto")}</small>
            <small>${escapeHtml(provider.producto_principal || "Sin producto")} | Costo ref.: ${escapeHtml(formatPrice(provider.costo_referencial))}</small>
          </span>
          <em>${escapeHtml(provider.estado || "activo")}</em>
        </button>
      `
    )
    .join("");
}

function fillProviderForm(provider) {
  const safeProvider = normalizeProvider(provider);
  selectedProviderId = safeProvider.proveedor_id;

  if (providerFormTitle) {
    providerFormTitle.textContent = safeProvider.proveedor_id ? "Editar proveedor" : "Nuevo proveedor";
  }

  Object.entries(defaultProvider).forEach(([key]) => {
    const field = providerForm?.elements.namedItem(key);
    if (field) {
      field.value = safeProvider[key] ?? "";
    }
  });

  renderProviderList();
}

function getProviderFormItem() {
  const formData = new FormData(providerForm);
  const provider = normalizeProvider(Object.fromEntries(formData.entries()));
  const numericCost = Number(provider.costo_referencial);

  if (provider.costo_referencial !== "" && Number.isFinite(numericCost)) {
    provider.costo_referencial = numericCost;
  }

  return provider;
}

function getProviderPurchaseMetrics(purchase) {
  const items = inventoryItems.filter((item) => item.compra_id === purchase.compra_id);
  const byStatus = items.reduce((summary, item) => {
    const status = item.estado || "sin_estado";
    summary[status] = (summary[status] || 0) + 1;
    return summary;
  }, {});
  const generated = items.length;
  const purchased = Number(purchase.cantidad) || 0;
  const expectedCost = Number(purchase.costo_total);
  const inventoryCost = items.reduce((total, item) => {
    const cost = Number(item.costo_proveedor);
    return Number.isFinite(cost) ? total + cost : total;
  }, 0);
  const clientAfterProvider = items.filter((item) => {
    const providerDate = getDateOnly(item.fecha_vencimiento_proveedor);
    const clientDate = getDateOnly(item.fecha_vencimiento_cliente);
    return providerDate && clientDate && clientDate > providerDate;
  }).length;

  return {
    purchased,
    generated,
    missing: Math.max(purchased - generated, 0),
    available: byStatus.disponible || 0,
    occupied: byStatus.ocupado || 0,
    pending: byStatus.pendiente_revision || 0,
    claims: byStatus.reclamo || 0,
    expired: byStatus.vencido || 0,
    low: byStatus.baja || 0,
    expectedCost: Number.isFinite(expectedCost) ? expectedCost : "",
    inventoryCost,
    clientAfterProvider,
  };
}

function renderProviderPurchaseMetrics(purchase) {
  const metrics = getProviderPurchaseMetrics(purchase);
  const entries = [
    ["Compradas", metrics.purchased || "0"],
    ["Generadas", metrics.generated],
    ["Faltan", metrics.missing],
    ["Disponibles", metrics.available],
    ["Ocupadas", metrics.occupied],
    ["Revision", metrics.pending],
    ["Reclamo", metrics.claims],
    ["Baja", metrics.low],
    ["Costo lote", formatPrice(metrics.expectedCost)],
    ["Costo inventario", formatPrice(metrics.inventoryCost)],
  ];
  const warning =
    metrics.clientAfterProvider > 0
      ? `<small><span class="expiration-pill is-danger">${metrics.clientAfterProvider} cuenta${metrics.clientAfterProvider === 1 ? "" : "s"} con cliente mayor al proveedor</span></small>`
      : "";

  return `
    <div class="assignment-financials provider-purchase-metrics">
      ${entries
        .map(
          ([label, value]) => `
            <span>
              <em>${escapeHtml(label)}</em>
              <strong>${escapeHtml(value)}</strong>
            </span>
          `
        )
        .join("")}
    </div>
    ${warning}
  `;
}

function getProviderPurchaseInventoryState(purchase) {
  const metrics = getProviderPurchaseMetrics(purchase);

  if (metrics.clientAfterProvider > 0) {
    return "alerta_vencimiento";
  }

  if (metrics.generated === 0) {
    return "sin_inventario";
  }

  if (metrics.missing > 0) {
    return "faltantes";
  }

  return "completo";
}

function getProviderPurchaseSummary() {
  return providerPurchases.reduce(
    (summary, purchase) => {
      const metrics = getProviderPurchaseMetrics(purchase);
      const totalCost = Number(purchase.costo_total);

      summary.total += 1;
      summary.pending += purchase.estado === "pendiente" ? 1 : 0;
      summary.paidNotReceived += purchase.estado === "pagado" ? 1 : 0;
      summary.partial += purchase.estado === "parcial" ? 1 : 0;
      summary.received += purchase.estado === "recibido" ? 1 : 0;
      summary.missing += metrics.missing > 0 ? 1 : 0;
      summary.withoutInventory += metrics.generated === 0 ? 1 : 0;
      summary.expirationAlerts += metrics.clientAfterProvider > 0 ? 1 : 0;
      summary.totalAccounts += metrics.purchased;
      summary.generatedAccounts += metrics.generated;
      summary.totalCost += Number.isFinite(totalCost) ? totalCost : 0;

      return summary;
    },
    {
      total: 0,
      pending: 0,
      paidNotReceived: 0,
      partial: 0,
      received: 0,
      missing: 0,
      withoutInventory: 0,
      expirationAlerts: 0,
      totalAccounts: 0,
      generatedAccounts: 0,
      totalCost: 0,
    }
  );
}

function renderProviderPurchaseSummary() {
  if (!providerPurchaseSummary) {
    return;
  }

  const summary = getProviderPurchaseSummary();
  const cards = [
    { label: "Total compras", value: summary.total, filter: "all" },
    { label: "Pendientes", value: summary.pending, filter: "pendiente" },
    { label: "Pagadas sin recibir", value: summary.paidNotReceived, filter: "pagado" },
    { label: "Parciales", value: summary.partial, filter: "parcial" },
    { label: "Con faltantes", value: summary.missing, filter: "faltantes" },
    { label: "Alertas vencimiento", value: summary.expirationAlerts, filter: "alerta_vencimiento" },
    { label: "Cuentas generadas", value: `${summary.generatedAccounts}/${summary.totalAccounts}`, filter: "all" },
    { label: "Costo compras", value: formatPrice(summary.totalCost), filter: "all" },
  ];

  providerPurchaseSummary.innerHTML = cards
    .map(
      (card) => `
        <button class="provider-purchase-card" type="button" data-provider-purchase-summary="${escapeHtml(card.filter)}">
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.value)}</strong>
        </button>
      `
    )
    .join("");
}

function setProviderPurchaseFilters({ status = "", inventory = "", query = "" } = {}) {
  if (providerPurchaseStatusFilter) {
    providerPurchaseStatusFilter.value = status;
  }

  if (providerPurchaseInventoryFilter) {
    providerPurchaseInventoryFilter.value = inventory;
  }

  if (searchProviderPurchases) {
    searchProviderPurchases.value = query;
  }

  renderProviderPurchases();
}

function getFilteredProviderPurchases() {
  const query = (searchProviderPurchases?.value || "").toLowerCase().trim();
  const status = providerPurchaseStatusFilter?.value || "";
  const inventoryState = providerPurchaseInventoryFilter?.value || "";

  return providerPurchases.filter((purchase) => {
    const metricsState = getProviderPurchaseInventoryState(purchase);
    const matchesStatus = !status || purchase.estado === status;
    const matchesInventory = !inventoryState || metricsState === inventoryState;
    const matchesQuery =
      !query ||
      [
        purchase.compra_id,
        purchase.proveedor_id,
        purchase.proveedor_nombre,
        purchase.producto_id,
        purchase.producto_nombre,
        purchase.metodo_pago,
        purchase.referencia_pago,
        purchase.estado,
        purchase.notas,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

    return matchesStatus && matchesInventory && matchesQuery;
  });
}

function renderProviderPurchases() {
  if (!providerPurchaseList) {
    return;
  }

  renderProviderPurchaseSummary();

  const filtered = getFilteredProviderPurchases();
  const sorted = [...filtered].sort((left, right) => String(right.fecha_compra || right.creado_en || "").localeCompare(String(left.fecha_compra || left.creado_en || "")));

  if (providerPurchaseCount) {
    providerPurchaseCount.textContent = `${filtered.length}/${providerPurchases.length} ${providerPurchases.length === 1 ? "compra" : "compras"}`;
  }

  if (sorted.length === 0) {
    providerPurchaseList.innerHTML = '<p class="catalog-message">No hay compras de proveedor registradas.</p>';
    return;
  }

  providerPurchaseList.innerHTML = sorted
    .map((purchase) => {
      const providerExpirationStatus = getExpirationStatus(purchase.fecha_vencimiento_proveedor);
      const inventoryState = getProviderPurchaseInventoryState(purchase);
      return `
        <button class="admin-product-item ${purchase.compra_id === selectedProviderPurchaseId ? "is-active" : ""}" type="button" data-provider-purchase-id="${escapeHtml(purchase.compra_id)}">
          <span>
            <strong>${escapeHtml(purchase.producto_nombre || purchase.producto_id || "Producto")}</strong>
            <small>${escapeHtml(purchase.compra_id)} | ${escapeHtml(purchase.proveedor_nombre || purchase.proveedor_id || "Sin proveedor")}</small>
            <small>Cant.: ${escapeHtml(purchase.cantidad || "0")} | Total: ${escapeHtml(formatPrice(purchase.costo_total))} | Unit.: ${escapeHtml(formatPrice(purchase.costo_unitario))}</small>
            <small>${purchase.estado === "recibido" ? "Inventario: se genera automaticamente si faltan cuentas" : "Inventario: pendiente de recibir"}</small>
            <small>
              <span class="expiration-pill is-${escapeHtml(providerExpirationStatus.level)}">Proveedor: ${escapeHtml(providerExpirationStatus.label)}</span>
              <span class="expiration-pill is-muted">${escapeHtml(inventoryState.replace("_", " "))}</span>
            </small>
            ${renderProviderPurchaseMetrics(purchase)}
          </span>
          <em>${escapeHtml(purchase.estado || "pendiente")}</em>
        </button>
      `;
    })
    .join("");
}

function fillProviderPurchaseForm(purchase) {
  const isNewPurchase = !purchase || !purchase.compra_id;
  const safePurchase = normalizeProviderPurchase(purchase);

  if (isNewPurchase) {
    safePurchase.fecha_compra = safePurchase.fecha_compra || getDefaultDateInput();
    safePurchase.fecha_vencimiento_proveedor = safePurchase.fecha_vencimiento_proveedor || getDefaultDateInput(30);
  }

  selectedProviderPurchaseId = safePurchase.compra_id;

  if (providerPurchaseFormTitle) {
    providerPurchaseFormTitle.textContent = safePurchase.compra_id ? "Editar compra" : "Nueva compra";
  }

  Object.entries(defaultProviderPurchase).forEach(([key]) => {
    const field = providerPurchaseForm?.elements.namedItem(key);
    if (field) {
      field.value = key.startsWith("fecha_") ? formatDateInput(safePurchase[key]) : safePurchase[key] ?? "";
    }
  });

  updateProviderPurchaseActionState(safePurchase);
  renderProviderPurchases();
}

function updateProviderPurchaseActionState(purchase) {
  providerPurchaseStatusButtons.forEach((button) => {
    const targetStatus = button.dataset.providerPurchaseStatus;
    button.disabled = !purchase.compra_id || purchase.estado === targetStatus;
  });
}

function getProviderPurchaseFormItem() {
  const formData = new FormData(providerPurchaseForm);
  const purchase = normalizeProviderPurchase(Object.fromEntries(formData.entries()));
  const provider = providers.find((entry) => entry.proveedor_id === purchase.proveedor_id);
  const product = products.find((entry) => entry.id === purchase.producto_id);
  const cantidad = Number(purchase.cantidad);
  const costoTotal = Number(purchase.costo_total);
  const costoUnitario = Number(purchase.costo_unitario);

  if (provider && !purchase.proveedor_nombre) {
    purchase.proveedor_nombre = provider.nombre;
  }

  if (product && !purchase.producto_nombre) {
    purchase.producto_nombre = product.nombre;
  }

  if (purchase.cantidad !== "" && Number.isFinite(cantidad)) {
    purchase.cantidad = cantidad;
  }

  if (purchase.costo_total !== "" && Number.isFinite(costoTotal)) {
    purchase.costo_total = costoTotal;
  }

  if (purchase.costo_unitario !== "" && Number.isFinite(costoUnitario)) {
    purchase.costo_unitario = costoUnitario;
  } else if (Number.isFinite(cantidad) && cantidad > 0 && Number.isFinite(costoTotal)) {
    purchase.costo_unitario = Math.round((costoTotal / cantidad) * 100) / 100;
  }

  return purchase;
}

function validateProviderPurchaseForSave(purchase) {
  if (!purchase.proveedor_id && !purchase.proveedor_nombre) {
    return "Selecciona o ingresa el proveedor de la compra.";
  }

  if (!purchase.producto_id && !purchase.producto_nombre) {
    return "Selecciona o ingresa el producto comprado.";
  }

  return "";
}

async function saveProviderPurchase(purchase, { forceUpdate = false } = {}) {
  const validationError = validateProviderPurchaseForSave(purchase);

  if (validationError) {
    setStatus(validationError, true);
    return null;
  }

  const isEditing = forceUpdate || providerPurchases.some((entry) => entry.compra_id === selectedProviderPurchaseId);
  const url = isEditing ? `/api/admin/compras-proveedor/${encodeURIComponent(selectedProviderPurchaseId)}` : "/api/admin/compras-proveedor";
  const saved = normalizeProviderPurchase(
    await apiRequest(url, {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(purchase),
    })
  );
  const generatedCount = Number(saved.inventario_generado || 0);
  const index = providerPurchases.findIndex((entry) => entry.compra_id === selectedProviderPurchaseId);

  if (index >= 0) {
    providerPurchases[index] = saved;
  } else {
    providerPurchases.push(saved);
  }

  selectedProviderPurchaseId = saved.compra_id;
  fillProviderPurchaseForm(saved);

  if (generatedCount > 0) {
    await loadInventory();
  }

  setStatus(generatedCount > 0 ? `Compra guardada. Se generaron ${generatedCount} cuenta${generatedCount === 1 ? "" : "s"} en inventario.` : "Compra de proveedor guardada.");
  return saved;
}

async function loadSuppliers() {
  if (!providerList && !providerPurchaseList) {
    return;
  }

  if (providerList) {
    providerList.innerHTML = '<p class="catalog-message">Cargando proveedores...</p>';
  }

  try {
    const [providerRows, purchaseRows] = await Promise.all([
      apiRequest("/api/admin/proveedores"),
      apiRequest("/api/admin/compras-proveedor"),
    ]);
    providers = providerRows.map(normalizeProvider).sort((left, right) => left.nombre.localeCompare(right.nombre));
    providerPurchases = purchaseRows.map(normalizeProviderPurchase);
    selectedProviderId = selectedProviderId || providers[0]?.proveedor_id || "";
    selectedProviderPurchaseId = selectedProviderPurchaseId || providerPurchases[0]?.compra_id || "";
    renderSupplierSelectOptions();
    renderProviderList();
    fillProviderForm(providers.find((provider) => provider.proveedor_id === selectedProviderId) || defaultProvider);
    renderProviderPurchases();
    fillProviderPurchaseForm(providerPurchases.find((purchase) => purchase.compra_id === selectedProviderPurchaseId) || defaultProviderPurchase);
    renderDashboard();
    renderReports();
  } catch (error) {
    if (providerList) {
      providerList.innerHTML = `<p class="catalog-message">${escapeHtml(error.message)}</p>`;
    }
  }
}

function getFilteredRenewals() {
  const query = (searchRenewals?.value || "").toLowerCase().trim();
  const status = renewalStatusFilter?.value || "";

  return renewals.filter((renewal) => {
    const matchesStatus = !status || renewal.estado === status;
    const matchesQuery =
      !query ||
      [
        renewal.renovacion_id,
        renewal.pedido_id,
        renewal.inventario_id,
        renewal.cliente_nombre,
        renewal.cliente_contacto,
        renewal.producto_nombre,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

    return matchesStatus && matchesQuery;
  });
}

function getDueInventoryItems() {
  return inventoryItems
    .filter((item) => item.estado === "ocupado" && getExpirationStatus(item.fecha_vencimiento_cliente).isSoon)
    .sort((left, right) => (daysUntil(left.fecha_vencimiento_cliente) ?? 999) - (daysUntil(right.fecha_vencimiento_cliente) ?? 999));
}

function renderRenewals() {
  if (renewalCount) {
    renewalCount.textContent = `${renewals.length} ${renewals.length === 1 ? "renovacion" : "renovaciones"}`;
  }

  renderRenewalList();
  renderRenewalDueList();
  renderRenewalEditor();
}

function renderRenewalList() {
  if (!renewalList) {
    return;
  }

  const filtered = getFilteredRenewals();

  if (filtered.length === 0) {
    renewalList.innerHTML = '<p class="catalog-message">No hay renovaciones para mostrar.</p>';
    return;
  }

  renewalList.innerHTML = filtered
    .map((renewal) => {
      const isActive = renewal.renovacion_id === selectedRenewalId;
      return `
        <button class="admin-product-item ${isActive ? "is-active" : ""}" type="button" data-renewal-id="${escapeHtml(renewal.renovacion_id)}">
          <span>
            <strong>${escapeHtml(renewal.cliente_nombre || renewal.cliente_contacto || "Cliente sin nombre")}</strong>
            <small>${escapeHtml(renewal.producto_nombre || "Producto")} | Pedido: ${escapeHtml(renewal.pedido_id || "Sin pedido")}</small>
            <small>Vence: ${escapeHtml(formatDate(renewal.vencimiento_anterior))} | Nuevo: ${escapeHtml(formatDate(renewal.vencimiento_nuevo))}</small>
          </span>
          <em>${escapeHtml(renewal.estado)}</em>
        </button>
      `;
    })
    .join("");
}

function renderRenewalDueList() {
  if (!renewalDueList) {
    return;
  }

  const dueItems = getDueInventoryItems();

  if (dueItems.length === 0) {
    renewalDueList.innerHTML = '<p class="catalog-message">No hay cuentas ocupadas vencidas o por vencer en los proximos 7 dias.</p>';
    return;
  }

  renewalDueList.innerHTML = dueItems
    .map((item) => {
      const expiration = getExpirationStatus(item.fecha_vencimiento_cliente);
      return `
        <article class="renewal-due-item">
          <div>
            <strong>${escapeHtml(item.cliente_nombre || item.cliente_contacto || item.pedido_id || "Cliente por completar")}</strong>
            <small>${escapeHtml(item.producto_nombre || item.producto_id)} | ${escapeHtml(item.inventario_id)}</small>
            <small>${item.cliente_contacto ? `Contacto: ${escapeHtml(item.cliente_contacto)}` : "Contacto pendiente en inventario"}</small>
            <small><span class="expiration-pill is-${escapeHtml(expiration.level)}">${escapeHtml(expiration.label)}</span></small>
          </div>
          <button class="button button-secondary compact-button create-renewal-button" type="button" data-inventory-id="${escapeHtml(item.inventario_id)}">
            Crear renovacion
          </button>
        </article>
      `;
    })
    .join("");
}

function getSelectedRenewal() {
  return renewals.find((renewal) => renewal.renovacion_id === selectedRenewalId) || null;
}

function renderRenewalEditor() {
  if (!renewalEditor) {
    return;
  }

  const renewal = getSelectedRenewal();

  if (!renewal) {
    renewalEditor.innerHTML = '<p class="catalog-message">Selecciona una renovacion para registrar el pago.</p>';
    return;
  }

  const statusOptions = renewalStatuses
    .map((status) => `<option value="${escapeHtml(status)}" ${status === renewal.estado ? "selected" : ""}>${escapeHtml(status)}</option>`)
    .join("");
  const paymentOptions = paymentMethods
    .filter((method) => method.estado !== "inactivo")
    .map((method) => `<option value="${escapeHtml(method.id)}" ${method.id === renewal.metodo_pago ? "selected" : ""}>${escapeHtml(method.nombre)}</option>`)
    .join("");

  renewalEditor.innerHTML = `
    <form class="product-form renewal-form" data-renewal-id="${escapeHtml(renewal.renovacion_id)}" enctype="multipart/form-data">
      <div class="form-grid">
        <label>
          Estado
          <select name="estado">${statusOptions}</select>
        </label>
        <label>
          Monto
          <input name="monto" type="number" min="0" step="0.01" value="${escapeHtml(renewal.monto)}" />
        </label>
        <label>
          Metodo de pago
          <select name="metodo_pago">
            <option value="">Seleccionar metodo</option>
            ${paymentOptions}
          </select>
        </label>
        <label>
          Nuevo vencimiento
          <input name="vencimiento_nuevo" type="date" value="${escapeHtml(formatDateInput(renewal.vencimiento_nuevo))}" />
        </label>
        <label>
          Referencia
          <input name="comprobante_referencia" type="text" value="${escapeHtml(renewal.comprobante_referencia)}" placeholder="Operacion o codigo" />
        </label>
        <label>
          Archivo del comprobante
          <input name="comprobante_archivo" type="file" accept="image/*,.pdf,application/pdf" ${renewal.comprobante_url || renewal.comprobante_referencia ? "" : ""} />
        </label>
        <label class="form-wide">
          Notas
          <textarea name="comprobante_notas" rows="3" placeholder="Detalle del pago">${escapeHtml(renewal.comprobante_notas)}</textarea>
        </label>
      </div>
      <div class="form-actions">
        <button class="button button-secondary" type="submit">Guardar renovacion</button>
        <button class="button button-primary confirm-renewal-button" type="button" ${renewal.estado === "renovado" ? "disabled" : ""}>
          Confirmar pago y renovar
        </button>
      </div>
    </form>
  `;
}

async function loadRenewals() {
  if (!renewalList) {
    return;
  }

  renewalList.innerHTML = '<p class="catalog-message">Cargando renovaciones...</p>';

  try {
    renewals = (await apiRequest("/api/admin/renovaciones")).map(normalizeRenewal);
    renewals.sort((left, right) => String(right.creado_en || "").localeCompare(String(left.creado_en || "")));
    selectedRenewalId = selectedRenewalId || renewals[0]?.renovacion_id || "";
    renderRenewals();
    renderDashboard();
    renderReports();
  } catch (error) {
    renewalList.innerHTML = `<p class="catalog-message">${escapeHtml(error.message)}</p>`;
  }
}

async function loadPaymentMethods() {
  try {
    paymentMethods = (await apiRequest("/api/metodos-pago")).map(normalizePaymentMethod);
    renderManualSalePaymentMethodOptions();
    renderRenewalEditor();
  } catch {
    paymentMethods = [
      { id: "yape", nombre: "Yape", estado: "activo" },
      { id: "plin", nombre: "Plin", estado: "activo" },
      { id: "transferencia", nombre: "Transferencia", estado: "activo" },
    ];
    renderManualSalePaymentMethodOptions();
    renderRenewalEditor();
  }
}

function renderTemplateList() {
  if (templateCount) {
    templateCount.textContent = `${messageTemplates.length} ${messageTemplates.length === 1 ? "plantilla" : "plantillas"}`;
  }

  if (!templateList) {
    return;
  }

  if (messageTemplates.length === 0) {
    templateList.innerHTML = '<p class="catalog-message">No hay plantillas para mostrar.</p>';
    return;
  }

  templateList.innerHTML = messageTemplates
    .map(
      (template) => `
        <button class="admin-product-item ${template.id === selectedTemplateId ? "is-active" : ""}" type="button" data-template-id="${escapeHtml(template.id)}">
          <span>
            <strong>${escapeHtml(template.nombre || template.id)}</strong>
            <small>${escapeHtml(template.asunto || "Sin asunto")}</small>
          </span>
          <em>${escapeHtml(template.estado)}</em>
        </button>
      `
    )
    .join("");
}

function fillTemplateForm(template) {
  const safeTemplate = normalizeMessageTemplate(template);
  selectedTemplateId = safeTemplate.id;

  if (templateFormTitle) {
    templateFormTitle.textContent = safeTemplate.nombre || "Plantilla";
  }

  Object.entries(defaultMessageTemplate).forEach(([key]) => {
    const field = templateForm?.elements.namedItem(key);
    if (field) {
      field.value = safeTemplate[key] ?? "";
    }
  });

  renderTemplateList();
}

async function loadTemplates() {
  if (!templateList) {
    return;
  }

  templateList.innerHTML = '<p class="catalog-message">Cargando plantillas...</p>';

  try {
    messageTemplates = (await apiRequest("/api/admin/plantillas")).map(normalizeMessageTemplate);
    selectedTemplateId = selectedTemplateId || messageTemplates[0]?.id || "";
    renderTemplateList();
    fillTemplateForm(messageTemplates.find((template) => template.id === selectedTemplateId) || defaultMessageTemplate);
  } catch (error) {
    templateList.innerHTML = `<p class="catalog-message">${escapeHtml(error.message)}</p>`;
  }
}

async function saveTemplate() {
  const formData = new FormData(templateForm);
  const template = normalizeMessageTemplate(Object.fromEntries(formData.entries()));

  if (!template.id) {
    setStatus("Selecciona una plantilla para editar.", true);
    return;
  }

  const saved = normalizeMessageTemplate(
    await apiRequest(`/api/admin/plantillas/${encodeURIComponent(template.id)}`, {
      method: "PUT",
      body: JSON.stringify(template),
    })
  );
  const index = messageTemplates.findIndex((entry) => entry.id === saved.id);

  if (index >= 0) {
    messageTemplates[index] = saved;
  } else {
    messageTemplates.push(saved);
  }

  fillTemplateForm(saved);
  setStatus("Plantilla guardada.");
}

function renderAuditEvents() {
  if (auditCount) {
    auditCount.textContent = `${auditEvents.length} ${auditEvents.length === 1 ? "evento" : "eventos"}`;
  }

  if (!auditList) {
    return;
  }

  if (auditEvents.length === 0) {
    auditList.innerHTML = '<p class="catalog-message">No hay eventos de auditoria para mostrar.</p>';
    return;
  }

  auditList.innerHTML = auditEvents
    .map((event) => {
      const statusLine = [event.estado_anterior, event.estado_nuevo].filter(Boolean).join(" -> ");
      const details =
        event.detalles && typeof event.detalles === "object"
          ? Object.entries(event.detalles)
              .filter(([, value]) => value !== "" && value !== null && value !== undefined)
              .map(([key, value]) => `${key}: ${value}`)
              .join(" | ")
          : "";

      return `
        <article class="order-item">
          <div>
            <strong>${escapeHtml(event.accion || "evento")} | ${escapeHtml(event.entidad || "entidad")}</strong>
            <small>${escapeHtml(event.entidad_id || "Sin ID")} | ${escapeHtml(formatDate(event.creado_en))}</small>
            ${statusLine ? `<small>Estado: ${escapeHtml(statusLine)}</small>` : ""}
            ${details ? `<small>${escapeHtml(details)}</small>` : ""}
          </div>
          <div>
            <span class="status-pill is-muted">${escapeHtml(event.usuario || "admin")}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadAuditEvents() {
  if (!auditList) {
    return;
  }

  auditList.innerHTML = '<p class="catalog-message">Cargando auditoria...</p>';

  try {
    auditEvents = await apiRequest("/api/admin/auditoria?limit=100");
    renderAuditEvents();
  } catch (error) {
    auditList.innerHTML = `<p class="catalog-message">${escapeHtml(error.message)}</p>`;
  }
}

async function createRenewalFromInventory(inventoryId) {
  const item = inventoryItems.find((entry) => entry.inventario_id === inventoryId);

  if (!item) {
    setStatus("Cuenta de inventario no encontrada.", true);
    return;
  }

  const created = normalizeRenewal(
    await apiRequest("/api/admin/renovaciones", {
      method: "POST",
      body: JSON.stringify({
        inventario_id: item.inventario_id,
        pedido_id: item.pedido_id,
        cliente_nombre: item.cliente_nombre,
        cliente_contacto: item.cliente_contacto,
        producto_nombre: item.producto_nombre || item.producto_id,
        vencimiento_anterior: item.fecha_vencimiento_cliente,
      }),
    })
  );

  renewals.unshift(created);
  selectedRenewalId = created.renovacion_id;
  renderRenewals();
  setStatus(`Renovacion ${created.renovacion_id} creada.`);
}

function getRenewalFormPatch(form) {
  const formData = new FormData(form);
  const patch = Object.fromEntries(formData.entries());
  const numericAmount = Number(patch.monto);

  if (patch.monto !== "" && Number.isFinite(numericAmount)) {
    patch.monto = numericAmount;
  }

  return patch;
}

function getRenewalFormData(form) {
  const formData = new FormData(form);
  const file = formData.get("comprobante_archivo");

  if (file instanceof File && !file.name) {
    formData.delete("comprobante_archivo");
  }

  return formData;
}

async function saveRenewal(form) {
  const renewalId = form.dataset.renewalId;
  const saved = normalizeRenewal(
    await apiRequest(`/api/admin/renovaciones/${encodeURIComponent(renewalId)}`, {
      method: "PUT",
      body: JSON.stringify(getRenewalFormPatch(form)),
    })
  );
  const index = renewals.findIndex((renewal) => renewal.renovacion_id === renewalId);

  if (index >= 0) {
    renewals[index] = saved;
  }

  renderRenewals();
  setStatus(`Renovacion ${renewalId} guardada.`);
}

async function confirmRenewal(form) {
  const renewalId = form.dataset.renewalId;
  const result = await apiRequest(`/api/admin/renovaciones/${encodeURIComponent(renewalId)}/confirmar`, {
    method: "POST",
    headers: {},
    body: getRenewalFormData(form),
  });
  const saved = normalizeRenewal(result.renewal);
  const index = renewals.findIndex((renewal) => renewal.renovacion_id === renewalId);

  if (index >= 0) {
    renewals[index] = saved;
  }

  if (result.item) {
    const updatedItem = normalizeInventoryItem(result.item);
    const itemIndex = inventoryItems.findIndex((item) => item.inventario_id === updatedItem.inventario_id);
    if (itemIndex >= 0) {
      inventoryItems[itemIndex] = updatedItem;
    }
  }

  renderRenewals();
  renderInventoryList();
  await loadOrders();
  setStatus(`Renovacion ${renewalId} confirmada.`);
}

async function saveInventoryItem(item) {
  const isEditing = inventoryItems.some((entry) => entry.inventario_id === selectedInventoryId);
  const url = isEditing ? `/api/admin/inventario/${encodeURIComponent(selectedInventoryId)}` : "/api/admin/inventario";
  const method = isEditing ? "PUT" : "POST";
  const saved = normalizeInventoryItem(
    await apiRequest(url, {
      method,
      body: JSON.stringify(item),
    })
  );
  const index = inventoryItems.findIndex((entry) => entry.inventario_id === selectedInventoryId);

  if (index >= 0) {
    inventoryItems[index] = saved;
  } else {
    inventoryItems.push(saved);
  }

  selectedInventoryId = saved.inventario_id;
  renderInventoryList();
  renderProviderPurchases();
  fillInventoryForm(saved);
  renderOrders();
  setStatus("Cuenta de inventario guardada.");
}

function getOrderComponents(order) {
  const product = products.find((item) => item.id === order.producto_id);
  const components = normalizeProductComponents(product?.componentes);

  if (components.length > 0) {
    return components.map((component, index) => ({
      componente_id: component.id || component.producto_id || `componente-${index + 1}`,
      componente_nombre: component.nombre || component.producto_id || `Componente ${index + 1}`,
      producto_id: component.producto_id || component.id || "",
    }));
  }

  const comboParts = String(order.producto_nombre || "")
    .replace(/^combo\s+/i, "")
    .split(/\s+\+\s+|\s+y\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (comboParts.length > 1) {
    return comboParts.map((name, index) => {
      const matchedProduct = products.find((productEntry) => slugify(productEntry.nombre) === slugify(name) || productEntry.id === slugify(name));
      return {
        componente_id: matchedProduct?.id || slugify(name) || `componente-${index + 1}`,
        componente_nombre: matchedProduct?.nombre || name,
        producto_id: matchedProduct?.id || slugify(name),
      };
    });
  }

  return [
    {
      componente_id: "principal",
      componente_nombre: order.producto_nombre || order.producto_id || "Producto",
      producto_id: order.producto_id || "",
    },
  ];
}

function getAvailableInventoryForOrder(order, component = null) {
  return inventoryItems.filter((item) => {
    const componentProductId = component?.producto_id || "";
    const componentName = component?.componente_nombre || "";
    const orderProductId = order.producto_id || "";
    const orderProductName = order.producto_nombre || "";
    const expectedIds = (componentProductId ? [componentProductId] : [orderProductId]).filter(Boolean);
    const expectedNames = (componentName ? [componentName] : [orderProductName]).filter(Boolean);
    const itemProductId = item.producto_id || "";
    const itemProductName = item.producto_nombre || "";
    const matchesProduct =
      (!itemProductId && !itemProductName) ||
      expectedIds.some((id) => productValueMatches(itemProductId, id) || productValueMatches(itemProductName, id)) ||
      expectedNames.some((name) => productValueMatches(itemProductId, name) || productValueMatches(itemProductName, name));
    return item.estado === "disponible" && matchesProduct;
  });
}

function productValueMatches(value, target) {
  const valueSlug = slugify(value);
  const targetSlug = slugify(target);

  if (!valueSlug || !targetSlug) {
    return false;
  }

  return valueSlug === targetSlug || (targetSlug.length >= 3 && valueSlug.includes(targetSlug)) || (valueSlug.length >= 3 && targetSlug.includes(valueSlug));
}

function renderInventoryOption(item) {
  return `<option value="${escapeHtml(item.inventario_id)}" data-sale-price="${escapeHtml(item.precio_venta_sugerido)}" data-cost="${escapeHtml(item.costo_proveedor)}">${escapeHtml(item.producto_nombre || item.producto_id || item.inventario_id)} | ${escapeHtml(item.proveedor)}</option>`;
}

function renderAssignmentPanel(order) {
  const assignments = normalizeInventoryOrder(order).asignaciones_inventario;
  const deliveryHref = buildWhatsAppUrl(order.cliente_contacto, buildDeliveryMessage(order));
  const deliveryActions = deliveryHref
    ? `<div class="notification-actions">${renderNotificationLink(deliveryHref, "Notificar entrega")}</div>`
    : "";

  if (assignments.length > 0) {
    return `
      <div class="inventory-assignment is-linked">
        ${assignments
          .map(
            (assignment) => `
              <small>${escapeHtml(assignment.componente_nombre || "Producto")}: ${escapeHtml(assignment.inventario_id)} | Proveedor: ${escapeHtml(assignment.proveedor || "Sin proveedor")}</small>
              ${renderAssignmentFinancials(assignment)}
            `
          )
          .join("")}
        <small>Entrega: ${escapeHtml(formatDate(order.fecha_entrega))} | Vence cliente: ${escapeHtml(formatDate(order.fecha_vencimiento_cliente))}</small>
        ${deliveryActions}
      </div>
    `;
  }

  if (order.inventario_id) {
    return `
      <div class="inventory-assignment is-linked">
        <small>Inventario: ${escapeHtml(order.inventario_id)} | Proveedor: ${escapeHtml(order.proveedor || "Sin proveedor")}</small>
        ${renderAssignmentFinancials(order)}
        <small>Entrega: ${escapeHtml(formatDate(order.fecha_entrega))} | Vence cliente: ${escapeHtml(formatDate(order.fecha_vencimiento_cliente))}</small>
        ${deliveryActions}
      </div>
    `;
  }

  if (order.estado !== "pagado") {
    return '<small>Inventario: disponible cuando el pedido este pagado.</small>';
  }

  const components = getOrderComponents(order);
  const totalAvailable = components.reduce((total, component) => total + getAvailableInventoryForOrder(order, component).length, 0);

  return `
    <div class="inventory-assignment" data-order-id="${escapeHtml(order.pedido_id)}">
      ${components
        .map((component) => {
          const availableInventory = getAvailableInventoryForOrder(order, component);
          return `
            <label>
              Cuenta para ${escapeHtml(component.componente_nombre)}
              <select class="inventory-assign-select" data-component-id="${escapeHtml(component.componente_id)}" data-component-name="${escapeHtml(component.componente_nombre)}" data-product-id="${escapeHtml(component.producto_id)}">
                <option value="">Seleccionar cuenta</option>
                ${availableInventory.map(renderInventoryOption).join("")}
              </select>
            </label>
            <label>
              Perfil para ${escapeHtml(component.componente_nombre)}
              <input class="inventory-assign-profile" type="text" data-component-id="${escapeHtml(component.componente_id)}" placeholder="Perfil 1" />
            </label>
            <label>
              PIN para ${escapeHtml(component.componente_nombre)}
              <input class="inventory-assign-pin" type="text" data-component-id="${escapeHtml(component.componente_id)}" placeholder="1234" />
            </label>
            <label>
              Precio venta para ${escapeHtml(component.componente_nombre)}
              <input class="inventory-assign-sale-price" type="number" min="0" step="0.01" data-component-id="${escapeHtml(component.componente_id)}" placeholder="Precio negociado" />
            </label>
          `;
        })
        .join("")}
      <label>
        Vence cliente
        <input class="inventory-assign-expiration" type="date" value="${escapeHtml(getDefaultClientExpirationDate())}" />
      </label>
      <button class="button button-primary assign-inventory-button" type="button" ${totalAvailable >= components.length ? "" : "disabled"}>
        Asignar y entregar
      </button>
      <small class="assignment-message" aria-live="polite"></small>
    </div>
  `;
}

function renderOrderChannelOptions() {
  if (!orderChannelFilter) {
    return;
  }

  const currentValue = orderChannelFilter.value;
  const channels = [...new Set(orders.map((order) => order.canal_venta || "web").filter(Boolean))].sort();
  orderChannelFilter.innerHTML = [
    '<option value="">Todos los canales</option>',
    ...channels.map((channel) => `<option value="${escapeHtml(channel)}">${escapeHtml(channel)}</option>`),
  ].join("");
  orderChannelFilter.value = channels.includes(currentValue) ? currentValue : "";
}

function getFilteredOrders() {
  const query = (searchOrders?.value || "").toLowerCase().trim();
  const status = orderStatusFilter?.value || "";
  const channel = orderChannelFilter?.value || "";
  const start = getDateOnly(orderStartDate?.value);
  const end = getDateOnly(orderEndDate?.value);

  return orders.filter((order) => {
    const orderDate = getDateOnly(order.creado_en || order.actualizado_en);
    const matchesQuery =
      !query ||
      [
        order.pedido_id,
        order.producto_id,
        order.producto_nombre,
        order.cliente_nombre,
        order.cliente_contacto,
        order.comprobante_referencia,
        order.comprobante_notas,
        order.canal_venta,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesStatus = !status || order.estado === status;
    const matchesChannel = !channel || (order.canal_venta || "web") === channel;
    const matchesStart = !start || (orderDate && orderDate >= start);
    const matchesEnd = !end || (orderDate && orderDate <= end);

    return matchesQuery && matchesStatus && matchesChannel && matchesStart && matchesEnd;
  });
}

function renderOrders() {
  if (orderCount) {
    const filteredCount = getFilteredOrders().length;
    orderCount.textContent = `${filteredCount}/${orders.length} ${orders.length === 1 ? "pedido" : "pedidos"}`;
  }

  if (!orderList) {
    return;
  }

  renderOrderChannelOptions();
  const filteredOrders = getFilteredOrders();

  if (filteredOrders.length === 0) {
    orderList.innerHTML = '<p class="catalog-message">No hay pedidos registrados.</p>';
    return;
  }

  orderList.innerHTML = filteredOrders
    .map((order) => {
      const proof = order.comprobante_url
        ? `<a href="${escapeHtml(order.comprobante_url)}" target="_blank" rel="noreferrer">Abrir comprobante</a>`
        : escapeHtml(order.comprobante_referencia || order.comprobante_notas || "Sin comprobante");
      const statusOptions = orderStatuses
        .map(
          (status) =>
            `<option value="${escapeHtml(status)}" ${status === order.estado ? "selected" : ""}>${escapeHtml(status)}</option>`
        )
        .join("");
      const assignmentPanel = renderAssignmentPanel(order);

      return `
        <article class="order-item" data-id="${escapeHtml(order.pedido_id)}">
          <div>
            <strong>${escapeHtml(order.pedido_id)}</strong>
            <small>${escapeHtml(order.producto_nombre || "Producto sin nombre")} | ${escapeHtml(formatPrice(order.producto_precio))}</small>
            <small>Canal: ${escapeHtml(order.canal_venta || "web")}</small>
            <small>Cliente: ${escapeHtml(order.cliente_nombre || "Pendiente")} | ${escapeHtml(order.cliente_contacto || "Sin contacto")}</small>
            <small>Comprobante: ${proof}</small>
            <small>Creado: ${escapeHtml(formatDate(order.creado_en))}</small>
            ${assignmentPanel}
          </div>
          <label>
            Estado
            <select class="order-status-select" data-id="${escapeHtml(order.pedido_id)}">
              ${statusOptions}
            </select>
          </label>
        </article>
      `;
    })
    .join("");
}

async function loadOrders() {
  if (!orderList) {
    return;
  }

  orderList.innerHTML = '<p class="catalog-message">Cargando pedidos...</p>';

  try {
    orders = (await apiRequest("/api/admin/pedidos")).map(normalizeInventoryOrder);
    orders.sort((left, right) => String(right.creado_en || "").localeCompare(String(left.creado_en || "")));
    renderOrders();
    renderDashboard();
    renderReports();
  } catch (error) {
    orderList.innerHTML = `<p class="catalog-message">${escapeHtml(error.message)}</p>`;
  }
}

function getManualSaleFormOrder() {
  const formData = new FormData(manualSaleForm);
  const order = Object.fromEntries(formData.entries());
  const selectedProduct = products.find((product) => product.id === order.producto_id);
  const numericPrice = Number(order.producto_precio);

  if (selectedProduct) {
    order.producto_nombre = selectedProduct.nombre;
  }

  if (order.producto_precio !== "" && Number.isFinite(numericPrice)) {
    order.producto_precio = numericPrice;
  } else if (selectedProduct?.precio !== undefined) {
    order.producto_precio = selectedProduct.precio;
  }

  return order;
}

async function createManualSale() {
  const formData = new FormData(manualSaleForm);
  const order = getManualSaleFormOrder();

  if (!order.producto_id) {
    setStatus("Selecciona el producto vendido.", true);
    return;
  }

  if (!order.cliente_nombre || !order.cliente_contacto) {
    setStatus("Ingresa cliente y contacto para la venta manual.", true);
    return;
  }

  Object.entries(order).forEach(([key, value]) => {
    if (key !== "comprobante_archivo") {
      formData.set(key, value ?? "");
    }
  });

  const saved = normalizeInventoryOrder(
    await apiRequest("/api/admin/pedidos", {
      method: "POST",
      body: formData,
    })
  );

  orders.unshift(saved);
  renderOrders();
  renderDashboard();
  renderReports();
  manualSaleForm.reset();
  setStatus(`Venta manual ${saved.pedido_id} creada.`);
}

async function updateOrderStatus(id, estado) {
  const updated = await apiRequest(`/api/admin/pedidos/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ estado }),
  });
  const index = orders.findIndex((order) => order.pedido_id === id);

  if (index >= 0) {
    orders[index] = updated;
  }

  renderOrders();
  renderReports();
  setStatus(`Pedido ${id} actualizado a ${estado}.`);
}

async function assignInventoryToOrder(orderId, container) {
  setAssignmentMessage(container, "");
  const selects = [...container.querySelectorAll(".inventory-assign-select")];
  const expirationInput = container.querySelector(".inventory-assign-expiration");
  const expirationDate = expirationInput?.value || getDefaultClientExpirationDate();
  const asignaciones = selects.map((select) => {
    const componentId = select.dataset.componentId || "principal";
    const profileInput = [...container.querySelectorAll(".inventory-assign-profile")].find((input) => input.dataset.componentId === componentId);
    const pinInput = [...container.querySelectorAll(".inventory-assign-pin")].find((input) => input.dataset.componentId === componentId);
    const salePriceInput = [...container.querySelectorAll(".inventory-assign-sale-price")].find((input) => input.dataset.componentId === componentId);

    return {
      componente_id: componentId,
      componente_nombre: select.dataset.componentName || "",
      producto_id: select.dataset.productId || "",
      inventario_id: select.value || "",
      perfil_nombre: profileInput?.value || "",
      pin: pinInput?.value || "",
      precio_venta: salePriceInput?.value || "",
      fecha_vencimiento_cliente: expirationDate,
    };
  });

  if (asignaciones.some((assignment) => !assignment.inventario_id)) {
    setStatus("Selecciona una cuenta disponible para cada componente.", true);
    return;
  }

  const uniqueIds = new Set(asignaciones.map((assignment) => assignment.inventario_id));
  if (uniqueIds.size !== asignaciones.length) {
    setStatus("No uses la misma cuenta en mas de un componente.", true);
    return;
  }

  const result = await apiRequest(`/api/admin/pedidos/${encodeURIComponent(orderId)}/asignar-inventario`, {
    method: "POST",
    body: JSON.stringify({
      inventario_id: asignaciones[0]?.inventario_id || "",
      asignaciones_inventario: asignaciones,
      fecha_vencimiento_cliente: expirationDate,
    }),
  });
  const orderIndex = orders.findIndex((order) => order.pedido_id === orderId);

  if (orderIndex >= 0 && result.order) {
    orders[orderIndex] = normalizeInventoryOrder(result.order);
  }

  const updatedItems = Array.isArray(result.items) && result.items.length ? result.items : [result.item].filter(Boolean);
  updatedItems.map(normalizeInventoryItem).forEach((updatedItem) => {
    const itemIndex = inventoryItems.findIndex((item) => item.inventario_id === updatedItem.inventario_id);
    if (itemIndex >= 0) {
      inventoryItems[itemIndex] = updatedItem;
    }
  });

  renderOrders();
  renderInventoryList();
  renderReports();
  renderProviderPurchases();
  fillInventoryForm(inventoryItems.find((item) => item.inventario_id === selectedInventoryId) || defaultInventoryItem);
  setAssignmentMessage(container, "");
  setStatus(`Inventario asignado y pedido ${orderId} entregado.`);
}

function setAssignmentMessage(container, message, isError = false) {
  const messageElement = container?.querySelector(".assignment-message");

  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
  messageElement.classList.toggle("is-error", isError);
}

function normalizeInventoryOrder(order) {
  return {
    ...order,
    canal_venta: order.canal_venta || "web",
    inventario_id: order.inventario_id || "",
    proveedor: order.proveedor || "",
    costo_proveedor: order.costo_proveedor ?? "",
    fecha_entrega: order.fecha_entrega || "",
    fecha_vencimiento_cliente: order.fecha_vencimiento_cliente || "",
    datos_entrega: order.datos_entrega || "",
    url_producto: order.url_producto || "",
    plantilla_entrega: order.plantilla_entrega || "",
    asignaciones_inventario: normalizeOrderAssignments(order.asignaciones_inventario),
  };
}

async function saveProduct(product) {
  const isEditing = products.some((item) => item.id === selectedId);
  const url = isEditing ? `/api/admin/productos/${encodeURIComponent(selectedId)}` : "/api/admin/productos";
  const method = isEditing ? "PUT" : "POST";

  const saved = await apiRequest(url, {
    method,
    body: JSON.stringify(product),
  });

  const existingIndex = products.findIndex((item) => item.id === selectedId);

  if (existingIndex >= 0) {
    products[existingIndex] = saved;
  } else {
    products.push(saved);
  }

  selectedId = saved.id;
  updateJsonOutput();
  fillForm(saved);
  markChanged(false);
  setStatus("Producto guardado en el catalogo.");
}

function downloadJson() {
  updateJsonOutput();

  const blob = new Blob([getJsonText()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "productos.json";
  link.click();
  URL.revokeObjectURL(url);
  setStatus("Descarga lista.");
}

function openDeleteModal() {
  const selected = products.find((product) => product.id === selectedId);

  if (!selected) {
    setStatus("Selecciona un producto antes de eliminar.", true);
    return;
  }

  deleteMessage.textContent = `Vas a eliminar "${selected.nombre}" del catalogo.`;
  confirmDeleteCheck.checked = false;
  confirmDeleteButton.disabled = true;
  deleteModal.classList.add("is-open");
  deleteModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeDeleteModal() {
  deleteModal.classList.remove("is-open");
  deleteModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

document.querySelector("#loadCatalogButton")?.addEventListener("click", loadProducts);
loadDashboardButton?.addEventListener("click", refreshDashboardData);
loadReportsButton?.addEventListener("click", refreshOperationalData);
loadOrdersButton?.addEventListener("click", loadOrders);
loadInventoryButton?.addEventListener("click", loadInventory);
loadSuppliersButton?.addEventListener("click", loadSuppliers);
loadRenewalsButton?.addEventListener("click", loadRenewals);
loadTemplatesButton?.addEventListener("click", loadTemplates);
loadAuditButton?.addEventListener("click", loadAuditEvents);

manualSaleProductSelect?.addEventListener("change", () => {
  const selectedOption = manualSaleProductSelect.selectedOptions?.[0];
  const priceField = manualSaleForm?.elements.namedItem("producto_precio");

  if (priceField && !priceField.value && selectedOption?.dataset.price) {
    priceField.value = selectedOption.dataset.price;
  }
});

manualSaleForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await createManualSale();
  } catch (error) {
    setStatus(error.message, true);
  }
});

adminViewLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    setAdminView(link.dataset.adminTarget || "compras");
  });
});

window.addEventListener("hashchange", () => {
  setAdminView(getInitialAdminView(), false);
});

newInventoryButton?.addEventListener("click", () => {
  selectedInventoryId = "";
  fillInventoryForm({ ...defaultInventoryItem });
});

document.querySelector("#newProductButton")?.addEventListener("click", () => {
  selectedId = "";
  fillForm(defaultProduct);
  markChanged(false);
});

productList?.addEventListener("click", (event) => {
  const item = event.target.closest(".admin-product-item");
  if (item) {
    selectProduct(item.dataset.id);
  }
});

searchProducts?.addEventListener("input", renderList);
searchOrders?.addEventListener("input", renderOrders);
orderStatusFilter?.addEventListener("change", renderOrders);
orderChannelFilter?.addEventListener("change", renderOrders);
orderStartDate?.addEventListener("change", renderOrders);
orderEndDate?.addEventListener("change", renderOrders);
clearOrderFiltersButton?.addEventListener("click", () => {
  if (searchOrders) {
    searchOrders.value = "";
  }
  if (orderStatusFilter) {
    orderStatusFilter.value = "";
  }
  if (orderChannelFilter) {
    orderChannelFilter.value = "";
  }
  if (orderStartDate) {
    orderStartDate.value = "";
  }
  if (orderEndDate) {
    orderEndDate.value = "";
  }
  renderOrders();
});
searchInventory?.addEventListener("input", renderInventoryList);
inventoryStatusFilter?.addEventListener("change", renderInventoryList);
searchProviders?.addEventListener("input", renderProviderList);
searchProviderPurchases?.addEventListener("input", renderProviderPurchases);
providerPurchaseStatusFilter?.addEventListener("change", renderProviderPurchases);
providerPurchaseInventoryFilter?.addEventListener("change", renderProviderPurchases);
searchRenewals?.addEventListener("input", renderRenewalList);
renewalStatusFilter?.addEventListener("change", renderRenewalList);
reportPeriodFilter?.addEventListener("change", renderReports);
reportStartDate?.addEventListener("change", renderReports);
reportEndDate?.addEventListener("change", renderReports);
reportProviderFilter?.addEventListener("change", renderReports);
reportChannelFilter?.addEventListener("change", renderReports);

clearReportFiltersButton?.addEventListener("click", () => {
  if (reportPeriodFilter) {
    reportPeriodFilter.value = "current-month";
  }
  if (reportStartDate) {
    reportStartDate.value = "";
  }
  if (reportEndDate) {
    reportEndDate.value = "";
  }
  if (reportProviderFilter) {
    reportProviderFilter.value = "";
  }
  if (reportChannelFilter) {
    reportChannelFilter.value = "";
  }
  renderReports();
});

document.querySelector("#dashboard")?.addEventListener("click", (event) => {
  const item = event.target.closest("[data-dashboard-target]");
  const target = item?.dataset.dashboardTarget;

  if (target && adminViewCopy[target]) {
    setAdminView(target);
  }
});

document.querySelector("#reportes")?.addEventListener("click", (event) => {
  const item = event.target.closest("[data-dashboard-target]");
  const target = item?.dataset.dashboardTarget;

  if (target && adminViewCopy[target]) {
    setAdminView(target);
  }
});

providerPurchaseSummary?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-provider-purchase-summary]");

  if (!card) {
    return;
  }

  const filter = card.dataset.providerPurchaseSummary;
  const filtersByCard = {
    pendiente: { status: "pendiente" },
    pagado: { status: "pagado" },
    parcial: { status: "parcial" },
    faltantes: { inventory: "faltantes" },
    alerta_vencimiento: { inventory: "alerta_vencimiento" },
    all: {},
  };

  setProviderPurchaseFilters(filtersByCard[filter] || {});
});

inventoryList?.addEventListener("click", (event) => {
  const item = event.target.closest(".admin-product-item");
  if (item) {
    selectInventoryItem(item.dataset.id);
  }
});

providerList?.addEventListener("click", (event) => {
  const item = event.target.closest("[data-provider-id]");
  if (item) {
    const provider = providers.find((entry) => entry.proveedor_id === item.dataset.providerId);
    fillProviderForm(provider || defaultProvider);
  }
});

templateList?.addEventListener("click", (event) => {
  const item = event.target.closest("[data-template-id]");

  if (!item) {
    return;
  }

  const template = messageTemplates.find((entry) => entry.id === item.dataset.templateId);
  fillTemplateForm(template || defaultMessageTemplate);
});

templateForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await saveTemplate();
  } catch (error) {
    setStatus(error.message, true);
  }
});

providerPurchaseList?.addEventListener("click", (event) => {
  const item = event.target.closest("[data-provider-purchase-id]");
  if (item) {
    const purchase = providerPurchases.find((entry) => entry.compra_id === item.dataset.providerPurchaseId);
    fillProviderPurchaseForm(purchase || defaultProviderPurchase);
  }
});

renewalList?.addEventListener("click", (event) => {
  const item = event.target.closest("[data-renewal-id]");
  if (item) {
    selectedRenewalId = item.dataset.renewalId;
    renderRenewals();
  }
});

renewalDueList?.addEventListener("click", async (event) => {
  const button = event.target.closest(".create-renewal-button");

  if (!button) {
    return;
  }

  button.disabled = true;

  try {
    await createRenewalFromInventory(button.dataset.inventoryId);
  } catch (error) {
    setStatus(error.message, true);
  }
});

renewalEditor?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await saveRenewal(event.target);
  } catch (error) {
    setStatus(error.message, true);
  }
});

renewalEditor?.addEventListener("click", async (event) => {
  const button = event.target.closest(".confirm-renewal-button");

  if (!button) {
    return;
  }

  const form = button.closest(".renewal-form");
  button.disabled = true;

  try {
    await confirmRenewal(form);
  } catch (error) {
    setStatus(error.message, true);
    button.disabled = false;
  }
});

inventoryProductSelect?.addEventListener("change", () => {
  const selectedProduct = products.find((product) => product.id === inventoryProductSelect.value);
  const nameField = inventoryForm?.elements.namedItem("producto_nombre");

  if (selectedProduct && nameField && !nameField.value.trim()) {
    nameField.value = selectedProduct.nombre;
  }
});

providerPurchaseProviderSelect?.addEventListener("change", () => {
  const selectedProvider = providers.find((provider) => provider.proveedor_id === providerPurchaseProviderSelect.value);
  const nameField = providerPurchaseForm?.elements.namedItem("proveedor_nombre");

  if (selectedProvider && nameField && !nameField.value.trim()) {
    nameField.value = selectedProvider.nombre;
  }
});

providerPurchaseProductSelect?.addEventListener("change", () => {
  const selectedProduct = products.find((product) => product.id === providerPurchaseProductSelect.value);
  const nameField = providerPurchaseForm?.elements.namedItem("producto_nombre");

  if (selectedProduct && nameField && !nameField.value.trim()) {
    nameField.value = selectedProduct.nombre;
  }
});

newProviderButton?.addEventListener("click", () => {
  selectedProviderId = "";
  fillProviderForm(defaultProvider);
});

newProviderPurchaseButton?.addEventListener("click", () => {
  selectedProviderPurchaseId = "";
  fillProviderPurchaseForm({ ...defaultProviderPurchase });
});

providerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const provider = getProviderFormItem();
  const isEditing = providers.some((entry) => entry.proveedor_id === selectedProviderId);
  const url = isEditing ? `/api/admin/proveedores/${encodeURIComponent(selectedProviderId)}` : "/api/admin/proveedores";

  if (!provider.nombre) {
    setStatus("Ingresa el nombre del proveedor.", true);
    return;
  }

  try {
    const saved = normalizeProvider(
      await apiRequest(url, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(provider),
      })
    );
    const index = providers.findIndex((entry) => entry.proveedor_id === selectedProviderId);
    if (index >= 0) {
      providers[index] = saved;
    } else {
      providers.push(saved);
    }
    providers.sort((left, right) => left.nombre.localeCompare(right.nombre));
    selectedProviderId = saved.proveedor_id;
    renderSupplierSelectOptions();
    fillProviderForm(saved);
    setStatus("Proveedor guardado.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

providerPurchaseForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const purchase = getProviderPurchaseFormItem();

  try {
    await saveProviderPurchase(purchase);
  } catch (error) {
    setStatus(error.message, true);
  }
});

providerPurchaseStatusButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!selectedProviderPurchaseId) {
      setStatus("Selecciona una compra de proveedor.", true);
      return;
    }

    const purchase = getProviderPurchaseFormItem();
    purchase.estado = button.dataset.providerPurchaseStatus;

    providerPurchaseStatusButtons.forEach((entry) => {
      entry.disabled = true;
    });

    try {
      const saved = await saveProviderPurchase(purchase, { forceUpdate: true });
      if (saved) {
        const statusLabels = {
          pagado: "pagada",
          recibido: "recibida",
          cancelado: "cancelada",
        };
        setStatus(`Compra ${saved.compra_id} ${statusLabels[saved.estado] || "actualizada"}.`);
      }
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      const current = providerPurchases.find((entry) => entry.compra_id === selectedProviderPurchaseId) || defaultProviderPurchase;
      updateProviderPurchaseActionState(current);
    }
  });
});

productForm?.addEventListener("input", () => {
  const nameField = productForm.elements.namedItem("nombre");
  const idField = productForm.elements.namedItem("id");

  if (idField && !idField.value.trim() && nameField?.value) {
    idField.value = slugify(nameField.value);
  }

  markChanged(true);
  updatePreview();
});

productForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const product = getFormProduct();

  if (!product.id || !product.nombre) {
    setStatus("Completa al menos ID y nombre.", true);
    return;
  }

  try {
    await saveProduct(product);
  } catch (error) {
    setStatus(error.message, true);
  }
});

inventoryForm?.elements.namedItem("fecha_compra")?.addEventListener("change", (event) => {
  if (selectedInventoryId) {
    return;
  }

  const providerExpirationField = inventoryForm?.elements.namedItem("fecha_vencimiento_proveedor");
  if (providerExpirationField) {
    providerExpirationField.value = addDaysToDateInput(event.target.value, 30);
  }

  const clientExpirationField = inventoryForm?.elements.namedItem("fecha_vencimiento_cliente");
  if (clientExpirationField) {
    clientExpirationField.value = addDaysToDateInput(event.target.value, 30);
  }
});

inventoryForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const item = getInventoryFormItem();

  if (!item.producto_id && !item.producto_nombre) {
    setStatus("Indica el producto de la cuenta.", true);
    return;
  }

  if (!item.proveedor) {
    setStatus("Indica el proveedor de la cuenta.", true);
    return;
  }

  try {
    await saveInventoryItem(item);
  } catch (error) {
    setStatus(error.message, true);
  }
});

releaseInventoryButton?.addEventListener("click", async () => {
  if (!selectedInventoryId) {
    setStatus("Selecciona una cuenta para liberar.", true);
    return;
  }

  try {
    const updated = normalizeInventoryItem(
      await apiRequest(`/api/admin/inventario/${encodeURIComponent(selectedInventoryId)}/liberar`, {
        method: "POST",
        body: JSON.stringify({ notas: "Liberada desde admin" }),
      })
    );
    const index = inventoryItems.findIndex((item) => item.inventario_id === selectedInventoryId);
    if (index >= 0) {
      inventoryItems[index] = updated;
    }
    renderInventoryList();
    renderProviderPurchases();
    fillInventoryForm(updated);
    renderOrders();
    setStatus(`Cuenta ${selectedInventoryId} liberada.`);
  } catch (error) {
    setStatus(error.message, true);
  }
});

renewInventoryButton?.addEventListener("click", async () => {
  if (!selectedInventoryId) {
    setStatus("Selecciona una cuenta para renovar.", true);
    return;
  }

  const item = getInventoryFormItem();

  try {
    const updated = normalizeInventoryItem(
      await apiRequest(`/api/admin/inventario/${encodeURIComponent(selectedInventoryId)}/renovar`, {
        method: "PUT",
        body: JSON.stringify({
          fecha_compra: item.fecha_compra,
          fecha_vencimiento_cliente: item.fecha_vencimiento_cliente,
          proveedor: item.proveedor,
          costo_proveedor: item.costo_proveedor,
          notas: "Renovacion registrada desde admin",
        }),
      })
    );
    const index = inventoryItems.findIndex((entry) => entry.inventario_id === selectedInventoryId);
    if (index >= 0) {
      inventoryItems[index] = updated;
    }
    renderInventoryList();
    renderProviderPurchases();
    fillInventoryForm(updated);
    await loadOrders();
    setStatus(`Cuenta ${selectedInventoryId} renovada.`);
  } catch (error) {
    setStatus(error.message, true);
  }
});

notifyRenewalButton?.addEventListener("click", () => {
  if (!selectedInventoryId) {
    setStatus("Selecciona una cuenta para avisar vencimiento.", true);
    return;
  }

  const item = inventoryItems.find((entry) => entry.inventario_id === selectedInventoryId) || getInventoryFormItem();
  const renewalSource = resolveRenewalSource(item);
  const href = buildWhatsAppUrl(renewalSource.cliente_contacto, buildRenewalMessage(renewalSource));

  if (!href) {
    setStatus("La cuenta seleccionada no tiene contacto del cliente.", true);
    return;
  }

  if (!openWhatsAppLink(href)) {
    setStatus("No se pudo abrir WhatsApp.", true);
    return;
  }

  setStatus(`Mensaje de vencimiento preparado para ${selectedInventoryId}.`);
});

cutServiceButton?.addEventListener("click", () => {
  if (!selectedInventoryId) {
    setStatus("Selecciona una cuenta para cortar el servicio.", true);
    return;
  }

  const item = inventoryItems.find((entry) => entry.inventario_id === selectedInventoryId) || getInventoryFormItem();
  const serviceCutSource = resolveRenewalSource(item);
  const href = buildWhatsAppUrl(serviceCutSource.cliente_contacto, buildServiceCutMessage(serviceCutSource));

  if (!href) {
    setStatus("La cuenta seleccionada no tiene contacto del cliente.", true);
    return;
  }

  if (!openWhatsAppLink(href)) {
    setStatus("No se pudo abrir WhatsApp.", true);
    return;
  }

  setStatus(`Mensaje de corte preparado para ${selectedInventoryId}.`);
});

dataUpdateButton?.addEventListener("click", () => {
  if (!selectedInventoryId) {
    setStatus("Selecciona una cuenta para actualizar datos.", true);
    return;
  }

  const item = inventoryItems.find((entry) => entry.inventario_id === selectedInventoryId) || getInventoryFormItem();
  const dataUpdateSource = resolveRenewalSource(item);
  const href = buildWhatsAppUrl(dataUpdateSource.cliente_contacto, buildDataUpdateMessage(dataUpdateSource));

  if (!href) {
    setStatus("La cuenta seleccionada no tiene contacto del cliente.", true);
    return;
  }

  if (!openWhatsAppLink(href)) {
    setStatus("No se pudo abrir WhatsApp.", true);
    return;
  }

  setStatus(`Mensaje de actualizacion de datos preparado para ${selectedInventoryId}.`);
});

toggleInventoryPasswordButton?.addEventListener("click", () => {
  const field = inventoryForm?.elements.namedItem("cuenta_clave");

  if (!field) {
    return;
  }

  const isVisible = field.type === "text";
  field.type = isVisible ? "password" : "text";
  toggleInventoryPasswordButton.textContent = isVisible ? "Mostrar" : "Ocultar";
  toggleInventoryPasswordButton.setAttribute("aria-pressed", isVisible ? "false" : "true");
});

document.querySelector("#duplicateProductButton")?.addEventListener("click", () => {
  const product = getFormProduct();
  product.id = `${product.id || "producto"}-copia`;
  product.nombre = `${product.nombre || "Producto"} copia`;
  selectedId = "";
  fillForm(product);
  markChanged(true);
  setStatus("Copia preparada. Revisa los datos y guarda el producto.");
});

document.querySelector("#deleteProductButton")?.addEventListener("click", openDeleteModal);

confirmDeleteCheck?.addEventListener("change", () => {
  confirmDeleteButton.disabled = !confirmDeleteCheck.checked;
});

confirmDeleteButton?.addEventListener("click", async () => {
  try {
    await apiRequest(`/api/admin/productos/${encodeURIComponent(selectedId)}`, { method: "DELETE" });
    products = products.filter((product) => product.id !== selectedId);
    selectedId = products[0]?.id || "";
    closeDeleteModal();
    markChanged(false);
    updateJsonOutput();
    renderList();
    fillForm(products[0] || defaultProduct);
    setStatus("Producto eliminado del catalogo.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.querySelectorAll("[data-cancel-delete]").forEach((button) => {
  button.addEventListener("click", closeDeleteModal);
});

document.querySelector("#downloadJsonButton")?.addEventListener("click", downloadJson);

orderList?.addEventListener("change", async (event) => {
  const assignmentSelect = event.target.closest(".inventory-assign-select");

  if (assignmentSelect) {
    const selectedOption = assignmentSelect.selectedOptions?.[0];
    const componentId = assignmentSelect.dataset.componentId || "principal";
    const container = assignmentSelect.closest(".inventory-assignment");
    const salePriceInput = [...(container?.querySelectorAll(".inventory-assign-sale-price") || [])].find(
      (input) => input.dataset.componentId === componentId
    );

    if (salePriceInput && !salePriceInput.value && selectedOption?.dataset.salePrice) {
      salePriceInput.value = selectedOption.dataset.salePrice;
    }
    return;
  }

  const select = event.target.closest(".order-status-select");

  if (!select) {
    return;
  }

  select.disabled = true;

  try {
    await updateOrderStatus(select.dataset.id, select.value);
  } catch (error) {
    setStatus(error.message, true);
    await loadOrders();
  }
});

orderList?.addEventListener("click", async (event) => {
  const button = event.target.closest(".assign-inventory-button");

  if (!button) {
    return;
  }

  const container = button.closest(".inventory-assignment");
  const orderId = container?.dataset.orderId;

  if (!container || !orderId) {
    return;
  }

  button.disabled = true;

  try {
    await assignInventoryToOrder(orderId, container);
  } catch (error) {
    setAssignmentMessage(container, error.message, true);
    setStatus(error.message, true);
    await Promise.all([loadOrders(), loadInventory()]);
  }
});

document.querySelector("#copyJsonButton")?.addEventListener("click", async () => {
  updateJsonOutput();

  try {
    await navigator.clipboard.writeText(jsonOutput.value);
    setStatus("JSON copiado al portapapeles.");
  } catch {
    jsonOutput.select();
    setStatus("No se pudo copiar automaticamente. Selecciona el texto del cuadro.", true);
  }
});

logoutButton?.addEventListener("click", async () => {
  try {
    await apiRequest("/api/admin/logout", { method: "POST", body: "{}" });
  } finally {
    window.location.href = "/login.html";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && deleteModal?.classList.contains("is-open")) {
    closeDeleteModal();
  }
});

loadAdminSession();
loadProducts();
loadOrders();
loadInventory();
loadSuppliers();
loadRenewals();
loadPaymentMethods();
loadTemplates();
loadAuditEvents();
setAdminView(getInitialAdminView(), false);
