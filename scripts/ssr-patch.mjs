import { readFile, writeFile } from "node:fs/promises";

const entryPath = "dist/server/index.mjs";

const content = await readFile(entryPath, "utf-8");

const patch = `const _lazy_DfnPGz = defineLazyEventHandler(() => import("./_chunks/renderer-template.mjs"));
async function _ssrHandler(event) {
  try {
    const ssrMod = await (() => {
      const loader = () => import("./_ssr/index.mjs");
      let promise, mod;
      if (mod) return mod;
      if (!promise) promise = loader().then((m) => (mod = m.default || m));
      return promise;
    })();
    const resp = await ssrMod.fetch(event.req);
    if (resp) return resp;
  } catch (e) {
    console.error("SSR failed", e);
  }
  const tmplMod = await (() => {
    const loader = () => import("./_chunks/renderer-template.mjs");
    let promise, mod;
    if (mod) return mod;
    if (!promise) promise = loader().then((m) => (mod = m.default || m));
    return promise;
  })();
  return tmplMod(event);
}`;

const replaced = content.replace(patch, patch);

const final = content.replace(
  `const _lazy_DfnPGz = defineLazyEventHandler(() => import("./_chunks/renderer-template.mjs"));`,
  patch
).replace(
  `const data = { route: "/**", handler: _lazy_DfnPGz };`,
  `const data = { route: "/**", handler: _ssrHandler };`
);

await writeFile(entryPath, final, "utf-8");
console.log("SSR patch v3 applied successfully to", entryPath);
