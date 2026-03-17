/**
 * Batch Processor Interface
 * Handles uploaded audio file transcription and job management
 */

import { BatchTranscriptionResult, SpeechServiceConfig } from '../types';

export interface BatchProcessor {
  /**
   * Upload and process an audio file for transcription
   * @param file Audio file to process
   * @param config Speech service configuration
   * @returns Job ID for tracking progress
   * @throws {Error} If file format is unsupported or upload fails
   */
  processFile(file: File, config: SpeechServiceConfig): Promise<string>;

  /**
   * Check the status of a batch transcription job
   * @param jobId Job identifier
   * @returns Current job status and progress
   */
  getJobStatus(jobId: string): Promise<BatchJobStatus>;

  /**
   * Get results from a completed transcription job
   * @param jobId Job identifier
   * @returns Complete transcription results
   * @throws {Error} If job is not completed or results unavailable
   */
  getJobResults(jobId: string): Promise<BatchTranscriptionResult>;

  /**
   * Cancel a running transcription job
   * @param jobId Job identifier
   */
  cancelJob(jobId: string): Promise<void>;

  /**
   * Get list of supported audio file formats
   * @returns Array of supported file extensions
   */
  getSupportedFormats(): string[];

  /**
   * Validate audio file before processing
   * @param file File to validate
   * @returns True if file is valid for processing
   */
  validateFile(file: File): boolean;

  /**
   * Get maximum allowed file size
   * @returns Maximum file size in bytes
   */
  getMaxFileSize(): number;

  /**
   * Register callback for job progress updates
   * @param jobId Job identifier
   * @param callback Function to handle progress updates
   */
  onJobProgress(jobId: string, callback: (progress: JobProgress) => void): void;
}

export interface BatchJobStatus {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // seconds
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobProgress {
  jobId: string;
  progress: number;
  stage: 'uploading' | 'processing' | 'finalizing';
  message?: string;
}