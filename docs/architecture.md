# Architecture Draft

## Goal

Provide an AI-driven workflow for STM32 projects from requirements to debugging.

## Layers

1. CLI layer
   - Receives user intent
   - Routes to STM32-specific tools
2. Tool layer
   - Requirement intake
   - Project planning
   - IOC/CubeMX analysis
   - Build/flash
   - Serial/protocol analysis
3. Template layer
   - Project skeletons
   - Code snippets
   - Checklists
4. Data layer
   - Board profiles
   - MCU profiles
   - Prompt snippets
   - Protocol notes

## First usable version

- A CLI that can:
  - record project requirements
  - output a recommended STM32 project plan
  - parse a normalized `task.json`
  - list planned tools

## Planned tools

- `intake`: normalize project requirements
- `plan`: generate an execution plan for firmware work
- `ioc-analyze`: inspect `.ioc` or CubeMX output
- `task-parse`: validate and summarize `task.json`
- `task-to-flash-config`: convert `task.json` into legacy flash/verify config
- `task-to-prompt`: convert `task.json` into a planning prompt for the AI layer
- `task-pipeline`: generate the first-pass downstream artifacts from one task file
- `ai-plan-parse`: convert model planning output into local codegen plan
- `ai-to-design-json`: convert task and AI result into CubeMX design input
- `skill-map`: map model-recommended skills to local registry entries
- `cubemx-generate`: reuse the older CubeMX generation entrypoint
- `flash-verify`: validate or run build/flash/runtime verification
- `build`: call local build tools
- `flash`: call local programming tools
- `serial-decode`: parse captured serial frames
