# Environment Variables

## Backend

- NODE_ENV (required: development, test or production; production sets Secure cookies)

- DATABASE_URL
- JWT_ACCESS_SECRET (refresh tokens are random values stored hashed; no secret needed)
- SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD (only for `npm run db:seed`)
- STORAGE_URL
- STORAGE_KEY
- REDIS_URL
- SMTP_HOST
- SMTP_USER
- SMTP_PASS
- CORS_ORIGIN

## Frontend

- VITE_API_URL
- VITE_SOCKET_URL

## Mobile

- EXPO_PUBLIC_API_URL
- EXPO_PUBLIC_SOCKET_URL

Never commit secrets.
