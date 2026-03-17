/**
 * Configuration Service Implementation
 * Manages Azure credentials, service endpoints, and application settings
 */

import { ConfigurationService } from '../interfaces/ConfigurationService';
import {
  AzureCredentials,
  SpeechServiceConfig,
  LanguageSettings,
  ProfanityOption,
  OutputFormat,
  SpeechSDKException
} from '../types';
import { validateAzureCredentials, validateLanguageCode, sanitizeConfigValue } from '../utils/validation';
import { SecureStorage } from '../utils/secureStorage';

export class AzureConfigurationService implements ConfigurationService {
  private credentials: AzureCredentials | null = null;
  private config: Map<string, unknown> = new Map();
  private authToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private secureStorage: SecureStorage;
  private useFallbackCredentials: boolean;

  constructor(secureStorage?: SecureStorage, useFallbackCredentials: boolean = true) {
    const keyVaultUrl = process.env.AZURE_KEYVAULT_URL;
    this.secureStorage = secureStorage || new SecureStorage({
      useKeyVault: !!keyVaultUrl,
      ...(keyVaultUrl && { keyVaultUrl }),
      fallbackToEnv: true
    });
    this.useFallbackCredentials = useFallbackCredentials;
    this.initializeDefaults();
  }

  /**
   * Initialize default configuration values
   */
  private initializeDefaults(): void {
    this.config.set('language', 'en-US');
    this.config.set('outputFormat', OutputFormat.Detailed);
    this.config.set('profanityOption', ProfanityOption.Masked);
    this.config.set('enableDictation', true);
    this.config.set('customModelId', undefined);
  }

  /**
   * Get Azure credentials from secure storage (environment variables or Azure Key Vault)
   */
  async getAzureCredentials(): Promise<AzureCredentials> {
    if (this.credentials) {
      return this.credentials;
    }

    // Try to load from secure storage (Key Vault or environment variables)
    const subscriptionKey = await this.secureStorage.getSecret('AZURE_SPEECH_KEY', 'AZURE_SPEECH_KEY') ||
                           await this.secureStorage.getSecret('SPEECH_KEY', 'SPEECH_KEY');
    
    const serviceRegion = await this.secureStorage.getSecret('AZURE_SPEECH_REGION', 'AZURE_SPEECH_REGION') ||
                         await this.secureStorage.getSecret('SPEECH_REGION', 'SPEECH_REGION');
    
    const endpoint = await this.secureStorage.getSecret('AZURE_SPEECH_ENDPOINT', 'AZURE_SPEECH_ENDPOINT') ||
                    await this.secureStorage.getSecret('SPEECH_ENDPOINT', 'SPEECH_ENDPOINT');

    // Use fallback values only if no secure storage values found and fallbacks are enabled
    const finalSubscriptionKey = subscriptionKey || (this.useFallbackCredentials ? process.env.AZURE_SPEECH_KEY || null : null);
    const finalServiceRegion = serviceRegion || (this.useFallbackCredentials ? process.env.AZURE_SPEECH_REGION || 'eastus' : null);
    const finalEndpoint = endpoint || (this.useFallbackCredentials ? process.env.AZURE_SPEECH_ENDPOINT || `https://${finalServiceRegion}.api.cognitive.microsoft.com/` : null);

    if (!finalSubscriptionKey || !finalServiceRegion) {
      throw new SpeechSDKException(
        'Azure credentials not found. Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in secure storage or environment variables.',
        'MISSING_CREDENTIALS'
      );
    }

    const credentials: AzureCredentials = {
      subscriptionKey: sanitizeConfigValue(finalSubscriptionKey) as string,
      serviceRegion: sanitizeConfigValue(finalServiceRegion) as string,
      ...(finalEndpoint && { endpoint: sanitizeConfigValue(finalEndpoint) as string })
    };

    // Validate credentials format
    if (!validateAzureCredentials(credentials)) {
      throw new SpeechSDKException(
        'Invalid Azure credentials format. Please check your subscription key and region.',
        'INVALID_CREDENTIALS'
      );
    }

    this.credentials = credentials;
    return credentials;
  }

  /**
   * Get complete speech service configuration
   */
  async getSpeechServiceConfig(): Promise<SpeechServiceConfig> {
    const credentials = await this.getAzureCredentials();
    
    const customModelId = this.config.get('customModelId') as string | undefined;
    
    const config: SpeechServiceConfig = {
      subscriptionKey: credentials.subscriptionKey,
      serviceRegion: credentials.serviceRegion,
      language: this.config.get('language') as string,
      profanityOption: this.config.get('profanityOption') as ProfanityOption,
      outputFormat: this.config.get('outputFormat') as OutputFormat,
      enableDictation: this.config.get('enableDictation') as boolean,
      ...(credentials.endpoint && { endpoint: credentials.endpoint }),
      ...(customModelId && { customModelId })
    };

    return config;
  }

  /**
   * Update language settings
   */
  async updateLanguageSettings(settings: LanguageSettings): Promise<void> {
    // Validate language code
    if (!validateLanguageCode(settings.primaryLanguage)) {
      throw new SpeechSDKException(
        `Invalid language code: ${settings.primaryLanguage}. Must be a valid BCP-47 language code.`,
        'INVALID_LANGUAGE'
      );
    }

    // Sanitize and update settings
    this.config.set('language', sanitizeConfigValue(settings.primaryLanguage));
    
    if (settings.customModelId !== undefined) {
      this.config.set('customModelId', sanitizeConfigValue(settings.customModelId));
    }
    
    this.config.set('enableDictation', Boolean(settings.enableDictation));
    this.config.set('profanityOption', settings.profanityOption);
  }

  /**
   * Validate current configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      // Validate credentials
      const credentials = await this.getAzureCredentials();
      if (!validateAzureCredentials(credentials)) {
        return false;
      }

      // Validate language setting
      const language = this.config.get('language') as string;
      if (!validateLanguageCode(language)) {
        return false;
      }

      // Validate required configuration values
      const requiredKeys = ['outputFormat', 'profanityOption', 'enableDictation'];
      for (const key of requiredKeys) {
        if (!this.config.has(key)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshAuthToken(): Promise<string> {
    const credentials = await this.getAzureCredentials();
    
    try {
      // For Azure Speech Services, we typically use the subscription key directly
      // In a production environment, you might want to exchange this for a JWT token
      const response = await fetch(`${credentials.endpoint}sts/v1.0/issueToken`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': credentials.subscriptionKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        throw new SpeechSDKException(
          `Failed to refresh auth token: ${response.status} ${response.statusText}`,
          'TOKEN_REFRESH_FAILED'
        );
      }

      const token = await response.text();
      this.authToken = token;
      
      // Tokens typically expire after 10 minutes
      this.tokenExpiry = new Date(Date.now() + 10 * 60 * 1000);
      
      return token;
    } catch (error) {
      throw new SpeechSDKException(
        `Authentication token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TOKEN_REFRESH_FAILED'
      );
    }
  }

  /**
   * Get available languages for speech recognition
   */
  async getAvailableLanguages(): Promise<string[]> {
    // Common Azure Speech Service supported languages
    // In a production environment, you might fetch this from the Azure API
    return [
      'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN',
      'es-ES', 'es-MX', 'fr-FR', 'fr-CA', 'de-DE',
      'it-IT', 'pt-BR', 'pt-PT', 'ru-RU', 'ja-JP',
      'ko-KR', 'zh-CN', 'zh-HK', 'zh-TW', 'ar-SA',
      'hi-IN', 'th-TH', 'vi-VN', 'id-ID', 'ms-MY'
    ];
  }

  /**
   * Get available custom models for the current subscription
   */
  async getCustomModels(): Promise<string[]> {
    const credentials = await this.getAzureCredentials();
    
    try {
      const response = await fetch(
        `${credentials.endpoint}speechtotext/v3.0/models`,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': credentials.subscriptionKey
          }
        }
      );

      if (!response.ok) {
        // Return empty array if we can't fetch custom models
        return [];
      }

      const data = await response.json();
      return data.values?.map((model: any) => model.self) || [];
    } catch (error) {
      // Return empty array on error - custom models are optional
      return [];
    }
  }

  /**
   * Set configuration value with validation and sanitization
   */
  async setConfigValue(key: string, value: unknown): Promise<void> {
    if (!key || typeof key !== 'string') {
      throw new SpeechSDKException('Configuration key must be a non-empty string', 'INVALID_KEY');
    }

    // Sanitize the value
    const sanitizedValue = sanitizeConfigValue(value);
    
    // Validate specific configuration keys
    switch (key) {
      case 'language':
        if (typeof sanitizedValue !== 'string' || !validateLanguageCode(sanitizedValue)) {
          throw new SpeechSDKException(`Invalid language code: ${sanitizedValue}`, 'INVALID_LANGUAGE');
        }
        break;
      
      case 'outputFormat':
        if (!Object.values(OutputFormat).includes(sanitizedValue as OutputFormat)) {
          throw new SpeechSDKException(`Invalid output format: ${sanitizedValue}`, 'INVALID_FORMAT');
        }
        break;
      
      case 'profanityOption':
        if (!Object.values(ProfanityOption).includes(sanitizedValue as ProfanityOption)) {
          throw new SpeechSDKException(`Invalid profanity option: ${sanitizedValue}`, 'INVALID_PROFANITY_OPTION');
        }
        break;
    }

    this.config.set(key, sanitizedValue);
  }

  /**
   * Get configuration value
   */
  async getConfigValue(key: string): Promise<unknown> {
    if (!key || typeof key !== 'string') {
      throw new SpeechSDKException('Configuration key must be a non-empty string', 'INVALID_KEY');
    }

    return this.config.get(key);
  }

  /**
   * Check if authentication token is valid and not expired
   */
  isTokenValid(): boolean {
    return this.authToken !== null && 
           this.tokenExpiry !== null && 
           this.tokenExpiry > new Date();
  }

  /**
   * Get current authentication token (refresh if needed)
   */
  async getValidToken(): Promise<string> {
    if (!this.isTokenValid()) {
      return await this.refreshAuthToken();
    }
    return this.authToken!;
  }

  /**
   * Clear all cached credentials and tokens (for security)
   */
  clearCache(): void {
    this.credentials = null;
    this.authToken = null;
    this.tokenExpiry = null;
  }
}