# Tip Electron Shell

Electron + Vite + React 项目，负责实现全屏 Overlay、全局热键与后续 IPC 桥接。

## 开发脚本

```bash
pnpm --filter electron dev      # 启动 Vite + Electron
pnpm --filter electron build    # 产出 dist 与 dist-electron
pnpm --filter electron test     # 运行 Vitest（后续补充）
```

## 目录概览

```
src/
  main/        # Electron 主进程：app.ts、热键、窗口、IPC
  preload/     # contextBridge，暴露 overlay 与服务接口
  renderer/    # React + Tailwind Overlay UI
  shared/      # 主进程/渲染共享的常量与类型
```

Tailwind / Vite 配置均在根目录，遵循 `@renderer`、`@main`、`@shared` 等路径别名。
