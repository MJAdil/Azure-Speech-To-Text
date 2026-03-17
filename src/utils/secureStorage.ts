/**
 * Secure Storage Utilities
 * Handles secure storage and retrieval of sensitive configuration data
 */

import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import { SpeechSDKException } from '../types';

export interface SecureStorageOptions {
  useKeyVault?: boolean;
  keyVaultUrl?: string;
  fallbackToEnv?: boolean;
}

export class SecureStorage {
  private keyVaultClient: SecretClient | null = null;
  private options: SecureStorageOptions;

  constructor(options: SecureStorageOptions = {}) {
    this.options = {
      useKeyVault: false,
      fallbackToEnv: true,
      ...options
    };

    if (this.options.useKeyVault && this.options.keyVaultUrl) {
      try {
        const credential = new DefaultAzureCredential();
        this.keyVaultClient = new SecretClient(this.options.keyVaultUrl, credential);
      } catch (error) {
        console.warn('Failed to initialize Azure Key Vault client:', error);
        if (!this.options.fallbackToEnv) {
          throw new SpeechSDKException(
            'Key Vault initialization failed and fallback is disabled',
            'KEYVAULT_INIT_FAILED'
          );
        }
      }
    }
  }

  /**
   * Get a secret value from secure storage
   * @param key The secret key to retrieve
   * @param envKey Optional environment variable key (defaults to key)
   * @returns The secret value or null if not found
   */
  async getSecret(key: string, envKey?: string): Promise<string | null> {
    // Try Key Vault first if configured
    if (this.keyVaultClient) {
      try {
        const secret = await this.keyVaultClient.getSecret(key);
        if (secret.value) {
          return secret.value;
        }
      } catch (error) {
        console.warn(`Failed to retrieve secret '${key}' from Key Vault:`, error);
        if (!this.options.fallbackToEnv) {
          throw new SpeechSDKException(
            `Failed to retrieve secret '${key}' from Key Vault`,
            'KEYVAULT_ACCESS_FAILED'
          );
        }
      }
    }

    // Fallback to environment variables
    if (this.options.fallbackToEnv) {
      const environmentKey = envKey || key;
      return process.env[environmentKey] || null;
    }

    return null;
  }

  /**
   * Set a secret value in secure storage
   * @param key The secret key
   * @param value The secret value
   */
  async setSecret(key: string, value: string): Promise<void> {
    if (this.keyVaultClient) {
      try {
        await this.keyVaultClient.setSecret(key, value);
        return;
      } catch (error) {
        console.warn(`Failed to store secret '${key}' in Key Vault:`, error);
        if (!this.options.fallbackToEnv) {
          throw new SpeechSDKException(
            `Failed to store secret '${key}' in Key Vault`,
            'KEYVAULT_STORE_FAILED'
          );
        }
      }
    }

    // Note: Cannot set environment variables at runtime in a meaningful way
    // This would typically be handled by deployment/configuration management
    console.warn(`Cannot store secret '${key}' - Key Vault not available and environment variables are read-only`);
  }

  /**
   * Check if a secret exists in secure storage
   * @param key The secret key to check
   * @param envKey Optional environment variable key
   * @returns True if the secret exists
   */
  async hasSecret(key: string, envKey?: string): Promise<boolean> {
    const value = await this.getSecret(key, envKey);
    return value !== null && value.trim().length > 0;
  }

  /**
   * Delete a secret from secure storage
   * @param key The secret key to delete
   */
  async deleteSecret(key: string): Promise<void> {
    if (this.keyVaultClient) {
      try {
        await this.keyVaultClient.beginDeleteSecret(key);
        return;
      } catch (error) {
        console.warn(`Failed to delete secret '${key}' from Key Vault:`, error);
        if (!this.options.fallbackToEnv) {
          throw new SpeechSDKException(
            `Failed to delete secret '${key}' from Key Vault`,
            'KEYVAULT_DELETE_FAILED'
          );
        }
      }
    }

    // Note: Cannot delete environment variables at runtime
    console.warn(`Cannot delete secret '${key}' - Key Vault not available and environment variables cannot be deleted`);
  }

  /**
   * Get multiple secrets at once
   * @param keys Array of secret keys to retrieve
   * @returns Map of key-value pairs for found secrets
   */
  async getSecrets(keys: string[]): Promise<Map<string, string>> {
    const secrets = new Map<string, string>();
    
    for (const key of keys) {
      const value = await this.getSecret(key);
      if (value !== null) {
        secrets.set(key, value);
      }
    }
    
    return secrets;
  }

  /**
   * Validate that all required secrets are available
   * @param requiredKeys Array of required secret keys
   * @returns True if all required secrets are available
   */
  async validateRequiredSecrets(requiredKeys: string[]): Promise<boolean> {
    for (const key of requiredKeys) {
      if (!(await this.hasSecret(key))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get storage type being used
   * @returns String indicating the storage type
   */
  getStorageType(): string {
    if (this.keyVaultClient) {
      return this.options.fallbackToEnv ? 'KeyVault with Environment fallback' : 'KeyVault only';
    }
    return 'Environment variables only';
  }
}

/**
 * Default secure storage instance
 */
const keyVaultUrl = process.env.AZURE_KEYVAULT_URL;
export const defaultSecureStorage = new SecureStorage({
  useKeyVault: !!keyVaultUrl,
  ...(keyVaultUrl && { keyVaultUrl }),
  fallbackToEnv: true
});