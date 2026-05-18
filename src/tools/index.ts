import { runAiPlanParse } from "./ai-plan-parse.js";
import { runAiToDesignJson } from "./ai-to-design-json.js";
import { runApplyCodegenPlan } from "./apply-codegen-plan.js";
import { runCubemxGenerate } from "./cubemx-generate.js";
import { runFlashVerify } from "./flash-verify.js";
import { runIocAnalyze } from "./ioc-analyze.js";
import { runIntake } from "./intake.js";
import { runKeilConfigureDownload } from "./keil-configure-download.js";
import { runPlan } from "./plan.js";
import { runSkillMap } from "./skill-map.js";
import { runTaskPipeline } from "./task-pipeline.js";
import { runTaskParse } from "./task-parse.js";
import { runTaskToFlashConfig } from "./task-to-flash-config.js";
import { runTaskToPrompt } from "./task-to-prompt.js";

export const toolRegistry = {
  "ai-plan-parse": runAiPlanParse,
  "ai-to-design-json": runAiToDesignJson,
  "apply-codegen-plan": runApplyCodegenPlan,
  "cubemx-generate": runCubemxGenerate,
  "flash-verify": runFlashVerify,
  "ioc-analyze": runIocAnalyze,
  intake: runIntake,
  "keil-configure-download": runKeilConfigureDownload,
  plan: runPlan,
  "skill-map": runSkillMap,
  "task-pipeline": runTaskPipeline,
  "task-parse": runTaskParse,
  "task-to-flash-config": runTaskToFlashConfig,
  "task-to-prompt": runTaskToPrompt
};

export type ToolName = keyof typeof toolRegistry;
