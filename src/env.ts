import * as fs from 'fs';
import * as vscode from 'vscode';
import type { EnvData } from './types';

const STORAGE_KEY = 'coverNovelEnv';

/**
 * EnvManager — 使用 VS Code globalState 管理阅读进度持久化。
 * 数据随 VS Code 扩展生命周期管理，卸载后自动清除。
 */
export class EnvManager {
  private storage: vscode.Memento;
  private data: EnvData;

  constructor(storage: vscode.Memento) {
    this.storage = storage;
    this.data = this.load();
  }

  /** 从 globalState 加载数据 */
  private load(): EnvData {
    const saved = this.storage.get<EnvData>(STORAGE_KEY);
    if (saved) {
      return {
        recentBooks: saved.recentBooks ?? {},
        currentBook: saved.currentBook ?? '',
      };
    }
    return { recentBooks: {}, currentBook: '' };
  }

  /** 保存到 globalState */
  async save(): Promise<void> {
    try {
      await this.storage.update(STORAGE_KEY, this.data);
    } catch (err) {
      console.error('[Cover Novel] 保存进度失败:', err);
    }
  }

  /** 清理已不存在的书籍记录 */
  cleanStaleBooks(): void {
    const keys = Object.keys(this.data.recentBooks);
    let changed = false;
    for (const key of keys) {
      if (!fs.existsSync(key)) {
        delete this.data.recentBooks[key];
        if (this.data.currentBook === key) {
          this.data.currentBook = '';
        }
        changed = true;
      }
    }
    if (changed) {
      this.save();
    }
  }

  /** 将文件加入最近列表（自动去重） */
  addRecentBook(fullPath: string): void {
    const normalized = fullPath.replace(/\\/g, '/');
    if (!this.data.recentBooks[normalized]) {
      this.data.recentBooks[normalized] = 1;
    }
    this.data.currentBook = normalized;
  }

  /** 检查当前阅读的文件是否还存在 */
  hasCurrentBook(): boolean {
    if (!this.data.currentBook) return false;
    try {
      return fs.existsSync(this.data.currentBook);
    } catch {
      return false;
    }
  }

  /** 获取当前书籍全路径 */
  getCurrentBookPath(): string {
    return this.data.currentBook;
  }

  /** 设置当前书籍 */
  setCurrentBook(fullPath: string): void {
    this.data.currentBook = fullPath.replace(/\\/g, '/');
  }

  /** 获取指定书籍的页码 */
  getPage(bookPath: string): number {
    return this.data.recentBooks[bookPath] ?? 1;
  }

  /** 设置指定书籍的页码 */
  setPage(bookPath: string, page: number): void {
    this.data.recentBooks[bookPath] = page;
  }

  /** 获取最近阅读的书籍路径列表 */
  getBookList(): string[] {
    return Object.keys(this.data.recentBooks);
  }

  /** 从最近列表删除指定书籍 */
  removeBook(fullPath: string): void {
    const normalized = fullPath.replace(/\\/g, '/');
    delete this.data.recentBooks[normalized];
    if (this.data.currentBook === normalized) {
      this.data.currentBook = '';
    }
  }

  /** 获取完整 env 数据 */
  getData(): EnvData {
    return { ...this.data };
  }
}
