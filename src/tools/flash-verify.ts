import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import type { FlashVerifyConfig, FlashVerifyInput, ToolResult } from "../types.js";

const DEFAULT_PYTHON =
  "D:/MentorGraphics/PADSProVX.2.7/SDD_HOME/hyperlynx64/EM/nWaveHL/Scripting/python.exe";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }

  return value.trim();
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeFlashVerifyConfig(raw: unknown): FlashVerifyConfig {
  if (!isObject(raw)) {
    throw new Error("Flash verify config must be a JSON object");
  }

  if (!isObject(raw.build)) {
    throw new Error("build is required and must be an object");
  }

  const config: FlashVerifyConfig = {
    project_name: asOptionalString(raw.project_name),
    board: asOptionalString(raw.board),
    mcu: asOptionalString(raw.mcu),
    build: {
      tool: asString(raw.build.tool, "build.tool"),
      uv4_path: asString(raw.build.uv4_path, "build.uv4_path"),
      project_path: asString(raw.build.project_path, "build.project_path"),
      target_name: asString(raw.build.target_name, "build.target_name")
    }
  };

  if (isObject(raw.flash)) {
    config.flash = {
      tool: asOptionalString(raw.flash.tool),
      use_keil_download: asOptionalBoolean(raw.flash.use_keil_download),
      project_path: asOptionalString(raw.flash.project_path),
      target_name: asOptionalString(raw.flash.target_name)
    };
  }

  if (isObject(raw.verify_runtime)) {
    config.verify_runtime = {
      method: asOptionalString(raw.verify_runtime.method),
      port: asOptionalString(raw.verify_runtime.port),
      baudrate: asOptionalNumber(raw.verify_runtime.baudrate),
      expect_text: asOptionalString(raw.verify_runtime.expect_text)
    };
  }

  return config;
}

function selectPython(input: FlashVerifyInput): string {
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

function buildCommand(python: string, script: string, configPath: string): string {
  return `"${python}" "${script}" --config "${configPath}"`;
}

function tailLines(text: string, count: number): string {
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines.slice(-count).join("\n");
}

function tryReadText(path: string, tailCount = 40): string | undefined {
  if (!existsSync(path)) {
    return undefined;
  }

  try {
    return tailLines(readFileSync(path, "utf8"), tailCount);
  } catch {
    return undefined;
  }
}

function tryReadJson(path: string): unknown {
  if (!existsSync(path)) {
    return undefined;
  }

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

function summarizeLegacyArtifacts(scriptDir: string): string[] {
  const buildLog = join(scriptDir, "build_log.txt");
  const flashLog = join(scriptDir, "flash_log.txt");
  const compileFail = join(scriptDir, "compile_fail.json");
  const flashFail = join(scriptDir, "flash_fail.json");
  const buildLogHtm = join(scriptDir, "build_log_htm.txt");

  const lines = [
    `Artifact build_log: ${existsSync(buildLog) ? buildLog : "not found"}`,
    `Artifact flash_log: ${existsSync(flashLog) ? flashLog : "not found"}`,
    `Artifact compile_fail: ${existsSync(compileFail) ? compileFail : "not found"}`,
    `Artifact flash_fail: ${existsSync(flashFail) ? flashFail : "not found"}`,
    `Artifact build_log_htm: ${existsSync(buildLogHtm) ? buildLogHtm : "not found"}`
  ];

  const compileFailJson = tryReadJson(compileFail);
  const flashFailJson = tryReadJson(flashFail);
  const buildTail = tryReadText(buildLog, 30);
  const flashTail = tryReadText(flashLog, 30);

  if (compileFailJson) {
    lines.push("");
    lines.push("compile_fail.json:");
    lines.push(JSON.stringify(compileFailJson, null, 2));
  }

  if (flashFailJson) {
    lines.push("");
    lines.push("flash_fail.json:");
    lines.push(JSON.stringify(flashFailJson, null, 2));
  }

  if (buildTail) {
    lines.push("");
    lines.push("build_log tail:");
    lines.push(buildTail);
  }

  if (flashTail) {
    lines.push("");
    lines.push("flash_log tail:");
    lines.push(flashTail);
  }

  return lines;
}

function collectLegacyArtifacts(scriptDir: string): Record<string, unknown> {
  const buildLog = join(scriptDir, "build_log.txt");
  const flashLog = join(scriptDir, "flash_log.txt");
  const compileFail = join(scriptDir, "compile_fail.json");
  const flashFail = join(scriptDir, "flash_fail.json");
  const buildLogHtm = join(scriptDir, "build_log_htm.txt");

  return {
    build_log: existsSync(buildLog) ? buildLog : null,
    flash_log: existsSync(flashLog) ? flashLog : null,
    compile_fail: existsSync(compileFail) ? compileFail : null,
    flash_fail: existsSync(flashFail) ? flashFail : null,
    build_log_htm: existsSync(buildLogHtm) ? buildLogHtm : null,
    build_log_tail: tryReadText(buildLog, 30) ?? null,
    flash_log_tail: tryReadText(flashLog, 30) ?? null,
    compile_fail_json: tryReadJson(compileFail) ?? null,
    flash_fail_json: tryReadJson(flashFail) ?? null
  };
}

function defaultReportPath(configPath: string): string {
  const resolved = resolve(configPath);
  return join(dirname(resolved), "flash_verify_result.json");
}

function writeReport(path: string, data: Record<string, unknown>): void {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function runFlashVerify(input: FlashVerifyInput): ToolResult {
  const text = readFileSync(input.config, "utf8");
  const raw = JSON.parse(text) as unknown;
  const config = normalizeFlashVerifyConfig(raw);
  const script = resolve(input.script ?? "D:/sofrware project/AI try/FlashAndVerify.py");
  const scriptDir = dirname(script);
  const python = selectPython(input);
  const command = buildCommand(python, script, input.config);
  const reportPath = resolve(input.report ?? defaultReportPath(input.config));

  const lines = [
    `Config: ${input.config}`,
    `Script: ${script}`,
    `Python: ${python}`,
    `Report: ${reportPath}`,
    `Project: ${config.project_name ?? "unknown"}`,
    `Board: ${config.board ?? "unknown"}`,
    `MCU: ${config.mcu ?? "unknown"}`,
    `Build tool: ${config.build.tool}`,
    `UV4: ${config.build.uv4_path}`,
    `Build project: ${config.build.project_path}`,
    `Build target: ${config.build.target_name}`,
    `Flash project: ${config.flash?.project_path ?? config.build.project_path}`,
    `Flash target: ${config.flash?.target_name ?? config.build.target_name}`,
    `Runtime verify: ${
      config.verify_runtime
        ? `${config.verify_runtime.method ?? "unknown"} ${config.verify_runtime.port ?? "unknown"} @ ${config.verify_runtime.baudrate ?? "unknown"} expect=${config.verify_runtime.expect_text ?? "unknown"}`
        : "not set"
    }`,
    `Script working directory: ${scriptDir}`,
    `Command: ${command}`
  ];

  if (!input.run) {
    writeReport(reportPath, {
      mode: "dry-run",
      status: "planned",
      config: resolve(input.config),
      script,
      script_workdir: scriptDir,
      report: reportPath,
      project: {
        name: config.project_name ?? null,
        board: config.board ?? null,
        mcu: config.mcu ?? null
      },
      build: config.build,
      flash: config.flash ?? null,
      verify_runtime: config.verify_runtime ?? null,
      command
    });
    lines.push("Mode: dry-run");
    lines.push("Report status: written");
    return {
      title: "Flash Verify Plan",
      body: lines.join("\n")
    };
  }

  const result = spawnSync(python, [script, "--config", input.config], {
    encoding: "utf8",
    windowsHide: true,
    cwd: scriptDir
  });

  lines.push(`Mode: execute`);
  lines.push(`Return code: ${result.status ?? -1}`);
  lines.push(`Status: ${result.status === 0 ? "success" : "failed"}`);
  if (result.stdout?.trim()) {
    lines.push("");
    lines.push("STDOUT:");
    lines.push(result.stdout.trim());
  }
  if (result.stderr?.trim()) {
    lines.push("");
    lines.push("STDERR:");
    lines.push(result.stderr.trim());
  }
  const artifacts = collectLegacyArtifacts(scriptDir);
  lines.push("");
  lines.push(...summarizeLegacyArtifacts(scriptDir));
  writeReport(reportPath, {
    mode: "execute",
    status: result.status === 0 ? "success" : "failed",
    return_code: result.status ?? -1,
    config: resolve(input.config),
    script,
    script_workdir: scriptDir,
    report: reportPath,
    project: {
      name: config.project_name ?? null,
      board: config.board ?? null,
      mcu: config.mcu ?? null
    },
    build: config.build,
    flash: config.flash ?? null,
    verify_runtime: config.verify_runtime ?? null,
    command,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    artifacts
  });
  lines.push("");
  lines.push(`Report status: written to ${reportPath}`);

  return {
    title: "Flash Verify Result",
    body: lines.join("\n")
  };
}
