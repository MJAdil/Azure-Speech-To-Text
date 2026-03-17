/**
 * Basic setup tests to verify project configuration
 */

import { AzureSpeechToTextApp } from '../index';
import { validateAzureCredentials, validateSpeechServiceConfig } from '../utils/validation';
import { OutputFormat, ProfanityOption } from '../types';

describe('Project Setup', () => {
  test('should create main application instance', () => {
    const app = new AzureSpeechToTextApp();
    expect(app).toBeInstanceOf(AzureSpeechToTextApp);
    expect(app.isInitialized()).toBe(false);
  });

  test('should initialize application', async () => {
    const app = new AzureSpeechToTextApp();
    await app.initialize();
    expect(app.isInitialized()).toBe(true);
  });

  test('should not reinitialize if already initialized', async () => {
    const app = new AzureSpeechToTextApp();
    await app.initialize();
    expect(app.isInitialized()).toBe(true);
    
    // Should not throw or change state
    await app.initialize();
    expect(app.isInitialized()).toBe(true);
  });
});

describe('Validation Utilities', () => {
  test('should validate Azure credentials correctly', () => {
    // Use a proper 32-character subscription key
    const validCredentials = {
      subscriptionKey: '12345678901234567890123456789012', // Exactly 32 characters
      serviceRegion: 'southeastasia',
      endpoint: 'https://southeastasia.api.cognitive.microsoft.com/'
    };

    expect(validateAzureCredentials(validCredentials)).toBe(true);

    // Invalid subscription key (wrong length)
    expect(validateAzureCredentials({
      ...validCredentials,
      subscriptionKey: 'invalid-key'
    })).toBe(false);

    // Empty region
    expect(validateAzureCredentials({
      ...validCredentials,
      serviceRegion: ''
    })).toBe(false);

    // Invalid endpoint (not HTTPS)
    expect(validateAzureCredentials({
      ...validCredentials,
      endpoint: 'http://example.com'
    })).toBe(false);
  });

  test('should validate speech service configuration', () => {
    const validConfig = {
      subscriptionKey: '12345678901234567890123456789012', // Exactly 32 characters
      serviceRegion: 'southeastasia',
      endpoint: 'https://southeastasia.api.cognitive.microsoft.com/',
      language: 'en-US',
      profanityOption: ProfanityOption.Masked,
      outputFormat: OutputFormat.Detailed,
      enableDictation: true
    };

    expect(validateSpeechServiceConfig(validConfig)).toBe(true);

    // Invalid language
    expect(validateSpeechServiceConfig({
      ...validConfig,
      language: 'invalid-lang'
    })).toBe(false);
  });
});

describe('Type Definitions', () => {
  test('should have correct enum values', () => {
    expect(OutputFormat.Simple).toBe('simple');
    expect(OutputFormat.Detailed).toBe('detailed');
    
    expect(ProfanityOption.Masked).toBe('masked');
    expect(ProfanityOption.Removed).toBe('removed');
    expect(ProfanityOption.Raw).toBe('raw');
  });
});