# Task To Prompt

## Goal

Convert the normalized `task.json` input into a structured prompt text for the AI planning layer.

## Current behavior

- Read normalized `task.json`
- Summarize board, MCU, toolchain, required modules, and runtime verification
- Emit a strict-output prompt that asks the AI to return JSON only

## Output

Default generated file:

- `task_parser_prompt.txt`

## Intended downstream use

- feed the generated prompt into the model
- collect JSON planning output
- map `recommended_skills` and `code_generation_plan` into later agent steps
