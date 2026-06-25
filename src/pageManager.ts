import * as fs from 'fs';
import * as path from 'path';
import * as iconv from 'iconv-lite';
import * as jschardet from 'jschardet';
import type { NovelState, ChapterInfo } from './types';
import { LINES_PER_PAGE } from './types';
import { EnvManager } from './env';
import { TemplateEngine } from './template';

/**
 * PageManager — 管理分页逻辑、小说渲染和文件输出。
 */
export class PageManager {
  private state: NovelState;
  private env: EnvManager;
  private template: TemplateEngine;
  private chapters: ChapterInfo[] = [];

  constructor(env: EnvManager, template: TemplateEngine, extensionPath: string) {
    this.env = env;
    this.template = template;
    this.state = {
      novelPath: path.join(extensionPath, 'novel.js'),
      novelLines: [],
      totalPage: 0,
      linesPerPage: LINES_PER_PAGE,
    };
  }

  /** 读取文件并自动检测编码 */
  private readFileWithAutoEncoding(filePath: string): string {
    const raw = fs.readFileSync(filePath);
    const detected = jschardet.detect(raw);
    const encoding = detected?.encoding || 'utf-8';
    try {
      return iconv.decode(raw, encoding);
    } catch {
      // 如果指定编码解码失败，回退到 utf-8
      return iconv.decode(raw, 'utf-8');
    }
  }

  /** 加载指定书籍文件 */
  loadBook(bookPath: string): void {
    try {
      const content = this.readFileWithAutoEncoding(bookPath);
      this.state.novelLines = content.split('\n');
      this.state.totalPage = Math.ceil(this.state.novelLines.length / this.state.linesPerPage);
      this.chapters = this.scanChapters();
    } catch (err) {
      throw new Error(`无法读取书籍文件: ${bookPath}`);
    }
  }

  /** 扫描章节标记 */
  private scanChapters(): ChapterInfo[] {
    const regex = /^\s*第[一二三四五六七八九十百千万零0-9]+[章回节话部集]\s*/;
    const chapters: ChapterInfo[] = [];
    this.state.novelLines.forEach((line, index) => {
      if (regex.test(line.trim())) {
        chapters.push({
          title: line.trim(),
          line: index,
          page: Math.floor(index / this.state.linesPerPage) + 1,
        });
      }
    });
    return chapters;
  }

  /** 获取章节列表 */
  getChapters(): ChapterInfo[] {
    return [...this.chapters];
  }

  /**
   * 获取指定章节标题在当前渲染页面中的行号。
   * 直接在渲染后的内容中搜索标题文本，比模板占位符映射更可靠。
   */
  getRenderedLineForChapter(chapter: ChapterInfo): number {
    const lines = this.getCurrentPageLines();
    const content = this.template.fill(lines);
    const renderedLines = content.split('\n');
    for (let i = 0; i < renderedLines.length; i++) {
      if (renderedLines[i].includes(chapter.title)) {
        return i;
      }
    }
    return 0;
  }

  /** 获取当前页的内容行数组 */
  private getCurrentPageLines(): string[] {
    const currentPage = this.env.getPage(this.env.getCurrentBookPath());
    const start = (currentPage - 1) * this.state.linesPerPage;
    const end = currentPage * this.state.linesPerPage;
    return this.state.novelLines.slice(start, end);
  }

  /** 渲染当前页并写入 novel.js */
  render(): void {
    const lines = this.getCurrentPageLines();
    const content = this.template.fill(lines);
    try {
      fs.writeFileSync(this.state.novelPath, content, 'utf-8');
    } catch (err) {
      console.error('[Cover Novel] 写入 novel.js 失败:', err);
    }
  }

  /** 翻到下一页，返回是否成功 */
  nextPage(): boolean {
    const book = this.env.getCurrentBookPath();
    const currentPage = this.env.getPage(book);
    if (currentPage < this.state.totalPage) {
      this.env.setPage(book, currentPage + 1);
      this.render();
      return true;
    }
    return false;
  }

  /** 翻到上一页，返回是否成功 */
  prevPage(): boolean {
    const book = this.env.getCurrentBookPath();
    const currentPage = this.env.getPage(book);
    if (currentPage > 1) {
      this.env.setPage(book, currentPage - 1);
      this.render();
      return true;
    }
    return false;
  }

  /** 跳转到指定页 */
  jumpPage(page: number): boolean {
    if (page < 1 || page > this.state.totalPage) {
      return false;
    }
    const book = this.env.getCurrentBookPath();
    this.env.setPage(book, page);
    this.render();
    return true;
  }

  /** 获取当前阅读进度文本（用于状态栏显示，仅显示文件名） */
  getProgressText(): string {
    const bookPath = this.env.getCurrentBookPath();
    const fileName = path.basename(bookPath);
    const page = this.env.getPage(bookPath);
    return `${fileName}   ${page} | ${this.state.totalPage}`;
  }

  /** 获取总页数 */
  getTotalPage(): number {
    return this.state.totalPage;
  }

  /** 获取当前页码 */
  getCurrentPage(): number {
    return this.env.getPage(this.env.getCurrentBookPath());
  }

  /** 获取 novel.js 路径 */
  getNovelPath(): string {
    return this.state.novelPath;
  }
}
