import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'DynaSpeak Placement Test Study Guide',
  description: 'A free English language training guide for students preparing for the DynaSpeak placement test in Auckland, New Zealand.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <aside className="sidebar">
            <h1>DynaSpeak</h1>
            <p className="muted">Placement Prep</p>
            <nav>
              <Link href="/">Home</Link>
              <Link href="/speaking">IELTS Speaking Tutor</Link>
              <Link href="/quizzes/ai-settings">AI Settings</Link>
              <Link href="/quizzes/ai-quiz">AI Practice Quiz</Link>
              <Link href="/quizzes/mock-test">Final Mock Test</Link>
            </nav>
          </aside>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
