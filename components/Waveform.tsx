'use client';

export default function Waveform({ active }: { active: boolean }) {
  return (
    <div className={`waveform ${active ? 'active' : ''}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}
