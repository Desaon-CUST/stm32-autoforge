# Changelog

## v0 - Baseline / 基线版本

Date / 日期: 2026-05-19

### Summary / 概要

`v0` is the first usable baseline of STM32 AutoForge.

`v0` 是 STM32 AutoForge 的第一个可用基线版本。

### Included / 已包含

- GUI for entering STM32 requirements, board, MCU, serial, Keil, CubeMX, Python, and Codex settings.
- Progress display for the major steps in the full flow.
- Task JSON generation.
- AI prompt generation and Codex CLI based AI call.
- AI plan parsing into `codegen_plan.json`.
- CubeMX design JSON generation.
- CubeMX project generation wrapper.
- Generated main program patching into CubeMX project.
- Keil download configuration helper.
- Build, flash, and runtime verification wrapper through the existing FlashAndVerify flow.
- Clean generated project run directory strategy to reduce CubeMX repeated-generation issues.
- Bilingual README with first-run, AI login, UI input, and provider notes.

- GUI 支持输入 STM32 需求、开发板、MCU、串口、Keil、CubeMX、Python 和 Codex 设置。
- 支持全流程主要步骤进度显示。
- 支持生成任务 JSON。
- 支持生成 AI Prompt，并通过 Codex CLI 调用 AI。
- 支持将 AI 方案解析为 `codegen_plan.json`。
- 支持生成 CubeMX Design JSON。
- 支持封装调用 CubeMX 生成工程。
- 支持将主程序逻辑写入 CubeMX 工程。
- 支持配置 Keil 下载参数。
- 支持通过现有 FlashAndVerify 流程编译、烧录和运行验证。
- 支持每次使用干净生成目录，减少 CubeMX 重复生成卡住问题。
- README 已加入中英双语说明，包括首次运行、AI 登录、UI 输入和 AI 后端说明。

### Known Limits / 已知限制

- Default AI backend is Codex CLI / OpenAI. Gemini, Claude, and local LLMs need provider adapters.
- CubeMX batch generation can still fail on some environments; timeout protection and clean run folders are included.
- Runtime verification currently depends on serial keyword matching.
- UI is usable but still developer-oriented; environment checks, module builders, and result-opening buttons are planned.

- 默认 AI 后端是 Codex CLI / OpenAI。Gemini、Claude、本地模型需要新增 Provider 适配器。
- CubeMX 批处理在部分环境仍可能失败；当前已加入超时保护和干净运行目录策略。
- 运行验证目前主要依赖串口关键字匹配。
- UI 当前可用但仍偏工程师自用；环境检查、模块可视化添加、结果打开按钮是后续优化方向。

### Next Tests / 后续测试

- Try different STM32 requirements and peripherals.
- Verify generated code for UART, GPIO, timer, ADC, PWM, and mixed workflows.
- Record failures and iterate from this `v0` baseline.

- 尝试不同 STM32 需求和外设组合。
- 验证 UART、GPIO、定时器、ADC、PWM 和混合流程生成效果。
- 记录失败现象，并基于 `v0` 继续迭代。
