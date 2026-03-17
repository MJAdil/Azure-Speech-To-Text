/**
 * Speech Recognition Service
 * High-level service that orchestrates speech recognition with audio capture and configuration
 */

import { SpeechRecognitionManager } from '../interfaces/SpeechRecognitionManager';
import { ConfigurationService } from '../interfaces/ConfigurationService';
import { AudioCaptureService } from '../interfaces/AudioCaptureService';
import { SpeechRecognitionFactory } from './SpeechRecognitionFactory';
import { RecognitionResult, SpeechSDKException } from '../types';

export interface SpeechRecognitionServiceEvents {
  onPartialResult?: (text: string) => void;
  onFinalResult?: (result: RecognitionResult) => void;
  onError?: (error: Error) => void;
  onSessionStarted?: () => void;
  onSessionStopped?: () => void;
  onAudioLevelChanged?: (level: number) => void;
}

export class SpeechRecognitionService {
  private recognitionManager: SpeechRecognitionManager | null = null;
  private factory: SpeechRecognitionFactory;
  private audioLevelMonitor: NodeJS.Timeout | null = null;
  private isServiceActive = false;

  constructor(
    private configService: ConfigurationService,
    private audioService: AudioCaptureService,
    private events: SpeechRecognitionServiceEvents = {}
  ) {
    this.factory = new SpeechRecognitionFactory(configService, audioService);
  }

  /**
   * Initialize the speech recognition service
   */
  async initialize(): Promise<void> {
    try {
      // Create the recognition manager
      this.recognitionManager = await this.factory.createSpeechRecognitionManager();

      // Set up event handlers
      this.setupEventHandlers();

      this.isServiceActive = true;
    } catch (error) {
      throw new SpeechSDKException(
        `Failed to initialize speech recognition service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SERVICE_INIT_FAILED'
      );
    }
  }

  /**
   * Start real-time speech recognition
   */
  async startRecognition(): Promise<void> {
    if (!this.recognitionManager) {
      throw new SpeechSDKException('Service not initialized', 'NOT_INITIALIZED');
    }

    try {
      // Start audio capture first
      await this.audioService.startRecording();

      // Start speech recognition
      await this.recognitionManager.startContinuousRecognition();

      // Start audio level monitoring
      this.startAudioLevelMonitoring();

      this.events.onSessionStarted?.();
    } catch (error) {
      // Clean up on failure
      await this.stopRecognition();
      throw new SpeechSDKException(
        `Failed to start recognition: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'START_FAILED'
      );
    }
  }

  /**
   * Stop speech recognition
   */
  async stopRecognition(): Promise<void> {
    try {
      // Stop audio level monitoring
      this.stopAudioLevelMonitoring();

      // Stop speech recognition
      if (this.recognitionManager) {
        await this.recognitionManager.stopContinuousRecognition();
      }

      // Stop audio capture
      if (this.audioService.isRecording()) {
        await this.audioService.stopRecording();
      }

      this.events.onSessionStopped?.();
    } catch (error) {
      console.error('Error stopping recognition:', error);
      // Don't throw here - we want to ensure cleanup happens
    }
  }

  /**
   * Pause recognition (keeps audio capture active)
   */
  async pauseRecognition(): Promise<void> {
    if (this.recognitionManager) {
      await this.recognitionManager.stopContinuousRecognition();
    }
    this.stopAudioLevelMonitoring();
  }

  /**
   * Resume recognition
   */
  async resumeRecognition(): Promise<void> {
    if (!this.recognitionManager) {
      throw new SpeechSDKException('Service not initialized', 'NOT_INITIALIZED');
    }

    await this.recognitionManager.startContinuousRecognition();
    this.startAudioLevelMonitoring();
  }

  /**
   * Change recognition language
   */
  async changeLanguage(language: string): Promise<void> {
    if (!this.recognitionManager) {
      throw new SpeechSDKException('Service not initialized', 'NOT_INITIALIZED');
    }

    const wasRecognizing = this.recognitionManager.isRecognizing();

    // Stop recognition if active
    if (wasRecognizing) {
      await this.recognitionManager.stopContinuousRecognition();
    }

    // Update language
    this.recognitionManager.setLanguage(language);

    // Update configuration service
    await this.configService.updateLanguageSettings({
      primaryLanguage: language,
      enableDictation: true,
      profanityOption: 'masked' as any
    });

    // Restart recognition if it was active
    if (wasRecognizing) {
      await this.recognitionManager.startContinuousRecognition();
    }
  }

  /**
   * Set custom language model
   */
  setCustomModel(modelId: string): void {
    if (!this.recognitionManager) {
      throw new SpeechSDKException('Service not initialized', 'NOT_INITIALIZED');
    }

    this.recognitionManager.setCustomModel(modelId);
  }

  /**
   * Get available audio devices
   */
  async getAvailableAudioDevices(): Promise<MediaDeviceInfo[]> {
    return await this.audioService.getAvailableDevices();
  }

  /**
   * Select audio input device
   */
  async selectAudioDevice(deviceId: string): Promise<void> {
    const wasRecording = this.audioService.isRecording();
    
    // Stop recording if active
    if (wasRecording) {
      await this.audioService.stopRecording();
    }

    // Select new device
    await this.audioService.selectDevice(deviceId);

    // Restart recording if it was active
    if (wasRecording) {
      await this.audioService.startRecording();
    }
  }

  /**
   * Get current audio level
   */
  getCurrentAudioLevel(): number {
    return this.audioService.getAudioLevel();
  }

  /**
   * Check if recognition is active
   */
  isRecognizing(): boolean {
    return this.recognitionManager?.isRecognizing() || false;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.isServiceActive && this.recognitionManager !== null;
  }

  /**
   * Update event handlers
   */
  updateEventHandlers(events: SpeechRecognitionServiceEvents): void {
    this.events = { ...this.events, ...events };
    
    // Re-setup event handlers if manager exists
    if (this.recognitionManager) {
      this.setupEventHandlers();
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.stopAudioLevelMonitoring();
    
    if (this.recognitionManager) {
      this.recognitionManager.dispose();
      this.recognitionManager = null;
    }

    this.isServiceActive = false;
  }

  /**
   * Set up event handlers for the recognition manager
   */
  private setupEventHandlers(): void {
    if (!this.recognitionManager) return;

    this.recognitionManager.onPartialResult((text) => {
      this.events.onPartialResult?.(text);
    });

    this.recognitionManager.onFinalResult((result) => {
      this.events.onFinalResult?.(result);
    });

    this.recognitionManager.onError((error) => {
      this.events.onError?.(error);
    });

    this.recognitionManager.onSessionEvent((event) => {
      if (event === 'started') {
        this.events.onSessionStarted?.();
      } else if (event === 'stopped') {
        this.events.onSessionStopped?.();
      }
    });
  }

  /**
   * Start monitoring audio levels
   */
  private startAudioLevelMonitoring(): void {
    this.audioLevelMonitor = setInterval(() => {
      const level = this.audioService.getAudioLevel();
      this.events.onAudioLevelChanged?.(level);

      // Check for low audio level (below 0.01 = 1%)
      if (level < 0.01 && this.audioService.isRecording()) {
        console.warn('Low audio level detected:', level);
      }
    }, 100); // Check every 100ms
  }

  /**
   * Stop monitoring audio levels
   */
  private stopAudioLevelMonitoring(): void {
    if (this.audioLevelMonitor) {
      clearInterval(this.audioLevelMonitor);
      this.audioLevelMonitor = null;
    }
  }
}