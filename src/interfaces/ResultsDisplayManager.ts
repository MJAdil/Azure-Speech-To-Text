/**
 * Results Display Manager Interface
 * Handles transcription result display, formatting, and user interactions
 */

import { RecognitionResult, ExportFormat } from '../types';

export interface ResultsDisplayManager {
  /**
   * Display partial recognition result
   * @param text Partial transcription text
   * @param confidence Confidence score (0.0 to 1.0)
   */
  displayPartialResult(text: string, confidence: number): void;

  /**
   * Display final recognition result
   * @param result Complete recognition result
   */
  displayFinalResult(result: RecognitionResult): void;

  /**
   * Clear all displayed results
   */
  clearResults(): void;

  /**
   * Export results in specified format
   * @param format Export format (text, JSON, SRT)
   * @returns Formatted export string
   */
  exportResults(format: ExportFormat): Promise<string>;

  /**
   * Highlight text for specific speaker
   * @param speakerId Speaker identifier to highlight
   */
  highlightSpeaker(speakerId: string): void;

  /**
   * Add timestamp to result display
   * @param result Recognition result with timing information
   */
  addTimestamp(result: RecognitionResult): void;

  /**
   * Get all stored results
   * @returns Array of all recognition results
   */
  getAllResults(): RecognitionResult[];

  /**
   * Update display settings
   * @param settings Display configuration options
   */
  updateDisplaySettings(settings: Partial<DisplaySettings>): void;

  /**
   * Register callback for user interactions
   * @param callback Function to handle user events
   */
  onUserInteraction(callback: (event: UserInteractionEvent) => void): void;
}

export interface DisplaySettings {
  showConfidence: boolean;
  showTimestamps: boolean;
  showSpeakerIds: boolean;
  fontSize: number;
  theme: 'light' | 'dark';
  autoScroll: boolean;
}

export interface UserInteractionEvent {
  type: 'export' | 'clear' | 'highlight' | 'copy';
  data?: unknown;
}