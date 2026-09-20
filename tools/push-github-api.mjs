#!/usr/bin/env node
/**
 * push-github-api.mjs — 在没有 github.com 访问能力的环境里发布本仓库。
 *
 * 为什么需要它：这台机器（以及很多国内网络）里 github.com / ssh.github.com 连不通，
 * `git push` 会超时；但 **api.github.com 是通的**。于是这里直接用 GitHub 的
 * Git Data API 造 blob / tree / commit 并更新分支引用，等价于一次 push。
 *
 * 用法:
 *   set GITHUB_TOKEN=ghp_xxx          （Windows；建议先放进环境变量，别写进命令行历史）
 *   node tools/push-github-api.mjs [选项]
 *
 * 选项:
 *   --token-file <file>   从文件读取 token（比环境变量更适合临时使用）
 *   --repo <name>         仓库名（默认取 package.json 的 name）
 *   --owner <name>        目标账号/组织（默认取 token 所属用户）
 *   --branch <name>       分支（默认 main）
 *   --message <text>      提交信息
 *   --private             创建为私有仓库
 *   --dry-run             只打印将要提交的文件，不调用写接口
 *
 * 安全性：只读取 token，绝不打印；只写本仓库内容，不碰其它仓库。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const API = 'https://api.github.com';
const UA = 'dsh-ocgo-sync-publisher';

const SKIP_DIRS = new Set(['.git', 'node_modules', 'fixture', '.github/workflows/.cache']);
const SKIP_FILE = /(^|\/)(\.DS_Store|Thumbs\.db)$|\.bak-\d|\.log$|^_check/;

function parseArgs(argv) {
  const o = { branch: 'main', private: false, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const val = () => {
      const v = argv[i + 1];
      if (v === undefined) throw new Error(a + ' 需要一个参数');
      i += 1;
      return v;
    };
    if (a === '--token-file') o.tokenFile = val();
    else if (a === '--repo') o.repo = val();
    else if (a === '--owner') o.owner = val();
    else if (a === '--branch') o.branch = val();
    else if (a === '--message') o.message = val();
    else if (a === '--private') o.private = true;
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '-h' || a === '--help') o.help = true;
    else throw new Error('未知参数: ' + a);
  }
  return o;
}

function readToken(opts) {
  if (opts.tokenFile) {
    const t = fs.readFileSync(opts.tokenFile, 'utf8').trim();
    if (!t) throw new Error('token 文件是空的: ' + opts.tokenFile);
    return t;
  }
  const t = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  if (!t) {
    throw new Error('没有找到 token。请设置环境变量 GITHUB_TOKEN，或用 --token-file <文件>。\n'
      + '  PowerShell:  $env:GITHUB_TOKEN="ghp_xxx"   （只对当前窗口有效）');
  }
  return t.trim();
}

async function api(method, url, token, body) {
  const res = await fetch(url.startsWith('http') ? url : API + url, {
    method,
    headers: {
      authorization: 'Bearer ' + token,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': UA,
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = { raw: text }; }
  if (!res.ok) {
    const msg = json && json.message ? json.message : text.slice(0, 200);
    const err = new Error(method + ' ' + url + ' -> HTTP ' + res.status + ': ' + msg);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

function collectFiles(dir, base, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(base, abs).split(path.sep).join('/');
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || SKIP_DIRS.has(rel)) continue;
      collectFiles(abs, base, out);
    } else if (e.isFile()) {
      if (SKIP_FILE.test(rel)) continue;
      out.push({ rel, abs });
    }
  }
  return out;
}
function printHelp() {
  console.log([
    '',
    'push-github-api.mjs — 用 api.github.com 发布本仓库（不需要 git push / 不需要 github.com 可达）',
    '',
    '用法:',
    '  set GITHUB_TOKEN=ghp_xxx        (Windows cmd)',
    '  $env:GITHUB_TOKEN="ghp_xxx"     (PowerShell)',
    '  node tools/push-github-api.mjs [选项]',
    '',
    '选项:',
    '  --token-file <file>   从文件读取 token',
    '  --repo <name>         仓库名（默认 package.json 的 name）',
    '  --owner <name>        账号或组织（默认 token 所属账号）',
    '  --branch <name>       分支（默认 main）',
    '  --message <text>      提交信息',
    '  --private             建为私有仓库',
    '  --dry-run             只列出将上传的文件',
    '',
  ].join('\n'));
}

const TEXT_EXT = /\.(md|json|mjs|js|yml|yaml|txt)$/i;
/** 发布时把文档里的 M1012-w0917/dsh-ocgo-sync 占位符替换成真实账号与仓库名 */
function fileContent(rel, abs, owner, name) {
  const buf = fs.readFileSync(abs);
  if (!TEXT_EXT.test(rel)) return buf;
  return Buffer.from(buf.toString('utf8').replace(/OWNER\/[A-Za-z0-9._-]+/g, owner + '/' + name), 'utf8');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { printHelp(); return; }

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const name = opts.repo || pkg.name;
  const files = collectFiles(ROOT, ROOT, []).sort((a, b) => a.rel.localeCompare(b.rel));

  console.log('将发布 ' + files.length + ' 个文件到 ' + name + '（分支 ' + opts.branch + '）:');
  for (const f of files) console.log('  ' + f.rel.padEnd(42) + fs.statSync(f.abs).size + ' B');
  if (opts.dryRun) { console.log('\n[dry-run] 未调用任何写接口'); return; }

  const token = readToken(opts);
  const user = await api('GET', '/user', token);
  const owner = opts.owner || user.login;
  console.log('\n目标: ' + owner + '/' + name);

  try {
    await api('POST', '/user/repos', token, {
      name,
      description: pkg.description,
      private: !!opts.private,
      has_issues: true,
      has_wiki: false,
      auto_init: false,
    });
    console.log('已创建仓库');
  } catch (e) {
    if (e.status === 422) console.log('仓库已存在，继续');
    else throw e;
  }

  try {
    await api('PATCH', '/repos/' + owner + '/' + name, token, {
      description: pkg.description,
      topics: ['dsh', 'deepseek-harness', 'opencode', 'model-catalog'],
    });
    console.log('已更新仓库描述与 topics');
  } catch (e) {
    console.log('（更新仓库信息失败，忽略：' + e.message + '）');
  }

  let baseCommit = null;
  let baseTree = null;
  try {
    const ref = await api('GET', '/repos/' + owner + '/' + name + '/git/ref/heads/' + opts.branch, token);
    baseCommit = ref.object.sha;
    const c = await api('GET', '/repos/' + owner + '/' + name + '/git/commits/' + baseCommit, token);
    baseTree = c.tree.sha;
    console.log('基线提交 ' + baseCommit.slice(0, 8));
  } catch (e) {
    // 空仓库时 GitHub 返回 409 Git Repository is empty（不是 404）
    if (e.status !== 404 && e.status !== 409) throw e;
    // Git Data API 不能在没有提交的空仓库里建 blob，需要先用 Contents API 造首个提交
    console.log('仓库为空，先用 Contents API 初始化一个提交...');
    await api('PUT', '/repos/' + owner + '/' + name + '/contents/README.md', token, {
      message: 'chore: initialize repository',
      branch: opts.branch,
      content: Buffer.from('# ' + name + '\n').toString('base64'),
    });
    const initRef = await api('GET', '/repos/' + owner + '/' + name + '/git/ref/heads/' + opts.branch, token);
    baseCommit = initRef.object.sha;
    const initCommit = await api('GET', '/repos/' + owner + '/' + name + '/git/commits/' + baseCommit, token);
    baseTree = initCommit.tree.sha;
    console.log('初始化完成，基线提交 ' + baseCommit.slice(0, 8));
  }

  const tree = [];
  for (const f of files) {
    if (f.rel.startsWith('.github/workflows/')) continue;
    const blob = await api('POST', '/repos/' + owner + '/' + name + '/git/blobs', token, {
      content: fileContent(f.rel, f.abs, owner, name).toString('base64'),
      encoding: 'base64',
    });
    tree.push({ path: f.rel, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const workflows = files.filter((f) => f.rel.startsWith('.github/workflows/'));
  let workflowWarning = null;
  for (const f of workflows) {
    try {
      const blob = await api('POST', '/repos/' + owner + '/' + name + '/git/blobs', token, {
        content: fileContent(f.rel, f.abs, owner, name).toString('base64'),
        encoding: 'base64',
      });
      tree.push({ path: f.rel, mode: '100644', type: 'blob', sha: blob.sha });
    } catch (e) {
      workflowWarning = e.message;
      break;
    }
  }
  console.log('已上传 ' + tree.length + ' 个 blob');

  const newTree = await api('POST', '/repos/' + owner + '/' + name + '/git/trees', token,
    baseTree ? { base_tree: baseTree, tree } : { tree });

  const message = opts.message || 'chore: publish dsh-ocgo-sync';
  const commit = await api('POST', '/repos/' + owner + '/' + name + '/git/commits', token, {
    message,
    tree: newTree.sha,
    parents: baseCommit ? [baseCommit] : [],
  });
  console.log('新提交 ' + commit.sha.slice(0, 8));

  if (baseCommit) {
    await api('PATCH', '/repos/' + owner + '/' + name + '/git/refs/heads/' + opts.branch, token, { sha: commit.sha, force: false });
  } else {
    await api('POST', '/repos/' + owner + '/' + name + '/git/refs', token, { ref: 'refs/heads/' + opts.branch, sha: commit.sha });
  }

  console.log('');
  console.log('完成: https://github.com/' + owner + '/' + name);
  if (workflowWarning) {
    console.log('');
    console.log('注意: GitHub Actions 工作流文件没有上传成功。');
    console.log('      原因: token 缺少 workflow 权限（GitHub 要求单独授权）。');
    console.log('      处理: 去 token 设置里勾选 workflow 后重跑，或忽略（仓库功能不受影响）。');
  }
}

main().catch((e) => {
  console.error('失败: ' + e.message);
  if (e.status === 401) console.error('提示: token 无效或已过期。');
  if (e.status === 403) console.error('提示: token 权限不足（需要 repo 权限；上传工作流还需 workflow 权限）。');
  process.exitCode = 1;
});