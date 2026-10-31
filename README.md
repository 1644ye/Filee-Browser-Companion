# Filee Browser Companion

独立的社区 Chrome 插件，为[官方 Filee](https://github.com/KnifeLemon/Filee/releases/latest)补充网页图片、SVG 和直链视频拖拽。无需安装修改版 Filee、后台服务或 Native Messaging。不是 Filee 官方发布的扩展。

## 朋友下载安装

1. 从官方 Filee Releases 安装 Windows 版本并启动。视频转换还需要在 Filee 的“设置 → 转换引擎”安装 FFmpeg；仅保存原文件不需要。
2. 从本仓库 Releases 下载 `Filee-Browser-Companion-0.6.0.zip`，解压到一个长期保留的文件夹。
3. Chrome 地址栏输入 `chrome://extensions`，开启右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择解压后的 **extension** 文件夹（其中应有 `manifest.json`）。
5. 刷新已经打开的网站。若装过旧版 Filee SVG Drag，先停用旧插件，避免两套拖拽逻辑同时运行。

GitHub ZIP 不能直接拖进 Chrome 自动安装；本项目尚未上架 Chrome 网上应用店。更新时解压新包，重新加载扩展并刷新网页。不要删除已加载的文件夹。

## 使用

- **转换：**按住 Ctrl 拖网页图片、SVG 图案或直链视频，在 Filee 圆盘上选择目标格式。选中一个完整、合法的 `<svg>…</svg>` 代码后也可 Ctrl 拖拽。
- **保存原文件：**右键图片、SVG 或视频，选择 **Filee：原文件另存为… / Save original as…**。Chrome 的保存对话框允许改名和选目录；初始目录由 Chrome 管理。
- Filee 2.2.0 尚未提供新版“复制到文件夹”工具。插件的右键另存为用于原文件下载；圆盘仍由你安装的 Filee 提供。
- Filee 处理的转换结果请在 Filee 历史记录/输出目录查看；不会额外制造 Chrome 临时下载记录。右键另存为由 Chrome 下载，因此出现在 Chrome 下载记录中。

## 支持范围

| 内容 | Ctrl 拖到官方 Filee | 原文件另存为 |
| --- | --- | --- |
| 网页图片、高分辨率 srcset 图片、覆盖链接的横幅 | 支持 | 图片元素支持 |
| 内联 SVG、继承颜色、渐变、同页 defs 引用 | 支持 | 支持 |
| 单个完整 SVG 代码选区 | 支持 | 支持 |
| 带文件扩展名的 HTTP(S) 视频直链，例如 MP4/WebM | 支持 | 支持 |
| 无扩展名的视频直链 | 不支持交给 Filee 2.2.0 | 可尝试，取决于服务器响应 |
| blob/MediaSource、HLS、DASH、DRM | 不支持 | 不支持 |

混合 HTML、多段 SVG、转义代码、依赖外部图片/字体/CSS 的 SVG 不在本版本支持范围内。SVG 动画不会导出为动画。登录态、Referer 防盗链和网站限制可能使 Filee 下载失败；插件不绕过保护。iframe、封闭 Shadow DOM 和移动触摸模拟未提供通用支持；Chrome 手机模拟请使用 **Mobile (no touch)** 以保留原生鼠标拖拽。

网页中的视频切换后，插件会在开始拖拽/另存为时重新核对源地址，不沿用旧的 `currentSrc`。SVG 的计算后颜色写入标准表现属性，提高本地图片查看器兼容性。

## 排查

- **出现重叠的两个圆盘：**检查是否同时运行安装版、便携版或开发版 Filee。退出多余实例，只运行一个。插件不会创建 Filee 圆盘，也不会启动第二个 Filee。
- **没有响应：**确认 Filee 正在运行，网页刷新过；点击扩展图标可向已打开的普通网页注入脚本。Chrome 内部页面不支持。
- **扩展图标显示 `!`：**把鼠标停在扩展图标上查看错误提示。取消另存为也可能显示提示；取消不会保存文件。
- **SVG 看起来是黑色：**更新到本版并重新导出；旧文件不会自动修改。

## 权限与隐私

`http://*/*`、`https://*/*` 用于在网页上监听 Ctrl 拖拽并读取目标元素及其样式；`scripting` 用于手动激活已有页面；`contextMenus` 创建另存为菜单；`downloads` 由 Chrome 保存用户主动选择的原文件。不收集或上传页面内容，不提供分析统计，不使用远程脚本，不读取本地任意文件。

## 开发与测试

无需打包依赖，`extension/` 可直接加载。Chrome DOM 回归：`python tests/run.py --chrome "Chrome可执行文件路径"`。后台逻辑：`node tests/background.test.mjs`。`tests/manual.html` 是原生拖拽测试页面，需要通过本地 HTTP 服务访问；自动 DOM 测试不等于原生 OS 拖拽验证。

源自 1644ye/Filee 的浏览器扩展工作（上游讨论 #816），保留 MIT 许可和 Filee 贡献者署名。此仓库独立维护，不向上游提交伴侣扩展。
