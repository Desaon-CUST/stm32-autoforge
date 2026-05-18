import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { AiToDesignJsonInput, TaskConfig, TaskModule, ToolResult } from "../types.js";

type AiPlan = {
  parameter_suggestions?: Record<string, unknown>;
  task_type?: string;
  target_object?: string;
  recommended_skills?: string[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return items.length > 0 ? items : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
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

function normalizeTask(raw: unknown): TaskConfig {
  if (!isObject(raw)) {
    throw new Error("Task file must be a JSON object");
  }
  const taskName = asString(raw.task_name);
  const mcu = asString(raw.mcu);
  if (!taskName || !mcu || !isObject(raw.toolchain) || !Array.isArray(raw.required_modules)) {
    throw new Error("Task file is missing required fields");
  }
  return {
    task_name: taskName,
    description: asString(raw.description),
    board: asString(raw.board),
    mcu,
    toolchain: {
      type: asString(raw.toolchain.type) ?? "Makefile",
      uv4_path: asString(raw.toolchain.uv4_path),
      project_path: asString(raw.toolchain.project_path),
      target_name: asString(raw.toolchain.target_name)
    },
    required_modules: raw.required_modules.map((item, index) => normalizeModule(item, index)),
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

function normalizeAi(raw: unknown): AiPlan {
  if (!isObject(raw)) {
    throw new Error("AI result must be a JSON object");
  }
  return {
    parameter_suggestions: isObject(raw.parameter_suggestions) ? raw.parameter_suggestions : undefined,
    task_type: asString(raw.task_type),
    target_object: asString(raw.target_object),
    recommended_skills: asStringArray(raw.recommended_skills)
  };
}

function defaultOutputPath(aiPath: string): string {
  const resolved = resolve(aiPath);
  return join(dirname(resolved), "design_json.json");
}

function pushUniqueModule(target: Array<Record<string, string>>, moduleName?: string): void {
  if (!moduleName) {
    return;
  }
  const normalized = moduleName.trim();
  if (!normalized) {
    return;
  }
  if (!target.some((item) => item.module === normalized)) {
    target.push({ module: normalized });
  }
}

function normalizeCubeMxModel(mcu: string): string {
  if (mcu.toUpperCase() === "STM32F103ZET6") {
    return "STM32F103ZETx";
  }
  return mcu;
}

function normalizeCubeMxToolchain(toolchain: string): string {
  const normalized = toolchain.trim().toLowerCase();
  if (["keil", "keil_uv4", "keil_uv5", "uv4", "uv5", "mdk-arm"].includes(normalized)) {
    return "MDK-ARM";
  }
  return toolchain;
}

export function runAiToDesignJson(input: AiToDesignJsonInput): ToolResult {
  const task = normalizeTask(JSON.parse(readFileSync(input.task, "utf8")) as unknown);
  const ai = normalizeAi(JSON.parse(readFileSync(input.ai, "utf8")) as unknown);
  const outputPath = resolve(input.out ?? defaultOutputPath(input.ai));

  const suggested = ai.parameter_suggestions ?? {};
  const toolchain = isObject(suggested.toolchain) ? suggested.toolchain : {};
  const uart = isObject(suggested.uart) ? suggested.uart : {};
  const adc = isObject(suggested.adc) ? suggested.adc : {};
  const timers = [];
  const requiredModules: Array<Record<string, string>> = [];

  pushUniqueModule(requiredModules, asString(uart.instance));
  pushUniqueModule(requiredModules, asString(adc.instance));

  for (const module of task.required_modules) {
    const name = module.name.toLowerCase();
    if (name === "uart" || name === "usart") {
      pushUniqueModule(requiredModules, typeof module.instance === "string" ? module.instance : "USART1");
    } else if (name === "adc") {
      pushUniqueModule(requiredModules, typeof module.instance === "string" ? module.instance : "ADC1");
    } else if (name === "timer") {
      if (typeof module.instance === "string") {
        timers.push({ module: module.instance });
      }
    }
  }

  const designJson = {
    project_name: task.task_name,
    project_path: task.toolchain.project_path || task.reference_files?.[0] || "",
    toolchain: normalizeCubeMxToolchain(asString(toolchain.type) ?? task.toolchain.type ?? "Makefile"),
    stm32_selection: {
      recommended_model: normalizeCubeMxModel(task.mcu),
      recommended_series: task.mcu
    },
    task_type: ai.task_type ?? "stm32_firmware_planning",
    target_object: ai.target_object ?? task.task_name,
    required_modules: [
      ...requiredModules,
      ...timers
    ]
  };

  writeFileSync(outputPath, `${JSON.stringify(designJson, null, 2)}\n`, "utf8");

  return {
    title: "Design JSON Generated",
    body: [
      `Task: ${resolve(input.task)}`,
      `AI Result: ${resolve(input.ai)}`,
      `Output: ${outputPath}`,
      `Required modules: ${designJson.required_modules.length}`,
      `Project path: ${designJson.project_path || "not set"}`,
      "Status: generated"
    ].join("\n")
  };
}
