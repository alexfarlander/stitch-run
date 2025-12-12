/**
 * Worker Registry Test for Image-to-Video Worker
 * Verifies that the Image-to-Video worker is properly registered
 */

import { describe, it, expect } from 'vitest';
// Import from index to ensure registration happens
import { workerRegistry, ImageToVideoWorker } from '../index';

describe('Worker Registry - Image-to-Video', () => {
  it('should have image-to-video worker registered', () => {
    expect(workerRegistry.hasWorker('image-to-video')).toBe(true);
  });

  it('should return ImageToVideoWorker instance when requested', () => {
    const worker = workerRegistry.getWorker('image-to-video');
    expect(worker).toBeInstanceOf(ImageToVideoWorker);
  });
});
