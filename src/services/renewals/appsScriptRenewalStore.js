class AppsScriptRenewalStore {
  constructor(config) {
    this.endpointUrl = config.endpointUrl;
    this.adminToken = config.adminToken;
    this.timeoutMs = Number(config.timeoutMs || 15000);
    this.fallbackStore = config.fallbackStore || null;
    this.proofDriveFolderId = config.proofDriveFolderId || "";
  }

  createResponseError(response, data) {
    const originalMessage = data.error || `Apps Script respondio con estado ${response.status}.`;
    const message = originalMessage.toLowerCase();
    const error = new Error(
      message.includes("accion no soportada")
        ? "El Apps Script publicado no esta actualizado para renovaciones. Copia scripts/google-apps-script-catalogo.gs en Google Apps Script y publica una nueva version del Web App."
        : originalMessage
    );

    if (message.includes("no encontrad")) {
      error.statusCode = 404;
    } else if (message.includes("ya existe")) {
      error.statusCode = 409;
    } else if (message.includes("token")) {
      error.statusCode = 502;
    } else {
      error.statusCode = response.ok ? 502 : response.status;
    }

    return error;
  }

  async request(payload = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.ok === false) {
        throw this.createResponseError(response, data);
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  withToken(payload) {
    return {
      ...payload,
      token: this.adminToken,
    };
  }

  isUnsupportedActionError(error) {
    return Boolean(error?.message?.toLowerCase().includes("no esta actualizado para renovaciones"));
  }

  canUseFallback(error) {
    const message = String(error?.message || "").toLowerCase();
    return this.isUnsupportedActionError(error) || error?.name === "AbortError" || message.includes("fetch failed");
  }

  async listRenewals() {
    try {
      const data = await this.request(this.withToken({ action: "renewals.list" }));
      return Array.isArray(data.renewals) ? data.renewals : [];
    } catch (error) {
      if (this.fallbackStore && this.canUseFallback(error)) {
        return this.fallbackStore.listRenewals();
      }
      throw error;
    }
  }

  async createRenewal(renewal) {
    try {
      const data = await this.request(this.withToken({ action: "renewals.create", renewal }));
      return data.renewal || renewal;
    } catch (error) {
      if (this.fallbackStore && this.canUseFallback(error)) {
        return this.fallbackStore.createRenewal(renewal);
      }
      throw error;
    }
  }

  async updateRenewal(id, patch) {
    try {
      const data = await this.request(this.withToken({ action: "renewals.update", id, renewal: patch }));
      return data.renewal || patch;
    } catch (error) {
      if (this.fallbackStore && this.canUseFallback(error)) {
        return this.fallbackStore.updateRenewal(id, patch);
      }
      throw error;
    }
  }

  async submitProof(id, proof) {
    try {
      const data = await this.request(
        this.withToken({
          action: "renewals.proof",
          id,
          proof,
          proof_drive_folder_id: this.proofDriveFolderId,
        })
      );
      return data.renewal || proof;
    } catch (error) {
      if (this.fallbackStore && this.canUseFallback(error)) {
        return this.fallbackStore.submitProof(id, proof);
      }
      throw error;
    }
  }
}

module.exports = AppsScriptRenewalStore;
