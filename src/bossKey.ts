import * as vscode from 'vscode';
import type { BossKeyState } from './types';
import { NovelViewManager } from './novelView';
import { StatusBarController } from './statusBar';

/**
 * BossKeyManager — 老板键逻辑。
 * Alt+Q 快速隐藏 novel.js（关闭标签、切回之前文件），再次按下恢复。
 */
export class BossKeyManager {
  private state: BossKeyState;
  private novelView: NovelViewManager;
  private statusBar: StatusBarController;

  constructor(novelView: NovelViewManager, statusBar: StatusBarController) {
    this.state = { hidden: false };
    this.novelView = novelView;
    this.statusBar = statusBar;
  }

  /** 切换隐藏/恢复 */
  async toggle(): Promise<void> {
    if (!this.state.hidden) {
      await this.hide();
    } else {
      await this.restore();
    }
  }

  /** 隐藏 novel.js */
  private async hide(): Promise<void> {
    if (!this.novelView.isNovelActive()) {
      // novel.js 当前未激活，不响应老板键
      return;
    }

    // 记录前一个编辑器（非 novel.js 的文件）
    const editors = vscode.window.visibleTextEditors;
    const nonNovelEditor = editors.find(
      e => !this.novelView.isNovelFile(e.document.uri.fsPath),
    );
    if (nonNovelEditor) {
      this.state.previousEditorUri = nonNovelEditor.document.uri.fsPath;
    }

    // 关闭 novel.js 标签
    await this.novelView.closeNovel();

    // 切回之前编辑的文件
    if (this.state.previousEditorUri) {
      try {
        const uri = vscode.Uri.file(this.state.previousEditorUri);
        // 检查文件是否仍然打开
        const doc = vscode.workspace.textDocuments.find(
          d => d.uri.fsPath === this.state.previousEditorUri,
        );
        if (doc) {
          await vscode.window.showTextDocument(doc);
        }
      } catch {
        // 文件可能已被关闭，忽略
      }
    }

    // 隐藏状态栏
    this.statusBar.hide();
    this.state.hidden = true;
  }

  /** 恢复 novel.js */
  private async restore(): Promise<void> {
    // 重新打开 novel.js
    await this.novelView.openNovel();

    // 恢复状态栏
    this.statusBar.show();
    this.state.hidden = false;
  }

  /** 同步状态：当外部操作打开了 novel.js 时调用 */
  syncOnExternalOpen(): void {
    if (this.state.hidden) {
      this.state.hidden = false;
      this.statusBar.show();
    }
  }

  /** 获取当前是否隐藏 */
  isHidden(): boolean {
    return this.state.hidden;
  }
}
