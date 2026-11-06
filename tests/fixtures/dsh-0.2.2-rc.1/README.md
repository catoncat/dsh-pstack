# DSH preset baseline

These files are copied from `@deepseek-ai/dsh-web-app` 0.2.2-rc.1:

- `standard.patch.yml`
- `cordis.patch.yml`
- `LICENSE` (MIT, Copyright (c) 2026 DeepSeek)

`tests/preset-parity.test.ts` compares the `poteto-mode` and
`poteto-mode-creator` root presets against the tool rows in these files. The
expected delta is only the pstack delegation rows: remove `tool-subagent` and
`tool-subagent-fork`, then add `pstack-skill`, `pstack-subagent`, and
`poteto-mode-section`.

Refresh both files from the DSH installation when the audited DSH baseline
changes. Keep the `dsh-pstack` compatibility table in the root README aligned
with the fixture version.
