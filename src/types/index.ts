/**
 * Core data models and interfaces for Azure Speech-to-Text prototype
 */

// Enums for configuration options
export enum OutputFormat {
  Simple = 'simple',
  Detailed = 'detailed'
}

export enum ProfanityOption {
  Masked = 'masked',
  Removed = 'removed',
  Raw = 'raw'
}

export enum AudioFormat {
  PCM = 'pcm',
  WAV = 'wav',
  MP3 = 'mp3',
  M4A = 'm4a',
  FLAC = 'flac'
}

export enum ExportFormat {
  Text = 'text',
  JSON = 'json',
  SRT = 'srt'
}

// Core data models
export interface RecognitionResult {
  text: string;
  confidence: number;
  offset: number;
  duration: number;
  speakerId?: string | undefined;
  language: string;
  alternatives?: AlternativeResult[] | undefined;
  timestamp: Date;
}

export interface AlternativeResult {
  text: string;
  confidence: number;
}

export interface SpeechServiceConfig {
  subscriptionKey: string;
  serviceRegion: string;
  endpoint?: string;
  language: string;
  customModelId?: string;
  profanityOption: ProfanityOption;
  outputFormat: OutputFormat;
  enableDictation: boolean;
}

export interface AudioConfiguration {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  format: AudioFormat;
  deviceId?: string;
  echoCancellation: boolean;
  noiseSuppression: boolean;
}

export interface AzureCredentials {
  subscriptionKey: string;
  serviceRegion: string;
  endpoint?: string;
}

export interface LanguageSettings {
  primaryLanguage: string;
  customModelId?: string;
  enableDictation: boolean;
  profanityOption: ProfanityOption;
}

export interface BatchTranscriptionResult {
  text: string;
  confidence: number;
  duration: number;
  speakerSegments?: SpeakerSegment[];
  wordTimestamps?: WordTimestamp[];
  jobId: string;
  status: 'completed' | 'failed' | 'processing';
}

export interface SpeakerSegment {
  speakerId: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

// Exception types
export class SpeechSDKException extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'SpeechSDKException';
  }
}

export class TranscriptionException extends Error {
  constructor(message: string, public readonly jobId?: string) {
    super(message);
    this.name = 'TranscriptionException';
  }
}

export class TimeoutException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutException';
  }
}