// Adaptadores D1 para la operacion diaria. Se activan solamente con
// OPERATIONS_STORAGE=d1; mientras tanto Apps Script sigue siendo la fuente.
const TABLES = {
  products: { key: "id", fields: ["id", "nombre", "tipo", "precio", "descripcion", "imagen", "estado", "categoria", "badge", "cta", "componentes_json", "plantilla_entrega", "vender", "orden", "creado_en", "actualizado_en"] },
  providers: { key: "proveedor_id", fields: ["proveedor_id", "nombre", "contacto", "producto_principal", "costo_referencial", "estado", "notas", "creado_en", "actualizado_en"] },
  provider_purchases: { key: "compra_id", fields: ["compra_id", "proveedor_id", "proveedor_nombre", "producto_id", "producto_nombre", "cantidad", "costo_total", "costo_unitario", "metodo_pago", "referencia_pago", "fecha_compra", "fecha_vencimiento_proveedor", "estado", "notas", "creado_en", "actualizado_en", "cuenta_usuario", "cuenta_clave", "url_producto", "link_bot", "usuario_bot", "contrasena_bot"] },
  inventory: { key: "inventario_id", fields: ["inventario_id", "producto_id", "producto_nombre", "proveedor", "costo_proveedor", "cuenta_usuario", "cuenta_clave", "perfil_nombre", "pin", "estado", "pedido_id", "cliente_nombre", "cliente_contacto", "fecha_compra", "fecha_entrega", "fecha_vencimiento_cliente", "notas", "creado_en", "actualizado_en", "precio_venta_sugerido", "celular_proveedor", "referencia_compra", "estado_control", "fecha_vencimiento_proveedor", "compra_id", "url_producto", "link_bot", "usuario_bot", "contrasena_bot"] },
  orders: { key: "pedido_id", fields: ["pedido_id", "producto_id", "producto_nombre", "producto_precio", "metodo_pago", "cliente_nombre", "cliente_contacto", "comprobante_url", "comprobante_referencia", "comprobante_notas", "estado", "creado_en", "actualizado_en", "inventario_id", "proveedor", "costo_proveedor", "fecha_entrega", "fecha_vencimiento_cliente", "datos_entrega_json", "asignaciones_inventario_json", "canal_venta"] },
  renewals: { key: "renovacion_id", fields: ["renovacion_id", "pedido_id", "inventario_id", "cliente_nombre", "cliente_contacto", "producto_nombre", "monto", "metodo_pago", "comprobante_url", "comprobante_referencia", "comprobante_notas", "estado", "fecha_aviso", "fecha_pago", "fecha_confirmacion", "vencimiento_anterior", "vencimiento_nuevo", "notas", "creado_en", "actualizado_en"] },
  payment_methods: { key: "id", fields: ["id", "nombre", "tipo", "titular", "numero", "cci", "banco", "qr_imagen", "instrucciones", "estado", "orden"] },
  message_templates: { key: "id", fields: ["id", "nombre", "asunto", "contenido", "estado", "orden"] },
  site_settings: { key: "id", fields: ["id", "nombre", "valor", "tipo", "estado", "orden"] },
};

function enabled(env) { return String(env.OPERATIONS_STORAGE || "").toLowerCase() === "d1" && env.DB && typeof env.DB.prepare === "function"; }
function value(row, field) {
  const aliases = { componentes_json: "componentes", datos_entrega_json: "datos_entrega", asignaciones_inventario_json: "asignaciones_inventario" };
  const raw = row[field] === undefined ? row[aliases[field]] : row[field];
  if (raw === undefined || raw === null || raw === "") return null;
  return typeof raw === "object" ? JSON.stringify(raw) : String(raw);
}
function hydrate(row) {
  if (!row) return row;
  for (const [column, property, fallback] of [["componentes_json", "componentes", []], ["datos_entrega_json", "datos_entrega", {}], ["asignaciones_inventario_json", "asignaciones_inventario", []]]) {
    if (Object.prototype.hasOwnProperty.call(row, column)) {
      try { row[property] = JSON.parse(row[column] || JSON.stringify(fallback)); } catch { row[property] = fallback; }
      delete row[column];
    }
  }
  return row;
}

class D1TableStore {
  constructor(db, table) { this.db = db; this.table = table; this.definition = TABLES[table]; }
  async list() { const result = await this.db.prepare(`SELECT * FROM ${this.table}`).all(); return (result.results || []).map(hydrate); }
  async get(id) { const result = await this.db.prepare(`SELECT * FROM ${this.table} WHERE ${this.definition.key} = ?`).bind(id).first(); return hydrate(result); }
  async save(row) {
    const key = String(row?.[this.definition.key] || "").trim();
    if (!key) { const error = new Error("Falta el identificador del registro."); error.statusCode = 400; throw error; }
    const fields = this.definition.fields;
    const query = `INSERT INTO ${this.table} (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")}) ON CONFLICT(${this.definition.key}) DO UPDATE SET ${fields.filter((field) => field !== this.definition.key).map((field) => `${field}=excluded.${field}`).join(",")}`;
    await this.db.prepare(query).bind(...fields.map((field) => value(row, field))).run();
    return this.get(key);
  }
  async update(id, patch) { const current = await this.get(id); if (!current) { const error = new Error("Registro no encontrado."); error.statusCode = 404; throw error; } return this.save({ ...current, ...patch, [this.definition.key]: id, actualizado_en: new Date().toISOString() }); }
  async remove(id) { await this.db.prepare(`DELETE FROM ${this.table} WHERE ${this.definition.key} = ?`).bind(id).run(); return true; }
}

class D1CatalogStore extends D1TableStore { constructor(db) { super(db, "products"); } listProducts() { return this.list(); } createProduct(row) { return this.save(row); } updateProduct(id, row) { return this.update(id, row); } deleteProduct(id) { return this.remove(id); } async saveProducts(rows) { for (const row of rows) await this.save(row); return this.list(); } }
class D1OrderStore extends D1TableStore { constructor(db) { super(db, "orders"); } listOrders() { return this.list(); } createOrder(row) { return this.save(row); } updateOrder(id, row) { return this.update(id, row); } submitProof(id, proof) { return this.update(id, proof); } }
class D1RenewalStore extends D1TableStore { constructor(db) { super(db, "renewals"); } listRenewals() { return this.list(); } createRenewal(row) { return this.save(row); } updateRenewal(id, row) { return this.update(id, row); } submitProof(id, proof) { return this.update(id, proof); } }
class D1SupplierStore {
  constructor(db) { this.providers = new D1TableStore(db, "providers"); this.purchases = new D1TableStore(db, "provider_purchases"); }
  listProviders() { return this.providers.list(); } createProvider(row) { return this.providers.save(row); } updateProvider(id, row) { return this.providers.update(id, row); }
  listPurchases() { return this.purchases.list(); } createPurchase(row) { return this.purchases.save(row); } updatePurchase(id, row) { return this.purchases.update(id, row); }
}
class D1InventoryStore extends D1TableStore {
  constructor(db) { super(db, "inventory"); } listItems() { return this.list(); } createItem(row) { return this.save(row); } updateItem(id, row) { return this.update(id, row); }
  async bulkUpdateItems(filters = {}, patch = {}) { const items = await this.list(); const matching = items.filter((item) => Object.entries(filters).every(([key, expected]) => expected === undefined || expected === "" || item[key] === expected)); return Promise.all(matching.map((item) => this.update(item.inventario_id, patch))); }
  async assignToOrder(orderId, inventoryId, patch = {}) { return this.update(inventoryId, { ...patch, pedido_id: orderId }); }
  async assignManyToOrder(orderId, assignments = [], patch = {}) { return Promise.all(assignments.map((assignment) => this.assignToOrder(orderId, assignment.inventario_id || assignment.id, { ...patch, ...assignment }))); }
  async getDashboardSnapshot() { const [products, orders, inventory, renewals, providers, provider_purchases, payment_methods] = await Promise.all([new D1TableStore(this.db, "products").list(), new D1TableStore(this.db, "orders").list(), this.list(), new D1TableStore(this.db, "renewals").list(), new D1TableStore(this.db, "providers").list(), new D1TableStore(this.db, "provider_purchases").list(), new D1TableStore(this.db, "payment_methods").list()]); return { products, orders, inventory, renewals, providers, provider_purchases, payment_methods }; }
}
class D1PaymentMethodStore extends D1TableStore { constructor(db) { super(db, "payment_methods"); } async listMethods() { return (await this.list()).filter((row) => row.estado === "activo"); } }
class D1TemplateStore extends D1TableStore { constructor(db) { super(db, "message_templates"); } listTemplates() { return this.list(); } updateTemplate(id, row) { return this.update(id, row); } }
class D1SiteSettingStore extends D1TableStore { constructor(db) { super(db, "site_settings"); } listSettings() { return this.list(); } updateSetting(id, row) { return this.update(id, row); } }

module.exports = { enabled, D1CatalogStore, D1OrderStore, D1RenewalStore, D1SupplierStore, D1InventoryStore, D1PaymentMethodStore, D1TemplateStore, D1SiteSettingStore };
