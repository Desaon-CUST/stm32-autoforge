# STM32 AutoForge

AI-powered STM32 project generation, build, flash, and verification pipeline.

STM32 AutoForge 是一个面向 STM32 开发流程的自动化工具。目标是把“需求描述 + 必要参考文件”转成 CubeMX 工程、主程序、Keil 编译下载配置，并通过串口或运行结果做验证。

当前重点流程：

```text
输入需求 -> 生成任务 JSON -> 生成 AI Prompt -> 获取 AI 方案
-> 生成 CubeMX Design JSON -> 生成 CubeMX/Keil 工程
-> 写入主程序 -> 配置 Keil 下载方式 -> 编译 -> 烧录 -> 验证
```

## Scope

- Capture STM32 project requirements and required reference files
- Generate task prompts, AI plans, CubeMX design JSON, and CubeMX projects
- Apply generated main program logic into CubeMX projects
- Configure Keil download settings
- Build, flash, and verify runtime output through the existing FlashAndVerify workflow
- Show GUI progress for every major step

## 中文功能范围

- 输入 STM32 需求和必要文件
- 自动整理任务描述和运行参数
- 调用 AI 生成工程设计方案
- 生成 CubeMX 设计 JSON 和 CubeMX 工程
- 将主程序逻辑写入 CubeMX 工程
- 自动配置 Keil 下载/烧录参数
- 自动编译、烧录，并通过串口关键字验证结果
- GUI 显示当前执行到哪一步，失败时便于定位原因

## Current commands

```bash
npm install
npm run start -- --help
npm run intake -- --project "Dual-uart STM32F103 test bench"
npm run plan -- --project "MZ interferometer acquisition node"
npm run start -- ioc-analyze --file "D:\path\to\project.ioc"
npm run start -- task-parse --file ".\templates\task.example.json"
npm run start -- task-to-flash-config --task ".\templates\task.example.json"
npm run start -- task-to-prompt --task ".\templates\task.example.json"
npm run start -- task-pipeline --task ".\templates\task.example.json" --out ".\templates\pipeline-output"
npm run start -- ai-plan-parse --task ".\templates\task.example.json" --ai "D:\path\to\ai_plan_result.json"
npm run start -- ai-to-design-json --task ".\templates\task.example.json" --ai "D:\path\to\ai_plan_result.json"
npm run start -- skill-map --codegen "D:\path\to\codegen_plan.json"
npm run start -- cubemx-generate --design "D:\path\to\design_json.json" --dry-run true
npm run start -- flash-verify --config ".\templates\flash_verify.example.json"
npm run start -- flash-verify --config "D:\sofrware project\AI try\FlashAndVerify.json" --run true
```

## GUI

- `gui/stm32_task_gui.py`
- `gui/launch_gui.bat`

GUI 用法：

1. 打开 `gui/launch_gui.bat`。
2. 填写任务名称、MCU、串口、Keil 路径、CubeMX 路径和需求描述。
3. 添加必要的参考文件或已有工程。
4. 点击 `Run All`。
5. 在 `Progress` 区域查看当前执行步骤。
6. 如果失败，查看 `Log` 中的命令输出和错误原因。

## UI 输入说明

常用输入项：

- `Task Name`：工程/任务名称，例如 `stm32_task`。生成工程会使用这个名称。
- `Board`：开发板名称，例如 `ALIENTEK_STM32F103_Elite_V2`。
- `MCU`：芯片型号，例如 `STM32F103ZET6`。
- `Requirement Description`：用自然语言写需求，例如“串口收到空格开始计时，再收到空格停止计时，并通过串口输出时间间隔”。
- `Required Modules`：按行填写外设需求。推荐格式是 `模块名,参数=值,参数=值`。
- `UV4 Path`：Keil 的 `UV4.exe` 路径，例如 `D:\Keil_v5\UV4\UV4.exe`。
- `Serial Port`：验证用串口，例如 `COM10`。
- `Baud Rate`：串口波特率，例如 `115200`。
- `Expect Keyword`：自动验证时等待的关键字，例如 `OK`。
- `Output Folder`：任务文件、AI 输出和生成工程的保存目录。
- `CubeMX Path`：STM32CubeMX 路径，在 `Show Advanced Paths` 中设置。
- `Python Path`：用于调用 CubeMX 生成脚本的 Python 路径，在 `Show Advanced Paths` 中设置。

`Required Modules` 示例：

```text
uart,instance=USART1,tx_pin=PA9,rx_pin=PA10,baud_rate=115200,format=8N1,runtime_output=OK
gpio_led,pin=PC13,period_ms=500
```

按钮含义：

- `Save Task JSON`：只保存当前 UI 输入，不运行后续流程。
- `Run Pipeline`：根据 UI 输入生成任务文件、Flash 配置和 AI Prompt。
- `Send To ChatGPT`：把 Prompt 发给 AI，生成 `ai_plan_result.json`。
- `Run All`：完整执行需求解析、AI 方案、CubeMX 生成、代码写入、Keil 配置、编译烧录和验证。

运行结果位置：

```text
Output Folder\task.json
Output Folder\ai_plan_result.json
Output Folder\codegen_plan.json
Output Folder\design_json.json
Output Folder\pipeline-output
Output Folder\generated-project-runs
```

推荐使用方式：

1. 先填好 `Requirement Description` 和 `Required Modules`。
2. 检查 Keil、CubeMX、Python、串口路径是否正确。
3. 点击 `Run All`。
4. 如果停在某一步，看 `Progress` 当前步骤和 `Log` 输出。
5. 如果烧录成功但功能不对，把串口现象、期望现象和生成工程路径作为下一轮输入继续修改。

## Current build targets

1. IOC/CubeMX project understanding
2. Build/flash wrapper tools
3. Serial log capture and protocol decode tools
4. Datasheet/manual indexing
5. Patch planning for existing STM32 projects

## 当前建设目标

1. 稳定解析 `.ioc` / CubeMX 工程
2. 稳定封装 Keil 编译、下载、验证流程
3. 增强串口日志捕获和协议解析
4. 建立 STM32 数据手册、参考手册索引
5. 支持对已有 STM32 工程进行补丁式修改
