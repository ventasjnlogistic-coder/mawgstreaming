const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createRequestMonitoring } = require("../src/http/requestMonitoring");

function createResponse() {
  const response = new EventEmitter();
  response.headers = {};
  response.statusCode = 200;
  response.writableFinished = false;
  response.setHeader = (name, value) => { response.headers[name] = value; };
  return response;
}

test("mide estados y latencia y registra errores con ID sin incluir URL", () => {
  let now = 1000;
  const logs = [];
  const monitoring = createRequestMonitoring({
    slowRequestMs: 100,
    clock: () => now,
    logger: {
      error: (entry) => logs.push(JSON.parse(entry)),
      warn: (entry) => logs.push(JSON.parse(entry)),
    },
  });
  const request = { method: "POST", url: "/api/pedidos?token=no-log" };
  const response = createResponse();
  monitoring.middleware(request, response, () => {});

  assert.match(response.headers["X-Request-Id"], /^[0-9a-f-]{36}$/i);
  assert.equal(monitoring.snapshot().inFlight, 1);
  now += 125;
  response.statusCode = 500;
  response.writableFinished = true;
  response.emit("finish");

  const metrics = monitoring.snapshot();
  assert.equal(metrics.totalRequests, 1);
  assert.equal(metrics.inFlight, 0);
  assert.equal(metrics.serverErrors, 1);
  assert.equal(metrics.slowRequests, 1);
  assert.equal(metrics.statusClasses["5xx"], 1);
  assert.equal(metrics.latencyBuckets.le_500_ms, 1);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].request_id, response.headers["X-Request-Id"]);
  assert.equal(logs[0].event, "http_server_error");
  assert.equal(JSON.stringify(logs[0]).includes("token=no-log"), false);
});

test("cuenta solicitudes canceladas sin dejar inflight atascado", () => {
  const monitoring = createRequestMonitoring({ logger: { warn() {}, error() {} } });
  const response = createResponse();
  monitoring.middleware({ method: "GET" }, response, () => {});
  response.emit("close");

  const metrics = monitoring.snapshot();
  assert.equal(metrics.totalRequests, 1);
  assert.equal(metrics.inFlight, 0);
  assert.equal(metrics.abortedRequests, 1);
  assert.equal(metrics.statusClasses["4xx"], 1);
});
