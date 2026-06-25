import * as vscode from 'vscode';
import { Commands } from './types';

/**
 * StatusBarController — 创建和管理 VS Code 状态栏项。
 * 包括：进度显示、上一页、下一页、跳页、章节导航按钮。
 */
export class StatusBarController {
  private processBar: vscode.StatusBarItem;
  private prevBar: vscode.StatusBarItem;
  private nextBar: vscode.StatusBarItem;
  private jumpBar: vscode.StatusBarItem;
  private chapterBar: vscode.StatusBarItem;

  constructor() {
    this.processBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.processBar.command = Commands.SWITCH_BOOK;

    this.prevBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      1,
    );
    this.prevBar.text = '上一页';
    this.prevBar.command = Commands.PREV_PAGE;

    this.nextBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      2,
    );
    this.nextBar.text = '下一页';
    this.nextBar.command = Commands.NEXT_PAGE;

    this.jumpBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      3,
    );
    this.jumpBar.text = '跳页';
    this.jumpBar.command = Commands.JUMP_PAGE;

    this.chapterBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      4,
    );
    this.chapterBar.text = '章节';
    this.chapterBar.command = Commands.CHAPTER_NAV;
  }

  /** 注册到 context，确保清理 */
  register(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      this.processBar,
      this.prevBar,
      this.nextBar,
      this.jumpBar,
      this.chapterBar,
    );
  }

  /** 更新进度文本 */
  updateProgress(text: string): void {
    this.processBar.text = text;
  }

  /** 显示所有状态栏项 */
  show(): void {
    this.processBar.show();
    this.prevBar.show();
    this.nextBar.show();
    this.jumpBar.show();
    this.chapterBar.show();
  }

  /** 隐藏所有状态栏项 */
  hide(): void {
    this.processBar.hide();
    this.prevBar.hide();
    this.nextBar.hide();
    this.jumpBar.hide();
    this.chapterBar.hide();
  }

  /** 根据是否可见切换显隐 */
  setVisible(visible: boolean): void {
    if (visible) {
      this.show();
    } else {
      this.hide();
    }
  }
}
