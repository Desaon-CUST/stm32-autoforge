import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { runTaskParse } from "./task-parse.js";
import { runTaskToFlashConfig } from "./task-to-flash-config.js";
import { runTaskToPrompt } from "./task-to-prompt.js";
import type { ToolResult } from "../types.js";

type TaskPipelineInput = {
  task: string;
  out?: string;
};

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function runTaskPipeline(input: TaskPipelineInput): ToolResult {
  const taskPath = resolve(input.task);
  const outputDir = resolve(input.out ?? join(dirname(taskPath), "pipeline-output"));
  ensureDir(outputDir);

  const parseResult = runTaskParse({ file: taskPath });
  const flashConfigPath = join(outputDir, "generated.flash_verify.json");
  const promptPath = join(outputDir, "task_parser_prompt.txt");

  const flashConfigResult = runTaskToFlashConfig({
    task: taskPath,
    out: flashConfigPath
  });

  const promptResult = runTaskToPrompt({
    task: taskPath,
    out: promptPath
  });

  return {
    title: "Task Pipeline Complete",
    body: [
      `Task: ${taskPath}`,
      `Output dir: ${outputDir}`,
      "",
      parseResult.title,
      parseResult.body,
      "",
      flashConfigResult.title,
      flashConfigResult.body,
      "",
      promptResult.title,
      promptResult.body
    ].join("\n")
  };
}
