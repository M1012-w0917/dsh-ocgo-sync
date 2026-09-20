# dsh-ocgo-sync

让 **DSH**（CLI 运行时 / DSH Desktop）**快速同步 OpenCode Go 模型清单**。

[English](README.en.md) · 简体中文

---

## 问题

DSH 的模型清单不是一个配置项，而是 `pi-ai` 包内的一份数据文件：

```
@earendil-works/pi-ai/dist/providers/data/opencode-go.json
```

| | 这份文件的行为 |
|---|---|
| **CLI 运行时**（`~/.dsh-runtime`） | 每次启动会用它自己的同步脚本刷新 ✅ |
| **DSH Desktop** | 出厂之后**永不更新**，所以新模型永远不出现 ❌ |

典型症状：网关早就上线了 `deepseek-v4.1-flash`，CLI 里能选，**桌面版的模型选择器里却只有 `deepseek-v4-flash`**。

## 快速调用

### 方式 1：单文件，下载即用（推荐；`github.com` 打不开也能用）

```bash
curl -L -H "Accept: application/vnd.github.raw" -o sync.mjs \
  https://api.github.com/repos/M1012-w0917/dsh-ocgo-sync/contents/bin/dsh-ocgo-sync.mjs
node sync.mjs --dry-run      # 先预演，看会改哪些文件
node sync.mjs                # 正式同步
```

Windows PowerShell 里把 `curl` 换成 `curl.exe`：

```powershell
curl.exe -L -H "Accept: application/vnd.github.raw" -o sync.mjs https://api.github.com/repos/M1012-w0917/dsh-ocgo-sync/contents/bin/dsh-ocgo-sync.mjs
node sync.mjs
```

> 单文件模式想用离线快照，把快照地址也指过去即可（同样走 API 域名）：
> `node sync.mjs --offline --from https://api.github.com/repos/M1012-w0917/dsh-ocgo-sync/contents/catalog/opencode-go.json`

### 方式 2：下载整个仓库

```bash
curl -L -o sync.zip https://api.github.com/repos/M1012-w0917/dsh-ocgo-sync/zipball/main
# 解压后进入目录
node bin/dsh-ocgo-sync.mjs
```

### 方式 3：网络畅通时

```bash
npx github:M1012-w0917/dsh-ocgo-sync
```

## 解决

它会自动找到机器上**所有**这份文件（CLI + DSH Desktop，跨 Junction/Symlink 去重），
用「网关模型列表 + models.dev 元数据」重建，就地替换，并：

- 覆盖前自动备份 `<文件>.bak-<时间戳>`
- 覆盖后重新读取校验，数量不符就报错
- **保留**既有描述符里的 `compat` / `thinkingLevelMap`（新模型按同族最长前缀继承）
- 不动 API Key，不碰任何凭据文件

## 用法

```
node bin/dsh-ocgo-sync.mjs [选项]
```

| 选项 | 说明 |
|---|---|
| `--list` | 只列出找到的目录文件与当前模型数 |
| `--dry-run` | 显示将要发生的变更，不写盘 |
| `--offline` | 不联网，改用仓库内的 `catalog/` 快照 |
| `--snapshot <file>` | 指定快照文件（配合 `--offline`） |
| `--from <url>` | 指定快照 URL |
| `--prune` | 删除网关已下线、快照里也没有的模型（默认保留） |
| `--emit <file>` | 只生成一份快照文件（维护本仓库用） |
| `--root <dir>` | 追加搜索根目录（装在非默认位置时） |

典型输出：

```
发现 2 个目录文件:
  - C:\Users\me\.dsh-runtime\node_modules\.pnpm\@earendil-works+pi-ai@0.85...\dist\providers\data\opencode-go.json
      当前模型数: 38
  - C:\Users\me\AppData\Local\Programs\DSH Desktop\resources\app\node_modules\@earendil-works\pi-ai\dist\providers\data\opencode-go.json
      当前模型数: 27（2 个路径指向它，已按物理文件去重）

> ...\DSH Desktop\...\opencode-go.json
  27 -> 38 个模型
  新增: deepseek-v4.1-flash, deepseek-flash, glm-5, grok-4.5, kimi-k2.5, ...
  已写入 24.5 KB，备份 opencode-go.json.bak-20260920-131635
```

## 生效

**必须重启对应的 DSH**（模型清单在启动时加载一次）：

- **DSH Desktop**：完全退出后重新打开。
  注意：只关窗口不够，确认任务管理器里没有残留的 `node.exe`（桌面版自带的 harness），
  否则它可能占着会话句柄，导致界面报 `SessionAlreadyOwnedError`。
- **CLI 运行时**：重新跑一次启动脚本即可。

## 常见问题

**Q: 我是 DSH Desktop 用户，模型选择器里看不到新模型？**
先跑 `--list` 看桌面版那份文件是不是比 CLI 那份旧。是的话跑一次同步即可。

**Q: 桌面版升级之后又没了？**
App 升级会覆盖安装目录，里面那份出厂文件会回来。重新跑一次本工具就行。

**Q: 完全连不上外网 / 网关不可达？**
用 `--offline`，它会套用仓库里的 `catalog/opencode-go.json`（本仓库的 GitHub Actions 每天自动刷新）。

**Q: 网络受限，`github.com` 打不开？**
本工具只依赖 `opencode.ai` 与 `models.dev`（通常都直连可用）。
拿仓库本身可以走 API 域名：

```bash
curl -L -o sync.zip https://api.github.com/repos/M1012-w0917/dsh-ocgo-sync/zipball/main
```

**Q: 会不会破坏我的配置？**
本工具只改那**一份数据文件**，每次覆盖前都留 `.bak-<时间戳>` 备份，改完立即回读校验。
出问题直接把备份拷回去即可。

## 数据来源与声明

- 模型**列表**：`https://opencode.ai/zen/go/v1/models`（公开接口）
- 模型**元数据**（上下文长度、价格、推理档位等）：[models.dev](https://models.dev)（MIT）
- 本仓库不做任何代理、不转发请求、不保存任何密钥；`catalog/` 里只是模型描述符的公开元数据。
- 与本项目无关的商标归各自所有者。