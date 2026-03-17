/**
 * Example usage of Speech Recognition Manager
 * Demonstrates real-time speech recognition with Azure Speech SDK
 */

import { AzureSpeechRecognitionManager } from '../services/SpeechRecognitionManager';
import { SpeechRecognitionService } from '../services/SpeechRecognitionService';
import { AzureConfigurationService } from '../services/ConfigurationService';
import { AudioCaptureServiceImpl } from '../services/AudioCaptureService';
import { SpeechServiceConfig, OutputFormat, ProfanityOption } from '../types';

/**
 * Example: Basic Speech Recognition Setup
 */
export async function basicSpeechRecognitionExample(): Promise<void> {
  // Create configuration
  const config: SpeechServiceConfig = {
    subscriptionKey: process.env.AZURE_SPEECH_KEY || 'YOUR_AZURE_SPEECH_KEY',
    serviceRegion: process.env.AZURE_SPEECH_REGION || 'YOUR_AZURE_REGION',
    endpoint: process.env.AZURE_SPEECH_ENDPOINT || 'https://YOUR_REGION.api.cognitive.microsoft.com/',
    language: 'en-US',
    profanityOption: ProfanityOption.Masked,
    outputFormat: OutputFormat.Detailed,
    enableDictation: true
  };

  // Create and initialize speech recognition manager
  const manager = new AzureSpeechRecognitionManager();

  try {
    // Initialize with configuration
    await manager.initialize(config);
    console.log('Speech Recognition Manager initialized successfully');

    // Set up event handlers
    manager.onPartialResult((text) => {
      console.log('Partial result:', text);
    });

    manager.onFinalResult((result) => {
      console.log('Final result:', {
        text: result.text,
        confidence: result.confidence,
        language: result.language,
        timestamp: result.timestamp
      });
    });

    manager.onError((error) => {
      console.error('Recognition error:', error.message);
    });

    manager.onSessionEvent((event) => {
      console.log('Session event:', event);
    });

    // Start continuous recognition
    console.log('Starting continuous recognition...');
    await manager.startContinuousRecognition();
    console.log('Recognition started. Speak into your microphone...');

    // Let it run for 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Stop recognition
    console.log('Stopping recognition...');
    await manager.stopContinuousRecognition();
    console.log('Recognition stopped');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Clean up resources
    manager.dispose();
    console.log('Resources cleaned up');
  }
}

/**
 * Example: Integrated Speech Recognition Service
 */
export async function integratedSpeechRecognitionExample(): Promise<void> {
  // Create service dependencies
  const configService = new AzureConfigurationService();
  const audioService = new AudioCaptureServiceImpl();

  // Create speech recognition service with event handlers
  const speechService = new SpeechRecognitionService(
    configService,
    audioService,
    {
      onPartialResult: (text) => {
        console.log('🎤 Partial:', text);
      },
      onFinalResult: (result) => {
        console.log('✅ Final:', result.text, `(${(result.confidence * 100).toFixed(1)}%)`);
      },
      onError: (error) => {
        console.error('❌ Error:', error.message);
      },
      onSessionStarted: () => {
        console.log('🟢 Recognition session started');
      },
      onSessionStopped: () => {
        console.log('🔴 Recognition session stopped');
      },
      onAudioLevelChanged: (level) => {
        // Only log significant audio level changes
        if (level > 0.1) {
          console.log('🔊 Audio level:', (level * 100).toFixed(1) + '%');
        }
      }
    }
  );

  try {
    // Initialize the service
    console.log('Initializing speech recognition service...');
    await speechService.initialize();
    console.log('Service initialized successfully');

    // Get available audio devices
    const devices = await speechService.getAvailableAudioDevices();
    console.log('Available audio devices:', devices.map(d => d.label));

    // Start recognition
    console.log('Starting recognition...');
    await speechService.startRecognition();

    // Demonstrate language switching
    setTimeout(async () => {
      console.log('Switching to French...');
      await speechService.changeLanguage('fr-FR');
    }, 10000);

    setTimeout(async () => {
      console.log('Switching back to English...');
      await speechService.changeLanguage('en-US');
    }, 20000);

    // Let it run for 45 seconds
    await new Promise(resolve => setTimeout(resolve, 45000));

    // Stop recognition
    console.log('Stopping recognition...');
    await speechService.stopRecognition();

  } catch (error) {
    console.error('Service error:', error);
  } finally {
    // Clean up
    speechService.dispose();
    console.log('Service disposed');
  }
}

/**
 * Example: Single Audio Recognition
 */
export async function singleAudioRecognitionExample(): Promise<void> {
  const manager = new AzureSpeechRecognitionManager();

  const config: SpeechServiceConfig = {
    subscriptionKey: process.env.AZURE_SPEECH_KEY || 'YOUR_AZURE_SPEECH_KEY',
    serviceRegion: process.env.AZURE_SPEECH_REGION || 'YOUR_AZURE_REGION',
    language: 'en-US',
    profanityOption: ProfanityOption.Masked,
    outputFormat: OutputFormat.Detailed,
    enableDictation: false
  };

  try {
    await manager.initialize(config);
    console.log('Manager initialized for single recognition');

    // Simulate audio data (in a real scenario, this would be actual audio)
    const audioData = new ArrayBuffer(1024);

    // Recognize once
    const result = await manager.recognizeOnce(audioData);
    console.log('Single recognition result:', {
      text: result.text,
      confidence: result.confidence,
      duration: result.duration
    });

  } catch (error) {
    console.error('Single recognition error:', error);
  } finally {
    manager.dispose();
  }
}

// Export examples for use in other modules
export const examples = {
  basic: basicSpeechRecognitionExample,
  integrated: integratedSpeechRecognitionExample,
  single: singleAudioRecognitionExample
};

// If running this file directly, run the basic example
if (require.main === module) {
  console.log('Running basic speech recognition example...');
  basicSpeechRecognitionExample().catch(console.error);
}