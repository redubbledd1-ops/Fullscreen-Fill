#!/usr/bin/env node
/**
 * Build loadable extension folders per browser.
 *
 *   node tools/build.js            -> dist/chrome and dist/firefox
 *   node tools/build.js firefox    -> only that target
 *
 * Shared code is copied as-is; the only per-target file is the manifest
 * (manifest.json for Chrome/Edge, manifest.firefox.json for Gecko).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const SHARED = [
  "browser-api.js",
  "background.js",
  "config-client.js",
  "content-generic.js",
  "content-generic.css",
  "i18n.js",
  "popup.html",
  "popup.js",
  "config",
  "icons",
  "_locales",
];

const TARGETS = {
  chrome: { manifest: "manifest.json" },
  firefox: { manifest: "manifest.firefox.json" },
};

function copy(from, to) {
  fs.cpSync(from, to, { recursive: true });
}

function readManifest(file) {
  const raw = fs.readFileSync(path.join(ROOT, file), "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`${file} is not valid JSON: ${err.message}`);
  }
}

/** Every file a manifest points at must exist in the build. */
function manifestFiles(manifest) {
  const files = new Set();
  const add = (value) => {
    if (typeof value === "string" && value && !value.startsWith("__MSG_")) {
      files.add(value);
    }
  };

  add(manifest.action?.default_popup);
  Object.values(manifest.action?.default_icon || {}).forEach(add);
  Object.values(manifest.icons || {}).forEach(add);
  add(manifest.background?.service_worker);
  (manifest.background?.scripts || []).forEach(add);
  for (const entry of manifest.content_scripts || []) {
    (entry.js || []).forEach(add);
    (entry.css || []).forEach(add);
  }
  return [...files];
}

function buildTarget(name) {
  const target = TARGETS[name];
  if (!target) throw new Error(`unknown target: ${name}`);

  const manifest = readManifest(target.manifest);
  const out = path.join(DIST, name);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  for (const item of SHARED) {
    const from = path.join(ROOT, item);
    if (!fs.existsSync(from)) throw new Error(`missing source: ${item}`);
    copy(from, path.join(out, item));
  }

  fs.writeFileSync(
    path.join(out, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8"
  );

  const missing = manifestFiles(manifest).filter(
    (file) => !fs.existsSync(path.join(out, file))
  );
  if (missing.length) {
    throw new Error(`${name}: manifest references missing files: ${missing.join(", ")}`);
  }

  return { out, version: manifest.version };
}

function main() {
  const wanted = process.argv.slice(2);
  const names = wanted.length ? wanted : Object.keys(TARGETS);

  const versions = new Set(
    Object.values(TARGETS).map((t) => readManifest(t.manifest).version)
  );
  if (versions.size > 1) {
    throw new Error(
      `manifest versions differ (${[...versions].join(", ")}) — keep them in sync`
    );
  }

  for (const name of names) {
    const { out, version } = buildTarget(name);
    console.log(`${name} v${version} -> ${path.relative(ROOT, out)}`);
  }
}

try {
  main();
} catch (err) {
  console.error(`build failed: ${err.message}`);
  process.exit(1);
}
