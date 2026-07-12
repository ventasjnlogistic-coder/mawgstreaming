const { google } = require("googleapis");

const HEADERS = ["id", "nombre", "tipo", "precio", "descripcion", "imagen", "estado", "categoria", "badge", "cta", "componentes"];

function normalizePrivateKey(value) {
  return value ? value.replace(/\\n/g, "\n") : "";
}

function rowToProduct(row) {
  return HEADERS.reduce((product, key, index) => {
    const value = row[index] ?? "";
    if (key === "precio") {
      product[key] = value !== "" && Number.isFinite(Number(value)) ? Number(value) : value;
    } else if (key === "componentes") {
      try {
        const parsed = JSON.parse(value || "[]");
        product[key] = Array.isArray(parsed) ? parsed : [];
      } catch {
        product[key] = [];
      }
    } else {
      product[key] = value;
    }
    return product;
  }, {});
}

function productToRow(product) {
  return HEADERS.map((key) => {
    if (key === "componentes") {
      return Array.isArray(product.componentes) && product.componentes.length ? JSON.stringify(product.componentes) : "";
    }

    return product[key] ?? "";
  });
}

class GoogleSheetsCatalogStore {
  constructor(config) {
    this.spreadsheetId = config.spreadsheetId;
    this.range = config.range || "Productos!A:K";
    this.auth = new google.auth.JWT({
      email: config.clientEmail,
      key: normalizePrivateKey(config.privateKey),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    this.sheets = google.sheets({ version: "v4", auth: this.auth });
  }

  async listProducts() {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: this.range,
    });

    const rows = response.data.values || [];
    const dataRows = rows[0]?.[0] === "id" ? rows.slice(1) : rows;
    return dataRows.filter((row) => row.some(Boolean)).map(rowToProduct);
  }

  async saveProducts(products) {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: this.range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [HEADERS, ...products.map(productToRow)],
      },
    });

    return products;
  }
}

module.exports = GoogleSheetsCatalogStore;
