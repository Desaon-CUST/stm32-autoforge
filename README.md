# STM32 AutoForge

AI-powered STM32 project generation, build, flash, and verification pipeline.

## Scope

- Capture STM32 project requirements and required reference files
- Generate task prompts, AI plans, CubeMX design JSON, and CubeMX projects
- Apply generated main program logic into CubeMX projects
- Configure Keil download settings
- Build, flash, and verify runtime output through the existing FlashAndVerify workflow
- Show GUI progress for every major step

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

## Current build targets

1. IOC/CubeMX project understanding
2. Build/flash wrapper tools
3. Serial log capture and protocol decode tools
4. Datasheet/manual indexing
5. Patch planning for existing STM32 projects
