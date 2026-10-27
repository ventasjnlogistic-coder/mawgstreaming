const OperationClient = require("../appsScript/operationClient");
class AppsScriptRenewalStore {
  constructor(config) {
    this.client = new OperationClient(config);
    this.timeoutMs = Number(config.timeoutMs || 15000);
    this.operationTimeoutMs = Number(config.operationTimeoutMs || 30000);
    this.proofDriveFolderId = config.proofDriveFolderId || "";
  }
  request(payload) { return this.client.request(payload, this.timeoutMs); }
  async listRenewals() {
    const data = await this.request({ action: "renewals.list" });
    return Array.isArray(data.renewals) ? data.renewals : [];
  }
  async createRenewal(renewal) {
    return (await this.request({ action: "renewals.create", renewal })).renewal;
  }
  async updateRenewal(id, renewal) {
    return (await this.request({ action: "renewals.update", id, renewal })).renewal;
  }
  async submitProof(id, proof) {
    return (await this.request({ action: "renewals.proof", id, proof, proof_drive_folder_id: this.proofDriveFolderId })).renewal;
  }
  async uploadOperationProof(proof, operationId) {
    const data = await this.client.request({ action: "proof.upload", proof, operation_id: operationId,
      proof_drive_folder_id: this.proofDriveFolderId }, this.operationTimeoutMs);
    if (!data.file?.url) { const error = new Error("No se pudo guardar el comprobante en Drive."); error.statusCode = 502; throw error; }
    return data.file;
  }
  getOperation(operationId) { return this.request({ action: "renewals.operation", operation_id: operationId }); }
  confirmRenewal(id, patch, operationId) {
    return this.client.request({ action: "renewals.confirm", id, patch, operation_id: operationId }, this.operationTimeoutMs);
  }
}
module.exports = AppsScriptRenewalStore;
