/** env.json 完整结构 */
export interface EnvData {
  /** 最近阅读的书籍（全路径 → 页码） */
  recentBooks: Record<string, number>;
  /** 当前正在阅读的书籍（全路径） */
  currentBook: string;
}

/** 小说状态：存储所有运行时状态 */
export interface NovelState {
  /** novel.js 的完整路径 */
  novelPath: string;
  /** 当前小说每行内容 */
  novelLines: string[];
  /** 总页数 */
  totalPage: number;
  /** 每页行数 */
  linesPerPage: number;
}

/** 章节信息 */
export interface ChapterInfo {
  /** 章节标题 */
  title: string;
  /** 行号 (0-based) */
  line: number;
  /** 所在页码 */
  page: number;
}

/** 老板键状态 */
export interface BossKeyState {
  /** 是否已隐藏 */
  hidden: boolean;
  /** 隐藏前活跃的编辑器文件 URI（用于恢复时切回） */
  previousEditorUri?: string;
}

/** 命令名称常量 */
export const Commands = {
  OPEN_NOVEL: 'covernovel.openNovel',
  NEXT_PAGE: 'covernovel.nextpage',
  PREV_PAGE: 'covernovel.prevpage',
  JUMP_PAGE: 'covernovel.jumppage',
  BOSS_KEY: 'covernovel.bossKey',
  SWITCH_BOOK: 'covernovel.switchBook',
  CHAPTER_NAV: 'covernovel.chapterNav',
} as const;

/** 默认每页行数 */
export const LINES_PER_PAGE = 100;
