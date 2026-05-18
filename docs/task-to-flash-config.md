# Task To Flash Config

## Goal

Convert the normalized `task.json` input into a legacy-compatible `FlashAndVerify` config file.

## Current mapping

- `task_name` -> `project_name`
- `board` -> `board`
- `mcu` -> `mcu`
- `toolchain.type` -> `build.tool` and `flash.tool`
- `toolchain.uv4_path` -> `build.uv4_path`
- `toolchain.project_path` -> `build.project_path` and `flash.project_path`
- `toolchain.target_name` -> `build.target_name` and `flash.target_name`
- `runtime_verify.serial_port` -> `verify_runtime.port`
- `runtime_verify.baud_rate` -> `verify_runtime.baudrate`
- `runtime_verify.expect_keywords[0]` -> `verify_runtime.expect_text`

## Output

Default generated file:

- `generated.flash_verify.json`

## Notes

- If no runtime keyword is provided, the generator falls back to module `runtime_output`, then `OK`
