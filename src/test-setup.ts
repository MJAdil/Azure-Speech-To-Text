/**
 * Jest test setup configuration
 */

// Mock Web APIs that aren't available in jsdom
Object.defineProperty(window, 'MediaStream', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    getTracks: jest.fn(() => []),
    getAudioTracks: jest.fn(() => []),
    getVideoTracks: jest.fn(() => []),
    addTrack: jest.fn(),
    removeTrack: jest.fn(),
    active: true
  }))
});

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn(),
    enumerateDevices: jest.fn(() => Promise.resolve([])),
    getDisplayMedia: jest.fn()
  }
});

// Mock AudioContext
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    createScriptProcessor: jest.fn(),
    createAnalyser: jest.fn(),
    createGain: jest.fn(),
    destination: {},
    sampleRate: 44100,
    state: 'running',
    suspend: jest.fn(),
    resume: jest.fn(),
    close: jest.fn()
  }))
});

// Mock WebRTC APIs
Object.defineProperty(window, 'RTCPeerConnection', {
  writable: true,
  value: jest.fn()
});

// Increase timeout for async tests
jest.setTimeout(10000);