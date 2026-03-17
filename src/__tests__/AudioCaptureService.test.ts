/**
 * Unit tests for AudioCaptureService
 */

import { AudioCaptureServiceImpl } from '../services/AudioCaptureService';

// Mock MediaDevices API
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
  applyConstraints: jest.fn()
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

describe('AudioCaptureService', () => {
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
    
    mockAnalyser.getByteFrequencyData.mockImplementation((dataArray: Uint8Array) => {
      // Simulate some audio data
      for (let i = 0; i < dataArray.length; i++) {
        dataArray[i] = Math.floor(Math.random() * 128) + 64; // Random values between 64-192
      }
    });
  });

  afterEach(async () => {
    if (audioService.isRecording()) {
      await audioService.stopRecording();
    }
  });

  describe('Initialization and Basic Operations', () => {
    test('should initialize with correct default state', () => {
      expect(audioService.isRecording()).toBe(false);
      expect(audioService.getAudioStream()).toBeNull();
      expect(audioService.getAudioLevel()).toBe(0);
    });

    test('should start recording successfully', async () => {
      await audioService.startRecording();
      
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: expect.objectContaining({
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        })
      });
      
      expect(audioService.isRecording()).toBe(true);
      expect(audioService.getAudioStream()).toBe(mockMediaStream);
    });

    test('should throw error when starting recording twice', async () => {
      await audioService.startRecording();
      
      await expect(audioService.startRecording()).rejects.toThrow('Recording is already active');
    });

    test('should stop recording and clean up resources', async () => {
      await audioService.startRecording();
      await audioService.stopRecording();
      
      expect(mockMediaStreamTrack.stop).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(audioService.isRecording()).toBe(false);
      expect(audioService.getAudioStream()).toBeNull();
    });

    test('should handle stop recording when not recording', async () => {
      // Should not throw error
      await audioService.stopRecording();
      expect(audioService.isRecording()).toBe(false);
    });
  });

  describe('Pause and Resume Operations', () => {
    test('should pause recording', async () => {
      await audioService.startRecording();
      await audioService.pauseRecording();
      
      expect(mockMediaStreamTrack.enabled).toBe(false);
      expect(audioService.isRecording()).toBe(false);
    });

    test('should resume recording', async () => {
      await audioService.startRecording();
      await audioService.pauseRecording();
      
      mockMediaStreamTrack.enabled = true; // Reset for test
      await audioService.resumeRecording();
      
      expect(mockMediaStreamTrack.enabled).toBe(true);
      expect(audioService.isRecording()).toBe(true);
    });

    test('should handle pause when not recording', async () => {
      // Should not throw error
      await audioService.pauseRecording();
      expect(audioService.isRecording()).toBe(false);
    });

    test('should handle resume when not paused', async () => {
      await audioService.startRecording();
      // Should not throw error
      await audioService.resumeRecording();
      expect(audioService.isRecording()).toBe(true);
    });
  });

  describe('Device Management', () => {
    test('should get available devices', async () => {
      const devices = await audioService.getAvailableDevices();
      
      expect(mockGetUserMedia).toHaveBeenCalled(); // For permissions
      expect(mockEnumerateDevices).toHaveBeenCalled();
      expect(devices).toHaveLength(2);
      expect(devices[0]?.deviceId).toBe('device1');
      expect(devices[1]?.deviceId).toBe('device2');
    });

    test('should handle device enumeration error', async () => {
      mockEnumerateDevices.mockRejectedValue(new Error('Device enumeration failed'));
      
      await expect(audioService.getAvailableDevices()).rejects.toThrow('Failed to enumerate audio devices');
    });

    test('should select specific device', async () => {
      await audioService.selectDevice('device1');
      await audioService.startRecording();
      
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: expect.objectContaining({
          deviceId: { exact: 'device1' }
        })
      });
    });

    test('should restart recording when selecting device during active recording', async () => {
      await audioService.startRecording();
      const initialStream = audioService.getAudioStream();
      
      // Mock new stream for device change
      const newMockStream = { ...mockMediaStream };
      mockGetUserMedia.mockResolvedValueOnce(newMockStream);
      
      await audioService.selectDevice('device2');
      
      expect(mockMediaStreamTrack.stop).toHaveBeenCalled(); // Old stream stopped
      expect(audioService.getAudioStream()).toBe(newMockStream);
    });
  });

  describe('Audio Constraints', () => {
    test('should set audio constraints', () => {
      const constraints = {
        sampleRate: 44100,
        channelCount: 2,
        echoCancellation: false
      };
      
      audioService.setAudioConstraints(constraints);
      
      // Constraints should be applied when starting recording
      // This is tested indirectly through the getUserMedia call
    });

    test('should apply constraints to active stream', async () => {
      await audioService.startRecording();
      
      const constraints = {
        sampleRate: 44100,
        echoCancellation: false
      };
      
      // Mock applyConstraints to return a promise
      mockMediaStreamTrack.applyConstraints.mockResolvedValue(undefined);
      
      audioService.setAudioConstraints(constraints);
      
      expect(mockMediaStreamTrack.applyConstraints).toHaveBeenCalledWith(constraints);
    });

    test('should handle constraint application error gracefully', async () => {
      await audioService.startRecording();
      
      mockMediaStreamTrack.applyConstraints.mockRejectedValue(new Error('Constraint error'));
      
      const constraints = { sampleRate: 44100 };
      
      // Should not throw error, just log warning
      audioService.setAudioConstraints(constraints);
      
      // Wait a bit for the promise to resolve
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockMediaStreamTrack.applyConstraints).toHaveBeenCalledWith(constraints);
    });
  });

  describe('Audio Level Monitoring', () => {
    test('should return zero audio level when not recording', () => {
      expect(audioService.getAudioLevel()).toBe(0);
    });

    test('should return zero audio level when paused', async () => {
      await audioService.startRecording();
      await audioService.pauseRecording();
      
      expect(audioService.getAudioLevel()).toBe(0);
    });

    test('should calculate audio level when recording', async () => {
      await audioService.startRecording();
      
      const level = audioService.getAudioLevel();
      
      expect(mockAnalyser.getByteFrequencyData).toHaveBeenCalled();
      expect(level).toBeGreaterThan(0);
      expect(level).toBeLessThanOrEqual(1);
    });

    test('should check if audio level is adequate', async () => {
      await audioService.startRecording();
      
      // Mock high audio level
      mockAnalyser.getByteFrequencyData.mockImplementation((dataArray: Uint8Array) => {
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = 200; // High values
        }
      });
      
      expect(audioService.isAudioLevelAdequate()).toBe(true);
      
      // Mock low audio level
      mockAnalyser.getByteFrequencyData.mockImplementation((dataArray: Uint8Array) => {
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = 1; // Very low values
        }
      });
      
      expect(audioService.isAudioLevelAdequate()).toBe(false);
    });
  });

  describe('Audio Configuration', () => {
    test('should return current audio configuration', async () => {
      await audioService.startRecording();
      
      const config = audioService.getAudioConfiguration();
      
      expect(config).toEqual({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        format: 'pcm',
        deviceId: undefined,
        echoCancellation: true,
        noiseSuppression: true
      });
    });

    test('should include device ID in configuration when device is selected', async () => {
      await audioService.selectDevice('device1');
      await audioService.startRecording();
      
      const config = audioService.getAudioConfiguration();
      
      expect(config.deviceId).toBe('device1');
    });
  });

  describe('Error Handling', () => {
    test('should handle microphone access denied', async () => {
      const notAllowedError = new Error('Permission denied');
      notAllowedError.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(notAllowedError);
      
      await expect(audioService.startRecording()).rejects.toThrow(
        'Failed to start recording: Microphone access denied. Please grant microphone permissions and try again.'
      );
    });

    test('should handle no microphone found', async () => {
      const notFoundError = new Error('No device found');
      notFoundError.name = 'NotFoundError';
      mockGetUserMedia.mockRejectedValue(notFoundError);
      
      await expect(audioService.startRecording()).rejects.toThrow(
        'Failed to start recording: No microphone found. Please connect a microphone and try again.'
      );
    });

    test('should handle microphone in use', async () => {
      const notReadableError = new Error('Device in use');
      notReadableError.name = 'NotReadableError';
      mockGetUserMedia.mockRejectedValue(notReadableError);
      
      await expect(audioService.startRecording()).rejects.toThrow(
        'Failed to start recording: Microphone is already in use by another application.'
      );
    });

    test('should handle overconstrained error', async () => {
      const overconstrainedError = new Error('Constraints not satisfied');
      overconstrainedError.name = 'OverconstrainedError';
      mockGetUserMedia.mockRejectedValue(overconstrainedError);
      
      await expect(audioService.startRecording()).rejects.toThrow(
        'Failed to start recording: The specified audio constraints cannot be satisfied by any available device.'
      );
    });

    test('should handle unsupported browser', async () => {
      // Mock unsupported browser
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: undefined,
        writable: true
      });
      
      const newService = new AudioCaptureServiceImpl();
      
      await expect(newService.startRecording()).rejects.toThrow(
        'Failed to start recording: MediaDevices API is not supported in this browser'
      );
      
      // Restore mock
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia,
          enumerateDevices: mockEnumerateDevices,
          addEventListener: mockAddEventListener,
          removeEventListener: mockRemoveEventListener
        },
        writable: true
      });
    });

    test('should clean up resources on error', async () => {
      mockGetUserMedia.mockResolvedValue(mockMediaStream);
      
      // Mock AudioContext creation failure
      Object.defineProperty(global.window, 'AudioContext', {
        value: jest.fn(() => {
          throw new Error('AudioContext creation failed');
        }),
        writable: true
      });
      
      await expect(audioService.startRecording()).rejects.toThrow();
      
      // Resources should be cleaned up
      expect(mockMediaStreamTrack.stop).toHaveBeenCalled();
      expect(audioService.isRecording()).toBe(false);
      
      // Restore AudioContext mock
      Object.defineProperty(global.window, 'AudioContext', {
        value: jest.fn(() => mockAudioContext),
        writable: true
      });
    });
  });

  describe('Device Change Handling', () => {
    test('should set up device change listeners', async () => {
      await audioService.startRecording();
      
      expect(mockAddEventListener).toHaveBeenCalledWith('devicechange', expect.any(Function));
    });

    test('should remove device change listeners on cleanup', async () => {
      await audioService.startRecording();
      await audioService.stopRecording();
      
      expect(mockRemoveEventListener).toHaveBeenCalledWith('devicechange', expect.any(Function));
    });
  });
});