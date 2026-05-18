import { toolRegistry } from "./tools/index.js";
import type {
  AiPlanParseInput,
  AiToDesignJsonInput,
  ApplyCodegenPlanInput,
  CubemxGenerateInput,
  FlashVerifyInput,
  IocAnalyzeInput,
  KeilConfigureDownloadInput,
  Stm32ProjectProfile,
  TaskParseInput,
  TaskToFlashConfigInput
} from "./types.js";

function buildProfile(options: Record<string, string>): Stm32ProjectProfile {
  const project = options.project;

  if (!project) {
    throw new Error("Missing required option: --project <name>");
  }

  return {
    project,
    mcu: options.mcu,
    board: options.board,
    toolchain: options.toolchain,
    features: options.features
      ? options.features.split(",").map((item) => item.trim()).filter(Boolean)
      : []
  };
}

function parseOptions(args: string[]): Record<string, string> {
  const options: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for option: ${token}`);
    }

    options[key] = value;
    index += 1;
  }

  return options;
}

function printResult(title: string, body: string): void {
  process.stdout.write(`${title}\n${"=".repeat(title.length)}\n${body}\n`);
}

function buildIocAnalyzeInput(options: Record<string, string>): IocAnalyzeInput {
  const file = options.file;

  if (!file) {
    throw new Error("Missing required option: --file <path>");
  }

  return { file };
}

function buildTaskParseInput(options: Record<string, string>): TaskParseInput {
  const file = options.file;

  if (!file) {
    throw new Error("Missing required option: --file <path>");
  }

  return { file };
}

function buildFlashVerifyInput(options: Record<string, string>): FlashVerifyInput {
  const config = options.config;

  if (!config) {
    throw new Error("Missing required option: --config <path>");
  }

  return {
    config,
    script: options.script,
    python: options.python,
    run: options.run === "true",
    report: options.report
  };
}

function buildTaskToFlashConfigInput(options: Record<string, string>): TaskToFlashConfigInput {
  const task = options.task;

  if (!task) {
    throw new Error("Missing required option: --task <path>");
  }

  return {
    task,
    out: options.out
  };
}

function buildTaskToPromptInput(options: Record<string, string>): TaskToFlashConfigInput {
  const task = options.task;

  if (!task) {
    throw new Error("Missing required option: --task <path>");
  }

  return {
    task,
    out: options.out
  };
}

function buildTaskPipelineInput(options: Record<string, string>): TaskToFlashConfigInput {
  const task = options.task;

  if (!task) {
    throw new Error("Missing required option: --task <path>");
  }

  return {
    task,
    out: options.out
  };
}

function buildAiPlanParseInput(options: Record<string, string>): AiPlanParseInput {
  const task = options.task;
  const ai = options.ai;

  if (!task) {
    throw new Error("Missing required option: --task <path>");
  }
  if (!ai) {
    throw new Error("Missing required option: --ai <path>");
  }

  return {
    task,
    ai,
    out: options.out
  };
}

function buildAiToDesignJsonInput(options: Record<string, string>): AiToDesignJsonInput {
  const task = options.task;
  const ai = options.ai;
  if (!task) {
    throw new Error("Missing required option: --task <path>");
  }
  if (!ai) {
    throw new Error("Missing required option: --ai <path>");
  }
  return {
    task,
    ai,
    out: options.out
  };
}

function buildSkillMapInput(options: Record<string, string>): { codegen: string; out?: string } {
  const codegen = options.codegen;

  if (!codegen) {
    throw new Error("Missing required option: --codegen <path>");
  }

  return {
    codegen,
    out: options.out
  };
}

function buildCubemxGenerateInput(options: Record<string, string>): CubemxGenerateInput {
  const design = options.design;
  if (!design) {
    throw new Error("Missing required option: --design <path>");
  }
  return {
    design,
    out: options.out,
    cubemx: options.cubemx,
    python: options.python,
    timeout_s: options.timeout ? Number(options.timeout) : undefined,
    dry_run: options["dry-run"] === "true" || options["dry-run"] === "1"
  };
}

function buildApplyCodegenPlanInput(options: Record<string, string>): ApplyCodegenPlanInput {
  const codegen = options.codegen;
  if (!codegen) {
    throw new Error("Missing required option: --codegen <path>");
  }
  return {
    codegen,
    project: options.project,
    main: options.main,
    out: options.out
  };
}

function buildKeilConfigureDownloadInput(options: Record<string, string>): KeilConfigureDownloadInput {
  const project = options.project;
  if (!project) {
    throw new Error("Missing required option: --project <uvprojx|uvoptx>");
  }
  return {
    project,
    monitor: options.monitor,
    algorithm: options.algorithm,
    report: options.report
  };
}

function printHelp(): void {
  const text = [
    "stm32-fullflow-ai 0.1.0",
    "",
    "Usage:",
    "  tsx src/cli.ts <command> [options]",
    "",
    "Commands:",
    "  intake   Normalize STM32 project requirements",
    "  plan     Generate a first-pass STM32 project plan",
    "  ioc-analyze  Inspect a CubeMX .ioc file",
    "  task-parse   Parse and validate a task.json file",
    "  task-to-flash-config  Generate FlashAndVerify JSON from task.json",
    "  task-to-prompt  Generate an AI prompt from task.json",
    "  task-pipeline  Run task parse + flash config + prompt generation",
    "  ai-plan-parse  Convert ai_plan_result.json into codegen_plan.json",
    "  ai-to-design-json  Convert task + ai result into CubeMX design JSON",
    "  skill-map  Map AI recommended skills to local registry entries",
    "  cubemx-generate  Call the existing CubeMX project generator",
    "  apply-codegen-plan  Write AI codegen plan into CubeMX USER CODE blocks",
    "  keil-configure-download  Set Keil download/debug monitor defaults",
    "  flash-verify  Parse or execute FlashAndVerify config",
    "",
    "Common options:",
    "  --project <name>     Project name",
    "  --mcu <name>         MCU name",
    "  --board <name>       Board name",
    "  --toolchain <name>   Toolchain name",
    "  --features <items>   Comma-separated feature list",
    "  --file <path>        Input file path for ioc-analyze/task-parse",
    "  --task <path>        Input task.json path",
    "  --ai <path>          Input ai_plan_result.json path",
    "  --codegen <path>     Input codegen_plan.json path",
    "  --design <path>      Input design_json.json path",
    "  --main <path>        main.c path override",
    "  --out <path>         Generated output path",
    "  --config <path>      FlashAndVerify config path",
    "  --cubemx <path>      STM32CubeMX.exe path override",
    "  --python <path>      Python executable for CubeMX generator",
    "  --monitor <path>     Keil debug monitor, e.g. BIN\\CMSIS_AGDI.dll",
    "  --algorithm <path>   Keil flash algorithm path",
    "  --script <path>      FlashAndVerify.py path override",
    "  --dry-run <true|false> Run CubeMX wrapper in dry-run mode",
    "  --run <true|false>   Execute flash-verify instead of dry-run",
    "  --report <path>      Output JSON report path"
  ].join("\n");

  process.stdout.write(`${text}\n`);
}

function main(): void {
  const [, , command, ...rest] = process.argv;

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "--version" || command === "-v") {
    process.stdout.write("0.1.0\n");
    return;
  }

  const options = parseOptions(rest);

  if (command === "intake") {
    const profile = buildProfile(options);
    const result = toolRegistry.intake(profile);
    printResult(result.title, result.body);
    return;
  }

  if (command === "plan") {
    const profile = buildProfile(options);
    const result = toolRegistry.plan(profile);
    printResult(result.title, result.body);
    return;
  }

  if (command === "ioc-analyze") {
    const input = buildIocAnalyzeInput(options);
    const result = toolRegistry["ioc-analyze"](input);
    printResult(result.title, result.body);
    return;
  }

  if (command === "task-parse") {
    const input = buildTaskParseInput(options);
    const result = toolRegistry["task-parse"](input);
    printResult(result.title, result.body);
    return;
  }

  if (command === "task-to-flash-config") {
    const input = buildTaskToFlashConfigInput(options);
    const result = toolRegistry["task-to-flash-config"](input);
    printResult(result.title, result.body);
    return;
  }

  if (command === "task-to-prompt") {
    const input = buildTaskToPromptInput(options);
    const result = toolRegistry["task-to-prompt"](input);
    printResult(result.title, result.body);
    return;
  }

  if (command === "task-pipeline") {
    const input = buildTaskPipelineInput(options);
    const result = toolRegistry["task-pipeline"](input);
    printResult(result.title, result.body);
    return;
  }

  if (command === "ai-plan-parse") {
    const input = buildAiPlanParseInput(options);
    const result = toolRegistry["ai-plan-parse"](input);
    printResult(result.title, result.body);
    return;
  }

  if (command === "ai-to-design-json") {
    const input = buildAiToDesignJsonInput(options);
    const result = toolRegistry["ai-to-design-json"](input);
    printResult(result.title, result.body);
    return;
  }

  if (command === "skill-map") {
    const input = buildSkillMapInput(options);
    const result = toolRegistry["skill-map"](input);
    printResult(result.title, result.body);
    return;
  }

  if (command === "cubemx-generate") {
    const input = buildCubemxGenerateInput(options);
    const result = toolRegistry["cubemx-generate"](input);
    printResult(result.title, result.body);
    return;
  }

  if (command === "apply-codegen-plan") {
    const input = buildApplyCodegenPlanInput(options);
    const result = toolRegistry["apply-codegen-plan"](input);
    printResult(result.title, result.body);
    return;
  }

  if (command === "keil-configure-download") {
    const input = buildKeilConfigureDownloadInput(options);
    const result = toolRegistry["keil-configure-download"](input);
    printResult(result.title, result.body);
    return;
  }

  if (command === "flash-verify") {
    const input = buildFlashVerifyInput(options);
    const result = toolRegistry["flash-verify"](input);
    printResult(result.title, result.body);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n\n`);
  printHelp();
  process.exit(1);
}
