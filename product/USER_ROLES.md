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

Permissions should use:

```text
resource.action.scope
```

Examples:

- employee.read.all
- employee.update.department
- leave.approve.department
- document.verify.all
- report.read.department
