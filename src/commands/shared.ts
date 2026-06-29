import * as vscode from 'vscode';
import * as path from 'path';
import { EnvManager } from '../env';
import { PageManager } from '../pageManager';
import { NovelViewManager } from '../novelView';
import { StatusBarController } from '../statusBar';
import { BossKeyManager } from '../bossKey';

/**
 * 命令上下文 — 持有所有模块实例，供命令 handler 使用
 */
export interface CommandContext {
  envManager: EnvManager;
  pageManager: PageManager;
  novelView: NovelViewManager;
  statusBar: StatusBarController;
  bossKey: BossKeyManager;
}

/** 校验当前编辑器是否为 novel.js */
export function validateNovelActive(ctx: CommandContext): boolean {
  if (!ctx.novelView || !ctx.novelView.isNovelActive()) {
    vscode.window.showWarningMessage('请在 novel.js 标签页中使用此功能');
    return false;
  }
  return true;
}

/** 翻页/跳页后的收尾工作 */
export async function afterPageChange(ctx: CommandContext): Promise<void> {
  ctx.statusBar.updateProgress(ctx.pageManager.getProgressText());
  ctx.novelView.scrollToTop();
  await ctx.envManager.save();
}

/** 加载指定书籍并渲染 */
export async function loadBook(ctx: CommandContext, bookPath: string): Promise<void> {
  ctx.pageManager.loadBook(bookPath);
  ctx.pageManager.render();
  await afterPageChange(ctx);
  ctx.statusBar.show();
}

/** 弹出文件选择器，选择 .txt 文件 */
export async function pickAndLoadBook(ctx: CommandContext): Promise<void> {
  const options: vscode.OpenDialogOptions = {
    canSelectMany: false,
    canSelectFiles: true,
    canSelectFolders: false,
    filters: { '文本文件': ['txt'] },
  };

  const result = await vscode.window.showOpenDialog(options);
  if (!result || result.length === 0) return;

  const filePath = result[0].fsPath;
  ctx.envManager.addRecentBook(filePath);
  try {
    await loadBook(ctx, filePath);
  } catch (err) {
    // 加载失败则回滚，不把坏记录留在最近列表
    ctx.envManager.removeBook(filePath);
    await ctx.envManager.save();
    throw err;
  }
  await ctx.novelView.openNovel();
}
