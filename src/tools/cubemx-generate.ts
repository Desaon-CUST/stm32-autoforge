import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { CubemxGenerateInput, ToolResult } from "../types.js";

const DEFAULT_GENERATOR =
  "D:/sofrware project/AI try/claude-code-main/claude-code-main/cubemx_uart_f103/generate_from_design_json.py";
const DEFAULT_PYTHON =
  "D:/MentorGraphics/PADSProVX.2.7/SDD_HOME/hyperlynx64/EM/nWaveHL/Scripting/python.exe";

function selectPython(input: CubemxGenerateInput): string {
  if (input.python) {
    return input.python;
  }
  if (process.env.STM32_FULLFLOW_PYTHON) {
    return process.env.STM32_FULLFLOW_PYTHON;
  }
  if (existsSync(DEFAULT_PYTHON)) {
    return DEFAULT_PYTHON;
  }
  return "python";
}

export function runCubemxGenerate(input: CubemxGenerateInput): ToolResult {
  const generator = resolve(DEFAULT_GENERATOR);
  const design = resolve(input.design);
  const python = selectPython(input);
  const args = [python, generator, design];
  const timeoutMs = (input.timeout_s ?? 240) * 1000;

  if (input.out) {
    args.push("--project-path", resolve(input.out));
  }
  if (input.cubemx) {
    args.push("--cubemx", input.cubemx);
  }
  args.push("--timeout", String(input.timeout_s ?? 180));
  if (input.dry_run) {
    args.push("--dry-run");
  }

  const result = spawnSync(args[0], args.slice(1), {
    encoding: "utf8",
    timeout: timeoutMs,
    killSignal: "SIGKILL",
    windowsHide: true
  });

  const lines = [
    `Generator: ${generator}`,
    `Python: ${python}`,
    `Design JSON: ${design}`,
    `Project output: ${input.out ? resolve(input.out) : "(script default)"}`,
    `Mode: ${input.dry_run ? "dry-run" : "execute"}`,
    `Timeout: ${timeoutMs / 1000}s`,
    `Return code: ${result.status ?? -1}`
  ];

  if (result.error) {
    lines.push("", "ERROR:", result.error.message);
    if ((result.error as NodeJS.ErrnoException).code === "ETIMEDOUT") {
      lines.push(`CubeMX generation timed out after ${timeoutMs / 1000} seconds.`);
    }
  }

  if (result.stdout?.trim()) {
    lines.push("", "STDOUT:", result.stdout.trim());
  }
  if (result.stderr?.trim()) {
    lines.push("", "STDERR:", result.stderr.trim());
  }

  return {
    title: "CubeMX Generate Result",
    body: lines.join("\n")
  };
}
