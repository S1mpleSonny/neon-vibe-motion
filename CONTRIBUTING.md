# Contributing to Neon

Thank you for your interest in contributing to Neon! This document provides guidelines for contributing.

## Development Setup

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Getting Started

```bash
git clone https://github.com/S1mpleSonny/neon-vibe-motion.git
cd neon
pnpm install
pnpm dev
```

Open http://localhost:5173 to view the app.

### Available Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests |
| `pnpm typecheck` | Run TypeScript type checking |

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

Common types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.

## Pull Request Process

1. Fork the repository and create a feature branch from `main`.
2. Make your changes, ensuring `pnpm build` and `pnpm lint` pass.
3. Write clear commit messages following the convention above.
4. Open a PR against `main` with a concise description of the change.
5. Wait for review — maintainers may request changes before merging.

## Code Style

- TypeScript strict mode.
- Tailwind CSS for styling.
- Keep functions small and focused.
- Prefer deleting dead code over commenting it out.

## Reporting Issues

Use [GitHub Issues](https://github.com/S1mpleSonny/neon-vibe-motion/issues) to report bugs or request features.

---

# 贡献指南

感谢你对 Neon 项目的关注！以下是参与贡献的指引。

## 开发环境

### 前置要求

- Node.js >= 18
- pnpm >= 8

### 快速开始

```bash
git clone https://github.com/S1mpleSonny/neon-vibe-motion.git
cd neon
pnpm install
pnpm dev
```

打开 http://localhost:5173 查看应用。

### 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm lint` | 运行 ESLint |
| `pnpm test` | 运行测试 |
| `pnpm typecheck` | TypeScript 类型检查 |

## 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <description>

[可选正文]
```

常用类型：`feat`、`fix`、`refactor`、`docs`、`test`、`chore`。

## PR 流程

1. Fork 仓库，从 `main` 创建功能分支。
2. 确保 `pnpm build` 和 `pnpm lint` 通过。
3. 按照上述规范编写清晰的提交信息。
4. 向 `main` 提交 PR，附简要变更说明。
5. 等待审核——维护者可能会要求修改后再合并。

## 代码风格

- TypeScript 严格模式。
- 使用 Tailwind CSS 编写样式。
- 函数保持短小精悍，只做一件事。
- 废弃代码直接删除，不要注释保留。

## 问题反馈

通过 [GitHub Issues](https://github.com/S1mpleSonny/neon-vibe-motion/issues) 报告 Bug 或提出需求。
