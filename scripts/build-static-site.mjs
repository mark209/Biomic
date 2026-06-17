import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDir = path.join(root, "static-site");
const outputDir = path.join(root, "static-site-dist");
const portalUrl = process.env.STATIC_PORTAL_URL?.trim() ?? "";

await rm(outputDir, { force: true, recursive: true });
await mkdir(outputDir, { recursive: true });
await cp(sourceDir, outputDir, { recursive: true });

await writeFile(
  path.join(outputDir, "config.js"),
  `window.__PORTAL_BASE_URL__ = ${JSON.stringify(portalUrl)};\n`,
  "utf8"
);

console.log(`Static site built to ${path.relative(root, outputDir)}`);
console.log(portalUrl ? `Portal URL: ${portalUrl}` : "Portal URL: not set; portal links will remain relative.");
