'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ArabicLandingPage() {
  const router = useRouter();
  const [childName, setChildName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleStartLesson() {
    if (!childName.trim()) {
      setError("Please enter your child's name");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/arabic/session/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          childName: childName.trim(),
          startLetter: 1
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to start lesson');
        return;
      }

      router.push(`/arabic/session/${data.sessionId}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="list-grid">
      <section className="card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#2d5016' }}>
            🌙 Arabic Qaida Tutor
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#555', marginBottom: '0.5rem' }}>
            Learn Arabic Letters with AI Teacher
          </p>
          <p style={{ fontSize: '0.95rem', color: '#888', marginBottom: '2rem' }}>
            29 Letters • Hyderabadi Hindi • Fun & Interactive
          </p>
        </div>
      </section>

      <section className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Let's Start! 📖</h2>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="childName" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Child's Name
          </label>
          <input
            id="childName"
            type="text"
            placeholder="e.g., Aisha, Hassan, Fatima"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #ccc',
              borderRadius: '6px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#d32f2f', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </p>
        )}

        <button
          onClick={() => void handleStartLesson()}
          disabled={isLoading || !childName.trim()}
          style={{
            width: '100%',
            padding: '0.875rem',
            backgroundColor: isLoading ? '#ccc' : '#2d5016',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginBottom: '1rem'
          }}
        >
          {isLoading ? 'Starting lesson...' : '▶ Begin Lesson'}
        </button>

        <div
          style={{
            padding: '1rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '6px',
            fontSize: '0.9rem',
            color: '#555',
            lineHeight: '1.6'
          }}
        >
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>How it works:</strong>
          </p>
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
            <li>Teacher greets your child in Hyderabadi Hindi</li>
            <li>Introduces each Arabic letter one by one</li>
            <li>Child repeats the letter after listening</li>
            <li>Teacher praises and moves to next letter</li>
            <li>Progress is tracked for your practice sessions</li>
          </ul>
        </div>
      </section>

      <section className="card" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <Link href="/" style={{ color: '#2d5016', textDecoration: 'none', fontSize: '0.95rem' }}>
          ← Back to home
        </Link>
      </section>
    </div>
  );
}
