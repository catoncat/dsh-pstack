---
name: playground-verify
description: Run the dsh-pstack playground stage-one verification end to end on a fresh machine, from environment prep through evidence report.
disable-model-invocation: true
---

# Run playground verification

Drive the browser-only playground through one full stage-one pass and leave a report whose every evidence path exists. The playground verifies upstream pstack skills against a real DSH Web session. It never uses headless runs.

## 1. Prepare

Run from the repository root.

1. `vp install`.
2. Follow `port/AGENTS.md` to stage the generated tree, then `vp run build`.
3. Confirm `dsh` is on PATH.
4. Copy `playground/config.example.json` to `playground/config.json` and fill the allowed provider, apiKey, models and efforts. This file is ignored.

Prepare the workers. Worker count is detected from the machine unless overridden.

```sh
vp run playground:prepare -- --mode raw --reset
vp run playground:prepare -- --mode raw --reset --workers 6
```

Each worker owns `playground/.workers/w<k>/` with its own DSH home, browser profile, workspace root and evidence dir, and binds an OS-assigned port from `dsh --port 0`. There is no fixed port.

## 2. Land the browser profile

```sh
vp run playground:bootstrap -- --all
```

Dismisses the preview notice once per worker profile and checks each worker shows the expected workspace and model chip.

## 3. Run the batch

```sh
vp run playground:run-batch -- --mode raw --all
vp run playground:run-batch -- --mode raw --cases tdd,unslop --probe 150
```

Stage one uses a short probe, 120 seconds for principle cases and 300 seconds for behavior cases, then aborts the in-flight turn and marks the evidence truncated. Stage two regression omits `--probe` and uses `--timeout`.

Watch progress in one file.

```sh
vp run playground:status
```

## 4. Keep the evidence

Evidence lands in `playground/.workers/w<k>/evidence/`. `prepare --reset` clears `playground/.workers`, so archive after a batch you mean to cite.

```sh
mkdir -p playground/reports/evidence
cp playground/.workers/w*/evidence/*.json playground/.workers/w*/evidence/*.png playground/reports/evidence/
```

`playground/reports/evidence/` is tracked-adjacent and never cleared by prepare. Every path a report cites must exist under it or under the worker evidence dirs of the same run.

## 5. Report

```sh
vp run playground:collect -- --mode raw
```

The report records per-case verdict, worker, route, tool errors and failures. Stage one does not pass or fail a case; failures are findings. Write the audit conclusions into `playground/reports/stage1-findings.md`, one section per skill, with the four fixed columns: upstream capability, current implementation status and gap, suggested dsh.md adaptation and plugin tools, and pending approval.

## 6. Rerun only what failed

Rerun the raw failures with a focused case list. Do not reset the workers dir, or you lose the run you are comparing against.

```sh
vp run playground:run-batch -- --mode raw --cases <case-a>,<case-b>
```

## Conventions

- Case prompts stay natural user requests. Never name a tool or expand call arguments.
- Model choice is the operator's. Confirm it once per machine; the agent cites session events as evidence.
- The upstream skill set and per-skill case mapping live in `playground/cases.lock.json`. `vp run playground:check` fails on drift.
- Cursor-only skills are excluded in the lock with a reason and get no case.
