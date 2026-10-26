const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../scripts/google-apps-script-catalogo.gs'), 'utf8');
function harness() {
  const cache = new Map(), properties = new Map(), events = [];
  let uuid = 0, held = false;
  const context = vm.createContext({
    CacheService: { getScriptCache: () => ({ get: key => cache.get(key), put: (key,value) => cache.set(key,value), remove: key => cache.delete(key) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties.get(key), setProperties: values => { events.push('invalidate'); Object.entries(values).forEach(([k,v]) => properties.set(k,v)); } }) },
    Utilities: { getUuid: () => String(++uuid), newBlob: value => ({ getBytes: () => Buffer.from(value) }) },
    LockService: { getScriptLock: () => ({ waitLock() { held = true; events.push('lock'); }, hasLock: () => held, releaseLock() { held = false; events.push('release'); } }) },
    SpreadsheetApp: { flush: () => events.push('flush') },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
  });
  vm.runInContext(source, context);
  return { context, cache, properties, events };
}
test('cache reutiliza lecturas e invalida solo entidades modificadas', () => {
  const { context: c } = harness(); let reads = 0;
  const load = () => [++reads];
  c.getCachedRead_('inventory', load); c.getCachedRead_('orders', load);
  c.getCachedRead_('inventory', load); assert.equal(reads, 2);
  c.invalidateReadCache_(['inventory']);
  c.getCachedRead_('orders', load); assert.equal(reads, 2);
  c.getCachedRead_('inventory', load); assert.equal(reads, 3);
});
test('lectura anterior a invalidacion no contamina nueva generacion', () => {
  const { context: c } = harness();
  c.getCachedRead_('inventory', () => { c.invalidateReadCache_(['inventory']); return ['viejo']; });
  assert.deepEqual(c.getCachedRead_('inventory', () => ['nuevo']), ['nuevo']);
});
test('limite cache considera bytes UTF8', () => {
  const { context: c, cache } = harness();
  c.getCachedRead_('templates', () => '😀'.repeat(24000));
  assert.equal(cache.size, 0);
});
test('escritura confirma e invalida despues de modificar y libera bloqueo', () => {
  const { context: c, events } = harness();
  c.handlePost_ = () => { events.push('write'); return { ok: true }; };
  c.doPost({ postData: { contents: JSON.stringify({ action: 'inventory.update', token: 'cambia-este-token-largo' }) } });
  assert.deepEqual(events, ['lock', 'write', 'flush', 'invalidate', 'release']);
});
test('errores parciales tambien invalidan y liberan bloqueo', () => {
  const { context: c, events } = harness();
  c.handlePost_ = () => { throw new Error('fallo'); };
  assert.equal(c.doPost({ postData: { contents: JSON.stringify({ action: 'orders.create' }) } }).ok, false);
  assert.deepEqual(events, ['lock', 'flush', 'invalidate', 'release']);
});
test('token invalido no modifica versiones ni toma bloqueo', () => {
  const { context: c, events } = harness();
  c.handlePost_ = () => ({ ok: false });
  c.doPost({ postData: { contents: JSON.stringify({ action: 'inventory.update', token: 'invalido' }) } });
  assert.deepEqual(events, []);
});
test('formato de texto se aplica agrupado incluso mas alla de Z', () => {
  const { context: c } = harness(); let ranges;
  const headers = Array.from({ length: 28 }, (_, i) => String(i));
  c.formatTextRow_({ getRangeList: values => { ranges = values; return { setNumberFormat: format => assert.equal(format, '@') }; } }, headers, ['0', '26', '27'], 4);
  assert.deepEqual(Array.from(ranges), ['A4', 'AA4', 'AB4']);
});
test('combo lee inventario una vez y actualiza solo las cuentas seleccionadas', () => {
  const { context: c } = harness();
  let reads = 0; const written = [];
  const inventory = {
    getLastRow: () => 4,
    getRange(row, column, count) {
      return { getValues() { reads++; return [['a'], ['b'], ['c']]; }, setValues(value) { written.push({ row, value }); } };
    },
  };
  const orders = { getRange: () => ({ getValues: () => [[]], setValues() {} }) };
  c.getOrdersSheet_ = () => orders; c.getInventorySheet_ = () => inventory;
  c.findOrderRowById_ = () => 2;
  c.rowToOrder_ = () => ({ pedido_id: 'p', estado: 'pagado', producto_precio: 20 });
  c.rowToInventoryItem_ = row => ({ inventario_id: row[0], estado: 'disponible', costo_proveedor: 2, producto_nombre: row[0] });
  c.listProducts_ = () => [];
  c.inventoryMatchesAssignment_ = () => true;
  c.allocateAssignmentPrices_ = () => [{ precio_lista: 10, precio_venta: 10 }, { precio_lista: 10, precio_venta: 10 }];
  c.normalizeInventoryItem_ = value => value; c.normalizeOrder_ = value => value;
  c.inventoryItemToRow_ = value => [value.inventario_id, value.estado];
  c.orderToRow_ = value => [value.estado]; c.formatTextRow_ = () => {};
  const result = c.assignManyInventoryToOrder_('p', [{ inventario_id: 'a' }, { inventario_id: 'c' }], {});
  assert.equal(reads, 1);
  assert.deepEqual(written.map(entry => entry.row), [2, 4]);
  assert.equal(result.order.estado, 'entregado');
  assert.equal(result.items.every(item => item.estado === 'ocupado'), true);
});
