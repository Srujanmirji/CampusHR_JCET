# User Roles & Permissions

## Super Admin

Full system access.

## HR Admin

Employee, attendance, documents, recruitment, reports.

## Principal

Institution-wide read access and high-level approvals.

## HOD

Department-scoped employee, leave, timetable, workload, substitution.

## Faculty

Own profile, attendance, leave, timetable, workload, documents.

## Non-Teaching Staff

Own profile, attendance, leave, notices.

## Permission Model

Permissions use:

```text
resource.action.scope
```

Scopes:

- **all** — every record in the institution.
- **department** — records of employees in the user's own department.
- **own** — records belonging to the signed-in user's employee record.

A wider scope covers the narrower ones: `leave.read.all` also allows reading
department and own leave. Each role is granted only its widest scope per action.

## Permission Matrix

Approved 13 October 2026. The server seeds these grants from
`backend/src/modules/auth/permissions.ts`; keep the two in step.

`A` = all · `D` = own department · `O` = own records · `—` = no access.
The key is `resource.action.<scope>`, e.g. `leave.approve.department`.

| Permission                                      | Super Admin | HR Admin | Principal | HOD | Faculty | Non-Teaching Staff |
| ----------------------------------------------- | :---------: | :------: | :-------: | :-: | :-----: | :----------------: |
| **Employees**                                   |             |          |           |     |         |                    |
| `employee.read`                                 |      A      |    A     |     A     |  D  |    O    |         O          |
| `employee.create`                               |      A      |    A     |     —     |  —  |    —    |         —          |
| `employee.update` ¹                             |      A      |    A     |     —     |  —  |    O    |         O          |
| `employee.archive`                              |      A      |    A     |     —     |  —  |    —    |         —          |
| `employee.read_sensitive` (Aadhaar, PAN)        |      A      |    A     |     —     |  —  |    O    |         O          |
| **Departments**                                 |             |          |           |     |         |                    |
| `department.read`                               |      A      |    A     |     A     |  A  |    A    |         A          |
| `department.manage` (create, edit, assign HOD)  |      A      |    A     |     —     |  —  |    —    |         —          |
| **Attendance**                                  |             |          |           |     |         |                    |
| `attendance.read`                               |      A      |    A     |     A     |  D  |    O    |         O          |
| `attendance.check_in`                           |      —      |    O     |     O     |  O  |    O    |         O          |
| `attendance.record` (manual entry)              |      A      |    A     |     —     |  —  |    —    |         —          |
| `attendance_correction.request`                 |      —      |    O     |     O     |  O  |    O    |         O          |
| `attendance_correction.approve`                 |      A      |    A     |     —     |  D  |    —    |         —          |
| **Leave**                                       |             |          |           |     |         |                    |
| `leave.apply`                                   |      —      |    O     |     O     |  O  |    O    |         O          |
| `leave.read`                                    |      A      |    A     |     A     |  D  |    O    |         O          |
| `leave.cancel` (own pending requests)           |      —      |    O     |     O     |  O  |    O    |         O          |
| `leave.approve` ²                               |      A      |    A     |     A     |  D  |    —    |         —          |
| `leave_type.manage` (types, balances, policy)   |      A      |    A     |     —     |  —  |    —    |         —          |
| **Timetable**                                   |             |          |           |     |         |                    |
| `timetable.read`                                |      A      |    A     |     A     |  D  |    O    |         —          |
| `timetable.manage`                              |      A      |    —     |     —     |  D  |    —    |         —          |
| **Faculty workload**                            |             |          |           |     |         |                    |
| `workload.read`                                 |      A      |    A     |     A     |  D  |    O    |         —          |
| `workload.configure` (thresholds)               |      A      |    —     |     A     |  —  |    —    |         —          |
| **Smart substitution**                          |             |          |           |     |         |                    |
| `substitution.read`                             |      A      |    —     |     A     |  D  |    O    |         —          |
| `substitution.assign`                           |      A      |    —     |     —     |  D  |    —    |         —          |
| **Documents**                                   |             |          |           |     |         |                    |
| `document.upload`                               |      —      |    O     |     O     |  O  |    O    |         O          |
| `document.read` ³                               |      A      |    A     |     —     |  O  |    O    |         O          |
| `document.verify`                               |      A      |    A     |     —     |  —  |    —    |         —          |
| **Faculty academic profile**                    |             |          |           |     |         |                    |
| `academic_profile.read`                         |      A      |    A     |     A     |  D  |    O    |         —          |
| `academic_profile.update`                       |      A      |    A     |     —     |  O  |    O    |         —          |
| **Notifications**                               |             |          |           |     |         |                    |
| `notification.read`                             |      O      |    O     |     O     |  O  |    O    |         O          |
| `announcement.send`                             |      A      |    A     |     A     |  D  |    —    |         —          |
| **Reports**                                     |             |          |           |     |         |                    |
| `report.read` (includes export)                 |      A      |    A     |     A     |  D  |    —    |         —          |
| **Recruitment** (Phase 6)                       |             |          |           |     |         |                    |
| `recruitment.read`                              |      A      |    A     |     A     |  D  |    —    |         —          |
| `recruitment.manage`                            |      A      |    A     |     —     |  —  |    —    |         —          |
| **Helpdesk** (Phase 6)                          |             |          |           |     |         |                    |
| `helpdesk.create`                               |      O      |    O     |     O     |  O  |    O    |         O          |
| `helpdesk.manage`                               |      A      |    A     |     —     |  —  |    —    |         —          |
| **Administration**                              |             |          |           |     |         |                    |
| `user.manage` ⁴ (accounts, activate/deactivate) |      A      |    A     |     —     |  —  |    —    |         —          |
| `role.manage` (change role permissions)         |      A      |    —     |     —     |  —  |    —    |         —          |
| `settings.manage`                               |      A      |    —     |     —     |  —  |    —    |         —          |
| `audit_log.read`                                |      A      |    —     |     A     |  —  |    —    |         —          |

¹ Own: contact details only (phone, address). Everything else is HR.
² Faculty and staff → HOD → HR (`LEAVE_MANAGEMENT.md`). An HOD's own leave goes to the Principal.
³ HODs cannot read their faculty's documents; documents hold Aadhaar and PAN.
⁴ HR Admin cannot create or assign the Super Admin role.

### Rules

- The server enforces every permission. The web and mobile apps only hide what a
  user cannot do.
- Own-scope self-service (leave, attendance, documents) needs an account linked
  to an employee record. A Super Admin system account without one has none.
- Granting or removing permissions, and changing a user's role, is audit-logged.

### Decisions (approved 13 October 2026)

1. **Leave chain:** Faculty → HOD → HR. Non-Teaching Staff leave goes straight to
   HR. An HOD's leave goes to the Principal; the Principal's to Super Admin /
   management.
2. **Timetable:** only HODs (own department) and Super Admin edit timetables.
3. **Documents:** HODs never see faculty documents.
4. **Audit logs:** readable by Super Admin and the Principal only.
5. **Workload thresholds:** set by the Principal, following VTU norms.
6. **Super Admin:** an IT system account, not an employee, so it has no
   own-scope self-service.
