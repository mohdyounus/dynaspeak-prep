import Link from 'next/link';
import MarkdownPage from '@/components/MarkdownPage';
import { listSlugs, readContent, readRootMarkdown } from '@/lib/content';

export default async function HomePage() {
  const home = await readRootMarkdown('README');
  const lessonSlugs = listSlugs('lessons');
  const quizSlugs = listSlugs('quizzes');
  const lessons = await Promise.all(
    lessonSlugs.map(async (slug) => ({
      slug,
      item: await readContent('lessons', slug)
    }))
  );
  const quizzes = await Promise.all(
    quizSlugs.map(async (slug) => ({
      slug,
      item: await readContent('quizzes', slug)
    }))
  );

  return (
    <div className="list-grid">
      {home ? <MarkdownPage title={home.title} html={home.html} /> : null}

      <section className="card" style={{ backgroundColor: '#f0f4e6', borderLeft: '4px solid #2d5016' }}>
        <h2 style={{ color: '#2d5016' }}>🌙 Arabic Qaida Tutor (NEW)</h2>
        <p style={{ marginBottom: '1rem' }}>
          Teach your child the 29 Arabic letters with an AI tutor speaking Hyderabadi Hindi. Perfect for young learners!
        </p>
        <Link href="/arabic" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: '#2d5016', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
          Start Learning
        </Link>
      </section>

      <section className="card">
        <h2>All Lessons</h2>
        <div className="list-grid">
          {lessons.map(({ slug, item }) => (
            <Link key={slug} href={`/lessons/${slug}`}>
              {item?.title || slug}
            </Link>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>All Quizzes</h2>
        <div className="list-grid">
          {quizzes.map(({ slug, item }) => (
            <Link key={slug} href={`/quizzes/${slug}`}>
              {item?.title || slug}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
