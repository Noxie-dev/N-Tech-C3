import { get, run } from '@workspace/db';

export type IntelligenceClassification = 'deterministic' | 'heuristic' | 'model-assisted';

export type AnalysisResult<T> = {
  value: T;
  explanation: string;
  evidenceRefs?: string[];
  confidence?: number;
};

export type IntelligenceCapability<T> = {
  id: string;
  version: string;
  resultKind: string;
  classification: IntelligenceClassification;
  analyze: () => AnalysisResult<T>;
};

export function executeCapability<T>(input: {
  capability: IntelligenceCapability<T>;
  subjectType: string;
  subjectId: number;
  inputWatermark: string;
}): T {
  const { capability, subjectType, subjectId, inputWatermark } = input;
  const resultKey = [
    capability.id, capability.version, subjectType, subjectId, inputWatermark,
  ].join(':');
  const cached = get(
    'SELECT value FROM intelligence_results WHERE result_key = ? AND invalidated_at IS NULL',
    [resultKey],
  );
  if (cached) return JSON.parse(String(cached.value)) as T;

  const result = capability.analyze();
  run(`
    INSERT INTO intelligence_results (
      result_key, capability_id, capability_version, result_kind, subject_type,
      subject_id, input_watermark, classification, value, explanation,
      evidence_refs, confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(result_key) DO UPDATE SET
      value = excluded.value,
      explanation = excluded.explanation,
      evidence_refs = excluded.evidence_refs,
      confidence = excluded.confidence,
      calculated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
      invalidated_at = NULL
  `, [
    resultKey, capability.id, capability.version, capability.resultKind,
    subjectType, subjectId, inputWatermark, capability.classification,
    JSON.stringify(result.value), result.explanation,
    JSON.stringify(result.evidenceRefs ?? []), result.confidence ?? null,
  ]);
  return result.value;
}
