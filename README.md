# Eeko Stream Deck Plugin

Stream Deck plugin for triggering Eeko automations via hardware button press.

## Requirements

- Stream Deck 6.5 or higher
- macOS 12+ or Windows 10+
- Node.js 20 (for development)
- Eeko API key

## Installation

### From Release
1. Download the latest `.streamDeckPlugin` file from releases
2. Double-click to install

### From Source
```bash
npm install
npm run build
```

## Configuration

1. Add the "Trigger Automation" action to your Stream Deck
2. Enter your Eeko API key in the property inspector
3. Select an automation from the dropdown
4. Press the button to trigger

## Development

### Setup
```bash
git clone https://github.com/eeko/streamdeck-plugin.git
cd streamdeck-plugin
npm install
```

### Build
```bash
npm run build     # Production build
npm run watch     # Development mode with auto-rebuild
```

### Project Structure
```
├── src/                    # TypeScript source
│   ├── plugin.ts          # Plugin entry point
│   └── actions/           # Action implementations
├── com.eeko.eeko.sdPlugin/ # Plugin bundle
│   ├── manifest.json      # Plugin manifest
│   ├── bin/              # Compiled JavaScript
│   ├── imgs/             # Plugin images
│   └── ui/               # Property inspector
└── rollup.config.mjs      # Build configuration
```

## API Integration

The plugin communicates with Eeko's API endpoints:
- `GET /api/triggers/automations` - Fetch available automations
- `POST /api/triggers/streamdeck` - Trigger automation

Authentication via `x-eeko-api-key` header.

## Security

- API keys are stored in Stream Deck's global settings
- Client-side validation of API key format
- Sanitized error messages
- No sensitive data in logs

## Testing

The GitHub Actions workflow runs on every push:
- TypeScript compilation check
- Build verification
- Manifest validation
- Artifact generation

## Documentation

For more information about Eeko automations and API usage, visit [docs.eeko.app](https://docs.eeko.app)

## License

Proprietary - Eeko

## Support

For issues or questions, contact support@eeko.app