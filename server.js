require("dotenv").config();

const crypto = require("node:crypto");
const path = require("node:path");
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const { createCatalogStore } = require("./src/services/catalog");
const JsonCatalogStore = require("./src/services/catalog/jsonCatalogStore");
const { normalizeProduct, validateProduct } = require("./src/services/catalog/validation");
const { createOrderStore } = require("./src/services/orders");
const { normalizeOrder, validateOrder, validateProof, VALID_STATUSES } = require("./src/services/orders/validation");
const { createInventoryStore } = require("./src/services/inventory");
const { createRenewalStore } = require("./src/services/renewals");
const { createPaymentMethodStore } = require("./src/services/paymentMethods");
const { createMessageTemplateStore } = require("./src/services/messageTemplates");
const { createUserStore } = require("./src/services/users");
const { createSupplierStore } = require("./src/services/suppliers");
const { createAuditStore } = require("./src/services/audit");
const {
  normalizeProvider,
  normalizeProviderPurchase,
  validateProvider,
  validateProviderPurchase,
} = require("./src/services/suppliers/validation");
const {
  normalizeRenewal,
  validateRenewal,
  validateRenewalConfirmation,
  RENEWAL_STATUSES,
} = require("./src/services/renewals/validation");
const FileSessionStore = require("./src/services/sessions/fileSessionStore");
const {
  normalizeInventoryItem,
  validateInventoryItem,
  INVENTORY_STATUSES,
} = require("./src/services/inventory/validation");
const {
  normalizeMessageTemplate,
  validateMessageTemplate,
} = require("./src/services/messageTemplates/validation");

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");
const isProduction = process.env.NODE_ENV === "production";
const host = process.env.HOST || (isProduction ? "0.0.0.0" : "127.0.0.1");
const trustProxy = process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1";
const catalogStore = createCatalogStore();
const localCatalogStore = new JsonCatalogStore(process.env.CATALOG_JSON_PATH || "productos.json");
const orderStore = createOrderStore();
const inventoryStore = createInventoryStore();
const renewalStore = createRenewalStore();
const paymentMethodStore = createPaymentMethodStore();
const messageTemplateStore = createMessageTemplateStore();
const userStore = createUserStore();
const supplierStore = createSupplierStore();
const auditStore = createAuditStore();

if (trustProxy) {
  app.set("trust proxy", 1);
}

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta configurar ${name} en .env.`);
  }

  return value;
}

const adminUser = getRequiredEnv("ADMIN_USER");
const adminPassword = getRequiredEnv("ADMIN_PASSWORD");
const sessionSecret = getRequiredEnv("SESSION_SECRET");
const sessionMaxAgeMs = 1000 * 60 * 60 * 8;
const sessionStore =
  isProduction || process.env.SESSION_STORE === "file"
    ? new FileSessionStore({
        directory: process.env.SESSION_FILE_DIR || ".sessions",
        ttlMs: sessionMaxAgeMs,
      })
    : undefined;
const configuredProofUploadMaxMb = Number(process.env.PROOF_UPLOAD_MAX_MB);
const proofUploadMaxMb = Number.isFinite(configuredProofUploadMaxMb) && configuredProofUploadMaxMb > 0 ? configuredProofUploadMaxMb : 8;
const proofUploadMaxBytes = Math.max(1, proofUploadMaxMb) * 1024 * 1024;
const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: proofUploadMaxBytes,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const isAllowed = file.mimetype === "application/pdf" || file.mimetype.startsWith("image/");

    if (!isAllowed) {
      const error = new Error("Solo se aceptan imagenes o PDF como comprobante.");
      error.statusCode = 400;
      callback(error);
      return;
    }

    callback(null, true);
  },
});

function setSecurityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

function createRateLimiter({ windowMs, max, message }) {
  const attempts = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const current = attempts.get(key);

    if (!current || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;

    if (current.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}

const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 100 : 8,
  message: "Demasiados intentos de acceso. Intenta nuevamente en unos minutos.",
});
const orderRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: "Demasiados pedidos desde esta conexion. Intenta nuevamente en unos minutos.",
});
const proofRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: "Demasiados comprobantes desde esta conexion. Intenta nuevamente en unos minutos.",
});

app.use(setSecurityHeaders);
app.use(express.json({ limit: "1mb" }));
app.use(
  session({
    name: "streamhub.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    ...(sessionStore ? { store: sessionStore } : {}),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: sessionMaxAgeMs,
    },
  })
);

function isAuthenticated(req) {
  return Boolean(req.session?.authenticated);
}

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) {
    next();
    return;
  }

  res.status(401).json({ error: "Debes iniciar sesion para administrar el catalogo." });
}

function getSessionPermissions(req) {
  const permissions = req.session?.adminUser?.permisos;

  if (Array.isArray(permissions)) {
    return permissions;
  }

  return String(permissions || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function hasPermission(req, permission) {
  const permissions = getSessionPermissions(req);
  return permissions.includes("*") || permissions.includes(permission);
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!isAuthenticated(req)) {
      res.status(401).json({ error: "Debes iniciar sesion para administrar el catalogo." });
      return;
    }

    if (hasPermission(req, permission)) {
      next();
      return;
    }

    res.status(403).json({ error: "No tienes permisos para realizar esta accion." });
  };
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function logUnexpectedError(error) {
  if (!error?.statusCode || error.statusCode >= 500) {
    console.error(error);
  }
}

function buildAuditEvent(req, { entidad, entidad_id, accion, antes = {}, despues = {}, detalles = {} }) {
  return {
    evento_id: `AUD-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    entidad,
    entidad_id,
    accion,
    estado_anterior: antes?.estado || "",
    estado_nuevo: despues?.estado || "",
    usuario: req.session?.adminUser?.usuario || req.session?.adminUser || adminUser || "admin",
    ip: req.ip || req.socket?.remoteAddress || "",
    detalles,
    creado_en: new Date().toISOString(),
  };
}

async function audit(req, event) {
  try {
    await auditStore.appendEvent(buildAuditEvent(req, event));
  } catch (error) {
    logUnexpectedError(error);
  }
}

function handleProofUpload(req, res, next) {
  proofUpload.single("comprobante_archivo")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: `El comprobante no debe superar ${proofUploadMaxMb} MB.` });
      return;
    }

    res.status(error.statusCode || 400).json({ error: error.message || "No se pudo leer el archivo del comprobante." });
  });
}

function proofFileToPayload(file) {
  if (!file) {
    return null;
  }

  return {
    nombre: file.originalname || "comprobante",
    tipo: file.mimetype || "application/octet-stream",
    tamano: file.size || 0,
    contenido_base64: file.buffer.toString("base64"),
  };
}

function maskValue(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  if (text.length <= 10) {
    return `${text.slice(0, 2)}***`;
  }

  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

async function readProducts() {
  try {
    const products = await catalogStore.listProducts();
    return products.map(normalizeProduct);
  } catch (error) {
    logUnexpectedError(error);
    const products = await localCatalogStore.listProducts();
    return products.map(normalizeProduct);
  }
}

async function writeProducts(products) {
  const normalizedProducts = products.map(normalizeProduct);

  if (typeof catalogStore.saveProducts === "function") {
    try {
      return catalogStore.saveProducts(normalizedProducts);
    } catch (error) {
      logUnexpectedError(error);
    }
  }

  return localCatalogStore.saveProducts(normalizedProducts);
}

async function createProduct(product) {
  if (typeof catalogStore.createProduct === "function") {
    return normalizeProduct(await catalogStore.createProduct(product));
  }

  const products = await readProducts();
  if (products.some((item) => item.id === product.id)) {
    const error = new Error("Ya existe un producto con ese ID.");
    error.statusCode = 409;
    throw error;
  }

  products.push(product);
  await writeProducts(products);
  return product;
}

async function updateProduct(id, product) {
  if (typeof catalogStore.updateProduct === "function") {
    return normalizeProduct(await catalogStore.updateProduct(id, product));
  }

  const products = await readProducts();
  const index = products.findIndex((item) => item.id === id);

  if (index < 0) {
    const error = new Error("Producto no encontrado.");
    error.statusCode = 404;
    throw error;
  }

  if (products.some((item, itemIndex) => item.id === product.id && itemIndex !== index)) {
    const error = new Error("Ya existe un producto con ese ID.");
    error.statusCode = 409;
    throw error;
  }

  products[index] = product;
  await writeProducts(products);
  return product;
}

async function deleteProduct(id) {
  if (typeof catalogStore.deleteProduct === "function") {
    await catalogStore.deleteProduct(id);
    return;
  }

  const products = await readProducts();
  const nextProducts = products.filter((item) => item.id !== id);

  if (nextProducts.length === products.length) {
    const error = new Error("Producto no encontrado.");
    error.statusCode = 404;
    throw error;
  }

  await writeProducts(nextProducts);
}

async function readInventory() {
  const items = await inventoryStore.listItems();
  return items.map(normalizeInventoryItem);
}

async function readProductsWithStock() {
  const products = await readProducts();
  const inventory = await readInventory().catch((error) => {
    logUnexpectedError(error);
    return [];
  });

  return products
    .map((product) => {
    const stock = getProductStock(product, products, inventory);
    const venderSinStock = isSellEnabled(product.vender);
    const available = product.estado === "disponible" && (stock > 0 || venderSinStock);

    return {
      ...product,
      stock_disponible: stock,
      vender: venderSinStock ? "si" : "no",
      estado: available ? "disponible" : "agotado",
    };
    })
    .sort((left, right) => {
      const leftOrder = Number.isFinite(Number(left.orden)) ? Number(left.orden) : 999;
      const rightOrder = Number.isFinite(Number(right.orden)) ? Number(right.orden) : 999;
      return leftOrder - rightOrder || String(left.nombre || "").localeCompare(String(right.nombre || ""));
    });
}

function isSellEnabled(value) {
  return String(value || "").trim().toLowerCase() === "si";
}

function getProductStock(product, products, inventory) {
  const components = getProductComponents(product, products);

  if (components.length === 0) {
    return 0;
  }

  return Math.min(...components.map((component) => countAvailableInventoryForComponent(inventory, component)));
}

function getProductComponents(product, products) {
  const explicit = normalizeProductComponents(product, { producto_id: product?.id || "", producto_nombre: product?.nombre || "" });

  if (Array.isArray(product?.componentes) && product.componentes.length > 0) {
    return explicit;
  }

  const comboParts = String(product?.nombre || "")
    .replace(/^combo\s+/i, "")
    .split(/\s+\+\s+|\s+y\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (comboParts.length > 1) {
    return comboParts.map((name, index) => {
      const matchedProduct = products.find((entry) => slugify(entry.nombre) === slugify(name) || productValueMatches(entry.id, name));

      return {
        componente_id: matchedProduct?.id || slugify(name) || `componente-${index + 1}`,
        componente_nombre: matchedProduct?.nombre || name,
        producto_id: matchedProduct?.id || slugify(name),
      };
    });
  }

  return explicit;
}

function countAvailableInventoryForComponent(inventory, component) {
  return inventory.filter((item) => item.estado === "disponible" && inventoryMatchesComponent(item, component, {})).length;
}

async function createInventoryItem(item) {
  const normalized = normalizeInventoryItem(item);
  const validationError = validateInventoryItem(normalized);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  if (typeof inventoryStore.createItem === "function") {
    return normalizeInventoryItem(await inventoryStore.createItem(normalized));
  }

  const error = new Error("El almacenamiento de inventario no permite crear cuentas.");
  error.statusCode = 500;
  throw error;
}

async function updateInventoryItem(id, patch) {
  const normalizedPatch = normalizeInventoryItem({ ...patch, inventario_id: id, actualizado_en: new Date().toISOString() });

  if (!INVENTORY_STATUSES.includes(normalizedPatch.estado)) {
    const error = new Error("Estado de inventario no soportado.");
    error.statusCode = 400;
    throw error;
  }

  return normalizeInventoryItem(await inventoryStore.updateItem(id, normalizedPatch));
}

function normalizeProductComponents(product, order) {
  const explicit = Array.isArray(product?.componentes) ? product.componentes : [];
  const components = explicit
    .map((component, index) => ({
      componente_id: String(component.id || component.componente_id || component.producto_id || `componente-${index + 1}`).trim(),
      componente_nombre: String(component.nombre || component.componente_nombre || component.producto_nombre || component.producto_id || "").trim(),
      producto_id: String(component.producto_id || component.id || "").trim(),
    }))
    .filter((component) => component.componente_nombre || component.producto_id);

  if (components.length > 0) {
    return components;
  }

  return [
    {
      componente_id: "principal",
      componente_nombre: order.producto_nombre || product?.nombre || order.producto_id || "Producto",
      producto_id: order.producto_id || product?.id || "",
    },
  ];
}

function normalizeAssignmentRequests(payload, components) {
  const byComponent = new Map(components.map((component) => [component.componente_id, component]));
  let assignments = Array.isArray(payload.asignaciones_inventario) ? payload.asignaciones_inventario : [];

  if (assignments.length === 0 && payload.inventario_id) {
    assignments = [
      {
        componente_id: components[0]?.componente_id || "principal",
        inventario_id: payload.inventario_id,
      },
    ];
  }

  return assignments.map((assignment, index) => {
    const component =
      byComponent.get(String(assignment.componente_id || "").trim()) ||
      components[index] ||
      components.find((entry) => entry.producto_id && entry.producto_id === assignment.producto_id) ||
      {};

    return {
      componente_id: String(assignment.componente_id || component.componente_id || `componente-${index + 1}`).trim(),
      componente_nombre: String(assignment.componente_nombre || component.componente_nombre || "").trim(),
      producto_id: String(assignment.producto_id || component.producto_id || "").trim(),
      inventario_id: String(assignment.inventario_id || "").trim(),
      perfil_nombre: String(assignment.perfil_nombre || "").trim(),
      pin: String(assignment.pin || "").trim(),
      precio_venta: assignment.precio_venta === undefined || assignment.precio_venta === null ? "" : assignment.precio_venta,
      costo_proveedor: assignment.costo_proveedor === undefined || assignment.costo_proveedor === null ? "" : assignment.costo_proveedor,
      fecha_vencimiento_cliente: String(assignment.fecha_vencimiento_cliente || payload.fecha_vencimiento_cliente || "").trim(),
      notas_entrega: String(assignment.notas_entrega || payload.notas_entrega || "").trim(),
    };
  });
}

function inventoryMatchesComponent(item, component, order) {
  const componentProductId = String(component.producto_id || "").trim();
  const componentName = String(component.componente_nombre || "").trim();
  const orderProductId = String(order.producto_id || "").trim();
  const orderProductName = String(order.producto_nombre || "").trim();
  const itemProductId = String(item.producto_id || "").trim();
  const itemProductName = String(item.producto_nombre || "").trim();

  if (!itemProductId && !itemProductName) {
    return true;
  }

  if (componentProductId || componentName) {
    return [componentProductId, componentName]
      .filter(Boolean)
      .some((target) => productValueMatches(itemProductId, target) || productValueMatches(itemProductName, target));
  }

  if (orderProductId) {
    return productValueMatches(itemProductId, orderProductId) || productValueMatches(itemProductName, orderProductId);
  }

  return Boolean(
    [orderProductName].filter(Boolean).some((name) => productValueMatches(itemProductId, name) || productValueMatches(itemProductName, name))
  );
}

function productValueMatches(value, target) {
  const valueSlug = slugify(value);
  const targetSlug = slugify(target);

  if (!valueSlug || !targetSlug) {
    return false;
  }

  return valueSlug === targetSlug || (targetSlug.length >= 3 && valueSlug.includes(targetSlug)) || (valueSlug.length >= 3 && targetSlug.includes(valueSlug));
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildDeliveryData(item, notasEntrega) {
  return [item.cuenta_usuario, item.perfil_nombre ? `Perfil: ${item.perfil_nombre}` : "", item.pin ? `PIN: ${item.pin}` : "", notasEntrega]
    .filter(Boolean)
    .join(" | ");
}

function toMoney(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : "";
}

function getCatalogPriceForAssignment(assignment, item, products) {
  const product = products.find(
    (entry) =>
      productValueMatches(entry.id, assignment.producto_id || item.producto_id) ||
      productValueMatches(entry.nombre, assignment.componente_nombre || item.producto_nombre)
  );
  return toMoney(product?.precio);
}

function allocateAssignmentPrices(order, assignmentRequests, selectedItems, products) {
  const orderTotal = Number(order.producto_precio);
  const basePrices = assignmentRequests.map((assignment, index) => getCatalogPriceForAssignment(assignment, selectedItems[index], products));
  const manualPrices = assignmentRequests.map((assignment) => toMoney(assignment.precio_venta));
  const suggestedPrices = selectedItems.map((item) => toMoney(item.precio_venta_sugerido));
  const manualTotal = manualPrices.reduce((total, value) => (Number.isFinite(Number(value)) ? total + Number(value) : total), 0);
  const missingIndexes = assignmentRequests
    .map((_assignment, index) => index)
    .filter((index) => manualPrices[index] === "" && suggestedPrices[index] === "");
  const baseTotal = missingIndexes.reduce((total, index) => (Number.isFinite(Number(basePrices[index])) ? total + Number(basePrices[index]) : total), 0);
  const remainingTotal = Number.isFinite(orderTotal) && orderTotal > 0 ? Math.max(orderTotal - manualTotal, 0) : "";
  let assignedTotal = 0;

  return assignmentRequests.map((assignment, index) => {
    const basePrice = basePrices[index];
    let salePrice = manualPrices[index] !== "" ? manualPrices[index] : suggestedPrices[index] !== "" ? suggestedPrices[index] : basePrice;

    if (manualPrices[index] === "" && suggestedPrices[index] === "" && Number.isFinite(Number(remainingTotal)) && remainingTotal > 0) {
      const isLastMissing = missingIndexes[missingIndexes.length - 1] === index;

      if (isLastMissing) {
        salePrice = toMoney(remainingTotal - assignedTotal);
      } else if (baseTotal > 0 && Number.isFinite(Number(basePrice))) {
        salePrice = toMoney(remainingTotal * (Number(basePrice) / baseTotal));
      } else {
        salePrice = toMoney(remainingTotal / (missingIndexes.length || 1));
      }
      assignedTotal += Number(salePrice) || 0;
    }

    return {
      precio_lista: basePrice,
      precio_venta: salePrice,
    };
  });
}

async function assignInventoryToOrder(orderId, inventoryId, payload = {}) {
  const now = new Date().toISOString();
  const fechaEntrega = String(payload.fecha_entrega || now).trim();

  const products = await readProducts();
  const existingOrders = (await orderStore.listOrders()).map(normalizeOrder);
  const existingOrder = existingOrders.find((entry) => entry.pedido_id === orderId);
  const product = products.find((entry) => entry.id === existingOrder?.producto_id);
  const components = normalizeProductComponents(product, existingOrder || { producto_id: "", producto_nombre: "" });
  const assignmentRequests = normalizeAssignmentRequests({ ...payload, inventario_id: inventoryId || payload.inventario_id }, components);

  if (assignmentRequests.length === 0 || assignmentRequests.some((assignment) => !assignment.inventario_id)) {
    const error = new Error("Selecciona una cuenta disponible para cada componente del pedido.");
    error.statusCode = 400;
    throw error;
  }

  if (assignmentRequests.length < components.length) {
    const error = new Error("Completa una cuenta para cada componente del combo.");
    error.statusCode = 400;
    throw error;
  }

  const uniqueInventoryIds = new Set(assignmentRequests.map((assignment) => assignment.inventario_id));
  if (uniqueInventoryIds.size !== assignmentRequests.length) {
    const error = new Error("No puedes asignar la misma cuenta a mas de un componente.");
    error.statusCode = 400;
    throw error;
  }

  const order = existingOrder;

  if (!order) {
    const error = new Error("Pedido no encontrado.");
    error.statusCode = 404;
    throw error;
  }

  if (order.estado !== "pagado") {
    const error = new Error("Solo puedes asignar inventario a un pedido pagado y pendiente de entrega.");
    error.statusCode = 400;
    throw error;
  }

  const inventory = await readInventory();
  const itemsById = new Map(inventory.map((entry) => [entry.inventario_id, entry]));
  const selectedItems = assignmentRequests.map((assignment) => itemsById.get(assignment.inventario_id));

  if (selectedItems.some((item) => !item)) {
    const error = new Error("Cuenta de inventario no encontrada.");
    error.statusCode = 404;
    throw error;
  }

  if (selectedItems.some((item) => item.estado !== "disponible")) {
    const error = new Error("La cuenta seleccionada no esta disponible.");
    error.statusCode = 400;
    throw error;
  }

  const incompatible = assignmentRequests.find((assignment, index) => !inventoryMatchesComponent(selectedItems[index], assignment, order));
  if (incompatible) {
    const error = new Error(`La cuenta seleccionada no corresponde al componente ${incompatible.componente_nombre || incompatible.producto_id}.`);
    error.statusCode = 400;
    throw error;
  }

  const remoteAssignmentRequests = assignmentRequests.map((assignment, index) => ({
    ...assignment,
    producto_id: selectedItems[index]?.producto_id || assignment.producto_id,
  }));

  if (typeof inventoryStore.assignManyToOrder === "function") {
    const data = await inventoryStore.assignManyToOrder(orderId, remoteAssignmentRequests, {
      fecha_entrega: fechaEntrega,
      actualizado_en: now,
    });

    return {
      order: normalizeOrder(data.order || {}),
      item: normalizeInventoryItem(data.item || data.items?.[0] || {}),
      items: Array.isArray(data.items) ? data.items.map(normalizeInventoryItem) : [],
    };
  }

  const assignmentPricing = allocateAssignmentPrices(order, assignmentRequests, selectedItems, products);
  const assignmentDetails = assignmentRequests.map((assignment, index) => {
    const item = selectedItems[index];
    const pricing = assignmentPricing[index];
    const deliveryItem = {
      ...item,
      perfil_nombre: assignment.perfil_nombre || item.perfil_nombre,
      pin: assignment.pin || item.pin,
    };
    const fechaVencimientoCliente = assignment.fecha_vencimiento_cliente || item.fecha_vencimiento_cliente;
    const datosEntrega = buildDeliveryData(deliveryItem, assignment.notas_entrega);

    return {
      componente_id: assignment.componente_id,
      componente_nombre: assignment.componente_nombre || item.producto_nombre || item.producto_id,
      producto_id: assignment.producto_id || item.producto_id,
      inventario_id: item.inventario_id,
      proveedor: item.proveedor,
      costo_proveedor: assignment.costo_proveedor !== "" ? assignment.costo_proveedor : item.costo_proveedor,
      precio_lista: pricing.precio_lista,
      precio_venta: pricing.precio_venta,
      margen_estimado: toMoney(Number(pricing.precio_venta) - Number(assignment.costo_proveedor !== "" ? assignment.costo_proveedor : item.costo_proveedor)),
      fecha_entrega: fechaEntrega,
      fecha_vencimiento_cliente: fechaVencimientoCliente,
      datos_entrega: datosEntrega,
      cuenta_usuario: deliveryItem.cuenta_usuario,
      cuenta_clave: deliveryItem.cuenta_clave,
      url_producto: deliveryItem.url_producto,
      perfil_nombre: deliveryItem.perfil_nombre,
      pin: deliveryItem.pin,
      notas_entrega: assignment.notas_entrega,
    };
  });
  const updatedItems = selectedItems.map((item, index) =>
    normalizeInventoryItem({
      ...item,
      estado: "ocupado",
      pedido_id: order.pedido_id,
      cliente_nombre: order.cliente_nombre,
      cliente_contacto: order.cliente_contacto,
      perfil_nombre: assignmentDetails[index].perfil_nombre,
      pin: assignmentDetails[index].pin,
      precio_venta_sugerido: assignmentDetails[index].precio_venta,
      fecha_entrega: fechaEntrega,
      fecha_vencimiento_cliente: assignmentDetails[index].fecha_vencimiento_cliente,
      notas: [item.notas, assignmentDetails[index].componente_nombre ? `Componente: ${assignmentDetails[index].componente_nombre}` : "", assignmentDetails[index].notas_entrega]
        .filter(Boolean)
        .join(" | "),
      actualizado_en: now,
    })
  );
  const firstAssignment = assignmentDetails[0];
  const updatedOrder = normalizeOrder({
    ...order,
    estado: "entregado",
    inventario_id: firstAssignment.inventario_id,
    proveedor: assignmentDetails.map((assignment) => assignment.proveedor).filter(Boolean).join(" + "),
    costo_proveedor: assignmentDetails.reduce((total, assignment) => {
      const value = Number(assignment.costo_proveedor);
      return Number.isFinite(value) ? total + value : total;
    }, 0) || firstAssignment.costo_proveedor,
    fecha_entrega: fechaEntrega,
    fecha_vencimiento_cliente: firstAssignment.fecha_vencimiento_cliente,
    datos_entrega: assignmentDetails
      .map((assignment) => [assignment.componente_nombre, assignment.datos_entrega].filter(Boolean).join(": "))
      .filter(Boolean)
      .join(" || "),
    cuenta_usuario: firstAssignment.cuenta_usuario || "",
    cuenta_clave: firstAssignment.cuenta_clave || "",
    url_producto: firstAssignment.url_producto || "",
    asignaciones_inventario: assignmentDetails,
    actualizado_en: now,
  });

  const savedItems = [];
  for (const updatedItem of updatedItems) {
    savedItems.push(normalizeInventoryItem(await inventoryStore.updateItem(updatedItem.inventario_id, updatedItem)));
  }
  const savedOrder = normalizeOrder(await orderStore.updateOrder(order.pedido_id, updatedOrder));

  return { order: savedOrder, item: savedItems[0], items: savedItems };
}

async function releaseInventoryItem(id, payload = {}) {
  const now = new Date().toISOString();
  const items = await readInventory();
  const item = items.find((entry) => entry.inventario_id === id);

  if (!item) {
    const error = new Error("Cuenta de inventario no encontrada.");
    error.statusCode = 404;
    throw error;
  }

  return normalizeInventoryItem(
    await inventoryStore.updateItem(id, {
      ...item,
      estado: "disponible",
      pedido_id: "",
      cliente_nombre: "",
      cliente_contacto: "",
      fecha_entrega: "",
      notas: [item.notas, String(payload.notas || "").trim()].filter(Boolean).join(" | "),
      actualizado_en: now,
    })
  );
}

async function renewInventoryItem(id, payload = {}) {
  const now = new Date().toISOString();
  const items = await readInventory();
  const item = items.find((entry) => entry.inventario_id === id);

  if (!item) {
    const error = new Error("Cuenta de inventario no encontrada.");
    error.statusCode = 404;
    throw error;
  }

  const patch = normalizeInventoryItem({
    ...item,
    fecha_compra: payload.fecha_compra ?? item.fecha_compra,
    fecha_vencimiento_cliente: payload.fecha_vencimiento_cliente ?? item.fecha_vencimiento_cliente,
    proveedor: payload.proveedor ?? item.proveedor,
    costo_proveedor: payload.costo_proveedor ?? item.costo_proveedor,
    notas: [item.notas, String(payload.notas || "").trim()].filter(Boolean).join(" | "),
    actualizado_en: now,
  });
  const updatedItem = normalizeInventoryItem(await inventoryStore.updateItem(id, patch));

  if (updatedItem.pedido_id && updatedItem.fecha_vencimiento_cliente) {
    const orders = (await orderStore.listOrders()).map(normalizeOrder);
    const order = orders.find((entry) => entry.pedido_id === updatedItem.pedido_id);
    const asignaciones_inventario = (order?.asignaciones_inventario || []).map((assignment) =>
      assignment.inventario_id === updatedItem.inventario_id
        ? {
            ...assignment,
            proveedor: updatedItem.proveedor,
            costo_proveedor: updatedItem.costo_proveedor,
            fecha_vencimiento_cliente: updatedItem.fecha_vencimiento_cliente,
          }
        : assignment
    );

    await orderStore.updateOrder(updatedItem.pedido_id, {
      fecha_vencimiento_cliente: updatedItem.fecha_vencimiento_cliente,
      proveedor: updatedItem.proveedor,
      costo_proveedor: updatedItem.costo_proveedor,
      ...(asignaciones_inventario.length ? { asignaciones_inventario } : {}),
      actualizado_en: now,
    });
  }

  return updatedItem;
}

async function readRenewals() {
  const renewals = await renewalStore.listRenewals();
  return renewals.map(normalizeRenewal);
}

async function readProviders() {
  const providers = await supplierStore.listProviders();
  return providers.map(normalizeProvider);
}

async function saveProvider(payload = {}, id = "") {
  const provider = normalizeProvider({
    ...payload,
    proveedor_id: payload.proveedor_id || id,
    actualizado_en: new Date().toISOString(),
  });
  const validationError = validateProvider(provider);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  if (id) {
    return normalizeProvider(await supplierStore.updateProvider(id, provider));
  }

  return normalizeProvider(await supplierStore.createProvider(provider));
}

async function readProviderPurchases() {
  const purchases = await supplierStore.listPurchases();
  return purchases.map(normalizeProviderPurchase);
}

async function createInventoryFromProviderPurchase(purchase) {
  if (purchase.estado !== "recibido") {
    return [];
  }

  const quantity = Number(purchase.cantidad);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return [];
  }

  const [providers, inventory] = await Promise.all([readProviders().catch(() => []), readInventory().catch(() => [])]);
  const provider = providers.find((entry) => entry.proveedor_id === purchase.proveedor_id);
  const existingCount = inventory.filter((item) => item.compra_id === purchase.compra_id).length;
  const missingCount = Math.max(quantity - existingCount, 0);

  if (missingCount === 0) {
    return [];
  }

  const created = [];
  for (let index = 0; index < missingCount; index += 1) {
    const item = await createInventoryItem({
      compra_id: purchase.compra_id,
      producto_id: purchase.producto_id,
      producto_nombre: purchase.producto_nombre,
      proveedor: purchase.proveedor_nombre || provider?.nombre || purchase.proveedor_id,
      celular_proveedor: provider?.contacto || "",
      costo_proveedor: purchase.costo_unitario,
      cuenta_usuario: purchase.cuenta_usuario,
      cuenta_clave: purchase.cuenta_clave,
      url_producto: purchase.url_producto,
      referencia_compra: purchase.referencia_pago || purchase.compra_id,
      fecha_compra: purchase.fecha_compra,
      fecha_vencimiento_proveedor: purchase.fecha_vencimiento_proveedor,
      estado: "pendiente_revision",
      estado_control: "Generado desde compra recibida",
      notas: [purchase.notas, `Compra proveedor: ${purchase.compra_id}`].filter(Boolean).join(" | "),
    });
    created.push(item);
  }

  return created;
}

async function saveProviderPurchase(payload = {}, id = "") {
  const providers = await readProviders().catch(() => []);
  const provider = providers.find((entry) => entry.proveedor_id === payload.proveedor_id);
  const cantidad = Number(payload.cantidad);
  const costoTotal = Number(payload.costo_total);
  const costoUnitario =
    payload.costo_unitario !== "" && payload.costo_unitario !== undefined && payload.costo_unitario !== null
      ? payload.costo_unitario
      : Number.isFinite(cantidad) && cantidad > 0 && Number.isFinite(costoTotal)
        ? Math.round((costoTotal / cantidad) * 100) / 100
        : "";
  const purchase = normalizeProviderPurchase({
    ...payload,
    compra_id: payload.compra_id || id,
    proveedor_nombre: payload.proveedor_nombre || provider?.nombre || "",
    costo_unitario: costoUnitario,
    actualizado_en: new Date().toISOString(),
  });
  delete purchase.inventario_generado;
  const validationError = validateProviderPurchase(purchase);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  const savedPurchase = normalizeProviderPurchase(
    id ? await supplierStore.updatePurchase(id, purchase) : await supplierStore.createPurchase(purchase)
  );
  const remoteGeneratedCount = Number(savedPurchase.inventario_generado);
  const createdInventory = await createInventoryFromProviderPurchase(savedPurchase);

  return {
    ...savedPurchase,
    inventario_generado: (Number.isFinite(remoteGeneratedCount) ? remoteGeneratedCount : 0) + createdInventory.length,
  };
}

async function createRenewal(payload = {}) {
  const items = await readInventory();
  const item = items.find((entry) => entry.inventario_id === String(payload.inventario_id || "").trim());

  if (!item) {
    const error = new Error("Cuenta de inventario no encontrada.");
    error.statusCode = 404;
    throw error;
  }
  const linkedOrder = item.pedido_id
    ? (await orderStore.listOrders()).map(normalizeOrder).find((entry) => entry.pedido_id === item.pedido_id)
    : null;
  const clienteNombre = payload.cliente_nombre || item.cliente_nombre || linkedOrder?.cliente_nombre || "";
  const clienteContacto = payload.cliente_contacto || item.cliente_contacto || linkedOrder?.cliente_contacto || "";
  const productoNombre = payload.producto_nombre || item.producto_nombre || linkedOrder?.producto_nombre || item.producto_id;
  const defaultAmount = item.precio_venta_sugerido || linkedOrder?.producto_precio || "";

  if (linkedOrder && (!item.cliente_nombre || !item.cliente_contacto)) {
    try {
      await inventoryStore.updateItem(item.inventario_id, {
        ...item,
        cliente_nombre: item.cliente_nombre || linkedOrder.cliente_nombre,
        cliente_contacto: item.cliente_contacto || linkedOrder.cliente_contacto,
        actualizado_en: new Date().toISOString(),
      });
    } catch (error) {
      logUnexpectedError(error);
    }
  }

  const renewal = normalizeRenewal({
    ...payload,
    pedido_id: payload.pedido_id || item.pedido_id,
    cliente_nombre: clienteNombre,
    cliente_contacto: clienteContacto,
    producto_nombre: productoNombre,
    monto: payload.monto || defaultAmount,
    vencimiento_anterior: payload.vencimiento_anterior || item.fecha_vencimiento_cliente,
  });
  const validationError = validateRenewal(renewal);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  return normalizeRenewal(await renewalStore.createRenewal(renewal));
}

async function updateRenewal(id, payload = {}) {
  const current = (await readRenewals()).find((entry) => entry.renovacion_id === id);

  if (!current) {
    const error = new Error("Renovacion no encontrada.");
    error.statusCode = 404;
    throw error;
  }

  const renewal = normalizeRenewal({
    ...current,
    ...payload,
    renovacion_id: current.renovacion_id,
    actualizado_en: new Date().toISOString(),
  });
  const validationError = validateRenewal(renewal);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  return normalizeRenewal(await renewalStore.updateRenewal(id, renewal));
}

async function confirmRenewal(id, payload = {}) {
  const current = (await readRenewals()).find((entry) => entry.renovacion_id === id);

  if (!current) {
    const error = new Error("Renovacion no encontrada.");
    error.statusCode = 404;
    throw error;
  }

  if (current.estado === "renovado") {
    const error = new Error("La renovacion ya fue confirmada.");
    error.statusCode = 409;
    throw error;
  }

  const now = new Date().toISOString();
  const renewal = normalizeRenewal({
    ...current,
    ...payload,
    renovacion_id: current.renovacion_id,
    estado: "renovado",
    fecha_pago: payload.fecha_pago || current.fecha_pago || now,
    fecha_confirmacion: now,
    actualizado_en: now,
  });
  const validationError = validateRenewal(renewal) || validateRenewalConfirmation(renewal);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  const updatedItem = await renewInventoryItem(renewal.inventario_id, {
    fecha_vencimiento_cliente: renewal.vencimiento_nuevo,
    notas: `Renovacion ${renewal.renovacion_id} confirmada`,
  });
  const savedRenewal = normalizeRenewal(await renewalStore.updateRenewal(id, renewal));

  return {
    renewal: savedRenewal,
    item: updatedItem,
  };
}

app.get("/api/productos", async (_req, res) => {
  try {
    res.json(await readProductsWithStock());
  } catch (error) {
    logUnexpectedError(error);
    res.status(500).json({ error: "No se pudo cargar el catalogo." });
  }
});

app.get("/api/health/productos", async (_req, res) => {
  try {
    const products = await readProductsWithStock();
    res.json({
      ok: true,
      count: products.length,
      sample: products.slice(0, 3).map((product) => ({
        id: product.id,
        nombre: product.nombre,
        estado: product.estado,
        stock_disponible: product.stock_disponible,
      })),
    });
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "No se pudo cargar el catalogo.",
      name: error.name || "",
      statusCode: error.statusCode || 500,
    });
  }
});

app.get("/api/metodos-pago", async (_req, res) => {
  try {
    res.json(await paymentMethodStore.listMethods());
  } catch (error) {
    logUnexpectedError(error);
    res.status(500).json({ error: "No se pudieron cargar los metodos de pago." });
  }
});

app.get("/api/health/config", (_req, res) => {
  const appsScriptUrl = String(process.env.APPS_SCRIPT_CATALOG_URL || "").trim();
  const adminToken = String(process.env.APPS_SCRIPT_ADMIN_TOKEN || "").trim();

  res.json({
    ok: true,
    runtime: {
      node_env: process.env.NODE_ENV || "",
      host,
      port,
      catalog_storage: process.env.CATALOG_STORAGE || "",
    },
    apps_script: {
      configured: Boolean(appsScriptUrl && adminToken),
      url_present: Boolean(appsScriptUrl),
      token_present: Boolean(adminToken),
      url_hint: maskValue(appsScriptUrl),
      token_hint: maskValue(adminToken),
    },
  });
});

app.get("/api/health/users", async (_req, res) => {
  try {
    const user = await userStore.authenticate("__healthcheck__", "__healthcheck__");
    res.json({
      ok: true,
      reachable: true,
      unexpected_match: Boolean(user),
    });
  } catch (error) {
    const message = String(error.message || "");
    const invalidCredentials = message.toLowerCase().includes("usuario") || message.toLowerCase().includes("contrasena");

    res.status(invalidCredentials ? 200 : error.statusCode || 500).json({
      ok: invalidCredentials,
      reachable: invalidCredentials,
      message: invalidCredentials ? "UsuariosAdmin responde correctamente." : "",
      error: invalidCredentials ? "" : message,
      name: error.name || "",
    });
  }
});

app.get("/api/admin/plantillas", requireAuth, async (_req, res) => {
  try {
    res.json(await messageTemplateStore.listTemplates());
  } catch (error) {
    logUnexpectedError(error);
    res.status(500).json({ error: "No se pudieron cargar las plantillas." });
  }
});

app.put("/api/admin/plantillas/:id", requirePermission("plantillas"), async (req, res) => {
  try {
    const template = normalizeMessageTemplate({ ...(req.body || {}), id: req.body?.id || req.params.id });
    const validationError = validateMessageTemplate(template);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const saved = await messageTemplateStore.updateTemplate(req.params.id, template);
    await audit(req, {
      entidad: "plantilla",
      entidad_id: saved.id,
      accion: "actualizar_plantilla",
      despues: saved,
      detalles: { nombre: saved.nombre },
    });
    res.json(saved);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo actualizar la plantilla." });
  }
});

app.get("/api/admin/session", (req, res) => {
  res.json({ authenticated: isAuthenticated(req), user: isAuthenticated(req) ? req.session.adminUser : null });
});

app.post("/api/admin/login", loginRateLimit, async (req, res) => {
  const { usuario, password } = req.body || {};

  let sheetUser = null;

  try {
    sheetUser = await userStore.authenticate(usuario, password);
  } catch (error) {
    logUnexpectedError(error);
  }

  if (sheetUser || (safeCompare(usuario || "", adminUser) && safeCompare(password || "", adminPassword))) {
    const sessionUser = sheetUser || {
      usuario: adminUser,
      nombre: "Administrador",
      rol: "admin",
      estado: "activo",
      permisos: ["*"],
    };
    req.session.authenticated = true;
    req.session.adminUser = sessionUser;
    res.json({ ok: true, user: sessionUser });
    return;
  }

  res.status(401).json({ error: "Usuario o contrasena incorrectos." });
});

app.post("/api/admin/logout", requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("streamhub.sid");
    res.json({ ok: true });
  });
});

app.get("/api/admin/productos", requireAuth, async (_req, res) => {
  try {
    const products = await readProducts();
    res.json(
      products.sort((left, right) => {
        const leftOrder = Number.isFinite(Number(left.orden)) ? Number(left.orden) : 999;
        const rightOrder = Number.isFinite(Number(right.orden)) ? Number(right.orden) : 999;
        return leftOrder - rightOrder || String(left.nombre || "").localeCompare(String(right.nombre || ""));
      })
    );
  } catch (error) {
    logUnexpectedError(error);
    res.status(500).json({ error: "No se pudo cargar el catalogo." });
  }
});

app.post("/api/admin/productos", requirePermission("productos"), async (req, res) => {
  try {
    const product = normalizeProduct(req.body);
    const validationError = validateProduct(product);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    res.status(201).json(await createProduct(product));
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo crear el producto." });
  }
});

app.put("/api/admin/productos/:id", requirePermission("productos"), async (req, res) => {
  try {
    const product = normalizeProduct({ ...req.body, id: req.body?.id || req.params.id });
    const validationError = validateProduct(product);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    res.json(await updateProduct(req.params.id, product));
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo actualizar el producto." });
  }
});

app.delete("/api/admin/productos/:id", requirePermission("productos"), async (req, res) => {
  try {
    await deleteProduct(req.params.id);
    res.status(204).end();
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo eliminar el producto." });
  }
});

app.get("/api/admin/inventario", requireAuth, async (_req, res) => {
  try {
    res.json(await readInventory());
  } catch (error) {
    logUnexpectedError(error);
    res.status(500).json({ error: "No se pudo cargar el inventario de cuentas." });
  }
});

app.post("/api/admin/inventario", requirePermission("inventario"), async (req, res) => {
  try {
    const item = await createInventoryItem(req.body || {});
    await audit(req, {
      entidad: "inventario",
      entidad_id: item.inventario_id,
      accion: "crear",
      despues: item,
      detalles: { producto: item.producto_nombre || item.producto_id, proveedor: item.proveedor },
    });
    res.status(201).json(item);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo crear la cuenta de inventario." });
  }
});

app.put("/api/admin/inventario/:id", requirePermission("inventario"), async (req, res) => {
  try {
    const before = (await readInventory()).find((entry) => entry.inventario_id === req.params.id) || {};
    const item = normalizeInventoryItem({ ...req.body, inventario_id: req.params.id });
    const validationError = validateInventoryItem(item);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const saved = await updateInventoryItem(req.params.id, item);
    await audit(req, {
      entidad: "inventario",
      entidad_id: saved.inventario_id,
      accion: "actualizar",
      antes: before,
      despues: saved,
      detalles: { producto: saved.producto_nombre || saved.producto_id, proveedor: saved.proveedor },
    });
    res.json(saved);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo actualizar la cuenta de inventario." });
  }
});

app.post("/api/admin/inventario/:id/liberar", requirePermission("inventario"), async (req, res) => {
  try {
    const before = (await readInventory()).find((entry) => entry.inventario_id === req.params.id) || {};
    const saved = await releaseInventoryItem(req.params.id, req.body || {});
    await audit(req, {
      entidad: "inventario",
      entidad_id: saved.inventario_id,
      accion: "liberar",
      antes: before,
      despues: saved,
      detalles: { pedido_id: before.pedido_id || "" },
    });
    res.json(saved);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo liberar la cuenta." });
  }
});

app.put("/api/admin/inventario/:id/renovar", requirePermission("inventario"), async (req, res) => {
  try {
    const before = (await readInventory()).find((entry) => entry.inventario_id === req.params.id) || {};
    const saved = await renewInventoryItem(req.params.id, req.body || {});
    await audit(req, {
      entidad: "inventario",
      entidad_id: saved.inventario_id,
      accion: "renovar",
      antes: before,
      despues: saved,
      detalles: { vencimiento_anterior: before.fecha_vencimiento_cliente || "", vencimiento_nuevo: saved.fecha_vencimiento_cliente || "" },
    });
    res.json(saved);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo renovar la cuenta." });
  }
});

app.get("/api/admin/renovaciones", requireAuth, async (_req, res) => {
  try {
    res.json(await readRenewals());
  } catch (error) {
    logUnexpectedError(error);
    res.status(500).json({ error: "No se pudieron cargar las renovaciones." });
  }
});

app.post("/api/admin/renovaciones", requirePermission("renovaciones"), async (req, res) => {
  try {
    const renewal = await createRenewal(req.body || {});
    await audit(req, {
      entidad: "renovacion",
      entidad_id: renewal.renovacion_id,
      accion: "crear",
      despues: renewal,
      detalles: { inventario_id: renewal.inventario_id, monto: renewal.monto },
    });
    res.status(201).json(renewal);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo crear la renovacion." });
  }
});

app.put("/api/admin/renovaciones/:id", requirePermission("renovaciones"), async (req, res) => {
  try {
    const before = (await readRenewals()).find((entry) => entry.renovacion_id === req.params.id) || {};
    const status = req.body?.estado;

    if (status && !RENEWAL_STATUSES.includes(status)) {
      res.status(400).json({ error: "Estado de renovacion no soportado." });
      return;
    }

    const renewal = await updateRenewal(req.params.id, req.body || {});
    await audit(req, {
      entidad: "renovacion",
      entidad_id: renewal.renovacion_id,
      accion: "actualizar",
      antes: before,
      despues: renewal,
      detalles: { inventario_id: renewal.inventario_id, monto: renewal.monto },
    });
    res.json(renewal);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo actualizar la renovacion." });
  }
});

app.post("/api/admin/renovaciones/:id/confirmar", requirePermission("renovaciones"), handleProofUpload, async (req, res) => {
  try {
    const before = (await readRenewals()).find((entry) => entry.renovacion_id === req.params.id) || {};
    const proofFile = proofFileToPayload(req.file);
    const payload = {
      ...(req.body || {}),
      comprobante_referencia: String(req.body?.comprobante_referencia || proofFile?.nombre || "").trim(),
      comprobante_archivo: proofFile,
    };

    if (proofFile && typeof renewalStore.submitProof === "function") {
      const savedRenewalProof = await renewalStore.submitProof(req.params.id, {
        comprobante_archivo: proofFile,
        comprobante_referencia: payload.comprobante_referencia,
        comprobante_notas: `Comprobante renovacion ${req.params.id}`,
      }).catch(() => null);

      if (savedRenewalProof?.comprobante_url) {
        payload.comprobante_url = savedRenewalProof.comprobante_url;
      }

      if (savedRenewalProof?.comprobante_notas) {
        payload.comprobante_notas = savedRenewalProof.comprobante_notas;
      }
    }

    const result = await confirmRenewal(req.params.id, payload);
    await audit(req, {
      entidad: "renovacion",
      entidad_id: result.renewal.renovacion_id,
      accion: "confirmar",
      antes: before,
      despues: result.renewal,
      detalles: { inventario_id: result.renewal.inventario_id, vencimiento_nuevo: result.renewal.vencimiento_nuevo },
    });
    res.json(result);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo confirmar la renovacion." });
  }
});

app.get("/api/admin/proveedores", requireAuth, async (_req, res) => {
  try {
    res.json(await readProviders());
  } catch (error) {
    logUnexpectedError(error);
    res.status(500).json({ error: "No se pudieron cargar los proveedores." });
  }
});

app.post("/api/admin/proveedores", requirePermission("proveedores"), async (req, res) => {
  try {
    const provider = await saveProvider(req.body || {});
    await audit(req, {
      entidad: "proveedor",
      entidad_id: provider.proveedor_id,
      accion: "crear",
      despues: provider,
      detalles: { nombre: provider.nombre },
    });
    res.status(201).json(provider);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo guardar el proveedor." });
  }
});

app.put("/api/admin/proveedores/:id", requirePermission("proveedores"), async (req, res) => {
  try {
    const before = (await readProviders()).find((entry) => entry.proveedor_id === req.params.id) || {};
    const provider = await saveProvider(req.body || {}, req.params.id);
    await audit(req, {
      entidad: "proveedor",
      entidad_id: provider.proveedor_id,
      accion: "actualizar",
      antes: before,
      despues: provider,
      detalles: { nombre: provider.nombre },
    });
    res.json(provider);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo actualizar el proveedor." });
  }
});

app.get("/api/admin/compras-proveedor", requireAuth, async (_req, res) => {
  try {
    res.json(await readProviderPurchases());
  } catch (error) {
    logUnexpectedError(error);
    res.status(500).json({ error: "No se pudieron cargar las compras de proveedor." });
  }
});

app.post("/api/admin/compras-proveedor", requirePermission("proveedores"), async (req, res) => {
  try {
    const purchase = await saveProviderPurchase(req.body || {});
    await audit(req, {
      entidad: "compra_proveedor",
      entidad_id: purchase.compra_id,
      accion: "crear",
      despues: purchase,
      detalles: { proveedor: purchase.proveedor_nombre || purchase.proveedor_id, cantidad: purchase.cantidad, inventario_generado: purchase.inventario_generado || 0 },
    });
    res.status(201).json(purchase);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo guardar la compra de proveedor." });
  }
});

app.put("/api/admin/compras-proveedor/:id", requirePermission("proveedores"), async (req, res) => {
  try {
    const before = (await readProviderPurchases()).find((entry) => entry.compra_id === req.params.id) || {};
    const purchase = await saveProviderPurchase(req.body || {}, req.params.id);
    await audit(req, {
      entidad: "compra_proveedor",
      entidad_id: purchase.compra_id,
      accion: before.estado !== purchase.estado ? "cambiar_estado" : "actualizar",
      antes: before,
      despues: purchase,
      detalles: { proveedor: purchase.proveedor_nombre || purchase.proveedor_id, cantidad: purchase.cantidad, inventario_generado: purchase.inventario_generado || 0 },
    });
    res.json(purchase);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo actualizar la compra de proveedor." });
  }
});

app.get("/api/admin/auditoria", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 300);
    res.json(await auditStore.listEvents({ limit }));
  } catch (error) {
    logUnexpectedError(error);
    res.status(500).json({ error: "No se pudo cargar la auditoria." });
  }
});

app.get(["/admin", "/admin.html"], (req, res) => {
  if (!isAuthenticated(req)) {
    res.redirect("/login.html");
    return;
  }

  res.sendFile(path.join(publicDir, "admin.html"));
});

app.get(["/", "/index.html"], (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/login.html", (_req, res) => {
  res.sendFile(path.join(publicDir, "login.html"));
});

app.get("/styles.css", (_req, res) => {
  res.sendFile(path.join(publicDir, "styles.css"));
});

app.get("/script.js", (_req, res) => {
  res.sendFile(path.join(publicDir, "script.js"));
});

app.get("/login.js", (_req, res) => {
  res.sendFile(path.join(publicDir, "login.js"));
});

app.get("/admin.js", requireAuth, (_req, res) => {
  res.sendFile(path.join(publicDir, "admin.js"));
});

app.use("/assets", express.static(path.join(publicDir, "assets")));

async function createOrder(orderPayload) {
  const productId = String(orderPayload?.producto_id || "");
  const products = await readProductsWithStock();
  const product = products.find((item) => item.id === productId);

  if (!product) {
    const error = new Error("El producto seleccionado no existe o ya no esta publicado.");
    error.statusCode = 404;
    throw error;
  }

  if (product.estado !== "disponible" || (Number(product.stock_disponible || 0) <= 0 && !isSellEnabled(product.vender))) {
    const error = new Error("El producto seleccionado no esta disponible.");
    error.statusCode = 400;
    throw error;
  }

  const order = normalizeOrder({
    ...orderPayload,
    producto_id: product.id,
    producto_nombre: product.nombre,
    producto_precio: product.precio ?? "",
    plantilla_entrega: product.plantilla_entrega ?? "",
    canal_venta: "web",
    estado: "pendiente de pago",
  });
  const validationError = validateOrder(order);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  return orderStore.createOrder(order);
}

async function createManualOrder(orderPayload = {}) {
  const productId = String(orderPayload.producto_id || "").trim();
  const products = await readProducts();
  const product = products.find((item) => item.id === productId);
  const rawPrice = orderPayload.producto_precio === "" || orderPayload.producto_precio === undefined || orderPayload.producto_precio === null
    ? product?.precio
    : orderPayload.producto_precio;
  const numericPrice = Number(rawPrice);
  const price = rawPrice !== "" && rawPrice !== undefined && rawPrice !== null && Number.isFinite(numericPrice) ? numericPrice : rawPrice;
  const status = VALID_STATUSES.includes(orderPayload.estado) ? orderPayload.estado : "pagado";

  if (!product && !orderPayload.producto_nombre) {
    const error = new Error("Selecciona o ingresa el producto vendido.");
    error.statusCode = 400;
    throw error;
  }

  const order = normalizeOrder({
    ...orderPayload,
    producto_id: product?.id || productId,
    producto_nombre: orderPayload.producto_nombre || product?.nombre || "",
    producto_precio: price ?? "",
    plantilla_entrega: orderPayload.plantilla_entrega || product?.plantilla_entrega || "",
    cliente_nombre: orderPayload.cliente_nombre,
    cliente_contacto: orderPayload.cliente_contacto,
    metodo_pago: orderPayload.metodo_pago,
    comprobante_referencia: orderPayload.comprobante_referencia,
    comprobante_notas: orderPayload.comprobante_notas || "Venta manual registrada desde admin",
    canal_venta: orderPayload.canal_venta || "manual",
    estado: status,
  });
  const validationError = validateOrder(order);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  if (!order.cliente_nombre || !order.cliente_contacto) {
    const error = new Error("Ingresa cliente y contacto para la venta manual.");
    error.statusCode = 400;
    throw error;
  }

  return normalizeOrder(await orderStore.createOrder(order));
}

app.post("/api/pedidos", orderRateLimit, async (req, res) => {
  try {
    const order = await createOrder(req.body || {});
    res.status(201).json(order);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo crear el pedido." });
  }
});

app.post("/api/pedidos/:id/comprobante", proofRateLimit, handleProofUpload, async (req, res) => {
  try {
    const proofFile = proofFileToPayload(req.file);
    const patch = {
      metodo_pago: String(req.body?.metodo_pago || "").trim(),
      cliente_nombre: String(req.body?.cliente_nombre || "").trim(),
      cliente_contacto: String(req.body?.cliente_contacto || "").trim(),
      comprobante_url: "",
      comprobante_referencia: String(req.body?.comprobante_referencia || proofFile?.nombre || "").trim(),
      comprobante_notas: String(req.body?.comprobante_notas || "").trim(),
      comprobante_archivo: proofFile,
      estado: "comprobante recibido",
      actualizado_en: new Date().toISOString(),
    };
    const validationError = validateProof(patch);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const order =
      typeof orderStore.submitProof === "function"
        ? await orderStore.submitProof(req.params.id, patch)
        : await orderStore.updateOrder(req.params.id, {
            ...patch,
            comprobante_archivo: undefined,
            comprobante_notas: [patch.comprobante_notas, proofFile ? `Archivo recibido localmente: ${proofFile.nombre}` : ""]
              .filter(Boolean)
              .join(" | "),
          });
    res.json(order);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo registrar el comprobante." });
  }
});

app.get("/api/admin/pedidos", requireAuth, async (_req, res) => {
  try {
    res.json(await orderStore.listOrders());
  } catch (error) {
    logUnexpectedError(error);
    res.status(500).json({ error: "No se pudieron cargar los pedidos." });
  }
});

app.post("/api/admin/pedidos", requirePermission("compras"), handleProofUpload, async (req, res) => {
  try {
    const proofFile = proofFileToPayload(req.file);
    const requestedStatus = String(req.body?.estado || "");
    const order = await createManualOrder(req.body || {});
    let savedOrder = order;

    if (proofFile || req.body?.comprobante_referencia || req.body?.comprobante_notas) {
      const proofPatch = {
        metodo_pago: String(req.body?.metodo_pago || order.metodo_pago || "").trim(),
        cliente_nombre: order.cliente_nombre,
        cliente_contacto: order.cliente_contacto,
        comprobante_url: "",
        comprobante_referencia: String(req.body?.comprobante_referencia || proofFile?.nombre || "").trim(),
        comprobante_notas: String(req.body?.comprobante_notas || order.comprobante_notas || "").trim(),
        comprobante_archivo: proofFile,
        estado: "comprobante recibido",
        actualizado_en: new Date().toISOString(),
      };
      const validationError = validateProof(proofPatch);

      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      savedOrder = normalizeOrder(
        typeof orderStore.submitProof === "function"
          ? await orderStore.submitProof(order.pedido_id, proofPatch)
          : await orderStore.updateOrder(order.pedido_id, {
              ...proofPatch,
              comprobante_archivo: undefined,
              comprobante_notas: [proofPatch.comprobante_notas, proofFile ? `Archivo recibido localmente: ${proofFile.nombre}` : ""]
                .filter(Boolean)
                .join(" | "),
            })
      );

      if (requestedStatus === "pagado") {
        savedOrder = normalizeOrder(
          await orderStore.updateOrder(order.pedido_id, {
            estado: "pagado",
            actualizado_en: new Date().toISOString(),
          })
        );
      }
    }

    await audit(req, {
      entidad: "pedido",
      entidad_id: savedOrder.pedido_id,
      accion: "crear_venta_manual",
      despues: savedOrder,
      detalles: {
        producto: savedOrder.producto_nombre || savedOrder.producto_id,
        canal_venta: savedOrder.canal_venta,
        monto: savedOrder.producto_precio,
        comprobante: proofFile ? proofFile.nombre : "",
      },
    });
    res.status(201).json(savedOrder);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo crear la venta manual." });
  }
});

app.put("/api/admin/pedidos/:id", requirePermission("compras"), async (req, res) => {
  try {
    const before = (await orderStore.listOrders()).map(normalizeOrder).find((entry) => entry.pedido_id === req.params.id) || {};
    const status = String(req.body?.estado || "");

    if (!VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: "Estado de pedido no soportado." });
      return;
    }

    const order = normalizeOrder(
      await orderStore.updateOrder(req.params.id, {
        estado: status,
        actualizado_en: new Date().toISOString(),
      })
    );
    await audit(req, {
      entidad: "pedido",
      entidad_id: order.pedido_id,
      accion: before.estado !== order.estado ? "cambiar_estado" : "actualizar",
      antes: before,
      despues: order,
      detalles: { producto: order.producto_nombre || order.producto_id },
    });
    res.json(order);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo actualizar el pedido." });
  }
});

app.post("/api/admin/pedidos/:id/asignar-inventario", requirePermission("compras"), async (req, res) => {
  try {
    const before = (await orderStore.listOrders()).map(normalizeOrder).find((entry) => entry.pedido_id === req.params.id) || {};
    const inventoryId = String(req.body?.inventario_id || "").trim();
    const assignments = Array.isArray(req.body?.asignaciones_inventario) ? req.body.asignaciones_inventario : [];

    if (!inventoryId && assignments.length === 0) {
      res.status(400).json({ error: "Selecciona una cuenta disponible para asignar." });
      return;
    }

    const result = await assignInventoryToOrder(req.params.id, inventoryId, req.body || {});
    await audit(req, {
      entidad: "pedido",
      entidad_id: result.order.pedido_id,
      accion: "entregar",
      antes: before,
      despues: result.order,
      detalles: {
        inventario_id: result.order.inventario_id,
        asignaciones: Array.isArray(result.order.asignaciones_inventario) ? result.order.asignaciones_inventario.length : 0,
      },
    });
    res.json(result);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo asignar la cuenta al pedido." });
  }
});

function startServer() {
  return app.listen(port, host, () => {
    const localUrl = `http://${host}:${port}`;
    console.log(`MAWG Streaming disponible en ${localUrl}`);
    console.log(`Admin protegido en ${localUrl}/admin.html`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
};
