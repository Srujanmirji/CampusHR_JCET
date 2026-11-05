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
- **Standardized Institutional Leave Categories (JCET):**
  - **CL — Casual Leave — 12**
  - **EL — Earned Leave — 10**
  - **SPL / ML — Special Leave / Medical Leave — configurable**
    *(Important: Do not describe ML as Maternity Leave. If Maternity Leave is later required, it must be represented as a separate configurable leave policy unless institutional policy explicitly defines otherwise.)*
  - **OOD — On Official Duty — 12**
  - **ODE — Official / Examination Duty — 12**
  - **RH — Restricted Holiday — configurable**
  - **VL — Vacation Leave — configurable**
- **On-Duty & Examination Duty Policy Integration:**
  Current intended mapping for accredited duty credit:
  - `UNIVERSITY_VALUATION` → **ODE**
  - `EXTERNAL_EXAMINER` → **ODE**
  - `CONFERENCE_SEMINAR` → **OOD**
  - `FDP_WORKSHOP` → **OOD**
  - `BOS_BOE_MEETING` → **OOD**
  - `OFFICIAL_COLLEGE_DUTY` → **OOD**
  - Internal Exam Duty remains an internal scheduling and invigilation feature.
  - The future Leave Policy Engine will become the policy source of truth for dynamic evaluation, quotas, and rules-based overrides for this mapping.

## Validation

- Prevent invalid date ranges.
- Prevent negative leave balance unless policy allows.
- Detect timetable impact.
