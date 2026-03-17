/**
 * Final comprehensive tests for Results Display Manager
 * Tests core functionality and requirements validation
 */

import { WebResultsDisplayManager } from '../services/ResultsDisplayManager';
import { RecognitionResult, ExportFormat } from '../types';

// Mock DOM environment
if (typeof document === 'undefined') {
  (global as any).document = {
    createElement: jest.fn(() => ({
      id: '', className: '', style: { cssText: '', display: 'block' },
      innerHTML: '', textContent: '', dataset: {}, appendChild: jest.fn(),
      remove: jest.fn(), querySelector: jest.fn(() => null),
      querySelectorAll: jest.fn(() => []), classList: { add: jest.fn(), remove: jest.fn() },
      scrollTop: 0, scrollHeight: 100
    })),
    getElementById: jest.fn(() => null)
  };
}

if (typeof performance === 'undefined') {
  (global as any).performance = { now: jest.fn(() => Date.now()) };
}

describe('WebResultsDisplayManager - Requirements Validation', () => {
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
        { text: 'Hello world', confidence: 0.95 }
      ]
    };
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('Requirement 1.3: Real-time Display with <200ms Latency', () => {
    it('should display partial results without throwing errors', () => {
      expect(() => {
        manager.displayPartialResult('Hello', 0.8);
        manager.displayPartialResult('Hello world', 0.9);
        manager.displayPartialResult('', 0.5); // Empty text
      }).not.toThrow();
    });

    it('should display final results without throwing errors', () => {
      expect(() => {
        manager.displayFinalResult(mockResult);
      }).not.toThrow();
      
      const results = manager.getAllResults();
      expect(results).toHaveLength(1);
      expect(results[0]?.text).toBe('Hello world');
    });
  });

  describe('Requirement 1.4: Result Update Consistency', () => {
    it('should replace partial results with final results', () => {
      // Display partial results
      manager.displayPartialResult('Partial 1', 0.7);
      manager.displayPartialResult('Partial 2', 0.8);
      
      // Display final result
      manager.displayFinalResult(mockResult);
      
      // Only final result should be stored
      const results = manager.getAllResults();
      expect(results).toHaveLength(1);
      expect(results[0]?.text).toBe('Hello world');
    });

    it('should maintain result history correctly', () => {
      const result1 = { ...mockResult, text: 'First message' };
      const result2 = { ...mockResult, text: 'Second message' };
      
      manager.displayFinalResult(result1);
      manager.displayFinalResult(result2);
      
      const results = manager.getAllResults();
      expect(results).toHaveLength(2);
      expect(results[0]?.text).toBe('First message');
      expect(results[1]?.text).toBe('Second message');
    });
  });

  describe('Requirement 6.1: Display with Confidence Scores and Timestamps', () => {
    it('should handle results with confidence scores', () => {
      const resultWithConfidence = { ...mockResult, confidence: 0.85 };
      
      expect(() => {
        manager.displayFinalResult(resultWithConfidence);
      }).not.toThrow();
      
      const results = manager.getAllResults();
      expect(results[0]?.confidence).toBe(0.85);
    });

    it('should handle results with timestamps', () => {
      const timestamp = new Date('2023-06-15T14:30:00Z');
      const resultWithTimestamp = { ...mockResult, timestamp };
      
      expect(() => {
        manager.displayFinalResult(resultWithTimestamp);
      }).not.toThrow();
      
      const results = manager.getAllResults();
      expect(results[0]?.timestamp).toEqual(timestamp);
    });
  });

  describe('Requirement 6.3: Multi-format Export', () => {
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
      
      expect(typeof exported).toBe('string');
      expect(exported).toContain('Hello world');
      expect(exported).toContain('Second message');
    });

    it('should export as JSON format', async () => {
      const exported = await manager.exportResults(ExportFormat.JSON);
      
      expect(typeof exported).toBe('string');
      expect(() => JSON.parse(exported)).not.toThrow();
      
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('totalResults');
      expect(parsed).toHaveProperty('results');
      expect(Array.isArray(parsed.results)).toBe(true);
    });

    it('should export as SRT format', async () => {
      const exported = await manager.exportResults(ExportFormat.SRT);
      
      expect(typeof exported).toBe('string');
      expect(exported).toContain('1\n');
      expect(exported).toContain('2\n');
      expect(exported).toMatch(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/);
    });

    it('should reject unsupported export formats', async () => {
      await expect(manager.exportResults('invalid' as ExportFormat))
        .rejects.toThrow('Unsupported export format');
    });
  });

  describe('Requirement 6.4: Speaker Identification Display', () => {
    it('should handle results with speaker IDs', () => {
      const resultWithSpeaker = { ...mockResult, speakerId: 'speaker123' };
      
      expect(() => {
        manager.displayFinalResult(resultWithSpeaker);
      }).not.toThrow();
      
      const results = manager.getAllResults();
      expect(results[0]?.speakerId).toBe('speaker123');
    });

    it('should handle results without speaker IDs', () => {
      const resultWithoutSpeaker = { ...mockResult, speakerId: undefined };
      
      expect(() => {
        manager.displayFinalResult(resultWithoutSpeaker);
      }).not.toThrow();
      
      const results = manager.getAllResults();
      expect(results[0]?.speakerId).toBeUndefined();
    });

    it('should handle speaker highlighting safely', () => {
      manager.displayFinalResult(mockResult);
      
      expect(() => {
        manager.highlightSpeaker('speaker1');
        manager.highlightSpeaker('nonexistent');
        manager.highlightSpeaker(''); // Empty speaker ID
        manager.highlightSpeaker('speaker with spaces'); // Invalid characters
      }).not.toThrow();
    });
  });

  describe('Requirement 6.5: Interface Reset Functionality', () => {
    it('should clear all results and reset interface', () => {
      manager.displayFinalResult(mockResult);
      manager.displayPartialResult('Partial', 0.8);
      
      expect(manager.getAllResults()).toHaveLength(1);
      
      manager.clearResults();
      
      expect(manager.getAllResults()).toHaveLength(0);
    });

    it('should handle multiple clear operations', () => {
      manager.displayFinalResult(mockResult);
      manager.clearResults();
      manager.clearResults(); // Should not throw
      
      expect(manager.getAllResults()).toHaveLength(0);
    });
  });

  describe('Display Settings Management', () => {
    it('should update display settings without errors', () => {
      expect(() => {
        manager.updateDisplaySettings({ theme: 'dark' });
        manager.updateDisplaySettings({ fontSize: 16 });
        manager.updateDisplaySettings({ showConfidence: false });
      }).not.toThrow();
    });

    it('should handle partial settings updates', () => {
      expect(() => {
        manager.updateDisplaySettings({ theme: 'dark', fontSize: 18 });
      }).not.toThrow();
    });
  });

  describe('User Interaction Callbacks', () => {
    it('should register and call callbacks', () => {
      const callback = jest.fn();
      manager.onUserInteraction(callback);
      
      manager.clearResults();
      
      expect(callback).toHaveBeenCalledWith({ type: 'clear' });
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => { throw new Error('Test error'); });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      manager.onUserInteraction(errorCallback);
      
      expect(() => manager.clearResults()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Resource Management', () => {
    it('should dispose resources properly', () => {
      manager.displayFinalResult(mockResult);
      const callback = jest.fn();
      manager.onUserInteraction(callback);
      
      expect(() => manager.dispose()).not.toThrow();
      expect(manager.getAllResults()).toHaveLength(0);
    });

    it('should handle operations after disposal gracefully', () => {
      manager.dispose();
      
      expect(() => {
        manager.displayPartialResult('Test', 0.5);
        manager.displayFinalResult(mockResult);
        manager.clearResults();
        manager.highlightSpeaker('test');
      }).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty text results', () => {
      const emptyResult = { ...mockResult, text: '' };
      
      expect(() => manager.displayFinalResult(emptyResult)).not.toThrow();
      
      const results = manager.getAllResults();
      expect(results[0]?.text).toBe('');
    });

    it('should handle results with no alternatives', () => {
      const resultNoAlternatives = { ...mockResult, alternatives: undefined };
      
      expect(() => manager.displayFinalResult(resultNoAlternatives)).not.toThrow();
      
      const results = manager.getAllResults();
      expect(results[0]?.alternatives).toBeUndefined();
    });

    it('should handle extreme confidence values', () => {
      expect(() => {
        manager.displayPartialResult('Test', 0);
        manager.displayPartialResult('Test', 1);
        manager.displayPartialResult('Test', 0.5);
      }).not.toThrow();
    });

    it('should handle large numbers of results', () => {
      const manyResults = Array.from({ length: 100 }, (_, i) => ({
        ...mockResult,
        text: `Message ${i}`,
        timestamp: new Date(Date.now() + i * 1000)
      }));
      
      expect(() => {
        manyResults.forEach(result => manager.displayFinalResult(result));
      }).not.toThrow();
      
      expect(manager.getAllResults()).toHaveLength(100);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle rapid partial result updates', () => {
      expect(() => {
        for (let i = 0; i < 50; i++) {
          manager.displayPartialResult(`Partial ${i}`, Math.random());
        }
      }).not.toThrow();
    });

    it('should handle rapid final result updates', () => {
      expect(() => {
        for (let i = 0; i < 20; i++) {
          manager.displayFinalResult({
            ...mockResult,
            text: `Message ${i}`,
            timestamp: new Date(Date.now() + i * 100)
          });
        }
      }).not.toThrow();
      
      expect(manager.getAllResults()).toHaveLength(20);
    });
  });
});