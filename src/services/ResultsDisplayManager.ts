/**
 * Results Display Manager Implementation
 * Handles transcription result display, formatting, and user interactions
 */

import { 
  ResultsDisplayManager, 
  DisplaySettings, 
  UserInteractionEvent 
} from '../interfaces/ResultsDisplayManager';
import { 
  RecognitionResult, 
  ExportFormat, 
  SpeakerSegment 
} from '../types';

export class WebResultsDisplayManager implements ResultsDisplayManager {
  private results: RecognitionResult[] = [];
  private partialResults: Map<string, { text: string; confidence: number }> = new Map();
  private displaySettings: DisplaySettings = {
    showConfidence: true,
    showTimestamps: true,
    showSpeakerIds: true,
    fontSize: 14,
    theme: 'light',
    autoScroll: true
  };
  private userInteractionCallbacks: ((event: UserInteractionEvent) => void)[] = [];
  private displayContainer: HTMLElement | null = null;
  private partialContainer: HTMLElement | null = null;

  constructor(containerId?: string) {
    if (containerId) {
      this.displayContainer = document.getElementById(containerId);
    }
    this.initializeDisplay();
  }

  private initializeDisplay(): void {
    if (!this.displayContainer) {
      // Create default display structure if no container provided
      this.displayContainer = document.createElement('div');
      this.displayContainer.id = 'speech-results-display';
      this.displayContainer.className = 'speech-results-container';
    }

    // Create partial results container
    this.partialContainer = document.createElement('div');
    this.partialContainer.className = 'partial-results';
    this.partialContainer.style.cssText = `
      padding: 8px;
      background-color: #f0f0f0;
      border-radius: 4px;
      margin-bottom: 8px;
      min-height: 24px;
      font-style: italic;
      opacity: 0.8;
    `;

    this.displayContainer.appendChild(this.partialContainer);
    this.applyTheme();
  }

  displayPartialResult(text: string, confidence: number): void {
    const startTime = performance.now();
    
    if (!this.partialContainer) return;

    // Store partial result with unique key
    const key = `partial_${Date.now()}`;
    this.partialResults.set(key, { text, confidence });

    // Update display with <200ms latency requirement
    this.updatePartialDisplay(text, confidence);

    // Measure and log latency for performance monitoring
    const latency = performance.now() - startTime;
    if (latency > 200) {
      console.warn(`Partial result display latency exceeded 200ms: ${latency}ms`);
    }
  }

  private updatePartialDisplay(text: string, confidence: number): void {
    if (!this.partialContainer) return;

    let displayText = text;
    
    if (this.displaySettings.showConfidence) {
      const confidencePercent = Math.round(confidence * 100);
      displayText += ` (${confidencePercent}%)`;
    }

    this.partialContainer.textContent = displayText;
    this.partialContainer.style.display = text ? 'block' : 'none';

    if (this.displaySettings.autoScroll) {
      this.scrollToBottom();
    }
  }

  displayFinalResult(result: RecognitionResult): void {
    const startTime = performance.now();

    // Clear partial results when final result arrives
    this.partialResults.clear();
    if (this.partialContainer) {
      this.partialContainer.textContent = '';
      this.partialContainer.style.display = 'none';
    }

    // Add to results history
    this.results.push(result);

    // Create and display final result element
    this.createFinalResultElement(result);

    // Measure display latency
    const latency = performance.now() - startTime;
    if (latency > 200) {
      console.warn(`Final result display latency exceeded 200ms: ${latency}ms`);
    }
  }

  private createFinalResultElement(result: RecognitionResult): void {
    if (!this.displayContainer) return;

    const resultElement = document.createElement('div');
    resultElement.className = 'final-result';
    resultElement.dataset.resultId = result.timestamp.toISOString();
    
    // Apply speaker-specific styling
    if (result.speakerId) {
      // Sanitize speakerId for dataset and CSS class
      const sanitizedSpeakerId = result.speakerId.replace(/[^a-zA-Z0-9-_]/g, '');
      if (sanitizedSpeakerId) {
        resultElement.dataset.speakerId = sanitizedSpeakerId;
        resultElement.classList.add(`speaker-${sanitizedSpeakerId}`);
      }
    }

    let content = '';

    // Add timestamp if enabled
    if (this.displaySettings.showTimestamps) {
      const timestamp = this.formatTimestamp(result.timestamp);
      content += `<span class="timestamp">[${timestamp}]</span> `;
    }

    // Add speaker ID if available and enabled
    if (this.displaySettings.showSpeakerIds && result.speakerId) {
      content += `<span class="speaker-id">Speaker ${result.speakerId}:</span> `;
    }

    // Add main text
    content += `<span class="result-text">${this.escapeHtml(result.text)}</span>`;

    // Add confidence score if enabled
    if (this.displaySettings.showConfidence) {
      const confidencePercent = Math.round(result.confidence * 100);
      content += ` <span class="confidence">(${confidencePercent}%)</span>`;
    }

    resultElement.innerHTML = content;
    this.styleResultElement(resultElement);
    
    this.displayContainer.appendChild(resultElement);

    if (this.displaySettings.autoScroll) {
      this.scrollToBottom();
    }
  }

  private styleResultElement(element: HTMLElement): void {
    element.style.cssText = `
      padding: 8px 12px;
      margin-bottom: 4px;
      border-radius: 4px;
      line-height: 1.4;
      font-size: ${this.displaySettings.fontSize}px;
      background-color: ${this.displaySettings.theme === 'dark' ? '#2d2d2d' : '#ffffff'};
      color: ${this.displaySettings.theme === 'dark' ? '#ffffff' : '#333333'};
      border-left: 3px solid #007acc;
    `;

    // Style sub-elements
    const timestamp = element.querySelector('.timestamp') as HTMLElement;
    if (timestamp) {
      timestamp.style.cssText = 'color: #666; font-size: 0.9em; margin-right: 8px;';
    }

    const speakerId = element.querySelector('.speaker-id') as HTMLElement;
    if (speakerId) {
      speakerId.style.cssText = 'font-weight: bold; color: #007acc; margin-right: 4px;';
    }

    const confidence = element.querySelector('.confidence') as HTMLElement;
    if (confidence) {
      confidence.style.cssText = 'color: #888; font-size: 0.9em; margin-left: 4px;';
    }
  }

  clearResults(): void {
    this.results = [];
    this.partialResults.clear();
    
    if (this.displayContainer) {
      // Keep the partial container but clear its content
      const finalResults = this.displayContainer.querySelectorAll('.final-result');
      finalResults.forEach(element => element.remove());
    }

    if (this.partialContainer) {
      this.partialContainer.textContent = '';
      this.partialContainer.style.display = 'none';
    }

    // Notify listeners of clear action
    this.notifyUserInteraction({ type: 'clear' });
  }

  async exportResults(format: ExportFormat): Promise<string> {
    switch (format) {
      case ExportFormat.Text:
        return this.exportAsText();
      case ExportFormat.JSON:
        return this.exportAsJSON();
      case ExportFormat.SRT:
        return this.exportAsSRT();
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportAsText(): string {
    return this.results
      .map(result => {
        let line = '';
        if (this.displaySettings.showTimestamps) {
          line += `[${this.formatTimestamp(result.timestamp)}] `;
        }
        if (this.displaySettings.showSpeakerIds && result.speakerId) {
          line += `Speaker ${result.speakerId}: `;
        }
        line += result.text;
        return line;
      })
      .join('\n');
  }

  private exportAsJSON(): string {
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalResults: this.results.length,
      settings: this.displaySettings,
      results: this.results.map(result => ({
        text: result.text,
        confidence: result.confidence,
        timestamp: result.timestamp.toISOString(),
        speakerId: result.speakerId,
        language: result.language,
        offset: result.offset,
        duration: result.duration,
        alternatives: result.alternatives
      }))
    };
    return JSON.stringify(exportData, null, 2);
  }

  private exportAsSRT(): string {
    let srtContent = '';
    
    this.results.forEach((result, index) => {
      const startTime = this.formatSRTTime(result.offset);
      const endTime = this.formatSRTTime(result.offset + result.duration);
      
      srtContent += `${index + 1}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      
      let text = result.text;
      if (result.speakerId) {
        text = `<v Speaker ${result.speakerId}>${text}`;
      }
      
      srtContent += `${text}\n\n`;
    });

    return srtContent.trim();
  }

  private formatSRTTime(offsetMs: number): string {
    const totalSeconds = Math.floor(offsetMs / 1000);
    const milliseconds = offsetMs % 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  highlightSpeaker(speakerId: string): void {
    if (!this.displayContainer || !speakerId) return;

    // Sanitize speakerId for CSS selector - remove all invalid characters
    const sanitizedSpeakerId = speakerId.replace(/[^a-zA-Z0-9-_]/g, '');
    if (!sanitizedSpeakerId) return;

    // Remove previous highlights
    const previousHighlights = this.displayContainer.querySelectorAll('.speaker-highlighted');
    previousHighlights.forEach(element => element.classList.remove('speaker-highlighted'));

    // Add highlight to specified speaker - use sanitized ID for selector
    const speakerElements = this.displayContainer.querySelectorAll(`[data-speaker-id="${sanitizedSpeakerId}"]`);
    speakerElements.forEach(element => {
      element.classList.add('speaker-highlighted');
      (element as HTMLElement).style.backgroundColor = this.displaySettings.theme === 'dark' ? '#404040' : '#fff3cd';
    });

    this.notifyUserInteraction({ type: 'highlight', data: { speakerId } });
  }

  addTimestamp(result: RecognitionResult): void {
    // This method is called automatically in displayFinalResult
    // Can be used to update existing results with timing information
    const existingElement = this.displayContainer?.querySelector(`[data-result-id="${result.timestamp.toISOString()}"]`);
    if (existingElement && this.displaySettings.showTimestamps) {
      const timestampElement = existingElement.querySelector('.timestamp');
      if (timestampElement) {
        timestampElement.textContent = `[${this.formatTimestamp(result.timestamp)}]`;
      }
    }
  }

  getAllResults(): RecognitionResult[] {
    return [...this.results]; // Return copy to prevent external modification
  }

  updateDisplaySettings(settings: Partial<DisplaySettings>): void {
    this.displaySettings = { ...this.displaySettings, ...settings };
    this.applyTheme();
    this.refreshDisplay();
  }

  private applyTheme(): void {
    if (!this.displayContainer) return;

    const isDark = this.displaySettings.theme === 'dark';
    this.displayContainer.style.cssText = `
      background-color: ${isDark ? '#1e1e1e' : '#ffffff'};
      color: ${isDark ? '#ffffff' : '#333333'};
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: ${this.displaySettings.fontSize}px;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid ${isDark ? '#404040' : '#e0e0e0'};
      max-height: 400px;
      overflow-y: auto;
    `;

    if (this.partialContainer) {
      this.partialContainer.style.backgroundColor = isDark ? '#2d2d2d' : '#f0f0f0';
      this.partialContainer.style.color = isDark ? '#cccccc' : '#666666';
    }
  }

  private refreshDisplay(): void {
    // Re-render all results with new settings
    const finalResults = this.displayContainer?.querySelectorAll('.final-result');
    finalResults?.forEach(element => element.remove());

    this.results.forEach(result => this.createFinalResultElement(result));
  }

  onUserInteraction(callback: (event: UserInteractionEvent) => void): void {
    this.userInteractionCallbacks.push(callback);
  }

  private notifyUserInteraction(event: UserInteractionEvent): void {
    this.userInteractionCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in user interaction callback:', error);
      }
    });
  }

  private formatTimestamp(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private scrollToBottom(): void {
    if (this.displayContainer) {
      this.displayContainer.scrollTop = this.displayContainer.scrollHeight;
    }
  }

  // Cleanup method for proper resource management
  dispose(): void {
    this.results = [];
    this.partialResults.clear();
    this.userInteractionCallbacks = [];
    
    if (this.displayContainer) {
      this.displayContainer.innerHTML = '';
    }
  }
}