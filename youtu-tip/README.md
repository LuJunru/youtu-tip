# Youtu-Tip On-Device AI Assistant

Tip is a proactive on-device AI assistant that treats your mouse as a super entry point and intelligently understands your current work. Tip bundles automatic context completion, intent detection, agent calls, and more. It is fully open source, can run offline on-device, and keeps privacy and security in your control.

## Install and Use
1. Download the dmg installer from Releases and complete the installation.
2. On first launch, grant screen recording and accessibility permissions so shortcuts and screenshots work correctly.
3. Press `ctrl + shift` to activate Tip, select text or drag a region to start a conversation; switch modes or configure models from the menu bar.

### Connect to Youtu-LLM
1. Install and start the Youtu-LLM model (see the [Youtu-LLM](https://github.com/TencentCloudADP/youtu-tip/blob/master/youtu-llm/README.md)) and make sure it exposes an OpenAI-compatible endpoint.
2. Add a model in Youtu-Tip settings, filling in the service URL and related info to start calling it.

## Local Development
- macOS 12+ (Apple Silicon tested), Node.js 20.x, pnpm 9, Python 3.11 (Poetry).
- First-time dependency install:
  ```bash
  pnpm install
  cd python && poetry install --no-root
  ```
- Pull Youtu-Agent:
  ```bash
  git clone --branch feature/tip --depth 1 https://github.com/TencentCloudADP/youtu-agent.git youtu-agent
  ```
- Start dev:
  ```bash
  pnpm run dev
  ```

### Tech Stack and Architecture
- Desktop: Electron + React + Tailwind; `uiohook-napi` listens for hotkeys; Vite for build.
- Backend sidecar: Python 3.11 + FastAPI + httpx; packaged with PyInstaller.

### Directory Layout
- `electron/`: Electron main process, renderer, preload scripts, static assets, and build config.
- `python/`: FastAPI app, services, Pydantic models, PyInstaller config, and tests.
- `config/`: Default settings and JSON Schema, including built-in Youtu-Agent Hydra config.
- `scripts/`: Cross-platform scripts (development/placeholder build, etc.).
- `youtu-agent/`: Agent repo pulled from `feature/tip` branch for sidecar config.
- Other: Root pnpm/Node version locks and tool version files.

## Citation
```bibtex
@article{youtu-agent,
  title={Youtu-Agent: Scaling Agent Productivity with Automated Generation and Hybrid Policy Optimization}, 
  author={Tencent Youtu Lab},
  year={2025},
  eprint={2512.24615},
  archivePrefix={arXiv},
  primaryClass={cs.AI},
  url={https://arxiv.org/abs/2512.24615}, 
}
```
