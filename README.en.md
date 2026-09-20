# dsh-ocgo-sync

Keep the **OpenCode Go model catalog in [DSH](https://github.com/deepseek-ai/deepseek-harness) up to date**
— for both the CLI runtime and DSH Desktop.

English · [简体中文](README.md)

## The problem

The model list in DSH is not a config setting; it is a data file shipped inside `pi-ai`:

```
@earendil-works/pi-ai/dist/providers/data/opencode-go.json
```

| | behaviour of that file |
|---|---|
| **CLI runtime** (`~/.dsh-runtime`) | refreshed on every launch by its own sync script ✅ |
| **DSH Desktop** | frozen at build time, never updated ❌ |

So a model that the gateway has served for weeks (e.g. `deepseek-v4.1-flash`) shows up in the
CLI but is simply missing from the DSH Desktop model picker.

## Quick start

### Option 1 — single file (works even where `github.com` is blocked)

```bash
curl -L -H "Accept: application/vnd.github.raw" -o sync.mjs \
  https://api.github.com/repos/M1012-w0917/dsh-ocgo-sync/contents/bin/dsh-ocgo-sync.mjs
node sync.mjs --dry-run      # preview
node sync.mjs                # apply
```

On Windows PowerShell use `curl.exe` instead of `curl`.

> Offline snapshot from the same API host:
> `node sync.mjs --offline --from https://api.github.com/repos/M1012-w0917/dsh-ocgo-sync/contents/catalog/opencode-go.json`

### Option 2 — whole repo

```bash
curl -L -o sync.zip https://api.github.com/repos/M1012-w0917/dsh-ocgo-sync/zipball/main
node bin/dsh-ocgo-sync.mjs
```

### Option 3 — when GitHub is reachable

```bash
npx github:M1012-w0917/dsh-ocgo-sync
```

## Usage

```bash
npx github:M1012-w0917/dsh-ocgo-sync
# or
git clone https://github.com/M1012-w0917/dsh-ocgo-sync
node dsh-opencode-go-sync/bin/dsh-ocgo-sync.mjs
```

The tool locates every copy of that file on the machine (CLI runtime + DSH Desktop), de-duplicates
them across junctions/symlinks, rebuilds the catalog from the gateway model list plus
[models.dev](https://models.dev) metadata, and writes it back in place:

- backs the file up to `<file>.bak-<timestamp>` before writing
- re-reads and validates after writing
- preserves existing `compat` / `thinkingLevelMap` fields; new models inherit them from their
  closest sibling by name prefix
- never touches API keys or credential files

### Options

| option | description |
|---|---|
| `--list` | show the files found and their model counts |
| `--dry-run` | print the diff without writing |
| `--offline` | no network; apply the snapshot in `catalog/` |
| `--snapshot <file>` | use a specific snapshot file |
| `--from <url>` | fetch the snapshot from a URL |
| `--prune` | also drop models the gateway no longer serves (kept by default) |
| `--emit <file>` | only regenerate a snapshot file (used to maintain this repo) |
| `--root <dir>` | extra search root |

## After it runs

Restart the affected DSH — the catalog is read once at startup.

- **DSH Desktop**: fully quit and reopen. Closing the window is not enough: make sure no bundled
  `node.exe` harness process is left behind, otherwise it keeps the session write handle and the UI
  may report `SessionAlreadyOwnedError`.
- **CLI runtime**: just relaunch it.

## FAQ

**Upgrading the desktop app brought the old list back.** The installer overwrites the app
directory. Run the tool again.

**No internet at all?** Use `--offline`; this repo's `catalog/` is refreshed daily by GitHub Actions.

**`github.com` unreachable?** The tool only needs `opencode.ai` and `models.dev`. To fetch this
repo itself you can go through the API host:

```bash
curl -L -o sync.zip https://api.github.com/repos/M1012-w0917/dsh-ocgo-sync/zipball/main
```

**Is it destructive?** It rewrites exactly one data file, always leaving a timestamped backup, and
validates the result immediately. Restore by copying the backup back.

## Data sources

- model list: `https://opencode.ai/zen/go/v1/models`
- metadata: [models.dev](https://models.dev) (MIT)

This project is not affiliated with OpenCode, DataElement or DeepSeek. It proxies nothing, stores
no credentials, and the committed snapshot contains only public model metadata.