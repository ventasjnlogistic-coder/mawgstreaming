# MAWG Streaming Catalogo Local

App local full-stack para mostrar un catalogo publico, crear pedidos, registrar comprobantes, administrar productos y asignar cuentas reales desde InventarioCuentas con login privado. El catalogo, los pedidos y el inventario pueden usar Google Sheets mediante un Web App de Google Apps Script, con `productos.json`, `pedidos.json` e `inventario-cuentas.json` como respaldo local/desarrollo.

## Requisitos

- Node.js 18 o superior.
- npm.
- Una cuenta de Google si vas a usar Apps Script + Google Sheets + Drive.

## Instalacion local

```bash
npm install
npm start
```

En PowerShell de Windows, si `npm` esta bloqueado por la politica de ejecucion, usa:

```powershell
npm.cmd install
npm.cmd start
```

Luego abre:

- Tienda: `http://127.0.0.1:3000`
- Admin: `http://127.0.0.1:3000/admin.html`

El servidor escucha por defecto solo en tu maquina local:

```env
HOST=127.0.0.1
PORT=3000
```

Si necesitas exponerlo en tu red local, cambia `HOST=0.0.0.0` en `.env`.

Este proyecto ya incluye un `.env` local ignorado por Git con el endpoint de Apps Script configurado. Si no existe `.env`, crea uno con `copy .env.example .env` y copia tambien el valor real de `APPS_SCRIPT_ADMIN_TOKEN`.

## Credenciales de admin local

Edita `.env`:

```env
ADMIN_USER=admin
ADMIN_PASSWORD=tu-contrasena-local
SESSION_SECRET=una-clave-larga-para-sesiones
```

El admin local protege `/admin.html` y `/api/admin/productos` con sesion. El token de Apps Script nunca se usa desde el navegador: solo lo envia el backend local cuando una sesion admin valida crea, actualiza o elimina productos.

## Modo Google Apps Script + Google Sheets

Este es el camino recomendado para usar Google Sheets sin guardar credenciales de cuenta de servicio en el proyecto local.

El modo configurado para uso local es:

```env
CATALOG_STORAGE=<modo_apps_script>
APPS_SCRIPT_CATALOG_URL=<url_del_web_app_de_apps_script>
APPS_SCRIPT_ADMIN_TOKEN=<token_admin>
APPS_SCRIPT_PROOF_DRIVE_FOLDER_ID=<id_carpeta_drive>
APPS_SCRIPT_TIMEOUT_MS=15000
PROOF_UPLOAD_MAX_MB=8
```

El token real vive en `.env`, que no se versiona. Ese valor debe coincidir exactamente con `ADMIN_TOKEN` dentro del codigo desplegado en Google Apps Script. `APPS_SCRIPT_PROOF_DRIVE_FOLDER_ID` debe ser el ID de una carpeta de Google Drive donde se guardaran imagenes y PDF de comprobantes. Si cambias el token, el folder o el codigo de Apps Script, vuelve a desplegar el Web App.

## Despliegue en Render

Render ejecuta este proyecto como un servicio web Node/Express normal. Usa:

```text
Build Command: npm install
Start Command: npm start
```

Configura estas variables en Render, en **Environment**:

```env
NODE_ENV=production
TRUST_PROXY=true
HOST=0.0.0.0
CATALOG_STORAGE=<modo_apps_script>
APPS_SCRIPT_CATALOG_URL=<url_del_web_app_de_apps_script>
APPS_SCRIPT_ADMIN_TOKEN=<token_admin>
APPS_SCRIPT_PROOF_DRIVE_FOLDER_ID=<id_carpeta_drive>
APPS_SCRIPT_TIMEOUT_MS=15000
ADMIN_USER=admin-de-respaldo
ADMIN_PASSWORD=clave-de-respaldo
SESSION_SECRET=una-clave-larga-y-segura
```

El login principal puede venir de la hoja `UsuariosAdmin`. `ADMIN_USER` y `ADMIN_PASSWORD` quedan como respaldo para no perder acceso si Apps Script no responde.

Para validar que Render esta ejecutando el backend y leyendo variables, abre:

```text
https://TU-SITIO.onrender.com/api/health/config
```

Debe mostrar `apps_script.configured: true`, `url_present: true` y `token_present: true`. No expone secretos; solo muestra pistas enmascaradas.

## Modo JSON local opcional

Para trabajar solo con `productos.json`, cambia `.env` a:

```env
CATALOG_STORAGE=<modo_json>
CATALOG_JSON_PATH=productos.json
ORDERS_JSON_PATH=pedidos.json
INVENTORY_JSON_PATH=inventario-cuentas.json
RENEWALS_JSON_PATH=renovaciones.json
```

La tienda publica lee desde `/api/productos`. El panel admin usa `/api/admin/productos` y requiere login.

### 1. Crear la hoja

1. Crea un Google Sheet.
2. Renombra la primera pestana a `Productos`.
3. En la fila `A1:K1` agrega exactamente estos encabezados:

```text
id, nombre, tipo, precio, descripcion, imagen, estado, categoria, badge, cta, componentes
```

Notas:

- `id` y `nombre` son obligatorios.
- `estado` debe ser `disponible` o `agotado`.
- `precio` puede ser numero o quedar vacio.
- `imagen` puede ser una URL de Drive, una URL publica o una ruta publica del sitio, por ejemplo `assets/images/Netflix.jpg`. Si pegas un enlace de Drive como `https://drive.google.com/file/d/ID/view`, el admin/backend lo normaliza a `https://drive.google.com/thumbnail?id=ID&sz=w1200`.
- `componentes` es opcional. Para combos, guarda un JSON con productos individuales, por ejemplo `[{"id":"netflix-premium","nombre":"Netflix Premium","producto_id":"netflix-premium"},{"id":"Disney_Premiun","nombre":"Disney Premiun","producto_id":"Disney_Premiun"}]`.

La plantilla de Apps Script crea automaticamente una segunda pestana llamada `Pedidos` cuando llega el primer pedido. Si prefieres crearla manualmente, usa estos encabezados en `A1:T1`:

```text
pedido_id, producto_id, producto_nombre, producto_precio, metodo_pago, cliente_nombre, cliente_contacto, comprobante_url, comprobante_referencia, comprobante_notas, estado, creado_en, actualizado_en, inventario_id, proveedor, costo_proveedor, fecha_entrega, fecha_vencimiento_cliente, datos_entrega, asignaciones_inventario
```

La plantilla tambien crea `InventarioCuentas` cuando se usa el inventario desde admin. Si quieres crearla manualmente, usa estos encabezados en `A1:S1`:

```text
inventario_id, producto_id, producto_nombre, proveedor, costo_proveedor, cuenta_usuario, cuenta_clave, perfil_nombre, pin, estado, pedido_id, cliente_nombre, cliente_contacto, fecha_compra, fecha_entrega, fecha_vencimiento_cliente, notas, creado_en, actualizado_en, precio_venta_sugerido
```

La plantilla tambien crea `Renovaciones` cuando se registra el primer control de renovacion. Si quieres crearla manualmente, usa estos encabezados en `A1:T1`:

```text
renovacion_id, pedido_id, inventario_id, cliente_nombre, cliente_contacto, producto_nombre, monto, metodo_pago, comprobante_url, comprobante_referencia, comprobante_notas, estado, fecha_aviso, fecha_pago, fecha_confirmacion, vencimiento_anterior, vencimiento_nuevo, notas, creado_en, actualizado_en
```

La plantilla crea tambien `MetodosPago` para que los medios de pago se administren desde Google Sheets y no desde el codigo. Encabezados:

```text
id, nombre, tipo, titular, numero, cci, banco, qr_imagen, instrucciones, estado, orden
```

Usa `estado=activo` para mostrarlo en tienda/admin, `estado=inactivo` para ocultarlo, y `orden` para controlar el orden. `qr_imagen` acepta un enlace de Drive y se normaliza como imagen de vista previa.

La plantilla crea `UsuariosAdmin` para login y roles administrables desde Google Sheets. Encabezados:

```text
usuario, nombre, rol, password, estado, permisos
```

Ejemplos:

```text
admin, Administrador, admin, tu-clave, activo, *
operador, Operador Ventas, operaciones, clave123, activo, compras,inventario,renovaciones
```

Permisos soportados: `*`, `compras`, `productos`, `inventario`, `proveedores`, `renovaciones`, `plantillas`, `auditoria`, `reportes`.

Para controlar compras a proveedores, la plantilla crea `Proveedores` y `ComprasProveedor`.

```text
proveedor_id, nombre, contacto, producto_principal, costo_referencial, estado, notas, creado_en, actualizado_en
```

```text
compra_id, proveedor_id, proveedor_nombre, producto_id, producto_nombre, cantidad, costo_total, costo_unitario, metodo_pago, referencia_pago, fecha_compra, fecha_vencimiento_proveedor, estado, notas, creado_en, actualizado_en, cuenta_usuario, cuenta_clave
```

Cuando una compra proveedor queda en estado `recibido`, la app genera automaticamente las cuentas faltantes en `InventarioCuentas` usando `cantidad`. La generacion usa `compra_id` para evitar duplicados si guardas la misma compra mas de una vez.

### 2. Crear el Apps Script

1. En el Google Sheet, abre `Extensiones > Apps Script`.
2. Copia el contenido de `scripts/google-apps-script-catalogo.gs` en el editor.
3. Cambia esta linea para que coincida exactamente con `APPS_SCRIPT_ADMIN_TOKEN` en tu `.env` local:

```javascript
const ADMIN_TOKEN = "cambia-este-token-largo";
```

4. Crea una carpeta en Google Drive para comprobantes, copia su ID desde la URL y configuralo en Apps Script:

```javascript
const PROOF_DRIVE_FOLDER_ID = "id-de-tu-carpeta-drive";
```

Opcionalmente puedes dejar `PROOF_FILE_PUBLIC_LINK = false` para que los archivos solo sean visibles para cuentas con permiso en Drive. Cambialo a `true` solo si necesitas que el enlace del admin abra sin iniciar sesion en Google.

4. Guarda el proyecto.

### 3. Desplegar como Web App

1. En Apps Script, entra a `Implementar > Nueva implementacion`.
2. Selecciona tipo `Aplicacion web`.
3. Configura:
   - Ejecutar como: `Yo`.
   - Quien tiene acceso: `Cualquier usuario` o `Cualquier usuario con el enlace`.
4. Implementa y copia la URL del Web App. Debe terminar en `/exec`.

### 4. Configurar la app local

El `.env` local ya esta preparado para este endpoint. Debe contener:

```env
CATALOG_STORAGE=<modo_apps_script>
APPS_SCRIPT_CATALOG_URL=<url_del_web_app_de_apps_script>
APPS_SCRIPT_ADMIN_TOKEN=<token_admin>
APPS_SCRIPT_PROOF_DRIVE_FOLDER_ID=<id_carpeta_drive>
APPS_SCRIPT_TIMEOUT_MS=15000
PROOF_UPLOAD_MAX_MB=8
```

Reinicia el servidor local:

```bash
npm start
```

## Comportamiento con Apps Script configurado

- `GET /api/productos`: la tienda publica pide productos al backend local. El backend lee catalogo e inventario, calcula `stock_disponible` y marca como `agotado` lo que no tiene cuentas disponibles.
- `POST /api/pedidos`: crea un pedido con `pedido_id`, producto y estado `pendiente de pago`; el backend lo guarda en la hoja `Pedidos`.
- `POST /api/pedidos/:id/comprobante`: registra datos del cliente, metodo de pago y comprobante. El estado pasa a `comprobante recibido`. Con Apps Script configurado, el archivo se guarda en Drive y la hoja recibe el enlace en `comprobante_url`.
- `GET /api/admin/productos`: el admin local requiere sesion y lee el mismo catalogo remoto.
- `POST /api/admin/productos`: el backend valida la sesion local, normaliza el producto y envia `action=create` con token a Apps Script.
- `PUT /api/admin/productos/:id`: el backend valida la sesion local y envia `action=update` con token.
- `DELETE /api/admin/productos/:id`: el backend valida la sesion local y envia `action=delete` con token.
- `GET /api/admin/pedidos`: el admin local requiere sesion y lista pedidos desde la hoja.
- `PUT /api/admin/pedidos/:id`: el admin local requiere sesion y cambia manualmente el estado (`pendiente de pago`, `comprobante recibido`, `pagado`, `entregado`, `cancelado`).
- `GET /api/admin/inventario`: lista InventarioCuentas.
- `POST /api/admin/inventario` y `PUT /api/admin/inventario/:id`: crean y actualizan cuentas reales.
- `POST /api/admin/pedidos/:id/asignar-inventario`: solo acepta pedidos en estado `pagado`; en productos simples asigna una cuenta y en combos asigna una cuenta por componente. Marca las cuentas como `ocupado` y el pedido como `entregado`.
- `POST /api/admin/inventario/:id/liberar`: devuelve una cuenta a `disponible`.
- `PUT /api/admin/inventario/:id/renovar`: actualiza fechas, proveedor/costo y sincroniza el vencimiento del pedido vinculado cuando existe.
- `GET /api/admin/renovaciones`: lista el historial de renovaciones.
- `POST /api/admin/renovaciones`: crea una renovacion desde una cuenta ocupada.
- `GET /api/metodos-pago`: lee `MetodosPago` desde Apps Script y devuelve solo metodos activos; si Apps Script no responde, usa los metodos locales por defecto.
- `PUT /api/admin/renovaciones/:id`: actualiza estado, metodo y monto de una renovacion.
- `POST /api/admin/renovaciones/:id/confirmar`: sube el comprobante como archivo, confirma el pago, marca la renovacion como `renovado` y actualiza el vencimiento en inventario y pedido vinculado.
- `GET/POST/PUT /api/admin/proveedores`: mantenimiento de proveedores.
- `GET/POST/PUT /api/admin/compras-proveedor`: control de compras a proveedores, costos, referencias de pago y vencimiento proveedor. Al guardar una compra como `recibido`, se crean cuentas de inventario con estado `pendiente_revision`.

## Flujo operativo

1. El cliente entra a la tienda y ve productos con `Stock: N`.
2. La tienda calcula stock desde `InventarioCuentas`: si no hay cuentas disponibles, el producto aparece `Agotado`.
3. El cliente pulsa `Comprar`. Esto solo abre el modal con los metodos de pago; todavia no se crea pedido.
4. El cliente paga, registra nombre/contacto, adjunta comprobante y pulsa `Generar pedido y enviar comprobante`.
5. Recien en ese momento el backend crea el pedido, registra el comprobante y lo deja como `comprobante recibido`.
6. En Admin > Compras, revisa el comprobante y cambia el estado a `pagado` cuando confirmes el pago.
7. En Admin > Compras, para un pedido pagado selecciona cuentas disponibles compatibles. En combos, selecciona una cuenta por componente.
8. Al asignar, completa perfil, PIN y fecha de vencimiento. El pedido queda `entregado` y las cuentas quedan `ocupado`.
9. Cuando el pedido ya esta entregado, Admin > Compras muestra `Notificar entrega`, que abre WhatsApp con los datos del pedido y la cuenta asignada.
10. En Admin > Inventario, puedes crear, editar, liberar, renovar cuentas y avisar vencimientos al cliente.
11. En Admin > Renovaciones, creas controles de pago desde cuentas por vencer, registras comprobante y confirmas renovacion.
12. En Admin > Productos, mantienes catalogo, precios, imagenes, estado y componentes de combos.

## Organizacion del admin

- `Compras`: seguimiento de pedidos, comprobantes, confirmacion de pago y entrega/asignacion de cuentas.
- `Productos`: mantenimiento del catalogo publicado, incluyendo componentes para combos.
- `Inventario`: mantenimiento de cuentas reales, proveedor, costo, credenciales, estado y vencimiento. Incluye filtro `Vence pronto`, alerta visual por vencimiento y boton `Avisar vencimiento` para preparar el mensaje por WhatsApp.
- `Renovaciones`: historial de pagos recurrentes, cuentas por vencer, comprobantes y confirmacion de nueva vigencia.
- `Exportar`: vista previa y respaldo JSON para desarrollo/local.

## Troubleshooting Apps Script

- Si el admin muestra `Accion no soportada`, el Web App publicado no tiene la ultima version de `scripts/google-apps-script-catalogo.gs`.
- Si un combo rechaza una cuenta compatible, vuelve a desplegar Apps Script con la version actual. La funcion clave es `inventoryMatchesAssignment_`.
- Si no se guardan comprobantes, revisa que `PROOF_DRIVE_FOLDER_ID` en Apps Script y `APPS_SCRIPT_PROOF_DRIVE_FOLDER_ID` en `.env` apunten a la carpeta correcta.
- Si el admin local funciona pero Google Sheets no cambia, verifica que hayas creado una nueva version en `Implementar > Administrar implementaciones`, no solo guardado el codigo.
- Si cambias `ADMIN_TOKEN` en Apps Script, actualiza tambien `APPS_SCRIPT_ADMIN_TOKEN` en `.env` y reinicia el servidor local.

Si configuras el modo Apps Script pero falta `APPS_SCRIPT_CATALOG_URL` o `APPS_SCRIPT_ADMIN_TOKEN`, la app vuelve automaticamente a `productos.json` para no romper el desarrollo local. Si Apps Script esta configurado pero Google responde con error o timeout, la API local devolvera error para que el admin no oculte fallos de sincronizacion.

## Conector Google Sheets heredado

El proyecto conserva el conector directo con Google Sheets por cuenta de servicio:

```env
CATALOG_STORAGE=<modo_sheets>
GOOGLE_SHEETS_SPREADSHEET_ID=tu_id_de_hoja
GOOGLE_SHEETS_RANGE=Productos!A:K
GOOGLE_SERVICE_ACCOUNT_EMAIL=cuenta@proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Para nuevos despliegues, usa el modo Apps Script porque requiere menos configuracion local.

## Estructura

- `server.js`: servidor Express, sesiones, login y rutas API.
- `src/services/catalog/`: adaptadores de almacenamiento para JSON, Apps Script y Google Sheets directo.
- `src/services/orders/`: adaptadores y validacion del flujo de pedidos.
- `src/services/inventory/`: adaptadores y validacion de InventarioCuentas.
- `scripts/google-apps-script-catalogo.gs`: plantilla lista para copiar en Apps Script.
- `public/index.html`, `public/script.js`, `public/styles.css`: storefront publico servido por Express.
- `public/admin.html`, `public/admin.js`: panel protegido para CRUD del catalogo.
- `public/login.html`, `public/login.js`: ingreso privado al admin.
- `productos.json`: respaldo local del catalogo.
- `pedidos.json` e `inventario-cuentas.json`: respaldos locales creados automaticamente cuando usas el modo JSON.

## Pruebas

```bash
npm test
npm run test:web
npm run test:api
```

En PowerShell de Windows, si `npm` esta bloqueado por la politica de ejecucion, usa `npm.cmd test`, `npm.cmd run test:web` o `npm.cmd run test:api`.

Sin instalar dependencias adicionales, `npm run test:web` valida que la web servida desde `public/` cargue HTML, CSS, JS, assets, admin protegido e imagenes de catalogo.
