const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../public/admin.js'), 'utf8');
function harness() {
  const calls = [];
  const cache = new Map();
  const window = { setTimeout, clearTimeout, location: { pathname: '/admin.html', hash: '' } };
  const context = vm.createContext({ window, adminReadCache: cache, Date, performance, FormData, AbortController,
    ADMIN_READ_CACHE_TTL_MS: 30000, ADMIN_READ_STALE_TTL_MS: 60000, setStatus() {},
    fetch: (url, options) => new Promise((resolve) => calls.push({ url, options, resolve })),
  });
  vm.runInContext(source.slice(source.indexOf('const adminPendingReads ='), source.indexOf('function setStatus(')), context);
  return { context, cache, calls, metrics: window.adminPerformance };
}
function finish(call, data = [], status = 200) {
  call.resolve({ status, ok: status < 400, json: async () => data });
}
test('lecturas simultaneas comparten una solicitud y conservan cache', async () => {
  const h = harness();
  const a = h.context.apiRequest('/api/admin/inventario');
  const b = h.context.apiRequest('/api/admin/inventario');
  assert.equal(h.calls.length, 1);
  finish(h.calls[0], [{ id: 1 }]);
  assert.deepEqual(await a, await b);
  await h.context.apiRequest('/api/admin/inventario');
  assert.equal(h.calls.length, 1);
  assert.equal(h.metrics.snapshot().length, 1);
});
test('lectura anterior a escritura no repuebla cache ni se comparte despues', async () => {
  const h = harness();
  const old = h.context.apiRequest('/api/admin/inventario');
  const write = h.context.apiRequest('/api/admin/inventario/123', { method: 'PUT', body: '{}' });
  finish(h.calls[1], { ok: true }); await write;
  const fresh = h.context.apiRequest('/api/admin/inventario');
  finish(h.calls[0], ['viejo']); await old;
  assert.equal(h.cache.size, 0);
  finish(h.calls[2], ['nuevo']); await fresh;
  assert.deepEqual(h.cache.get('/api/admin/inventario').value, ['nuevo']);
});
test('lectura completada durante una escritura se invalida al terminar', async () => {
  const h = harness();
  const write = h.context.apiRequest('/api/admin/inventario/123', { method: 'PUT' });
  const read = h.context.apiRequest('/api/admin/inventario');
  finish(h.calls[1], ['intermedio']); await read;
  finish(h.calls[0], {}); await write;
  assert.equal(h.cache.size, 0);
});
test('errores liberan la solicitud y metricas no incluyen identificadores ni cuerpos', async () => {
  const h = harness();
  const failed = h.context.apiRequest('/api/admin/inventario/privado?contacto=secreto');
  finish(h.calls[0], { error: 'sin permiso' }, 403);
  await assert.rejects(failed);
  const retry = h.context.apiRequest('/api/admin/inventario/privado?contacto=secreto');
  finish(h.calls[1]); await retry;
  assert.equal(h.calls.length, 2);
  assert.equal(h.metrics.snapshot()[0].resource, '/api/admin/inventario');
  assert.equal(JSON.stringify(h.metrics.snapshot()).includes('secreto'), false);
});
