import { notFound } from 'next/navigation';
import Script from 'next/script';
import MarkdownPage from '@/components/MarkdownPage';
import { listSlugs, readContent } from '@/lib/content';

const scriptBySlug: Record<string, string> = {
  'ai-quiz': '/assets/js/ai-quiz.js',
  'mock-test': '/assets/js/ai-mock-test.js'
};

export function generateStaticParams() {
  return listSlugs('quizzes').map((slug) => ({ slug }));
}

export default async function QuizPage({ params }: { params: { slug: string } }) {
  const item = await readContent('quizzes', params.slug);
  if (!item) return notFound();
  const scriptSrc = scriptBySlug[params.slug];

  return (
    <>
      {scriptSrc ? <Script src={scriptSrc} strategy="afterInteractive" /> : null}
      <MarkdownPage title={item.title} html={item.html} />
    </>
  );
}
