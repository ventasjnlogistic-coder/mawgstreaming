const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const rootDir = path.join(__dirname, "..");
const imagesDir = path.join(rootDir, "public", "assets", "images");

const targets = [
  {
    source: "LogoMawg.jpeg",
    outputs: [
      { file: "LogoMawg-512.webp", width: 512, quality: 78 },
      { file: "LogoMawg-256.webp", width: 256, quality: 78 },
    ],
  },
  {
    source: "YapeMawg.jpeg",
    outputs: [{ file: "YapeMawg-720.webp", width: 720, quality: 76 }],
  },
  {
    source: "DaleMawg.jpeg",
    outputs: [{ file: "DaleMawg-720.webp", width: 720, quality: 76 }],
  },
];

function formatBytes(value) {
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(2)} MB`;
  }

  return `${(value / 1024).toFixed(1)} KB`;
}

async function optimizeImage(target) {
  const sourcePath = path.join(imagesDir, target.source);
  const sourceStat = await fs.stat(sourcePath);

  for (const output of target.outputs) {
    const outputPath = path.join(imagesDir, output.file);
    await sharp(sourcePath)
      .rotate()
      .resize({
        width: output.width,
        withoutEnlargement: true,
      })
      .webp({
        effort: 6,
        quality: output.quality,
      })
      .toFile(outputPath);

    const outputStat = await fs.stat(outputPath);
    const saved = sourceStat.size - outputStat.size;
    const savedPercent = Math.round((saved / sourceStat.size) * 100);
    console.log(
      `${target.source} -> ${output.file}: ${formatBytes(sourceStat.size)} a ${formatBytes(outputStat.size)} (${savedPercent}% menos)`
    );
  }
}

async function main() {
  for (const target of targets) {
    await optimizeImage(target);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
