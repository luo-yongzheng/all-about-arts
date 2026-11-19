# all-about-arts

可由 Codex、Claude Code 和 Google Antigravity 调用的独立影片制作 Skill。完整包位于 `.agents/skills/all-about-arts/`，制作、修改、测试与扩展均使用包内代码和资料。

当前是 0.1.0 工程预览版。实现、实测结果以及尚未满足的 v1 条件见 [验收记录](acceptance.md)。八种风格已整合，尚不标成完成创作认证。

## 安装与使用

```sh
cd .agents/skills/all-about-arts
npm ci --ignore-scripts
node scripts/install.mjs --host both --root ../../..
node scripts/aaa.mjs doctor --json
```

Codex 调用 `$all-about-arts`；Claude Code 调用 `/all-about-arts`。也可在影片任务中自动选择。新会话会读取新注册的 Skill。

### Google Antigravity

在 Antigravity App 或 IDE 中打开本仓库根目录，并开始新对话。当前版本使用 `.agents/skills/all-about-arts/`，与 Codex 共用这里的唯一完整包。无需重复复制 Skill 或增加全局规则。可以直接说：**“使用 all-about-arts 制作一支关于……的短片。”** Antigravity App 也支持 `/all-about-arts`；IDE 可在 Agent 侧栏的 Customizations 中检查 Skill。发现路径和调用方式依据 [Google 官方说明](https://antigravity.google/docs/skills)，核对日期为 2026-10-20。

需要重新注册项目入口时，在仓库根目录执行：

```sh
node .agents/skills/all-about-arts/scripts/install.mjs --host antigravity --root .
```

此命令保留已有的共享入口。`--host both` 仍表示原来的 Codex + Claude Code；其中 Codex 的项目入口也可被当前 Antigravity 发现。`--scope user --host antigravity` 对应 Antigravity App/IDE 的 `~/.gemini/config/skills/`，本仓库接入无需使用全局安装。

无需全局命令安装即可制作：

```sh
node .agents/skills/all-about-arts/scripts/aaa.mjs init /tmp/my-film --style dataviz --title "城市的用水变化"
node .agents/skills/all-about-arts/scripts/aaa.mjs studio /tmp/my-film
node .agents/skills/all-about-arts/scripts/aaa.mjs render /tmp/my-film --workers 2
node .agents/skills/all-about-arts/scripts/aaa.mjs export /tmp/my-film
```

生成器是起点，Agent 仍需根据题材设计镜头并修改代码。请查看 Skill 内的导演、项目、声音、素材、Studio 与质量参考。风格目录区分参考、整合和验收状态；不能把条目数量视为成片质量。

## 独立维护与持续改进

包内保存 Lemo-Opuscar 2.0.x 制作资源（提交 `00a7f9e`）：99 套风格、完整示例与工具、导演方法、个人风格流程和图库。共核对 3,942 个来源文件，保留 3,922 个，排除 20 个未使用的上游安装与发布文件；Huashu 的既有移植与历史署名继续保留。八种旧内置渲染器仍可兼容使用，完整 Lemo 制作源码也可供独立页面创作。98 条电影风格参考与这 99 套风格分别统计。范围、质量问题、外置资源、许可与验证状态见 [Lemo 迁移报告](lemo-migration.md)。

**许可提示：** 自 2.0.0 起，上游代码仍为 MIT，但全部文档（含各风格 STYLE.md/DEMO.md 及其在 `references/styles` 的副本）改为 CC BY-NC 4.0，并额外允许用于制作自己的影片（含商业与客户影片）；示例影片与静帧为 CC BY 4.0。本仓库根目录的 MIT `LICENSE` 不覆盖这些 vendored 文档，详见 [THIRD_PARTY.md](../../.agents/skills/all-about-arts/THIRD_PARTY.md)。

日常制作不依赖原始下载目录，也不自动更新上游。安装器的 `--copy --dependencies` 复制独立包；软件依赖由 `package-lock.json` 固定，作品构建校验源码、素材和工具指纹。保存完整源码不表示所有外置素材已经安装或每种风格已经通过成片验证。

Agent 可以通过 `learn <作品> list` 检索经验，通过 `learn <新作品> reuse --from <旧作品> --id <记录>` 复用经过验证的结论及证据。证据变更或缺失时会拒绝复用；用户偏好不会自动推广到其他作品。改进共享引擎或指令时，Agent 需实际修改代码、检查画面并运行对应回归测试。详见 [持续改进流程](../../.agents/skills/all-about-arts/references/evolution.md)。这是有证据的积累与迭代，不是模型自动训练；仅新增经验记录不会自动改写引擎。

## 验证

`npm test` 运行核心工具和浏览器测试。`node tests/all-about-arts/standalone.mjs` 把包复制到仓库外的临时目录，验证三个宿主入口、八种风格制作和经验迁移。`npm run acceptance` 运行八种风格、每种两个新题材的实际制作任务，产物保存在 `artifacts/all-about-arts/acceptance/`；验收报告记录画幅、帧数、错误、抽帧和未完成的人工评审项。`node tests/all-about-arts/host-evaluation.mjs` 用已安装且已登录的两种宿主执行独立的行为任务；不会自动购买额度、切换模型或降低权限限制。

需要 Node.js 22+、现有 Chrome/Chromium、FFmpeg/ffprobe。可选配音工具使用 Python 3.12 或现有本地/配置的语音服务。渲染不需要访问上游仓库或互联网。初次依赖安装需要 npm；模型和生成服务另行按需配置。
