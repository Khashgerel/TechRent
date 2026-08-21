// Fails if the mn and en catalogs drift apart. Run via `npm run check:messages`.
import { readFileSync } from "node:fs";

const load = (l) =>
  JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf8"));

const keys = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === "object" && v !== null ? [key, ...keys(v, key)] : [key];
  });

const mn = new Set(keys(load("mn")));
const en = new Set(keys(load("en")));

const missingEn = [...mn].filter((k) => !en.has(k));
const missingMn = [...en].filter((k) => !mn.has(k));

if (missingEn.length || missingMn.length) {
  if (missingEn.length) console.error("Missing in en.json:\n  " + missingEn.join("\n  "));
  if (missingMn.length) console.error("Missing in mn.json:\n  " + missingMn.join("\n  "));
  process.exit(1);
}

console.log(`Message catalogs in sync (${mn.size} keys).`);
