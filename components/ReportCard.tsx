import type { EvaluationCriterion } from '@/lib/ielts/types';

export default function ReportCard({
  title,
  criterion,
  extra
}: {
  title: string;
  criterion: EvaluationCriterion;
  extra?: string;
}) {
  return (
    <div className="criteria-item">
      <h3>{title}</h3>
      <p>Band: {criterion.band.toFixed(1)}{extra ? ` (${extra})` : ''}</p>
      <p>{criterion.evidence[0] || 'No evidence yet.'}</p>
      <p><strong>Tip:</strong> {criterion.tips[0] || 'Keep practising.'}</p>
    </div>
  );
}
