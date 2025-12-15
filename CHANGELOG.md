# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v1.1.3

[compare changes](https://github.com/andychukse/nuxt-auth/compare/v1.1.2...v1.1.3)

## v1.1.2

[compare changes](https://github.com/andychukse/nuxt-auth/compare/v1.1.1...v1.1.2)

## v1.1.1
### Added
- Upgrade to support nuxt 4

[compare changes](https://github.com/andychukse/nuxt-auth/compare/v1.1.0...v1.1.1)

## [1.0.3] - 2025-07-07
### Added
- Added Support for `httpOnly: true` cookies
- Added Tracking refresh attempts to avoid infinite loops
- Server-side Token Refresh 

## [1.0.1] - 2025-07-02

### Added
- Initial release of @andychukse/nuxt-auth module
- JWT authentication support with automatic token refresh
- Social login support for Google and Apple
- Secure cookie-based token storage
- Route protection middleware (`auth` and `guest`)
- User session management
- TypeScript support with full type definitions
- Server-side rendering (SSR) compatibility
- Configurable API endpoints and token management
- Utility functions for error handling
- Comprehensive documentation and playground for testing

### Features
- `useAuth()` composable for authentication state management
- Automatic token refresh on API calls
- Built-in middleware for route protection
- Social authentication callback handlers
- Flexible configuration options
- Security best practices implementation
