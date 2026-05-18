import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type {
  TaskConfig,
  TaskModule,
  ToolResult
} from "../types.js";

type TaskToPromptInput = {
  task: string;
  out?: string;
};

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

function defaultOutputPath(taskPath: string): string {
  const resolved = resolve(taskPath);
  return join(dirname(resolved), "task_parser_prompt.txt");
}

function formatModule(module: TaskModule, index: number): string {
  const details = Object.entries(module)
    .filter(([key]) => key !== "name")
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`);

  return [
    `${index + 1}. module: ${module.name}`,
    ...details.map((item) => `   - ${item}`)
  ].join("\n");
}

function buildPrompt(task: TaskConfig): string {
  const moduleBlock = task.required_modules.map(formatModule).join("\n");
  const runtimeBlock = task.runtime_verify
    ? [
        `serial_port: ${task.runtime_verify.serial_port ?? "unknown"}`,
        `baud_rate: ${task.runtime_verify.baud_rate ?? "unknown"}`,
        `timeout_s: ${task.runtime_verify.timeout_s ?? "unknown"}`,
        `expect_keywords: ${task.runtime_verify.expect_keywords?.join(", ") ?? "none"}`
      ].join("\n")
    : "not set";

  return [
    "You are an STM32 embedded systems architect.",
    "",
    "Your job is not to directly write final firmware files. Your job is to convert the task below into a structured engineering decision output that a local STM32 agent can consume.",
    "",
    "Output rules:",
    "1. Output valid JSON only.",
    "2. Do not output markdown, code fences, or explanation text outside JSON.",
    "3. Keep field names exactly as requested below.",
    "4. If a parameter is unknown and cannot be safely inferred, use \"unknown\".",
    "5. If you infer a default, record it in assumptions.",
    "",
    "Required JSON fields:",
    "{",
    "  \"task_type\": \"\",",
    "  \"target_object\": \"\",",
    "  \"recommended_skills\": [],",
    "  \"code_generation_plan\": {",
    "    \"main_file_strategy\": \"\",",
    "    \"init_blocks\": [],",
    "    \"loop_blocks\": [],",
    "    \"interrupt_blocks\": []",
    "  },",
    "  \"parameter_suggestions\": {},",
    "  \"assumptions\": [],",
    "  \"unknowns\": [],",
    "  \"runtime_validation\": {",
    "    \"method\": \"\",",
    "    \"expectation\": \"\"",
    "  },",
    "  \"design_rationale\": {",
    "    \"overall_strategy\": \"\",",
    "    \"key_decisions\": []",
    "  }",
    "}",
    "",
    "Task input:",
    `task_name: ${task.task_name}`,
    `description: ${task.description ?? "not set"}`,
    `board: ${task.board ?? "unknown"}`,
    `mcu: ${task.mcu}`,
    `toolchain.type: ${task.toolchain.type}`,
    `toolchain.uv4_path: ${task.toolchain.uv4_path ?? "unknown"}`,
    `toolchain.project_path: ${task.toolchain.project_path ?? "unknown"}`,
    `toolchain.target_name: ${task.toolchain.target_name ?? "unknown"}`,
    `reference_files: ${task.reference_files?.join(", ") ?? "none"}`,
    "",
    "required_modules:",
    moduleBlock,
    "",
    "runtime_verify:",
    runtimeBlock
  ].join("\n");
}

export function runTaskToPrompt(input: TaskToPromptInput): ToolResult {
  const text = readFileSync(input.task, "utf8");
  const task = normalizeTaskConfig(JSON.parse(text) as unknown);
  const outputPath = resolve(input.out ?? defaultOutputPath(input.task));
  const prompt = buildPrompt(task);

  writeFileSync(outputPath, `${prompt}\n`, "utf8");

  return {
    title: "Task Prompt Generated",
    body: [
      `Task: ${resolve(input.task)}`,
      `Output: ${outputPath}`,
      `Task name: ${task.task_name}`,
      `MCU: ${task.mcu}`,
      `Modules: ${task.required_modules.length}`,
      "Status: generated"
    ].join("\n")
  };
}
