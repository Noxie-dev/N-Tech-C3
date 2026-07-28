import type { EvidenceInput } from '@workspace/api-client-react';

export function isEditableTarget(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false;
  const candidate = target as { isContentEditable?: boolean; tagName?: string };
  return candidate.isContentEditable === true
    || ['INPUT', 'TEXTAREA', 'SELECT'].includes(candidate.tagName ?? '');
}

export function evidenceTypeForMimeType(mimeType: string): EvidenceInput['type'] {
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType === 'application/pdf') return 'ResearchPDF';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'VoiceRecording';
  return 'Other';
}
