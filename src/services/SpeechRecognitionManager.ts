/**
 * Speech Recognition Manager Implementation
 * Integrates with Azure Speech SDK for real-time speech recognition
 */

import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { SpeechRecognitionManager } from '../interfaces/SpeechRecognitionManager';
import { RecognitionResult, SpeechServiceConfig, SpeechSDKException } from '../types';

export class AzureSpeechRecognitionManager implements SpeechRecognitionManager {
  private speechConfig: sdk.SpeechConfig | null = null;
  private audioConfig: sdk.AudioConfig | null = null;
  private recognizer: sdk.SpeechRecognizer | null = null;
  private isInitialized = false;
  private isRecognitionActive = false;
  private authToken: string | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  // Event callbacks
  private partialResultCallback: ((result: string) => void) | null = null;
  private finalResultCallback: ((result: RecognitionResult) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private sessionEventCallback: ((event: 'started' | 'stopped') => void) | null = null;

  /**
   * Initialize the speech recognizer with Azure configuration
   */
  async initialize(config: SpeechServiceConfig): Promise<void> {
    try {
      // Validate configuration
      this.validateConfig(config);

      // Create speech configuration
      this.speechConfig = sdk.SpeechConfig.fromSubscription(
        config.subscriptionKey,
        config.serviceRegion
      );

      // Set endpoint if provided
      if (config.endpoint) {
        this.speechConfig.endpointId = config.endpoint;
      }

      // Configure speech recognition settings
      this.speechConfig.speechRecognitionLanguage = config.language;
      this.speechConfig.outputFormat = this.mapOutputFormat(config.outputFormat);
      
      // Configure profanity handling
      this.speechConfig.setProfanity(this.mapProfanityOption(config.profanityOption));

      // Enable dictation mode if requested
      if (config.enableDictation) {
        this.speechConfig.enableDictation();
      }

      // Set custom model if provided
      if (config.customModelId) {
        this.speechConfig.endpointId = config.customModelId;
      }

      // Create audio configuration for microphone input
      this.audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();

      // Create speech recognizer
      this.recognizer = new sdk.SpeechRecognizer(this.speechConfig, this.audioConfig);

      // Set up event handlers
      this.setupEventHandlers();

      // Set up token refresh (tokens expire after 10 minutes)
      this.setupTokenRefresh(config);

      this.isInitialized = true;

    } catch (error) {
      throw new SpeechSDKException(
        `Failed to initialize speech recognizer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZATION_FAILED'
      );
    }
  }

  /**
   * Start continuous speech recognition
   */
  async startContinuousRecognition(): Promise<void> {
    if (!this.isInitialized || !this.recognizer) {
      throw new SpeechSDKException('Speech recognizer not initialized', 'NOT_INITIALIZED');
    }

    if (this.isRecognitionActive) {
      return; // Already active
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new SpeechSDKException('Recognition start timeout', 'START_TIMEOUT'));
      }, 5000); // 5 second timeout as per requirements

      this.recognizer!.startContinuousRecognitionAsync(
        () => {
          clearTimeout(timeout);
          this.isRecognitionActive = true;
          this.sessionEventCallback?.('started');
          resolve();
        },
        (error) => {
          clearTimeout(timeout);
          reject(new SpeechSDKException(`Failed to start recognition: ${error}`, 'START_FAILED'));
        }
      );
    });
  }

  /**
   * Stop continuous speech recognition
   */
  async stopContinuousRecognition(): Promise<void> {
    if (!this.recognizer || !this.isRecognitionActive) {
      return;
    }

    return new Promise((resolve) => {
      this.recognizer!.stopContinuousRecognitionAsync(
        () => {
          this.isRecognitionActive = false;
          this.sessionEventCallback?.('stopped');
          resolve();
        },
        () => {
          // Even if stop fails, mark as inactive
          this.isRecognitionActive = false;
          this.sessionEventCallback?.('stopped');
          resolve();
        }
      );
    });
  }

  /**
   * Recognize speech from audio data once
   */
  async recognizeOnce(audioData: ArrayBuffer): Promise<RecognitionResult> {
    if (!this.isInitialized || !this.speechConfig) {
      throw new SpeechSDKException('Speech recognizer not initialized', 'NOT_INITIALIZED');
    }

    // Create audio configuration from buffer
    const audioConfig = sdk.AudioConfig.fromWavFileInput(Buffer.from(audioData));
    const recognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);

    return new Promise((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (result) => {
          const recognitionResult = this.mapRecognitionResult(result);
          recognizer.close();
          resolve(recognitionResult);
        },
        (error) => {
          recognizer.close();
          reject(new SpeechSDKException(`Recognition failed: ${error}`, 'RECOGNITION_FAILED'));
        }
      );
    });
  }

  /**
   * Set the recognition language
   */
  setLanguage(language: string): void {
    if (this.speechConfig) {
      this.speechConfig.speechRecognitionLanguage = language;
    }
  }

  /**
   * Set custom language model
   */
  setCustomModel(modelId: string): void {
    if (this.speechConfig) {
      this.speechConfig.endpointId = modelId;
    }
  }

  /**
   * Register callback for partial recognition results
   */
  onPartialResult(callback: (result: string) => void): void {
    this.partialResultCallback = callback;
  }

  /**
   * Register callback for final recognition results
   */
  onFinalResult(callback: (result: RecognitionResult) => void): void {
    this.finalResultCallback = callback;
  }

  /**
   * Register callback for recognition errors
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Register callback for session events
   */
  onSessionEvent(callback: (event: 'started' | 'stopped') => void): void {
    this.sessionEventCallback = callback;
  }

  /**
   * Check if recognition is currently active
   */
  isRecognizing(): boolean {
    return this.isRecognitionActive;
  }

  /**
   * Dispose of resources and cleanup
   */
  dispose(): void {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }

    if (this.recognizer) {
      if (this.isRecognitionActive) {
        this.recognizer.stopContinuousRecognitionAsync();
      }
      this.recognizer.close();
      this.recognizer = null;
    }

    if (this.audioConfig) {
      this.audioConfig.close();
      this.audioConfig = null;
    }

    if (this.speechConfig) {
      this.speechConfig.close();
      this.speechConfig = null;
    }

    this.isInitialized = false;
    this.isRecognitionActive = false;
    this.authToken = null;
  }

  /**
   * Validate configuration parameters
   */
  private validateConfig(config: SpeechServiceConfig): void {
    if (!config.subscriptionKey || config.subscriptionKey.trim().length === 0) {
      throw new SpeechSDKException('Subscription key is required', 'INVALID_CONFIG');
    }

    if (!config.serviceRegion || config.serviceRegion.trim().length === 0) {
      throw new SpeechSDKException('Service region is required', 'INVALID_CONFIG');
    }

    if (!config.language || config.language.trim().length === 0) {
      throw new SpeechSDKException('Language is required', 'INVALID_CONFIG');
    }

    // Validate language format (BCP-47)
    const languageRegex = /^[a-z]{2,3}(-[A-Z]{2})?$/;
    if (!languageRegex.test(config.language)) {
      throw new SpeechSDKException('Invalid language format. Use BCP-47 format (e.g., en-US)', 'INVALID_CONFIG');
    }
  }

  /**
   * Set up event handlers for the recognizer
   */
  private setupEventHandlers(): void {
    if (!this.recognizer) return;

    // Handle partial results (recognizing event)
    this.recognizer.recognizing = (sender, event) => {
      if (event.result.reason === sdk.ResultReason.RecognizingSpeech) {
        this.partialResultCallback?.(event.result.text);
      }
    };

    // Handle final results (recognized event)
    this.recognizer.recognized = (sender, event) => {
      if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
        const result = this.mapRecognitionResult(event.result);
        this.finalResultCallback?.(result);
      } else if (event.result.reason === sdk.ResultReason.NoMatch) {
        // No speech detected - this is normal, don't treat as error
      }
    };

    // Handle cancellation/errors
    this.recognizer.canceled = (sender, event) => {
      this.isRecognitionActive = false;
      
      if (event.reason === sdk.CancellationReason.Error) {
        const error = new SpeechSDKException(
          `Recognition canceled due to error: ${event.errorDetails}`,
          event.errorCode?.toString()
        );
        this.errorCallback?.(error);
      }
    };

    // Handle session events
    this.recognizer.sessionStarted = () => {
      this.sessionEventCallback?.('started');
    };

    this.recognizer.sessionStopped = () => {
      this.isRecognitionActive = false;
      this.sessionEventCallback?.('stopped');
    };
  }

  /**
   * Set up automatic token refresh
   */
  private setupTokenRefresh(config: SpeechServiceConfig): void {
    // Refresh token every 9 minutes (tokens expire after 10 minutes)
    this.tokenRefreshTimer = setInterval(async () => {
      try {
        if (this.speechConfig) {
          // Create new speech config with fresh token
          const newSpeechConfig = sdk.SpeechConfig.fromSubscription(
            config.subscriptionKey,
            config.serviceRegion
          );
          
          // Copy settings from old config
          newSpeechConfig.speechRecognitionLanguage = this.speechConfig.speechRecognitionLanguage;
          newSpeechConfig.outputFormat = this.speechConfig.outputFormat;
          
          // Update the recognizer if it exists
          if (this.recognizer && !this.isRecognitionActive) {
            this.recognizer.close();
            this.recognizer = new sdk.SpeechRecognizer(newSpeechConfig, this.audioConfig!);
            this.setupEventHandlers();
          }
          
          // Close old config and update reference
          this.speechConfig.close();
          this.speechConfig = newSpeechConfig;
        }
      } catch (error) {
        this.errorCallback?.(new SpeechSDKException(
          `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'TOKEN_REFRESH_FAILED'
        ));
      }
    }, 9 * 60 * 1000); // 9 minutes
  }

  /**
   * Map Azure SDK output format to our enum
   */
  private mapOutputFormat(format: string): sdk.OutputFormat {
    switch (format.toLowerCase()) {
      case 'simple':
        return sdk.OutputFormat.Simple;
      case 'detailed':
        return sdk.OutputFormat.Detailed;
      default:
        return sdk.OutputFormat.Simple;
    }
  }

  /**
   * Map profanity option to Azure SDK enum
   */
  private mapProfanityOption(option: string): sdk.ProfanityOption {
    switch (option.toLowerCase()) {
      case 'masked':
        return sdk.ProfanityOption.Masked;
      case 'removed':
        return sdk.ProfanityOption.Removed;
      case 'raw':
        return sdk.ProfanityOption.Raw;
      default:
        return sdk.ProfanityOption.Masked;
    }
  }

  /**
   * Map Azure SDK recognition result to our interface
   */
  private mapRecognitionResult(result: sdk.SpeechRecognitionResult): RecognitionResult {
    const alternatives = this.extractAlternatives(result);
    return {
      text: result.text,
      confidence: this.extractConfidence(result),
      offset: result.offset,
      duration: result.duration,
      language: result.language || 'unknown',
      timestamp: new Date(),
      ...(alternatives && { alternatives })
    };
  }

  /**
   * Extract confidence score from recognition result
   */
  private extractConfidence(result: sdk.SpeechRecognitionResult): number {
    try {
      if (result.json) {
        const parsed = JSON.parse(result.json);
        return parsed.NBest?.[0]?.Confidence || 0.0;
      }
    } catch {
      // Ignore JSON parsing errors
    }
    return 0.0;
  }

  /**
   * Extract alternative results from recognition result
   */
  private extractAlternatives(result: sdk.SpeechRecognitionResult): any[] | undefined {
    try {
      if (result.json) {
        const parsed = JSON.parse(result.json);
        const alternatives = parsed.NBest?.slice(1).map((alt: any) => ({
          text: alt.Display || alt.Lexical || '',
          confidence: alt.Confidence || 0.0
        }));
        return alternatives && alternatives.length > 0 ? alternatives : undefined;
      }
    } catch {
      // Ignore JSON parsing errors
    }
    return undefined;
  }
}