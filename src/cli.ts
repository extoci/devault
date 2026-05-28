#!/usr/bin/env bun
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { stdin as input, stdout as output } from "node:process";

type Config = {
  version: 1;
  projects: Record<string, { command: string; root: string }>;
};

const noPrompt = process.env.D_NO_PROMPT === "1";
const cwd = resolve(process.cwd());
const configPath = join(homedir(), ".config", "devault", "config.json");
const suspicious =
  /\b(rm|dropdb|reset|prune|destroy|delete)\b|\bmigrate\s+reset\b/;

async function main(): Promise<number> {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd) return runDefault();
  if (cmd === "set") return setCommand(args);
  if (cmd === "show") return showCommand();
  if (cmd === "forget") return forgetCommand();
  if (cmd === "list") return listCommands();

  console.error("usage: d [set <command>|show|forget|list]");
  return 1;
}

async function runDefault(): Promise<number> {
  const command = commandFor(cwd);
  if (command) {
    await guard(command, "run");
    return run(cwd, command);
  }

  if (noPrompt) {
    console.error(`d: no command set for ${cwd}`);
    return 1;
  }

  const selected = await askForCommand(cwd);
  if (!selected) return 1;
  await guard(selected, "save and run");
  saveCommand(cwd, selected);
  return run(cwd, selected);
}

async function setCommand(parts: string[]): Promise<number> {
  const command = parts.join(" ").trim();
  if (!command) {
    console.error("usage: d set <command>");
    return 1;
  }

  await guard(command, "save");
  saveCommand(cwd, command);
  console.log(`d: ${cwd} -> ${command}`);
  return 0;
}

function showCommand(): number {
  const command = commandFor(cwd);
  console.log(`d: ${cwd} -> ${command ?? "none"}`);
  return 0;
}

function forgetCommand(): number {
  const config = readConfig();
  const hadCommand = Object.hasOwn(config.projects, cwd);
  delete config.projects[cwd];
  writeConfig(config);
  console.log(hadCommand ? `d: forgot ${cwd}` : `d: nothing saved for ${cwd}`);
  return 0;
}

function listCommands(): number {
  const projects = Object.values(readConfig().projects).sort((a, b) =>
    a.root.localeCompare(b.root),
  );
  if (projects.length === 0) {
    console.log("d: no saved commands");
    return 0;
  }

  for (const project of projects) {
    console.log(`${project.root} -> ${project.command}`);
  }
  return 0;
}

function commandFor(root: string): string | undefined {
  return readConfig().projects[root]?.command;
}

function readConfig(): Config {
  return readJson<Config>(configPath) ?? { version: 1, projects: {} };
}

function readJson<T>(path: string): T | undefined {
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function saveCommand(root: string, command: string): void {
  const config = readConfig();
  config.projects[root] = { command, root };
  writeConfig(config);
}

function writeConfig(config: Config): void {
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

async function askForCommand(root: string): Promise<string | undefined> {
  const [{ createInterface }, { suggestCommands }] = await Promise.all([
    import("node:readline/promises"),
    import("./suggest.js"),
  ]);
  const suggestions = await suggestCommands(root);
  const rl = createInterface({ input, output });

  try {
    console.log(`d: no command set for ${root}`);
    suggestions.forEach((command, index) =>
      console.log(`${index + 1}. ${command}`),
    );
    console.log(`${suggestions.length + 1}. custom`);

    const answer = (await rl.question("command: ")).trim();
    const choice = Number(answer);
    if (Number.isInteger(choice) && choice >= 1 && choice <= suggestions.length)
      return suggestions[choice - 1];

    if (choice === suggestions.length + 1 || answer === "") {
      const custom = (await rl.question("custom: ")).trim();
      return custom || undefined;
    }

    return answer;
  } finally {
    rl.close();
  }
}

async function guard(command: string, action: string): Promise<void> {
  if (!suspicious.test(command)) return;
  if (noPrompt)
    throw new Error(`refusing to ${action} suspicious command: ${command}`);

  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input, output });
  try {
    const answer = (
      await rl.question(
        `d: suspicious command, ${action} anyway? ${command} [y/N] `,
      )
    ).trim();
    if (!/^y(es)?$/i.test(answer)) throw new Error("cancelled");
  } finally {
    rl.close();
  }
}

function run(root: string, command: string): Promise<number> {
  setTerminalTitle(root, command);
  console.log(`d: ${root} -> ${command}`);

  return new Promise((resolveCode) => {
    const child = spawn(command, { cwd: root, shell: true, stdio: "inherit" });
    child.on("error", (error) => {
      console.error(`d: failed to run command: ${error.message}`);
      resolveCode(1);
    });
    child.on("close", (code, signal) => {
      if (signal) {
        console.error(`d: command stopped by ${signal}`);
        resolveCode(1);
        return;
      }
      resolveCode(code ?? 0);
    });
  });
}

function setTerminalTitle(root: string, command: string): void {
  if (!output.isTTY) return;
  output.write(`\u001b]0;${basename(root) || root} • ${command}\u0007`);
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(
      `d: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
