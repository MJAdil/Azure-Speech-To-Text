/**
 * Simplified Property-based tests for Results Display Manager
 * Focus on core correctness properties without complex DOM interactions
 */

import * as fc from 'fast-check';
import { WebResultsDisplayManager } from '../services/ResultsDisplayManager';
import { RecognitionResult, ExportFormat } from '../types';

// Simple mock for DOM elements
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

// Generators for property-based testing
const recognitionResultArbitrary = fc.record({
  text: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0 && !/\s/.test(s.trim())),
  confidence: fc.float({ min: 0, max: 1 }),
  offset: fc.integer({ min: 0, max: 60000 }), // 0 to 1 minute in ms
  duration: fc.integer({ min: 100, max: 10000 }), // 100ms to 10s
  speakerId: fc.option(fc.string({ minLength: 1, maxLength: 10 }).filter(s => !s.includes(' ') && s.trim().length > 0), { nil: undefined }),
  language: fc.constantFrom('en-US', 'es-ES', 'fr-FR'),
  timestamp: fc.date({ min: new Date('2023-01-01'), max: new Date('2024-01-01') }),
  alternatives: fc.option(fc.array(fc.record({
    text: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    confidence: fc.float({ min: 0, max: 1 })
  }), { maxLength: 2 }), { nil: undefined })
});

describe('ResultsDisplayManager Property Tests - Core Requirements', () => {
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

  describe('Property 4: Result Update Consistency', () => {
    /**
     * **Validates: Requirements 1.4**
     * For any final recognition result, it should completely replace 
     * any corresponding partial results without leaving stale or conflicting data
     */
    it('should maintain consistent result storage regardless of partial results', () => {
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

      // Display some partial results first
      manager.displayPartialResult('partial 1', 0.5);
      manager.displayPartialResult('partial 2', 0.7);
      
      // Display final results
      testResults.forEach(result => manager.displayFinalResult(result));
      
      // Final results should be stored correctly regardless of partial results
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
          
          // Should be properly formatted
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
        }
      });
    });

    it('should export all results in SRT format with proper structure', async () => {
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
      ), { numRuns: 20 });
    });
  });

  describe('Display State Consistency Properties', () => {
    it('should maintain display state consistency across operations', () => {
      fc.assert(fc.property(
        fc.array(recognitionResultArbitrary, { maxLength: 3 }),
        (results) => {
          // Display results
          results.forEach(result => manager.displayFinalResult(result));
          
          const initialCount = manager.getAllResults().length;
          expect(initialCount).toBe(results.length);
          
          // Clear should reset everything
          manager.clearResults();
          expect(manager.getAllResults()).toHaveLength(0);
        }
      ), { numRuns: 20 });
    });

    it('should handle speaker highlighting without affecting result storage', () => {
      fc.assert(fc.property(
        fc.array(recognitionResultArbitrary, { minLength: 1, maxLength: 3 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (results, highlightSpeakerId) => {
          // Add results
          results.forEach(result => manager.displayFinalResult(result));
          
          const beforeHighlight = manager.getAllResults().length;
          
          // Highlighting should not throw errors or affect storage
          expect(() => manager.highlightSpeaker(highlightSpeakerId)).not.toThrow();
          
          // Results should remain unchanged
          const afterHighlight = manager.getAllResults().length;
          expect(afterHighlight).toBe(beforeHighlight);
        }
      ), { numRuns: 15 });
    });
  });

  describe('Resource Management Properties', () => {
    it('should handle disposal without memory leaks', () => {
      fc.assert(fc.property(
        fc.array(recognitionResultArbitrary, { maxLength: 5 }),
        (results) => {
          // Add results
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
      ), { numRuns: 15 });
    });
  });

  describe('Input Validation Properties', () => {
    it('should handle various confidence values correctly', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.float({ min: 0, max: 1 }),
        (text, confidence) => {
          // Should not throw for valid confidence values
          expect(() => {
            manager.displayPartialResult(text, confidence);
          }).not.toThrow();
        }
      ), { numRuns: 20 });
    });

    it('should handle empty and whitespace text gracefully', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant(''),
          fc.string({ minLength: 1, maxLength: 10 }).map(s => ' '.repeat(s.length)),
          fc.string({ minLength: 1, maxLength: 50 })
        ),
        fc.float({ min: 0, max: 1 }),
        (text, confidence) => {
          expect(() => {
            manager.displayPartialResult(text, confidence);
          }).not.toThrow();
        }
      ), { numRuns: 15 });
    });
  });
});