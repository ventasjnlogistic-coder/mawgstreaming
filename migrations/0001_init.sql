-- Esquema D1 para mawg-streaming.
-- Fuente unica de verdad de las columnas que esperan los adaptadores en
-- src/services/d1/d1OperationalStores.js y el importador
-- src/services/migrations/d1SheetsImportService.js.
--
-- Todo se guarda como TEXT: los adaptadores escriben los valores con String(...)
-- y los objetos anidados como JSON, asi que la afinidad TEXT evita sorpresas.
-- El script es idempotente (IF NOT EXISTS), puedes ejecutarlo varias veces.

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  tipo TEXT,
  precio TEXT,
  descripcion TEXT,
  imagen TEXT,
  estado TEXT,
  categoria TEXT,
  badge TEXT,
  cta TEXT,
  componentes_json TEXT,
  plantilla_entrega TEXT,
  vender TEXT,
  orden TEXT,
  creado_en TEXT,
  actualizado_en TEXT
);

CREATE TABLE IF NOT EXISTS providers (
  proveedor_id TEXT PRIMARY KEY,
  nombre TEXT,
  contacto TEXT,
  producto_principal TEXT,
  costo_referencial TEXT,
  estado TEXT,
  notas TEXT,
  creado_en TEXT,
  actualizado_en TEXT
);

CREATE TABLE IF NOT EXISTS provider_purchases (
  compra_id TEXT PRIMARY KEY,
  proveedor_id TEXT,
  proveedor_nombre TEXT,
  producto_id TEXT,
  producto_nombre TEXT,
  cantidad TEXT,
  costo_total TEXT,
  costo_unitario TEXT,
  metodo_pago TEXT,
  referencia_pago TEXT,
  fecha_compra TEXT,
  fecha_vencimiento_proveedor TEXT,
  estado TEXT,
  notas TEXT,
  creado_en TEXT,
  actualizado_en TEXT,
  cuenta_usuario TEXT,
  cuenta_clave TEXT,
  url_producto TEXT,
  link_bot TEXT,
  usuario_bot TEXT,
  contrasena_bot TEXT
);

CREATE TABLE IF NOT EXISTS inventory (
  inventario_id TEXT PRIMARY KEY,
  producto_id TEXT,
  producto_nombre TEXT,
  proveedor TEXT,
  costo_proveedor TEXT,
  cuenta_usuario TEXT,
  cuenta_clave TEXT,
  perfil_nombre TEXT,
  pin TEXT,
  estado TEXT,
  pedido_id TEXT,
  cliente_nombre TEXT,
  cliente_contacto TEXT,
  fecha_compra TEXT,
  fecha_entrega TEXT,
  fecha_vencimiento_cliente TEXT,
  notas TEXT,
  creado_en TEXT,
  actualizado_en TEXT,
  precio_venta_sugerido TEXT,
  celular_proveedor TEXT,
  referencia_compra TEXT,
  estado_control TEXT,
  fecha_vencimiento_proveedor TEXT,
  compra_id TEXT,
  url_producto TEXT,
  link_bot TEXT,
  usuario_bot TEXT,
  contrasena_bot TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  pedido_id TEXT PRIMARY KEY,
  producto_id TEXT,
  producto_nombre TEXT,
  producto_precio TEXT,
  metodo_pago TEXT,
  cliente_nombre TEXT,
  cliente_contacto TEXT,
  comprobante_url TEXT,
  comprobante_referencia TEXT,
  comprobante_notas TEXT,
  estado TEXT,
  creado_en TEXT,
  actualizado_en TEXT,
  inventario_id TEXT,
  proveedor TEXT,
  costo_proveedor TEXT,
  fecha_entrega TEXT,
  fecha_vencimiento_cliente TEXT,
  datos_entrega_json TEXT,
  asignaciones_inventario_json TEXT,
  canal_venta TEXT
);

CREATE TABLE IF NOT EXISTS renewals (
  renovacion_id TEXT PRIMARY KEY,
  pedido_id TEXT,
  inventario_id TEXT,
  cliente_nombre TEXT,
  cliente_contacto TEXT,
  producto_nombre TEXT,
  monto TEXT,
  metodo_pago TEXT,
  comprobante_url TEXT,
  comprobante_referencia TEXT,
  comprobante_notas TEXT,
  estado TEXT,
  fecha_aviso TEXT,
  fecha_pago TEXT,
  fecha_confirmacion TEXT,
  vencimiento_anterior TEXT,
  vencimiento_nuevo TEXT,
  notas TEXT,
  creado_en TEXT,
  actualizado_en TEXT
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  tipo TEXT,
  titular TEXT,
  numero TEXT,
  cci TEXT,
  banco TEXT,
  qr_imagen TEXT,
  instrucciones TEXT,
  estado TEXT,
  orden TEXT
);

CREATE TABLE IF NOT EXISTS message_templates (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  asunto TEXT,
  contenido TEXT,
  estado TEXT,
  orden TEXT
);

CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  valor TEXT,
  tipo TEXT,
  estado TEXT,
  orden TEXT
);

-- Usuarios del panel. No se importan desde Sheets (Apps Script solo expone
-- users.auth); se siembran manualmente con INSERT.
CREATE TABLE IF NOT EXISTS users (
  usuario TEXT PRIMARY KEY,
  nombre TEXT,
  rol TEXT,
  password TEXT,
  estado TEXT,
  permisos TEXT
);

-- Bitacora de auditoria.
CREATE TABLE IF NOT EXISTS audit_events (
  evento_id TEXT PRIMARY KEY,
  entidad TEXT,
  entidad_id TEXT,
  accion TEXT,
  estado_anterior TEXT,
  estado_nuevo TEXT,
  usuario TEXT,
  ip TEXT,
  detalles_json TEXT,
  creado_en TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_events_creado_en ON audit_events (creado_en DESC);

-- Seguimiento de las importaciones Sheets -> D1.
CREATE TABLE IF NOT EXISTS migration_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fuente TEXT,
  iniciado_en TEXT,
  finalizado_en TEXT,
  estado TEXT,
  resumen_json TEXT
);
