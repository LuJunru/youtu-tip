# 配置目录

- `settings.default.json`：应用默认设置，Electron 首次运行时会复制到用户目录（macOS：`~/Library/Application Support/Tip/settings.json`）。包含 LLM、快捷键、功能开关（如 `features.guiAgentEnabled`、`features.youtuAgentEnabled`、`features.youtuAgentConfig`）。
- `settings.schema.json`：设置文件的 JSON Schema，供 Electron 与 Python Sidecar 校验/生成表单。
- `youtu-agent/configs`：Youtu-Agent 的内置 Hydra 配置（默认 `agents/simple/base`，示例 `agents/examples/file_manager` 与工具/model 配置）。PyInstaller 会将该目录打包到 Sidecar 产物中，运行时由 `YoutuAgentService` 自动发现。
