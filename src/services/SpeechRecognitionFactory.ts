/**
 * Speech Recognition Factory
 * Creates and configures Speech Recognition Manager with integrated services
 */

import { AzureSpeechRecognitionManager } from './SpeechRecognitionManager';
import { ConfigurationService } from '../interfaces/ConfigurationService';
import { AudioCaptureService } from '../interfaces/AudioCaptureService';
import { SpeechRecognitionManager } from '../interfaces/SpeechRecognitionManager';
import { SpeechSDKException } from '../types';

export class SpeechRecognitionFactory {
  constructor(
    private configService: ConfigurationService,
    private audioService: AudioCaptureService
  ) {}

  /**
   * Create and initialize a Speech Recognition Manager
   * @returns Configured Speech Recognition Manager
   */
  async createSpeechRecognitionManager(): Promise<SpeechRecognitionManager> {
    try {
      // Get configuration from the configuration service
      const config = await this.configService.getSpeechServiceConfig();
      
      // Validate configuration
      const isValid = await this.configService.validateConfiguration();
      if (!isValid) {
        throw new SpeechSDKException('Invalid configuration', 'INVALID_CONFIG');
      }

      // Create and initialize the speech recognition manager
      const manager = new AzureSpeechRecognitionManager();
      await manager.initialize(config);

      // Set up integration with audio capture service
      this.setupAudioIntegration(manager);

      return manager;
    } catch (error) {
      throw new SpeechSDKException(
        `Failed to create speech recognition manager: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FACTORY_ERROR'
      );
    }
  }

  /**
   * Create a Speech Recognition Manager with custom configuration
   * @param customConfig Custom configuration to override defaults
   * @returns Configured Speech Recognition Manager
   */
  async createWithCustomConfig(customConfig: Partial<any>): Promise<SpeechRecognitionManager> {
    try {
      // Get base configuration
      const baseConfig = await this.configService.getSpeechServiceConfig();
      
      // Merge with custom configuration
      const config = { ...baseConfig, ...customConfig };

      // Create and initialize the speech recognition manager
      const manager = new AzureSpeechRecognitionManager();
      await manager.initialize(config);

      // Set up integration with audio capture service
      this.setupAudioIntegration(manager);

      return manager;
    } catch (error) {
      throw new SpeechSDKException(
        `Failed to create speech recognition manager with custom config: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FACTORY_ERROR'
      );
    }
  }

  /**
   * Set up integration between speech recognition and audio capture
   */
  private setupAudioIntegration(manager: SpeechRecognitionManager): void {
    // Set up error handling integration
    manager.onError((error) => {
      console.error('Speech Recognition Error:', error);
      
      // If it's a microphone-related error, try to restart audio capture
      if (error.message.includes('microphone') || error.message.includes('audio')) {
        this.handleAudioError();
      }
    });

    // Set up session event integration
    manager.onSessionEvent((event) => {
      if (event === 'started') {
        // Ensure audio capture is active when recognition starts
        if (!this.audioService.isRecording()) {
          this.audioService.startRecording().catch(console.error);
        }
      } else if (event === 'stopped') {
        // Optionally stop audio capture when recognition stops
        // This depends on the application's requirements
      }
    });
  }

  /**
   * Handle audio-related errors by attempting to restart audio capture
   */
  private async handleAudioError(): Promise<void> {
    try {
      // Stop current recording if active
      if (this.audioService.isRecording()) {
        await this.audioService.stopRecording();
      }

      // Wait a moment before restarting
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Attempt to restart audio capture
      await this.audioService.startRecording();
    } catch (error) {
      console.error('Failed to restart audio capture:', error);
    }
  }
}