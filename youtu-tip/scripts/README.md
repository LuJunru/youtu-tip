# 脚本目录

用于存放跨端工具，例如：
- `dev.sh`：并行启动 Electron（pnpm --filter electron dev）与 Python Sidecar（poetry run uvicorn）。
- `package.sh`：统一打包流程（阶段 8，待实现）。

`pnpm run dev` 会调用 `dev.sh`。打包流程仍使用 `build-placeholder.cjs`，稍后替换为正式脚本。
