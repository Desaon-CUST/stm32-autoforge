# Task Schema

## Purpose

Provide one normalized machine-readable input file for STM32 tasks.

## Required top-level fields

- `task_name`
- `mcu`
- `toolchain`
- `required_modules`

## Toolchain fields

- `type`
- `uv4_path`
- `project_path`
- `target_name`

## Runtime verify fields

- `serial_port`
- `baud_rate`
- `timeout_s`
- `expect_keywords`

## Notes

- Prefer one canonical entry file: `task.json`
- Do not keep parallel `task.json` and `ril.json` formats long-term
- Keep hardware, toolchain, and runtime verification parameters outside code
