import * as vscode from 'vscode';
import { Commands } from '../types';
import type { CommandContext } from './shared';
import { validateNovelActive } from './shared';

/**
 * 章节导航命令 — 打开章节列表，选中当前章节，点击跳转
 */
export function registerChapterNav(context: vscode.ExtensionContext, ctx: CommandContext): void {
  const cmd = vscode.commands.registerCommand(Commands.CHAPTER_NAV, async () => {
    if (!validateNovelActive(ctx)) return;

    const chapters = ctx.pageManager.getChapters();
    if (chapters.length === 0) {
      vscode.window.showInformationMessage('未检测到章节标记');
      return;
    }

    // 找到当前所在章节（最后一个 page <= 当前页的章节）
    const currentPage = ctx.pageManager.getCurrentPage();
    let currentIdx = 0;
    for (let i = 0; i < chapters.length; i++) {
      if (chapters[i].page <= currentPage) {
        currentIdx = i;
      }
    }

    const items = chapters.map((c, i) => ({
      label: c.title,
      description: `第 ${c.page} 页${i === currentIdx ? '  ←' : ''}`,
    }));

    const picker = vscode.window.createQuickPick();
    picker.items = items;
    picker.placeholder = '选择章节';
    picker.ignoreFocusOut = false;

    picker.onDidAccept(async () => {
      try {
        const selected = picker.selectedItems[0] as typeof items[0] | undefined;
        picker.dispose();
        if (!selected) return;

        const idx = items.indexOf(selected);
        const chapter = chapters[idx];
        ctx.pageManager.jumpPage(chapter.page);
        ctx.statusBar.updateProgress(ctx.pageManager.getProgressText());
        await ctx.envManager.save();

        setTimeout(() => {
          const renderedLine = ctx.pageManager.getRenderedLineForChapter(chapter);
          ctx.novelView.scrollToLine(renderedLine);
        }, 50);
      } catch (err) {
        console.error('[Cover Novel] 章节跳转失败:', err);
      }
    });

    picker.onDidHide(() => picker.dispose());
    picker.show();
    // show() 后再设 activeItems，让列表滚动到当前章节
    picker.activeItems = [items[currentIdx]];
  });

  context.subscriptions.push(cmd);
}
