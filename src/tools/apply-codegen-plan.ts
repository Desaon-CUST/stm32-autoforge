import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { ApplyCodegenPlanInput, ToolResult } from "../types.js";

type CodegenPlan = {
  task?: {
    name?: string | null;
    project_path?: string | null;
  };
  runtime_validation?: {
    expectation?: string | null;
  };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeCodegenPlan(raw: unknown): CodegenPlan {
  if (!isObject(raw)) {
    throw new Error("codegen plan must be a JSON object");
  }

  const task = isObject(raw.task) ? raw.task : {};
  const runtime = isObject(raw.runtime_validation) ? raw.runtime_validation : {};

  return {
    task: {
      name: asString(task.name) ?? null,
      project_path: asString(task.project_path) ?? null
    },
    runtime_validation: {
      expectation: asString(runtime.expectation) ?? null
    }
  };
}

function replaceUserBlock(text: string, marker: string, body: string): string {
  const begin = `/* USER CODE BEGIN ${marker} */`;
  const end = `/* USER CODE END ${marker} */`;
  const pattern = new RegExp(`${escapeRegExp(begin)}[\\s\\S]*?${escapeRegExp(end)}`);

  if (!pattern.test(text)) {
    throw new Error(`USER CODE block not found: ${marker}`);
  }

  return text.replace(pattern, `${begin}\n${body.trimEnd()}\n${end}`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function candidateMainPaths(input: ApplyCodegenPlanInput, plan: CodegenPlan): string[] {
  const items: string[] = [];

  if (input.main) {
    items.push(resolve(input.main));
  }
  if (input.project) {
    const project = resolve(input.project);
    items.push(join(project, "Src", "main.c"));
    items.push(join(project, "Core", "Src", "main.c"));
  }
  if (plan.task?.project_path) {
    const project = resolve(plan.task.project_path);
    items.push(join(project, "Src", "main.c"));
    items.push(join(project, "Core", "Src", "main.c"));
  }

  const codegenDir = dirname(resolve(input.codegen));
  items.push(join(codegenDir, "generated-project", plan.task?.name ?? "stm32_task", "Src", "main.c"));
  items.push(join(codegenDir, "generated-project", plan.task?.name ?? "stm32_task", "Core", "Src", "main.c"));

  return Array.from(new Set(items));
}

function findMain(input: ApplyCodegenPlanInput, plan: CodegenPlan): string {
  const candidates = candidateMainPaths(input, plan);
  const found = candidates.find((item) => existsSync(item));
  if (!found) {
    throw new Error(`main.c not found. Tried:\n${candidates.join("\n")}`);
  }
  return found;
}

function buildPatch(expectation: string | null): Record<string, string> {
  const includes = [
    "#include <stdio.h>",
    "#include <string.h>"
  ].join("\n");

  const privateVars = [
    "static uint32_t g_last_heartbeat_tick = 0;",
    "static uint32_t g_heartbeat_count = 0;"
  ].join("\n");

  const prototypes = [
    "static void App_SendText(const char *text);",
    "static void App_SendHeartbeat(void);"
  ].join("\n");

  const user0 = [
    "static void App_SendText(const char *text)",
    "{",
    "  HAL_UART_Transmit(&huart1, (uint8_t *)text, (uint16_t)strlen(text), HAL_MAX_DELAY);",
    "}",
    "",
    "static void App_SendHeartbeat(void)",
    "{",
    "  char buffer[96];",
    "  int length = snprintf(buffer, sizeof(buffer), \"OK heartbeat %lu tick=%lu\\r\\n\",",
    "                        (unsigned long)g_heartbeat_count,",
    "                        (unsigned long)HAL_GetTick());",
    "",
    "  if (length > 0)",
    "  {",
    "    HAL_UART_Transmit(&huart1, (uint8_t *)buffer, (uint16_t)length, HAL_MAX_DELAY);",
    "  }",
    "}"
  ].join("\n");

  const user2 = [
    "App_SendText(\"OK boot stm32_task\\r\\n\");",
    expectation ? `App_SendText("${cString(`Plan: ${expectation}`)}\\r\\n");` : "",
    "g_last_heartbeat_tick = HAL_GetTick();"
  ].filter(Boolean).join("\n");

  const user3 = [
    "if ((HAL_GetTick() - g_last_heartbeat_tick) >= 500U)",
    "{",
    "  g_last_heartbeat_tick = HAL_GetTick();",
    "  g_heartbeat_count++;",
    "#ifdef GPIO_PIN_13",
    "  HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);",
    "#endif",
    "  App_SendHeartbeat();",
    "}"
  ].join("\n");

  const gpio1 = [
    "GPIO_InitTypeDef GPIO_InitStruct = {0};"
  ].join("\n");

  const gpio2 = [
    "__HAL_RCC_GPIOC_CLK_ENABLE();",
    "HAL_GPIO_WritePin(GPIOC, GPIO_PIN_13, GPIO_PIN_RESET);",
    "GPIO_InitStruct.Pin = GPIO_PIN_13;",
    "GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;",
    "GPIO_InitStruct.Pull = GPIO_NOPULL;",
    "GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;",
    "HAL_GPIO_Init(GPIOC, &GPIO_InitStruct);"
  ].join("\n");

  return {
    Includes: includes,
    PV: privateVars,
    PFP: prototypes,
    "0": user0,
    "2": user2,
    "3": user3,
    "MX_GPIO_Init_1": gpio1,
    "MX_GPIO_Init_2": gpio2
  };
}

function cString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function runApplyCodegenPlan(input: ApplyCodegenPlanInput): ToolResult {
  const plan = normalizeCodegenPlan(JSON.parse(readFileSync(input.codegen, "utf8")) as unknown);
  const mainPath = resolve(input.out ?? findMain(input, plan));
  const sourcePath = findMain(input, plan);
  let text = readFileSync(sourcePath, "utf8");
  const patch = buildPatch(plan.runtime_validation?.expectation ?? null);

  for (const [marker, body] of Object.entries(patch)) {
    text = replaceUserBlock(text, marker, body);
  }

  writeFileSync(mainPath, text, "utf8");

  return {
    title: "Codegen Plan Applied",
    body: [
      `Codegen: ${resolve(input.codegen)}`,
      `Source main.c: ${sourcePath}`,
      `Output main.c: ${mainPath}`,
      `Runtime expectation: ${plan.runtime_validation?.expectation ?? "not set"}`,
      "Status: generated"
    ].join("\n")
  };
}
