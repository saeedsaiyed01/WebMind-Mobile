const sharp = require("sharp");
const fs = require("node:fs");
const path = require("node:path");
const assets = path.join(__dirname, "..", "assets");
const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><circle cx="512" cy="512" r="300" fill="#F0EEEB"/><g fill="none" stroke="#2C2C2C" stroke-width="14"><ellipse cx="512" cy="512" rx="110" ry="222" transform="rotate(30 512 512)"/><ellipse cx="512" cy="512" rx="110" ry="222" transform="rotate(-30 512 512)"/></g><path d="M512 442L530 489L580 512L530 532L512 582L492 532L444 512L492 489Z" fill="#2C2C2C"/></svg>`;
async function main() {
  fs.writeFileSync(path.join(assets, "mark.svg"), mark);
  await sharp(Buffer.from(mark))
    .png()
    .toFile(path.join(assets, "adaptive-icon.png"));
  await sharp(
    Buffer.from(
      mark.replace(
        "<circle",
        '<rect width="1024" height="1024" rx="220" fill="#F8F7F5"/><circle',
      ),
    ),
  )
    .png()
    .toFile(path.join(assets, "icon.png"));
  await sharp(Buffer.from(mark))
    .resize(256)
    .png()
    .toFile(path.join(assets, "splash-icon.png"));
  await sharp(Buffer.from(mark))
    .resize(64)
    .png()
    .toFile(path.join(assets, "favicon.png"));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
