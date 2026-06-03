import { notFound } from 'next/navigation';
import MarkdownPage from '@/components/MarkdownPage';
import { listSlugs, readContent } from '@/lib/content';

export function generateStaticParams() {
  return listSlugs('lessons').map((slug) => ({ slug }));
}

export default async function LessonPage({ params }: { params: { slug: string } }) {
  const item = await readContent('lessons', params.slug);
  if (!item) return notFound();
  return <MarkdownPage title={item.title} html={item.html} />;
}
