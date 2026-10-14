# Feature — Leave Management

## Capabilities

- Leave types
- Leave balances
- Apply leave
- Approve/reject
- Cancel
- Multi-level approval
- Leave calendar
- Attachment support
- Leave history

## Decisions (14 October 2026)

- **Leave year:** calendar year; balances renew on 1 January.
- **Approval:** every request goes Faculty → HOD → HR. Non-Teaching Staff → HR.
  An HOD's leave → Principal; the Principal's → Super Admin
  (`product/USER_ROLES.md`).
- **Pending from JCET:** leave types, yearly quotas, half-day rules and what
  happens to unused leave at year end. Leave is built once these arrive.

## Validation

- Prevent invalid date ranges.
- Prevent negative leave balance unless policy allows.
- Detect timetable impact.
