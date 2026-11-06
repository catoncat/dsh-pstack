<div align="center">
  <img src="./assets/logo.png" width="144" alt="dsh-pstack logo" />
  <h1>dsh-pstack</h1>
  <p><strong>Rigorous agent workflows, natively in DeepSeek Harness.</strong></p>
  <p>A community port of <a href="https://github.com/cursor/plugins/tree/main/pstack">pstack</a> for <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a>.</p>
  <p>English · <a href="./README.zh.md">中文</a></p>
  <p>
    <a href="https://npmx.dev/package/dsh-pstack"><img src="https://img.shields.io/npm/v/dsh-pstack?style=flat-square&colorA=080f12&colorB=1fa669" alt="npm version" /></a>
    <a href="https://github.com/l246804/dsh-pstack/blob/main/LICENSE"><img src="https://img.shields.io/github/license/l246804/dsh-pstack?style=flat-square&colorA=080f12&colorB=1fa669" alt="license" /></a>
  </p>
</div>

> [!NOTE]
> This is a community port, not an official Cursor or DeepSeek release. The current preview is `0.3.0-beta.1`.

## Overview

`dsh-pstack` brings pstack's disciplined agent workflow to DeepSeek Harness. It packages the pstack skills, role-aware delegation, role model configuration, and the supporting tools as a normal DSH plugin bundle.

It is built for work where the process matters as much as the answer: planning before implementation, isolated subagents for parallel work, explicit model routes per role, and verification against the real artifact before declaring done.

| Metric | Value |
|:--|:--|
| Audited Cursor-facing capabilities | **68** |
| Generated pstack skills | **58** |
| Built-in pstack tools | **5** |
| Agent presets | **5** (2 root, 3 child) |
| Role definitions | **17** |
| Audit outcome | **39 direct mappings · 2 official plugins · 18 plugin implementations · 9 deliberately dropped** |

The complete capability review is in [`port/audit.md`](./port/audit.md). The runtime mapping is in [`port/dsh.md`](./port/dsh.md).

## What you get

### Presets and role-aware subagents

`pstack_subagent` delegates work to fresh child agents. A call can select a pstack role, a panel of routes, or one entry from a list role with `roleIndex`; `reasoningEffort` can raise or lower the selected route's starting effort. Every result includes the child id and the exact route it resolved.

The package ships two root presets and three child presets:

| Preset | Scope | Use |
|---|---|---|
| `poteto-mode` | Root | Keeps the full `poteto-mode` skill in the system prompt with the standard tools and `pstack_subagent` as the only direct spawn path. |
| `poteto-mode-creator` | Root | Same persistent skill with the Creator mode tools, `tool-cordis`, agent-preset skills, and `pstack_subagent` as the only direct spawn path. |
| `poteto-agent` | Child | Implementation delegate with the pstack persona and the `poteto-mode` instructions. |
| `comment-sicko` | Child | Read-only comment reviewer that reports deletion targets and `MUST KILL` symbols. |
| `readonly` | Child | Sandbox-enforced read-only researcher for inspection and evidence gathering. |

Do not enable Agent Teams with either pstack root preset. Both own delegation and task coordination. The pstack root preset fails at startup when the Agent Teams service is present.

### Skills with explicit loading

The generated pstack tree contains 58 skills. Most use `disable-model-invocation: true` so they stay out of the model catalog and are loaded by exact name through `pstack_skill`. Visible bundled skills use the normal `skill` tool.

The package also exposes both vendored skills and the skills authored in this repository. Relative resources such as `references/` and `playbooks/` are read beside `SKILL.md`; `../` is allowed only while it stays inside the skill directory.

### Live model and role discovery

- `pstack_models` lists the model routes the current DSH deployment actually serves, including each route's reasoning-effort tokens.
- `pstack_roles` lists every pstack role with its `shape`, `autoPanel`, and whether `roleIndex` applies.
- `$DSH_HOME/pstack-models.mdc` stores role routes. `pstack_subagent` re-reads it on every delegation, so edits affect the next child without a restart.

### Web plugin configuration

Open the `dsh-pstack` plugin page and choose **pstack settings**. The dialog has two tabs:

- **Recommended plugins** — inspect and manage official DSH plugins that complement pstack.
- **Role models** — view and edit role routes and the role budget, with live model choices.

### Optional rendering

`pstack_render` handles pstack visualization requests without silently installing tools. It renders Mermaid diagrams through Pele when `pele@1.9.0` is installed, and slide videos through ffmpeg and ImageMagick when those commands are available. A missing renderer produces a clear `status: missing` result and an install hint.

## Quick start

Install the plugin into a DSH profile:

```sh
dsh plugin --profile web add dsh-pstack
```

Use another profile name when needed:

```sh
dsh plugin --profile <profile> add dsh-pstack
```

Then:

1. Restart the profile if the plugin manager asks for it.
2. Open the `dsh-pstack` plugin page and select **pstack settings**.
3. Set role routes with the **Role models** tab, or run `/setup-pstack`.
4. Start a session with the `poteto-mode` or `poteto-mode-creator` preset for persistent mode, or invoke `/poteto-mode` for one task in another preset.

For local development and the full verification environment, see [`playground/README.md`](./playground/README.md).

## Tools

| Tool | Purpose |
|---|---|
| `pstack_skill` | Loads a pstack, vendored, or authored skill by exact name, including skills hidden from the model catalog. Accepts an optional `resource` relative to the skill directory. |
| `pstack_subagent` | Starts role-routed child agents, including automatic panels and selected list entries. |
| `pstack_models` | Reports the live provider, model, and reasoning-effort catalogue. |
| `pstack_roles` | Reports role shape, auto-panel behavior, and `roleIndex` applicability. |
| `pstack_render` | Renders optional Mermaid diagrams and SVG or video artifacts when the required local tools exist. |

The plugin also contributes its presets and the skill filesystem roots used by the tools above.

## Skills directory

The `skills/` workspace contains independently maintained skills.

- `skills/authored/` contains skills maintained in this repository.
- `skills/.agents/skills/` contains vendored skills loaded from the declarations in [`skills/package.json`](./skills/package.json), with sources and hashes in [`skills/skills-lock.json`](./skills/skills-lock.json).

| Skill | Source | Purpose |
|---|---|---|
| `writing-for-agents` | vendored | Write skills and agent-facing documentation. |
| `retro` | vendored | Review the agent environment without modifying the repository. |
| `deslop` | vendored | Remove AI-generated code slop from a diff. |
| `control-ui` | vendored | Drive and inspect a local web, IDE, or Electron UI with evidence. |
| `control-cli` | vendored | Drive and inspect an interactive CLI or TUI with evidence. |
| `decision-write` | authored | Create, land, and supersede decision records. |
| `decision-audit` | authored | Audit decision-record status and relationships. |
| `setup-project-docs` | authored | Set up sustainable project documentation. |
| `docs-drift` | authored | Detect documentation drift and repair approved findings. |

## Repository layout

| Path | Purpose |
|---|---|
| [`src/`](./src) | Plugin implementation: tools, subagent routing, role configuration, rendering, and the Web client. |
| [`pstack/`](./pstack) | Generated pstack skill tree and adapter documentation. Do not edit generated files by hand. |
| [`port/`](./port) | Porting baseline: audit records, generator, adapter docs, and maintenance rules. |
| [`skills/`](./skills) | Authored and vendored skill workspace. |
| [`playground/`](./playground) | Real-profile browser and headless verification environment. |
| `upstream/cursor-plugins/` | Pinned pstack upstream submodule. |

## Development

Initialize the pinned upstream sources and install dependencies:

```sh
git submodule update --init --recursive
vp install
```

Common commands:

```sh
vp run build             # build the plugin and generated package files
vp test                  # unit and behavior tests
vp run playground        # start the Web playground
vp run cases             # run the headless verification suite
node port/generate.mjs --check
```

Read [`port/README.md`](./port/README.md) before changing the port, the audit, or the generated tree. It defines the capability-review order, generation rules, local extensions, and regression notes.

The test suite includes a preset parity check in [`tests/preset-parity.test.ts`](./tests/preset-parity.test.ts). Refresh [`tests/fixtures/dsh-0.2.2-rc.1`](./tests/fixtures/dsh-0.2.2-rc.1) when the audited DSH baseline changes.

## Documentation

| Document | What it covers |
|---|---|
| [`port/README.md`](./port/README.md) | Porting rules, audit workflow, generated tree, and maintenance boundaries. |
| [`port/audit.md`](./port/audit.md) | All 68 capabilities with evidence, disposition, remaining gaps, and recommendations. |
| [`port/dsh.md`](./port/dsh.md) | Runtime mapping from Cursor/pstack names to DSH tools, fields, paths, and local replacements. |
| [`playground/README.md`](./playground/README.md) | Browser and headless verification setup. |

## Compatibility

| Component | Baseline |
|---|---|
| DSH | `>=0.2.2-rc.1`; audited against `0.2.2-rc.1` |
| pstack upstream | `ae5650febf4320793844c12c4adaa937f417f8da` (`0.15.36`) |
| dsh-pstack | `0.3.0-beta.1` |

## Credits

[pstack](https://github.com/cursor/plugins/tree/main/pstack) is designed and open-sourced by Lauren Tan and the Cursor team. [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) is provided by the DeepSeek team. [cursor/plugins `cursor-team-kit`](https://github.com/cursor/plugins/tree/main/cursor-team-kit) provides the vendored `deslop`, `control-ui`, and `control-cli` skills. [mattpocock/skills](https://github.com/mattpocock/skills) provides the vendored `writing-for-agents` and `retro` skills.

## License

Original dsh-pstack code and documentation use the [MIT license](./LICENSE) © [leiwang](https://github.com/l246804).
