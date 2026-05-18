import { readFileSync } from "node:fs";
import type { IocAnalyzeInput, ToolResult } from "../types.js";

type IocEntryMap = Record<string, string>;

function uniqueSorted(items: string[]): string[] {
  return Array.from(new Set(items)).sort((a, b) => a.localeCompare(b));
}

function parseKeyValueIoc(text: string): IocEntryMap {
  const entries: IocEntryMap = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    entries[key] = value;
  }

  return entries;
}

function extractXmlTag(text: string, tagName: string): string | undefined {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i");
  const match = text.match(regex);
  return match?.[1]?.trim();
}

function extractXmlParameters(block: string): Array<{ name: string; value: string }> {
  const matches = block.matchAll(/<parameter\s+name="([^"]+)"\s+value="([^"]*)"\s*\/>/gi);
  return Array.from(matches, (match) => ({ name: match[1], value: match[2] }));
}

function parseXmlLikeIoc(text: string): ToolResult {
  const project = extractXmlTag(text, "name") ?? "unknown";
  const board = extractXmlTag(text, "board") ?? "unknown";

  const peripheralNames = Array.from(
    text.matchAll(/<peripheral\s+name="([^"]+)">/gi),
    (match) => match[1]
  );

  const clockBlock = extractXmlTag(text, "clocks") ?? "";
  const clockParams = extractXmlParameters(clockBlock);

  const body = [
    `File: XML-like IOC`,
    `Project: ${project}`,
    `Board/MCU: ${board}`,
    `Peripherals (${peripheralNames.length}): ${peripheralNames.join(", ") || "none"}`,
    `Clock parameters: ${
      clockParams.length > 0
        ? clockParams.map((item) => `${item.name}=${item.value}`).join(", ")
        : "none"
    }`
  ].join("\n");

  return {
    title: "IOC Analysis",
    body
  };
}

function buildKeyValueSummary(file: string, entries: IocEntryMap): ToolResult {
  const pinSignals = Object.entries(entries)
    .filter(([key]) => key.endsWith(".Signal"))
    .map(([key, value]) => {
      const pin = key.slice(0, -".Signal".length);
      return `${pin}=${value}`;
    });

  const ipCount = Number(entries["Mcu.IPNb"] ?? "0");
  const peripherals = uniqueSorted(
    Array.from({ length: ipCount }, (_, index) => entries[`Mcu.IP${index}`]).filter(
      (item): item is string => Boolean(item)
    )
  );

  const virtualPins = uniqueSorted(
    Object.keys(entries)
      .map((key) => key.split(".")[0])
      .filter((name) => name.startsWith("VP_"))
  );

  const clocks = Object.entries(entries)
    .filter(([key]) => key.startsWith("RCC.") && key.endsWith("_Value"))
    .map(([key, value]) => `${key.replace("RCC.", "")}=${value}`);

  const pinList = Object.entries(entries)
    .filter(([key]) => /^Mcu\.Pin\d+$/.test(key))
    .sort((a, b) => {
      const ai = Number(a[0].replace("Mcu.Pin", ""));
      const bi = Number(b[0].replace("Mcu.Pin", ""));
      return ai - bi;
    })
    .map(([, value]) => value);

  const lines = [
    `File: ${file}`,
    `Format: CubeMX key/value`,
    `Project: ${entries["ProjectManager.ProjectName"] ?? entries["Mcu.UserName"] ?? "unknown"}`,
    `MCU: ${entries["Mcu.CPN"] ?? entries["ProjectManager.DeviceId"] ?? entries["Mcu.Name"] ?? "unknown"}`,
    `Family: ${entries["Mcu.Family"] ?? "unknown"}`,
    `Package: ${entries["Mcu.Package"] ?? "unknown"}`,
    `Board: ${entries["board"] ?? "custom/unknown"}`,
    `Toolchain: ${entries["ProjectManager.TargetToolchain"] ?? entries["ProjectManager.CompilerLinker"] ?? "unknown"}`,
    `Pins (${pinList.length}): ${pinList.join(", ") || "none"}`,
    `Pin signals (${pinSignals.length}): ${pinSignals.join(", ") || "none"}`,
    `Peripherals (${peripherals.length}): ${peripherals.join(", ") || "none"}`,
    `Virtual pins (${virtualPins.length}): ${virtualPins.join(", ") || "none"}`,
    `Clocks: ${clocks.join(", ") || "none"}`
  ];

  return {
    title: "IOC Analysis",
    body: lines.join("\n")
  };
}

export function runIocAnalyze(input: IocAnalyzeInput): ToolResult {
  const text = readFileSync(input.file, "utf8");
  const trimmed = text.trim();

  if (trimmed.startsWith("<project>")) {
    return parseXmlLikeIoc(trimmed);
  }

  const entries = parseKeyValueIoc(text);
  return buildKeyValueSummary(input.file, entries);
}
