import { readFileSync } from "node:fs";
import type { TaskConfig, TaskModule, TaskParseInput, ToolResult } from "../types.js";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return items.length > 0 ? items : undefined;
}

function normalizeModule(value: unknown, index: number): TaskModule {
  if (!isObject(value)) {
    throw new Error(`required_modules[${index}] must be an object`);
  }

  const name = asString(value.name);
  if (!name) {
    throw new Error(`required_modules[${index}].name is required`);
  }

  const module: TaskModule = { name };
  for (const [key, raw] of Object.entries(value)) {
    if (key === "name" || raw === null || raw === undefined) {
      continue;
    }
    if (
      typeof raw === "string" ||
      typeof raw === "number" ||
      typeof raw === "boolean" ||
      (Array.isArray(raw) && raw.every((item) => typeof item === "string" || typeof item === "number"))
    ) {
      module[key] = raw as TaskModule[string];
    }
  }

  return module;
}

function normalizeTaskConfig(raw: unknown): TaskConfig {
  if (!isObject(raw)) {
    throw new Error("Task file must be a JSON object");
  }

  const taskName = asString(raw.task_name);
  const mcu = asString(raw.mcu);
  const board = asString(raw.board);

  if (!taskName) {
    throw new Error("task_name is required");
  }

  if (!mcu) {
    throw new Error("mcu is required");
  }

  if (!isObject(raw.toolchain)) {
    throw new Error("toolchain is required and must be an object");
  }

  const toolchainType = asString(raw.toolchain.type);
  if (!toolchainType) {
    throw new Error("toolchain.type is required");
  }

  if (!Array.isArray(raw.required_modules)) {
    throw new Error("required_modules is required and must be an array");
  }

  const requiredModules = raw.required_modules.map((item, index) => normalizeModule(item, index));

  let runtimeVerify;
  if (isObject(raw.runtime_verify)) {
    runtimeVerify = {
      serial_port: asString(raw.runtime_verify.serial_port),
      baud_rate: asNumber(raw.runtime_verify.baud_rate),
      timeout_s: asNumber(raw.runtime_verify.timeout_s),
      expect_keywords: asStringArray(raw.runtime_verify.expect_keywords)
    };
  }

  return {
    task_name: taskName,
    description: asString(raw.description),
    board,
    mcu,
    toolchain: {
      type: toolchainType,
      uv4_path: asString(raw.toolchain.uv4_path),
      project_path: asString(raw.toolchain.project_path),
      target_name: asString(raw.toolchain.target_name)
    },
    required_modules: requiredModules,
    runtime_verify: runtimeVerify,
    reference_files: asStringArray(raw.reference_files)
  };
}

function formatModule(module: TaskModule, index: number): string {
  const detailParts = Object.entries(module)
    .filter(([key]) => key !== "name")
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join("/") : String(value)}`);

  return `${index + 1}. ${module.name}${detailParts.length > 0 ? ` (${detailParts.join(", ")})` : ""}`;
}

export function runTaskParse(input: TaskParseInput): ToolResult {
  const text = readFileSync(input.file, "utf8");
  const raw = JSON.parse(text) as unknown;
  const task = normalizeTaskConfig(raw);

  const lines = [
    `File: ${input.file}`,
    `Task: ${task.task_name}`,
    `Description: ${task.description ?? "not set"}`,
    `MCU: ${task.mcu}`,
    `Board: ${task.board ?? "unknown"}`,
    `Toolchain: ${task.toolchain.type}`,
    `Project path: ${task.toolchain.project_path ?? "not set"}`,
    `Target: ${task.toolchain.target_name ?? "not set"}`,
    `Reference files (${task.reference_files?.length ?? 0}): ${task.reference_files?.join(", ") ?? "none"}`,
    `Required modules (${task.required_modules.length}):`,
    ...task.required_modules.map(formatModule),
    `Runtime verify: ${
      task.runtime_verify
        ? `${task.runtime_verify.serial_port ?? "unknown"} @ ${task.runtime_verify.baud_rate ?? "unknown"} baud, keywords=${task.runtime_verify.expect_keywords?.join("/") ?? "none"}`
        : "not set"
    }`
  ];

  return {
    title: "Task Parse Result",
    body: lines.join("\n")
  };
}
