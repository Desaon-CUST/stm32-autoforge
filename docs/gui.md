# GUI

## Goal

Provide a local task-entry interface for the STM32 workflow.

## Current capabilities

- Enter task name, description, board, MCU
- Enter Keil/UV4, uvprojx, target, serial verify settings
- Select reference files
- Save `task.json` into a chosen output folder
- Run `task-pipeline`
- Send generated prompt to the locally logged-in `codex/ChatGPT`
- Save model output into the chosen folder

## Output files

- `task.json`
- `pipeline-output/generated.flash_verify.json`
- `pipeline-output/task_parser_prompt.txt`
- `ai_plan_result.json`
