# all-about-arts

可由 Codex、Claude Code 和 Google Antigravity 调用的独立影片制作 Skill。完整包位于 `skills/all-about-arts/`，制作、修改、测试与扩展均使用包内代码和资料。

当前是 0.1.0 工程预览版。实现、实测结果以及尚未满足的 v1 条件见 [验收记录](acceptance.md)。八种风格已整合，尚不标成完成创作认证。

## 安装与使用

```sh
cd skills/all-about-arts
npm ci --ignore-scripts
node scripts/install.mjs --host both --root ../..
node scripts/aaa.mjs doctor --json
```

Codex 调用 `$all-about-arts`；Claude Code 调用 `/all-about-arts`。也可在影片任务中自动选择。新会话会读取新注册的 Skill。

### Google Antigravity

在 Antigravity App 或 IDE 中打开本仓库根目录，并开始新对话。当前版本使用 `.agents/skills/all-about-arts/`，与 Codex 共用同一个指向完整包的入口。无需重复复制 Skill 或增加全局规则。可以直接说：**“使用 all-about-arts 制作一支关于……的短片。”** Antigravity App 也支持 `/all-about-arts`；IDE 可在 Agent 侧栏的 Customizations 中检查 Skill。发现路径和调用方式依据 [Google 官方说明](https://antigravity.google/docs/skills)，核对日期为 2026-10-20。

需要重新注册项目入口时，在仓库根目录执行：

```sh
node skills/all-about-arts/scripts/install.mjs --host antigravity --root .
```

此命令保留已有的共享入口。`--host both` 仍表示原来的 Codex + Claude Code；其中 Codex 的项目入口也可被当前 Antigravity 发现。`--scope user --host antigravity` 对应 Antigravity App/IDE 的 `~/.gemini/config/skills/`，本仓库接入无需使用全局安装。

无需全局命令安装即可制作：

```sh
node skills/all-about-arts/scripts/aaa.mjs init /tmp/my-film --style dataviz --title "城市的用水变化"
node skills/all-about-arts/scripts/aaa.mjs studio /tmp/my-film
node skills/all-about-arts/scripts/aaa.mjs render /tmp/my-film --workers 2
node skills/all-about-arts/scripts/aaa.mjs export /tmp/my-film
```

生成器是起点，Agent 仍需根据题材设计镜头并修改代码。请查看 Skill 内的导演、项目、声音、素材、Studio 与质量参考。风格目录区分参考、整合和验收状态；不能把条目数量视为成片质量。

## 独立维护与持续改进

本项目不再保留三个原仓库，也不再运行来源锁更新、上游目录生成或原始路径基线对比。包内保留已移植的绘制代码、声音与编辑工具、51 种风格资料、许可证及历史署名。历史记录只说明初次移植来源，不限制现在的代码修改，也不需要定期更新。

八种引擎已整合；其余 43 种是参考资料，后续直接在本项目实现并验收。这个边界与是否保留原仓库无关。安装器的 `--copy --dependencies` 只复制独立包；软件依赖仍由 `package-lock.json` 固定，作品构建仍校验源码、素材和工具指纹。

Agent 可以通过 `learn <作品> list` 检索经验，通过 `learn <新作品> reuse --from <旧作品> --id <记录>` 复用经过验证的结论及证据。证据变更或缺失时会拒绝复用；用户偏好不会自动推广到其他作品。改进共享引擎或指令时，Agent 需实际修改代码、检查画面并运行对应回归测试。详见 [持续改进流程](../../skills/all-about-arts/references/evolution.md)。这是有证据的积累与迭代，不是模型自动训练；仅新增经验记录不会自动改写引擎。

## 验证

`npm test` 运行核心工具和浏览器测试。`node tests/all-about-arts/standalone.mjs` 把包复制到仓库外的临时目录，验证三个宿主入口、八种风格制作和经验迁移。`npm run acceptance` 运行八种风格、每种两个新题材的实际制作任务，产物保存在 `artifacts/all-about-arts/acceptance/`；验收报告记录画幅、帧数、错误、抽帧和未完成的人工评审项。`node tests/all-about-arts/host-evaluation.mjs` 用已安装且已登录的两种宿主执行独立的行为任务；不会自动购买额度、切换模型或降低权限限制。

需要 Node.js 22+、现有 Chrome/Chromium、FFmpeg/ffprobe。可选配音工具使用 Python 3.12 或现有本地/配置的语音服务。渲染不需要访问上游仓库或互联网。初次依赖安装需要 npm；模型和生成服务另行按需配置。
