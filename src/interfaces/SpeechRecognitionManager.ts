/**
 * Speech Recognition Manager Interface
 * Manages Azure Speech SDK integration and recognition lifecycle
 */

import { RecognitionResult, SpeechServiceConfig } from '../types';

export interface SpeechRecognitionManager {
  /**
   * Initialize the speech recognizer with Azure configuration
   * @param config Speech service configuration
   * @throws {SpeechSDKException} If initialization fails
   */
  initialize(config: SpeechServiceConfig): Promise<void>;

  /**
   * Start continuous speech recognition
   * @throws {SpeechSDKException} If recognition cannot be started
   */
  startContinuousRecognition(): Promise<void>;

  /**
   * Stop continuous speech recognition
   */
  stopContinuousRecognition(): Promise<void>;

  /**
   * Recognize speech from audio data once
   * @param audioData Audio data to recognize
   * @returns Recognition result
   */
  recognizeOnce(audioData: ArrayBuffer): Promise<RecognitionResult>;

  /**
   * Set the recognition language
   * @param language BCP-47 language code
   */
  setLanguage(language: string): void;

  /**
   * Set custom language model
   * @param modelId Custom model identifier
   */
  setCustomModel(modelId: string): void;

  /**
   * Register callback for partial recognition results
   * @param callback Function to call with partial results
   */
  onPartialResult(callback: (result: string) => void): void;

  /**
   * Register callback for final recognition results
   * @param callback Function to call with final results
   */
  onFinalResult(callback: (result: RecognitionResult) => void): void;

  /**
   * Register callback for recognition errors
   * @param callback Function to call when errors occur
   */
  onError(callback: (error: Error) => void): void;

  /**
   * Register callback for session events
   * @param callback Function to call on session start/stop
   */
  onSessionEvent(callback: (event: 'started' | 'stopped') => void): void;

  /**
   * Check if recognition is currently active
   */
  isRecognizing(): boolean;

  /**
   * Dispose of resources and cleanup
   */
  dispose(): void;
}