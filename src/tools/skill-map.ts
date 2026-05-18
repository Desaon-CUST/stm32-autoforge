import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { ToolResult } from "../types.js";
import { skillRegistry, type SkillRegistryEntry } from "./skill-registry.js";

type SkillMapInput = {
  codegen: string;
  out?: string;
};

type CodegenPlanInput = {
  ai_summary?: {
    recommended_skills?: string[];
  };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return items.length > 0 ? items : undefined;
}

function normalizeCodegenPlan(raw: unknown): CodegenPlanInput {
  if (!isObject(raw)) {
    throw new Error("codegen plan must be a JSON object");
  }

  const aiSummary = isObject(raw.ai_summary) ? raw.ai_summary : {};
  return {
    ai_summary: {
      recommended_skills: asStringArray(aiSummary.recommended_skills)
    }
  };
}

function defaultOutputPath(codegenPath: string): string {
  const resolved = resolve(codegenPath);
  return join(dirname(resolved), "skill_map.json");
}

function findMatch(skillName: string): SkillRegistryEntry | undefined {
  const key = skillName.trim().toLowerCase();
  return skillRegistry.find((entry) =>
    entry.id.toLowerCase() === key ||
    entry.aliases.some((alias) => alias.toLowerCase() === key)
  );
}

export function runSkillMap(input: SkillMapInput): ToolResult {
  const raw = JSON.parse(readFileSync(input.codegen, "utf8")) as unknown;
  const codegen = normalizeCodegenPlan(raw);
  const requested = codegen.ai_summary?.recommended_skills ?? [];
  const outputPath = resolve(input.out ?? defaultOutputPath(input.codegen));

  const matched = [];
  const missing = [];

  for (const skill of requested) {
    const match = findMatch(skill);
    if (match) {
      matched.push({
        requested: skill,
        registry_id: match.id,
        category: match.category,
        summary: match.summary,
        output_targets: match.output_targets
      });
    } else {
      missing.push(skill);
    }
  }

  const result = {
    source_codegen_plan: resolve(input.codegen),
    requested_skills: requested,
    matched_skills: matched,
    missing_skills: missing,
    next_actions: [
      "Use matched_skills to decide which code templates or generators to invoke.",
      "Create new registry entries for any missing_skills before auto-generation.",
      "Map output_targets to concrete USER CODE insertion points."
    ]
  };

  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  return {
    title: "Skill Map Generated",
    body: [
      `Codegen plan: ${resolve(input.codegen)}`,
      `Output: ${outputPath}`,
      `Requested skills: ${requested.length}`,
      `Matched skills: ${matched.length}`,
      `Missing skills: ${missing.length}`,
      missing.length > 0 ? `Missing list: ${missing.join(", ")}` : "Missing list: none",
      "Status: generated"
    ].join("\n")
  };
}
