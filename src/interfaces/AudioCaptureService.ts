/**
 * Audio Capture Service Interface
 * Handles microphone access, audio recording, and streaming to Azure Speech SDK
 */

export interface AudioCaptureService {
  /**
   * Start recording audio from the microphone
   * @throws {Error} If microphone access is denied or unavailable
   */
  startRecording(): Promise<void>;

  /**
   * Stop recording and release audio resources
   */
  stopRecording(): Promise<void>;

  /**
   * Pause recording without releasing resources
   */
  pauseRecording(): Promise<void>;

  /**
   * Resume recording from paused state
   */
  resumeRecording(): Promise<void>;

  /**
   * Get the current audio stream
   * @returns MediaStream for audio processing
   */
  getAudioStream(): MediaStream | null;

  /**
   * Set audio capture constraints (sample rate, channels, etc.)
   * @param constraints Audio constraints to apply
   */
  setAudioConstraints(constraints: MediaTrackConstraints): void;

  /**
   * Get available audio input devices
   * @returns List of available microphone devices
   */
  getAvailableDevices(): Promise<MediaDeviceInfo[]>;

  /**
   * Select a specific audio input device
   * @param deviceId Device ID to use for audio capture
   */
  selectDevice(deviceId: string): Promise<void>;

  /**
   * Get current audio level (0.0 to 1.0)
   * @returns Current audio input level
   */
  getAudioLevel(): number;

  /**
   * Check if recording is currently active
   */
  isRecording(): boolean;
}