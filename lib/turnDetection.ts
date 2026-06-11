export type TurnDetectionMode = 'normal' | 'monologue';

export const TURN_DETECTION = {
  normalSilenceMs: 1000,
  monologueSilenceMs: 2500
};

export function getSilenceThreshold(mode: TurnDetectionMode): number {
  return mode === 'monologue' ? TURN_DETECTION.monologueSilenceMs : TURN_DETECTION.normalSilenceMs;
}
