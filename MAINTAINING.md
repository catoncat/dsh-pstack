# Maintaining our fork

`upstream` is `l246804/dsh-pstack`, the port we started from. `ours` is our branch.

## Layout

- `main` tracks upstream exactly. Never commit here; it is the merge base.
- `ours` carries our changes. All work lands here.
- `src/` is the Host and Client source; `pstack/skills` is the upstream skill tree we ship.
- `port/` holds the porting notes and capability audit; `tests/` is the harness test suite.

## Sync upstream

```bash
git fetch upstream --tags
git checkout main
git merge --ff-only upstream/main
git checkout ours
git merge main
```

Resolve conflicts in `ours`, never in `main`. After a merge, run:

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
```

## Our rules

1. Skills stay byte-identical to upstream pstack unless a Cursor-only reference breaks on DSH. Every skill edit gets a row in `port/dsh.md`.
2. Configuration the user can change lives in one place: `$DSH_HOME/pstack-models.mdc` for routes, the plugin settings page for everything else. A new knob that is not in that file needs a settings control.
3. Every new UI surface registers a slot; it never replaces a shipped slot.
4. The plugin must work with the default profile, without any other plugin installed. Recommended plugins are opt-in hints, never requirements.