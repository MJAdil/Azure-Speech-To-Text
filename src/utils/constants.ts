/**
 * Application constants and configuration values
 */

// Azure Speech Service Configuration
export const AZURE_CONFIG = {
  DEFAULT_ENDPOINT: 'https://southeastasia.api.cognitive.microsoft.com/',
  DEFAULT_REGION: 'southeastasia',
  SUPPORTED_LANGUAGES: [
    'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN',
    'es-ES', 'es-MX', 'fr-FR', 'fr-CA', 'de-DE',
    'it-IT', 'pt-BR', 'pt-PT', 'ja-JP', 'ko-KR',
    'zh-CN', 'zh-TW', 'zh-HK'
  ]
} as const;

// Audio Configuration
export const AUDIO_CONFIG = {
  SUPPORTED_SAMPLE_RATES: [8000, 16000, 22050, 44100, 48000],
  SUPPORTED_CHANNELS: [1, 2],
  SUPPORTED_BITS_PER_SAMPLE: [16, 32],
  DEFAULT_SAMPLE_RATE: 16000,
  DEFAULT_CHANNELS: 1,
  DEFAULT_BITS_PER_SAMPLE: 16,
  MINIMUM_AUDIO_LEVEL: 0.01,
  BUFFER_SIZE: 4096
} as const;

// File Processing Configuration
export const FILE_CONFIG = {
  SUPPORTED_FORMATS: ['wav', 'mp3', 'm4a', 'flac'],
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  SUPPORTED_MIME_TYPES: [
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/m4a',
    'audio/flac',
    'audio/x-flac'
  ]
} as const;

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  MAX_PROCESSING_LATENCY: 100, // milliseconds
  MAX_DISPLAY_LATENCY: 200, // milliseconds
  MAX_MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
  INITIALIZATION_TIMEOUT: 5000, // 5 seconds
  RECOGNITION_TIMEOUT: 30000 // 30 seconds
} as const;

// Polling Configuration
export const POLLING_CONFIG = {
  INITIAL_INTERVAL: 5000, // 5 seconds
  MAX_INTERVAL: 60000, // 1 minute
  MAX_ATTEMPTS: 120, // 10 minutes total
  BACKOFF_MULTIPLIER: 1.5,
  JITTER_MAX: 1000 // 1 second
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  MICROPHONE_ACCESS_DENIED: 'Microphone access denied. Please grant permission and try again.',
  MICROPHONE_NOT_AVAILABLE: 'No microphone available. Please connect an audio input device.',
  NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
  AZURE_AUTH_FAILED: 'Azure authentication failed. Please check your credentials.',
  UNSUPPORTED_FILE_FORMAT: 'Unsupported file format. Please use WAV, MP3, M4A, or FLAC.',
  FILE_TOO_LARGE: 'File size exceeds maximum limit of 100MB.',
  RECOGNITION_FAILED: 'Speech recognition failed. Please try again.',
  CONFIGURATION_INVALID: 'Invalid configuration. Please check your settings.'
} as const;