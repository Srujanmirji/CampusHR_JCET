# iOS API integration

The [backend endpoint reference](../../backend/API_ENDPOINTS.md) is authoritative. Base path: `/api/v1`. Reuse its DTOs, validation and permission rules; do not invent mobile-only response envelopes or assume all endpoints return `{ data }`.

## Session dependency: resolve before feature integration

Current login returns `{ accessToken, expiresIn, user }` and sets an HttpOnly refresh cookie. Refresh, logout and password change depend on that cookie. The current mobile auth provider keeps its access token in memory and does not implement persistent session restoration.

IOS-002 must document and test one native session contract with the backend owner: either a verified native cookie lifecycle or a deliberately designed native token transport with secure storage, rotation and revocation. Do not assume a Bearer header alone refreshes or revokes the server session. Do not expose browser refresh tokens to JavaScript or relax browser origin protections for mobile convenience.

IOS-003 then implements the agreed contract, secure credential storage, a shared request client and session restoration. Use a single refresh operation for concurrent expired requests; replay at most once after successful refresh, handle refresh conflicts explicitly and stop on revocation. Never turn a failed authentication request into a demo session. Preserve web login/refresh/logout behavior in backend regression tests.

## Integration map

| Flow              | Existing contract                                                                                                                                                                                    | Mobile work                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Session           | `POST /auth/login`, `/auth/refresh`, `/auth/logout`; `GET /auth/me`; `POST /auth/password`                                                                                                           | Native contract, secure persistence and expiry handling                                             |
| Timetable         | `GET /timetable/periods`, `/timetable/entries`                                                                                                                                                       | Own faculty scope, period/date rendering, failure states; day filtering is client-side              |
| Attendance        | `GET /attendance/today`, `/attendance`; `POST /attendance/punch`, `/attendance/corrections`                                                                                                          | Live screens, history and permitted writes; use `source: MOBILE` for punches                        |
| Leave             | Leave types, balances, requests and decision/cancel routes in the endpoint reference                                                                                                                 | Audit current helpers against DTOs and roles; remove live-session demo fallbacks                    |
| Coverage          | `GET /substitution/mine`, `/substitution/leave`, `/substitution/leave/:leaveId`, `/substitution/leave/:leaveId/candidates`; `POST /substitution/assignments`; `DELETE /substitution/assignments/:id` | Replace local real-user assignment logic with validated server results and refresh affected queries |
| Notifications     | `GET /notifications`, `/notifications/unread-count`; `PATCH /notifications/:id/read`, `/notifications/read-all`                                                                                      | Pagination, unread badge and read actions                                                           |
| Realtime          | Socket.IO path `/api/v1/socket.io`, `auth: { token }`, event `notifications:changed`                                                                                                                 | Reauthenticate after token renewal, disconnect on logout, refetch after reconnect/foreground        |
| Profile/documents | Employee and Documents sections of the endpoint reference                                                                                                                                            | Own employee scope, native file transport and authenticated viewing                                 |

Resolve links such as `/leave?tab=mine&request=...` into native destinations using an allowlist. Do not navigate blindly to arbitrary notification URLs; recheck authentication and permissions when opening protected content.

## Missing push infrastructure

Device-token registration/removal and the remote push sender are not implemented contracts in the current notification router. IOS-010 depends on the backend owner documenting and implementing them, including token ownership, account switching, delivery failures and invalid-token cleanup. Do not invent a URL in the app and mark push complete.

Push payloads should contain only the minimum information needed to open the protected screen. Fetch sensitive details after authentication. Verify signed-out, foreground, background and cold-start behavior on an iPhone.

## Failure and data rules

- Validate API payloads; retain server field errors and distinguish authentication, permission, validation, conflict and connectivity failures.
- A timeout after a write is ambiguous: refetch the relevant record before offering another submission. Do not silently create duplicate leave requests, punches or assignments.
- Real API failures stay failures; never substitute sample classes, balances, attendance or a fabricated success.
- Clear employee-specific cached data, sockets and device associations on logout/account switch. Test that account B never sees account A's cached records.
- New backend endpoints, migrations and mobile contract changes belong in a reviewed API PR, with permission and audit tests.
