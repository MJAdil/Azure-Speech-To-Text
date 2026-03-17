# Git Commands for GitHub Upload

## Initialize Repository and Push to GitHub

Run these commands in order:

```bash
# Initialize git repository
git init

# Add all files to staging
git add .

# Create initial commit
git commit -m "Initial commit: Azure Speech-to-Text prototype

- Real-time speech recognition with Azure Speech SDK
- TypeScript implementation with full type safety
- Comprehensive test suite with property-based testing
- Web demo interface with multi-language support
- Clean architecture with service-oriented design
- Environment-based configuration management"

# Add GitHub remote (replace with your repository URL)
git remote add origin https://github.com/MJAdil/azure-speech-to-text-prototype.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Alternative: Using GitHub CLI

If you have GitHub CLI installed:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Initial commit
git commit -m "Initial commit: Azure Speech-to-Text prototype"

# Create repository on GitHub and push
gh repo create azure-speech-to-text-prototype --public --push --source=.
```

## Repository Structure

The repository will contain:

```
azure-speech-to-text-prototype/
├── src/                    # Source code
│   ├── interfaces/         # TypeScript interfaces
│   ├── services/          # Core services
│   ├── types/             # Type definitions
│   ├── utils/             # Utilities
│   ├── examples/          # Usage examples
│   └── __tests__/         # Test files
├── examples/              # Additional examples
├── demo.html             # Web demo interface
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── jest.config.js        # Test configuration
├── .eslintrc.js          # Linting rules
├── .gitignore            # Git ignore rules
├── .env.example          # Environment template
├── LICENSE               # MIT license
├── README.md             # Main documentation
└── setup.md              # Setup instructions
```

## After Upload

1. **Update Repository Settings**
   - Add description: "TypeScript-based Azure Speech-to-Text prototype with real-time recognition"
   - Add topics: `azure`, `speech-recognition`, `typescript`, `real-time`, `speech-to-text`
   - Enable Issues and Discussions if desired

2. **Create Release**
   - Go to Releases section
   - Create new release with tag `v1.0.0`
   - Add release notes describing features

3. **Update README**
   - Verify all links work correctly
   - Add badges if desired (build status, license, etc.)

## Security Notes

- All sensitive information has been removed
- API keys are now environment-based
- Test files use placeholder values
- .env.example provides template for configuration