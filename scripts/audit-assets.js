const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const textExtensions = new Set([".css", ".html", ".js", ".json", ".svg", ".txt", ".webmanifest", ".xml"]);
const imageExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);
const textWarnBytes = 180 * 1024;
const imageWarnBytes = 180 * 1024;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return walk(fullPath);
    }

    return fullPath;
  });
}

function formatBytes(value) {
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(2)} MB`;
  }

  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${value} B`;
}

function getAssetType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (textExtensions.has(extension)) {
    return "texto";
  }

  if (imageExtensions.has(extension)) {
    return "imagen";
  }

  return "otro";
}

function auditFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const type = getAssetType(filePath);
  const buffer = fs.readFileSync(filePath);
  const gzipSize = textExtensions.has(extension) ? zlib.gzipSync(buffer, { level: zlib.constants.Z_BEST_SPEED }).length : null;
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, "/");
  const warnings = [];
  const isDistAsset = relativePath.startsWith("public/dist/");

  if (type === "imagen" && buffer.length > imageWarnBytes) {
    warnings.push("optimizar imagen");
  }

  if (type === "texto" && buffer.length > textWarnBytes && !isDistAsset) {
    warnings.push("revisar division/minificacion");
  }

  return {
    path: relativePath,
    type,
    size: buffer.length,
    gzipSize,
    warnings,
  };
}

const assets = walk(publicDir)
  .map(auditFile)
  .sort((left, right) => right.size - left.size);
const webpBaseNames = new Set(
  assets
    .filter((asset) => asset.path.toLowerCase().endsWith(".webp"))
    .map((asset) => path.basename(asset.path).replace(/-\d+\.webp$/i, "").replace(/\.webp$/i, "").toLowerCase())
);

assets.forEach((asset) => {
  const extension = path.extname(asset.path).toLowerCase();
  const baseName = path.basename(asset.path, extension).toLowerCase();

  if ((extension === ".jpg" || extension === ".jpeg" || extension === ".png") && webpBaseNames.has(baseName)) {
    asset.warnings = asset.warnings.filter((warning) => warning !== "optimizar imagen");
  }
});

console.log("Auditoria de assets publicos\n");
console.log("Archivo".padEnd(48), "Tipo".padEnd(8), "Original".padStart(10), "Gzip".padStart(10), "Observacion");
console.log("-".repeat(98));

assets.forEach((asset) => {
  console.log(
    asset.path.padEnd(48),
    asset.type.padEnd(8),
    formatBytes(asset.size).padStart(10),
    (asset.gzipSize === null ? "-" : formatBytes(asset.gzipSize)).padStart(10),
    asset.warnings.join(", ")
  );
});

const total = assets.reduce((sum, asset) => sum + asset.size, 0);
const totalGzipText = assets.reduce((sum, asset) => sum + (asset.gzipSize || 0), 0);
const warnings = assets.filter((asset) => asset.warnings.length > 0);

console.log("-".repeat(98));
console.log(`Total original: ${formatBytes(total)}`);
console.log(`Total gzip texto: ${formatBytes(totalGzipText)}`);

if (warnings.length > 0) {
  console.log("\nPendientes recomendados:");
  warnings.forEach((asset) => {
    console.log(`- ${asset.path}: ${asset.warnings.join(", ")}`);
  });
}
