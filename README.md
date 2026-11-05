<div align="center">
  <img src="./assets/logo.png" width="144" alt="dsh-pstack logo" />
  <h1>dsh-pstack</h1>
  <p><strong>pstack for DeepSeek Harness</strong></p>
  <p>English · <a href="./README.zh.md">中文</a></p>
  <p>
    <a href="https://npmx.dev/package/dsh-pstack"><img src="https://img.shields.io/npm/v/dsh-pstack?style=flat-square&colorA=080f12&colorB=1fa669" alt="npm version" /></a>
    <a href="https://github.com/l246804/dsh-pstack/blob/main/LICENSE"><img src="https://img.shields.io/github/license/l246804/dsh-pstack?style=flat-square&colorA=080f12&colorB=1fa669" alt="license" /></a>
  </p>
</div>

`dsh-pstack` is a community port of [pstack](https://github.com/cursor/plugins/tree/main/pstack) for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

> [!IMPORTANT]
> This branch contains development infrastructure. Published releases provide the installable plugin.

## Development

Install the pinned submodule and dependencies.

```sh
git submodule update --init --recursive
vp install
```

The porting baseline is in [`port/README.md`](./port/README.md). It defines capability review, the generated `pstack/` tree, package skills, and verification.

The [playground guide](./playground/README.md) covers browser and headless verification.

## Package skills

The `skills/` workspace includes independently maintained skills. `skills/authored/` contains local skills. `skills/.agents/skills/` contains vendored skills loaded from the `skills` declarations in [`skills/package.json`](./skills/package.json), with sources and hashes in [`skills/skills-lock.json`](./skills/skills-lock.json). The cursor-team-kit skills come from `cursor/plugins` at the pinned ref; the retained upstream MIT license and source note are in [`licenses/cursor-team-kit`](./licenses/cursor-team-kit).

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

## Compatibility

Each row identifies a published release and its dependency baseline. Add a row when a DSH or pstack breaking change requires a new baseline.

| Dependency | Compatible range | dsh-pstack release |
|---|---|---|
| DSH | `<=0.2.2-alpha.2` | `v0.2.1` |
| pstack | `0.15.36` | `v0.2.1` |

## Credits

[pstack](https://github.com/cursor/plugins/tree/main/pstack) is designed and open-sourced by Lauren Tan and the Cursor team. [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) is provided by the DeepSeek team. [cursor/plugins `cursor-team-kit`](https://github.com/cursor/plugins/tree/main/cursor-team-kit) provides the vendored `deslop`, `control-ui`, and `control-cli` skills. [mattpocock/skills](https://github.com/mattpocock/skills) provides the vendored `writing-for-agents` and `retro` skills.

This project is a community port, not an official Cursor or DeepSeek release.

## License

Original dsh-pstack code and documentation use the [MIT license](./LICENSE) © [leiwang](https://github.com/l246804). Bundled upstream projects and vendored skills retain their licenses and notices.
