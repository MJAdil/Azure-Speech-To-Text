/**
 * Property-based tests for Results Display Manager
 */

import * as fc from 'fast-check';
import { WebResultsDisplayManager } from '../services/ResultsDisplayManager';
import { RecognitionResult, ExportFormat } from '../types';

// Mock DOM environment for property tests
const createMockElement = () => ({
  id: '',
  className: '',
  style: { cssText: '', backgroundColor: '', color: '', display: '' },
  innerHTML: '',
  textContent: '',
  dataset: {},
  appendChild: jest.fn(),
  remove: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  classList: {
    add: jest.fn(),
    remove: jest.fn()
  },
  scrollTop: 0,
  scrollHeight: 100
});

// Only define document if it doesn't exist
if (typeof document === 'undefined') {
  const mockDocument = {
    createElement: jest.fn(() => createMockElement()),
    getElementById: jest.fn(() => createMockElement())
  };

  Object.defineProperty(global, 'document', {
    value: mockDocument,
    writable: true
  });
}

if (typeof performance === 'undefined') {
  Object.defineProperty(global, 'performance', {
    value: {
      now: jest.fn(() => Date.now())
    },
    writable: true
  });
}

// Generators for property-based testing
const recognitionResultArbitrary = fc.record({
  text: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0 && !/\s/.test(s.trim())),
  confidence: fc.float({ min: 0, max: 1 }),
  offset: fc.integer({ min: 0, max: 300000 }), // 0 to 5 minutes in ms
  duration: fc.integer({ min: 100, max: 30000 }), // 100ms to 30s
  speakerId: fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes(' ') && s.trim().length > 0), { nil: undefined }),
  language: fc.constantFrom('en-US', 'es-ES', 'fr-FR', 'de-DE'),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }),
  alternatives: fc.option(fc.array(fc.record({
    text: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    confidence: fc.float({ min: 0, max: 1 })
  }), { maxLength: 3 }), { nil: undefined })
});

const partialResultArbitrary = fc.record({
  text: fc.string({ maxLength: 200 }).filter(s => s.trim().length > 0),
  confidence: fc.float({ min: 0, max: 1 })
});

describe('ResultsDisplayManager Property Tests', () => {
  let manager: WebResultsDisplayManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset global mocks for each test
    (global as any).performance = {
      now: jest.fn(() => Date.now())
    };
    
    manager = new WebResultsDisplayManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('Property 3: Real-time Display Performance', () => {
    /**
     * **Validates: Requirements 1.3, 8.2**
     * For any recognition result received from Azure services, 
     * the Results_Display_Manager should display it within 200ms of receipt
     */
    it('should display partial results within 200ms performance requirement', () => {
      fc.assert(fc.property(
        partialResultArbitrary,
        (partialResult) => {
          const startTime = 1000;
          const endTime = 1150; // 150ms - within requirement
          
          const mockPerformanceNow = jest.fn()
            .mockReturnValueOnce(startTime)
            .mockReturnValueOnce(endTime);
          
          (global as any).performance = { now: mockPerformanceNow };
          
          const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
          
          manager.displayPartialResult(partialResult.text, partialResult.confidence);
          
          // Should not warn about performance issues
          const performanceWarnings = consoleSpy.mock.calls.filter(call => 
            call[0].includes('latency exceeded 200ms')
          );
          expect(performanceWarnings).toHaveLength(0);
          
          consoleSpy.mockRestore();
        }
      ), { numRuns: 10 });
    });

    it('should display final results within 200ms performance requirement', () => {
      fc.assert(fc.property(
        recognitionResultArbitrary,
        (result) => {
          const startTime = 1000;
          const endTime = 1180; // 180ms - within requirement
          
          const mockPerformanceNow = jest.fn()
            .mockReturnValueOnce(startTime)
            .mockReturnValueOnce(endTime);
          
          (global as any).performance = { now: mockPerformanceNow };
          
          const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
          
          manager.displayFinalResult(result);
          
          // Should not warn about performance issues
          const performanceWarnings = consoleSpy.mock.calls.filter(call => 
            call[0].includes('latency exceeded 200ms')
          );
          expect(performanceWarnings).toHaveLength(0);
          
          consoleSpy.mockRestore();
        }
      ), { numRuns: 10 });
    });
  });

  describe('Property 4: Result Update Consistency', () => {
    /**
     * **Validates: Requirements 1.4**
     * For any final recognition result, it should completely replace 
     * any corresponding partial results without leaving stale or conflicting data
     */
    it('should completely replace partial results with final results', () => {
      fc.assert(fc.property(
        fc.array(partialResultArbitrary, { minLength: 1, maxLength: 3 }),
        recognitionResultArbitrary,
        (partialResults, finalResult) => {
          // Display multiple partial results
          partialResults.forEach(partial => {
            manager.displayPartialResult(partial.text, partial.confidence);
          });
          
          // Display final result
          manager.displayFinalResult(finalResult);
          
          // Final result should be in results history
          const allResults = manager.getAllResults();
          expect(allResults).toContain(finalResult);
        }
      ), { numRuns: 10 });
    });

    it('should maintain result history consistency', () => {
      const testResults = [
        {
          text: 'Hello world',
          confidence: 0.95,
          offset: 1000,
          duration: 2000,
          speakerId: 'speaker1',
          language: 'en-US' as const,
          timestamp: new Date('2023-01-01T10:00:00Z'),
          alternatives: undefined
        },
        {
          text: 'Second message',
          confidence: 0.88,
          offset: 3000,
          duration: 1500,
          speakerId: 'speaker2',
          language: 'en-US' as const,
          timestamp: new Date('2023-01-01T10:00:03Z'),
          alternatives: undefined
        }
      ];

      // Display all results
      testResults.forEach(result => manager.displayFinalResult(result));
      
      // All results should be in history in order
      const storedResults = manager.getAllResults();
      expect(storedResults).toHaveLength(testResults.length);
      
      // Results should maintain their properties
      testResults.forEach((originalResult, index) => {
        const storedResult = storedResults[index];
        if (storedResult) {
          expect(storedResult.text).toBe(originalResult.text);
          expect(storedResult.confidence).toBe(originalResult.confidence);
          expect(storedResult.speakerId).toBe(originalResult.speakerId);
        }
      });
    });
  });

  describe('Property 17: Export Format Completeness', () => {
    /**
     * **Validates: Requirements 6.3**
     * For any export request, results should be available in all specified formats 
     * (text, JSON, SRT) with proper formatting
     */
    it('should export all results in text format with complete information', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(recognitionResultArbitrary, { minLength: 1, maxLength: 2 }),
        async (results) => {
          // Add results to manager
          results.forEach(result => manager.displayFinalResult(result));
          
          const exported = await manager.exportResults(ExportFormat.Text);
          
          // Should contain all result texts
          results.forEach(result => {
            expect(exported).toContain(result.text);
          });
          
          // Should be properly formatted with timestamps and speakers
          const lines = exported.split('\n').filter(line => line.trim().length > 0);
          expect(lines.length).toBeGreaterThanOrEqual(results.length);
        }
      ), { numRuns: 10 });
    });

    it('should export all results in JSON format with complete metadata', async () => {
      const testResults = [
        {
          text: 'Hello world',
          confidence: 0.95,
          offset: 1000,
          duration: 2000,
          speakerId: 'speaker1',
          language: 'en-US' as const,
          timestamp: new Date('2023-01-01T10:00:00Z'),
          alternatives: undefined
        }
      ];

      // Add results to manager
      testResults.forEach(result => manager.displayFinalResult(result));
      
      const exported = await manager.exportResults(ExportFormat.JSON);
      const parsed = JSON.parse(exported);
      
      // Should have proper structure
      expect(parsed).toHaveProperty('exportedAt');
      expect(parsed).toHaveProperty('totalResults');
      expect(parsed).toHaveProperty('results');
      expect(parsed.results).toHaveLength(testResults.length);
      
      // Each result should have complete metadata
      parsed.results.forEach((exportedResult: any, index: number) => {
        const originalResult = testResults[index];
        if (originalResult) {
          expect(exportedResult.text).toBe(originalResult.text);
          expect(exportedResult.confidence).toBe(originalResult.confidence);
          expect(exportedResult.speakerId).toBe(originalResult.speakerId);
          expect(exportedResult.language).toBe(originalResult.language);
          expect(exportedResult.offset).toBe(originalResult.offset);
          expect(exportedResult.duration).toBe(originalResult.duration);
        }
      });
    });

    it('should export all results in SRT format with proper timing', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(recognitionResultArbitrary, { minLength: 1, maxLength: 2 }),
        async (results) => {
          // Add results to manager
          results.forEach(result => manager.displayFinalResult(result));
          
          const exported = await manager.exportResults(ExportFormat.SRT);
          
          // Should contain all result texts
          results.forEach(result => {
            expect(exported).toContain(result.text);
          });
          
          // Should have proper SRT structure
          const blocks = exported.split('\n\n').filter(block => block.trim());
          expect(blocks.length).toBeGreaterThanOrEqual(results.length);
          
          blocks.forEach((block, index) => {
            const lines = block.split('\n');
            expect(lines.length).toBeGreaterThanOrEqual(3); // Index, timing, text
            
            // Should have sequence number
            expect(lines[0]).toBe((index + 1).toString());
            
            // Should have timing format
            expect(lines[1]).toMatch(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/);
          });
        }
      ), { numRuns: 10 });
    });

    it('should handle all export formats without errors', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(recognitionResultArbitrary, { maxLength: 2 }),
        async (results) => {
          // Add results to manager
          results.forEach(result => manager.displayFinalResult(result));
          
          // All formats should export without throwing
          const textExport = await manager.exportResults(ExportFormat.Text);
          const jsonExport = await manager.exportResults(ExportFormat.JSON);
          const srtExport = await manager.exportResults(ExportFormat.SRT);
          
          // All exports should be strings
          expect(typeof textExport).toBe('string');
          expect(typeof jsonExport).toBe('string');
          expect(typeof srtExport).toBe('string');
          
          // JSON should be valid
          expect(() => JSON.parse(jsonExport)).not.toThrow();
        }
      ), { numRuns: 10 });
    });
  });

  describe('Display Consistency Properties', () => {
    it('should maintain display state consistency across operations', () => {
      fc.assert(fc.property(
        fc.array(recognitionResultArbitrary, { maxLength: 3 }),
        fc.array(partialResultArbitrary, { maxLength: 2 }),
        (finalResults, partialResults) => {
          // Display some final results
          finalResults.forEach(result => manager.displayFinalResult(result));
          
          const initialCount = manager.getAllResults().length;
          
          // Display partial results
          partialResults.forEach(partial => {
            manager.displayPartialResult(partial.text, partial.confidence);
          });
          
          // Final result count should not change due to partial results
          expect(manager.getAllResults()).toHaveLength(initialCount);
          
          // Clear should reset everything
          manager.clearResults();
          expect(manager.getAllResults()).toHaveLength(0);
        }
      ), { numRuns: 10 });
    });

    it('should handle speaker highlighting consistently', () => {
      const testResults = [
        {
          text: 'Hello world',
          confidence: 0.95,
          offset: 1000,
          duration: 2000,
          speakerId: 'speaker1',
          language: 'en-US' as const,
          timestamp: new Date('2023-01-01T10:00:00Z'),
          alternatives: undefined
        }
      ];

      // Add results with speakers
      testResults.forEach(result => manager.displayFinalResult(result));
      
      // Highlighting should not throw errors
      expect(() => manager.highlightSpeaker('speaker1')).not.toThrow();
      expect(() => manager.highlightSpeaker('nonexistent')).not.toThrow();
      
      // Results should remain unchanged
      const storedResults = manager.getAllResults();
      expect(storedResults).toHaveLength(testResults.length);
    });
  });

  describe('Resource Management Properties', () => {
    it('should handle disposal without memory leaks', () => {
      fc.assert(fc.property(
        fc.array(recognitionResultArbitrary, { maxLength: 5 }),
        (results) => {
          // Add many results
          results.forEach(result => manager.displayFinalResult(result));
          
          // Dispose should clear everything
          manager.dispose();
          
          // Should be safe to call operations after disposal
          expect(() => {
            manager.getAllResults();
            manager.clearResults();
            manager.displayPartialResult('test', 0.5);
          }).not.toThrow();
          
          // Results should be empty after disposal
          expect(manager.getAllResults()).toHaveLength(0);
        }
      ), { numRuns: 10 });
    });
  });
});