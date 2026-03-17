/**
 * Audio Capture Service Implementation
 * Handles microphone access, audio recording, and streaming with WebRTC integration
 */

import { AudioCaptureService } from '../interfaces/AudioCaptureService';
import { AudioConfiguration } from '../types';

export class AudioCaptureServiceImpl implements AudioCaptureService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private isRecordingActive = false;
  private isPaused = false;
  private currentDeviceId: string | null = null;
  private audioConstraints: MediaTrackConstraints = {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  };

  private readonly MINIMUM_AUDIO_LEVEL = 0.01; // Minimum audio level threshold
  private readonly AUDIO_LEVEL_SMOOTHING = 0.8; // Smoothing factor for audio level calculation

  /**
   * Start recording audio from the microphone
   */
  async startRecording(): Promise<void> {
    if (this.isRecordingActive) {
      throw new Error('Recording is already active');
    }

    try {
      // Request microphone permissions and get media stream
      await this.requestMicrophoneAccess();
      
      // Initialize audio context and analyser for level monitoring
      await this.initializeAudioAnalysis();
      
      this.isRecordingActive = true;
      this.isPaused = false;
      
      console.log('Audio recording started successfully');
    } catch (error) {
      await this.cleanup();
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop recording and release audio resources
   */
  async stopRecording(): Promise<void> {
    if (!this.isRecordingActive) {
      return;
    }

    await this.cleanup();
    console.log('Audio recording stopped and resources released');
  }

  /**
   * Pause recording without releasing resources
   */
  async pauseRecording(): Promise<void> {
    if (!this.isRecordingActive || this.isPaused) {
      return;
    }

    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }

    this.isPaused = true;
    console.log('Audio recording paused');
  }

  /**
   * Resume recording from paused state
   */
  async resumeRecording(): Promise<void> {
    if (!this.isRecordingActive || !this.isPaused) {
      return;
    }

    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }

    this.isPaused = false;
    console.log('Audio recording resumed');
  }

  /**
   * Get the current audio stream
   */
  getAudioStream(): MediaStream | null {
    return this.mediaStream;
  }

  /**
   * Set audio capture constraints
   */
  setAudioConstraints(constraints: MediaTrackConstraints): void {
    this.audioConstraints = { ...this.audioConstraints, ...constraints };
    
    // If recording is active, apply constraints to current stream
    if (this.mediaStream && this.isRecordingActive) {
      const audioTrack = this.mediaStream.getAudioTracks()[0];
      if (audioTrack && audioTrack.applyConstraints) {
        audioTrack.applyConstraints(constraints).catch(error => {
          console.warn('Failed to apply audio constraints:', error);
        });
      }
    }
  }

  /**
   * Get available audio input devices
   */
  async getAvailableDevices(): Promise<MediaDeviceInfo[]> {
    try {
      // Request permissions first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      throw new Error(`Failed to enumerate audio devices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Select a specific audio input device
   */
  async selectDevice(deviceId: string): Promise<void> {
    this.currentDeviceId = deviceId;
    
    // If recording is active, restart with new device
    if (this.isRecordingActive) {
      const wasRecording = !this.isPaused;
      await this.stopRecording();
      await this.startRecording();
      
      if (!wasRecording) {
        await this.pauseRecording();
      }
    }
  }

  /**
   * Get current audio level (0.0 to 1.0)
   */
  getAudioLevel(): number {
    if (!this.analyser || !this.dataArray || this.isPaused) {
      return 0;
    }

    // Use type assertion to handle strict TypeScript checking
    (this.analyser.getByteFrequencyData as any)(this.dataArray);
    
    // Calculate RMS (Root Mean Square) for audio level
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const value = this.dataArray[i];
      if (value !== undefined) {
        sum += value * value;
      }
    }
    
    const rms = Math.sqrt(sum / this.dataArray.length);
    return Math.min(rms / 255, 1.0); // Normalize to 0-1 range
  }

  /**
   * Check if recording is currently active
   */
  isRecording(): boolean {
    return this.isRecordingActive && !this.isPaused;
  }

  /**
   * Check if audio level is adequate for recognition
   */
  isAudioLevelAdequate(): boolean {
    return this.getAudioLevel() >= this.MINIMUM_AUDIO_LEVEL;
  }

  /**
   * Get current audio configuration
   */
  getAudioConfiguration(): AudioConfiguration {
    const audioTrack = this.mediaStream?.getAudioTracks()[0];
    const settings = audioTrack?.getSettings();
    
    const config: AudioConfiguration = {
      sampleRate: settings?.sampleRate || 16000,
      channels: settings?.channelCount || 1,
      bitsPerSample: 16, // Standard for WebRTC
      format: 'pcm' as any,
      echoCancellation: settings?.echoCancellation || true,
      noiseSuppression: settings?.noiseSuppression || true
    };

    if (this.currentDeviceId) {
      config.deviceId = this.currentDeviceId;
    }

    return config;
  }

  /**
   * Request microphone access with proper error handling
   */
  private async requestMicrophoneAccess(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('MediaDevices API is not supported in this browser');
    }

    const constraints: MediaStreamConstraints = {
      audio: this.currentDeviceId ? {
        ...this.audioConstraints,
        deviceId: { exact: this.currentDeviceId }
      } : this.audioConstraints
    };

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Set up event listeners for device changes
      this.setupDeviceChangeListeners();
      
    } catch (error) {
      if (error instanceof Error) {
        switch (error.name) {
          case 'NotAllowedError':
            throw new Error('Microphone access denied. Please grant microphone permissions and try again.');
          case 'NotFoundError':
            throw new Error('No microphone found. Please connect a microphone and try again.');
          case 'NotReadableError':
            throw new Error('Microphone is already in use by another application.');
          case 'OverconstrainedError':
            throw new Error('The specified audio constraints cannot be satisfied by any available device.');
          default:
            throw new Error(`Microphone access failed: ${error.message}`);
        }
      }
      throw new Error('Unknown error occurred while accessing microphone');
    }
  }

  /**
   * Initialize audio analysis for level monitoring
   */
  private async initializeAudioAnalysis(): Promise<void> {
    if (!this.mediaStream) {
      throw new Error('Media stream not available for audio analysis');
    }

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create analyser node for audio level monitoring
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = this.AUDIO_LEVEL_SMOOTHING;
      
      // Create data array for frequency analysis
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      // Connect media stream to analyser
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);
      
    } catch (error) {
      throw new Error(`Failed to initialize audio analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set up listeners for device changes
   */
  private setupDeviceChangeListeners(): void {
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange.bind(this));
    }
  }

  /**
   * Handle device change events
   */
  private async handleDeviceChange(): Promise<void> {
    if (!this.isRecordingActive) {
      return;
    }

    try {
      // Check if current device is still available
      const devices = await this.getAvailableDevices();
      const currentDevice = devices.find(device => device.deviceId === this.currentDeviceId);
      
      if (!currentDevice && this.currentDeviceId) {
        console.warn('Current audio device is no longer available, switching to default');
        this.currentDeviceId = null;
        
        // Restart recording with default device
        const wasRecording = !this.isPaused;
        await this.stopRecording();
        await this.startRecording();
        
        if (!wasRecording) {
          await this.pauseRecording();
        }
      }
    } catch (error) {
      console.error('Error handling device change:', error);
    }
  }

  /**
   * Clean up all resources
   */
  private async cleanup(): Promise<void> {
    // Stop all media tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      this.mediaStream = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }

    // Clear analyser and data array
    this.analyser = null;
    this.dataArray = null;

    // Reset state
    this.isRecordingActive = false;
    this.isPaused = false;

    // Remove event listeners
    if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
      navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChange.bind(this));
    }
  }
}