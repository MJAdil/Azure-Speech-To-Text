/**
 * Example usage of Results Display Manager
 * Demonstrates real-time display, export capabilities, and speaker identification
 */

import { WebResultsDisplayManager } from '../services/ResultsDisplayManager';
import { RecognitionResult, ExportFormat } from '../types';

// Example: Setting up Results Display Manager
export function createResultsDisplayExample(): void {
  // Initialize the Results Display Manager
  const resultsManager = new WebResultsDisplayManager('speech-results-container');

  // Configure display settings
  resultsManager.updateDisplaySettings({
    theme: 'light',
    fontSize: 14,
    showConfidence: true,
    showTimestamps: true,
    showSpeakerIds: true,
    autoScroll: true
  });

  // Set up user interaction callbacks
  resultsManager.onUserInteraction((event) => {
    console.log('User interaction:', event);
    
    switch (event.type) {
      case 'clear':
        console.log('Results cleared by user');
        break;
      case 'highlight':
        console.log('Speaker highlighted:', event.data);
        break;
      case 'export':
        console.log('Export requested:', event.data);
        break;
    }
  });

  // Example: Simulating real-time speech recognition
  simulateRealTimeRecognition(resultsManager);

  // Example: Export functionality
  setupExportButtons(resultsManager);

  // Example: Speaker highlighting
  setupSpeakerControls(resultsManager);
}

function simulateRealTimeRecognition(manager: WebResultsDisplayManager): void {
  console.log('Starting real-time recognition simulation...');

  // Simulate partial results (real-time updates)
  const partialTexts = [
    'Hello',
    'Hello world',
    'Hello world this',
    'Hello world this is',
    'Hello world this is a test'
  ];

  let partialIndex = 0;
  const partialInterval = setInterval(() => {
    if (partialIndex < partialTexts.length) {
      const confidence = 0.6 + (partialIndex * 0.08); // Increasing confidence
      const partialText = partialTexts[partialIndex];
      if (partialText) {
        manager.displayPartialResult(partialText, confidence);
      }
      partialIndex++;
    } else {
      clearInterval(partialInterval);
      
      // Display final result
      const finalResult: RecognitionResult = {
        text: 'Hello world this is a test of the speech recognition system',
        confidence: 0.95,
        offset: 1000,
        duration: 3500,
        speakerId: 'speaker1',
        language: 'en-US',
        timestamp: new Date(),
        alternatives: [
          { text: 'Hello world this is a test of the speech recognition system', confidence: 0.95 },
          { text: 'Hello world this is a test of the speech recognition', confidence: 0.87 }
        ]
      };
      
      manager.displayFinalResult(finalResult);
      
      // Continue with more results
      setTimeout(() => addMoreResults(manager), 2000);
    }
  }, 500);
}

function addMoreResults(manager: WebResultsDisplayManager): void {
  const additionalResults: RecognitionResult[] = [
    {
      text: 'This is the second message from a different speaker',
      confidence: 0.92,
      offset: 5000,
      duration: 2800,
      speakerId: 'speaker2',
      language: 'en-US',
      timestamp: new Date(Date.now() + 5000),
      alternatives: [
        { text: 'This is the second message from a different speaker', confidence: 0.92 }
      ]
    },
    {
      text: 'And here is a third message with lower confidence',
      confidence: 0.78,
      offset: 8500,
      duration: 2200,
      speakerId: 'speaker1',
      language: 'en-US',
      timestamp: new Date(Date.now() + 8500),
      alternatives: [
        { text: 'And here is a third message with lower confidence', confidence: 0.78 },
        { text: 'And here is a third message with low confidence', confidence: 0.72 }
      ]
    }
  ];

  additionalResults.forEach((result, index) => {
    setTimeout(() => {
      manager.displayFinalResult(result);
    }, index * 3000);
  });
}

function setupExportButtons(manager: WebResultsDisplayManager): void {
  // Create export buttons (in a real application, these would be HTML elements)
  const exportButtons = {
    text: () => exportResults(manager, ExportFormat.Text),
    json: () => exportResults(manager, ExportFormat.JSON),
    srt: () => exportResults(manager, ExportFormat.SRT)
  };

  console.log('Export functions available:', Object.keys(exportButtons));

  // Example: Export after some delay
  setTimeout(async () => {
    console.log('Exporting results in all formats...');
    
    try {
      const textExport = await exportButtons.text();
      console.log('Text export length:', textExport.length);
      
      const jsonExport = await exportButtons.json();
      console.log('JSON export parsed:', JSON.parse(jsonExport).totalResults, 'results');
      
      const srtExport = await exportButtons.srt();
      console.log('SRT export blocks:', srtExport.split('\n\n').length);
    } catch (error) {
      console.error('Export error:', error);
    }
  }, 15000);
}

async function exportResults(manager: WebResultsDisplayManager, format: ExportFormat): Promise<string> {
  try {
    const exported = await manager.exportResults(format);
    console.log(`Exported ${format} format:`, exported.substring(0, 100) + '...');
    return exported;
  } catch (error) {
    console.error(`Export failed for ${format}:`, error);
    throw error;
  }
}

function setupSpeakerControls(manager: WebResultsDisplayManager): void {
  // Simulate speaker highlighting controls
  const speakerControls = {
    highlightSpeaker1: () => manager.highlightSpeaker('speaker1'),
    highlightSpeaker2: () => manager.highlightSpeaker('speaker2'),
    clearHighlights: () => manager.highlightSpeaker('') // Clear highlights
  };

  console.log('Speaker controls available:', Object.keys(speakerControls));

  // Example: Highlight speakers after results are displayed
  setTimeout(() => {
    console.log('Highlighting speaker1...');
    speakerControls.highlightSpeaker1();
    
    setTimeout(() => {
      console.log('Highlighting speaker2...');
      speakerControls.highlightSpeaker2();
      
      setTimeout(() => {
        console.log('Clearing highlights...');
        speakerControls.clearHighlights();
      }, 3000);
    }, 3000);
  }, 10000);
}

// Example: Integration with Speech Recognition Manager
export function integrateWithSpeechRecognition(): void {
  const resultsManager = new WebResultsDisplayManager();

  // Example integration points
  const integrationExample = {
    // Handle partial recognition results
    onPartialResult: (text: string, confidence: number) => {
      resultsManager.displayPartialResult(text, confidence);
    },

    // Handle final recognition results
    onFinalResult: (result: RecognitionResult) => {
      resultsManager.displayFinalResult(result);
    },

    // Handle recognition errors
    onError: (error: Error) => {
      console.error('Recognition error:', error);
      // Could display error message in results area
    },

    // Handle session events
    onSessionStart: () => {
      console.log('Recognition session started');
      resultsManager.clearResults(); // Clear previous results
    },

    onSessionStop: () => {
      console.log('Recognition session stopped');
      // Results remain displayed for review
    }
  };

  console.log('Integration example created with handlers:', Object.keys(integrationExample));
}

// Example: Performance monitoring
export function setupPerformanceMonitoring(manager: WebResultsDisplayManager): void {
  let displayStartTime: number;

  // Monitor display performance
  const originalDisplayPartial = manager.displayPartialResult.bind(manager);
  const originalDisplayFinal = manager.displayFinalResult.bind(manager);

  manager.displayPartialResult = (text: string, confidence: number) => {
    displayStartTime = performance.now();
    originalDisplayPartial(text, confidence);
    const latency = performance.now() - displayStartTime;
    
    if (latency > 200) {
      console.warn(`Partial result display latency: ${latency.toFixed(2)}ms (exceeds 200ms requirement)`);
    } else {
      console.log(`Partial result display latency: ${latency.toFixed(2)}ms ✓`);
    }
  };

  manager.displayFinalResult = (result: RecognitionResult) => {
    displayStartTime = performance.now();
    originalDisplayFinal(result);
    const latency = performance.now() - displayStartTime;
    
    if (latency > 200) {
      console.warn(`Final result display latency: ${latency.toFixed(2)}ms (exceeds 200ms requirement)`);
    } else {
      console.log(`Final result display latency: ${latency.toFixed(2)}ms ✓`);
    }
  };

  console.log('Performance monitoring enabled for Results Display Manager');
}

// Example usage in a web application
export function webApplicationExample(): void {
  // This would typically be called when the page loads
  document.addEventListener('DOMContentLoaded', () => {
    // Create container element
    const container = document.createElement('div');
    container.id = 'speech-results-display';
    container.style.cssText = `
      width: 100%;
      max-width: 800px;
      margin: 20px auto;
      padding: 20px;
      border: 1px solid #ccc;
      border-radius: 8px;
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(container);

    // Initialize Results Display Manager
    const manager = new WebResultsDisplayManager('speech-results-display');
    
    // Set up performance monitoring
    setupPerformanceMonitoring(manager);
    
    // Start the example
    createResultsDisplayExample();
    
    console.log('Web application example initialized');
  });
}

// Export for use in other modules
export { WebResultsDisplayManager };