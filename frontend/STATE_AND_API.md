# Frontend State & API Strategy

## Server State

Use TanStack Query.

## Local UI State

Use component state or lightweight store.

## Authentication

Store access token securely according to deployment strategy.
Prefer HttpOnly refresh cookie where possible.

## API Client

Centralize:

- base URL
- auth headers
- refresh handling
- error normalization

## Error UX

- Inline validation for forms
- Toast for transient actions
- Error state for failed pages
- Retry for network-safe reads
