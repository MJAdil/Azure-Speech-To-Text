/**
 * Simplified unit tests for Results Display Manager
 * Focus on core functionality without complex DOM mocking
 */

import { WebResultsDisplayManager } from '../services/ResultsDisplayManager';
import { RecognitionResult, ExportFormat } from '../types';

// Simple mock for DOM elements
const createSimpleMockElement = () => ({
  id: '',
  className: '',
  style: { cssText: '', backgroundColor: '', color: '', display: 'block' },
  innerHTML: '',
  textContent: '',
  dataset: {},
  appendChild: jest.fn(),
  remove: jest.fn(),
  querySelector: jest.fn(() => null),
  querySelectorAll: jest.fn(() => []),
  classList: {
    add: jest.fn(),
    remove: jest.fn()
  },
  scrollTop: 0,
  scrollHeight: 100
});

// Mock document only if not already defined
if (typeof document === 'undefined') {
  (global as any).document = {
    createElement: jest.fn(() => createSimpleMockElement()),
    getElementById: jest.fn(() => createSimpleMockElement())
  };
}

// Mock performance only if not already defined
if (typeof performance === 'undefined') {
  (global as any).performance = {
    now: jest.fn(() => Date.now())
  };
}

describe('WebResultsDisplayManager - Core Functionality', () => {
  let manager: WebResultsDisplayManager;
  let mockResult: RecognitionResult;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new WebResultsDisplayManager();
    
    mockResult = {
      text: 'Hello world',
      confidence: 0.95,
      offset: 1000,
      duration: 2000,
      speakerId: 'speaker1',
      language: 'en-US',
      timestamp: new Date('2023-01-01T10:00:00Z'),
      alternatives: [
        { text: 'Hello world', confidence: 0.95 },
        { text: 'Hello word', confidence: 0.85 }
      ]
    };
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('Result Storage and Retrieval', () => {
    it('should store final results correctly', () => {
      manager.displayFinalResult(mockResult);
      
      const results = manager.getAllResults();
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockResult);
    });

    it('should handle multiple results', () => {
      const result2: RecognitionResult = {
        ...mockResult,
        text: 'Second message',
        timestamp: new Date('2023-01-01T10:00:05Z')
      };

      manager.displayFinalResult(mockResult);
      manager.displayFinalResult(result2);
      
      const results = manager.getAllResults();
      expect(results).toHaveLength(2);
      expect(results[0]?.text).toBe('Hello world');
      expect(results[1]?.text).toBe('Second message');
    });

    it('should clear all results', () => {
      manager.displayFinalResult(mockResult);
      expect(manager.getAllResults()).toHaveLength(1);
      
      manager.clearResults();
      expect(manager.getAllResults()).toHaveLength(0);
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      manager.displayFinalResult(mockResult);
      manager.displayFinalResult({
        ...mockResult,
        text: 'Second message',
        timestamp: new Date('2023-01-01T10:00:05Z'),
        speakerId: 'speaker2'
      });
    });

    it('should export as text format', async () => {
      const exported = await manager.exportResults(ExportFormat.Text);
      
      expect(exported).toContain('Hello world');
      expect(exported).toContain('Second message');
      expect(exported).toContain('Speaker speaker1:');
      expect(exported).toContain('Speaker speaker2:');
    });

    it('should export as JSON format', async () => {
      const exported = await manager.exportResults(ExportFormat.JSON);
      const parsed = JSON.parse(exported);
      
      expect(parsed.totalResults).toBe(2);
      expect(parsed.results).toHaveLength(2);
      expect(parsed.results[0].text).toBe('Hello world');
      expect(parsed.results[1].text).toBe('Second message');
    });

    it('should export as SRT format', async () => {
      const exported = await manager.exportResults(ExportFormat.SRT);
      
      expect(exported).toContain('1\n00:00:01,000 --> 00:00:03,000');
      expect(exported).toContain('2\n00:00:01,000 --> 00:00:03,000');
      expect(exported).toContain('<v Speaker speaker1>Hello world');
      expect(exported).toContain('<v Speaker speaker2>Second message');
    });

    it('should handle unsupported export format', async () => {
      await expect(manager.exportResults('invalid' as ExportFormat))
        .rejects.toThrow('Unsupported export format: invalid');
    });
  });

  describe('Display Settings', () => {
    it('should update display settings', () => {
      const newSettings = {
        theme: 'dark' as const,
        fontSize: 16,
        showConfidence: false
      };
      
      expect(() => manager.updateDisplaySettings(newSettings)).not.toThrow();
    });

    it('should handle partial settings updates', () => {
      expect(() => manager.updateDisplaySettings({ fontSize: 18 })).not.toThrow();
      expect(() => manager.updateDisplaySettings({ theme: 'dark' })).not.toThrow();
    });
  });

  describe('User Interaction Callbacks', () => {
    it('should register and call user interaction callbacks', () => {
      const callback = jest.fn();
      manager.onUserInteraction(callback);
      
      manager.clearResults();
      
      expect(callback).toHaveBeenCalledWith({ type: 'clear' });
    });

    it('should handle multiple callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      manager.onUserInteraction(callback1);
      manager.onUserInteraction(callback2);
      
      manager.clearResults();
      
      expect(callback1).toHaveBeenCalledWith({ type: 'clear' });
      expect(callback2).toHaveBeenCalledWith({ type: 'clear' });
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      manager.onUserInteraction(errorCallback);
      manager.clearResults();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in user interaction callback:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Monitoring', () => {
    it('should not throw errors during display operations', () => {
      expect(() => {
        manager.displayPartialResult('Test partial', 0.8);
        manager.displayFinalResult(mockResult);
        manager.clearResults();
      }).not.toThrow();
    });

    it('should handle empty or invalid inputs gracefully', () => {
      expect(() => {
        manager.displayPartialResult('', 0.5);
        manager.displayPartialResult('Valid text', -0.1); // Invalid confidence
        manager.displayPartialResult('Valid text', 1.5);  // Invalid confidence
      }).not.toThrow();
    });
  });

  describe('Speaker Highlighting', () => {
    it('should not throw errors when highlighting speakers', () => {
      manager.displayFinalResult(mockResult);
      
      expect(() => {
        manager.highlightSpeaker('speaker1');
        manager.highlightSpeaker('nonexistent');
      }).not.toThrow();
    });
  });

  describe('Resource Management', () => {
    it('should dispose resources properly', () => {
      manager.displayFinalResult(mockResult);
      manager.displayPartialResult('Partial', 0.8);
      
      const callback = jest.fn();
      manager.onUserInteraction(callback);
      
      expect(() => manager.dispose()).not.toThrow();
      
      // After disposal, operations should not throw but results should be empty
      expect(manager.getAllResults()).toHaveLength(0);
    });

    it('should handle operations after disposal gracefully', () => {
      manager.dispose();
      
      expect(() => {
        manager.displayPartialResult('Test', 0.5);
        manager.displayFinalResult(mockResult);
        manager.clearResults();
      }).not.toThrow();
      
      expect(manager.getAllResults()).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle results without speaker ID', () => {
      const resultWithoutSpeaker: RecognitionResult = {
        ...mockResult,
        speakerId: undefined
      };
      
      expect(() => manager.displayFinalResult(resultWithoutSpeaker)).not.toThrow();
      
      const results = manager.getAllResults();
      expect(results).toHaveLength(1);
      expect(results[0]?.speakerId).toBeUndefined();
    });

    it('should handle results without alternatives', () => {
      const resultWithoutAlternatives: RecognitionResult = {
        ...mockResult,
        alternatives: undefined
      };
      
      expect(() => manager.displayFinalResult(resultWithoutAlternatives)).not.toThrow();
      
      const results = manager.getAllResults();
      expect(results).toHaveLength(1);
      expect(results[0]?.alternatives).toBeUndefined();
    });

    it('should handle empty text results', () => {
      const emptyResult: RecognitionResult = {
        ...mockResult,
        text: ''
      };
      
      expect(() => manager.displayFinalResult(emptyResult)).not.toThrow();
      
      const results = manager.getAllResults();
      expect(results).toHaveLength(1);
      expect(results[0]?.text).toBe('');
    });
  });
});