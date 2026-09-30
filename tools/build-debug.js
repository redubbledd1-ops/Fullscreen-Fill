#!/usr/bin/env node
/**
 * Debug build for testing on a device.
 *
 *   node tools/build-debug.js          -> dist/firefox-debug
 *   node tools/build-debug.js chrome   -> dist/chrome-debug
 *
 * Runs the normal build for the target, copies it to <target>-debug and adds
 * tools/debug-diag.js as the last content script. The store build in
 * dist/<target> is left exactly as tools/build.js made it.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const DIAG = "debug-diag.js";

function main() {
  const target = process.argv[2] || "firefox";

  execFileSync(process.execPath, [path.join(__dirname, "build.js"), target], {
    stdio: "inherit",
  });

  const from = path.join(DIST, target);
  const out = path.join(DIST, `${target}-debug`);
  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(from, out, { recursive: true });
  fs.copyFileSync(path.join(__dirname, DIAG), path.join(out, DIAG));

  const manifestPath = path.join(out, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const entry = manifest.content_scripts?.[0];
  if (!entry) throw new Error("manifest has no content_scripts entry");
  entry.js = [...(entry.js || []), DIAG];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  console.log(`${target} debug v${manifest.version} -> ${path.relative(ROOT, out)}`);
}

try {
  main();
} catch (err) {
  console.error(`debug build failed: ${err.message}`);
  process.exit(1);
}
