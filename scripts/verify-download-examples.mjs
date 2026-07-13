import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";

const root = process.cwd();
const htmlRoot = join(root, "html");
const demoRoot = join(htmlRoot, "demos");
const localReference = /<(?:a|img|link|script)\b[^>]*?\s(?:src|href)\s*=\s*["']([^"']+)["']/gi;
const ignoredReference = /^(?:#|data:|javascript:|mailto:|tel:|https?:\/\/|\/\/)/i;

function filesIn(directory, extension) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === extension)
    .map((entry) => join(directory, entry.name));
}

const demoFiles = filesIn(demoRoot, ".html");
assert(demoFiles.length > 0, "Expected downloadable static demos.");

for (const file of demoFiles) {
  const source = readFileSync(file, "utf8");
  const base = /<base\s+href\s*=\s*["']\.\.\/["']/i.test(source) ? htmlRoot : dirname(file);
  for (const match of source.matchAll(localReference)) {
    const reference = match[1].split(/[?#]/, 1)[0];
    if (!reference || reference.endsWith("-") || ignoredReference.test(reference)) continue;
    const target = normalize(resolve(base, reference));
    assert(target.startsWith(htmlRoot), `${file} points outside the download bundle: ${reference}`);
    assert(existsSync(target), `${file} references a missing local asset: ${reference}`);
  }
}

const runtimeRoots = [
  "richtexteditor",
  "html/richtexteditor",
  "server/AspNetCoreBlazorServer/wwwroot/richtexteditor",
  "server/AspNetCoreMvc/wwwroot/richtexteditor",
  "server/AspNetCoreRazor/wwwroot/richtexteditor",
  "server/AspNetFxMvc/richtexteditor",
  "server/AspNetWebForms/richtexteditor",
  "server/PHP/richtexteditor",
  "server/rte-JavaScript/richtexteditor",
  "server/rte-ng-ts/richtexteditor",
  "server/rte-react-js/public/richtexteditor",
  "server/rte-vue-js/public/richtexteditor",
];

for (const runtimeRoot of runtimeRoots) {
  for (const file of ["rte.js", "rte_theme_default.css", "plugins/all_plugins.js"]) {
    assert(existsSync(join(root, runtimeRoot, file)), `Missing ${file} in ${runtimeRoot}`);
  }
}

console.log(`Verified ${demoFiles.length} static demos and ${runtimeRoots.length} runtime copies.`);
