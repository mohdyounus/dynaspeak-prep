import { notFound } from 'next/navigation';
import Script from 'next/script';
import MarkdownPage from '@/components/MarkdownPage';
import { listSlugs, readContent } from '@/lib/content';

const needsAiScript = new Set(['ai-quiz']);

export function generateStaticParams() {
  return listSlugs('quizzes').map((slug) => ({ slug }));
}

export default async function QuizPage({ params }: { params: { slug: string } }) {
  const item = await readContent('quizzes', params.slug);
  if (!item) return notFound();

  return (
    <>
      {needsAiScript.has(params.slug) ? <Script src="/assets/js/ai-quiz.js" strategy="afterInteractive" /> : null}
      <MarkdownPage title={item.title} html={item.html} />
    </>
  );
}
