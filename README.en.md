# dsh-ocgo-sync

DeepSeek Harness keeps its model list in a data file inside the `pi-ai` package rather than in any config:

    @earendil-works/pi-ai/dist/providers/data/opencode-go.json

The CLI runtime (`~/.dsh-runtime`) refreshes that file on every launch. the desktop app doesn't — it uses a copy frozen at build time.

So you end up with the gateway serving `deepseek-v4.1-flash`, the CLI offering it in the picker, and the desktop app still stopping at `deepseek-v4-flash`.

This script refreshes both. It finds every copy on the machine (CLI runtime and Desktop; copies that are really the same file get deduplicated), backs up before writing, and reads the result back to check it.

## Usage

Single file, no clone, no git:

```bash
curl -L -H "Accept: application/vnd.github.raw" -o sync.mjs \
  https://api.github.com/repos/M1012-w0917/dsh-opencode-go-sync/contents/bin/dsh-ocgo-sync.mjs

node sync.mjs --dry-run
node sync.mjs
```

On Windows PowerShell use `curl.exe`. With git installed you can also run:

```bash
npx github:M1012-w0917/dsh-opencode-go-sync
```

That one shells out to `git`; without it npm fails with `spawn git ENOENT`.

## Restart afterwards

The catalog is read once at startup, so DeepSeek Harness has to be restarted.

One thing about the desktop app: closing the window is not enough. It spawns a separate node process for the harness, and while that process is alive it holds the session write handle. The UI then reports `SessionAlreadyOwnedError`, which looks like a broken model but is really a leftover process. Check Task Manager for stray `node.exe` first.

## Options

| Option | Description |
| --- | --- |
| `--list` | list the files found and their model counts |
| `--dry-run` | print what would change, write nothing |
| `--offline` | no network; use `catalog/opencode-go.json` from this repo |
| `--snapshot <file>` / `--from <url>` | use a specific snapshot file or URL |
| `--prune` | also drop models the gateway no longer serves (kept by default) |
| `--root <dir>` | extra search root for non-default install locations |

## Caveats

- Upgrading the desktop app overwrites its install directory, so the frozen file comes back. Run this again.
- It writes inside the app directory; on macOS with `/Applications` you may need sudo.
- Tested on Windows only. Linux and macOS only get a CI smoke test against a fake directory.
- Only that one json is touched, with a `.bak-<timestamp>` left before each write.

## Where the data comes from

Model list: `https://opencode.ai/zen/go/v1/models`. Metadata (context size, pricing, reasoning levels): [models.dev](https://models.dev) (MIT).

`catalog/` is a snapshot refreshed daily by GitHub Actions, for people who can't stay online long enough to fetch it themselves.

Not affiliated with OpenCode, DataElement or DeepSeek. `catalog/` contains public model metadata only.