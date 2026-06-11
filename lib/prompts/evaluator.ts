import type { EvaluationReport, TranscriptEntry } from '@/lib/ielts/types';

export function buildEvaluatorPrompt(input: {
  transcript: TranscriptEntry[];
  targetScore: string;
}) {
  return `You are a senior IELTS examiner. Score the following speaking transcript using IELTS criteria.

Target score: ${input.targetScore}
Transcript JSON:
${JSON.stringify(input.transcript)}

Return JSON only with this shape:
{
  "overallBand": number,
  "criteria": {
    "fluencyCoherence": { "band": number, "evidence": string[], "tips": string[] },
    "lexicalResource": { "band": number, "evidence": string[], "tips": string[] },
    "grammaticalRange": { "band": number, "evidence": string[], "tips": string[] },
    "pronunciation": { "band": number, "confidence": "low" | "medium", "evidence": string[], "tips": string[] }
  },
  "errorLog": [{ "studentSaid": string, "correction": string, "rule": string }],
  "gapToTarget": string,
  "nextSessionFocus": string[]
}`;
}

export function buildFallbackReport(targetScore: string): EvaluationReport {
  return {
    overallBand: 6.0,
    criteria: {
      fluencyCoherence: {
        band: 6.0,
        evidence: ['Able to respond to questions with generally clear ideas.'],
        tips: ['Practice extending answers with one extra supporting example.']
      },
      lexicalResource: {
        band: 6.0,
        evidence: ['Uses useful everyday vocabulary with occasional repetition.'],
        tips: ['Prepare topic word banks for work, study, and technology themes.']
      },
      grammaticalRange: {
        band: 5.5,
        evidence: ['Some complex attempts, but errors appear in tense and agreement.'],
        tips: ['Review present perfect and conditionals in short daily drills.']
      },
      pronunciation: {
        band: 5.5,
        confidence: 'low',
        evidence: ['Estimated from transcript only, no direct audio scoring.'],
        tips: ['Shadow short model answers and record yourself for stress and clarity.']
      }
    },
    errorLog: [
      {
        studentSaid: 'He go to work every day.',
        correction: 'He goes to work every day.',
        rule: 'Third-person singular in present simple takes -s.'
      }
    ],
    gapToTarget: `Current estimate is below target ${targetScore}; focus on grammar control and answer expansion.`,
    nextSessionFocus: ['Longer Part 2 responses', 'Tense consistency', 'Topic vocabulary precision']
  };
}
