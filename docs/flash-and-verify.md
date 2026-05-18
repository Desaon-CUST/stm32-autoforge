# Flash And Verify

## Goal

Wrap the existing `FlashAndVerify.py` workflow behind the new CLI.

## Current scope

- Parse and validate a flash/verify JSON config
- Summarize build, flash, and runtime verification settings
- Generate the exact command that will be executed
- Optionally execute the legacy Python script
- Write a normalized JSON report for later agent steps
- Collect known legacy artifacts after execution:
  - `build_log.txt`
  - `flash_log.txt`
  - `compile_fail.json`
  - `flash_fail.json`
  - `build_log_htm.txt`

## Recommended flow

1. Keep board and toolchain details in JSON
2. Keep `UV4.exe`, `uvprojx`, `TargetName`, and runtime verify parameters outside code
3. Use dry-run first
4. Enable execution only after config is correct
5. Keep execution inside the legacy script directory so relative report files land in a stable location

## Normalized report

Default output:

- `flash_verify_result.json`

Recommended downstream usage:

- read `status`
- read `return_code`
- inspect `artifacts.compile_fail_json`
- inspect `artifacts.flash_fail_json`
- inspect `artifacts.build_log_tail`
- inspect `artifacts.flash_log_tail`
