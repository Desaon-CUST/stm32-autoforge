# STM32 AutoForge

AI-powered STM32 project generation, build, flash, and verification pipeline.

Current baseline version: `v0`.

当前基线版本：`v0`。

STM32 AutoForge 是一个面向 STM32 开发流程的自动化工具。目标是把“需求描述 + 必要参考文件”转成 CubeMX 工程、主程序、Keil 编译下载配置，并通过串口或运行结果做验证。

## Workflow / 工作流程

```text
Requirement input -> Task JSON -> AI Prompt -> AI plan
-> CubeMX Design JSON -> CubeMX/Keil project
-> Main program patch -> Keil download configuration
-> Build -> Flash -> Verify
```

```text
输入需求 -> 生成任务 JSON -> 生成 AI Prompt -> 获取 AI 方案
-> 生成 CubeMX Design JSON -> 生成 CubeMX/Keil 工程
-> 写入主程序 -> 配置 Keil 下载方式 -> 编译 -> 烧录 -> 验证
```

## Scope / 功能范围

- Capture STM32 project requirements and required reference files
- Generate task prompts, AI plans, CubeMX design JSON, and CubeMX projects
- Apply generated main program logic into CubeMX projects
- Configure Keil download settings
- Build, flash, and verify runtime output through the existing FlashAndVerify workflow
- Show GUI progress for every major step

- 输入 STM32 需求和必要文件
- 自动整理任务描述和运行参数
- 调用 AI 生成工程设计方案
- 生成 CubeMX 设计 JSON 和 CubeMX 工程
- 将主程序逻辑写入 CubeMX 工程
- 自动配置 Keil 下载/烧录参数
- 自动编译、烧录，并通过串口关键字验证结果
- GUI 显示当前执行到哪一步，失败时便于定位原因

## First Run: AI Login / 第一次运行：AI 登录

This project calls AI through Codex CLI by default. Before the first run, log in with Codex CLI:

本工具默认通过 Codex CLI 调用 AI。第一次运行前，需要先完成 Codex 登录：

```powershell
codex --help
codex login
```

If `codex` is not found, enable `Show Advanced Paths` in the GUI and check whether `Codex Path` points to the real `codex.cmd`.

如果系统找不到 `codex`，在 GUI 中勾选 `Show Advanced Paths`，检查 `Codex Path` 是否指向真实的 `codex.cmd`。

Common path / 常见路径：

```text
C:\Users\<your-user-name>\AppData\Roaming\npm\codex.cmd
C:\Users\<你的用户名>\AppData\Roaming\npm\codex.cmd
```

The GUI calls AI in a way similar to:

GUI 内部调用 AI 的方式等价于：

```powershell
codex exec -C <workspace> --skip-git-repo-check -s read-only -m <model> -o <ai_plan_result.json> -
```

If the AI step fails, check `codex login`, `Codex Path`, network access, model availability, and the GUI `Log` output.

如果 AI 步骤失败，优先检查 `codex login`、`Codex Path`、网络连接、`Model` 是否可用，以及 GUI 的 `Log` 输出。

## AI Backend / AI 后端说明

The current default AI backend is Codex CLI / OpenAI models.

当前版本默认 AI 后端是 Codex CLI / OpenAI 模型。

Current chain / 当前调用链路：

```text
GUI -> codex exec -> ai_plan_result.json -> STM32 generation flow
GUI -> codex exec -> ai_plan_result.json -> 后续 STM32 工程生成流程
```

For OpenAI/Codex models, changing the GUI `Model` field is usually enough.

对于 OpenAI/Codex 体系内的模型，通常只需要修改 GUI 里的 `Model` 字段。

Gemini, Claude, and local LLMs are not directly compatible with `codex exec`. They need an AI Provider adapter that produces the same output file:

Gemini、Claude、本地大模型等其他模型不能直接复用 `codex exec`，需要新增 AI Provider 适配器。适配器需要输出同样格式的文件：

```text
ai_plan_result.json
```

As long as `ai_plan_result.json` keeps the same structure, the later CubeMX generation, main program patching, Keil configuration, build, flash, and verification steps can be reused.

只要 `ai_plan_result.json` 的结构保持一致，后续的 CubeMX 生成、主程序写入、Keil 配置、编译烧录和验证流程都可以继续复用。

## GUI

- `gui/stm32_task_gui.py`
- `gui/launch_gui.bat`

## GUI Usage / GUI 用法

1. Open `gui/launch_gui.bat`.
2. Fill in task name, MCU, serial port, Keil path, CubeMX path, and requirement description.
3. Add required reference files or an existing project if needed.
4. Click `Run All`.
5. Watch the current step in the `Progress` area.
6. If it fails, read command output and error details in `Log`.

1. 打开 `gui/launch_gui.bat`。
2. 填写任务名称、MCU、串口、Keil 路径、CubeMX 路径和需求描述。
3. 添加必要的参考文件或已有工程。
4. 点击 `Run All`。
5. 在 `Progress` 区域查看当前执行步骤。
6. 如果失败，查看 `Log` 中的命令输出和错误原因。

## UI Input Guide / UI 输入说明

- `Task Name`: Project/task name, for example `stm32_task`.
- `Board`: Board name, for example `ALIENTEK_STM32F103_Elite_V2`.
- `MCU`: MCU part number, for example `STM32F103ZET6`.
- `Requirement Description`: Natural-language requirement description.
- `Required Modules`: Peripheral requirements, one per line. Recommended format: `module,key=value,key=value`.
- `UV4 Path`: Keil `UV4.exe` path, for example `D:\Keil_v5\UV4\UV4.exe`.
- `Serial Port`: UART verification port, for example `COM10`.
- `Baud Rate`: UART baud rate, for example `115200`.
- `Expect Keyword`: Runtime verification keyword, for example `OK`.
- `Output Folder`: Folder for task files, AI output, and generated projects.
- `CubeMX Path`: STM32CubeMX path, configured in `Show Advanced Paths`.
- `Python Path`: Python path used by the CubeMX generation script, configured in `Show Advanced Paths`.

- `Task Name`：工程/任务名称，例如 `stm32_task`。
- `Board`：开发板名称，例如 `ALIENTEK_STM32F103_Elite_V2`。
- `MCU`：芯片型号，例如 `STM32F103ZET6`。
- `Requirement Description`：用自然语言填写需求。
- `Required Modules`：按行填写外设需求。推荐格式是 `模块名,参数=值,参数=值`。
- `UV4 Path`：Keil 的 `UV4.exe` 路径，例如 `D:\Keil_v5\UV4\UV4.exe`。
- `Serial Port`：验证用串口，例如 `COM10`。
- `Baud Rate`：串口波特率，例如 `115200`。
- `Expect Keyword`：自动验证时等待的关键字，例如 `OK`。
- `Output Folder`：任务文件、AI 输出和生成工程的保存目录。
- `CubeMX Path`：STM32CubeMX 路径，在 `Show Advanced Paths` 中设置。
- `Python Path`：用于调用 CubeMX 生成脚本的 Python 路径，在 `Show Advanced Paths` 中设置。

Example / 示例：

```text
uart,instance=USART1,tx_pin=PA9,rx_pin=PA10,baud_rate=115200,format=8N1,runtime_output=OK
gpio_led,pin=PC13,period_ms=500
```

## Buttons / 按钮含义

- `Save Task JSON`: Save current UI input only.
- `Run Pipeline`: Generate task file, flash config, and AI prompt from UI input.
- `Send To ChatGPT`: Send the prompt to AI and generate `ai_plan_result.json`.
- `Run All`: Run the full flow: task parsing, AI plan, CubeMX generation, code patching, Keil configuration, build, flash, and verification.

- `Save Task JSON`：只保存当前 UI 输入，不运行后续流程。
- `Run Pipeline`：根据 UI 输入生成任务文件、Flash 配置和 AI Prompt。
- `Send To ChatGPT`：把 Prompt 发给 AI，生成 `ai_plan_result.json`。
- `Run All`：完整执行需求解析、AI 方案、CubeMX 生成、代码写入、Keil 配置、编译烧录和验证。

## Output Files / 运行结果位置

```text
Output Folder\task.json
Output Folder\ai_plan_result.json
Output Folder\codegen_plan.json
Output Folder\design_json.json
Output Folder\pipeline-output
Output Folder\generated-project-runs
```

## Recommended Use / 推荐使用方式

1. Fill in `Requirement Description` and `Required Modules`.
2. Check Keil, CubeMX, Python, and serial port paths.
3. Click `Run All`.
4. If it stops at a step, check `Progress` and `Log`.
5. If flashing succeeds but the function is wrong, use the serial behavior, expected behavior, and generated project path as the next input for another iteration.

1. 先填好 `Requirement Description` 和 `Required Modules`。
2. 检查 Keil、CubeMX、Python、串口路径是否正确。
3. 点击 `Run All`。
4. 如果停在某一步，看 `Progress` 当前步骤和 `Log` 输出。
5. 如果烧录成功但功能不对，把串口现象、期望现象和生成工程路径作为下一轮输入继续修改。

## Current Commands / 当前命令

```bash
npm install
npm run start -- --help
npm run start -- task-pipeline --task ".\templates\task.example.json" --out ".\templates\pipeline-output"
npm run start -- ai-plan-parse --task ".\templates\task.example.json" --ai "D:\path\to\ai_plan_result.json"
npm run start -- ai-to-design-json --task ".\templates\task.example.json" --ai "D:\path\to\ai_plan_result.json"
npm run start -- cubemx-generate --design "D:\path\to\design_json.json" --dry-run true
npm run start -- flash-verify --config ".\templates\flash_verify.example.json"
```

## Current Build Targets / 当前建设目标

1. Improve `.ioc` / CubeMX project parsing.
2. Stabilize Keil build, flash, and verification wrappers.
3. Improve serial log capture and protocol decoding.
4. Build STM32 datasheet and reference manual indexes.
5. Support patch-style updates for existing STM32 projects.

1. 稳定解析 `.ioc` / CubeMX 工程。
2. 稳定封装 Keil 编译、下载、验证流程。
3. 增强串口日志捕获和协议解析。
4. 建立 STM32 数据手册、参考手册索引。
5. 支持对已有 STM32 工程进行补丁式修改。
