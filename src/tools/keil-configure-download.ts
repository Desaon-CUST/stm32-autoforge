import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import type { KeilConfigureDownloadInput, ToolResult } from "../types.js";

const DEFAULT_MONITOR = "BIN\\CMSIS_AGDI.dll";
const DEFAULT_ALGORITHM = "$$Device:STM32F103ZE$Flash\\STM32F10x_512.FLM";

function findUvoptx(projectPath: string): string {
  const resolved = resolve(projectPath);
  if (resolved.toLowerCase().endsWith(".uvoptx")) {
    return resolved;
  }
  if (!resolved.toLowerCase().endsWith(".uvprojx")) {
    throw new Error("project must be a .uvprojx or .uvoptx path");
  }

  const uvoptx = resolved.replace(/\.uvprojx$/i, ".uvoptx");
  if (!existsSync(uvoptx)) {
    throw new Error(`uvoptx not found next to project: ${uvoptx}`);
  }
  return uvoptx;
}

function replaceTag(text: string, tag: string, value: string): string {
  const pattern = new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`);
  if (!pattern.test(text)) {
    throw new Error(`tag not found in uvoptx: ${tag}`);
  }
  return text.replace(pattern, `<${tag}>${value}</${tag}>`);
}

function replaceAlgorithm(text: string, algorithm: string): string {
  return text.replace(/-FP0\([^)]+\)/g, () => `-FP0(${algorithm})`);
}

export function runKeilConfigureDownload(input: KeilConfigureDownloadInput): ToolResult {
  const uvoptx = findUvoptx(input.project);
  const monitor = input.monitor ?? DEFAULT_MONITOR;
  const algorithm = input.algorithm ?? DEFAULT_ALGORITHM;
  const backup = `${uvoptx}.bak`;
  const reportPath = resolve(input.report ?? join(dirname(uvoptx), "keil_download_config_report.json"));

  let text = readFileSync(uvoptx, "utf8");
  const beforeMonitor = /<pMon>([\s\S]*?)<\/pMon>/.exec(text)?.[1] ?? null;
  copyFileSync(uvoptx, backup);

  text = replaceTag(text, "pMon", monitor);
  text = replaceAlgorithm(text, algorithm);
  writeFileSync(uvoptx, text, "utf8");

  const report = {
    status: "updated",
    uvoptx,
    backup,
    project: resolve(input.project),
    before_monitor: beforeMonitor,
    after_monitor: monitor,
    flash_algorithm: algorithm
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return {
    title: "Keil Download Configured",
    body: [
      `Project: ${resolve(input.project)}`,
      `UVOPTX: ${uvoptx}`,
      `Backup: ${basename(backup)}`,
      `Monitor: ${beforeMonitor ?? "unknown"} -> ${monitor}`,
      `Algorithm: ${algorithm}`,
      `Report: ${reportPath}`,
      "Status: updated"
    ].join("\n")
  };
}
