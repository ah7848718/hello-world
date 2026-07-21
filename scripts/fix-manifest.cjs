const fs = require("fs");
const path = require("path");

const distDir = path.resolve(__dirname, "..", "dist");

function findFiles(dir, pattern) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, pattern));
    } else if (pattern.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// Finds the client entry file: the index-*.js containing hydrateRoot
function findClientEntry(clientAssets) {
  if (!fs.existsSync(clientAssets)) return null;
  const files = fs.readdirSync(clientAssets).filter(f => f.startsWith("index-") && f.endsWith(".js"));
  for (const file of files) {
    const content = fs.readFileSync(path.join(clientAssets, file), "utf-8");
    if (content.includes("hydrateRoot")) {
      return file;
    }
  }
  return null;
}

function patchManifest(manifestPath, expectedSrc) {
  const content = fs.readFileSync(manifestPath, "utf-8");
  // Replace src: "..." or src: '...' in the scripts array
  let newContent = content.replace(
    /(src:\s*['"])[^'"]*(['"])/,
    `$1${expectedSrc}$2`
  );
  // Replace any preloads that look like dev entry paths (/@id/virtual:...)
  // or other stale references
  newContent = newContent.replace(
    /\/@id\/virtual:[^'"]*/g,
    expectedSrc
  );

  if (newContent !== content) {
    fs.writeFileSync(manifestPath, newContent, "utf-8");
    return "patched";
  } else if (content.includes(expectedSrc)) {
    return "correct";
  }
  return "unrecognized";
}

function main() {
  const clientPath = path.resolve(distDir, "client", "assets");
  const entryFile = findClientEntry(clientPath);

  if (!entryFile) {
    console.error("ERROR: Could not find client entry (index-*.js with hydrateRoot) in dist/client/assets/");
    process.exit(1);
  }

  console.log(`Client entry: ${entryFile}`);

  const manifestFiles = findFiles(distDir, /^_tanstack-start-manifest_.*\.js$/);
  if (manifestFiles.length === 0) {
    console.log("No TanStack Start manifests found to patch");
    return;
  }

  const expectedSrc = `/assets/${entryFile}`;
  let patched = 0, correct = 0, failed = 0;

  for (const mf of manifestFiles) {
    const rel = path.relative(distDir, mf);
    switch (patchManifest(mf, expectedSrc)) {
      case "patched":
        console.log(`Patched: ${rel} -> ${expectedSrc}`);
        patched++;
        break;
      case "correct":
        console.log(`OK: ${rel}`);
        correct++;
        break;
      default:
        console.warn(`WARN: ${rel} (format not recognized)`);
        failed++;
    }
  }

  console.log(`Done: ${patched} patched, ${correct} correct, ${failed} failed`);
}

main();
