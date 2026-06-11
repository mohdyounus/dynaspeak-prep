'use client';

type MicState = 'idle' | 'listening' | 'speaking' | 'thinking';

export default function MicButton({
  state,
  disabled,
  onToggle
}: {
  state: MicState;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const label = state === 'listening' ? 'Mic On' : 'Enable Mic';

  return (
    <button
      type="button"
      className={`mic-btn mic-${state}`}
      disabled={disabled}
      onClick={onToggle}
      aria-live="polite"
      aria-label={label}
    >
      <span className="mic-dot" />
      {state === 'thinking' ? 'Thinking...' : label}
    </button>
  );
}
