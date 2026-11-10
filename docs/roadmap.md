# Roadmap: our pstack UX

Status: proposed, awaiting review. Nothing below is implemented yet.

## Why

The plugin works, but you cannot see it. Configuration lives in four places that never
mention each other: the plugin detail dialog, `$DSH_HOME/pstack-models.mdc`, the agent
preset list, and the skill files inside the package. Using it still starts with typing a
slash command you have to remember.

The goal is a plugin whose state is visible, whose configuration is in one page, and whose
workflow can be started without memorizing a command.

## Definition of done

Each item is a predicate that a person can check in the running GUI.

1. Starting a task needs no slash command. A control in the composer lists the playbooks
   in plain language and fills the composer.
2. The Session header shows whether pstack is active and which playbook is running, with
   step progress.
3. The right sidebar lists this Session's child agents with role, route, effort, and
   status; clicking one opens that child.
4. One settings page edits roles, budget, and presets, saves them, and the next delegation
   uses the new value without a restart.
5. A prompt override changes a delegate persona without editing package files and survives
   a restart and an upstream sync.
6. A route that failed twice in a row is marked unhealthy, and a panel role skips it.

Global: `vp check` and `vp test` pass, the bundle installs into the desktop profile, and
every surface above is confirmed on the running Web UI, not inferred from registration.

## Constraints

- Upstream stays mergeable. New behavior lives in new files where possible; existing files
  get registration lines, not rewrites.
- No new required plugin. The page must work with the default profile. Recommended plugins
  stay hints.
- The magpie gateway rate-limits per day. Delegate-dependent verification waits for the
  window; UI work does not.
- The Client bundle is CJS wrapped by `window.__ModuleLoader__`, built by `vp pack`. One
  slot registration is the riskiest unknown, so the first unit proves it.

## Design

Three parts.

**Host state service.** One service owns the files: the role file, a new
`$DSH_HOME/pstack-config.json` for mode and presets, `$DSH_HOME/pstack-overrides/` for
prompt text, and `$DSH_HOME/pstack-health.json` for route outcomes. The existing
`pstackRoles` service already reads and writes the role file, so it grows into this service
instead of adding a second one.

**Client surfaces.** Five registrations, all additive:

| Surface | Slot | Kind |
| --- | --- | --- |
| Playbook picker | `conversation.input.left` | list entry |
| Status chip | `conversation.header.leading` | single occupant, next to the title |
| Child agent fleet | `rightbar.session` | session panel |
| Delegation card | `tool.call.toolview`, key `pstack_subagent` | keyed view |
| Settings page | `plugins.detail.section` | content section |

**Data flow.** Configuration reads and writes go through the remote methods. Live child
state comes from the Session's own `subagentCatalog` projection when the client can read
it; otherwise the same service exposes a read method. Prompt text and route health are
read-only from the client's point of view.

## Units

Riskiest unknown first, then visible before writable, then automation.

0. **Scaffold.** `docs/roadmap.md`, a `vp` task that records slot occupancy after install,
   and a check script that fails when an expected surface is missing. Done when the script
   passes against the current build.
1. **Delegation card.** Register a `pstack_subagent` tool view that renders one row per
   child with role, route, and effort. This proves the client build and registration path.
2. **Settings page, read-only.** A real page listing mode, roles with current routes,
   budget, and presets, all read from the service. No writes yet.
3. **Settings page, writable.** Save a role, change the budget, apply a preset, and
   verify the next delegation uses it.
4. **Playbook picker + header chip.** The picker lists playbooks with one-line
   descriptions and fills the composer. The chip reads the active playbook and step
   progress from the Session projection.
5. **Child fleet panel.** Live rows, route chips, failure markers, click to open the child.
6. **Prompt overrides.** Read a skill body, show its provenance, write an override file,
   reload, and confirm the delegate sees the edited text.
7. **Route health.** Record outcomes, mark a route unhealthy after two consecutive
   failures, and let panel roles skip unhealthy entries.

## Open decisions

1. Prompt overrides: whole-body replacement or an appended global instruction block.
2. Route health: mark only, or also skip automatically in panels.
3. Fleet panel source: client projection first with a remote fallback, or remote only.

## Verification harness

The repo has no UI test today. Unit 0 adds one command that dumps slot occupancy and
registration ids, so every later unit checks the same observable. Units that change the
Host also add a case under `playground/cases/`.