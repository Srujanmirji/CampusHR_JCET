# iOS API integration

The [backend endpoint reference](../../backend/API_ENDPOINTS.md) is authoritative. Base path: `/api/v1`. Reuse its DTOs, validation and permission rules; do not invent mobile-only response envelopes or assume all endpoints return `{ data }`.

## Native session contract — IOS-002

The backend now provides explicit JSON-token routes under `/auth/native` while retaining browser HttpOnly-cookie routes. Login/refresh return a refresh credential for native secure storage; refresh/logout/password change read it from JSON. Native routes reject browser origins and cookies and share the existing session service and attempt limits.

Read the [native session decision, retry rules and simulator evidence](NATIVE_SESSION.md) and the [backend endpoint reference](../../backend/API_ENDPOINTS.md). The native provider now uses this contract with refresh-only SecureStore persistence and restoration. Use `mobile/lib/session.ts` for session operations and authenticated requests; access tokens stay in memory. The browser transport and its origin protections are preserved.

## Integration map

| Flow              | Existing contract                                                                                                                                                                                    | Mobile work                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Session           | `POST /auth/native/login`, `/auth/native/refresh`, `/auth/native/logout`; `GET /auth/me`; `POST /auth/native/password`                                                                               | Implemented session client and password UI (IOS-011)                                     |
| Timetable         | `GET /timetable/periods`, `/timetable/entries`                                                                                                                                                       | Own faculty filter, dated week/IST status and independent recovery implemented (IOS-005)    |
| Attendance        | `GET /attendance/today`, `/attendance`; `POST /attendance/punch`, `/attendance/corrections`                                                                                                          | IOS-006: own history/corrections, explicit dated MOBILE punches; UTC semantics retained     |
| Leave             | Leave types, balances, requests and decision/cancel routes in the endpoint reference                                                                                                                 | IOS-007: own/year-scoped records, apply/cancel, HOD queue and confirmed decisions           |
| Coverage          | `GET /substitution/mine`, `/substitution/leave`, `/substitution/leave/:leaveId`, `/substitution/leave/:leaveId/candidates`; `POST /substitution/assignments`; `DELETE /substitution/assignments/:id` | IOS-005/008: own dated duties and server-backed HOD scores, assignment/undo, state recovery |
| Notifications     | `GET /notifications`, `/notifications/unread-count`; `PATCH /notifications/:id/read`, `/notifications/read-all`                                                                                      | IOS-009 implemented: own pagination, shared count, confirmed read/read-all and safe links   |
| Realtime          | Socket.IO path `/api/v1/socket.io`, `auth: { token }`, event `notifications:changed`                                                                                                                 | IOS-009 implemented: current-token auth, lifecycle cleanup, reconnect/foreground refetch    |
| Profile/documents | Employee and Documents sections of the endpoint reference                                                                                                                                            | IOS-011 implemented: own record/phone, multipart files, protected content; device acceptance pending                         |

Resolve links such as `/leave?tab=mine&request=...` into native destinations using an allowlist. Do not navigate blindly to arbitrary notification URLs; recheck authentication and permissions when opening protected content.

## Remote push infrastructure

Session-owned device registration and a durable sender/receipt worker are implemented for IOS-010. Use `POST /notifications/push/devices` and `DELETE /notifications/push/devices` through the private session client; `GET /notifications/:id` fetches an owned tap destination. Approved project/signing and real iPhone acceptance remain pending. See [remote push](REMOTE_PUSH.md).

## Failure and data rules

- Validate API payloads; retain server field errors and distinguish authentication, permission, validation, conflict and connectivity failures.
- A timeout after a write is ambiguous: refetch the relevant record before offering another submission. Do not silently create duplicate leave requests, punches or assignments.
- Real API failures stay failures; never substitute sample classes, balances, attendance or a fabricated success.
- Clear employee-specific cached data, sockets and device associations on logout/account switch. Test that account B never sees account A's cached records.
- New backend endpoints, migrations and mobile contract changes belong in a reviewed API PR, with permission and audit tests.

Remote push implementation and its signing/device acceptance gate are documented in [IOS-010 Remote push](REMOTE_PUSH.md). Delivery is disabled until an approved project and signed build are configured.

Profile/password/document contracts and private-cache rules: [IOS-011](PROFILE_AND_DOCUMENTS.md).
