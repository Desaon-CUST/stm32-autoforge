# CubeMX Generate

## Goal

Reuse the existing `generate_from_design_json.py` entrypoint inside the new workflow.

## Current behavior

- Calls the legacy Python generator
- Supports `--dry-run`
- Can pass `--project-path`
- Can pass `--cubemx`

## Output

Depends on the legacy generator and the provided project path.
