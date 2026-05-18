import type { Stm32ProjectProfile, ToolResult } from "../types.js";

export function runPlan(profile: Stm32ProjectProfile): ToolResult {
  const steps = [
    "Confirm MCU, board, clocks, power rails, and toolchain.",
    "Define peripheral list and pin ownership.",
    "Choose HAL / LL / bare-metal / FreeRTOS approach.",
    "Plan CubeMX/IOC generation boundary versus hand-written code.",
    "Define build, flash, and log-capture path.",
    "Define protocol/debug hooks for serial, SWD, and waveform validation."
  ];

  const body = [
    `Project: ${profile.project}`,
    "",
    "Recommended first-pass plan:",
    ...steps.map((step, index) => `${index + 1}. ${step}`)
  ].join("\n");

  return {
    title: "STM32 Project Plan",
    body
  };
}
