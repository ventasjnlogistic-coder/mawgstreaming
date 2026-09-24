const BATCH_SIZE = 40;

function toD1Value(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getD1Value(row, field) {
  if (field === "componentes_json") return JSON.stringify(row.componentes || []);
  if (field === "datos_entrega_json") return JSON.stringify(row.datos_entrega || {});
  if (field === "asignaciones_inventario_json") return JSON.stringify(row.asignaciones_inventario || []);
  return toD1Value(row[field]);
}

const TABLES = [
  { table: "products", key: "id", fields: ["id", "nombre", "tipo", "precio", "descripcion", "imagen", "estado", "categoria", "badge", "cta", "componentes_json", "plantilla_entrega", "vender", "orden", "creado_en", "actualizado_en"] },
  { table: "providers", key: "proveedor_id", fields: ["proveedor_id", "nombre", "contacto", "producto_principal", "costo_referencial", "estado", "notas", "creado_en", "actualizado_en"] },
  { table: "provider_purchases", key: "compra_id", fields: ["compra_id", "proveedor_id", "proveedor_nombre", "producto_id", "producto_nombre", "cantidad", "costo_total", "costo_unitario", "metodo_pago", "referencia_pago", "fecha_compra", "fecha_vencimiento_proveedor", "estado", "notas", "creado_en", "actualizado_en", "cuenta_usuario", "cuenta_clave", "url_producto", "link_bot", "usuario_bot", "contrasena_bot"] },
  { table: "inventory", key: "inventario_id", fields: ["inventario_id", "producto_id", "producto_nombre", "proveedor", "costo_proveedor", "cuenta_usuario", "cuenta_clave", "perfil_nombre", "pin", "estado", "pedido_id", "cliente_nombre", "cliente_contacto", "fecha_compra", "fecha_entrega", "fecha_vencimiento_cliente", "notas", "creado_en", "actualizado_en", "precio_venta_sugerido", "celular_proveedor", "referencia_compra", "estado_control", "fecha_vencimiento_proveedor", "compra_id", "url_producto", "link_bot", "usuario_bot", "contrasena_bot"] },
  { table: "orders", key: "pedido_id", fields: ["pedido_id", "producto_id", "producto_nombre", "producto_precio", "metodo_pago", "cliente_nombre", "cliente_contacto", "comprobante_url", "comprobante_referencia", "comprobante_notas", "estado", "creado_en", "actualizado_en", "inventario_id", "proveedor", "costo_proveedor", "fecha_entrega", "fecha_vencimiento_cliente", "datos_entrega_json", "asignaciones_inventario_json", "canal_venta"] },
  { table: "renewals", key: "renovacion_id", fields: ["renovacion_id", "pedido_id", "inventario_id", "cliente_nombre", "cliente_contacto", "producto_nombre", "monto", "metodo_pago", "comprobante_url", "comprobante_referencia", "comprobante_notas", "estado", "fecha_aviso", "fecha_pago", "fecha_confirmacion", "vencimiento_anterior", "vencimiento_nuevo", "notas", "creado_en", "actualizado_en"] },
  { table: "payment_methods", key: "id", fields: ["id", "nombre", "tipo", "titular", "numero", "cci", "banco", "qr_imagen", "instrucciones", "estado", "orden"] },
  { table: "message_templates", key: "id", fields: ["id", "nombre", "asunto", "contenido", "estado", "orden"] },
  { table: "site_settings", key: "id", fields: ["id", "nombre", "valor", "tipo", "estado", "orden"] },
];

function chunks(items, size) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

class D1SheetsImportService {
  constructor({ db, sources }) {
    this.db = db;
    this.sources = sources;
  }

  assertReady() {
    if (!this.db || typeof this.db.prepare !== "function" || typeof this.db.batch !== "function") {
      const error = new Error("D1 no esta vinculada al Worker. Publica la configuracion con el binding DB antes de importar.");
      error.statusCode = 503;
      throw error;
    }
  }

  async importRows(definition, rows) {
    const validRows = rows.filter((row) => String(row?.[definition.key] || "").trim());
    if (!validRows.length) return 0;

    const placeholders = definition.fields.map(() => "?").join(", ");
    const updates = definition.fields.filter((field) => field !== definition.key).map((field) => `${field} = excluded.${field}`).join(", ");
    const query = `INSERT INTO ${definition.table} (${definition.fields.join(", ")}) VALUES (${placeholders}) ON CONFLICT(${definition.key}) DO UPDATE SET ${updates}`;

    for (const group of chunks(validRows, BATCH_SIZE)) {
      await this.db.batch(group.map((row) => this.db.prepare(query).bind(...definition.fields.map((field) => getD1Value(row, field)))));
    }

    return validRows.length;
  }

  async importFromSheets() {
    this.assertReady();
    const startedAt = new Date().toISOString();
    const run = await this.db.prepare("INSERT INTO migration_runs (fuente, iniciado_en, estado) VALUES (?, ?, ?)").bind("apps-script", startedAt, "en_proceso").run();
    const runId = run.meta?.last_row_id;
    const summary = {};

    try {
      // Las lecturas son secuenciales para no volver a saturar Apps Script.
      const sourceRows = {
        products: await this.sources.products(),
        providers: await this.sources.providers(),
        provider_purchases: await this.sources.providerPurchases(),
        inventory: await this.sources.inventory(),
        orders: await this.sources.orders(),
        renewals: await this.sources.renewals(),
        payment_methods: await this.sources.paymentMethods(),
        message_templates: await this.sources.messageTemplates(),
        site_settings: await this.sources.siteSettings(),
      };

      for (const definition of TABLES) {
        summary[definition.table] = await this.importRows(definition, Array.isArray(sourceRows[definition.table]) ? sourceRows[definition.table] : []);
      }

      await this.db.prepare("UPDATE migration_runs SET finalizado_en = ?, estado = ?, resumen_json = ? WHERE id = ?")
        .bind(new Date().toISOString(), "completado", JSON.stringify(summary), runId).run();
      return summary;
    } catch (error) {
      await this.db.prepare("UPDATE migration_runs SET finalizado_en = ?, estado = ?, resumen_json = ? WHERE id = ?")
        .bind(new Date().toISOString(), "fallido", JSON.stringify(summary), runId).run().catch(() => {});
      throw error;
    }
  }
}

module.exports = D1SheetsImportService;
