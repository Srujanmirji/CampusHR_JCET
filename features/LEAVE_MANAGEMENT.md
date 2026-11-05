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
  Accredited duty category mapping managed by the Leave Policy Engine:
  - `UNIVERSITY_VALUATION` → **ODE**
  - `EXTERNAL_EXAMINER` → **ODE**
  - `CONFERENCE_SEMINAR` → **OOD**
  - `FDP_WORKSHOP` → **OOD**
  - `BOS_BOE_MEETING` → **OOD**
  - `OFFICIAL_COLLEGE_DUTY` → **OOD**
  - Internal Exam Duty remains an internal scheduling and invigilation feature.

## Configurable Leave Policy Engine

The centralized Leave Policy Engine is the single source of truth for:
- Leave types & annual entitlements
- Dual workforce applicability (Teaching Faculty vs Non-Teaching Staff)
- Balance calculation, carry forward limits, and lapse rules
- Half-day rules, advance notice rules, and maximum consecutive days
- Mandatory supporting document/attachment rules
- Attendance classification (On Leave, Official Duty, Restricted Holiday, Vacation Leave)
- Coverage requirements:
  - **Teaching Faculty**: Interacts with Academic Calendar, Timetable, Class coverage, Smart Substitution, and Faculty Workload (`requiresAcademicCoverage = true`, `affectsTimetable = true`).
  - **Non-Teaching Staff**: Does NOT run faculty timetable logic (no subject matching, no teaching workload scoring, no substitution recommendation). Supports `requiresOperationalCoverage = true`.
- Academic Calendar integration:
  - Evaluates working days excluding Sundays and public holidays, while honoring special working days.
  - Validates Restricted Holiday (RH) requests against the approved institutional RH Master.
  - Validates Vacation Leave (VL) requests within declared vacation windows.
- Balance formula:
  $$\text{Remaining} = \text{Annual Entitlement} + \text{Carried In} + \text{Adjustments} - \text{Approved} - (\text{reservePending} \times \text{Pending})$$
  *(Rejected, cancelled, or withdrawn requests are never deducted).*

## Permissions & RBAC

- `leave_policy.read`: Super Admin (all), HR Admin (all), Principal (all), HOD (department), Faculty (own), Non-Teaching Staff (own).
- `leave_policy.manage`: Super Admin (all), HR Admin (all).

## Validation

- Prevent invalid date ranges and reversed dates.
- Enforce advance notice periods (`minimumNoticeDays`).
- Enforce maximum consecutive days per policy (`maximumConsecutiveDays`).
- Require attachments for designated leave types (e.g., medical certificates for `SPL_ML`).
- Prevent negative leave balance for quota-based policies.
- Enforce dual workforce separation: timetable clash detection for Teaching, operational continuity routing for Non-Teaching.
