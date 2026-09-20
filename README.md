# dsh-ocgo-sync

DSH 的模型清单不在设置里，藏在 `pi-ai` 这个包里面：

    @earendil-works/pi-ai/dist/providers/data/opencode-go.json

命令行版（`~/.dsh-runtime`）每次启动都会自己去同步这份文件，桌面版不会 —— 它用的还是打包时冻结的那一份。

结果就是：网关早就上了 `deepseek-v4.1-flash`，你在命令行版里能选，桌面版的选择器翻到底也只有 `deepseek-v4-flash`。

这个脚本负责把两边都刷成最新的：自己找文件（命令行版和桌面版都会找，指向同一份物理文件的会去重，只改一次），改之前备份，改完立刻回读校验。

## 怎么用

推荐单文件方式，不用 clone、不用 git：

```bash
curl -L -H "Accept: application/vnd.github.raw" -o sync.mjs \
  https://api.github.com/repos/M1012-w0917/dsh-opencode-go-sync/contents/bin/dsh-ocgo-sync.mjs

node sync.mjs --dry-run   # 先看看会改哪些文件
node sync.mjs             # 确认没问题再执行
```

Windows PowerShell 里把 `curl` 换成 `curl.exe`。

装了 git 的也可以用 npx：

```bash
npx github:M1012-w0917/dsh-opencode-go-sync
```

这条依赖 `git` 命令，没有的话会报 `spawn git ENOENT`，用上面的单文件方式就行。

## 改完记得重启

模型清单只在启动时读一次，得重启 DSH 才生效。

桌面版有个坑：只关窗口不算退出。DSH Desktop 会另起一个 node 进程跑 harness，那个进程没退干净的话会一直占着会话的写句柄，界面会报 `SessionAlreadyOwnedError` —— 看起来像是模型坏了，其实是旧进程没走。任务管理器里确认没有残留的 `node.exe` 再重开。

## 参数

| 参数 | 说明 |
| --- | --- |
| `--list` | 只列出找到的文件和模型数量 |
| `--dry-run` | 只打印会改什么，不写盘 |
| `--offline` | 不联网，用仓库里的 `catalog/opencode-go.json` |
| `--snapshot <file>` / `--from <url>` | 指定快照文件或地址 |
| `--prune` | 删掉网关已下线的模型（默认保留） |
| `--root <dir>` | 装在非默认位置时指定搜索目录 |

## 几点实话

- 桌面版升级后会覆盖安装目录，那份冻结的清单又回来了，得重跑一次。
- 改的是 app 目录里的文件，macOS 装在 `/Applications` 时可能需要 sudo。
- 只在 Windows 上实测过。Linux/macOS 只有 CI 里拿假目录跑的冒烟测试，没在真机验证。
- 只动那一个 json，覆盖前留 `.bak-<时间戳>`，出问题拷回去就行。

## 数据来源

模型列表来自 `https://opencode.ai/zen/go/v1/models`，元数据（上下文长度、价格、推理档位）来自 [models.dev](https://models.dev)（MIT）。

仓库里的 `catalog/` 是 GitHub Actions 每天刷新的快照，给不方便一直联网的人用。

跟 OpenCode、DataElement、DeepSeek 都没有关系，`catalog/` 里只是公开的模型元数据。