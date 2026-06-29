import * as fs from 'fs';
import * as iconv from 'iconv-lite';
import * as jschardet from 'jschardet';

/**
 * 读取文件并自动检测编码（支持 GBK / UTF-8 / Big5 等）
 * 检测失败时回退到 UTF-8
 */
export function readFileWithAutoEncoding(filePath: string): string {
  const raw = fs.readFileSync(filePath);
  const detected = jschardet.detect(raw);
  const encoding = detected?.encoding || 'utf-8';
  try {
    return iconv.decode(raw, encoding);
  } catch {
    return iconv.decode(raw, 'utf-8');
  }
}
