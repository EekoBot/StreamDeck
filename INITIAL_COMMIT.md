Initial implementation of Eeko Stream Deck plugin v1.0.0

Implements Stream Deck hardware integration for Eeko automation platform,
enabling direct automation triggering via physical button press.

Technical implementation:
- TypeScript/Node.js 20 with Stream Deck SDK v2
- Rollup bundler with production optimizations (terser minification)
- Single-action architecture with singleton pattern
- WebSocket-based property inspector communication
- REST API integration with Eeko backend services

Security measures:
- API key validation regex: /^[a-zA-Z0-9_-]+$/
- Client and server-side input sanitization
- Error message sanitization to prevent data leakage
- Global settings storage for credential management
- LogLevel.ERROR for production builds

Features:
- Real-time automation list synchronization
- Visual button state management (default/pressed)
- Timeout cleanup with Set-based tracking
- Property inspector with live validation
- Focus-triggered automation refresh

Build configuration:
- GitHub Actions CI/CD pipeline
- Multi-version Node.js testing matrix (18.x, 20.x)
- Automated artifact generation
- Draft release creation on main branch

Project structure follows Stream Deck plugin specification with
manifest.json v2 format, compiled JavaScript in bin/, and HTML-based
property inspector.

Co-Authored-By: Claude <noreply@anthropic.com>