import { describe, expect, it } from 'vitest';
import { evidenceTypeForMimeType, isEditableTarget } from './capture-utils';

describe('capture utilities', () => {
  it('does not intercept paste inside editable controls', () => {
    expect(isEditableTarget({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(isEditableTarget({ tagName: 'DIV' })).toBe(false);
  });

  it('maps dropped files to evidence types', () => {
    expect(evidenceTypeForMimeType('image/png')).toBe('Image');
    expect(evidenceTypeForMimeType('application/pdf')).toBe('ResearchPDF');
    expect(evidenceTypeForMimeType('video/mp4')).toBe('Video');
    expect(evidenceTypeForMimeType('audio/mpeg')).toBe('VoiceRecording');
    expect(evidenceTypeForMimeType('application/zip')).toBe('Other');
  });
});
