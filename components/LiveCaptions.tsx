import type { TranscriptEntry } from '@/lib/ielts/types';

export default function LiveCaptions({ transcript }: { transcript: TranscriptEntry[] }) {
  return (
    <div className="speaking-captions">
      {transcript.map((item, idx) => (
        <div key={`${item.ts}-${idx}`} className={`cap-row ${item.role}`}>
          <strong>{item.role === 'examiner' ? 'Examiner' : 'Student'}:</strong> {item.text}
        </div>
      ))}
    </div>
  );
}
