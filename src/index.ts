/**
 * Azure Speech-to-Text Prototype
 * Main entry point for the application
 */

// Export all interfaces
export * from './interfaces/AudioCaptureService';
export * from './interfaces/SpeechRecognitionManager';
export * from './interfaces/ConfigurationService';

// Export all types
export * from './types';

// Export services
export { AzureSpeechRecognitionManager } from './services/SpeechRecognitionManager';
export { SpeechRecognitionFactory } from './services/SpeechRecognitionFactory';
export { SpeechRecognitionService } from './services/SpeechRecognitionService';
export { AzureConfigurationService } from './services/ConfigurationService';
export { AudioCaptureServiceImpl } from './services/AudioCaptureService';

// Export utilities
export * from './utils/validation';
// Note: secureStorage is not exported by default due to Azure dependencies
// Import directly from './utils/secureStorage' if needed

// Main application class will be implemented in subsequent tasks
export class AzureSpeechToTextApp {
  private initialized = false;

  constructor() {
    // Constructor implementation will be added in later tasks
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialization logic will be implemented in subsequent tasks
    this.initialized = true;
  }

  /**
   * Check if application is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}