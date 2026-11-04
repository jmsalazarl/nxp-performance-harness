import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url);
const ignoredDirectories = new Set([".git", "node_modules", "dist", "reports", "results", ".coverage"]);
const allowedExtensions = new Set([".js", ".mjs", ".ts", ".tsx", ".json", ".yml", ".yaml", ".sh", ".conf", ".md"]);
const rules = [
  { name: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "bearer-token", pattern: /Bearer\s+[A-Za-z0-9._~-]{24,}/i },
  { name: "generic-secret-assignment", pattern: /(?:password|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["'][^<>{}\n]{12,}["']/i },
];

const findings = [];

async function scan(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await scan(path);
      continue;
    }
    const extension = entry.name.includes(".") ? `.${entry.name.split(".").pop()}` : "";
    if (!allowedExtensions.has(extension)) continue;
    const content = await readFile(path, "utf8");
    for (const rule of rules) {
      if (rule.pattern.test(content)) findings.push(`${relative(root.pathname, path)}: ${rule.name}`);
    }
  }
}

await scan(root.pathname);

if (findings.length > 0) {
  console.error("Se detectaron posibles secretos en archivos versionables:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Revision de secretos: sin hallazgos.");
