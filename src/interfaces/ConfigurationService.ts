/**
 * Configuration Service Interface
 * Manages Azure credentials, service endpoints, and application settings
 */

import { AzureCredentials, SpeechServiceConfig, LanguageSettings } from '../types';

export interface ConfigurationService {
  /**
   * Get Azure credentials from secure storage
   * @returns Azure service credentials
   * @throws {Error} If credentials are not found or invalid
   */
  getAzureCredentials(): Promise<AzureCredentials>;

  /**
   * Get complete speech service configuration
   * @returns Speech service configuration
   */
  getSpeechServiceConfig(): Promise<SpeechServiceConfig>;

  /**
   * Update language settings
   * @param settings New language settings to apply
   */
  updateLanguageSettings(settings: LanguageSettings): Promise<void>;

  /**
   * Validate current configuration
   * @returns True if configuration is valid
   */
  validateConfiguration(): Promise<boolean>;

  /**
   * Refresh authentication token
   * @returns New authentication token
   * @throws {Error} If token refresh fails
   */
  refreshAuthToken(): Promise<string>;

  /**
   * Get available languages for speech recognition
   * @returns List of supported language codes
   */
  getAvailableLanguages(): Promise<string[]>;

  /**
   * Get available custom models for the current subscription
   * @returns List of custom model IDs
   */
  getCustomModels(): Promise<string[]>;

  /**
   * Set configuration value
   * @param key Configuration key
   * @param value Configuration value
   */
  setConfigValue(key: string, value: unknown): Promise<void>;

  /**
   * Get configuration value
   * @param key Configuration key
   * @returns Configuration value or undefined
   */
  getConfigValue(key: string): Promise<unknown>;
}