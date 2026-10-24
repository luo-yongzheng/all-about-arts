# Lemo 完整迁移与质量问题分析

本次将用户提供的本地 `lemo-opuscar` 制作资源迁入 Skill 的 [vendor/lemo-opuscar](../../.agents/skills/all-about-arts/vendor/lemo-opuscar/)，恢复原先抽取式移植缺少的导演方法、完整引擎、示例、素材记录和工具。来源固定为提交 `3961ddb3d24d8876e0e2754f7790d66908acee51`，不依赖原始下载目录，也没有拉取新的上游版本。

按后续清理要求，已删除 15 个未使用的上游安装、插件入口和发布文件，共 159,399 字节。`vendor` 仍保留：原生渲染命令直接执行其中的工具，59 套风格的引擎与示例也在这里，并非无用途的备份。两个嵌套 `SKILL.md` 已移除，避免被额外识别为独立技能。导入脚本会持续排除这些文件，来源清单保留被排除文件的校验记录。

## 为什么作品容易同质化

以下是迁移前代码与资料的检查结果，说明了制作能力受限的原因；本次没有据此给所有既有成片打分。

| 迁移前的事实 | 对创作的影响 |
| --- | --- |
| 目录列出 51 种风格，`runtime/film.mjs` 与 `lib/project.mjs` 只接受八种内置风格 | 其余风格虽有说明，却没有同等直接的创作入口；容易反复选用少数 starter |
| 八种内置渲染器中五种使用 `runtime/common.mjs` 的 `copyPanel`：横版固定为左侧标题、右侧图形 | 水墨、厚涂、纸雕、玻璃、白板共享版式，媒介差异被文字卡片结构削弱 |
| 默认场景为三段等长的 establish / develop / resolve；多个主体只有两种预设 | 改标题、标签和数值即可出片，但镜头、主体和故事容易停留在示例范围 |
| `styles/upstreams.json` 记录了玻璃移植省略产品 rig 和反射 shader；水墨只抽取了部分笔触工具 | 原作的镜面、焦散、人物、纸张合成、书法、摄影与场景调度无法仅靠调参恢复 |
| 原声音说明明确只有种子琶音、低音及两类合成音色，默认关闭音乐 | 缺少原库按媒介配器、拟音、节拍设计、采样乐器和完整混音方法 |
| 复制的 STYLE.md 的 Engine 段引用 `demo/`、DEMO.md 和专用工具，但这些文件没有一并保存 | 描述了能力，却没有提供学习和实现它所需的完整技术材料 |

因此，改进应同时恢复完整材料和创作路径，并要求每部片重新设计题材、镜头、声音与节奏。单纯增加风格名称、通过渲染测试或调高分辨率不能证明艺术质量提高。

## 保存了什么

以迁移前 Skill 为基线，文件统计均排除 `.git` 和 `node_modules`。

| 项目 | 迁移前 | 本次保存的 Lemo 快照 |
| --- | ---: | ---: |
| 文件数 | 199 | 2,289（原始快照 2,304，排除 15） |
| 文件总字节 | 2,525,909 | 104,869,201 |
| 主要风格 | 51 份参考，八种内置渲染器 | 59 套风格及一个维护模板 |
| 示例目录中的文件 | 仅部分抽取代码 | 1,686 |
| 示例专用工具文件 | 未完整保存 | 250 |
| 风格示例入口、CREDITS、poster、styleframe | 未完整保存 | 各 59 |

新增的八种风格均属于「剪辑与纪实」：字幕新闻、1920s 新闻影片、实时倒计时分屏、延时交响、视觉调查、构成主义蒙太奇、体育战术板、电视新闻包装。已有参考中另有 11 份与本地新版本不同，旧记录保留为历史来源，不再代表新快照。

制作库包含导演与制作指南、个人风格工作流、全部 `core/`、全部风格与示例源代码、事实和素材记录、字幕、静帧、图库、维护检查工具、依赖清单和许可证。未使用的 `.claude-plugin/`、`.github/`、`plugin/`、`tools/directory/`、`tools/directory.py`、`tools/publish.sh`、`tools/web_cuts.sh` 和 `CLAUDE.md` 已删除。`tools/release.py` 保留其风格完整性与资源引用检查；`docs/` 图片仍被说明文档引用。五个 `.gitignore` 保存为 `.gitignore.upstream`，避免其规则影响宿主仓库；保留文件内容不变。逐文件来源路径、保存路径、大小和 SHA-256 见 [快照清单](../../.agents/skills/all-about-arts/provenance/lemo-snapshot.json)。

能力入口见 [Lemo 能力导航](../../.agents/skills/all-about-arts/references/lemo-capabilities.md)。八种旧渲染器、Studio、项目修订、经验记录及 Huashu 的已有移植继续保留；它们与完整 Lemo 源码用途不同。

## 59 套风格与 98 条电影参考

[styles/README.md](../../.agents/skills/all-about-arts/vendor/lemo-opuscar/styles/README.md) 中的 **59 套风格**各自拥有 STYLE.md、DEMO.md、示例入口、元数据和静帧。

[opuscar98_styles.json](../../.agents/skills/all-about-arts/vendor/lemo-opuscar/styleboard/opuscar98_styles.json) 是另一套 **98 条电影风格参考**，含十个年代章节、双语提示词、画面与镜头信息。它可以扩展视觉方向，但不是另外 98 套完整可运行引擎。上游明确没有包含 OPUSCAR 98 长片的制作源码，因此不能把两者相加后宣称提供 157 套已实现风格。

## 外置素材和许可

完整本地快照仍不等于每个示例都能离线重建。这个来源版本没有 MP4、WAV、MP3、FLAC、ONNX、HDR 或 TTF 文件；只包含八个共用 WOFF2 字体子集，以及已提交的图片、模型和纹理。共用中文显示字体只有约 200 个字，不足以覆盖任意中文文案。

[tools/assets.json](../../.agents/skills/all-about-arts/vendor/lemo-opuscar/tools/assets.json) 保存七个外置包的大小与校验值，总计 1,787,770,880 字节，涵盖语音模型、HDRI 和五套乐器采样。示例各自还可能需要字体、原始档案影像、扫描件、卫星数据、CAD 或其他公开数据。它们的来源、处理脚本与使用条件已保存，文件本身不能因有下载地址就算已安装。下载与在线语音应按具体任务需要处理。

| 材料 | 保留的许可边界 |
| --- | --- |
| Lemo 代码与文档 | MIT，保留 LemoLab 版权与许可文本 |
| 示例成片与静帧 | 上游 README 声明 CC BY 4.0；使用时署名 LemoLab、链接来源并说明修改 |
| 字体、采样、模型、纹理及档案素材 | 各自保留原许可；查阅 OFL、Poly Haven SOURCES、INSTRUMENTS.md 与每例 CREDITS |
| 三类示例声音 | game-show 的 macOS 系统声音、paper-lantern 的 Edge TTS、news-package 的 Doubao TTS 明确排除在示例 CC BY 4.0 授权之外；不能按该授权复用 |
| 用户自己制作的作品 | 上游不要求 LemoLab 片尾或水印；作品实际使用的第三方素材仍适用各自条件 |

完整说明见 [THIRD_PARTY.md](../../.agents/skills/all-about-arts/THIRD_PARTY.md)。制作所需的素材获取工具仍保留；上游插件安装和发布脚本已经移除。原始手册中的相关安装说明仅为历史资料，本 Skill 的实际用法以 [原生制作指南](../../.agents/skills/all-about-arts/references/native-lemo.md) 为准。

## 验证范围

### 制作入口与实际引擎

继续使用 `.agents/skills/all-about-arts` 即可：完整包已直接存放在此目录，不再通过符号链接指向其他位置。原来的仓库根目录 `skills/` 已移除；Claude 入口只链接到 `.agents` 中的同一份文件。新片默认采用完整风格源码的原生制作流程，已有 `aaa.json` 项目继续使用旧 Studio 流程。`lemo init` 只生成明确标为未完成的工程，后续必须按题材编写场景、镜头和声音，不能直接把初始化画面当成成片。

独立评估已使用真实引擎完成白板和纸雕的最小制作验证，均渲染了三张 1920×1080 检查帧。白板调用完整 Board/Camera/Pen/Timeline；纸雕调用原始材质、七层纸片、透光、阴影、景深与 bloom。两个项目在 3 秒、5 秒的正向与倒序取帧哈希一致。另成功生成一段古琴拨弦与点击音，未进行听觉检查。源码、检查帧和逐项记录见 [原生引擎实测](../../artifacts/all-about-arts/lemo-migration-smoke/native-engine-checks/REPORT.md)。

这次还验证了中文陷阱：白板 EMSTech 有 187 个字形，但没有中文字形，中文会变成 `????`；文字时长检查仍可能通过。已在制作指南中要求单独检查中文字形和笔画数据，不能把普通字体安装或自动读取时长检查当作中文手写支持。纸雕示例依赖的四个中文字体也需要另行准备。

上述验证证明原生工具和材质引擎可用，没有产出完整委托影片，也没有进行整片叙事、科学内容或有声质量认证。

初次完整迁移时核对了全部 2,304 个文件，文件大小与 SHA-256 均匹配。随后清理未使用的包装文件，再次验证全部 2,289 个保留文件的校验值，并通过 11 项迁移与原生制作测试，包括实际静帧、视频、阅读检查及复制安装后的渲染。重复清理删除零个文件，确认可安全重复执行。

随后通过 `aaa lemo still` 对三个未修改的原始示例按顺序尝试取帧，尺寸均为 1920×1080；每次只启动一个浏览器，单项设置 60 秒终止边界，不下载素材。实际结果如下，完整命令和退出信息见 [检查记录](../../artifacts/all-about-arts/lemo-migration-smoke/results.json)。

| 示例与时间点 | 实际结果 | 日志 |
| --- | --- | --- |
| whiteboard，20 秒 | 1.21 秒后退出 1；`ArchitectsDaughter-Regular.ttf` 返回 404，随后页面报网络错误；没有生成静帧 | [whiteboard/run.log](../../artifacts/all-about-arts/lemo-migration-smoke/whiteboard/run.log) |
| paper-lantern，10 秒 | 1.95 秒后退出 1；ZhiMangXing、LongCang、MaShanZheng、NotoSerifSC 四个 TTF 返回 404，随后页面报网络错误；没有生成静帧 | [paper-lantern/run.log](../../artifacts/all-about-arts/lemo-migration-smoke/paper-lantern/run.log) |
| news-package，18.4 秒 | 1.15 秒后退出 1；`assets/plate_datacenter.jpg`、`plate_wafer.jpg` 返回 404，页面错误指向前者；没有生成静帧 | [news-package/run.log](../../artifacts/all-about-arts/lemo-migration-smoke/news-package/run.log) |

三个检查均未超时，也没有可供视觉评审的成功静帧。新闻包装的两张原始插图实际保存在 `assets/plates/`；[tools/prep.py](../../.agents/skills/all-about-arts/vendor/lemo-opuscar/styles/news-package/demo/tools/prep.py) 负责生成页面要求的处理后图片，本次没有运行该预处理或修改 vendor。字体缺失与预处理未完成属于具体示例的准备状态，不能据此说原始文件没有完整迁入，也不能声称这些示例已可直接出图。

### 自动化与可搬移性验证

- 完整 `npm test`：**102 项通过，0 失败、0 跳过**，包括旧八种引擎、Studio、声音、修订、导出和新增原生工具。[完整日志](../../artifacts/all-about-arts/lemo-migration-smoke/verification/npm-test.log)。
- 随后补充了导出包内原生工具的实际运行场景，重现并修复临时依赖链接被重复复制的问题；修正后，导出与迁移专项 **7 项通过，0 失败、0 跳过**。包含旧影片搬移后重建，以及从导出工具包初始化并取帧原生作品。[复测日志](../../artifacts/all-about-arts/lemo-migration-smoke/verification/export-native-tests.log)。
- 原生专项覆盖调用者相对路径、中文与空格路径、Chrome 路径别名、Three.js 资源、文字时长错误、真实 MP4、独立复制安装后的原生绘制；9 项全部通过。
- Skill 格式校验、活动指南本地链接检查、文件校验和补丁空白检查通过。风格目录现在明确标注旧预设限制的适用范围，避免把纸雕的旧 Canvas 限制误认为完整原生引擎的限制。

初轮并发验证发现浏览器别名兼容问题，已修正；原有取消测试在并发负载下也触发过超时，未确认资源泄漏，后续独立复查及完整串行回归均通过。全量 59 个原始示例的素材准备与重建、完整新片的有声播放评审未进行。完整保存和技术通过不能替代具体影片的艺术与内容验收。
