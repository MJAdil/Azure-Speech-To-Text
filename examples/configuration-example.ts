/**
 * Example usage of the ConfigurationService
 */

import { AzureConfigurationService } from '../src/services/ConfigurationService';
import { LanguageSettings, ProfanityOption } from '../src/types';

async function demonstrateConfigurationService() {
  console.log('=== Azure Configuration Service Example ===\n');

  try {
    // Create configuration service instance
    const configService = new AzureConfigurationService();

    // Get Azure credentials
    console.log('1. Getting Azure credentials...');
    const credentials = await configService.getAzureCredentials();
    console.log('✓ Credentials loaded successfully');
    console.log(`   Region: ${credentials.serviceRegion}`);
    console.log(`   Endpoint: ${credentials.endpoint || 'Default'}`);
    console.log(`   Key: ${credentials.subscriptionKey.substring(0, 8)}...`);

    // Get complete speech service configuration
    console.log('\n2. Getting speech service configuration...');
    const speechConfig = await configService.getSpeechServiceConfig();
    console.log('✓ Speech configuration loaded');
    console.log(`   Language: ${speechConfig.language}`);
    console.log(`   Output Format: ${speechConfig.outputFormat}`);
    console.log(`   Profanity Option: ${speechConfig.profanityOption}`);
    console.log(`   Dictation Enabled: ${speechConfig.enableDictation}`);

    // Update language settings
    console.log('\n3. Updating language settings...');
    const newLanguageSettings: LanguageSettings = {
      primaryLanguage: 'es-ES',
      enableDictation: false,
      profanityOption: ProfanityOption.Removed
    };
    await configService.updateLanguageSettings(newLanguageSettings);
    console.log('✓ Language settings updated to Spanish');

    // Validate configuration
    console.log('\n4. Validating configuration...');
    const isValid = await configService.validateConfiguration();
    console.log(`✓ Configuration is ${isValid ? 'valid' : 'invalid'}`);

    // Get available languages
    console.log('\n5. Getting available languages...');
    const languages = await configService.getAvailableLanguages();
    console.log(`✓ Found ${languages.length} supported languages:`);
    console.log(`   ${languages.slice(0, 5).join(', ')}...`);

    // Demonstrate configuration value management
    console.log('\n6. Managing configuration values...');
    await configService.setConfigValue('customSetting', 'example-value');
    const customValue = await configService.getConfigValue('customSetting');
    console.log(`✓ Custom setting: ${customValue}`);

    // Refresh authentication token
    console.log('\n7. Refreshing authentication token...');
    const token = await configService.refreshAuthToken();
    console.log('✓ Authentication token refreshed');
    console.log(`   Token valid: ${configService.isTokenValid()}`);

    console.log('\n=== Configuration Service Demo Complete ===');

  } catch (error) {
    console.error('❌ Error during configuration service demo:', error);
    
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
    }
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  demonstrateConfigurationService().catch(console.error);
}

export { demonstrateConfigurationService };