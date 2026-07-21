const fs = require("fs");
const path = require("path");

const funcDir = process.argv[2];
const rootNm = process.argv[3];

// Scan all asset files for bare imports
const assetsDir = path.join(funcDir, "assets");
const bareImports = new Set();
if (fs.existsSync(assetsDir)) {
  for (const f of fs.readdirSync(assetsDir).filter(f => f.endsWith(".js"))) {
    const content = fs.readFileSync(path.join(assetsDir, f), "utf8");
    const re = /import\s+(?:\{[^}]*\}|\w+)\s+from\s+"([a-z@][^"]*)"/g;
    const re2 = /import\s+"([a-z@][^"]*)"/g;
    let m;
    while ((m = re.exec(content)) !== null) bareImports.add(m[1]);
    while ((m = re2.exec(content)) !== null) bareImports.add(m[1]);
  }
}

// Also scan the main server.js
const serverJs = path.join(funcDir, "server.js");
if (fs.existsSync(serverJs)) {
  const content = fs.readFileSync(serverJs, "utf8");
  const re = /from "([a-z@][^"]*)"/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const imp = m[1];
    if (!imp.startsWith("node:") && !imp.startsWith("./") && !imp.startsWith("../")) {
      bareImports.add(imp);
    }
  }
}

// Extract package names (strip subpaths)
const packages = new Set();
for (const imp of bareImports) {
  if (imp.startsWith("node:") || imp.startsWith("./") || imp.startsWith("../")) continue;
  const parts = imp.split("/");
  const pkgName = imp.startsWith("@") ? parts[0] + "/" + parts[1] : parts[0];
  packages.add(pkgName);
}

console.error(`Found ${packages.size} unique packages from ${bareImports.size} bare imports`);

// Resolve transitive dependencies
const queue = [...packages];
const allDeps = new Set(packages);

while (queue.length > 0) {
  const pkg = queue.shift();
  const pkgJsonPath = path.join(rootNm, pkg, "package.json");
  if (fs.existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    const deps = { ...(pkgJson.dependencies || {}), ...(pkgJson.peerDependencies || {}) };
    for (const dep of Object.keys(deps)) {
      if (!allDeps.has(dep)) {
        allDeps.add(dep);
        queue.push(dep);
      }
    }
  }
}

console.error(`With transitive deps: ${allDeps.size} packages`);

// Copy packages from root node_modules to function node_modules
const destNm = path.join(funcDir, "node_modules");
let copiedCount = 0;
for (const pkg of allDeps) {
  const src = path.join(rootNm, pkg);
  const dest = path.join(destNm, pkg);
  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    const parent = path.dirname(dest);
    fs.mkdirSync(parent, { recursive: true });
    fs.cpSync(src, dest, { recursive: true, force: true });
    copiedCount++;
  }
}

console.error(`Copied ${copiedCount} new packages to function node_modules`);

// Calculate total size
let totalSize = 0;
if (fs.existsSync(destNm)) {
  for (const f of fs.readdirSync(destNm, { recursive: true, withFileTypes: true })) {
    if (f.isFile()) {
      totalSize += fs.statSync(path.join(f.parentPath, f.name)).size;
    }
  }
}
console.log(JSON.stringify({ packages: allDeps.size, copied: copiedCount, sizeMB: +(totalSize/1024/1024).toFixed(2) }));
