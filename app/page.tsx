import Link from 'next/link';
import MarkdownPage from '@/components/MarkdownPage';
import { listSlugs, readRootMarkdown } from '@/lib/content';

export default async function HomePage() {
  const home = await readRootMarkdown('README');
  const lessonSlugs = listSlugs('lessons');
  const quizSlugs = listSlugs('quizzes');

  return (
    <div className="list-grid">
      {home ? <MarkdownPage title={home.title} html={home.html} /> : null}

      <section className="card">
        <h2>All Lessons</h2>
        <div className="list-grid">
          {lessonSlugs.map((slug) => (
            <Link key={slug} href={`/lessons/${slug}`}>
              {slug}
            </Link>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>All Quizzes</h2>
        <div className="list-grid">
          {quizSlugs.map((slug) => (
            <Link key={slug} href={`/quizzes/${slug}`}>
              {slug}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
