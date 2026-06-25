import * as fs from 'fs';
import * as path from 'path';
import type { EnvData } from './types';

/**
 * EnvManager — 负责读写 env.json，管理阅读进度持久化。
 */
export class EnvManager {
  private envPath: string;
  private data: EnvData;

  constructor(extensionPath: string) {
    this.envPath = path.join(extensionPath, 'env.json');
    this.data = this.load();
  }

  /** 从磁盘加载 env.json，若不存在则返回默认值 */
  private load(): EnvData {
    try {
      const raw = fs.readFileSync(this.envPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        recentBooks: parsed.recentBooks ?? {},
        currentBook: parsed.currentBook ?? '',
      };
    } catch {
      return { recentBooks: {}, currentBook: '' };
    }
  }

  /** 保存当前数据到磁盘 */
  save(): void {
    try {
      fs.writeFileSync(this.envPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Cover Novel] 保存进度失败:', err);
    }
  }

  /** 将文件加入最近列表（自动去重） */
  addRecentBook(fullPath: string): void {
    // 确保路径格式统一（正斜杠）
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
