# dsh-ocgo-sync

**简体中文** · [English](README.en.md)

DeepSeek Harness 的模型清单并非配置项，而是 `pi-ai` 包内的一份数据文件：

    @earendil-works/pi-ai/dist/providers/data/opencode-go.json

网页版（`~/.dsh-runtime`）在每次启动时会自行同步该文件；桌面版（DSH Desktop）使用安装包内冻结的版本，不会更新。

因此常出现如下情况：网关已提供 `deepseek-v4.1-flash`，网页版可以选择，桌面版的模型列表中却只有 `deepseek-v4-flash`。

本工具用于将两侧同步至最新：自动检索所有同名文件，按物理路径去重，写入前备份，写入后校验。

## 用法

```bash
curl -L -H "Accept: application/vnd.github.raw" -o sync.mjs \
  https://api.github.com/repos/M1012-w0917/dsh-opencode-go-sync/contents/bin/dsh-ocgo-sync.mjs

node sync.mjs --dry-run    # 预览变更
node sync.mjs              # 执行
```

Windows PowerShell 中请将 `curl` 替换为 `curl.exe`。

## 一、网页版

文件位置：

    ~/.dsh-runtime/node_modules/.pnpm/@earendil-works+pi-ai@.../dist/providers/data/opencode-go.json

网页版在启动时已会自行同步该文件，通常无需手动处理。执行本工具适用于希望立即刷新、而不重新启动的情形。

生效方式：重新运行启动脚本。

## 二、桌面版

文件位置：

    %LOCALAPPDATA%\Programs\DSH Desktop\resources\app\node_modules\@earendil-works\pi-ai\dist\providers\data\opencode-go.json

`%APPDATA%\dsh-desktop` 的 profile 下存在同名文件，但它是指向上述文件的链接，物理上仅一份。

需注意两点：

**1. 需完整退出后重新启动。** 仅关闭窗口不算退出。桌面版会额外启动一个 node 进程运行 harness，该进程未结束时仍持有会话的写入句柄，界面将报告 `SessionAlreadyOwnedError`。该错误与模型本身无关。请在任务管理器中确认没有残留的 `node.exe`。

**2. 桌面版升级会覆盖安装目录。** 升级后冻结的清单将被还原，需要重新执行本工具。

## 参数

| 参数 | 说明 |
| --- | --- |
| `--list` | 仅列出找到的文件与模型数量 |
| `--dry-run` | 仅输出将要变更的内容，不写入 |
| `--offline` | 不联网，使用仓库内 `catalog/` 快照 |
| `--snapshot <文件>` / `--from <地址>` | 指定快照来源 |
| `--emit <文件>` | 将当前线上模型导出为快照 |
| `--prune` | 移除网关已下线的模型（默认保留） |
| `--root <目录>` | 指定非默认安装位置的搜索目录 |

## 说明

- 修改的是安装目录内的文件；macOS 下若安装在 `/Applications`，可能需要 sudo。
- 每次写入前保留 `.bak-<时间戳>` 备份，可用于回滚。
- 目前在 Windows 上验证通过；Linux 与 macOS 尚未在实机验证。
- 模型列表来自 `https://opencode.ai/zen/go/v1/models`，元数据来自 [models.dev](https://models.dev)；`catalog/` 由 GitHub Actions 每日刷新。
- 本工具与 OpenCode、DataElement、DeepSeek 均无关联。

