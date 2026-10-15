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
  happens to unused leave at year end. Built (15 October 2026) with these as
  settings HR enters per leave type, so JCET's answers need no code change.
- **Assumed until JCET confirms:** an HR Admin's leave goes to the Principal;
  leave days count Monday–Saturday with no holiday calendar; quotas are not
  pro-rated for staff who join mid-year.

## Validation

- Prevent invalid date ranges.
- Prevent negative leave balance unless policy allows.
- Detect timetable impact.
