# Azure Speech-to-Text Prototype

A TypeScript-based real-time speech recognition system using Azure Cognitive Services Speech SDK.

## Features

- Real-time speech recognition from microphone input
- Multi-language support (10+ languages)
- Confidence scoring and detailed results
- Web-based demo interface
- Comprehensive error handling
- TypeScript implementation with full type safety
- Property-based testing with fast-check
- Audio level monitoring
- Export functionality (Text, JSON, SRT)

## Prerequisites

- Node.js 16+ and npm
- Azure Speech Service subscription
- Modern web browser with microphone support
- TypeScript 5.0+

## Installation

```bash
git clone https://github.com/MJAdil/azure-speech-to-text-prototype.git
cd azure-speech-to-text-prototype
npm install
```

## Configuration

1. Create an Azure Speech Service resource in the Azure portal
2. Get your subscription key and region
3. Update the configuration in `src/services/ConfigurationService.ts`
4. Or set environment variables:
   - `AZURE_SPEECH_KEY`: Your subscription key
   - `AZURE_SPEECH_REGION`: Your service region

## Build

```bash
npm run build
```

## Testing

Run the test suite:
```bash
npm test
```

Run with coverage:
```bash
npm run test:coverage
```

## Usage

### Web Demo

Open `demo.html` in your web browser for a complete speech recognition interface.

### Programmatic Usage

```typescript
import { SpeechRecognitionService } from './dist/services/SpeechRecognitionService';
import { AzureConfigurationService } from './dist/services/ConfigurationService';
import { AudioCaptureServiceImpl } from './dist/services/AudioCaptureService';

const configService = new AzureConfigurationService();
const audioService = new AudioCaptureServiceImpl();

const speechService = new SpeechRecognitionService(
  configService,
  audioService,
  {
    onFinalResult: (result) => {
      console.log('Recognized:', result.text);
    },
    onError: (error) => {
      console.error('Error:', error.message);
    }
  }
);

await speechService.initialize();
await speechService.startRecognition();
```
## Architecture

### Core Services

- **ConfigurationService**: Manages Azure credentials and service configuration
- **AudioCaptureService**: Handles microphone input and audio streaming
- **SpeechRecognitionManager**: Azure Speech SDK integration and session management
- **SpeechRecognitionService**: High-level service orchestrating recognition workflow
- **ResultsDisplayManager**: Real-time result display and formatting

### Key Interfaces

- **SpeechServiceConfig**: Configuration for Azure Speech Service
- **RecognitionResult**: Structured recognition results with confidence scores
- **AudioCaptureConfig**: Audio input configuration and device selection

## API Reference

### SpeechRecognitionService

Main service class for speech recognition operations.

#### Methods

- `initialize()`: Initialize the service with Azure credentials
- `startRecognition()`: Begin continuous speech recognition
- `stopRecognition()`: Stop recognition and cleanup resources
- `changeLanguage(language: string)`: Switch recognition language
- `getAvailableAudioDevices()`: Get list of available microphones

#### Events

- `onPartialResult`: Fired during speech recognition with partial text
- `onFinalResult`: Fired when recognition is complete with final result
- `onError`: Fired when errors occur
- `onSessionStarted/Stopped`: Session lifecycle events
- `onAudioLevelChanged`: Audio input level monitoring

### Configuration

The system supports multiple configuration methods:

1. **Environment Variables**:
   - `AZURE_SPEECH_KEY`
   - `AZURE_SPEECH_REGION`
   - `AZURE_SPEECH_ENDPOINT`

2. **Secure Storage**: Azure Key Vault integration for production deployments

3. **Direct Configuration**: Programmatic configuration via service constructors

## Supported Languages

- English (US, UK)
- French
- Spanish
- German
- Italian
- Portuguese (Brazil)
- Japanese
- Korean
- Chinese (Mandarin)
- And more via Azure Speech Service

## Performance

- Real-time recognition with <200ms latency
- Optimized for continuous speech input
- Automatic resource cleanup and memory management
- Graceful error recovery and reconnection

## Testing

The project includes comprehensive testing:

- **Unit Tests**: Individual service testing with mocks
- **Property-Based Tests**: Automated testing with fast-check
- **Integration Tests**: End-to-end workflow validation

Test coverage includes:
- Configuration validation
- Audio capture functionality
- Speech recognition accuracy
- Error handling scenarios
- Performance requirements

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 14+
- Edge 79+

Requires HTTPS for microphone access in production.

## Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Troubleshooting

### Common Issues

**Microphone Access Denied**
- Ensure HTTPS is used in production
- Check browser permissions
- Verify microphone is not used by other applications

**Azure Authentication Errors**
- Verify subscription key and region
- Check network connectivity
- Ensure Azure Speech Service is active

**Build Errors**
- Ensure Node.js 16+ is installed
- Clear node_modules and reinstall dependencies
- Check TypeScript version compatibility

### Debug Mode

Enable debug logging:
```typescript
const service = new SpeechRecognitionService(config, audio, handlers, {
  debug: true
});
```

## Support

For issues and questions:
- Check the troubleshooting section
- Review Azure Speech Service documentation
- Open an issue on GitHub

## Acknowledgments

Built with:
- Azure Cognitive Services Speech SDK
- TypeScript
- Jest for testing
- fast-check for property-based testing