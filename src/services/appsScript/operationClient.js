class OperationClient {
  constructor(config) { this.config = config; }
  async request(payload, timeoutMs = 30000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    try {
      const response = await fetch(this.config.endpointUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, token: this.config.adminToken }), signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok || data.ok !== true) {
        const error = new Error(data.error || "Apps Script no confirmo la operacion.");
        error.code = data.code || "APPS_SCRIPT_ERROR";
        error.statusCode = data.code === "NOT_FOUND" ? 404 : data.code === "VALIDATION" || data.code === "INVALID_OPERATION" ? 400 :
          ["ALREADY_CONFIRMED", "OPERATION_CONFLICT", "OPERATION_PENDING"].includes(data.code) ? 409 : 502;
        if (/accion no soportada/i.test(error.message)) { error.code = "UNSUPPORTED_ACTION"; error.message = "Actualiza y publica el Apps Script: falta la nueva accion de renovaciones."; }
        throw error;
      }
      return data;
    } catch (cause) {
      if (cause.statusCode) throw cause;
      const error = new Error("No se pudo verificar el resultado. Reintenta la misma operacion; se recuperara sin duplicar el guardado.");
      error.statusCode = cause.name === "AbortError" ? 504 : 502;
      error.code = "RESULT_UNKNOWN";
      throw error;
    } finally {
      clearTimeout(timeout);
      console.info(JSON.stringify({ event: "apps_script_request", action: payload.action,
        operation_id: payload.operation_id || "", duration_ms: Date.now() - started }));
    }
  }
}
module.exports = OperationClient;
