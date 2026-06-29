import * as vscode from 'vscode';
import * as path from 'path';
import { EnvManager } from './env';
import { TemplateEngine } from './template';
import { PageManager } from './pageManager';
import { NovelViewManager } from './novelView';
import { StatusBarController } from './statusBar';
import { BossKeyManager } from './bossKey';
import { Commands } from './types';
import type { CommandContext } from './commands/shared';
import { validateNovelActive, afterPageChange, loadBook, pickAndLoadBook } from './commands/shared';
import { registerChapterNav } from './commands/chapterNav';
import { registerSwitchBook } from './commands/switchBook';

// ---------------------------------------------------------------------------
// 模块实例（在 activate 中初始化）
// ---------------------------------------------------------------------------
let envManager: EnvManager;
let templateEngine: TemplateEngine;
let pageManager: PageManager;
let novelView: NovelViewManager;
let statusBar: StatusBarController;
let bossKey: BossKeyManager;
let ctx: CommandContext;

const extensionPath = __dirname;
const templateDir = path.join(extensionPath, '..', 'templates');

// ---------------------------------------------------------------------------
// 初始化
// ---------------------------------------------------------------------------

/** 尝试恢复上次阅读，如果文件不存在则隐藏状态栏等用户操作 */
async function tryRestoreLastBook(): Promise<void> {
  if (envManager.hasCurrentBook()) {
    try {
      await loadBook(ctx, envManager.getCurrentBookPath());
    } catch {
      statusBar.hide();
    }
  }
}

// ---------------------------------------------------------------------------
// 激活
// ---------------------------------------------------------------------------

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    envManager = new EnvManager(context.globalState);
    await envManager.cleanStaleBooks();
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

    // 构建命令上下文
    ctx = { envManager, pageManager, novelView, statusBar, bossKey };

    // 尝试恢复上次阅读
    await tryRestoreLastBook();

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
      await pickAndLoadBook(ctx);
    }
  });

  // 下一页
  const nextCmd = vscode.commands.registerCommand(Commands.NEXT_PAGE, async () => {
    if (!validateNovelActive(ctx)) return;
    if (pageManager.nextPage()) {
      await afterPageChange(ctx);
    }
  });

  // 上一页
  const prevCmd = vscode.commands.registerCommand(Commands.PREV_PAGE, async () => {
    if (!validateNovelActive(ctx)) return;
    if (pageManager.prevPage()) {
      await afterPageChange(ctx);
    }
  });

  // 跳页
  const jumpCmd = vscode.commands.registerCommand(Commands.JUMP_PAGE, async () => {
    if (!validateNovelActive(ctx)) return;
    const input = await vscode.window.showInputBox({
      title: 'Cover Novel - 跳页',
      prompt: `当前第 ${pageManager.getCurrentPage()} 页，共 ${pageManager.getTotalPage()} 页`,
      placeHolder: '输入目标页码',
      validateInput: (value: string) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 1 || num > pageManager.getTotalPage()) {
          return `请输入 1-${pageManager.getTotalPage()} 之间的页码`;
        }
        return null;
      },
    });
    if (input) {
      const page = parseInt(input, 10);
      if (pageManager.jumpPage(page)) {
        await afterPageChange(ctx);
      } else {
        vscode.window.showWarningMessage(`页码范围 1-${pageManager.getTotalPage()}`);
      }
    }
  });

  // 老板键
  const bossCmd = vscode.commands.registerCommand(Commands.BOSS_KEY, async () => {
    if (bossKey.isHidden() || novelView.isNovelActive() || novelView.isNovelOpen()) {
      await bossKey.toggle();
    }
  });

  context.subscriptions.push(openCmd, nextCmd, prevCmd, jumpCmd, bossCmd);

  // 切换书籍
  registerSwitchBook(context, ctx);

  // 章节导航
  registerChapterNav(context, ctx);
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

export async function deactivate(): Promise<void> {
  if (envManager) {
    await envManager.save();
  }
  console.log('[Cover Novel] 扩展已停用');
}
