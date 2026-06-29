import * as vscode from 'vscode';
import * as path from 'path';
import { Commands } from '../types';
import type { CommandContext } from './shared';
import { loadBook, pickAndLoadBook } from './shared';

/**
 * 切换书籍命令 — 展示最近阅读列表、删除记录、打开新书
 */
export function registerSwitchBook(context: vscode.ExtensionContext, ctx: CommandContext): void {
  const cmd = vscode.commands.registerCommand(Commands.SWITCH_BOOK, async () => {
    const bookList = ctx.envManager.getBookList();
    const currentBook = ctx.envManager.getCurrentBookPath();
    const deleteButton: vscode.QuickInputButton = {
      iconPath: new vscode.ThemeIcon('trash'),
      tooltip: '从最近列表删除',
    };

    const items: (vscode.QuickPickItem & { fullPath?: string })[] = bookList.map(p => ({
      label: path.basename(p),
      description: path.dirname(p),
      fullPath: p,
      buttons: [deleteButton],
    }));
    items.push({ label: '', kind: vscode.QuickPickItemKind.Separator });
    items.push({ label: '$(file-add) 打开其他文件...' });

    const picker = vscode.window.createQuickPick();
    picker.items = items;
    picker.placeholder = '选择要阅读的书籍';
    picker.ignoreFocusOut = false;

    // 高亮当前书
    const currentIdx = bookList.indexOf(currentBook);
    if (currentIdx >= 0) {
      picker.activeItems = [items[currentIdx]];
    }

    // 删除按钮处理
    picker.onDidTriggerItemButton(async (event) => {
      try {
        const target = event.item as typeof items[0];
        if (target.fullPath) {
          const wasCurrent = target.fullPath === currentBook;
          ctx.envManager.removeBook(target.fullPath);
          await ctx.envManager.save();
          // 刷新列表
          const updatedList = ctx.envManager.getBookList();
          const updatedItems: (vscode.QuickPickItem & { fullPath?: string })[] = updatedList.map(p => ({
            label: path.basename(p),
            description: path.dirname(p),
            fullPath: p,
            buttons: [deleteButton],
          }));
          updatedItems.push({ label: '', kind: vscode.QuickPickItemKind.Separator });
          updatedItems.push({ label: '$(file-add) 打开其他文件...' });
          picker.items = updatedItems;
          if (updatedList.length > 0) {
            picker.activeItems = [updatedItems[0]];
          }
          // 如果删的是当前书且还有书，自动切到第一本
          if (wasCurrent && updatedList.length > 0) {
            ctx.envManager.setCurrentBook(updatedList[0]);
            try {
              await loadBook(ctx, updatedList[0]);
            } catch {
              ctx.envManager.removeBook(updatedList[0]);
              await ctx.envManager.save();
            }
          }
        }
      } catch (err) {
        console.error('[Cover Novel] 删除书籍失败:', err);
      }
    });

    picker.onDidAccept(async () => {
      try {
        const selected = picker.selectedItems[0] as typeof items[0] | undefined;
        picker.dispose();

        if (!selected) return;

        if (selected.label === '$(file-add) 打开其他文件...') {
          await pickAndLoadBook(ctx);
        } else if (selected.fullPath && selected.fullPath !== currentBook) {
          ctx.envManager.setCurrentBook(selected.fullPath);
          try {
            await loadBook(ctx, selected.fullPath);
          } catch {
            ctx.envManager.removeBook(selected.fullPath);
            await ctx.envManager.save();
          }
        }
      } catch (err) {
        console.error('[Cover Novel] 切书失败:', err);
      }
    });

    picker.onDidHide(() => picker.dispose());
    picker.show();
  });
  context.subscriptions.push(cmd);
}
