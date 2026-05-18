# Task Pipeline

## Goal

Run the first-pass task processing chain with one command.

## Current steps

1. Parse and validate `task.json`
2. Generate `generated.flash_verify.json`
3. Generate `task_parser_prompt.txt`

## Output

Default output directory:

- `pipeline-output/`

## Intended use

Use this command as the standard first step after receiving a new STM32 task file.
