'use client';

import { useEffect, useMemo, useState } from 'react';

type CuePhase = 'prep' | 'speaking' | 'done';

export default function CueCard({
  topic,
  bullets,
  prepSeconds = 60,
  speakingSeconds = 120,
  active
}: {
  topic: string;
  bullets: string[];
  prepSeconds?: number;
  speakingSeconds?: number;
  active: boolean;
}) {
  const [phase, setPhase] = useState<CuePhase>('prep');
  const [remaining, setRemaining] = useState(prepSeconds);

  useEffect(() => {
    if (!active) return;
    setPhase('prep');
    setRemaining(prepSeconds);
  }, [active, prepSeconds]);

  useEffect(() => {
    if (!active || phase === 'done') return;

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev > 1) return prev - 1;

        if (phase === 'prep') {
          setPhase('speaking');
          return speakingSeconds;
        }

        setPhase('done');
        return 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [active, phase, speakingSeconds]);

  const label = useMemo(() => {
    if (phase === 'prep') return 'Preparation Time';
    if (phase === 'speaking') return 'Speaking Time';
    return 'Completed';
  }, [phase]);

  return (
    <div className="cue-card">
      <h3>Part 2 Cue Card</h3>
      <p><strong>Topic:</strong> {topic}</p>
      <ul>
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <p className="cue-phase">{label}: {remaining}s</p>
    </div>
  );
}
