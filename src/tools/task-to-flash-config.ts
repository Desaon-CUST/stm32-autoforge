import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type {
  FlashVerifyConfig,
  TaskConfig,
  TaskModule,
  TaskToFlashConfigInput,
  ToolResult
} from "../types.js";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
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
    runtime_verify: isObject(raw.runtime_verify)
      ? {
          serial_port: asString(raw.runtime_verify.serial_port),
          baud_rate: asNumber(raw.runtime_verify.baud_rate),
          timeout_s: asNumber(raw.runtime_verify.timeout_s),
          expect_keywords: asStringArray(raw.runtime_verify.expect_keywords)
        }
      : undefined,
    reference_files: asStringArray(raw.reference_files)
  };
}

function inferRuntimeOutput(modules: TaskModule[]): string | undefined {
  for (const module of modules) {
    const runtimeOutput = module.runtime_output;
    if (typeof runtimeOutput === "string" && runtimeOutput.trim().length > 0) {
      return runtimeOutput.trim();
    }
  }

  return undefined;
}

function defaultOutputPath(taskPath: string): string {
  const resolved = resolve(taskPath);
  return join(dirname(resolved), "generated.flash_verify.json");
}

function buildFlashConfig(task: TaskConfig): FlashVerifyConfig {
  const expectText =
    task.runtime_verify?.expect_keywords?.[0] ??
    inferRuntimeOutput(task.required_modules) ??
    "OK";

  return {
    project_name: task.task_name,
    board: task.board,
    mcu: task.mcu,
    build: {
      tool: task.toolchain.type,
      uv4_path: task.toolchain.uv4_path ?? "unknown",
      project_path: task.toolchain.project_path ?? "unknown",
      target_name: task.toolchain.target_name ?? "unknown"
    },
    flash: {
      tool: task.toolchain.type,
      use_keil_download: task.toolchain.type === "keil_uv4",
      project_path: task.toolchain.project_path,
      target_name: task.toolchain.target_name
    },
    verify_runtime: task.runtime_verify
      ? {
          method: "uart",
          port: task.runtime_verify.serial_port,
          baudrate: task.runtime_verify.baud_rate,
          expect_text: expectText
        }
      : undefined
  };
}

export function runTaskToFlashConfig(input: TaskToFlashConfigInput): ToolResult {
  const text = readFileSync(input.task, "utf8");
  const task = normalizeTaskConfig(JSON.parse(text) as unknown);
  const config = buildFlashConfig(task);
  const outputPath = resolve(input.out ?? defaultOutputPath(input.task));

  writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  const lines = [
    `Task: ${resolve(input.task)}`,
    `Output: ${outputPath}`,
    `Project: ${config.project_name ?? "unknown"}`,
    `Toolchain: ${config.build.tool}`,
    `Build project: ${config.build.project_path}`,
    `Build target: ${config.build.target_name}`,
    `Runtime verify: ${
      config.verify_runtime
        ? `${config.verify_runtime.port ?? "unknown"} @ ${config.verify_runtime.baudrate ?? "unknown"} expect=${config.verify_runtime.expect_text ?? "unknown"}`
        : "not set"
    }`,
    "Status: generated"
  ];

  return {
    title: "Flash Config Generated",
    body: lines.join("\n")
  };
}
