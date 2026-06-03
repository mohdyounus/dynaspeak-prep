'use client';

import { useEffect, useRef } from 'react';

export default function MarkdownPage({ title, html }: { title: string; html: string }) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    // Execute embedded scripts from markdown (used by interactive quiz pages).
    const scripts = root.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [html]);

  return (
    <article className="card prose">
      <h1>{title}</h1>
      <div ref={contentRef} dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
