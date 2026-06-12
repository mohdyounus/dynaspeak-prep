export type SessionStatus = 'created' | 'live' | 'ended' | 'evaluated';

export type SpeakingPart = 'part1' | 'part2' | 'part3';

export type TranscriptEntry = {
  role: 'examiner' | 'student';
  text: string;
  ts: number;
};

export type EvaluationCriterion = {
  band: number;
  evidence: string[];
  tips: string[];
};

export type EvaluationReport = {
  overallBand: number;
  criteria: {
    fluencyCoherence: EvaluationCriterion;
    lexicalResource: EvaluationCriterion;
    grammaticalRange: EvaluationCriterion;
    pronunciation: EvaluationCriterion & { confidence: 'low' | 'medium' };
  };
  errorLog: Array<{ studentSaid: string; correction: string; rule: string }>;
  gapToTarget: string;
  nextSessionFocus: string[];
};

export type SpeakingSession = {
  id: string;
  createdAt: string;
  targetScore: string;
  background: string;
  interests: string;
  examinerPrompt?: string;
  githubUsername?: string;
  profileSummary?: string;
  focus?: string[];
  status: SessionStatus;
  part?: SpeakingPart;
  transcript?: TranscriptEntry[];
  report?: EvaluationReport;
  durationSec?: number;
};
