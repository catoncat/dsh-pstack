<div align="center">
  <img src="./assets/logo.png" width="144" alt="dsh-pstack logo" />

  <h1>dsh-pstack</h1>

  <p>
    <strong>Bring pstack's rigorous agent workflows to DeepSeek Harness</strong>
  </p>

  <p>English · <a href="./README.zh.md">中文</a></p>

  <p>
    <a href="https://npmx.dev/package/dsh-pstack"><img src="https://img.shields.io/npm/v/dsh-pstack?style=flat-square&colorA=080f12&colorB=1fa669" alt="npm version" /></a>
    <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/badge/dsh-%3E%3D0.2.2--rc.1-1f6feb?style=flat-square" alt="dsh >=0.2.2-rc.1" /></a>
    <a href="https://github.com/cursor/plugins/tree/main/pstack"><img src="https://img.shields.io/badge/pstack-0.15.36-d97706?style=flat-square" alt="pstack 0.15.36" /></a>
    <a href="https://github.com/l246804/dsh-pstack/blob/main/LICENSE"><img src="https://img.shields.io/github/license/l246804/dsh-pstack?style=flat-square&colorA=080f12&colorB=1fa669" alt="license" /></a>
    <a href="https://www.jsdocs.io/package/dsh-pstack"><img src="https://img.shields.io/badge/jsdocs-reference-080f12?style=flat-square&colorA=080f12&colorB=1fa669" alt="JSDoc reference" /></a>
  </p>

  <table>
    <tr>
      <td align="center"><strong>58</strong><br /><sub>pstack skills</sub></td>
      <td align="center"><strong>23</strong><br /><sub>playbooks</sub></td>
      <td align="center"><strong>5</strong><br /><sub>native tools</sub></td>
      <td align="center"><strong>5</strong><br /><sub>agent presets</sub></td>
      <td align="center"><strong>5</strong><br /><sub>bundled scripts</sub></td>
    </tr>
  </table>

  <p>
    <a href="#quick-start">🚀 Quick start</a> ·
    <a href="#️-common-commands">⌨️ Commands</a> ·
    <a href="#-capabilities">🧩 Capabilities</a> ·
    <a href="#-optional-dsh-plugins">🔌 Optional plugins</a> ·
    <a href="#️-remaining-gaps">⚠️ Limitations</a> ·
    <a href="#-compatibility">📦 Compatibility</a>
  </p>
</div>

---

`dsh-pstack` ports [pstack](https://github.com/cursor/plugins/tree/main/pstack) to [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH). It includes the upstream skills, playbooks, and references, and adds skill routing, role-based model configuration, role-routed subagents, and optional local rendering.

See the [capability audit](./port/audit.md) and [runtime mapping](./port/dsh.md) for the complete porting review.

The current review covers 68 Cursor-facing capabilities: 39 direct mappings, 2 official plugins, 18 plugin implementations, and 9 deliberate omissions.

> [!IMPORTANT]
> Requires DSH `>=0.2.2-rc.1` and Node.js `>=24.21.1`.

<a id="quick-start"></a>

## 🚀 Quick start

1. **Install the plugin.**

   ```sh
   dsh plugin --profile web add dsh-pstack
   ```

   You can also install it through **Plugins** in Web or Desktop.

2. **Restart the profile or open a new Session.**

3. **Initialize role-based model routing.**

   ```text
   /setup-pstack
   ```

   The command saves available routes to `$DSH_HOME/pstack-models.mdc`. Without this file, roles inherit the parent model.

4. **Start a workflow.**

   Select `poteto-mode` or `poteto-mode-creator` when creating a Session for persistent mode. In another preset, invoke `/poteto-mode` for one task.

### ⚙️ Configure role models

To view or edit routes after setup, open **Plugins → Installed plugins → dsh-pstack → Configure**.

## ⌨️ Common commands

| Task | Commands |
|---|---|
| Plan and build | `/poteto-mode`, `/architect`, `/arena`, `/swarm` |
| Understand and investigate | `/how`, `/why`, `/teach` |
| Verify | `/create-verification-skill`, `/statechart` |
| Review and maintain | `/show-me-your-work`, `/retro`, `/docs-drift` |

## 🧩 Capabilities

### 🛠️ Native tools

| Tool | Function |
|---|---|
| `pstack_skill` | Loads hidden pstack skills and their relative resources by name. |
| `pstack_models` | Lists available providers, models, and reasoning efforts. |
| `pstack_roles` | Shows role shapes and automatic-panel status so delegation uses the correct parameters. |
| `pstack_subagent` | Applies role routing and agent presets. Supports parallel subagents. |
| `pstack_render` | Renders Mermaid diagrams and slide videos through installed local renderers without installing them. |

### 🎭 Agent presets

The package ships two root presets and three child presets.

| Preset | Scope | Use |
|---|---|---|
| `poteto-mode` | Root | Keeps the full `poteto-mode` skill in the system prompt with the standard tools and `pstack_subagent` as the only direct delegation path. |
| `poteto-mode-creator` | Root | Same persistent skill with the Creator mode tools, `tool-cordis`, agent-preset skills, and `pstack_subagent` as the only direct delegation path. |
| `poteto-agent` | Child | Handles implementation delegation with the pstack persona and `poteto-mode` instructions. |
| `comment-sicko` | Child | Handles read-only comment review and reports deletion targets and `MUST KILL` symbols. |
| `readonly` | Child | Provides sandbox-enforced read-only research for inspection and evidence gathering. |

Preset names and descriptions follow the language selected in Settings → General → Language, read when the Host starts. Without a Web UI language selection they fall back to the default locale. Changing the language updates preset labels after a restart.

Do not enable Agent Teams with either pstack root preset. Both own delegation and task coordination. The pstack root preset fails at startup when the Agent Teams service is present.

### 📚 Additional skills

The package includes nine skills maintained independently of pstack.

| Skill | Source | Purpose |
|---|---|---|
| `writing-for-agents` | `vendored` | Write skills and clear agent-facing documentation. |
| `retro` | `vendored` | Review the agent environment without modifying the repository. |
| `deslop` | `vendored` | Remove AI-generated code slop from a diff. |
| `control-ui` | `vendored` | Drive and inspect a local web, IDE, or Electron UI with evidence. |
| `control-cli` | `vendored` | Drive and inspect an interactive CLI or TUI with evidence. |
| `decision-write` | `authored` | Create, land, and supersede decision records. |
| `decision-audit` | `authored` | Audit decision-record status and relationships. |
| `setup-project-docs` | `authored` | Set up sustainable project documentation. |
| `docs-drift` | `authored` | Detect documentation drift and repair approved findings. |

[`skills/skills-lock.json`](./skills/skills-lock.json) records the sources and hashes of vendored skills.

### 🎨 Optional rendering

`pstack_render` renders Mermaid diagrams through Pele when `pele@1.9.0` is installed, and slide videos through ffmpeg and ImageMagick when those commands are available. A missing renderer returns a clear `status: missing` result and an install hint.

## 🔌 Optional DSH plugins

Optional plugins extend specific workflows. You do not need them to install dsh-pstack.

To enable a plugin, open **Plugins → Add plugin**, select the package, and restart the profile.

| Use case | Plugin | Limits and conflicts |
|---|---|---|
| Worktrees and GitHub PRs | `@deepseek-ai/dsh-experimental-forge-bundle` | Provides the **Change requests & worktrees** switch and `create_worktree`. GitHub status needs a logged-in `gh`. |
| Session history | `@deepseek-ai/dsh-experimental-session-search` | Read-only. Requires exact `cwd` equality. Subagent transcript coverage is unconfirmed. |
| Browser verification | `@deepseek-ai/dsh-browser-use` and one provider | One provider per Session. Screenshots need an image-capable model. No video recording. |
| Desktop verification | `@deepseek-ai/dsh-cua-bundle` | macOS PTC Sessions only. Windows support is incomplete. No video recording. |
| Persistent terminals | `@deepseek-ai/dsh-experimental-terminal-bundle` | Six persistent shell and REPL tools. No GUI control or video recording. |
| MCP integrations | `@deepseek-ai/dsh-mcp-client` | No server configured by default. No automatic evidence-category discovery. |
| Agent teams | `@deepseek-ai/dsh-experimental-agent-team-profile` | Conflicts with pstack root presets and `pstack_subagent`. The pstack root preset fails at startup when Agent Teams is present. |
| Autonomous loops | `@deepseek-ai/dsh-experimental-ralph-bundle` | Starts a fresh child each round. No persistent loop or event watcher. |

Most packages ship with DSH. `@deepseek-ai/dsh-cua-bundle` installs on demand. Except for the MCP client, these plugins are experimental.

### 🌐 Browser providers

Choose one provider for `@deepseek-ai/dsh-browser-use`:

- `@deepseek-ai/dsh-experimental-browser-use-stagehand-native`: also needs Chromium and a supported non-DeepSeek model.
- `@deepseek-ai/dsh-experimental-browser-use-playwright-mcp`
- `@deepseek-ai/dsh-experimental-browser-use-chrome-devtools-mcp`

Providers have different tool names and selectors. Browser and computer use share separate single-provider slots.

The configuration page recommends Change requests & worktrees and session search. It never enables plugins automatically. Agent Teams is a conflict warning, not a recommendation.

> [!WARNING]
> Use either Agent Teams or `pstack_subagent`, not both. Agent Teams disables DSH's native subagent tools.

When a plugin is disabled, dependent steps report skipped or blocked. They never report passed. Without the forge bundle, use `gh` and `git worktree add` through `bash`. See the [DSH adaptation guide](./pstack/docs/harness/dsh.md#optional-plugins) for setup details and fallbacks.

## ⚠️ Remaining gaps

These limitations remain even when every recommended plugin is enabled.

| Area | Limitation |
|---|---|
| Cursor platform services | No Automations, Cursor webhooks, `SendToUser`, cloud agents, or persistent cloud Projects. |
| Bugbot | Cannot start, configure, or wait for Bugbot. Existing Bugbot comments can still be handled as PR reviews. |
| PR orchestration | No model-side change-request tool or Agent Teams PR frontier and ledger. `watch-pr` still provides stack verdicts. |
| Mode switching | No Option+Enter toggle or mid-session mode switch. Select `poteto-mode` or `poteto-mode-creator` at session creation; other presets invoke `/poteto-mode` for each task. |
| Event-driven loops | No forge event subscription. Local goals, schedules, and watchers are not equivalent. |
| Media evidence | No built-in video recording or frame-level verification. Use external recording or FFmpeg tools. |
| Desktop coverage | Computer use is limited to macOS PTC Sessions. Windows support is incomplete. |
| MCP discovery | No automatic evidence-category discovery. Configure and identify MCP tools explicitly. |

## 📦 Compatibility

Each row lists the latest compatible dsh-pstack release and its included pstack version.

| DSH version | Latest compatible dsh-pstack release | Included pstack version |
|---|---|---|
| `0.2.2-rc.1` and later | `0.3.0-beta.1` | `0.15.36` |

When a DSH breaking change creates a new compatibility boundary, add a row.

## 💛 Credits

- [pstack](https://github.com/cursor/plugins/tree/main/pstack) was designed and open-sourced by Lauren Tan and the Cursor team. `poteto-mode`, the 23 playbooks, and the 24 principles come from upstream.
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) is provided by the DeepSeek team. Its plugin, bundle, agent preset, subagent, and tool interfaces support this port.
- [cursor/plugins `cursor-team-kit`](https://github.com/cursor/plugins/tree/main/cursor-team-kit) provides the vendored `deslop`, `control-ui`, and `control-cli` skills.
- [mattpocock/skills](https://github.com/mattpocock/skills) provides the vendored `writing-for-agents` and `retro` skills.

This project is a community port, not an official Cursor or DeepSeek release.

## 📄 License

Original dsh-pstack code and documentation use the [MIT license](./LICENSE) © [leiwang](https://github.com/l246804). Bundled upstream projects and vendored skills retain their licenses and notices.
