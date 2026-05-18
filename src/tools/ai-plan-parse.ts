import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type {
  AiPlanParseInput,
  TaskConfig,
  TaskModule,
  ToolResult
} from "../types.js";

type AiPlan = {
  task_type?: string;
  target_object?: string;
  recommended_skills?: string[];
  code_generation_plan?: {
    main_file_strategy?: string;
    init_blocks?: string[];
    loop_blocks?: string[];
    interrupt_blocks?: string[];
  };
  parameter_suggestions?: Record<string, unknown>;
  assumptions?: string[];
  unknowns?: string[];
  runtime_validation?: {
    method?: string;
    expectation?: string;
  };
  design_rationale?: {
    overall_strategy?: string;
    key_decisions?: string[];
  };
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

function normalizeAiPlan(raw: unknown): AiPlan {
  if (!isObject(raw)) {
    throw new Error("AI result must be a JSON object");
  }

  const codegen = isObject(raw.code_generation_plan) ? raw.code_generation_plan : {};
  const runtime = isObject(raw.runtime_validation) ? raw.runtime_validation : {};
  const rationale = isObject(raw.design_rationale) ? raw.design_rationale : {};

  return {
    task_type: asString(raw.task_type),
    target_object: asString(raw.target_object),
    recommended_skills: asStringArray(raw.recommended_skills),
    code_generation_plan: {
      main_file_strategy: asString(codegen.main_file_strategy),
      init_blocks: asStringArray(codegen.init_blocks),
      loop_blocks: asStringArray(codegen.loop_blocks),
      interrupt_blocks: asStringArray(codegen.interrupt_blocks)
    },
    parameter_suggestions: isObject(raw.parameter_suggestions) ? raw.parameter_suggestions : undefined,
    assumptions: asStringArray(raw.assumptions),
    unknowns: asStringArray(raw.unknowns),
    runtime_validation: {
      method: asString(runtime.method),
      expectation: asString(runtime.expectation)
    },
    design_rationale: {
      overall_strategy: asString(rationale.overall_strategy),
      key_decisions: asStringArray(rationale.key_decisions)
    }
  };
}

function defaultOutputPath(aiPath: string): string {
  const resolved = resolve(aiPath);
  return join(dirname(resolved), "codegen_plan.json");
}

export function runAiPlanParse(input: AiPlanParseInput): ToolResult {
  const task = normalizeTaskConfig(JSON.parse(readFileSync(input.task, "utf8")) as unknown);
  const aiPlan = normalizeAiPlan(JSON.parse(readFileSync(input.ai, "utf8")) as unknown);
  const outputPath = resolve(input.out ?? defaultOutputPath(input.ai));

  const codegenPlan = {
    source_files: {
      task: resolve(input.task),
      ai_result: resolve(input.ai)
    },
    task: {
      name: task.task_name,
      description: task.description ?? null,
      board: task.board ?? null,
      mcu: task.mcu,
      project_path: task.toolchain.project_path ?? null,
      target_name: task.toolchain.target_name ?? null,
      reference_files: task.reference_files ?? []
    },
    ai_summary: {
      task_type: aiPlan.task_type ?? null,
      target_object: aiPlan.target_object ?? null,
      recommended_skills: aiPlan.recommended_skills ?? [],
      assumptions: aiPlan.assumptions ?? [],
      unknowns: aiPlan.unknowns ?? []
    },
    codegen_plan: {
      main_file_strategy: aiPlan.code_generation_plan?.main_file_strategy ?? null,
      init_blocks: aiPlan.code_generation_plan?.init_blocks ?? [],
      loop_blocks: aiPlan.code_generation_plan?.loop_blocks ?? [],
      interrupt_blocks: aiPlan.code_generation_plan?.interrupt_blocks ?? []
    },
    runtime_validation: {
      method: aiPlan.runtime_validation?.method ?? null,
      expectation: aiPlan.runtime_validation?.expectation ?? null
    },
    design_rationale: {
      overall_strategy: aiPlan.design_rationale?.overall_strategy ?? null,
      key_decisions: aiPlan.design_rationale?.key_decisions ?? []
    },
    next_actions: [
      "Review unknowns and resolve project structure details.",
      "Map recommended_skills to local skill registry entries.",
      "Generate code insertion plan for main file and init/loop/interrupt sections.",
      "Run flash-verify after code generation is integrated."
    ]
  };

  writeFileSync(outputPath, `${JSON.stringify(codegenPlan, null, 2)}\n`, "utf8");

  return {
    title: "AI Plan Parsed",
    body: [
      `Task: ${resolve(input.task)}`,
      `AI Result: ${resolve(input.ai)}`,
      `Output: ${outputPath}`,
      `Recommended skills: ${(aiPlan.recommended_skills ?? []).join(", ") || "none"}`,
      `Init blocks: ${(aiPlan.code_generation_plan?.init_blocks ?? []).length}`,
      `Loop blocks: ${(aiPlan.code_generation_plan?.loop_blocks ?? []).length}`,
      `Interrupt blocks: ${(aiPlan.code_generation_plan?.interrupt_blocks ?? []).length}`,
      "Status: generated"
    ].join("\n")
  };
}
