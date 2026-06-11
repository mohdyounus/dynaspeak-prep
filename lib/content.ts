import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';

export type ContentItem = {
  slug: string;
  title: string;
  html: string;
  raw: string;
  frontMatter: Record<string, any>;
};

const root = process.cwd();

function stripFrontMatter(raw: string): string {
  if (!raw.startsWith('---')) return raw;
  const parts = raw.split(/\r?\n---\r?\n/);
  if (parts.length < 2) return raw;
  return parts.slice(1).join('\n---\n');
}

function normalizeLinks(markdown: string, dirName?: 'lessons' | 'quizzes'): string {
  const mapBareHtmlSlug = (slug: string): string => {
    const lower = slug.toLowerCase();
    if (lower === 'index') return '/';

    const isLessonSlug = /^\d{2}-[a-z0-9-]+$/.test(lower);
    const isQuizSlug = /^(quiz-[a-z0-9-]+|ai-quiz|ai-settings|mock-test)$/.test(lower);

    if (isLessonSlug) return `/lessons/${lower}`;
    if (isQuizSlug) return `/quizzes/${lower}`;

    if (dirName === 'lessons') return `/lessons/${lower}`;
    if (dirName === 'quizzes') return `/quizzes/${lower}`;
    return `/${lower}`;
  };

  return markdown
    .replace(/\.\/quizzes\/([a-z0-9-]+)\.html/gi, '/quizzes/$1')
    .replace(/\.\/lessons\/([a-z0-9-]+)\.html/gi, '/lessons/$1')
    .replace(/\.\.\/quizzes\/([a-z0-9-]+)\.html/gi, '/quizzes/$1')
    .replace(/\.\.\/lessons\/([a-z0-9-]+)\.html/gi, '/lessons/$1')
    .replace(/\.\.\/index\.html/gi, '/')
    .replace(/\.\/index\.html/gi, '/')
    .replace(/\((?!https?:\/\/|\/|#)([a-z0-9-]+)\.html\)/gi, (_m, slug) => `(${mapBareHtmlSlug(slug)})`)
    .replace(/\{\{\s*'\/assets\/js\/ai-quiz\.js'\s*\|\s*relative_url\s*\}\}/gi, '/assets/js/ai-quiz.js');
}

export async function readContent(dirName: 'lessons' | 'quizzes', slug: string): Promise<ContentItem | null> {
  const filePath = path.join(root, dirName, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const title = String(parsed.data.title || parsed.content.match(/^#\s+(.+)$/m)?.[1] || slug);

  const cleaned = normalizeLinks(stripFrontMatter(raw), dirName);
  const processed = await remark().use(remarkGfm).use(remarkHtml, { sanitize: false }).process(cleaned);

  return {
    slug,
    title,
    html: String(processed),
    raw,
    frontMatter: parsed.data,
  };
}

export async function readRootMarkdown(fileName: string): Promise<ContentItem | null> {
  const filePath = path.join(root, `${fileName}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const title = String(parsed.data.title || parsed.content.match(/^#\s+(.+)$/m)?.[1] || fileName);
  const cleaned = normalizeLinks(stripFrontMatter(raw));
  const processed = await remark().use(remarkGfm).use(remarkHtml, { sanitize: false }).process(cleaned);

  return {
    slug: fileName,
    title,
    html: String(processed),
    raw,
    frontMatter: parsed.data,
  };
}

export function listSlugs(dirName: 'lessons' | 'quizzes'): string[] {
  const dir = path.join(root, dirName);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .sort();
}
