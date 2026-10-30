require("dotenv").config();

const runtimeEnv = globalThis.__MAWG_ENV__ || process.env;
const isWorkerRuntime = Boolean(globalThis.__MAWG_ENV__);

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const Busboy = require("busboy");
const express = require("express");
const session = require("express-session");
const { createCatalogStore } = require("./src/services/catalog");
const JsonCatalogStore = require("./src/services/catalog/jsonCatalogStore");
const { normalizeProduct, validateProduct } = require("./src/services/catalog/validation");
const { createOrderStore } = require("./src/services/orders");
const { normalizeOrder, validateOrder, validateProof, VALID_STATUSES } = require("./src/services/orders/validation");
const { createInventoryStore } = require("./src/services/inventory");
const { createRenewalStore } = require("./src/services/renewals");
const { createPaymentMethodStore } = require("./src/services/paymentMethods");
const { createMessageTemplateStore } = require("./src/services/messageTemplates");
const { createSiteSettingStore } = require("./src/services/siteSettings");
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
  OPEN_RENEWAL_STATUSES,
  RENEWAL_STATUSES,
} = require("./src/services/renewals/validation");
const FileSessionStore = require("./src/services/sessions/fileSessionStore");
const DurableSessionStore = require("./src/services/sessions/durableSessionStore");
const { createRateLimiter: buildRateLimiter } = require("./src/services/security/rateLimiter");
const { canRead, filterOperationalData } = require("./src/services/security/access");
const { createSessionVersions } = require("./src/services/security/sessionVersions");
const { createSecurityNamespace } = require("./src/services/security/client");
const securityNamespace = createSecurityNamespace(() => runtimeEnv.SECURITY_STATE, isWorkerRuntime);
const D1SheetsImportService = require("./src/services/migrations/d1SheetsImportService");
const {
  normalizeInventoryItem,
  validateInventoryItem,
  INVENTORY_STATUSES,
} = require("./src/services/inventory/validation");
const {
  normalizeMessageTemplate,
  validateMessageTemplate,
} = require("./src/services/messageTemplates/validation");
const {
  normalizeSiteSetting,
  validateSiteSetting,
} = require("./src/services/siteSettings/validation");
const { createRequestMonitoring } = require("./src/http/requestMonitoring");
const { createHealthRouter } = require("./src/http/healthRouter");
const { createProductRouter } = require("./src/http/productRouter");

const app = express();
const port = Number(runtimeEnv.PORT || 3000);
// En Workers los Assets se sirven antes de llegar a Express; el directorio
// local solo se necesita para el servidor Node de desarrollo.
const publicDir = path.join(typeof __dirname === "string" ? __dirname : ".", "public");
const isProduction = runtimeEnv.NODE_ENV === "production";
const host = runtimeEnv.HOST || (isProduction ? "0.0.0.0" : "127.0.0.1");
const siteUrl = String(runtimeEnv.SITE_URL || "").replace(/\/+$/, "");
const compressedAssetCache = new Map();
const trustProxy = isProduction
  ? runtimeEnv.TRUST_PROXY !== "false" && runtimeEnv.TRUST_PROXY !== "0"
  : runtimeEnv.TRUST_PROXY === "true" || runtimeEnv.TRUST_PROXY === "1";
const catalogStore = createCatalogStore(runtimeEnv);
const localCatalogStore = new JsonCatalogStore(runtimeEnv.CATALOG_JSON_PATH || "productos.json");
const orderStore = createOrderStore(runtimeEnv);
const inventoryStore = createInventoryStore(runtimeEnv);
const renewalStore = createRenewalStore(runtimeEnv);
const paymentMethodStore = createPaymentMethodStore(runtimeEnv);
const messageTemplateStore = createMessageTemplateStore(runtimeEnv);
const siteSettingStore = createSiteSettingStore(runtimeEnv);
const userStore = createUserStore(runtimeEnv);
const supplierStore = createSupplierStore(runtimeEnv);
const auditStore = createAuditStore(runtimeEnv, securityNamespace);
const requestMonitoring = createRequestMonitoring({
  slowRequestMs: Number(runtimeEnv.SLOW_REQUEST_THRESHOLD_MS) > 0 ? Number(runtimeEnv.SLOW_REQUEST_THRESHOLD_MS) : 1000,
});
const d1SheetsImportService = new D1SheetsImportService({
  db: globalThis.__MAWG_D1__,
  sources: {
    // La importacion no debe ocultar un fallo de Apps Script con el respaldo
    // JSON local: ese archivo no existe dentro de un Worker.
    products: () => readProductsForD1Import(),
    providers: () => readProviders(),
    providerPurchases: () => readProviderPurchases(),
    inventory: () => readInventory(),
    orders: async () => (await orderStore.listOrders()).map(normalizeOrder),
    renewals: () => readRenewals(),
    paymentMethods: () => paymentMethodStore.listMethods(),
    messageTemplates: () => messageTemplateStore.listTemplates(),
    siteSettings: () => siteSettingStore.listSettings(),
  },
});

if (trustProxy) {
  app.set("trust proxy", 1);
}

function getRequiredEnv(name) {
  const value = runtimeEnv[name];

  if (!value) {
    throw new Error(`Falta configurar ${name} en .env.`);
  }

  return value;
}

const adminUser = getRequiredEnv("ADMIN_USER");
const adminPassword = getRequiredEnv("ADMIN_PASSWORD");
const sessionSecret = getRequiredEnv("SESSION_SECRET");
const configuredSessionMaxAgeHours = Number(runtimeEnv.SESSION_MAX_AGE_HOURS);
const sessionMaxAgeHours =
  Number.isFinite(configuredSessionMaxAgeHours) && configuredSessionMaxAgeHours > 0 ? configuredSessionMaxAgeHours : 8;
const sessionMaxAgeMs = 1000 * 60 * 60 * sessionMaxAgeHours;
const defaultSessionFileDir = isProduction ? path.join(os.tmpdir(), "mawg-streaming-sessions") : ".sessions";
const sessionVersions = createSessionVersions(securityNamespace,
  !isWorkerRuntime && (isProduction || runtimeEnv.SESSION_STORE === "file") ? runtimeEnv.SESSION_FILE_DIR || defaultSessionFileDir : undefined
);
const sessionStore =
  securityNamespace
    ? new DurableSessionStore({
        namespace: securityNamespace,
        ttlMs: sessionMaxAgeMs,
      })
    : isWorkerRuntime
    ? undefined
    : isProduction || runtimeEnv.SESSION_STORE === "file"
    ? new FileSessionStore({
        directory: runtimeEnv.SESSION_FILE_DIR || defaultSessionFileDir,
        ttlMs: sessionMaxAgeMs,
      })
    : undefined;

const configuredProofUploadMaxMb = Number(runtimeEnv.PROOF_UPLOAD_MAX_MB);
const proofUploadMaxMb = Number.isFinite(configuredProofUploadMaxMb) && configuredProofUploadMaxMb > 0 ? configuredProofUploadMaxMb : 8;
const proofUploadMaxBytes = Math.max(1, proofUploadMaxMb) * 1024 * 1024;
const proofUploadFieldValueMaxBytes = 16 * 1024;
const configuredPublicApiCacheTtlMs = Number(runtimeEnv.PUBLIC_API_CACHE_TTL_MS);
const publicApiCacheTtlMs =
  Number.isFinite(configuredPublicApiCacheTtlMs) && configuredPublicApiCacheTtlMs >= 0 ? configuredPublicApiCacheTtlMs : 120 * 1000;
const publicApiCache = new Map();
// Las lecturas del admin ya tienen cache corto en el navegador (15s). Este
// cache del worker solo absorbe rafagas de peticiones duplicadas del panel.
const ADMIN_API_CACHE_TTL_MS = 15 * 1000;
const PUBLIC_CACHE_ALIASES = {
  "products-with-stock": ["admin-products"],
};
// Si Apps Script falla, se puede servir la ultima copia buena del catalogo
// durante este margen extra antes de mostrar un error al cliente.
const PUBLIC_API_STALE_GRACE_MS = 60 * 60 * 1000;
// Cache L2 en KV: sobrevive al reciclado de instancias del Worker y comparte el
// catalogo entre las distintas ubicaciones del borde. Reutiliza el namespace de
// sesiones con un prefijo propio. KV tiene consistencia eventual (~60s), por eso
// la invalidacion se apoya tambien en el L1 en memoria y en el TTL corto.
const publicCacheKv = globalThis.__MAWG_SESSION_KV__ || null;
const PUBLIC_CACHE_KV_PREFIX = "public-api-cache:";
const PUBLIC_CACHE_KV_MIN_TTL_SECONDS = 60;

function buildPublicJsonPayloadFromJson(json) {
  return {
    json,
    gzip: zlib.gzipSync(json, { level: zlib.constants.Z_BEST_SPEED }),
    etag: `"json-${crypto.createHash("sha1").update(json).digest("hex")}"`,
  };
}

function buildPublicJsonPayload(value) {
  return buildPublicJsonPayloadFromJson(JSON.stringify(value));
}

async function readPublicApiCacheFromKv(key) {
  if (!publicCacheKv) {
    return null;
  }

  try {
    const raw = await publicCacheKv.get(PUBLIC_CACHE_KV_PREFIX + key, "text");
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  } catch (error) {
    logUnexpectedError(error);
    return null;
  }
}

async function writePublicApiCacheToKv(key, json) {
  if (!publicCacheKv) {
    return;
  }

  try {
    const ttlSeconds = Math.max(PUBLIC_CACHE_KV_MIN_TTL_SECONDS, Math.ceil(publicApiCacheTtlMs / 1000));
    await publicCacheKv.put(PUBLIC_CACHE_KV_PREFIX + key, json, { expirationTtl: ttlSeconds });
  } catch (error) {
    logUnexpectedError(error);
  }
}

async function deletePublicApiCacheFromKv(keys) {
  if (!publicCacheKv) {
    return;
  }

  await Promise.all(
    keys.map(async (key) => {
      try {
        await publicCacheKv.delete(PUBLIC_CACHE_KV_PREFIX + key);
      } catch (error) {
        logUnexpectedError(error);
      }
    })
  );
}

function setSecurityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

function getPublicBaseUrl(req) {
  if (siteUrl) {
    return siteUrl;
  }

  return `${req.protocol}://${req.get("host")}`;
}

function getContentType(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
  };

  return contentTypes[extension] || "application/octet-stream";
}

function acceptsGzip(req) {
  // El adaptador node:http de Workers ya negocia la compresion en el borde;
  // reenviar un Buffer gzip desde Express pierde Content-Encoding.
  return !isWorkerRuntime && /\bgzip\b/.test(String(req.get("accept-encoding") || ""));
}

function getCompressedAsset(filePath) {
  const stat = fs.statSync(filePath);
  const cached = compressedAssetCache.get(filePath);

  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached;
  }

  const buffer = zlib.gzipSync(fs.readFileSync(filePath), { level: zlib.constants.Z_BEST_SPEED });
  const asset = {
    buffer,
    etag: `"gz-${crypto.createHash("sha1").update(buffer).digest("hex")}"`,
    mtimeMs: stat.mtimeMs,
    size: stat.size,
  };

  compressedAssetCache.set(filePath, asset);

  return asset;
}

async function sendWorkerAsset(req, res, fileName, cacheControl) {
  try {
    const headers = {};
    if (req.get("if-none-match")) headers["If-None-Match"] = req.get("if-none-match");
    const html = fileName.endsWith(".html");
    // Assets normaliza /admin.html a /admin. Pedir la ruta canonica evita
    // devolver un redirect al mismo handler y formar un bucle.
    const pathname = html ? (fileName === "index.html" ? "/" : "/" + fileName.slice(0, -5))
      : "/" + (isProduction ? "dist/" : "") + fileName;
    const assetUrl = new URL(pathname, "https://assets.internal");
    let response = await runtimeEnv.ASSETS.fetch(new Request(assetUrl, { headers }));
    if (response.status === 404 && isProduction && !html) {
      response = await runtimeEnv.ASSETS.fetch(new Request(new URL("/" + fileName, assetUrl), { headers }));
    }
    res.setHeader("Cache-Control", cacheControl);
    for (const name of ["Content-Type", "ETag", "Last-Modified", "Location"]) {
      if (response.headers.has(name)) res.setHeader(name, response.headers.get(name));
    }
    res.status(response.status);
    if (response.status === 304) { res.end(); return; }
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error("No se pudo servir el recurso estatico del Worker", error);
    if (!res.headersSent) res.status(503).end();
  }
}

function sendPublicFile(req, res, fileName, cacheControl) {
  if (isWorkerRuntime && runtimeEnv.ASSETS) {
    return sendWorkerAsset(req, res, fileName, cacheControl);
  }
  const distPath = path.join(publicDir, "dist", fileName);
  const sourcePath = path.join(publicDir, fileName);
  const filePath = isProduction && fs.existsSync(distPath) ? distPath : sourcePath;

  res.setHeader("Cache-Control", cacheControl);
  res.setHeader("Vary", "Accept-Encoding");

  if (acceptsGzip(req)) {
    const asset = getCompressedAsset(filePath);

    if (req.get("if-none-match") === asset.etag) {
      res.status(304).end();
      return;
    }

    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Content-Length", String(asset.buffer.length));
    res.setHeader("ETag", asset.etag);
    res.type(getContentType(fileName));
    res.send(asset.buffer);
    return;
  }

  res.sendFile(filePath);
}

function sendPublicHtml(req, res, fileName) {
  sendPublicFile(req, res, fileName, "no-cache");
}

function sendCachedAsset(req, res, fileName, cacheControl = "public, max-age=3600") {
  sendPublicFile(req, res, fileName, cacheControl);
}

function createRateLimiter(options) {
  return buildRateLimiter({ ...options, namespace: securityNamespace, workerRuntime: isWorkerRuntime });
}

const loginRateLimit = createRateLimiter({
  scope: "login",
  windowMs: 15 * 60 * 1000,
  max: runtimeEnv.NODE_ENV === "test" ? 100 : 8,
  message: "Demasiados intentos de acceso. Intenta nuevamente en unos minutos.",
});
const orderRateLimit = createRateLimiter({
  scope: "orders",
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: "Demasiados pedidos desde esta conexion. Intenta nuevamente en unos minutos.",
});
const proofRateLimit = createRateLimiter({
  scope: "proofs",
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: "Demasiados comprobantes desde esta conexion. Intenta nuevamente en unos minutos.",
});

app.use(requestMonitoring.middleware);
app.use(setSecurityHeaders);
app.use(express.json({ limit: "1mb" }));
app.use("/api/admin", (_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
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

// Las cookies antiguas streamhub.auth dejan de autenticar: toda solicitud
// debe tener una sesion vigente en el almacen del servidor.
const signedAuthCookieName = "streamhub.auth";
function getAuthenticatedUser(req) {
  return req.session?.authenticated && req.session?.adminUser ? req.session.adminUser : null;
}

app.use(async (req, res, next) => {
  const user = getAuthenticatedUser(req);
  if (!user) return next();
  try {
    if ((req.session.userVersion || "") !== await sessionVersions.get(user.usuario)) {
      await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
      res.clearCookie("streamhub.sid", { path: "/" });
      return next();
    }
    next();
  } catch (error) { next(error); }
});

function requireRead(resource) {
  return (req, res, next) => {
    if (!isAuthenticated(req)) return requireAuth(req, res, next);
    if (!canRead(getSessionPermissions(req), resource)) return res.status(403).json({ error: "No tienes permisos para consultar este modulo." });
    next();
  };
}
function operationalResponse(req, value, resource) {
  return filterOperationalData(getSessionPermissions(req), value, resource);
}

function isAuthenticated(req) {
  return Boolean(getAuthenticatedUser(req));
}

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) {
    next();
    return;
  }

  res.status(401).json({ error: "Debes iniciar sesion para administrar el catalogo." });
}

function getSessionPermissions(req) {
  const permissions = getAuthenticatedUser(req)?.permisos;

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
    console.error(JSON.stringify({
      event: "application_error",
      name: error?.name || "Error",
      status: Number(error?.statusCode) || 500,
    }));
  }
}

async function getCachedPublicPayload(key, loader) {
  if (publicApiCacheTtlMs === 0) {
    return buildPublicJsonPayload(await loader());
  }

  const now = Date.now();
  const cached = publicApiCache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.payload;
  }

  // L2 (KV): si el L1 de esta instancia expiro, se intenta recuperar la copia
  // compartida antes de volver a consultar Apps Script.
  const cachedJson = await readPublicApiCacheFromKv(key);
  if (cachedJson) {
    const payload = buildPublicJsonPayloadFromJson(cachedJson);
    publicApiCache.set(key, {
      payload,
      expiresAt: now + publicApiCacheTtlMs,
    });
    return payload;
  }

  try {
    const json = JSON.stringify(await loader());
    const payload = buildPublicJsonPayloadFromJson(json);
    publicApiCache.set(key, {
      payload,
      expiresAt: now + publicApiCacheTtlMs,
    });
    await writePublicApiCacheToKv(key, json);
    return payload;
  } catch (error) {
    // Apps Script caido o lento: se sirve la ultima copia buena en lugar de
    // dejar al cliente sin catalogo, siempre dentro del margen de gracia.
    if (cached && cached.payload && now - cached.expiresAt <= PUBLIC_API_STALE_GRACE_MS) {
      logUnexpectedError(error);
      return cached.payload;
    }

    throw error;
  }
}

async function clearPublicApiCache(...keys) {
  if (keys.length === 0) {
    const known = new Set(publicApiCache.keys());
    Object.values(PUBLIC_CACHE_ALIASES).forEach((aliases) => aliases.forEach((alias) => known.add(alias)));
    publicApiCache.clear();
    await deletePublicApiCacheFromKv([...known]);
    return;
  }

  const targets = new Set();
  keys.forEach((key) => {
    publicApiCache.delete(key);
    targets.add(key);
    (PUBLIC_CACHE_ALIASES[key] || []).forEach((alias) => {
      publicApiCache.delete(alias);
      targets.add(alias);
    });
  });

  await deletePublicApiCacheFromKv([...targets]);
}

async function getCachedAdminProducts() {
  if (publicApiCacheTtlMs === 0) {
    return readProducts();
  }

  const now = Date.now();
  const cached = publicApiCache.get("admin-products");

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = await readProducts();
  publicApiCache.set("admin-products", {
    value,
    expiresAt: now + ADMIN_API_CACHE_TTL_MS,
  });
  return value;
}

function setPublicApiCacheHeader(res) {
  if (publicApiCacheTtlMs <= 0) {
    res.setHeader("Cache-Control", "no-store");
    return;
  }

  const maxAgeSeconds = Math.max(1, Math.floor(publicApiCacheTtlMs / 1000));
  res.setHeader("Cache-Control", `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`);
}

async function sendPublicApiJson(req, res, key, loader) {
  const payload = await getCachedPublicPayload(key, loader);

  setPublicApiCacheHeader(res);
  res.setHeader("ETag", payload.etag);
  res.setHeader("Vary", "Accept-Encoding");
  res.type("application/json");

  if (req.get("if-none-match") === payload.etag) {
    res.status(304).end();
    return;
  }

  if (acceptsGzip(req)) {
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Content-Length", String(payload.gzip.length));
    res.send(payload.gzip);
    return;
  }

  res.send(payload.json);
}

function buildAuditEvent(req, { entidad, entidad_id, accion, antes = {}, despues = {}, detalles = {} }) {
  return {
    evento_id: `AUD-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    entidad,
    entidad_id,
    accion,
    estado_anterior: antes?.estado || "",
    estado_nuevo: despues?.estado || "",
    usuario: getAuthenticatedUser(req)?.usuario || adminUser || "admin",
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
  if (!String(req.headers["content-type"] || "").toLowerCase().includes("multipart/form-data")) {
    next();
    return;
  }

  const fields = {};
  let uploadedFile = null;
  let completed = false;
  let responded = false;

  function fail(message, statusCode = 400) {
    if (responded) {
      return;
    }

    responded = true;
    req.unpipe();
    res.status(statusCode).json({ error: message });
  }

  let busboy;
  try {
    busboy = Busboy({
      headers: req.headers,
      limits: {
        fieldNameSize: 80,
        fieldSize: proofUploadFieldValueMaxBytes,
        fields: 12,
        fileSize: proofUploadMaxBytes,
        files: 1,
        parts: 16,
      },
    });
  } catch {
    fail("No se pudo leer el formulario del comprobante.");
    return;
  }

  busboy.on("field", (name, value) => {
    if (responded) {
      return;
    }
    fields[name] = value;
  });

  busboy.on("file", (name, stream, info) => {
    const chunks = [];
    let size = 0;
    let truncated = false;
    const fileName = String(info.filename || "").trim();
    const mimeType = String(info.mimeType || "application/octet-stream");

    if (responded) {
      stream.resume();
      return;
    }

    if (name !== "comprobante_archivo") {
      stream.resume();
      fail("El archivo adjunto no corresponde al campo esperado.");
      return;
    }

    if (!fileName) {
      stream.resume();
      return;
    }

    if (uploadedFile) {
      stream.resume();
      fail("Solo puedes adjuntar un comprobante.");
      return;
    }

    if (mimeType !== "application/pdf" && !mimeType.startsWith("image/")) {
      stream.resume();
      fail("Solo se aceptan imagenes o PDF como comprobante.");
      return;
    }

    stream.on("limit", () => {
      truncated = true;
      fail(`El comprobante no debe superar ${proofUploadMaxMb} MB.`);
    });

    stream.on("data", (chunk) => {
      if (responded) {
        return;
      }

      size += chunk.length;
      chunks.push(chunk);
    });

    stream.on("end", () => {
      if (responded || truncated) {
        return;
      }

      uploadedFile = {
        originalname: fileName,
        mimetype: mimeType,
        size,
        buffer: Buffer.concat(chunks),
      };
    });
  });

  busboy.on("fieldsLimit", () => fail("El formulario tiene demasiados campos."));
  busboy.on("filesLimit", () => fail("Solo puedes adjuntar un comprobante."));
  busboy.on("partsLimit", () => fail("El formulario tiene demasiadas partes."));
  busboy.on("error", () => fail("No se pudo leer el archivo del comprobante."));
  busboy.on("finish", () => {
    completed = true;

    if (responded) {
      return;
    }

    req.body = fields;
    req.file = uploadedFile;
    next();
  });

  req.on("aborted", () => {
    if (!completed) {
      fail("La carga del comprobante fue cancelada.");
    }
  });

  req.pipe(busboy);
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

// Cuando la operacion vive en D1, los stores no suben archivos: se pide a Apps
// Script (accion proof.upload) que aloje el comprobante en Drive y devuelva la
// referencia. Con Apps Script activo esta subida la hace submitProof, por eso
// esta funcion solo se usa en la ruta alternativa.
async function uploadProofFileToAppsScript(proofFile) {
  if (!proofFile) {
    return null;
  }

  const endpointUrl = String(runtimeEnv.APPS_SCRIPT_CATALOG_URL || "").trim();
  const adminToken = String(runtimeEnv.APPS_SCRIPT_ADMIN_TOKEN || "").trim();

  if (!endpointUrl || !adminToken) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(runtimeEnv.APPS_SCRIPT_TIMEOUT_MS || 15000));

  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "proof.upload",
        token: adminToken,
        proof: proofFile,
        proof_drive_folder_id: String(runtimeEnv.APPS_SCRIPT_PROOF_DRIVE_FOLDER_ID || "").trim(),
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.ok === false || !data.file) {
      throw new Error(data.error || "No se pudo guardar el comprobante en Drive.");
    }

    return data.file;
  } finally {
    clearTimeout(timeout);
  }
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
    if (isWorkerRuntime) {
      throw error;
    }
    const products = await localCatalogStore.listProducts();
    return products.map(normalizeProduct);
  }
}

async function readProductsForD1Import() {
  const products = await catalogStore.listProducts();
  return products.map(normalizeProduct);
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
  // Catalogo e inventario viven en hojas distintas: se piden en paralelo para
  // no sumar dos viajes completos a Apps Script en la carga de la tienda.
  const [products, inventory] = await Promise.all([
    readProducts(),
    readInventory().catch((error) => {
      logUnexpectedError(error);
      return [];
    }),
  ]);
  const countForComponent = createStockCounter(inventory);

  return products
    .map((product) => {
    const stock = getProductStock(product, products, countForComponent);
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

function getProductStock(product, products, countForComponent) {
  const components = getProductComponents(product, products);

  if (components.length === 0) {
    return 0;
  }

  return Math.min(...components.map((component) => countForComponent(component)));
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

// Prepara las cuentas disponibles una sola vez (estado + slug) y memoiza el
// conteo por componente. Antes se recorria todo el inventario con slugify()
// por cada componente de cada producto; ahora cada componente se calcula una vez.
function createStockCounter(inventory) {
  let emptyProductCount = 0;
  const availableItems = [];

  inventory.forEach((item) => {
    if (item.estado !== "disponible") {
      return;
    }

    const productIdSlug = slugify(item.producto_id);
    const productNameSlug = slugify(item.producto_nombre);

    if (!productIdSlug && !productNameSlug) {
      // Una cuenta sin producto cargado es compatible con cualquier componente.
      emptyProductCount += 1;
      return;
    }

    availableItems.push({ productIdSlug, productNameSlug });
  });

  const memo = new Map();

  return function countForComponent(component) {
    const componentIdSlug = slugify(component.producto_id);
    const componentNameSlug = slugify(component.componente_nombre);

    if (!componentIdSlug && !componentNameSlug) {
      return emptyProductCount;
    }

    const cacheKey = `${componentIdSlug}\u0000${componentNameSlug}`;

    if (memo.has(cacheKey)) {
      return memo.get(cacheKey);
    }

    const targets = [componentIdSlug, componentNameSlug].filter(Boolean);
    let count = emptyProductCount;

    availableItems.forEach((item) => {
      if (targets.some((target) => slugMatches(item.productIdSlug, target) || slugMatches(item.productNameSlug, target))) {
        count += 1;
      }
    });

    memo.set(cacheKey, count);
    return count;
  };
}

function slugMatches(valueSlug, targetSlug) {
  if (!valueSlug || !targetSlug) {
    return false;
  }

  return (
    valueSlug === targetSlug ||
    (targetSlug.length >= 3 && valueSlug.includes(targetSlug)) ||
    (valueSlug.length >= 3 && targetSlug.includes(valueSlug))
  );
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

const BULK_INVENTORY_UPDATE_FIELDS = new Set([
  "cuenta_usuario",
  "cuenta_clave",
  "pin",
  "perfil_nombre",
  "url_producto",
  "link_bot",
  "usuario_bot",
  "contrasena_bot",
  "fecha_vencimiento_cliente",
  "fecha_vencimiento_proveedor",
  "estado",
  "estado_control",
  "notas",
]);

function normalizeBulkInventoryFilters(filters = {}) {
  return {
    producto: String(filters.producto || "").trim().toLowerCase(),
    cuenta_usuario: String(filters.cuenta_usuario || "").trim(),
    proveedor: String(filters.proveedor || "").trim().toLowerCase(),
    estado: String(filters.estado || "").trim(),
  };
}

function normalizeAccountUser(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "").trim();
}

function accountUserMatchesFilter(value, filter) {
  const normalizedValue = normalizeAccountUser(value);
  const normalizedFilter = normalizeAccountUser(filter);

  if (!normalizedFilter) {
    return true;
  }

  if (normalizedFilter.includes("@")) {
    return normalizedValue === normalizedFilter;
  }

  return normalizedValue.includes(normalizedFilter);
}

function inventoryMatchesBulkFilters(item, filters) {
  const matchesProduct =
    !filters.producto ||
    String(item.producto_id || "").toLowerCase().includes(filters.producto) ||
    String(item.producto_nombre || "").toLowerCase().includes(filters.producto);
  const matchesUser = accountUserMatchesFilter(item.cuenta_usuario, filters.cuenta_usuario);
  const matchesProvider = !filters.proveedor || String(item.proveedor || "").toLowerCase().includes(filters.proveedor);
  const matchesStatus = !filters.estado || item.estado === filters.estado;

  return matchesProduct && matchesUser && matchesProvider && matchesStatus;
}

function normalizeBulkInventoryPatch(rawPatch = {}) {
  const patch = {};

  Object.entries(rawPatch).forEach(([key, value]) => {
    if (BULK_INVENTORY_UPDATE_FIELDS.has(key)) {
      patch[key] = value === undefined || value === null ? "" : value;
    }
  });

  if (patch.estado && !INVENTORY_STATUSES.includes(patch.estado)) {
    const error = new Error("Estado de inventario no soportado.");
    error.statusCode = 400;
    throw error;
  }

  return patch;
}

async function bulkUpdateInventoryItems(filtersInput = {}, patchInput = {}) {
  const filters = normalizeBulkInventoryFilters(filtersInput);
  const patch = normalizeBulkInventoryPatch(patchInput);

  if (!filters.producto) {
    const error = new Error("Selecciona un producto antes de actualizar inventario masivamente.");
    error.statusCode = 400;
    throw error;
  }

  if (Object.keys(patch).length === 0) {
    const error = new Error("Selecciona al menos un campo para actualizar.");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const normalizedPatch = normalizeInventoryItem({ ...patch, inventario_id: "BULK-PATCH", actualizado_en: now });
  const finalPatch = Object.fromEntries(Object.keys(patch).map((key) => [key, normalizedPatch[key]]));
  finalPatch.actualizado_en = now;

  if (typeof inventoryStore.bulkUpdateItems === "function") {
    const updatedItems = await inventoryStore.bulkUpdateItems(filters, finalPatch);
    return updatedItems.map(normalizeInventoryItem);
  }

  const currentItems = await readInventory();
  const matchedItems = currentItems.filter((item) => inventoryMatchesBulkFilters(item, filters));
  const updatedItems = [];

  for (const item of matchedItems) {
    updatedItems.push(await updateInventoryItem(item.inventario_id, { ...item, ...finalPatch }));
  }

  return updatedItems;
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
      pin: String(assignment.pin ?? "").trim(),
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
      pin: assignment.pin !== "" ? assignment.pin : item.pin,
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
      link_bot: deliveryItem.link_bot,
      usuario_bot: deliveryItem.usuario_bot,
      contrasena_bot: deliveryItem.contrasena_bot,
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
    link_bot: firstAssignment.link_bot || "",
    usuario_bot: firstAssignment.usuario_bot || "",
    contrasena_bot: firstAssignment.contrasena_bot || "",
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
      perfil_nombre: "",
      pin: "",
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

function isOpenRenewalStatus(status) {
  return OPEN_RENEWAL_STATUSES.includes(String(status || "").trim());
}

async function assertNoOpenRenewalDuplicate(renewal, currentRenewalId = "") {
  if (!isOpenRenewalStatus(renewal.estado)) {
    return;
  }

  const inventoryId = String(renewal.inventario_id || "").trim();

  if (!inventoryId) {
    return;
  }

  const duplicate = (await readRenewals()).find(
    (entry) =>
      entry.renovacion_id !== currentRenewalId &&
      entry.inventario_id === inventoryId &&
      isOpenRenewalStatus(entry.estado)
  );

  if (duplicate) {
    const error = new Error(
      `Ya existe una renovacion abierta para esta cuenta (${duplicate.renovacion_id}). Finaliza o cancela la renovacion existente antes de crear otra.`
    );
    error.statusCode = 409;
    throw error;
  }
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
      link_bot: purchase.link_bot,
      usuario_bot: purchase.usuario_bot,
      contrasena_bot: purchase.contrasena_bot,
      referencia_compra: purchase.referencia_pago || purchase.compra_id,
      fecha_compra: purchase.fecha_compra,
      fecha_vencimiento_proveedor: purchase.fecha_vencimiento_proveedor,
      estado: "reservado",
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

function findOrderAssignmentForInventory(order, inventoryId) {
  const targetId = String(inventoryId || "").trim();

  if (!targetId || !Array.isArray(order?.asignaciones_inventario)) {
    return null;
  }

  return order.asignaciones_inventario.find((assignment) => String(assignment.inventario_id || "").trim() === targetId) || null;
}

function resolveInventoryRenewalAmount(item, linkedOrder) {
  const assignment = findOrderAssignmentForInventory(linkedOrder, item.inventario_id);
  const candidates = [
    assignment?.precio_venta,
    item.precio_venta,
    item.precio_venta_sugerido,
    item.monto,
    linkedOrder?.producto_precio,
  ];

  return candidates.find((value) => value !== "" && value !== undefined && value !== null) ?? "";
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
  const defaultAmount = resolveInventoryRenewalAmount(item, linkedOrder);

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

  await assertNoOpenRenewalDuplicate(renewal);
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

  await assertNoOpenRenewalDuplicate(renewal, current.renovacion_id);
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
  delete renewal.comprobante_archivo;
  const savedRenewal = normalizeRenewal(await renewalStore.updateRenewal(id, renewal));

  return {
    renewal: savedRenewal,
    item: updatedItem,
  };
}

app.use("/api", createProductRouter({
  sendPublicApiJson,
  readProductsWithStock,
  getCachedAdminProducts,
  requireRead,
  requirePermission,
  normalizeProduct,
  validateProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  clearPublicApiCache,
  logUnexpectedError,
}));

app.use("/api/health", createHealthRouter({
  monitoring: requestMonitoring,
  runtime: {
    NODE_ENV: runtimeEnv.NODE_ENV,
    HOST: host,
    PORT: port,
    CATALOG_STORAGE: runtimeEnv.CATALOG_STORAGE,
    OPERATIONS_STORAGE: runtimeEnv.OPERATIONS_STORAGE,
    APPS_SCRIPT_CATALOG_URL: runtimeEnv.APPS_SCRIPT_CATALOG_URL,
    APPS_SCRIPT_ADMIN_TOKEN: runtimeEnv.APPS_SCRIPT_ADMIN_TOKEN,
  },
  requireAdmin: requirePermission("*"),
  checkReadiness: () => catalogStore.listProducts(),
  readProductsWithStock,
  userStore,
  maskValue,
  logUnexpectedError,
}));

app.get("/api/metodos-pago", async (req, res) => {
  try {
    await sendPublicApiJson(req, res, "payment-methods", () => paymentMethodStore.listMethods());
  } catch (error) {
    logUnexpectedError(error);
    res.status(500).json({ error: "No se pudieron cargar los metodos de pago." });
  }
});

app.get("/api/configuracion-sitio", async (req, res) => {
  try {
    await sendPublicApiJson(req, res, "site-settings", () => siteSettingStore.listSettings());
  } catch (error) {
    logUnexpectedError(error);
    res.status(500).json({ error: "No se pudo cargar la configuracion del sitio." });
  }
});

app.get("/api/admin/plantillas", requireRead("templates"), async (_req, res) => {
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

app.get("/api/admin/configuracion-sitio", requireRead("settings"), async (_req, res) => {
  try {
    res.json(await siteSettingStore.listSettings());
  } catch (error) {
    logUnexpectedError(error);
    res.status(500).json({ error: "No se pudo cargar la configuracion del sitio." });
  }
});

app.put("/api/admin/configuracion-sitio/:id", requirePermission("plantillas"), async (req, res) => {
  try {
    const setting = normalizeSiteSetting({ ...(req.body || {}), id: req.body?.id || req.params.id });
    const validationError = validateSiteSetting(setting);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const saved = await siteSettingStore.updateSetting(req.params.id, setting);
    await audit(req, {
      entidad: "configuracion_sitio",
      entidad_id: saved.id,
      accion: "actualizar_configuracion",
      despues: saved,
      detalles: { nombre: saved.nombre },
    });
    await clearPublicApiCache("site-settings");
    res.json(saved);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo actualizar la configuracion." });
  }
});

app.get("/api/admin/session", (req, res) => {
  const user = getAuthenticatedUser(req);
  res.json({ authenticated: Boolean(user), user: user || null });
});

// No se expone en la interfaz: evita una migracion accidental. Solo un
// administrador que envie la confirmacion literal puede copiar Sheets a D1.
app.post("/api/admin/migraciones/d1/importar-sheets", requirePermission("configuracion"), async (req, res) => {
  if (req.body?.confirmacion !== "IMPORTAR_SHEETS_A_D1") {
    res.status(400).json({ error: "Confirmacion requerida para importar datos a D1." });
    return;
  }

  try {
    const summary = await d1SheetsImportService.importTableFromSheets(req.body?.table);
    res.json({ ok: true, summary });
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.message || "No se pudo importar Sheets a D1." });
  }
});

app.post("/api/admin/login", loginRateLimit, async (req, res) => {
  const { usuario, password } = req.body || {};
  if (typeof usuario !== "string" || !usuario.trim() || usuario.length > 128 || typeof password !== "string" || !password || password.length > 1024) {
    return res.status(400).json({ error: "Ingresa un usuario y contrasena validos." });
  }

  let sheetUser = null;

  try {
    sheetUser = await userStore.authenticate(usuario, password);
  } catch (error) {
    logUnexpectedError(error);
  }

  const environmentCredentialsMatch = safeCompare(usuario, adminUser) && safeCompare(password, adminPassword);
  let environmentLoginAllowed = false;
  if (!sheetUser && environmentCredentialsMatch) {
    try {
      environmentLoginAllowed = typeof userStore.findUser === "function" ? !(await userStore.findUser(adminUser)) : true;
    } catch (error) {
      // El acceso de emergencia durante una caida debe habilitarse explicitamente.
      environmentLoginAllowed = runtimeEnv.ALLOW_ADMIN_FALLBACK === "true";
    }
  }
  if (sheetUser || (environmentCredentialsMatch && environmentLoginAllowed)) {
    const sessionUser = sheetUser || {
      usuario: adminUser,
      nombre: "Administrador",
      rol: "admin",
      estado: "activo",
      permisos: ["*"],
    };
    const version = await sessionVersions.get(sessionUser.usuario);
    await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
    req.session.authenticated = true;
    req.session.adminUser = sessionUser;
    req.session.userVersion = version;
    await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
    res.clearCookie(signedAuthCookieName, { path: "/" });
    res.json({ ok: true, user: sessionUser });
    return;
  }

  res.status(401).json({ error: "Usuario o contrasena incorrectos." });
});

app.post("/api/admin/logout", requireAuth, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("streamhub.sid");
    res.clearCookie(signedAuthCookieName, { path: "/" });
    res.json({ ok: true });
  });
});

app.post("/api/admin/sesiones/revocar", requirePermission("*"), async (req, res) => {
  const usuario = String(req.body?.usuario || "").trim();
  if (!usuario || usuario.length > 128) return res.status(400).json({ error: "Indica el usuario cuyas sesiones deseas revocar." });
  await sessionVersions.revoke(usuario);
  await audit(req, { entidad: "usuario", entidad_id: usuario, accion: "revocar_sesiones" });
  res.json({ ok: true });
});

app.get("/api/admin/dashboard-snapshot", requireAuth, async (req, res) => {
  try {
    const permissions = getSessionPermissions(req);
    const resources = {
      products: getCachedAdminProducts,
      orders: async () => (await orderStore.listOrders()).map(normalizeOrder),
      inventory: readInventory,
      renewals: readRenewals,
      providers: readProviders,
      provider_purchases: readProviderPurchases,
      payment_methods: () => paymentMethodStore.listMethods(),
    };
    let snapshot;
    if (permissions.includes("*") && typeof inventoryStore.getDashboardSnapshot === "function") {
      const raw = await inventoryStore.getDashboardSnapshot();
      snapshot = {
        products: raw.products.map(normalizeProduct), orders: raw.orders.map(normalizeOrder),
        inventory: raw.inventory.map(normalizeInventoryItem), renewals: raw.renewals.map(normalizeRenewal),
        providers: raw.providers.map(normalizeProvider), provider_purchases: raw.provider_purchases.map(normalizeProviderPurchase),
        payment_methods: raw.payment_methods,
      };
    } else {
      snapshot = Object.fromEntries(await Promise.all(Object.entries(resources).map(async ([resource, load]) =>
        [resource, canRead(permissions, resource) ? await load() : []]
      )));
    }
    res.json(operationalResponse(req, snapshot));
  } catch (error) {
    logUnexpectedError(error);
    res.status(500).json({ error: "No se pudo cargar el resumen operativo." });
  }
});

app.get("/api/admin/inventario", requireRead("inventory"), async (req, res) => {
  try {
    res.json(operationalResponse(req, await readInventory(), "inventory"));
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo cargar el inventario de cuentas." });
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
    await clearPublicApiCache("products-with-stock");
    res.status(201).json(item);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo crear la cuenta de inventario." });
  }
});

async function handleBulkInventoryUpdate(req, res) {
  try {
    const filters = req.body?.filters || {};
    const patch = req.body?.patch || {};
    const beforeItems = (await readInventory()).filter((item) => inventoryMatchesBulkFilters(item, normalizeBulkInventoryFilters(filters)));
    const updatedItems = await bulkUpdateInventoryItems(filters, patch);

    await audit(req, {
      entidad: "inventario",
      entidad_id: "bulk-update",
      accion: "actualizar_masivo",
      antes: beforeItems,
      despues: updatedItems,
      detalles: {
        filtros: normalizeBulkInventoryFilters(filters),
        campos: Object.keys(normalizeBulkInventoryPatch(patch)),
        cantidad: updatedItems.length,
      },
    });

    if (updatedItems.length > 0) {
      await clearPublicApiCache("products-with-stock");
    }
    res.json({ updated: updatedItems.length, items: updatedItems });
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo actualizar el inventario masivamente." });
  }
}

app.post("/api/admin/inventario/bulk-update", requirePermission("inventario"), handleBulkInventoryUpdate);
app.patch("/api/admin/inventario/bulk-update", requirePermission("inventario"), handleBulkInventoryUpdate);

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
    await clearPublicApiCache("products-with-stock");
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
    await clearPublicApiCache("products-with-stock");
    res.json(saved);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo liberar la cuenta." });
  }
});

app.get("/api/admin/operaciones-renovacion/:id", requireAuth, async (req, res) => {
  if (!hasPermission(req, "inventario") && !hasPermission(req, "renovaciones")) {
    res.status(403).json({ error: "No tienes permisos para consultar renovaciones." }); return;
  }
  if (typeof renewalStore.getOperation !== "function") { res.json({ state: "not_started" }); return; }
  try {
    const operation = await renewalStore.getOperation(req.params.id);
    if (operation.result) {
      delete operation.result.before;
      operation.result.item = operationalResponse(req, operation.result.item, "inventory");
      operation.result.order = operationalResponse(req, operation.result.order, "orders");
    }
    res.json(operation);
  } catch (error) { res.status(error.statusCode || 502).json({ error: error.message, code: error.code || "" }); }
});

function requireRenewalOperationId(body) {
  const id = String(body.operation_id || "");
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(id)) {
    const error = new Error("Actualiza el panel y vuelve a intentar la renovacion."); error.statusCode = 400; throw error;
  }
  return id;
}

app.put("/api/admin/inventario/:id/renovar", requirePermission("inventario"), async (req, res) => {
  try {
    const result = typeof inventoryStore.renewItem === "function"
      ? await inventoryStore.renewItem(req.params.id, req.body || {}, requireRenewalOperationId(req.body || {})) : null;
    const before = result ? result.before : (await readInventory()).find((entry) => entry.inventario_id === req.params.id) || {};
    const saved = result ? normalizeInventoryItem(result.item) : await renewInventoryItem(req.params.id, req.body || {});
    if (!result?.replayed) await audit(req, {
      entidad: "inventario",
      entidad_id: saved.inventario_id,
      accion: "renovar",
      antes: before,
      despues: saved,
      detalles: { vencimiento_anterior: before.fecha_vencimiento_cliente || "", vencimiento_nuevo: saved.fecha_vencimiento_cliente || "" },
    });
    await clearPublicApiCache("products-with-stock");
    res.json(result ? { ...saved, operation_id: result.operation_id, updated_order: result.order } : saved);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo renovar la cuenta.", code: error.code || "" });
  }
});

app.get("/api/admin/renovaciones", requireRead("renewals"), async (req, res) => {
  try {
    res.json(operationalResponse(req, await readRenewals(), "renewals"));
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

    if (typeof renewalStore.confirmRenewal === "function") {
      const operationId = requireRenewalOperationId(req.body || {});
      const patch = { ...(req.body || {}) };
      delete patch.operation_id;
      delete patch.comprobante_archivo;
      const file = proofFileToPayload(req.file);
      if (file) {
        const uploaded = await renewalStore.uploadOperationProof(file, operationId);
        patch.comprobante_url = uploaded.url;
        patch.comprobante_referencia = String(patch.comprobante_referencia || file.nombre);
        patch.comprobante_notas = [patch.comprobante_notas, "Archivo: " + uploaded.nombre].filter(Boolean).join(" | ");
      }
      const result = await renewalStore.confirmRenewal(req.params.id, patch, operationId);
      if (!result.replayed) await audit(req, {
        entidad: "renovacion", entidad_id: result.renewal.renovacion_id, accion: "confirmar",
        antes: result.before, despues: result.renewal,
        detalles: { operation_id: operationId, inventario_id: result.renewal.inventario_id, vencimiento_nuevo: result.renewal.vencimiento_nuevo },
      });
      res.json({ renewal: result.renewal, item: result.item, order: result.order, operation_id: operationId });
      return;
    }
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
    } else if (proofFile) {
      const uploadedProof = await uploadProofFileToAppsScript(proofFile).catch((error) => {
        logUnexpectedError(error);
        return null;
      });

      if (uploadedProof?.url) {
        payload.comprobante_url = uploadedProof.url;
      }

      payload.comprobante_notas = [
        payload.comprobante_notas,
        uploadedProof ? `Archivo: ${uploadedProof.nombre}` : `Archivo recibido localmente: ${proofFile.nombre}`,
      ]
        .filter(Boolean)
        .join(" | ");
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
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo confirmar la renovacion.", code: error.code || "" });
  }
});

app.get("/api/admin/proveedores", requireRead("providers"), async (req, res) => {
  try {
    res.json(operationalResponse(req, await readProviders(), "providers"));
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

app.get("/api/admin/compras-proveedor", requireRead("provider_purchases"), async (req, res) => {
  try {
    res.json(operationalResponse(req, await readProviderPurchases(), "provider_purchases"));
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
    if (Number(purchase.inventario_generado || 0) > 0) {
      await clearPublicApiCache("products-with-stock");
    }
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
    if (Number(purchase.inventario_generado || 0) > 0 || before.estado !== purchase.estado) {
      await clearPublicApiCache("products-with-stock");
    }
    res.json(purchase);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo actualizar la compra de proveedor." });
  }
});

app.get("/api/admin/auditoria", requireRead("audit"), async (req, res) => {
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

  sendPublicHtml(req, res, "admin.html");
});

app.get(["/", "/index.html"], (req, res) => {
  sendPublicHtml(req, res, "index.html");
});

app.get("/login.html", (req, res) => {
  sendPublicHtml(req, res, "login.html");
});

app.get("/styles.css", (req, res) => {
  sendCachedAsset(req, res, "styles.css");
});

app.get("/script.js", (req, res) => {
  sendCachedAsset(req, res, "script.js");
});

app.get("/login.js", (req, res) => {
  sendCachedAsset(req, res, "login.js");
});

app.get("/admin-reports.js", requireAuth, (req, res) => {
  sendCachedAsset(req, res, "admin-reports.js", "private, no-store");
});

app.get("/admin.js", requireAuth, (req, res) => {
  sendCachedAsset(req, res, "admin.js", "private, no-store");
});

app.get("/site.webmanifest", (req, res) => {
  sendCachedAsset(req, res, "site.webmanifest", "public, max-age=86400");
});

app.get("/favicon.ico", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=2592000");
  res.type("image/webp");
  res.sendFile(path.join(publicDir, "assets", "images", "LogoMawg-256.webp"));
});

app.get("/robots.txt", (req, res) => {
  const baseUrl = getPublicBaseUrl(req);

  res.type("text/plain");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(["User-agent: *", "Allow: /", "Disallow: /admin.html", "Disallow: /login.html", `Sitemap: ${baseUrl}/sitemap.xml`, ""].join("\n"));
});

app.get("/sitemap.xml", (req, res) => {
  const baseUrl = getPublicBaseUrl(req);
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${baseUrl}/`, priority: "1.0" },
  ];

  res.type("application/xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`);
});

app.use(
  "/assets",
  express.static(path.join(publicDir, "assets"), {
    immutable: true,
    maxAge: "30d",
  })
);

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

    let order;
    if (typeof orderStore.submitProof === "function") {
      order = await orderStore.submitProof(req.params.id, patch);
    } else {
      const uploadedProof = await uploadProofFileToAppsScript(proofFile).catch((error) => {
        logUnexpectedError(error);
        return null;
      });
      order = await orderStore.updateOrder(req.params.id, {
        ...patch,
        comprobante_archivo: undefined,
        comprobante_url: uploadedProof?.url || "",
        comprobante_notas: [patch.comprobante_notas, uploadedProof ? `Archivo: ${uploadedProof.nombre}` : proofFile ? `Archivo recibido localmente: ${proofFile.nombre}` : ""]
          .filter(Boolean)
          .join(" | "),
      });
    }
    res.json(order);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo registrar el comprobante." });
  }
});

app.get("/api/admin/pedidos", requireRead("orders"), async (req, res) => {
  try {
    res.json(operationalResponse(req, await orderStore.listOrders(), "orders"));
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

      if (typeof orderStore.submitProof === "function") {
        savedOrder = normalizeOrder(await orderStore.submitProof(order.pedido_id, proofPatch));
      } else {
        const uploadedProof = await uploadProofFileToAppsScript(proofFile).catch((error) => {
          logUnexpectedError(error);
          return null;
        });
        savedOrder = normalizeOrder(
          await orderStore.updateOrder(order.pedido_id, {
            ...proofPatch,
            comprobante_archivo: undefined,
            comprobante_url: uploadedProof?.url || "",
            comprobante_notas: [proofPatch.comprobante_notas, uploadedProof ? `Archivo: ${uploadedProof.nombre}` : proofFile ? `Archivo recibido localmente: ${proofFile.nombre}` : ""]
              .filter(Boolean)
              .join(" | "),
          })
        );
      }

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
    await clearPublicApiCache("products-with-stock");
    res.json(result);
  } catch (error) {
    logUnexpectedError(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "No se pudo asignar la cuenta al pedido." });
  }
});

app.use((error, _req, res, _next) => {
  logUnexpectedError(error);
  if (res.headersSent) return _next(error);
  res.status(error.type === "entity.parse.failed" ? 400 : 503).json({ error: error.type === "entity.parse.failed" ? "El formato de la solicitud no es valido." : "El servicio no esta disponible temporalmente. Intenta nuevamente." });
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
