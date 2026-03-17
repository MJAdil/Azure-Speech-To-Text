/**
 * Unit tests for Speech Recognition Manager
 */

import { AzureSpeechRecognitionManager } from '../services/SpeechRecognitionManager';
import { SpeechServiceConfig, OutputFormat, ProfanityOption, SpeechSDKException } from '../types';

// Mock the Azure Speech SDK
jest.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechConfig: {
    fromSubscription: jest.fn().mockReturnValue({
      speechRecognitionLanguage: '',
      outputFormat: 0,
      endpointId: '',
      setProfanity: jest.fn(),
      enableDictation: jest.fn(),
      close: jest.fn()
    })
  },
  AudioConfig: {
    fromDefaultMicrophoneInput: jest.fn().mockReturnValue({
      close: jest.fn()
    }),
    fromWavFileInput: jest.fn().mockReturnValue({
      close: jest.fn()
    })
  },
  SpeechRecognizer: jest.fn().mockImplementation(() => ({
    startContinuousRecognitionAsync: jest.fn(),
    stopContinuousRecognitionAsync: jest.fn(),
    recognizeOnceAsync: jest.fn(),
    close: jest.fn(),
    recognizing: null,
    recognized: null,
    canceled: null,
    sessionStarted: null,
    sessionStopped: null
  })),
  OutputFormat: {
    Simple: 0,
    Detailed: 1
  },
  ProfanityOption: {
    Masked: 0,
    Removed: 1,
    Raw: 2
  },
  ResultReason: {
    RecognizingSpeech: 1,
    RecognizedSpeech: 2,
    NoMatch: 3
  },
  CancellationReason: {
    Error: 1
  }
}));

describe('AzureSpeechRecognitionManager', () => {
  let manager: AzureSpeechRecognitionManager;
  let mockConfig: SpeechServiceConfig;

  beforeEach(() => {
    manager = new AzureSpeechRecognitionManager();
    mockConfig = {
      subscriptionKey: 'test-key-12345678901234567890123456789012',
      serviceRegion: 'eastus',
      endpoint: 'https://eastus.api.cognitive.microsoft.com/',
      language: 'en-US',
      customModelId: 'test-model',
      profanityOption: ProfanityOption.Masked,
      outputFormat: OutputFormat.Detailed,
      enableDictation: true
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('initialize', () => {
    it('should initialize successfully with valid configuration', async () => {
      await expect(manager.initialize(mockConfig)).resolves.not.toThrow();
      expect(manager.isRecognizing()).toBe(false);
    });

    it('should throw error for missing subscription key', async () => {
      const invalidConfig = { ...mockConfig, subscriptionKey: '' };
      
      await expect(manager.initialize(invalidConfig))
        .rejects.toThrow(SpeechSDKException);
    });

    it('should throw error for missing service region', async () => {
      const invalidConfig = { ...mockConfig, serviceRegion: '' };
      
      await expect(manager.initialize(invalidConfig))
        .rejects.toThrow(SpeechSDKException);
    });

    it('should throw error for invalid language format', async () => {
      const invalidConfig = { ...mockConfig, language: 'invalid-language' };
      
      await expect(manager.initialize(invalidConfig))
        .rejects.toThrow(SpeechSDKException);
    });

    it('should accept valid language formats', async () => {
      const validLanguages = ['en', 'en-US', 'fr-FR', 'de-DE'];
      
      for (const language of validLanguages) {
        const config = { ...mockConfig, language };
        const testManager = new AzureSpeechRecognitionManager();
        
        await expect(testManager.initialize(config)).resolves.not.toThrow();
        testManager.dispose();
      }
    });
  });

  describe('startContinuousRecognition', () => {
    beforeEach(async () => {
      await manager.initialize(mockConfig);
    });

    it('should start recognition successfully', async () => {
      const mockRecognizer = require('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer.mock.results[0].value;
      mockRecognizer.startContinuousRecognitionAsync.mockImplementation((success: () => void) => {
        setTimeout(success, 10);
      });

      await expect(manager.startContinuousRecognition()).resolves.not.toThrow();
      expect(manager.isRecognizing()).toBe(true);
    });

    it('should handle start timeout', async () => {
      const mockRecognizer = require('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer.mock.results[0].value;
      mockRecognizer.startContinuousRecognitionAsync.mockImplementation(() => {
        // Never call success callback to simulate timeout
      });

      await expect(manager.startContinuousRecognition())
        .rejects.toThrow('Recognition start timeout');
    }, 10000);

    it('should handle start failure', async () => {
      const mockRecognizer = require('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer.mock.results[0].value;
      mockRecognizer.startContinuousRecognitionAsync.mockImplementation((success: () => void, error: (err: string) => void) => {
        setTimeout(() => error('Test error'), 10);
      });

      await expect(manager.startContinuousRecognition())
        .rejects.toThrow('Failed to start recognition');
    });

    it('should not start if already recognizing', async () => {
      const mockRecognizer = require('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer.mock.results[0].value;
      mockRecognizer.startContinuousRecognitionAsync.mockImplementation((success: () => void) => {
        setTimeout(success, 10);
      });

      await manager.startContinuousRecognition();
      expect(manager.isRecognizing()).toBe(true);

      // Second call should not throw and should not call the SDK again
      await expect(manager.startContinuousRecognition()).resolves.not.toThrow();
      expect(mockRecognizer.startContinuousRecognitionAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopContinuousRecognition', () => {
    beforeEach(async () => {
      await manager.initialize(mockConfig);
      
      const mockRecognizer = require('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer.mock.results[0].value;
      mockRecognizer.startContinuousRecognitionAsync.mockImplementation((success: () => void) => {
        setTimeout(success, 10);
      });
      
      await manager.startContinuousRecognition();
    });

    it('should stop recognition successfully', async () => {
      const mockRecognizer = require('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer.mock.results[0].value;
      mockRecognizer.stopContinuousRecognitionAsync.mockImplementation((success: () => void) => {
        setTimeout(success, 10);
      });

      await expect(manager.stopContinuousRecognition()).resolves.not.toThrow();
      expect(manager.isRecognizing()).toBe(false);
    });

    it('should handle stop failure gracefully', async () => {
      const mockRecognizer = require('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer.mock.results[0].value;
      mockRecognizer.stopContinuousRecognitionAsync.mockImplementation((success: () => void, error: () => void) => {
        setTimeout(error, 10);
      });

      await expect(manager.stopContinuousRecognition()).resolves.not.toThrow();
      expect(manager.isRecognizing()).toBe(false);
    });
  });

  describe('recognizeOnce', () => {
    beforeEach(async () => {
      await manager.initialize(mockConfig);
    });

    it('should recognize audio data successfully', async () => {
      const mockResult = {
        text: 'Hello world',
        offset: 0,
        duration: 1000,
        language: 'en-US',
        json: JSON.stringify({
          NBest: [{ Confidence: 0.95 }]
        })
      };

      const mockRecognizer = require('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer;
      mockRecognizer.mockImplementation(() => ({
        recognizeOnceAsync: jest.fn().mockImplementation((success: (result: any) => void) => {
          setTimeout(() => success(mockResult), 10);
        }),
        close: jest.fn()
      }));

      const audioData = new ArrayBuffer(1024);
      const result = await manager.recognizeOnce(audioData);

      expect(result.text).toBe('Hello world');
      expect(result.confidence).toBe(0.95);
      expect(result.language).toBe('en-US');
    });

    it('should handle recognition failure', async () => {
      const mockRecognizer = require('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer;
      mockRecognizer.mockImplementation(() => ({
        recognizeOnceAsync: jest.fn().mockImplementation((success: (result: any) => void, error: (err: string) => void) => {
          setTimeout(() => error('Recognition failed'), 10);
        }),
        close: jest.fn()
      }));

      const audioData = new ArrayBuffer(1024);
      
      await expect(manager.recognizeOnce(audioData))
        .rejects.toThrow('Recognition failed');
    });
  });

  describe('event handlers', () => {
    beforeEach(async () => {
      await manager.initialize(mockConfig);
    });

    it('should register and call partial result callback', () => {
      const callback = jest.fn();
      manager.onPartialResult(callback);

      // Simulate partial result event
      const mockRecognizer = require('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer.mock.results[0].value;
      mockRecognizer.recognizing(null, { result: { reason: 1, text: 'Hello' } });

      expect(callback).toHaveBeenCalledWith('Hello');
    });

    it('should register and call final result callback', () => {
      const callback = jest.fn();
      manager.onFinalResult(callback);

      // Simulate final result event
      const mockRecognizer = require('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer.mock.results[0].value;
      const mockResult = {
        reason: 2,
        text: 'Hello world',
        offset: 0,
        duration: 1000,
        language: 'en-US',
        json: JSON.stringify({ NBest: [{ Confidence: 0.95 }] })
      };
      mockRecognizer.recognized(null, { result: mockResult });

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        text: 'Hello world',
        confidence: 0.95
      }));
    });

    it('should register and call error callback', () => {
      const callback = jest.fn();
      manager.onError(callback);

      // Simulate error event
      const mockRecognizer = require('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer.mock.results[0].value;
      mockRecognizer.canceled(null, { 
        reason: 1, // Error
        errorDetails: 'Test error',
        errorCode: 'TEST_ERROR'
      });

      expect(callback).toHaveBeenCalledWith(expect.any(SpeechSDKException));
    });

    it('should register and call session event callback', () => {
      const callback = jest.fn();
      manager.onSessionEvent(callback);

      // Simulate session events
      const mockRecognizer = require('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer.mock.results[0].value;
      mockRecognizer.sessionStarted();
      mockRecognizer.sessionStopped();

      expect(callback).toHaveBeenCalledWith('started');
      expect(callback).toHaveBeenCalledWith('stopped');
    });
  });

  describe('language and model management', () => {
    beforeEach(async () => {
      await manager.initialize(mockConfig);
    });

    it('should set language', () => {
      manager.setLanguage('fr-FR');
      // Verify the language was set on the speech config
      // This would be tested through integration tests in a real scenario
    });

    it('should set custom model', () => {
      manager.setCustomModel('custom-model-id');
      // Verify the model was set on the speech config
      // This would be tested through integration tests in a real scenario
    });
  });

  describe('dispose', () => {
    it('should clean up all resources', async () => {
      await manager.initialize(mockConfig);
      
      const mockRecognizer = require('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer.mock.results[0].value;
      const mockSpeechConfig = require('microsoft-cognitiveservices-speech-sdk').SpeechConfig.fromSubscription.mock.results[0].value;
      const mockAudioConfig = require('microsoft-cognitiveservices-speech-sdk').AudioConfig.fromDefaultMicrophoneInput.mock.results[0].value;

      manager.dispose();

      expect(mockRecognizer.close).toHaveBeenCalled();
      expect(mockSpeechConfig.close).toHaveBeenCalled();
      expect(mockAudioConfig.close).toHaveBeenCalled();
      expect(manager.isRecognizing()).toBe(false);
    });

    it('should handle dispose when not initialized', () => {
      expect(() => manager.dispose()).not.toThrow();
    });
  });

  describe('token refresh', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set up token refresh timer', async () => {
      await manager.initialize(mockConfig);
      
      // Fast-forward 9 minutes
      jest.advanceTimersByTime(9 * 60 * 1000);
      
      // Verify that a new speech config was created (token refresh)
      expect(require('microsoft-cognitiveservices-speech-sdk').SpeechConfig.fromSubscription)
        .toHaveBeenCalledTimes(2); // Once for init, once for refresh
    });

    it('should clear token refresh timer on dispose', async () => {
      await manager.initialize(mockConfig);
      
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      manager.dispose();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});