/**
 * Property-based tests for AudioCaptureService
 * Tests universal properties that should hold across all valid inputs
 */

import * as fc from 'fast-check';
import { AudioCaptureServiceImpl } from '../services/AudioCaptureService';

// Mock MediaDevices API for property tests
const mockGetUserMedia = jest.fn();
const mockEnumerateDevices = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

// Mock MediaStream and MediaStreamTrack
const mockMediaStreamTrack = {
  stop: jest.fn(),
  enabled: true,
  getSettings: jest.fn(() => ({
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true
  })),
  applyConstraints: jest.fn().mockResolvedValue(undefined)
};

const mockMediaStream = {
  getTracks: jest.fn(() => [mockMediaStreamTrack]),
  getAudioTracks: jest.fn(() => [mockMediaStreamTrack]),
  active: true
};

// Mock AudioContext
const mockAnalyser = {
  fftSize: 256,
  smoothingTimeConstant: 0.8,
  frequencyBinCount: 128,
  getByteFrequencyData: jest.fn()
};

const mockAudioContext = {
  createAnalyser: jest.fn(() => mockAnalyser),
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn()
  })),
  close: jest.fn(),
  state: 'running'
};

// Setup global mocks
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: mockEnumerateDevices,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener
  },
  writable: true
});

Object.defineProperty(global.window, 'AudioContext', {
  value: jest.fn(() => mockAudioContext),
  writable: true
});

describe('AudioCaptureService Property Tests', () => {
  let audioService: AudioCaptureServiceImpl;

  beforeEach(() => {
    audioService = new AudioCaptureServiceImpl();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockGetUserMedia.mockResolvedValue(mockMediaStream);
    mockEnumerateDevices.mockResolvedValue([
      { deviceId: 'device1', kind: 'audioinput', label: 'Microphone 1', groupId: 'group1' },
      { deviceId: 'device2', kind: 'audioinput', label: 'Microphone 2', groupId: 'group2' }
    ]);
  });

  afterEach(async () => {
    if (audioService.isRecording()) {
      await audioService.stopRecording();
    }
  });

  /**
   * Property 2: Audio Streaming Continuity
   * For any active audio capture session, the Audio_Capture_Service should stream 
   * audio data continuously without gaps or interruptions while the session remains active
   * 
   * Validates: Requirements 1.2, 2.5
   */
  describe('Property 2: Audio Streaming Continuity', () => {
    test('should maintain continuous audio streaming during active session', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 0, max: 255 }), { minLength: 128, maxLength: 128 }),
          fc.integer({ min: 100, max: 1000 }), // Duration in ms
          async (audioData: number[], duration: number) => {
            // Setup mock to simulate continuous audio data
            mockAnalyser.getByteFrequencyData.mockImplementation((dataArray: Uint8Array) => {
              for (let i = 0; i < Math.min(dataArray.length, audioData.length); i++) {
                dataArray[i] = audioData[i] || 0;
              }
            });

            await audioService.startRecording();
            
            // Simulate continuous audio streaming over time
            const startTime = Date.now();
            let lastLevel = -1;
            let continuousReadings = 0;
            
            while (Date.now() - startTime < duration) {
              const currentLevel = audioService.getAudioLevel();
              
              // Audio level should be available (>= 0) during active recording
              expect(currentLevel).toBeGreaterThanOrEqual(0);
              expect(currentLevel).toBeLessThanOrEqual(1);
              
              // If we have audio data, level should be consistent with input
              if (audioData.some(val => val > 0)) {
                expect(currentLevel).toBeGreaterThan(0);
              }
              
              continuousReadings++;
              lastLevel = currentLevel;
              
              // Small delay to simulate real-time processing
              await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            // Should have continuous readings throughout the session
            expect(continuousReadings).toBeGreaterThan(0);
            
            await audioService.stopRecording();
            
            // After stopping, audio level should return to 0
            expect(audioService.getAudioLevel()).toBe(0);
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    });

    test('should maintain stream continuity across pause/resume cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 3 }), // Number of pause/resume cycles
          async (pauseCycles: number[]) => {
            await audioService.startRecording();
            
            let wasRecordingBeforePause = true;
            
            for (const cycleCount of pauseCycles) {
              // Verify recording state before pause
              expect(audioService.isRecording()).toBe(wasRecordingBeforePause);
              
              // Pause recording
              await audioService.pauseRecording();
              expect(audioService.isRecording()).toBe(false);
              expect(audioService.getAudioLevel()).toBe(0); // No audio during pause
              
              // Resume recording
              await audioService.resumeRecording();
              expect(audioService.isRecording()).toBe(true);
              
              // Audio stream should be available again
              expect(audioService.getAudioStream()).toBe(mockMediaStream);
              
              wasRecordingBeforePause = true;
            }
            
            await audioService.stopRecording();
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Property 6: Audio Level Monitoring
   * For any audio input during capture, if the audio level falls below the minimum 
   * threshold, the Audio_Capture_Service should notify the user
   * 
   * Validates: Requirements 2.3
   */
  describe('Property 6: Audio Level Monitoring', () => {
    test('should correctly detect audio levels across all input ranges', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 0, max: 255 }), { minLength: 128, maxLength: 128 }),
          async (audioData: number[]) => {
            // Setup mock with specific audio data
            mockAnalyser.getByteFrequencyData.mockImplementation((dataArray: Uint8Array) => {
              for (let i = 0; i < Math.min(dataArray.length, audioData.length); i++) {
                dataArray[i] = audioData[i] || 0;
              }
            });

            await audioService.startRecording();
            
            const audioLevel = audioService.getAudioLevel();
            
            // Audio level should always be in valid range
            expect(audioLevel).toBeGreaterThanOrEqual(0);
            expect(audioLevel).toBeLessThanOrEqual(1);
            
            // Calculate expected RMS from input data
            const sum = audioData.reduce((acc, val) => acc + val * val, 0);
            const expectedRMS = Math.sqrt(sum / audioData.length);
            const expectedLevel = Math.min(expectedRMS / 255, 1.0);
            
            // Audio level should match calculated RMS (within tolerance)
            expect(Math.abs(audioLevel - expectedLevel)).toBeLessThan(0.01);
            
            // Test adequacy detection
            const isAdequate = audioService.isAudioLevelAdequate();
            const shouldBeAdequate = expectedLevel >= 0.01; // MINIMUM_AUDIO_LEVEL
            
            expect(isAdequate).toBe(shouldBeAdequate);
            
            await audioService.stopRecording();
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should maintain consistent audio level calculations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 50, max: 200 }), { minLength: 128, maxLength: 128 }),
          async (audioData: number[]) => {
            // Setup consistent audio data
            mockAnalyser.getByteFrequencyData.mockImplementation((dataArray: Uint8Array) => {
              for (let i = 0; i < Math.min(dataArray.length, audioData.length); i++) {
                dataArray[i] = audioData[i] || 0;
              }
            });

            await audioService.startRecording();
            
            // Take multiple readings
            const readings: number[] = [];
            for (let i = 0; i < 5; i++) {
              readings.push(audioService.getAudioLevel());
              await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            // All readings should be identical for consistent input
            const firstReading = readings[0];
            if (firstReading !== undefined) {
              for (const reading of readings) {
                expect(Math.abs(reading - firstReading)).toBeLessThan(0.001);
              }
            }
            
            // All readings should be > 0 for non-zero input
            if (audioData.some(val => val > 0)) {
              for (const reading of readings) {
                expect(reading).toBeGreaterThan(0);
              }
            }
            
            await audioService.stopRecording();
          }
        ),
        { numRuns: 10 }
      );
    });

    test('should handle edge cases in audio level detection', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(new Array(128).fill(0)), // Silent audio
            fc.constant(new Array(128).fill(255)), // Maximum audio
            fc.constant(new Array(128).fill(1)), // Minimal audio
            fc.array(fc.constantFrom(0, 255), { minLength: 128, maxLength: 128 }) // Binary audio
          ),
          async (audioData: number[]) => {
            mockAnalyser.getByteFrequencyData.mockImplementation((dataArray: Uint8Array) => {
              for (let i = 0; i < Math.min(dataArray.length, audioData.length); i++) {
                dataArray[i] = audioData[i] || 0;
              }
            });

            await audioService.startRecording();
            
            const audioLevel = audioService.getAudioLevel();
            
            // Verify edge case behavior
            if (audioData.every(val => val === 0)) {
              // Silent audio should produce 0 level
              expect(audioLevel).toBe(0);
              expect(audioService.isAudioLevelAdequate()).toBe(false);
            } else if (audioData.every(val => val === 255)) {
              // Maximum audio should produce level close to 1
              expect(audioLevel).toBeCloseTo(1, 2);
              expect(audioService.isAudioLevelAdequate()).toBe(true);
            } else if (audioData.every(val => val === 1)) {
              // Minimal audio should produce very low level
              expect(audioLevel).toBeGreaterThan(0);
              expect(audioLevel).toBeLessThan(0.01);
            }
            
            // Level should always be in valid range regardless of input
            expect(audioLevel).toBeGreaterThanOrEqual(0);
            expect(audioLevel).toBeLessThanOrEqual(1);
            
            await audioService.stopRecording();
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  /**
   * Additional Property: Resource Management Consistency
   * For any sequence of operations, resources should be properly managed
   */
  describe('Resource Management Consistency', () => {
    test('should maintain consistent state across operation sequences', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.oneof(
              fc.constant('start'),
              fc.constant('stop'),
              fc.constant('pause'),
              fc.constant('resume')
            ),
            { minLength: 1, maxLength: 10 }
          ),
          async (operations: string[]) => {
            let expectedRecording = false;
            let expectedPaused = false;
            
            for (const operation of operations) {
              const initialRecording = audioService.isRecording();
              const initialStream = audioService.getAudioStream();
              
              try {
                switch (operation) {
                  case 'start':
                    if (!expectedRecording) {
                      await audioService.startRecording();
                      expectedRecording = true;
                      expectedPaused = false;
                    }
                    break;
                  case 'stop':
                    if (expectedRecording) {
                      await audioService.stopRecording();
                      expectedRecording = false;
                      expectedPaused = false;
                    }
                    break;
                  case 'pause':
                    if (expectedRecording && !expectedPaused) {
                      await audioService.pauseRecording();
                      expectedPaused = true;
                    }
                    break;
                  case 'resume':
                    if (expectedRecording && expectedPaused) {
                      await audioService.resumeRecording();
                      expectedPaused = false;
                    }
                    break;
                }
              } catch (error) {
                // Some operations may fail in certain states, which is expected
                continue;
              }
              
              // Verify state consistency
              const actualRecording = audioService.isRecording();
              const expectedState = expectedRecording && !expectedPaused;
              
              expect(actualRecording).toBe(expectedState);
              
              // Stream should be available when recording is active
              if (expectedRecording) {
                expect(audioService.getAudioStream()).toBeTruthy();
              } else {
                expect(audioService.getAudioStream()).toBeNull();
              }
            }
            
            // Clean up
            if (expectedRecording) {
              await audioService.stopRecording();
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});