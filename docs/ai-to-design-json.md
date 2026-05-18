# AI To Design JSON

## Goal

Convert `task.json` and `ai_plan_result.json` into the `design_json.json` format expected by the older CubeMX generator.

## Output

- `design_json.json`

## Notes

- The current converter is conservative.
- It maps UART/ADC/TIM-like modules first.
- Project path still depends on task/toolchain inputs being filled correctly.
