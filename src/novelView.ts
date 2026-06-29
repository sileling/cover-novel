import * as vscode from 'vscode';

/**
 * NovelViewManager — 管理 novel.js 的编辑器视图操作。
 * 包括：editor active 监听、滚回顶部、打开文件、校验当前编辑器。
 */
export class NovelViewManager {
  private novelPath: string;
  private onVisibilityChange: (visible: boolean) => void;

  constructor(
    novelPath: string,
    onVisibilityChange: (visible: boolean) => void,
  ) {
    this.novelPath = novelPath.toLowerCase();
    this.onVisibilityChange = onVisibilityChange;
  }

  /** 获取 novelPath（小写，用于比较） */
  getNovelPath(): string {
    return this.novelPath;
  }

  /** 判断当前活动编辑器是否为 novel.js */
  isNovelActive(): boolean {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return false;
    return this.isNovelFile(editor.document.uri.fsPath);
  }

  /** 判断文件路径是否为 novel.js */
  isNovelFile(fsPath: string): boolean {
    return fsPath.toLowerCase() === this.novelPath;
  }

  /** 滚动编辑器到第一行 */
  scrollToTop(): void {
    this.scrollToLine(0);
  }

  /** 滚动编辑器到指定行号（0-based），自动安全截断并定位到视口顶部 */
  scrollToLine(line: number): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const safeLine = Math.min(line, editor.document.lineCount - 1);
    const range = editor.document.lineAt(safeLine).range;
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.AtTop);
  }

  /** 打开 novel.js 在编辑器中 */
  async openNovel(): Promise<void> {
    const uri = vscode.Uri.file(this.novelPath);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.One,
      preserveFocus: false,
    });
  }

  /** 检查 novel.js 标签页是否打开（不一定激活） */
  isNovelOpen(): boolean {
    const tabs = vscode.window.tabGroups.all;
    for (const group of tabs) {
      for (const tab of group.tabs) {
        const input = tab.input as { uri?: vscode.Uri } | undefined;
        if (input?.uri && this.isNovelFile(input.uri.fsPath)) {
          return true;
        }
      }
    }
    return false;
  }

  /** 关闭 novel.js 标签页 */
  async closeNovel(): Promise<void> {
    const tabs = vscode.window.tabGroups.all;
    for (const group of tabs) {
      for (const tab of group.tabs) {
        const input = tab.input as { uri?: vscode.Uri } | undefined;
        if (input?.uri && this.isNovelFile(input.uri.fsPath)) {
          await vscode.window.tabGroups.close(tab);
          return;
        }
      }
    }
  }

  /** 注册 editor active 变化监听 */
  registerActiveListener(context: vscode.ExtensionContext): void {
    const disposable = vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) {
        const isNovel = this.isNovelFile(editor.document.uri.fsPath);
        this.onVisibilityChange(isNovel);
      } else {
        this.onVisibilityChange(false);
      }
    });
    context.subscriptions.push(disposable);
  }

  /** 校验当前编辑器是否为 novel.js，若不是则显示警告 */
  validateNovelActive(): boolean {
    if (!this.isNovelActive()) {
      vscode.window.showWarningMessage('请在 novel.js 标签页中使用此功能');
      return false;
    }
    return true;
  }
}
