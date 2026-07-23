const fs = require("node:fs/promises");
const path = require("node:path");

const OPEN_RENEWAL_STATUSES = ["pendiente_aviso", "avisado", "comprobante_recibido", "pagado"];

function isOpenRenewalStatus(status) {
  return OPEN_RENEWAL_STATUSES.includes(String(status || "").trim());
}

function hasOpenRenewalDuplicate(renewals, renewal, currentRenewalId = "") {
  const inventoryId = String(renewal.inventario_id || "").trim();

  if (!inventoryId || !isOpenRenewalStatus(renewal.estado)) {
    return null;
  }

  return renewals.find(
    (entry) =>
      String(entry.renovacion_id || "").trim() !== String(currentRenewalId || "").trim() &&
      String(entry.inventario_id || "").trim() === inventoryId &&
      isOpenRenewalStatus(entry.estado)
  );
}

class JsonRenewalStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath || "renovaciones.json");
    this.queue = Promise.resolve();
  }

  enqueue(operation) {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => {});
    return next;
  }

  async readRenewals() {
    try {
      const text = await fs.readFile(this.filePath, "utf8");
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async writeRenewals(renewals) {
    await fs.writeFile(this.filePath, `${JSON.stringify(renewals, null, 2)}\n`, "utf8");
    return renewals;
  }

  async listRenewals() {
    return this.readRenewals();
  }

  async createRenewal(renewal) {
    return this.enqueue(async () => {
      const renewals = await this.readRenewals();

      if (renewals.some((entry) => entry.renovacion_id === renewal.renovacion_id)) {
        const error = new Error("Ya existe una renovacion con ese ID.");
        error.statusCode = 409;
        throw error;
      }

      const duplicate = hasOpenRenewalDuplicate(renewals, renewal);

      if (duplicate) {
        const error = new Error(
          `Ya existe una renovacion abierta para esta cuenta (${duplicate.renovacion_id}). Finaliza o cancela la renovacion existente antes de crear otra.`
        );
        error.statusCode = 409;
        throw error;
      }

      renewals.push(renewal);
      await this.writeRenewals(renewals);
      return renewal;
    });
  }

  async updateRenewal(id, patch) {
    return this.enqueue(async () => {
      const renewals = await this.readRenewals();
      const index = renewals.findIndex((entry) => entry.renovacion_id === id);

      if (index < 0) {
        const error = new Error("Renovacion no encontrada.");
        error.statusCode = 404;
        throw error;
      }

      renewals[index] = {
        ...renewals[index],
        ...patch,
        renovacion_id: renewals[index].renovacion_id,
      };

      const duplicate = hasOpenRenewalDuplicate(renewals, renewals[index], renewals[index].renovacion_id);

      if (duplicate) {
        const error = new Error(
          `Ya existe una renovacion abierta para esta cuenta (${duplicate.renovacion_id}). Finaliza o cancela la renovacion existente antes de crear otra.`
        );
        error.statusCode = 409;
        throw error;
      }

      await this.writeRenewals(renewals);
      return renewals[index];
    });
  }

  async submitProof(id, proof) {
    return this.updateRenewal(id, {
      comprobante_referencia: proof.comprobante_referencia || proof.comprobante_archivo?.nombre || "",
      comprobante_notas: [proof.comprobante_notas, proof.comprobante_archivo ? `Archivo recibido localmente: ${proof.comprobante_archivo.nombre}` : ""]
        .filter(Boolean)
        .join(" | "),
      estado: "comprobante_recibido",
    });
  }
}

module.exports = JsonRenewalStore;
