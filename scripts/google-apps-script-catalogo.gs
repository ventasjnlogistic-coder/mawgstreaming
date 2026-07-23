const SHEET_NAME = "Productos";
const ORDERS_SHEET_NAME = "Pedidos";
const INVENTORY_SHEET_NAME = "InventarioCuentas";
const RENEWALS_SHEET_NAME = "Renovaciones";
const PAYMENT_METHODS_SHEET_NAME = "MetodosPago";
const MESSAGE_TEMPLATES_SHEET_NAME = "PlantillasMensajes";
const SITE_SETTINGS_SHEET_NAME = "ConfiguracionSitio";
const ADMIN_USERS_SHEET_NAME = "UsuariosAdmin";
const PROVIDERS_SHEET_NAME = "Proveedores";
const PROVIDER_PURCHASES_SHEET_NAME = "ComprasProveedor";
const ADMIN_TOKEN = "cambia-este-token-largo";
const PROOF_DRIVE_FOLDER_ID = "cambia-este-id-de-carpeta-drive";
const PROOF_FILE_PUBLIC_LINK = false;
const SPREADSHEET_ID = "cambia-este-id-de-tu-spreadsheet";
const DEFAULT_DELIVERY_TEMPLATE = [
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
const HEADERS = ["id", "nombre", "tipo", "precio", "descripcion", "imagen", "estado", "categoria", "badge", "cta", "componentes", "plantilla_entrega", "vender", "orden"];
const ORDER_HEADERS = [
  "pedido_id",
  "producto_id",
  "producto_nombre",
  "producto_precio",
  "metodo_pago",
  "cliente_nombre",
  "cliente_contacto",
  "comprobante_url",
  "comprobante_referencia",
  "comprobante_notas",
  "estado",
  "creado_en",
  "actualizado_en",
  "inventario_id",
  "proveedor",
  "costo_proveedor",
  "fecha_entrega",
  "fecha_vencimiento_cliente",
  "datos_entrega",
  "asignaciones_inventario",
  "canal_venta",
];
const ORDER_STATUSES = ["pendiente de pago", "comprobante recibido", "pagado", "entregado", "cancelado"];
const INVENTORY_HEADERS = [
  "inventario_id",
  "producto_id",
  "producto_nombre",
  "proveedor",
  "costo_proveedor",
  "cuenta_usuario",
  "cuenta_clave",
  "perfil_nombre",
  "pin",
  "estado",
  "pedido_id",
  "cliente_nombre",
  "cliente_contacto",
  "fecha_compra",
  "fecha_entrega",
  "fecha_vencimiento_cliente",
  "notas",
  "creado_en",
  "actualizado_en",
  "precio_venta_sugerido",
  "celular_proveedor",
  "referencia_compra",
  "estado_control",
  "fecha_vencimiento_proveedor",
  "compra_id",
  "url_producto",
];
const INVENTORY_STATUSES = ["pendiente_revision", "disponible", "ocupado", "reservado", "por_vencer", "vencido", "reclamo", "baja"];
const RENEWAL_HEADERS = [
  "renovacion_id",
  "pedido_id",
  "inventario_id",
  "cliente_nombre",
  "cliente_contacto",
  "producto_nombre",
  "monto",
  "metodo_pago",
  "comprobante_url",
  "comprobante_referencia",
  "comprobante_notas",
  "estado",
  "fecha_aviso",
  "fecha_pago",
  "fecha_confirmacion",
  "vencimiento_anterior",
  "vencimiento_nuevo",
  "notas",
  "creado_en",
  "actualizado_en",
];
const RENEWAL_STATUSES = ["pendiente_aviso", "avisado", "comprobante_recibido", "pagado", "renovado", "vencido", "cancelado"];
const OPEN_RENEWAL_STATUSES = ["pendiente_aviso", "avisado", "comprobante_recibido", "pagado"];
const PAYMENT_METHOD_HEADERS = ["id", "nombre", "tipo", "titular", "numero", "cci", "banco", "qr_imagen", "instrucciones", "estado", "orden"];
const MESSAGE_TEMPLATE_HEADERS = ["id", "nombre", "asunto", "contenido", "estado", "orden"];
const SITE_SETTING_HEADERS = ["id", "nombre", "valor", "tipo", "estado", "orden"];
const ADMIN_USER_HEADERS = ["usuario", "nombre", "rol", "password", "estado", "permisos"];
const PROVIDER_HEADERS = ["proveedor_id", "nombre", "contacto", "producto_principal", "costo_referencial", "estado", "notas", "creado_en", "actualizado_en"];
const PROVIDER_PURCHASE_HEADERS = [
  "compra_id",
  "proveedor_id",
  "proveedor_nombre",
  "producto_id",
  "producto_nombre",
  "cantidad",
  "costo_total",
  "costo_unitario",
  "metodo_pago",
  "referencia_pago",
  "fecha_compra",
  "fecha_vencimiento_proveedor",
  "estado",
  "notas",
  "creado_en",
  "actualizado_en",
  "cuenta_usuario",
  "cuenta_clave",
  "url_producto",
];
const PROVIDER_STATUSES = ["activo", "observado", "inactivo"];
const PROVIDER_PURCHASE_STATUSES = ["pendiente", "pagado", "recibido", "parcial", "cancelado"];
const DEFAULT_PAYMENT_METHODS = [
  ["yape", "Yape", "billetera", "Eduardo Leoncio Lujan Romero", "913344874", "", "", "assets/images/pago.png", "Escanea el QR o usa el numero visible. Luego adjunta tu comprobante para validarlo.", "activo", 1],
  ["plin", "Plin", "billetera", "MAWG Streaming", "988888888", "", "", "", "Usa el numero afiliado y confirma el pago adjuntando tu captura o PDF.", "activo", 2],
  ["transferencia", "Transferencia", "banco", "MAWG Streaming", "191-00000000-0-00", "002-191-000000000000-00", "BCP", "", "Realiza la transferencia y envia el comprobante para validar tu pedido.", "activo", 3],
];
const DEFAULT_MESSAGE_TEMPLATES = [
  ["entrega", "Entrega", "Datos de acceso", ":estrella: Hola {{cliente_nombre}}, tu servicio {{producto_nombre}} esta listo.\n\n{{datos_entrega}}\n\n:calendario: Vence: {{vencimiento_formateado}}", "activo", 1],
  ["renovacion", "Renovacion", "Renovacion de servicio", ":estrella: Hola {{cliente_nombre}}, tu servicio {{producto_nombre}} esta por vencer el {{vencimiento_formateado}}.\n\n:alerta: Puedes renovar por {{monto}}.", "activo", 2],
  ["corte_servicio", "Corte de servicio", "Servicio cortado", ":alerta: Hola {{cliente_nombre}}, tu servicio {{producto_nombre}} ha sido cortado por falta de pago.\n\nPedido: {{pedido_id}}\nVencimiento: {{vencimiento_formateado}}\n\n:estrella: Para reactivarlo, por favor realiza el pago de {{monto}}.", "activo", 3],
  ["actualizacion_datos", "Actualizacion de datos", "Actualizacion de credenciales", ":alerta::megafono: MAWG Streaming te informa: :check::pin_marcador:\n\n:check: ACTUALIZACION DE DATOS :check: | {{producto_nombre}}\n\n:laptop: CORREO: {{cuenta_usuario}}\n:candado: CONTRASENA: {{cuenta_clave}}\n\n:perfil_hombre: PERFIL: {{perfil_nombre}}\n:pin_personal: PIN: {{pin}}\n:calendario: FECHA DE RENOVACION: {{vencimiento_formateado}}", "activo", 4],
  ["confirmacion_pago", "Confirmacion de pago", "Pago confirmado", "Hola {{cliente_nombre}}, confirmamos el pago de {{producto_nombre}}. Estamos preparando la entrega.", "activo", 5],
  ["reclamo", "Reclamo proveedor", "Revision de cuenta", "Hola {{proveedor}}, necesitamos revisar la cuenta {{cuenta_usuario}} del producto {{producto_nombre}}.", "activo", 6],
];
const DEFAULT_SITE_SETTINGS = [
  ["ventas_whatsapp", "WhatsApp ventas", "51921217484", "telefono", "activo", 1],
  ["ventas_mensaje", "Mensaje ventas", "Hola, quiero consultar productos disponibles", "texto", "activo", 2],
  ["soporte_whatsapp", "WhatsApp soporte", "51921217484", "telefono", "activo", 3],
  ["soporte_mensaje", "Mensaje soporte", "Hola, necesito soporte con mi cuenta", "texto", "activo", 4],
  ["horario_titulo", "Titulo horario", "Horario de atencion", "texto", "activo", 5],
  ["horario_linea_1", "Horario linea 1", "Lunes a sabado: 9:00 a.m. - 10:00 p.m.", "texto", "activo", 6],
  ["horario_linea_1_nombre", "Nombre horario linea 1", "Atencion", "texto", "activo", 7],
  ["horario_linea_2", "Horario linea 2", "Domingos y feriados: atencion por disponibilidad", "texto", "activo", 8],
  ["horario_linea_2_nombre", "Nombre horario linea 2", "Especial", "texto", "activo", 9],
  ["horario_nota", "Nota de horario", "Los pedidos y renovaciones se atienden por orden de llegada.", "texto", "activo", 10],
  ["horario_nota_nombre", "Nombre nota horario", "Nota", "texto", "activo", 11],
];
const DEFAULT_ADMIN_USERS = [
  ["admin", "Administrador", "admin", "cambia-esta-contrasena", "activo", "*"],
];

function doGet(e) {
  try {
    const action = (e.parameter.action || "list").toLowerCase();

    if (action !== "list") {
      return jsonResponse({ ok: false, error: "Accion no soportada." });
    }

    return jsonResponse({ ok: true, products: listProducts_() });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const action = String(payload.action || "").toLowerCase();

    if (action === "orders.create") {
      return jsonResponse({ ok: true, order: createOrder_(payload.order || {}) });
    }

    if (action === "orders.proof") {
      if (!isValidToken_(payload.token)) {
        return jsonResponse({ ok: false, error: "Token de administracion invalido." });
      }

      return jsonResponse({
        ok: true,
        order: submitOrderProof_(payload.id, payload.proof || {}, payload.proof_drive_folder_id),
      });
    }

    if (action === "users.auth") {
      return jsonResponse(authenticateAdminUser_(payload.usuario, payload.password));
    }

    if (!isValidToken_(payload.token)) {
      return jsonResponse({ ok: false, error: "Token de administracion invalido." });
    }

    if (action === "create") {
      return jsonResponse({ ok: true, product: createProduct_(payload.product || {}) });
    }

    if (action === "update") {
      return jsonResponse({ ok: true, product: updateProduct_(payload.id, payload.product || {}) });
    }

    if (action === "delete") {
      deleteProduct_(payload.id);
      return jsonResponse({ ok: true });
    }

    if (action === "replace") {
      replaceProducts_(payload.products || []);
      return jsonResponse({ ok: true, products: listProducts_() });
    }

    if (action === "orders.list") {
      return jsonResponse({ ok: true, orders: listOrders_() });
    }

    if (action === "orders.update") {
      return jsonResponse({ ok: true, order: updateOrder_(payload.id, payload.order || {}) });
    }

    if (action === "inventory.list") {
      return jsonResponse({ ok: true, inventory: listInventory_() });
    }

    if (action === "inventory.create") {
      return jsonResponse({ ok: true, item: createInventoryItem_(payload.item || {}) });
    }

    if (action === "inventory.update") {
      return jsonResponse({ ok: true, item: updateInventoryItem_(payload.id, payload.item || {}) });
    }

    if (action === "inventory.assign") {
      return jsonResponse(assignInventoryToOrder_(payload.order_id, payload.inventory_id, payload.assignment || {}));
    }

    if (action === "inventory.assignmany") {
      return jsonResponse(assignManyInventoryToOrder_(payload.order_id, payload.assignments || [], payload.assignment || {}));
    }

    if (action === "renewals.list") {
      return jsonResponse({ ok: true, renewals: listRenewals_() });
    }

    if (action === "renewals.create") {
      return jsonResponse({ ok: true, renewal: createRenewal_(payload.renewal || {}) });
    }

    if (action === "renewals.update") {
      return jsonResponse({ ok: true, renewal: updateRenewal_(payload.id, payload.renewal || {}) });
    }

    if (action === "renewals.proof") {
      return jsonResponse({
        ok: true,
        renewal: submitRenewalProof_(payload.id, payload.proof || {}, payload.proof_drive_folder_id),
      });
    }

    if (action === "paymentmethods.list") {
      return jsonResponse({ ok: true, payment_methods: listPaymentMethods_() });
    }

    if (action === "paymentmethods.create") {
      return jsonResponse({ ok: true, payment_method: createPaymentMethod_(payload.payment_method || {}) });
    }

    if (action === "paymentmethods.update") {
      return jsonResponse({ ok: true, payment_method: updatePaymentMethod_(payload.id, payload.payment_method || {}) });
    }

    if (action === "paymentmethods.delete") {
      deletePaymentMethod_(payload.id);
      return jsonResponse({ ok: true });
    }

    if (action === "templates.list") {
      return jsonResponse({ ok: true, templates: listMessageTemplates_() });
    }

    if (action === "templates.update") {
      return jsonResponse({ ok: true, template: updateMessageTemplate_(payload.id, payload.template || {}) });
    }

    if (action === "sitesettings.list") {
      return jsonResponse({ ok: true, site_settings: listSiteSettings_() });
    }

    if (action === "sitesettings.update") {
      return jsonResponse({ ok: true, site_setting: updateSiteSetting_(payload.id, payload.setting || {}) });
    }

    if (action === "providers.list") {
      return jsonResponse({ ok: true, providers: listProviders_() });
    }

    if (action === "providers.create") {
      return jsonResponse({ ok: true, provider: createProvider_(payload.provider || {}) });
    }

    if (action === "providers.update") {
      return jsonResponse({ ok: true, provider: updateProvider_(payload.id, payload.provider || {}) });
    }

    if (action === "providerpurchases.list") {
      return jsonResponse({ ok: true, provider_purchases: listProviderPurchases_() });
    }

    if (action === "providerpurchases.create") {
      return jsonResponse({ ok: true, provider_purchase: createProviderPurchase_(payload.purchase || {}) });
    }

    if (action === "providerpurchases.update") {
      return jsonResponse({ ok: true, provider_purchase: updateProviderPurchase_(payload.id, payload.purchase || {}) });
    }

    return jsonResponse({ ok: false, error: "Accion no soportada." });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function parsePayload_(e) {
  try {
    return JSON.parse(e.postData.contents || "{}");
  } catch (error) {
    return {};
  }
}

function isValidToken_(token) {
  return String(token || "") === ADMIN_TOKEN;
}

function getSheet_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error('No existe la pestana "' + SHEET_NAME + '".');
  }

  ensureHeaders_(sheet);
  return sheet;
}

function getOrdersSheet_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(ORDERS_SHEET_NAME) || spreadsheet.insertSheet(ORDERS_SHEET_NAME);
  ensureSpecificHeaders_(sheet, ORDER_HEADERS);
  return sheet;
}

function getInventorySheet_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(INVENTORY_SHEET_NAME) || spreadsheet.insertSheet(INVENTORY_SHEET_NAME);
  ensureSpecificHeaders_(sheet, INVENTORY_HEADERS);
  ensureTextColumns_(sheet, INVENTORY_HEADERS, ["cuenta_clave", "pin"]);
  return sheet;
}

function getRenewalsSheet_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(RENEWALS_SHEET_NAME) || spreadsheet.insertSheet(RENEWALS_SHEET_NAME);
  ensureSpecificHeaders_(sheet, RENEWAL_HEADERS);
  return sheet;
}

function getPaymentMethodsSheet_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(PAYMENT_METHODS_SHEET_NAME) || spreadsheet.insertSheet(PAYMENT_METHODS_SHEET_NAME);
  ensureSpecificHeaders_(sheet, PAYMENT_METHOD_HEADERS);
  seedDefaultPaymentMethods_(sheet);
  return sheet;
}

function getMessageTemplatesSheet_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(MESSAGE_TEMPLATES_SHEET_NAME) || spreadsheet.insertSheet(MESSAGE_TEMPLATES_SHEET_NAME);
  ensureSpecificHeaders_(sheet, MESSAGE_TEMPLATE_HEADERS);
  seedDefaultMessageTemplates_(sheet);
  return sheet;
}

function getSiteSettingsSheet_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(SITE_SETTINGS_SHEET_NAME) || spreadsheet.insertSheet(SITE_SETTINGS_SHEET_NAME);
  ensureSpecificHeaders_(sheet, SITE_SETTING_HEADERS);
  seedDefaultSiteSettings_(sheet);
  return sheet;
}

function getAdminUsersSheet_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(ADMIN_USERS_SHEET_NAME) || spreadsheet.insertSheet(ADMIN_USERS_SHEET_NAME);
  ensureSpecificHeaders_(sheet, ADMIN_USER_HEADERS);
  seedDefaultAdminUsers_(sheet);
  return sheet;
}

function getProvidersSheet_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(PROVIDERS_SHEET_NAME) || spreadsheet.insertSheet(PROVIDERS_SHEET_NAME);
  ensureSpecificHeaders_(sheet, PROVIDER_HEADERS);
  return sheet;
}

function getProviderPurchasesSheet_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(PROVIDER_PURCHASES_SHEET_NAME) || spreadsheet.insertSheet(PROVIDER_PURCHASES_SHEET_NAME);
  ensureSpecificHeaders_(sheet, PROVIDER_PURCHASE_HEADERS);
  ensureColumnsByName_(sheet, PROVIDER_PURCHASE_HEADERS);
  return sheet;
}

function getSpreadsheet_() {
  const spreadsheetId = String(SPREADSHEET_ID || "").trim();

  if (spreadsheetId && spreadsheetId !== "cambia-este-id-de-tu-spreadsheet") {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (activeSpreadsheet) {
    return activeSpreadsheet;
  }

  throw new Error("Configura SPREADSHEET_ID en el Apps Script con el ID de tu Google Sheet.");
}

function crearHojaMetodosPago() {
  const sheet = getPaymentMethodsSheet_();
  return {
    success: true,
    mensaje: "Hoja MetodosPago creada o actualizada correctamente.",
    filas: Math.max(sheet.getLastRow() - 1, 0),
  };
}

function crearHojaPlantillasMensajes() {
  const sheet = getMessageTemplatesSheet_();
  return {
    success: true,
    mensaje: "Hoja PlantillasMensajes creada o actualizada correctamente.",
    filas: Math.max(sheet.getLastRow() - 1, 0),
  };
}

function crearHojaConfiguracionSitio() {
  const sheet = getSiteSettingsSheet_();
  return {
    success: true,
    mensaje: "Hoja ConfiguracionSitio creada o actualizada correctamente.",
    filas: Math.max(sheet.getLastRow() - 1, 0),
  };
}

function crearHojaUsuariosAdmin() {
  const sheet = getAdminUsersSheet_();
  return {
    success: true,
    mensaje: "Hoja UsuariosAdmin creada o actualizada correctamente.",
    filas: Math.max(sheet.getLastRow() - 1, 0),
  };
}

function migrarComprasProveedorCredenciales() {
  const sheet = getProviderPurchasesSheet_();
  ensureColumnsByName_(sheet, PROVIDER_PURCHASE_HEADERS);

  return {
    success: true,
    mensaje: "Columnas cuenta_usuario y cuenta_clave verificadas en ComprasProveedor.",
    headers: sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0],
  };
}

function migrarColumnaOrdenProductos() {
  const sheet = getSheet_();
  ensureColumnsByName_(sheet, HEADERS);
  ensureSpecificHeaders_(sheet, HEADERS);

  return {
    success: true,
    mensaje: "Columna orden verificada en Productos.",
    headers: sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0],
  };
}

function debugComprasProveedorHeaders() {
  const sheet = getProviderPurchasesSheet_();
  return {
    hoja: PROVIDER_PURCHASES_SHEET_NAME,
    columnas: sheet.getLastColumn(),
    headers: sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0],
  };
}

function ensureHeaders_(sheet) {
  ensureColumnsByName_(sheet, HEADERS);
  ensureSpecificHeaders_(sheet, HEADERS);
}

function ensureSpecificHeaders_(sheet, headers) {
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = current.some(function (value) {
    return value;
  });

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  for (let index = 0; index < headers.length; index += 1) {
    if (current[index] !== headers[index]) {
      sheet.getRange(1, index + 1).setValue(headers[index]);
    }
  }
}

function ensureTextColumns_(sheet, headers, columnNames) {
  const maxRows = sheet.getMaxRows();

  columnNames.forEach(function (name) {
    const index = headers.indexOf(name);

    if (index >= 0) {
      sheet.getRange(1, index + 1, maxRows, 1).setNumberFormat("@");
    }
  });
}

function ensureColumnsByName_(sheet, headers) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (value) {
    return String(value || "").trim();
  });

  headers.forEach(function (header) {
    if (currentHeaders.indexOf(header) >= 0) {
      return;
    }

    sheet.insertColumnAfter(sheet.getLastColumn());
    sheet.getRange(1, sheet.getLastColumn()).setValue(header);
    currentHeaders.push(header);
  });
}

function listProducts_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, HEADERS.length)
    .getValues()
    .filter(function (row) {
      return row.some(function (value) {
        return value !== "";
      });
    })
    .map(rowToProduct_);
}

function createProduct_(product) {
  const normalized = normalizeProduct_(product);
  const sheet = getSheet_();

  validateProduct_(normalized);

  if (findRowById_(sheet, normalized.id) > 0) {
    throw new Error("Ya existe un producto con ese ID.");
  }

  sheet.appendRow(productToRow_(normalized));
  return normalized;
}

function updateProduct_(id, product) {
  const normalized = normalizeProduct_(Object.assign({}, product, { id: product.id || id }));
  const sheet = getSheet_();
  const row = findRowById_(sheet, id);

  validateProduct_(normalized);

  if (row < 1) {
    throw new Error("Producto no encontrado.");
  }

  const duplicateRow = findRowById_(sheet, normalized.id);
  if (duplicateRow > 0 && duplicateRow !== row) {
    throw new Error("Ya existe un producto con ese ID.");
  }

  sheet.getRange(row, 1, 1, HEADERS.length).setValues([productToRow_(normalized)]);
  return normalized;
}

function deleteProduct_(id) {
  const sheet = getSheet_();
  const row = findRowById_(sheet, id);

  if (row < 1) {
    throw new Error("Producto no encontrado.");
  }

  sheet.deleteRow(row);
}

function replaceProducts_(products) {
  products.map(normalizeProduct_).forEach(validateProduct_);

  const sheet = getSheet_();
  sheet.clearContents();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

  if (products.length > 0) {
    sheet.getRange(2, 1, products.length, HEADERS.length).setValues(products.map(normalizeProduct_).map(productToRow_));
  }
}

function aplicarPlantillaEntregaATodosProductos() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  const templateColumn = HEADERS.indexOf("plantilla_entrega") + 1;

  if (lastRow < 2 || templateColumn < 1) {
    return { success: true, mensaje: "No hay productos para actualizar.", actualizados: 0 };
  }

  const values = Array.from({ length: lastRow - 1 }, function () {
    return [DEFAULT_DELIVERY_TEMPLATE];
  });

  sheet.getRange(2, templateColumn, values.length, 1).setValues(values);

  return {
    success: true,
    mensaje: "Plantilla de entrega aplicada a todos los productos.",
    actualizados: values.length,
  };
}

function findRowById_(sheet, id) {
  const targetId = String(id || "");
  const lastRow = sheet.getLastRow();

  if (!targetId || lastRow < 2) {
    return -1;
  }

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let index = 0; index < ids.length; index += 1) {
    if (String(ids[index][0]) === targetId) {
      return index + 2;
    }
  }

  return -1;
}

function rowToProduct_(row) {
  return HEADERS.reduce(function (product, key, index) {
    const value = row[index];
    if (key === "precio") {
      product[key] = value !== "" && !isNaN(Number(value)) ? Number(value) : value || "";
    } else if (key === "componentes") {
      product[key] = parseJsonArray_(value);
    } else if (key === "plantilla_entrega") {
      product[key] = value || DEFAULT_DELIVERY_TEMPLATE;
    } else {
      product[key] = value || "";
    }
    return product;
  }, {});
}

function productToRow_(product) {
  return HEADERS.map(function (key) {
    if (key === "componentes") {
      return product.componentes && product.componentes.length ? JSON.stringify(product.componentes) : "";
    }
    return product[key] === undefined || product[key] === null ? "" : product[key];
  });
}

function normalizeProduct_(product) {
  const price = Number(product.precio);

  return {
    id: String(product.id || slugify_(product.nombre || "")).trim(),
    nombre: String(product.nombre || "").trim(),
    tipo: product.tipo || "",
    precio: product.precio === "" || product.precio === undefined || product.precio === null || isNaN(price) ? "" : price,
    descripcion: product.descripcion || "",
    plantilla_entrega: String(product.plantilla_entrega || DEFAULT_DELIVERY_TEMPLATE).trim(),
    imagen: normalizeProductImage_(product.imagen),
    estado: product.estado === "agotado" ? "agotado" : "disponible",
    vender: String(product.vender || "no").trim().toLowerCase() === "si" ? "si" : "no",
    categoria: product.categoria || "",
    badge: product.badge || "",
    cta: product.cta || "Comprar",
    orden: Number.isFinite(Number(product.orden)) ? Number(product.orden) : 999,
    componentes: normalizeProductComponents_(product.componentes),
  };
}

function getDriveFileId_(value) {
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

  for (let i = 0; i < patterns.length; i++) {
    const match = rawValue.match(patterns[i]);
    if (match && match[1]) {
      return decodeURIComponent(match[1]).trim();
    }
  }

  return "";
}

function normalizeProductImage_(value) {
  const image = String(value || "").trim();
  const driveFileId = getDriveFileId_(image);

  if (!driveFileId) {
    return image;
  }

  return "https://drive.google.com/thumbnail?id=" + encodeURIComponent(driveFileId) + "&sz=w1200";
}

function normalizeProductComponents_(value) {
  var entries = value;

  if (!entries) {
    return [];
  }

  if (typeof entries === "string") {
    entries = parseJsonArray_(entries);
  }

  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map(function (entry, index) {
      if (typeof entry === "string") {
        return {
          id: slugify_(entry) || "componente-" + (index + 1),
          nombre: String(entry || "").trim(),
          producto_id: slugify_(entry),
        };
      }

      var nombre = String(entry.nombre || entry.componente_nombre || entry.producto_nombre || entry.producto_id || entry.id || "").trim();
      var productoId = String(entry.producto_id || entry.id || slugify_(nombre)).trim();

      return {
        id: String(entry.id || productoId || "componente-" + (index + 1)).trim(),
        nombre: nombre,
        producto_id: productoId,
      };
    })
    .filter(function (entry) {
      return entry.nombre || entry.producto_id;
    });
}

function parseJsonArray_(value) {
  if (!value) {
    return [];
  }

  try {
    var parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function validateProduct_(product) {
  if (!product.id) {
    throw new Error("El ID es obligatorio.");
  }

  if (!product.nombre) {
    throw new Error("El nombre es obligatorio.");
  }
}

function slugify_(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function listOrders_() {
  const sheet = getOrdersSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, ORDER_HEADERS.length)
    .getValues()
    .filter(function (row) {
      return row.some(function (value) {
        return value !== "";
      });
    })
    .map(rowToOrder_);
}

function createOrder_(order) {
  const normalized = normalizeOrder_(order);
  const sheet = getOrdersSheet_();

  validateOrder_(normalized);

  if (findOrderRowById_(sheet, normalized.pedido_id) > 0) {
    throw new Error("Ya existe un pedido con ese ID.");
  }

  sheet.appendRow(orderToRow_(normalized));
  return normalized;
}

function submitOrderProof_(id, proof, proofDriveFolderId) {
  const sheet = getOrdersSheet_();
  const row = findOrderRowById_(sheet, id);

  if (row < 1) {
    throw new Error("Pedido no encontrado.");
  }

  const current = rowToOrder_(sheet.getRange(row, 1, 1, ORDER_HEADERS.length).getValues()[0]);
  const proofPatch = Object.assign({}, proof);
  const savedFile = proofPatch.comprobante_archivo
    ? saveProofFile_(current.pedido_id, proofPatch.comprobante_archivo, proofDriveFolderId)
    : null;

  delete proofPatch.comprobante_archivo;

  if (savedFile) {
    proofPatch.comprobante_url = savedFile.url;
    proofPatch.comprobante_referencia = [proofPatch.comprobante_referencia, "Drive ID: " + savedFile.id]
      .filter(function (value) {
        return value;
      })
      .join(" | ");
    proofPatch.comprobante_notas = [proofPatch.comprobante_notas, "Archivo: " + savedFile.nombre]
      .filter(function (value) {
        return value;
      })
      .join(" | ");
  }

  const updated = normalizeOrder_(
    Object.assign({}, current, proofPatch, {
      pedido_id: current.pedido_id,
      estado: "comprobante recibido",
      actualizado_en: new Date().toISOString(),
    })
  );

  validateProof_(updated);
  sheet.getRange(row, 1, 1, ORDER_HEADERS.length).setValues([orderToRow_(updated)]);
  return updated;
}

function saveProofFile_(orderId, filePayload, proofDriveFolderId) {
  const folderId = String(proofDriveFolderId || PROOF_DRIVE_FOLDER_ID || "").trim();

  if (!folderId || folderId === "cambia-este-id-de-carpeta-drive") {
    throw new Error("Configura PROOF_DRIVE_FOLDER_ID en Apps Script o APPS_SCRIPT_PROOF_DRIVE_FOLDER_ID en .env.");
  }

  if (!filePayload || !filePayload.contenido_base64) {
    throw new Error("Adjunta una imagen o PDF del comprobante.");
  }

  const folder = DriveApp.getFolderById(folderId);
  const originalName = sanitizeFileName_(filePayload.nombre || "comprobante");
  const mimeType = String(filePayload.tipo || "application/octet-stream");
  const bytes = Utilities.base64Decode(String(filePayload.contenido_base64));
  const blob = Utilities.newBlob(bytes, mimeType, "comprobante-" + sanitizeFileName_(orderId) + "-" + originalName);
  const driveFile = folder.createFile(blob);

  if (PROOF_FILE_PUBLIC_LINK) {
    driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  return {
    id: driveFile.getId(),
    nombre: driveFile.getName(),
    url: driveFile.getUrl(),
  };
}

function sanitizeFileName_(value) {
  return String(value || "archivo")
    .replace(/[\\\/:*?"<>|#%{}~&]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "archivo";
}

function seedDefaultPaymentMethods_(sheet) {
  if (sheet.getLastRow() > 1) {
    return;
  }

  sheet.getRange(2, 1, DEFAULT_PAYMENT_METHODS.length, PAYMENT_METHOD_HEADERS.length).setValues(DEFAULT_PAYMENT_METHODS);
}

function listPaymentMethods_() {
  const sheet = getPaymentMethodsSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, PAYMENT_METHOD_HEADERS.length)
    .getValues()
    .filter(function (row) {
      return row.some(function (value) {
        return value !== "";
      });
    })
    .map(rowToPaymentMethod_)
    .sort(function (a, b) {
      return Number(a.orden || 999) - Number(b.orden || 999);
    });
}

function createPaymentMethod_(method) {
  const sheet = getPaymentMethodsSheet_();
  const normalized = normalizePaymentMethod_(method);

  validatePaymentMethod_(normalized);

  if (findRowById_(sheet, normalized.id) > 0) {
    throw new Error("Ya existe un metodo de pago con ese ID.");
  }

  sheet.appendRow(paymentMethodToRow_(normalized));
  return normalized;
}

function updatePaymentMethod_(id, method) {
  const sheet = getPaymentMethodsSheet_();
  const row = findRowById_(sheet, id);

  if (row < 1) {
    throw new Error("Metodo de pago no encontrado.");
  }

  const current = rowToPaymentMethod_(sheet.getRange(row, 1, 1, PAYMENT_METHOD_HEADERS.length).getValues()[0]);
  const normalized = normalizePaymentMethod_(Object.assign({}, current, method, { id: method.id || current.id }));

  validatePaymentMethod_(normalized);

  const duplicateRow = findRowById_(sheet, normalized.id);
  if (duplicateRow > 0 && duplicateRow !== row) {
    throw new Error("Ya existe un metodo de pago con ese ID.");
  }

  sheet.getRange(row, 1, 1, PAYMENT_METHOD_HEADERS.length).setValues([paymentMethodToRow_(normalized)]);
  return normalized;
}

function deletePaymentMethod_(id) {
  const sheet = getPaymentMethodsSheet_();
  const row = findRowById_(sheet, id);

  if (row < 1) {
    throw new Error("Metodo de pago no encontrado.");
  }

  sheet.deleteRow(row);
}

function rowToPaymentMethod_(row) {
  return PAYMENT_METHOD_HEADERS.reduce(function (method, key, index) {
    const value = row[index];
    method[key] = key === "orden" && value !== "" && !isNaN(Number(value)) ? Number(value) : value || "";
    return method;
  }, {});
}

function paymentMethodToRow_(method) {
  return PAYMENT_METHOD_HEADERS.map(function (key) {
    return method[key] === undefined || method[key] === null ? "" : method[key];
  });
}

function normalizePaymentMethod_(method) {
  const nombre = String(method.nombre || method.name || "").trim();
  const id = String(method.id || slugify_(nombre)).trim();
  const orden = Number(method.orden);

  return {
    id: id,
    nombre: nombre,
    tipo: String(method.tipo || "billetera").trim(),
    titular: String(method.titular || "").trim(),
    numero: String(method.numero || "").trim(),
    cci: String(method.cci || "").trim(),
    banco: String(method.banco || "").trim(),
    qr_imagen: normalizeProductImage_(method.qr_imagen || method.imagen || ""),
    instrucciones: String(method.instrucciones || "").trim(),
    estado: method.estado === "inactivo" ? "inactivo" : "activo",
    orden: isNaN(orden) ? 999 : orden,
  };
}

function validatePaymentMethod_(method) {
  if (!method.id) {
    throw new Error("El ID del metodo de pago es obligatorio.");
  }

  if (!method.nombre) {
    throw new Error("El nombre del metodo de pago es obligatorio.");
  }
}

function seedDefaultMessageTemplates_(sheet) {
  const lastRow = sheet.getLastRow();
  const existingIds = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(function (row) {
        return String(row[0] || "").trim();
      })
    : [];
  const missingRows = DEFAULT_MESSAGE_TEMPLATES.filter(function (row) {
    return existingIds.indexOf(String(row[0] || "").trim()) < 0;
  });

  if (missingRows.length === 0) {
    return;
  }

  sheet.getRange(sheet.getLastRow() + 1, 1, missingRows.length, MESSAGE_TEMPLATE_HEADERS.length).setValues(missingRows);
}

function listMessageTemplates_() {
  const sheet = getMessageTemplatesSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, MESSAGE_TEMPLATE_HEADERS.length)
    .getValues()
    .filter(function (row) {
      return row.some(function (value) {
        return value !== "";
      });
    })
    .map(rowToMessageTemplate_)
    .sort(function (a, b) {
      return Number(a.orden || 999) - Number(b.orden || 999);
    });
}

function updateMessageTemplate_(id, template) {
  const sheet = getMessageTemplatesSheet_();
  const normalized = normalizeMessageTemplate_(Object.assign({}, template, { id: template.id || id }));
  const row = findRowById_(sheet, id);

  validateMessageTemplate_(normalized);

  if (row > 0) {
    sheet.getRange(row, 1, 1, MESSAGE_TEMPLATE_HEADERS.length).setValues([messageTemplateToRow_(normalized)]);
  } else {
    sheet.appendRow(messageTemplateToRow_(normalized));
  }

  return normalized;
}

function rowToMessageTemplate_(row) {
  return MESSAGE_TEMPLATE_HEADERS.reduce(function (template, key, index) {
    const value = row[index];
    template[key] = key === "orden" && value !== "" && !isNaN(Number(value)) ? Number(value) : value || "";
    return template;
  }, {});
}

function messageTemplateToRow_(template) {
  return MESSAGE_TEMPLATE_HEADERS.map(function (key) {
    return template[key] === undefined || template[key] === null ? "" : template[key];
  });
}

function normalizeMessageTemplate_(template) {
  const nombre = String(template.nombre || template.name || "").trim();
  const id = String(template.id || slugify_(nombre)).trim();
  const orden = Number(template.orden);

  return {
    id: id,
    nombre: nombre,
    asunto: String(template.asunto || "").trim(),
    contenido: String(template.contenido || template.mensaje || "").trim(),
    estado: template.estado === "inactivo" ? "inactivo" : "activo",
    orden: isNaN(orden) ? 999 : orden,
  };
}

function validateMessageTemplate_(template) {
  if (!template.id) {
    throw new Error("El ID de la plantilla es obligatorio.");
  }

  if (!template.nombre) {
    throw new Error("El nombre de la plantilla es obligatorio.");
  }

  if (!template.contenido) {
    throw new Error("El contenido de la plantilla es obligatorio.");
  }
}

function seedDefaultSiteSettings_(sheet) {
  const lastRow = sheet.getLastRow();
  const existingIds = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(function (row) {
        return String(row[0] || "").trim();
      })
    : [];
  const missingRows = DEFAULT_SITE_SETTINGS.filter(function (row) {
    return existingIds.indexOf(String(row[0] || "").trim()) < 0;
  });

  if (missingRows.length === 0) {
    return;
  }

  sheet.getRange(sheet.getLastRow() + 1, 1, missingRows.length, SITE_SETTING_HEADERS.length).setValues(missingRows);
}

function listSiteSettings_() {
  const sheet = getSiteSettingsSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, SITE_SETTING_HEADERS.length)
    .getValues()
    .filter(function (row) {
      return row.some(function (value) {
        return value !== "";
      });
    })
    .map(rowToSiteSetting_)
    .sort(function (a, b) {
      return Number(a.orden || 999) - Number(b.orden || 999);
    });
}

function updateSiteSetting_(id, setting) {
  const sheet = getSiteSettingsSheet_();
  const normalized = normalizeSiteSetting_(Object.assign({}, setting, { id: setting.id || id }));
  const row = findRowById_(sheet, id);

  validateSiteSetting_(normalized);

  if (row > 0) {
    sheet.getRange(row, 1, 1, SITE_SETTING_HEADERS.length).setValues([siteSettingToRow_(normalized)]);
  } else {
    sheet.appendRow(siteSettingToRow_(normalized));
  }

  return normalized;
}

function rowToSiteSetting_(row) {
  return SITE_SETTING_HEADERS.reduce(function (setting, key, index) {
    const value = row[index];
    setting[key] = key === "orden" && value !== "" && !isNaN(Number(value)) ? Number(value) : value || "";
    return setting;
  }, {});
}

function siteSettingToRow_(setting) {
  return SITE_SETTING_HEADERS.map(function (key) {
    return setting[key] === undefined || setting[key] === null ? "" : setting[key];
  });
}

function normalizeSiteSetting_(setting) {
  const nombre = String(setting.nombre || setting.name || "").trim();
  const id = String(setting.id || slugify_(nombre)).trim();
  const orden = Number(setting.orden);

  return {
    id: id,
    nombre: nombre,
    valor: String(setting.valor || "").trim(),
    tipo: String(setting.tipo || "texto").trim(),
    estado: setting.estado === "inactivo" ? "inactivo" : "activo",
    orden: isNaN(orden) ? 999 : orden,
  };
}

function validateSiteSetting_(setting) {
  if (!setting.id) {
    throw new Error("El ID de configuracion es obligatorio.");
  }

  if (!setting.nombre) {
    throw new Error("El nombre de configuracion es obligatorio.");
  }
}

function seedDefaultAdminUsers_(sheet) {
  if (sheet.getLastRow() > 1) {
    return;
  }

  sheet.getRange(2, 1, DEFAULT_ADMIN_USERS.length, ADMIN_USER_HEADERS.length).setValues(DEFAULT_ADMIN_USERS);
}

function authenticateAdminUser_(usuario, password) {
  const normalizedUsuario = String(usuario || "").trim();
  const normalizedPassword = String(password || "").trim();
  const sheet = getAdminUsersSheet_();
  const lastRow = sheet.getLastRow();

  if (!normalizedUsuario || !normalizedPassword || lastRow < 2) {
    return { ok: false, error: "Usuario o contrasena incorrectos." };
  }

  const users = sheet.getRange(2, 1, lastRow - 1, ADMIN_USER_HEADERS.length).getValues().map(rowToAdminUser_);
  const user = users.find(function (entry) {
    return entry.usuario === normalizedUsuario && entry.password === normalizedPassword && entry.estado === "activo";
  });

  if (!user) {
    return { ok: false, error: "Usuario o contrasena incorrectos." };
  }

  delete user.password;
  return { ok: true, user: user };
}

function rowToAdminUser_(row) {
  return ADMIN_USER_HEADERS.reduce(function (user, key, index) {
    const value = row[index];
    user[key] = value || "";
    return user;
  }, {});
}

function listProviders_() {
  const sheet = getProvidersSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, PROVIDER_HEADERS.length)
    .getValues()
    .filter(function (row) {
      return row.some(function (value) {
        return value !== "";
      });
    })
    .map(rowToProvider_);
}

function createProvider_(provider) {
  const normalized = normalizeProvider_(provider);
  const sheet = getProvidersSheet_();

  validateProvider_(normalized);

  if (findRowById_(sheet, normalized.proveedor_id) > 0) {
    throw new Error("Ya existe un proveedor con ese ID.");
  }

  sheet.appendRow(providerToRow_(normalized));
  return normalized;
}

function updateProvider_(id, provider) {
  const sheet = getProvidersSheet_();
  const row = findRowById_(sheet, id);

  if (row < 1) {
    throw new Error("Proveedor no encontrado.");
  }

  const current = rowToProvider_(sheet.getRange(row, 1, 1, PROVIDER_HEADERS.length).getValues()[0]);
  const normalized = normalizeProvider_(Object.assign({}, current, provider, { proveedor_id: current.proveedor_id, actualizado_en: new Date().toISOString() }));

  validateProvider_(normalized);
  sheet.getRange(row, 1, 1, PROVIDER_HEADERS.length).setValues([providerToRow_(normalized)]);
  return normalized;
}

function rowToProvider_(row) {
  return PROVIDER_HEADERS.reduce(function (provider, key, index) {
    const value = row[index];
    provider[key] = key === "costo_referencial" && value !== "" && !isNaN(Number(value)) ? Number(value) : value || "";
    return provider;
  }, {});
}

function providerToRow_(provider) {
  return PROVIDER_HEADERS.map(function (key) {
    return provider[key] === undefined || provider[key] === null ? "" : provider[key];
  });
}

function normalizeProvider_(provider) {
  const now = new Date().toISOString();
  const costo = Number(provider.costo_referencial);

  return {
    proveedor_id: String(provider.proveedor_id || generateProviderId_()).trim(),
    nombre: String(provider.nombre || "").trim(),
    contacto: String(provider.contacto || "").trim(),
    producto_principal: String(provider.producto_principal || "").trim(),
    costo_referencial: provider.costo_referencial === "" || provider.costo_referencial === undefined || provider.costo_referencial === null || isNaN(costo) ? "" : costo,
    estado: PROVIDER_STATUSES.indexOf(provider.estado) >= 0 ? provider.estado : "activo",
    notas: String(provider.notas || "").trim(),
    creado_en: provider.creado_en || now,
    actualizado_en: provider.actualizado_en || now,
  };
}

function validateProvider_(provider) {
  if (!provider.proveedor_id) {
    throw new Error("El proveedor_id es obligatorio.");
  }

  if (!provider.nombre) {
    throw new Error("El nombre del proveedor es obligatorio.");
  }

  if (PROVIDER_STATUSES.indexOf(provider.estado) < 0) {
    throw new Error("Estado de proveedor no soportado.");
  }
}

function listProviderPurchases_() {
  const sheet = getProviderPurchasesSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, PROVIDER_PURCHASE_HEADERS.length)
    .getValues()
    .filter(function (row) {
      return row.some(function (value) {
        return value !== "";
      });
    })
    .map(rowToProviderPurchase_);
}

function createProviderPurchase_(purchase) {
  const normalized = normalizeProviderPurchase_(purchase);
  const sheet = getProviderPurchasesSheet_();

  validateProviderPurchase_(normalized);

  if (findRowById_(sheet, normalized.compra_id) > 0) {
    throw new Error("Ya existe una compra de proveedor con ese ID.");
  }

  sheet.appendRow(providerPurchaseToRow_(normalized));
  normalized.inventario_generado = createInventoryFromProviderPurchase_(normalized).length;
  return normalized;
}

function updateProviderPurchase_(id, purchase) {
  const sheet = getProviderPurchasesSheet_();
  const row = findRowById_(sheet, id);

  if (row < 1) {
    throw new Error("Compra de proveedor no encontrada.");
  }

  const current = rowToProviderPurchase_(sheet.getRange(row, 1, 1, PROVIDER_PURCHASE_HEADERS.length).getValues()[0]);
  const normalized = normalizeProviderPurchase_(Object.assign({}, current, purchase, { compra_id: current.compra_id, actualizado_en: new Date().toISOString() }));

  validateProviderPurchase_(normalized);
  sheet.getRange(row, 1, 1, PROVIDER_PURCHASE_HEADERS.length).setValues([providerPurchaseToRow_(normalized)]);
  normalized.inventario_generado = createInventoryFromProviderPurchase_(normalized).length;
  return normalized;
}

function createInventoryFromProviderPurchase_(purchase) {
  if (purchase.estado !== "recibido") {
    return [];
  }

  var quantity = Number(purchase.cantidad);
  if (isNaN(quantity) || quantity <= 0 || Math.floor(quantity) !== quantity) {
    return [];
  }

  var inventory = listInventory_();
  var existingCount = inventory.filter(function (item) {
    return item.compra_id === purchase.compra_id;
  }).length;
  var missingCount = Math.max(quantity - existingCount, 0);
  var provider = listProviders_().find(function (entry) {
    return entry.proveedor_id === purchase.proveedor_id;
  });
  var created = [];

  for (var index = 0; index < missingCount; index += 1) {
    created.push(
      createInventoryItem_({
        compra_id: purchase.compra_id,
        producto_id: purchase.producto_id,
        producto_nombre: purchase.producto_nombre,
        proveedor: purchase.proveedor_nombre || (provider && provider.nombre) || purchase.proveedor_id,
        celular_proveedor: (provider && provider.contacto) || "",
        costo_proveedor: purchase.costo_unitario,
        cuenta_usuario: purchase.cuenta_usuario,
        cuenta_clave: purchase.cuenta_clave,
        url_producto: purchase.url_producto,
        referencia_compra: purchase.referencia_pago || purchase.compra_id,
        fecha_compra: purchase.fecha_compra,
        fecha_vencimiento_proveedor: purchase.fecha_vencimiento_proveedor,
        estado: "disponible",
        estado_control: "Generado desde compra recibida",
        notas: [purchase.notas, "Compra proveedor: " + purchase.compra_id].filter(Boolean).join(" | "),
      })
    );
  }

  return created;
}

function rowToProviderPurchase_(row) {
  return PROVIDER_PURCHASE_HEADERS.reduce(function (purchase, key, index) {
    const value = row[index];
    purchase[key] = ["cantidad", "costo_total", "costo_unitario"].indexOf(key) >= 0 && value !== "" && !isNaN(Number(value)) ? Number(value) : value || "";
    return purchase;
  }, {});
}

function providerPurchaseToRow_(purchase) {
  return PROVIDER_PURCHASE_HEADERS.map(function (key) {
    return purchase[key] === undefined || purchase[key] === null ? "" : purchase[key];
  });
}

function normalizeProviderPurchase_(purchase) {
  const now = new Date().toISOString();
  const cantidad = toMoney_(purchase.cantidad);
  const costoTotal = toMoney_(purchase.costo_total);
  var costoUnitario = toMoney_(purchase.costo_unitario);

  if (costoUnitario === "" && cantidad !== "" && Number(cantidad) > 0 && costoTotal !== "") {
    costoUnitario = toMoney_(Number(costoTotal) / Number(cantidad));
  }

  return {
    compra_id: String(purchase.compra_id || generateProviderPurchaseId_()).trim(),
    proveedor_id: String(purchase.proveedor_id || "").trim(),
    proveedor_nombre: String(purchase.proveedor_nombre || "").trim(),
    producto_id: String(purchase.producto_id || "").trim(),
    producto_nombre: String(purchase.producto_nombre || "").trim(),
    cantidad: cantidad,
    costo_total: costoTotal,
    costo_unitario: costoUnitario,
    cuenta_usuario: String(purchase.cuenta_usuario || "").trim(),
    cuenta_clave: String(purchase.cuenta_clave || "").trim(),
    url_producto: String(purchase.url_producto || "").trim(),
    metodo_pago: String(purchase.metodo_pago || "").trim(),
    referencia_pago: String(purchase.referencia_pago || "").trim(),
    fecha_compra: String(purchase.fecha_compra || "").trim(),
    fecha_vencimiento_proveedor: String(purchase.fecha_vencimiento_proveedor || "").trim(),
    estado: PROVIDER_PURCHASE_STATUSES.indexOf(purchase.estado) >= 0 ? purchase.estado : "pendiente",
    notas: String(purchase.notas || "").trim(),
    creado_en: purchase.creado_en || now,
    actualizado_en: purchase.actualizado_en || now,
  };
}

function validateProviderPurchase_(purchase) {
  if (!purchase.compra_id) {
    throw new Error("El compra_id es obligatorio.");
  }

  if (!purchase.proveedor_id && !purchase.proveedor_nombre) {
    throw new Error("Selecciona o ingresa el proveedor.");
  }

  if (!purchase.producto_id && !purchase.producto_nombre) {
    throw new Error("Selecciona o ingresa el producto comprado.");
  }

  if (PROVIDER_PURCHASE_STATUSES.indexOf(purchase.estado) < 0) {
    throw new Error("Estado de compra proveedor no soportado.");
  }
}

function updateOrder_(id, order) {
  const sheet = getOrdersSheet_();
  const row = findOrderRowById_(sheet, id);

  if (row < 1) {
    throw new Error("Pedido no encontrado.");
  }

  const current = rowToOrder_(sheet.getRange(row, 1, 1, ORDER_HEADERS.length).getValues()[0]);
  const updated = normalizeOrder_(
    Object.assign({}, current, order, {
      pedido_id: current.pedido_id,
      actualizado_en: new Date().toISOString(),
    })
  );

  sheet.getRange(row, 1, 1, ORDER_HEADERS.length).setValues([orderToRow_(updated)]);
  return updated;
}

function listInventory_() {
  const sheet = getInventorySheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, INVENTORY_HEADERS.length)
    .getValues()
    .filter(function (row) {
      return row.some(function (value) {
        return value !== "";
      });
    })
    .map(rowToInventoryItem_);
}

function createInventoryItem_(item) {
  const normalized = normalizeInventoryItem_(item);
  const sheet = getInventorySheet_();

  validateInventoryItem_(normalized);

  if (findRowById_(sheet, normalized.inventario_id) > 0) {
    throw new Error("Ya existe una cuenta de inventario con ese ID.");
  }

  sheet.appendRow(inventoryItemToRow_(normalized));
  return normalized;
}

function updateInventoryItem_(id, item) {
  const sheet = getInventorySheet_();
  const row = findRowById_(sheet, id);

  if (row < 1) {
    throw new Error("Cuenta de inventario no encontrada.");
  }

  const current = rowToInventoryItem_(sheet.getRange(row, 1, 1, INVENTORY_HEADERS.length).getValues()[0]);
  const updated = normalizeInventoryItem_(
    Object.assign({}, current, item, {
      inventario_id: current.inventario_id,
      actualizado_en: new Date().toISOString(),
    })
  );

  validateInventoryItem_(updated);
  sheet.getRange(row, 1, 1, INVENTORY_HEADERS.length).setValues([inventoryItemToRow_(updated)]);
  return updated;
}

function assignInventoryToOrder_(orderId, inventoryId, assignment) {
  return assignManyInventoryToOrder_(
    orderId,
    [
      Object.assign({}, assignment || {}, {
        componente_id: "principal",
        inventario_id: inventoryId,
      }),
    ],
    assignment || {}
  );
}

function assignManyInventoryToOrder_(orderId, assignments, sharedAssignment) {
  const ordersSheet = getOrdersSheet_();
  const inventorySheet = getInventorySheet_();
  const orderRow = findOrderRowById_(ordersSheet, orderId);
  const now = new Date().toISOString();

  if (orderRow < 1) {
    throw new Error("Pedido no encontrado.");
  }

  const order = rowToOrder_(ordersSheet.getRange(orderRow, 1, 1, ORDER_HEADERS.length).getValues()[0]);
  const requests = normalizeAssignmentRequests_(assignments);

  if (order.estado !== "pagado") {
    throw new Error("Solo puedes asignar inventario a un pedido pagado y pendiente de entrega.");
  }

  if (requests.length === 0) {
    throw new Error("Selecciona una cuenta disponible para asignar.");
  }

  var seen = {};
  requests.forEach(function (request) {
    if (!request.inventario_id) {
      throw new Error("Selecciona una cuenta disponible para cada componente del pedido.");
    }
    if (seen[request.inventario_id]) {
      throw new Error("No puedes asignar la misma cuenta a mas de un componente.");
    }
    seen[request.inventario_id] = true;
  });

  const fechaEntrega = String((sharedAssignment || {}).fecha_entrega || now).trim();
  const itemPairs = requests.map(function (request) {
    var inventoryRow = findRowById_(inventorySheet, request.inventario_id);

    if (inventoryRow < 1) {
      throw new Error("Cuenta de inventario no encontrada.");
    }

    var item = rowToInventoryItem_(inventorySheet.getRange(inventoryRow, 1, 1, INVENTORY_HEADERS.length).getValues()[0]);

    if (item.estado !== "disponible") {
      throw new Error("La cuenta seleccionada no esta disponible.");
    }

    if (!inventoryMatchesAssignment_(item, request, order)) {
      throw new Error("La cuenta seleccionada no corresponde al componente " + (request.componente_nombre || request.producto_id || "") + ".");
    }

    return {
      row: inventoryRow,
      request: request,
      item: item,
    };
  });

  const products = listProducts_();
  const assignmentPricing = allocateAssignmentPrices_(order, itemPairs, products);
  const assignmentDetails = itemPairs.map(function (pair, index) {
    var fechaVencimientoCliente = String(pair.request.fecha_vencimiento_cliente || pair.item.fecha_vencimiento_cliente || "").trim();
    var perfilNombre = pair.request.perfil_nombre || pair.item.perfil_nombre;
    var pin = pair.request.pin !== "" ? pair.request.pin : pair.item.pin;
    var pricing = assignmentPricing[index];
    var datosEntrega = [
      pair.item.cuenta_usuario,
      perfilNombre ? "Perfil: " + perfilNombre : "",
      pin ? "PIN: " + pin : "",
      pair.request.notas_entrega,
    ]
      .filter(Boolean)
      .join(" | ");

    return {
      componente_id: pair.request.componente_id,
      componente_nombre: pair.request.componente_nombre || pair.item.producto_nombre || pair.item.producto_id,
      producto_id: pair.request.producto_id || pair.item.producto_id,
      inventario_id: pair.item.inventario_id,
      proveedor: pair.item.proveedor,
      costo_proveedor: pair.request.costo_proveedor !== "" ? pair.request.costo_proveedor : pair.item.costo_proveedor,
      precio_lista: pricing.precio_lista,
      precio_venta: pricing.precio_venta,
      margen_estimado: toMoney_(Number(pricing.precio_venta) - Number(pair.request.costo_proveedor !== "" ? pair.request.costo_proveedor : pair.item.costo_proveedor)),
      fecha_entrega: fechaEntrega,
      fecha_vencimiento_cliente: fechaVencimientoCliente,
      datos_entrega: datosEntrega,
      perfil_nombre: perfilNombre,
      pin: pin,
      url_producto: pair.request.url_producto || pair.item.url_producto || "",
      notas_entrega: pair.request.notas_entrega,
    };
  });

  const updatedItems = itemPairs.map(function (pair, index) {
    return normalizeInventoryItem_(
      Object.assign({}, pair.item, {
        estado: "ocupado",
        pedido_id: order.pedido_id,
        cliente_nombre: order.cliente_nombre,
        cliente_contacto: order.cliente_contacto,
        perfil_nombre: assignmentDetails[index].perfil_nombre,
        pin: assignmentDetails[index].pin,
        precio_venta_sugerido: assignmentDetails[index].precio_venta,
        fecha_entrega: fechaEntrega,
        fecha_vencimiento_cliente: assignmentDetails[index].fecha_vencimiento_cliente,
        notas: [pair.item.notas, assignmentDetails[index].componente_nombre ? "Componente: " + assignmentDetails[index].componente_nombre : "", assignmentDetails[index].notas_entrega]
          .filter(Boolean)
          .join(" | "),
        actualizado_en: now,
      })
    );
  });
  const firstAssignment = assignmentDetails[0];
  const totalCost = assignmentDetails.reduce(function (total, current) {
    var value = Number(current.costo_proveedor);
    return isNaN(value) ? total : total + value;
  }, 0);
  const updatedOrder = normalizeOrder_(
    Object.assign({}, order, {
      estado: "entregado",
      inventario_id: firstAssignment.inventario_id,
      proveedor: assignmentDetails
        .map(function (entry) {
          return entry.proveedor;
        })
        .filter(Boolean)
        .join(" + "),
      costo_proveedor: totalCost || firstAssignment.costo_proveedor,
      fecha_entrega: fechaEntrega,
      fecha_vencimiento_cliente: firstAssignment.fecha_vencimiento_cliente,
      datos_entrega: assignmentDetails
        .map(function (entry) {
          return [entry.componente_nombre, entry.datos_entrega].filter(Boolean).join(": ");
        })
        .filter(Boolean)
        .join(" || "),
      asignaciones_inventario: assignmentDetails,
      url_producto: firstAssignment.url_producto || "",
      actualizado_en: now,
    })
  );

  itemPairs.forEach(function (pair, index) {
    inventorySheet.getRange(pair.row, 1, 1, INVENTORY_HEADERS.length).setValues([inventoryItemToRow_(updatedItems[index])]);
  });
  ordersSheet.getRange(orderRow, 1, 1, ORDER_HEADERS.length).setValues([orderToRow_(updatedOrder)]);

  return { ok: true, order: updatedOrder, item: updatedItems[0], items: updatedItems };
}

function normalizeAssignmentRequests_(assignments) {
  if (!Array.isArray(assignments)) {
    return [];
  }

  return assignments.map(function (assignment, index) {
    return {
      componente_id: String(assignment.componente_id || assignment.id || (index === 0 ? "principal" : "componente-" + (index + 1))).trim(),
      componente_nombre: String(assignment.componente_nombre || assignment.nombre || "").trim(),
      producto_id: String(assignment.producto_id || "").trim(),
      inventario_id: String(assignment.inventario_id || "").trim(),
      perfil_nombre: String(assignment.perfil_nombre || "").trim(),
      pin: String(assignment.pin === undefined || assignment.pin === null ? "" : assignment.pin).trim(),
      precio_venta: assignment.precio_venta === undefined || assignment.precio_venta === null ? "" : assignment.precio_venta,
      costo_proveedor: assignment.costo_proveedor === undefined || assignment.costo_proveedor === null ? "" : assignment.costo_proveedor,
      fecha_vencimiento_cliente: String(assignment.fecha_vencimiento_cliente || "").trim(),
      notas_entrega: String(assignment.notas_entrega || "").trim(),
    };
  });
}

function inventoryMatchesAssignment_(item, assignment, order) {
  var itemProductId = String(item.producto_id || "").trim();
  var itemProductName = String(item.producto_nombre || "").trim();
  var assignmentProductId = String(assignment.producto_id || "").trim();
  var assignmentName = String(assignment.componente_nombre || "").trim();
  var orderProductId = String(order.producto_id || "").trim();
  var orderProductName = String(order.producto_nombre || "").trim();

  if (!itemProductId && !itemProductName) {
    return true;
  }

  if (assignmentProductId || assignmentName) {
    return [assignmentProductId, assignmentName].filter(Boolean).some(function (target) {
      return productValueMatches_(itemProductId, target) || productValueMatches_(itemProductName, target);
    });
  }

  if (orderProductId) {
    return productValueMatches_(itemProductId, orderProductId) || productValueMatches_(itemProductName, orderProductId);
  }

  return [orderProductName].filter(Boolean).some(function (name) {
    return productValueMatches_(itemProductId, name) || productValueMatches_(itemProductName, name);
  });
}

function productValueMatches_(value, target) {
  var valueSlug = slugify_(value);
  var targetSlug = slugify_(target);

  if (!valueSlug || !targetSlug) {
    return false;
  }

  return valueSlug === targetSlug || (targetSlug.length >= 3 && valueSlug.indexOf(targetSlug) >= 0) || (valueSlug.length >= 3 && targetSlug.indexOf(valueSlug) >= 0);
}

function toMoney_(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  var number = Number(value);
  return isNaN(number) ? "" : Math.round(number * 100) / 100;
}

function getCatalogPriceForAssignment_(pair, products) {
  var request = pair.request;
  var item = pair.item;
  var product = products.find(function (entry) {
    return (
      productValueMatches_(entry.id, request.producto_id || item.producto_id) ||
      productValueMatches_(entry.nombre, request.componente_nombre || item.producto_nombre)
    );
  });

  return toMoney_(product && product.precio);
}

function allocateAssignmentPrices_(order, itemPairs, products) {
  var orderTotal = Number(order.producto_precio);
  var basePrices = itemPairs.map(function (pair) {
    return getCatalogPriceForAssignment_(pair, products);
  });
  var manualPrices = itemPairs.map(function (pair) {
    return toMoney_(pair.request.precio_venta);
  });
  var suggestedPrices = itemPairs.map(function (pair) {
    return toMoney_(pair.item.precio_venta_sugerido);
  });
  var manualTotal = manualPrices.reduce(function (total, value) {
    var number = Number(value);
    return isNaN(number) ? total : total + number;
  }, 0);
  var missingIndexes = itemPairs
    .map(function (_pair, index) {
      return index;
    })
    .filter(function (index) {
      return manualPrices[index] === "" && suggestedPrices[index] === "";
    });
  var baseTotal = missingIndexes.reduce(function (total, index) {
    var number = Number(basePrices[index]);
    return isNaN(number) ? total : total + number;
  }, 0);
  var remainingTotal = !isNaN(orderTotal) && orderTotal > 0 ? Math.max(orderTotal - manualTotal, 0) : "";
  var assignedTotal = 0;

  return itemPairs.map(function (_pair, index) {
    var basePrice = basePrices[index];
    var salePrice = manualPrices[index] !== "" ? manualPrices[index] : suggestedPrices[index] !== "" ? suggestedPrices[index] : basePrice;

    if (manualPrices[index] === "" && suggestedPrices[index] === "" && !isNaN(Number(remainingTotal)) && remainingTotal > 0) {
      var isLastMissing = missingIndexes[missingIndexes.length - 1] === index;

      if (isLastMissing) {
        salePrice = toMoney_(remainingTotal - assignedTotal);
      } else if (baseTotal > 0 && !isNaN(Number(basePrice))) {
        salePrice = toMoney_(remainingTotal * (Number(basePrice) / baseTotal));
      } else {
        salePrice = toMoney_(remainingTotal / (missingIndexes.length || 1));
      }
      assignedTotal += Number(salePrice) || 0;
    }

    return {
      precio_lista: basePrice,
      precio_venta: salePrice,
    };
  });
}

function rowToInventoryItem_(row) {
  return INVENTORY_HEADERS.reduce(function (item, key, index) {
    item[key] = row[index] === undefined || row[index] === null ? "" : row[index];
    return item;
  }, {});
}

function inventoryItemToRow_(item) {
  return INVENTORY_HEADERS.map(function (key) {
    return item[key] === undefined || item[key] === null ? "" : item[key];
  });
}

function normalizeInventoryItem_(item) {
  const now = new Date().toISOString();
  const estado = INVENTORY_STATUSES.indexOf(item.estado) >= 0 ? item.estado : "disponible";

  return {
    inventario_id: String(item.inventario_id || generateInventoryId_()).trim(),
    compra_id: String(item.compra_id || "").trim(),
    producto_id: String(item.producto_id || "").trim(),
    producto_nombre: String(item.producto_nombre || "").trim(),
    proveedor: String(item.proveedor || "").trim(),
    celular_proveedor: String(item.celular_proveedor || "").trim(),
    costo_proveedor: item.costo_proveedor === undefined || item.costo_proveedor === null ? "" : item.costo_proveedor,
    precio_venta_sugerido: item.precio_venta_sugerido === undefined || item.precio_venta_sugerido === null ? "" : item.precio_venta_sugerido,
    referencia_compra: String(item.referencia_compra || "").trim(),
    url_producto: String(item.url_producto || "").trim(),
    cuenta_usuario: String(item.cuenta_usuario || "").trim(),
    cuenta_clave: String(item.cuenta_clave === undefined || item.cuenta_clave === null ? "" : item.cuenta_clave).trim(),
    perfil_nombre: String(item.perfil_nombre === undefined || item.perfil_nombre === null ? "" : item.perfil_nombre).trim(),
    pin: String(item.pin === undefined || item.pin === null ? "" : item.pin).trim(),
    estado: estado,
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

function listRenewals_() {
  const sheet = getRenewalsSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, RENEWAL_HEADERS.length)
    .getValues()
    .filter(function (row) {
      return row.some(function (value) {
        return value !== "";
      });
    })
    .map(rowToRenewal_);
}

function createRenewal_(renewal) {
  const sheet = getRenewalsSheet_();
  const normalized = normalizeRenewal_(renewal);
  validateRenewal_(normalized);

  if (findRenewalRowById_(sheet, normalized.renovacion_id) > 0) {
    throw new Error("Ya existe una renovacion con ese ID.");
  }

  assertNoOpenRenewalDuplicate_(normalized, "");
  sheet.appendRow(renewalToRow_(normalized));
  return normalized;
}

function updateRenewal_(id, renewal) {
  const sheet = getRenewalsSheet_();
  const row = findRenewalRowById_(sheet, id);

  if (row < 0) {
    throw new Error("Renovacion no encontrada.");
  }

  const current = rowToRenewal_(sheet.getRange(row, 1, 1, RENEWAL_HEADERS.length).getValues()[0]);
  const normalized = normalizeRenewal_(Object.assign({}, current, renewal, { renovacion_id: current.renovacion_id, actualizado_en: new Date().toISOString() }));
  validateRenewal_(normalized);
  assertNoOpenRenewalDuplicate_(normalized, current.renovacion_id);
  sheet.getRange(row, 1, 1, RENEWAL_HEADERS.length).setValues([renewalToRow_(normalized)]);
  return normalized;
}

function isOpenRenewalStatus_(status) {
  return OPEN_RENEWAL_STATUSES.indexOf(String(status || "").trim()) >= 0;
}

function assertNoOpenRenewalDuplicate_(renewal, currentRenewalId) {
  if (!isOpenRenewalStatus_(renewal.estado)) {
    return;
  }

  const inventoryId = String(renewal.inventario_id || "").trim();

  if (!inventoryId) {
    return;
  }

  const duplicate = listRenewals_().find(function (entry) {
    return (
      String(entry.renovacion_id || "").trim() !== String(currentRenewalId || "").trim() &&
      String(entry.inventario_id || "").trim() === inventoryId &&
      isOpenRenewalStatus_(entry.estado)
    );
  });

  if (duplicate) {
    throw new Error(
      "Ya existe una renovacion abierta para esta cuenta (" +
        duplicate.renovacion_id +
        "). Finaliza o cancela la renovacion existente antes de crear otra."
    );
  }
}

function submitRenewalProof_(id, proof, proofDriveFolderId) {
  const sheet = getRenewalsSheet_();
  const row = findRenewalRowById_(sheet, id);

  if (row < 1) {
    throw new Error("Renovacion no encontrada.");
  }

  const current = rowToRenewal_(sheet.getRange(row, 1, 1, RENEWAL_HEADERS.length).getValues()[0]);
  const proofPatch = Object.assign({}, proof);
  const savedFile = proofPatch.comprobante_archivo
    ? saveProofFile_(current.renovacion_id, proofPatch.comprobante_archivo, proofDriveFolderId)
    : null;

  delete proofPatch.comprobante_archivo;

  if (savedFile) {
    proofPatch.comprobante_url = savedFile.url;
    proofPatch.comprobante_referencia = [proofPatch.comprobante_referencia, "Drive ID: " + savedFile.id]
      .filter(function (value) {
        return value;
      })
      .join(" | ");
    proofPatch.comprobante_notas = [proofPatch.comprobante_notas, "Archivo: " + savedFile.nombre]
      .filter(function (value) {
        return value;
      })
      .join(" | ");
  }

  const normalized = normalizeRenewal_(
    Object.assign({}, current, proofPatch, {
      renovacion_id: current.renovacion_id,
      estado: "comprobante_recibido",
      actualizado_en: new Date().toISOString(),
    })
  );

  validateRenewal_(normalized);
  sheet.getRange(row, 1, 1, RENEWAL_HEADERS.length).setValues([renewalToRow_(normalized)]);
  return normalized;
}

function findRenewalRowById_(sheet, id) {
  const targetId = String(id || "");
  const lastRow = sheet.getLastRow();

  if (!targetId || lastRow < 2) {
    return -1;
  }

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let index = 0; index < ids.length; index += 1) {
    if (String(ids[index][0]) === targetId) {
      return index + 2;
    }
  }

  return -1;
}

function rowToRenewal_(row) {
  return RENEWAL_HEADERS.reduce(function (renewal, key, index) {
    const value = row[index];
    renewal[key] = key === "monto" && value !== "" && !isNaN(Number(value)) ? Number(value) : value || "";
    return renewal;
  }, {});
}

function renewalToRow_(renewal) {
  return RENEWAL_HEADERS.map(function (key) {
    return renewal[key] === undefined || renewal[key] === null ? "" : renewal[key];
  });
}

function normalizeRenewal_(renewal) {
  const now = new Date().toISOString();
  const amount = Number(renewal.monto);

  return {
    renovacion_id: String(renewal.renovacion_id || generateRenewalId_()).trim(),
    pedido_id: String(renewal.pedido_id || "").trim(),
    inventario_id: String(renewal.inventario_id || "").trim(),
    cliente_nombre: String(renewal.cliente_nombre || "").trim(),
    cliente_contacto: String(renewal.cliente_contacto || "").trim(),
    producto_nombre: String(renewal.producto_nombre || "").trim(),
    monto: renewal.monto === "" || renewal.monto === undefined || renewal.monto === null || isNaN(amount) ? "" : amount,
    metodo_pago: String(renewal.metodo_pago || "").trim(),
    comprobante_url: String(renewal.comprobante_url || "").trim(),
    comprobante_referencia: String(renewal.comprobante_referencia || "").trim(),
    comprobante_notas: String(renewal.comprobante_notas || "").trim(),
    estado: RENEWAL_STATUSES.indexOf(renewal.estado) >= 0 ? renewal.estado : "pendiente_aviso",
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

function validateRenewal_(renewal) {
  if (!renewal.renovacion_id) {
    throw new Error("El renovacion_id es obligatorio.");
  }

  if (!renewal.inventario_id) {
    throw new Error("Selecciona la cuenta de inventario.");
  }

  if (RENEWAL_STATUSES.indexOf(renewal.estado) < 0) {
    throw new Error("Estado de renovacion no soportado.");
  }
}

function validateInventoryItem_(item) {
  if (!item.inventario_id) {
    throw new Error("El inventario_id es obligatorio.");
  }

  if (!item.producto_id && !item.producto_nombre) {
    throw new Error("El producto del inventario es obligatorio.");
  }

  if (!item.proveedor) {
    throw new Error("El proveedor es obligatorio.");
  }

  if (INVENTORY_STATUSES.indexOf(item.estado) < 0) {
    throw new Error("Estado de inventario no soportado.");
  }
}

function findOrderRowById_(sheet, id) {
  const targetId = String(id || "");
  const lastRow = sheet.getLastRow();

  if (!targetId || lastRow < 2) {
    return -1;
  }

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let index = 0; index < ids.length; index += 1) {
    if (String(ids[index][0]) === targetId) {
      return index + 2;
    }
  }

  return -1;
}

function rowToOrder_(row) {
  return ORDER_HEADERS.reduce(function (order, key, index) {
    order[key] = key === "asignaciones_inventario" ? parseJsonArray_(row[index]) : row[index] || "";
    return order;
  }, {});
}

function orderToRow_(order) {
  return ORDER_HEADERS.map(function (key) {
    if (key === "asignaciones_inventario") {
      return order.asignaciones_inventario && order.asignaciones_inventario.length ? JSON.stringify(order.asignaciones_inventario) : "";
    }
    return order[key] === undefined || order[key] === null ? "" : order[key];
  });
}

function normalizeOrder_(order) {
  const now = new Date().toISOString();
  const estado = ORDER_STATUSES.indexOf(order.estado) >= 0 ? order.estado : "pendiente de pago";

  return {
    pedido_id: String(order.pedido_id || generateOrderId_()).trim(),
    producto_id: String(order.producto_id || "").trim(),
    producto_nombre: String(order.producto_nombre || "").trim(),
    producto_precio: order.producto_precio === undefined || order.producto_precio === null ? "" : order.producto_precio,
    metodo_pago: String(order.metodo_pago || "").trim(),
    cliente_nombre: String(order.cliente_nombre || "").trim(),
    cliente_contacto: String(order.cliente_contacto || "").trim(),
    comprobante_url: String(order.comprobante_url || "").trim(),
    comprobante_referencia: String(order.comprobante_referencia || "").trim(),
    comprobante_notas: String(order.comprobante_notas || "").trim(),
    estado: estado,
    inventario_id: String(order.inventario_id || "").trim(),
    proveedor: String(order.proveedor || "").trim(),
    costo_proveedor: order.costo_proveedor === undefined || order.costo_proveedor === null ? "" : order.costo_proveedor,
    fecha_entrega: String(order.fecha_entrega || "").trim(),
    fecha_vencimiento_cliente: String(order.fecha_vencimiento_cliente || "").trim(),
    datos_entrega: String(order.datos_entrega || "").trim(),
    asignaciones_inventario: normalizeInventoryAssignments_(order.asignaciones_inventario, order),
    canal_venta: String(order.canal_venta || "web").trim(),
    creado_en: order.creado_en || now,
    actualizado_en: order.actualizado_en || now,
  };
}

function normalizeInventoryAssignments_(value, order) {
  var entries = value;

  if (typeof entries === "string") {
    entries = parseJsonArray_(entries);
  }

  if (!Array.isArray(entries)) {
    entries = [];
  }

  if (entries.length === 0 && order && order.inventario_id) {
    entries = [{ inventario_id: order.inventario_id }];
  }

  return entries
    .map(function (entry, index) {
      return {
        componente_id: String(entry.componente_id || entry.id || (index === 0 ? "principal" : "componente-" + (index + 1))).trim(),
        componente_nombre: String(entry.componente_nombre || entry.nombre || entry.producto_nombre || "").trim(),
        producto_id: String(entry.producto_id || "").trim(),
        inventario_id: String(entry.inventario_id || "").trim(),
        proveedor: String(entry.proveedor || "").trim(),
        costo_proveedor: entry.costo_proveedor === undefined || entry.costo_proveedor === null ? "" : entry.costo_proveedor,
        precio_lista: entry.precio_lista === undefined || entry.precio_lista === null ? "" : entry.precio_lista,
        precio_venta: entry.precio_venta === undefined || entry.precio_venta === null ? "" : entry.precio_venta,
        margen_estimado: entry.margen_estimado === undefined || entry.margen_estimado === null ? "" : entry.margen_estimado,
        fecha_entrega: String(entry.fecha_entrega || "").trim(),
        fecha_vencimiento_cliente: String(entry.fecha_vencimiento_cliente || "").trim(),
        datos_entrega: String(entry.datos_entrega || "").trim(),
        url_producto: String(entry.url_producto || "").trim(),
        notas_entrega: String(entry.notas_entrega || "").trim(),
      };
    })
    .filter(function (entry) {
      return entry.inventario_id || entry.componente_nombre || entry.producto_id;
    });
}

function validateOrder_(order) {
  if (!order.pedido_id) {
    throw new Error("El pedido_id es obligatorio.");
  }

  if (!order.producto_id && !order.producto_nombre) {
    throw new Error("El producto es obligatorio.");
  }
}

function validateProof_(order) {
  if (!order.cliente_nombre) {
    throw new Error("Ingresa tu nombre.");
  }

  if (!order.cliente_contacto) {
    throw new Error("Ingresa tu WhatsApp o correo.");
  }

  if (!order.comprobante_url && !order.comprobante_referencia && !order.comprobante_notas) {
    throw new Error("Adjunta el archivo del comprobante o agrega un detalle del pago.");
  }
}

function generateOrderId_() {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return "PED-" + stamp + "-" + suffix;
}

function generateInventoryId_() {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return "INV-" + stamp + "-" + suffix;
}

function generateRenewalId_() {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return "REN-" + stamp + "-" + suffix;
}

function generateProviderId_() {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return "PROV-" + stamp + "-" + suffix;
}

function generateProviderPurchaseId_() {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return "CPR-" + stamp + "-" + suffix;
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
