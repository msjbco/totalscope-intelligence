import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const bundled = "C:\\Users\\msjbc\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const python = process.env.PYTHON ?? (existsSync(bundled) ? bundled : "python");
const command = process.argv[2] ?? "inspect";
const result = spawnSync(python, ["scripts/q2_2026_import.py", command, ...process.argv.slice(3)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});
process.exit(result.status ?? 1);
