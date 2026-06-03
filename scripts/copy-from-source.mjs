import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = "C:\\Users\\user1\\call-center-panel";
const dest = path.resolve(__dirname, "..");
const skipDirs = new Set(["node_modules", ".next", ".git"]);
const preserve = [".env", "docker-compose.yml", "BASLAT.ps1"];
const backup = {};

for (const f of preserve) {
  const p = path.join(dest, f);
  if (fs.existsSync(p)) backup[f] = fs.readFileSync(p, "utf8");
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (skipDirs.has(name)) continue;
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

const srcFiles = walk(src);
let copied = 0;
for (const file of srcFiles) {
  const rel = path.relative(src, file);
  const target = path.join(dest, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(file, target);
  copied++;
}

for (const [f, content] of Object.entries(backup)) {
  fs.writeFileSync(path.join(dest, f), content);
}

const destPkg = path.join(dest, "package.json");
const srcPkg = JSON.parse(fs.readFileSync(path.join(src, "package.json"), "utf8"));
if (fs.existsSync(destPkg)) {
  const local = JSON.parse(fs.readFileSync(destPkg, "utf8"));
  srcPkg.name = local.name ?? srcPkg.name;
  if (local.scripts?.dev) srcPkg.scripts.dev = local.scripts.dev;
}
fs.writeFileSync(destPkg, JSON.stringify(srcPkg, null, 2) + "\n");

const count = walk(dest).filter((f) => !f.includes(`${path.sep}node_modules${path.sep}`)).length;
console.log(JSON.stringify({ copied, total: count }));
