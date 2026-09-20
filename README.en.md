# dsh-ocgo-sync

The model list of DeepSeek Harness is not a configuration item; it is a data file shipped inside the `pi-ai` package:

    @earendil-works/pi-ai/dist/providers/data/opencode-go.json

The web version (`~/.dsh-runtime`) refreshes this file on every launch. The desktop version (DSH Desktop) uses the copy frozen at build time and does not update it.

A model such as `deepseek-v4.1-flash` may therefore be selectable in the web version while the desktop model list still ends at `deepseek-v4-flash`.

This tool synchronizes both: it locates every copy on the machine, de-duplicates by physical path, backs up before writing, and verifies after writing.

## Usage

```bash
curl -L -H "Accept: application/vnd.github.raw" -o sync.mjs \
  https://api.github.com/repos/M1012-w0917/dsh-opencode-go-sync/contents/bin/dsh-ocgo-sync.mjs

node sync.mjs --dry-run    # preview
node sync.mjs              # apply
```

On Windows PowerShell, replace `curl` with `curl.exe`.

## 1. Web version

File location:

    ~/.dsh-runtime/node_modules/.pnpm/@earendil-works+pi-ai@.../dist/providers/data/opencode-go.json

The web version already refreshes this file on startup, so manual handling is normally unnecessary. Running this tool is useful when the list should be refreshed immediately without a restart.

To take effect: run the launcher script again.

## 2. Desktop version

File location:

    %LOCALAPPDATA%\Programs\DSH Desktop\resources\app\node_modules\@earendil-works\pi-ai\dist\providers\data\opencode-go.json

A file of the same name exists under the profile directory in `%APPDATA%\dsh-desktop`, but it is a link to the file above; only one physical copy exists.

Two points to note:

**1. A full exit and restart is required.** Closing the window is not sufficient. The desktop app starts an additional node process for the harness; while that process is alive it holds the session write handle, and the interface reports `SessionAlreadyOwnedError`. The error is unrelated to the model itself. Confirm in Task Manager that no `node.exe` remains.

**2. Upgrading the desktop app overwrites the install directory.** The frozen catalog is restored by an upgrade, so this tool has to be run again.

## Options

| Option | Description |
| --- | --- |
| `--list` | list the files found and their model counts |
| `--dry-run` | print the pending changes without writing |
| `--offline` | no network; use the `catalog/` snapshot in this repository |
| `--snapshot <file>` / `--from <url>` | specify an alternative snapshot |
| `--emit <file>` | export the current upstream models as a snapshot |
| `--prune` | drop models the gateway no longer serves (kept by default) |
| `--root <dir>` | extra search root for non-default install locations |

## Notes

- The files modified live inside the application directory; on macOS with `/Applications` a `sudo` may be required.
- A `.bak-<timestamp>` backup is written before each modification and can be used to roll back.
- Verified on Windows. Linux and macOS have not been verified on real installations.
- The model list comes from `https://opencode.ai/zen/go/v1/models`; metadata comes from [models.dev](https://models.dev). `catalog/` is refreshed daily by GitHub Actions.
- This project is not affiliated with OpenCode, DataElement or DeepSeek.

[简体中文](README.md)