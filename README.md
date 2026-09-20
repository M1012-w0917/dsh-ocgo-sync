# dsh-ocgo-sync

DeepSeek Harness 的模型清单不在设置里，而是 `pi-ai` 包里的一份数据文件：

    @earendil-works/pi-ai/dist/providers/data/opencode-go.json

**网页版**（命令行启动、在浏览器里用的那个）每次启动会自己同步这份文件，**桌面版**（DSH Desktop）不会 —— 它用的还是打包时冻结的那一份。

所以经常出现这种情况：网关早就上了 `deepseek-v4.1-flash`，网页版里能选，桌面版的选择器翻到底也只有 `deepseek-v4-flash`。

下面这个脚本跑一次，把两边都刷成最新的。它会自己找文件（两边都找，指向同一份物理文件的只改一次），改之前备份，改完回读校验。

## 用法

```bash
curl -L -H "Accept: application/vnd.github.raw" -o sync.mjs \
  https://api.github.com/repos/M1012-w0917/dsh-opencode-go-sync/contents/bin/dsh-ocgo-sync.mjs

node sync.mjs --dry-run    # 先看看会改哪些文件
node sync.mjs              # 确认没问题再执行
```

Windows PowerShell 里把 `curl` 换成 `curl.exe`。

---

## 一、网页版

模型清单在这里：

    ~/.dsh-runtime/node_modules/.pnpm/@earendil-works+pi-ai@.../dist/providers/data/opencode-go.json

顺带一提，它**每次启动本来就会自己同步**，所以正常情况下你不需要管它。跑这个脚本的意义是：不想重启、想立刻刷新模型列表的时候用一下。

**生效方式**：重新跑一次启动脚本。

## 二、桌面版

模型清单在安装目录里：

    %LOCALAPPDATA%\Programs\DSH Desktop\resources\app\node_modules\@earendil-works\pi-ai\dist\providers\data\opencode-go.json

（`%APPDATA%\dsh-desktop` 里那份 profile 也有同名文件，但它是指向上面这个的链接，物理上只有一份。）

两件事要注意：

**1. 必须重启，而且只关窗口不算退出。**

桌面版会另起一个 node 进程跑 harness。那个进程没退干净的话，会一直占着会话的写句柄，界面报 `SessionAlreadyOwnedError` —— 看起来像是模型坏了，其实是旧进程没走。任务管理器里确认没有残留的 `node.exe` 再重开。

**2. 桌面版升级后会覆盖安装目录。**

升级完那份冻结的清单又回来了，重跑一次这个脚本就行。

---

## 参数

| 参数 | 说明 |
| --- | --- |
| `--list` | 只列出找到的文件和模型数量 |
| `--dry-run` | 只打印会改什么，不写盘 |
| `--offline` | 不联网，配合 `--snapshot` 或 `--from` 使用 |
| `--snapshot <文件>` / `--from <地址>` | 指定离线快照 |
| `--emit <文件>` | 反过来，把当前线上模型导出一份快照 |
| `--prune` | 删掉网关已下线的模型（默认保留） |
| `--root <目录>` | 装在非默认位置时指定搜索目录 |

## 说明

- 改的是 app 目录里的文件，macOS 装在 `/Applications` 时可能需要 sudo。
- 覆盖前会留 `.bak-<时间戳>`，出问题拷回去就行。
- 只在 Windows 上实测过。
- 模型列表来自 `https://opencode.ai/zen/go/v1/models`，元数据（上下文长度、价格、推理档位）来自 [models.dev](https://models.dev)。

跟 OpenCode、DataElement、DeepSeek 都没有关系。