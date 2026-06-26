import * as vscode from 'vscode';
import * as path from 'path';
import { EnvManager } from './env';
import { TemplateEngine } from './template';
import { PageManager } from './pageManager';
import { NovelViewManager } from './novelView';
import { StatusBarController } from './statusBar';
import { BossKeyManager } from './bossKey';
import { Commands } from './types';

// ---------------------------------------------------------------------------
// 模块实例（在 activate 中初始化）
// ---------------------------------------------------------------------------
let envManager: EnvManager;
let templateEngine: TemplateEngine;
let pageManager: PageManager;
let novelView: NovelViewManager;
let statusBar: StatusBarController;
let bossKey: BossKeyManager;

const extensionPath = __dirname;
const templateDir = path.join(extensionPath, '..', 'templates');

// ---------------------------------------------------------------------------
// 初始化
// ---------------------------------------------------------------------------

function validateNovelActive(): boolean {
  if (!novelView || !novelView.isNovelActive()) {
    vscode.window.showWarningMessage('请在 novel.js 标签页中使用此功能');
    return false;
  }
  return true;
}

function afterPageChange(): void {
  statusBar.updateProgress(pageManager.getProgressText());
  novelView.scrollToTop();
  envManager.save();
}

/** 加载指定书籍并渲染 */
function loadBook(bookPath: string): void {
  pageManager.loadBook(bookPath);
  pageManager.render();
  afterPageChange();
  statusBar.show();
}

/** 弹出文件选择器，选择 .txt 文件 */
async function pickAndLoadBook(): Promise<void> {
  const options: vscode.OpenDialogOptions = {
    canSelectMany: false,
    canSelectFiles: true,
    canSelectFolders: false,
    filters: { '文本文件': ['txt'] },
  };

  const result = await vscode.window.showOpenDialog(options);
  if (!result || result.length === 0) return;

  const filePath = result[0].fsPath;
  envManager.addRecentBook(filePath);
  loadBook(filePath);
  await novelView.openNovel();
}

/** 尝试恢复上次阅读，如果文件不存在则隐藏状态栏等用户操作 */
function tryRestoreLastBook(): void {
  if (envManager.hasCurrentBook()) {
    try {
      loadBook(envManager.getCurrentBookPath());
    } catch {
      statusBar.hide();
    }
  }
}

// ---------------------------------------------------------------------------
// 激活
// ---------------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext): void {
  try {
    envManager = new EnvManager(context.globalState);
    envManager.cleanStaleBooks();
    templateEngine = new TemplateEngine(templateDir);
    pageManager = new PageManager(envManager, templateEngine, extensionPath);

    statusBar = new StatusBarController();
    statusBar.register(context);

    novelView = new NovelViewManager(
      pageManager.getNovelPath(),
      (visible) => handleVisibilityChange(visible),
    );
    novelView.registerActiveListener(context);

    bossKey = new BossKeyManager(novelView, statusBar);

    // 尝试恢复上次阅读
    tryRestoreLastBook();

    registerCommands(context);

    if (novelView.isNovelActive()) {
      statusBar.show();
    }

    console.log('[Cover Novel] 扩展已激活');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`[Cover Novel] 初始化失败: ${message}`);
    console.error('[Cover Novel] 激活失败:', err);
  }
}

// ---------------------------------------------------------------------------
// 命令注册
// ---------------------------------------------------------------------------

function registerCommands(context: vscode.ExtensionContext): void {
  // 打开小说
  const openCmd = vscode.commands.registerCommand(Commands.OPEN_NOVEL, async () => {
    if (envManager.hasCurrentBook()) {
      // 有最近阅读 → 直接打开
      await novelView.openNovel();
      if (bossKey.isHidden()) {
        bossKey.syncOnExternalOpen();
      }
    } else {
      // 无最近阅读 → 弹出文件选择器
      await pickAndLoadBook();
    }
  });

  // 下一页
  const nextCmd = vscode.commands.registerCommand(Commands.NEXT_PAGE, () => {
    if (!validateNovelActive()) return;
    pageManager.nextPage();
    afterPageChange();
  });

  // 上一页
  const prevCmd = vscode.commands.registerCommand(Commands.PREV_PAGE, () => {
    if (!validateNovelActive()) return;
    pageManager.prevPage();
    afterPageChange();
  });

  // 跳页
  const jumpCmd = vscode.commands.registerCommand(Commands.JUMP_PAGE, async () => {
    if (!validateNovelActive()) return;
    const input = await vscode.window.showInputBox({
      placeHolder: `请输入页码 (1-${pageManager.getTotalPage()})`,
      validateInput: (value: string) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 1 || num > pageManager.getTotalPage()) {
          return `请输入有效页码 (1-${pageManager.getTotalPage()})`;
        }
        return null;
      },
    });
    if (input) {
      const page = parseInt(input, 10);
      if (pageManager.jumpPage(page)) {
        afterPageChange();
      } else {
        vscode.window.showWarningMessage(`页码范围 1-${pageManager.getTotalPage()}`);
      }
    }
  });

  // 老板键
  const bossCmd = vscode.commands.registerCommand(Commands.BOSS_KEY, async () => {
    if (bossKey.isHidden() || novelView.isNovelActive()) {
      await bossKey.toggle();
    }
  });

  context.subscriptions.push(openCmd, nextCmd, prevCmd, jumpCmd, bossCmd);

  // 切换书籍
  const switchCmd = vscode.commands.registerCommand(Commands.SWITCH_BOOK, async () => {
    const bookList = envManager.getBookList();
    const currentBook = envManager.getCurrentBookPath();
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
    picker.placeHolder = '选择要阅读的书籍';
    picker.ignoreFocusOut = false;

    // 高亮当前书
    const currentIdx = bookList.indexOf(currentBook);
    if (currentIdx >= 0) {
      picker.activeItems = [items[currentIdx]];
    }

    // 删除按钮处理
    picker.onDidTriggerItemButton(async (event) => {
      const target = event.item as typeof items[0];
      if (target.fullPath) {
        const wasCurrent = target.fullPath === currentBook;
        envManager.removeBook(target.fullPath);
        envManager.save();
        // 刷新列表
        const updatedList = envManager.getBookList();
        const updatedItems: (vscode.QuickPickItem & { fullPath?: string })[] = updatedList.map(p => ({
          label: path.basename(p),
          description: path.dirname(p),
          fullPath: p,
          buttons: [deleteButton],
        }));
        updatedItems.push({ label: '', kind: vscode.QuickPickItemKind.Separator });
        updatedItems.push({ label: '$(file-add) 打开其他文件...' });
        picker.items = updatedItems;
        if (updatedItems.length > 0) {
          picker.activeItems = [updatedItems[0]];
        }
        // 如果删的是当前书且还有书，自动切到第一本
        if (wasCurrent && updatedList.length > 0) {
          envManager.setCurrentBook(updatedList[0]);
          loadBook(updatedList[0]);
        }
      }
    });

    picker.onDidAccept(() => {
      const selected = picker.selectedItems[0] as typeof items[0] | undefined;
      picker.dispose();

      if (!selected) return;

      if (selected.label === '$(file-add) 打开其他文件...') {
        pickAndLoadBook();
      } else if (selected.fullPath && selected.fullPath !== currentBook) {
        envManager.setCurrentBook(selected.fullPath);
        loadBook(selected.fullPath);
      }
    });

    picker.onDidHide(() => picker.dispose());
    picker.show();
  });
  context.subscriptions.push(switchCmd);

  // 章节导航
  const chapterCmd = vscode.commands.registerCommand(Commands.CHAPTER_NAV, async () => {
    if (!validateNovelActive()) return;
    const chapters = pageManager.getChapters();
    if (chapters.length === 0) {
      vscode.window.showInformationMessage('未检测到章节标记');
      return;
    }
    const items = chapters.map((c) => ({
      label: c.title,
      description: `第 ${c.page} 页`,
    }));
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: '选择章节',
    });
    if (selected) {
      const idx = items.indexOf(selected);
      const chapter = chapters[idx];
      pageManager.jumpPage(chapter.page);
      statusBar.updateProgress(pageManager.getProgressText());
      envManager.save();
      await new Promise(r => setTimeout(r, 50));
      const renderedLine = pageManager.getRenderedLineForChapter(chapter);
      novelView.scrollToLine(renderedLine);
    }
  });
  context.subscriptions.push(chapterCmd);
}

// ---------------------------------------------------------------------------
// 编辑器切换处理
// ---------------------------------------------------------------------------

function handleVisibilityChange(visible: boolean): void {
  if (visible) {
    statusBar.show();
  } else if (!bossKey.isHidden()) {
    statusBar.hide();
  }
}

// ---------------------------------------------------------------------------
// 停用
// ---------------------------------------------------------------------------

export function deactivate(): void {
  if (envManager) {
    envManager.save();
  }
  console.log('[Cover Novel] 扩展已停用');
}
