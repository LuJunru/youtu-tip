# Youtu-Tip 端侧AI助手

Tip 是一个主动式端侧AI助手，将鼠标作为超级入口，智能地理解您当前的工作内容。Tip 集成了桌面自动化、智能体调用等功能，完全开源、支持端侧离线使用，更好地保护隐私安全。

## 安装与使用
1. 下载 Release 中的 dmg 安装包并完成安装。
2. 首次启动需要开启屏幕录制、辅助功能等权限，确保快捷键与截图正常工作。
3. 按 `ctrl + shift` 激活 Tip，选择文本或框选区域开始对话；在菜单栏切换模式或配置模型。

### 接入 Youtu-LLM
1. 安装并启动 Youtu-LLM 模型（参考 Youtu-LLM 仓库说明），确保开放兼容 OpenAI SDK 的接口。
2. 在 Youtu-Tip 设置中新增模型，填写服务地址和相关信息进行调用。


## 本地开发
- macOS 12+（Apple Silicon 已测），Node.js 20.x、pnpm 9，Python 3.11（Poetry）。
- 首次安装依赖：
  ```bash
  pnpm install
  cd python && poetry install --no-root
  ```
- 拉取 Youtu-Agent：
  ```bash
  git clone --branch feature/tip --depth 1 https://github.com/TencentCloudADP/youtu-agent.git youtu-agent
  ```
- 启动：
  ```bash
  pnpm run dev
  ```

### 技术栈与架构
- 桌面端：Electron + React + Tailwind，`uiohook-napi` 监听热键，Vite 构建。
- 后端 Sidecar：Python 3.11 + FastAPI + httpx，PyInstaller 打包。

### 目录结构
- `electron/`：Electron 主进程、渲染层、预加载脚本、静态资源与构建配置。
- `python/`：FastAPI 应用、服务逻辑、Pydantic 模型、PyInstaller 配置与测试。
- `config/`：默认设置与 JSON Schema，含内置 Youtu-Agent Hydra 配置。
- `scripts/`：跨端脚本（开发/占位构建等）。
- `youtu-agent/`：需从 `feature/tip` 分支拉取的 Agent 仓库，供 Sidecar 读取配置。
- 其他：根级 pnpm/Node 版本锁、工具版本文件。


## 引用
```bibtex
@article{youtu-agent,
    title={Youtu-Agent paper}, 
    author={Youtu-Agent Team},
    journal = {arXiv preprint arXiv:TBD},
    year={2025}
}
```