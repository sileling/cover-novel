import * as fs from 'fs';
import * as path from 'path';

/**
 * TemplateEngine — 加载模板文件并填充占位符。
 * 模板中的 {0} {1} ... {N} 会被替换为小说文本行。
 */
export class TemplateEngine {
  private template: string;

  constructor(templateDir: string, templateFile: string = 'code-template.txt') {
    const filePath = path.join(templateDir, templateFile);
    try {
      this.template = fs.readFileSync(filePath, 'utf-8');
    } catch {
      throw new Error(`模板文件未找到: ${filePath}`);
    }
  }

  /**
   * 将 lines 按索引填充到模板占位符 {0} {1} ... {N} 中。
   * 超出占位符数量的行会被忽略，不足则留空。
   */
  fill(lines: string[]): string {
    return this.template.replace(/\{(\d+)\}/g, (_, num) => {
      const idx = parseInt(num, 10);
      return idx < lines.length ? lines[idx] : '';
    });
  }
}
