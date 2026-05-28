import { readdir, readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import { join } from "node:path";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const preferredScripts = ["dev", "start", "serve", "watch"];

export async function suggestCommands(root: string): Promise<string[]> {
  const suggestions = new Set<string>();
  await addNodeSuggestions(root, suggestions);
  await addGenericSuggestions(root, suggestions);
  return [...suggestions];
}

async function addNodeSuggestions(root: string, suggestions: Set<string>): Promise<void> {
  const packageJsonPath = join(root, "package.json");
  if (!(await exists(packageJsonPath))) return;

  const packageManager = await detectPackageManager(root);
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };

  for (const script of preferredScripts) {
    if (packageJson.scripts?.[script]) {
      suggestions.add(packageManager === "npm" ? `npm run ${script}` : `${packageManager} ${script}`);
    }
  }
}

async function detectPackageManager(root: string): Promise<"bun" | "pnpm" | "yarn" | "npm"> {
  if ((await exists(join(root, "bun.lock"))) || (await exists(join(root, "bun.lockb")))) return "bun";
  if (await exists(join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (await exists(join(root, "yarn.lock"))) return "yarn";
  if (await exists(join(root, "package-lock.json"))) return "npm";
  return "npm";
}

async function addGenericSuggestions(root: string, suggestions: Set<string>): Promise<void> {
  if (await hasMiseDev(root)) suggestions.add("mise run dev");
  if (await hasMakeDev(root)) suggestions.add("make dev");
  if ((await exists(join(root, "compose.yaml"))) || (await exists(join(root, "docker-compose.yml")))) {
    suggestions.add("docker compose up");
  }
  if (await exists(join(root, "Cargo.toml"))) suggestions.add("cargo run");
  if (await exists(join(root, "go.mod"))) suggestions.add("go run .");
}

async function hasMiseDev(root: string): Promise<boolean> {
  for (const file of ["mise.toml", ".mise.toml"]) {
    const path = join(root, file);
    if ((await exists(path)) && (await readFile(path, "utf8")).includes("[tasks.dev]")) return true;
  }
  return false;
}

async function hasMakeDev(root: string): Promise<boolean> {
  for (const file of ["Makefile", "makefile"]) {
    const path = join(root, file);
    if (!(await exists(path))) continue;
    const contents = await readFile(path, "utf8");
    if (/^dev\s*:/m.test(contents)) return true;
  }
  return false;
}

export async function directoryHasFiles(root: string): Promise<boolean> {
  return (await readdir(root)).length > 0;
}
