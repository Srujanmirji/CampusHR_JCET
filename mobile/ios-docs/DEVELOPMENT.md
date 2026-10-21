# iOS development

## Prerequisites

Use the repository's Node version (`.nvmrc`) and npm version from the root package manifest. A Mac with Xcode, its command-line tools and an installed iOS simulator is needed for simulator/native development. Confirm the installed Expo SDK's current Xcode/iOS compatibility when selecting the test environment; do not upgrade the SDK as a setup shortcut.

An iPhone running Expo Go can exercise supported development features. Features needing custom native configuration or remote push must be tested in the appropriate signed development build. Signing and distribution access are tracked in [IOS-012 and IOS-014](../../tasks/IOS_TASKS.md).

## Local setup

Run from the repository root:

```sh
nvm use
npm ci
cp mobile/.env.example mobile/.env
npm run dev:api
```

The API also needs its own environment and a prepared database: follow [SETUP.md](../../SETUP.md). Check that the API points at the intended local/test database before applying migrations or creating test accounts. Do not copy production credentials into examples or mobile configuration.

In a second terminal, use the existing iOS script:

```sh
npm run ios --workspace @campushr/mobile
```

This starts Expo and requests the iOS simulator. For a physical phone, start `npm run dev:mobile` and open the development session in the supported client. The API must be reachable from that phone; use the Mac's LAN address, not the phone's localhost.

Example public development values in `mobile/.env`:

```dotenv
EXPO_PUBLIC_API_URL=http://<mac-lan-ip>:4000/api/v1
EXPO_PUBLIC_SOCKET_URL=http://<mac-lan-ip>:4000
```

The socket value is an origin; Socket.IO uses `/api/v1/socket.io`. Every `EXPO_PUBLIC_*` value is included in the client bundle: use URLs only, never secrets. `mobile/lib/api-config.ts` can resolve a localhost API address from the Expo development host; verify the resulting host on each device. The socket URL must also be correct.

## Development loop

1. Pull current main and create one task branch, e.g. `codex/ios-session`.
2. Choose a local/test Faculty, Staff or HOD account. Keep test records separate from real employee records.
3. Start the API and Expo; exercise the target flow online, offline and after session expiry.
4. Run [the checks](TESTING.md), capture evidence without personal data, and open a PR with task IDs and remaining limits.

## Troubleshooting

| Symptom                                             | Check                                                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Phone cannot reach the API                          | Same network, LAN host/port, API bind address and firewall; test API reachability before changing application code |
| Native networking differs from browser              | Device URL, TLS and development networking policy; do not disable release transport protections to fix local HTTP  |
| Typed routes appear missing                         | Start Expo so its ignored `.expo/types` declarations regenerate, then rerun typecheck; do not cast routes to `any` |
| Login works until restart                           | IOS-002–003 are incomplete; an in-memory access token is not session persistence                                   |
| Notification preview works but remote push does not | Local scheduling is not server delivery; complete IOS-010 and use a suitable native build                          |

Generated `.expo/`, exports, local environment files, signing keys and generated native project files must remain outside committed source unless a reviewed build-strategy change explicitly needs them.
