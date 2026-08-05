const fs = require("node:fs/promises");
const path = require("node:path");
const CleanCSS = require("clean-css");
const { minify } = require("terser");

const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const distDir = path.join(publicDir, "dist");

const jsTargets = ["script.js", "login.js", "admin.js"];
const cssTargets = ["styles.css"];

function formatBytes(value) {
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${value} B`;
}

async function writeMinifiedCss(fileName) {
  const sourcePath = path.join(publicDir, fileName);
  const outputPath = path.join(distDir, fileName);
  const source = await fs.readFile(sourcePath, "utf8");
  const result = new CleanCSS({
    level: 2,
    returnPromise: false,
  }).minify(source);

  if (result.errors.length > 0) {
    throw new Error(`No se pudo minificar ${fileName}: ${result.errors.join("; ")}`);
  }

  await fs.writeFile(outputPath, `${result.styles}\n`, "utf8");
  console.log(`${fileName}: ${formatBytes(Buffer.byteLength(source))} a ${formatBytes(Buffer.byteLength(result.styles))}`);
}

async function writeMinifiedJs(fileName) {
  const sourcePath = path.join(publicDir, fileName);
  const outputPath = path.join(distDir, fileName);
  const source = await fs.readFile(sourcePath, "utf8");
  const result = await minify(source, {
    compress: {
      passes: 2,
    },
    mangle: true,
    output: {
      comments: false,
    },
  });

  if (result.error) {
    throw result.error;
  }

  await fs.writeFile(outputPath, `${result.code || ""}\n`, "utf8");
  console.log(`${fileName}: ${formatBytes(Buffer.byteLength(source))} a ${formatBytes(Buffer.byteLength(result.code || ""))}`);
}

async function main() {
  await fs.mkdir(distDir, { recursive: true });

  for (const fileName of cssTargets) {
    await writeMinifiedCss(fileName);
  }

  for (const fileName of jsTargets) {
    await writeMinifiedJs(fileName);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
