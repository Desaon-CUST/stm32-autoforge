import type { Stm32ProjectProfile, ToolResult } from "../types.js";

export function runIntake(profile: Stm32ProjectProfile): ToolResult {
  const lines = [
    `Project: ${profile.project}`,
    `MCU: ${profile.mcu ?? "TBD"}`,
    `Board: ${profile.board ?? "TBD"}`,
    `Toolchain: ${profile.toolchain ?? "Keil / CubeMX / CubeIDE TBD"}`,
    `Features: ${profile.features.length > 0 ? profile.features.join(", ") : "TBD"}`
  ];

  return {
    title: "STM32 Requirement Intake",
    body: lines.join("\n")
  };
}
