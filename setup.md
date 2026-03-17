# Setup Guide

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/MJAdil/azure-speech-to-text-prototype.git
   cd azure-speech-to-text-prototype
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Azure credentials**
   ```bash
   cp .env.example .env
   # Edit .env file with your Azure Speech Service credentials
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Run tests**
   ```bash
   npm test
   ```

6. **Open the demo**
   - Open `demo.html` in your web browser
   - Update the Azure credentials in the JavaScript section
   - Allow microphone access when prompted
   - Click "Start Recognition" to begin

## Azure Speech Service Setup

1. **Create Azure Account**
   - Go to [Azure Portal](https://portal.azure.com)
   - Create a free account if you don't have one

2. **Create Speech Service Resource**
   - Search for "Speech Services" in the Azure portal
   - Click "Create"
   - Choose your subscription and resource group
   - Select a region (e.g., East US, West Europe)
   - Choose pricing tier (F0 for free tier)

3. **Get Credentials**
   - Go to your Speech Service resource
   - Navigate to "Keys and Endpoint"
   - Copy Key 1 and Region
   - Update your `.env` file:
     ```
     AZURE_SPEECH_KEY=your_key_here
     AZURE_SPEECH_REGION=your_region_here
     ```

## Development

### Project Structure
```
src/
├── interfaces/          # TypeScript interfaces
├── services/           # Core service implementations
├── types/             # Type definitions
├── utils/             # Utility functions
├── examples/          # Usage examples
└── __tests__/         # Test files
```

### Available Scripts
- `npm run build` - Build TypeScript to JavaScript
- `npm run dev` - Watch mode for development
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Testing
The project includes comprehensive testing:
- Unit tests for all services
- Property-based tests using fast-check
- Integration tests for end-to-end workflows

### Browser Demo
The `demo.html` file provides a complete web interface for testing speech recognition:
- Real-time speech recognition
- Multiple language support
- Confidence scoring
- Session statistics
- Export functionality

## Troubleshooting

### Common Issues

**Build Errors**
- Ensure Node.js 16+ is installed
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

**Azure Authentication Errors**
- Verify your subscription key and region in `.env`
- Check that your Azure Speech Service is active
- Ensure you haven't exceeded your quota

**Microphone Access Issues**
- Use HTTPS in production (required for microphone access)
- Check browser permissions
- Ensure microphone isn't being used by other applications

**Test Failures**
- Run `npm run build` before running tests
- Check that all dependencies are installed
- Verify TypeScript compilation is successful

### Getting Help
- Check the [Azure Speech Service documentation](https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/)
- Review the test files for usage examples
- Open an issue on GitHub for bugs or questions