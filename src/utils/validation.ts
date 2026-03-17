/**
 * Validation utilities for configuration and input data
 */

import { SpeechServiceConfig, AudioConfiguration, AzureCredentials } from '../types';
import { AZURE_CONFIG, AUDIO_CONFIG, FILE_CONFIG } from './constants';

/**
 * Validate Azure credentials
 */
export function validateAzureCredentials(credentials: AzureCredentials): boolean {
  // Azure subscription keys are typically 32 characters, but can vary
  if (!credentials.subscriptionKey || credentials.subscriptionKey.length < 16) {
    return false;
  }

  if (!credentials.serviceRegion || credentials.serviceRegion.trim().length === 0) {
    return false;
  }

  if (credentials.endpoint && !isValidHttpsUrl(credentials.endpoint)) {
    return false;
  }

  return true;
}

/**
 * Validate speech service configuration
 */
export function validateSpeechServiceConfig(config: SpeechServiceConfig): boolean {
  const credentials: AzureCredentials = {
    subscriptionKey: config.subscriptionKey,
    serviceRegion: config.serviceRegion,
    ...(config.endpoint && { endpoint: config.endpoint })
  };

  if (!validateAzureCredentials(credentials)) {
    return false;
  }

  if (!AZURE_CONFIG.SUPPORTED_LANGUAGES.includes(config.language as typeof AZURE_CONFIG.SUPPORTED_LANGUAGES[number])) {
    return false;
  }

  return true;
}

/**
 * Validate audio configuration
 */
export function validateAudioConfiguration(config: AudioConfiguration): boolean {
  if (!AUDIO_CONFIG.SUPPORTED_SAMPLE_RATES.includes(config.sampleRate as typeof AUDIO_CONFIG.SUPPORTED_SAMPLE_RATES[number])) {
    return false;
  }

  if (!AUDIO_CONFIG.SUPPORTED_CHANNELS.includes(config.channels as typeof AUDIO_CONFIG.SUPPORTED_CHANNELS[number])) {
    return false;
  }

  if (!AUDIO_CONFIG.SUPPORTED_BITS_PER_SAMPLE.includes(config.bitsPerSample as typeof AUDIO_CONFIG.SUPPORTED_BITS_PER_SAMPLE[number])) {
    return false;
  }

  return true;
}

/**
 * Validate audio file for batch processing
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > FILE_CONFIG.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum limit of ${formatFileSize(FILE_CONFIG.MAX_FILE_SIZE)}`
    };
  }

  // Check file type
  const fileExtension = getFileExtension(file.name);
  if (!FILE_CONFIG.SUPPORTED_FORMATS.includes(fileExtension as typeof FILE_CONFIG.SUPPORTED_FORMATS[number])) {
    return {
      valid: false,
      error: `Unsupported file format: ${fileExtension}. Supported formats: ${FILE_CONFIG.SUPPORTED_FORMATS.join(', ')}`
    };
  }

  // Check MIME type if available
  if (file.type && !FILE_CONFIG.SUPPORTED_MIME_TYPES.includes(file.type as typeof FILE_CONFIG.SUPPORTED_MIME_TYPES[number])) {
    return {
      valid: false,
      error: `Unsupported MIME type: ${file.type}`
    };
  }

  return { valid: true };
}

/**
 * Validate BCP-47 language code
 */
export function validateLanguageCode(language: string): boolean {
  const bcp47Regex = /^[a-z]{2,3}(-[A-Z]{2})?(-[a-z]{4})?(-[A-Z]{2}|\d{3})?$/;
  return bcp47Regex.test(language);
}

/**
 * Validate confidence score (0.0 to 1.0)
 */
export function validateConfidenceScore(confidence: number): boolean {
  return typeof confidence === 'number' && confidence >= 0.0 && confidence <= 1.0;
}

/**
 * Validate timestamp values
 */
export function validateTimestamp(offset: number, duration: number): boolean {
  return typeof offset === 'number' && offset >= 0 &&
         typeof duration === 'number' && duration >= 0;
}

/**
 * Sanitize configuration string values
 */
export function sanitizeConfigString(value: string): string {
  return value.trim().replace(/[<>"'&]/g, '');
}

/**
 * Sanitize configuration values (generic)
 */
export function sanitizeConfigValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeConfigString(value);
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  
  if (value === null || value === undefined) {
    return value;
  }
  
  // For objects and arrays, return as-is (could be enhanced for deep sanitization)
  return value;
}

/**
 * Check if URL is valid HTTPS URL
 */
function isValidHttpsUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}