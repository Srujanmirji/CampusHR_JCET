# Feature — Academic Calendar & Holiday Master

**Institution:** Jain College of Engineering & Technology (JCET), Hubballi  
**Product:** CampusHR — Academic Workforce & Institutional HR Operations

---

## 1. Goal & Architecture

The Academic Calendar & Holiday Master serves as the central, authoritative source of truth for:
- Academic years (`2026–27`, etc.)
- Semester terms (`Odd Semester`, `Even Semester`)
- Institutional working days
- Configurable weekly offs
- Public holidays
- Restricted holidays (RH Master)
- Vacation periods (e.g. Winter/Summer breaks)
- Examination periods (VTU & Internal assessments)
- Institutional events & Academic events (Commencement, FDPs, College Days)

This module is designed so that future CampusHR modules can call its integration interfaces for:
- **Leave-Day Calculation** (accurate deduction excluding non-working days)
- **Leave Processing** (CL / EL / RH / VL)
- **Attendance Calculation** (marking holidays, weekly offs, special working days)
- **On-Duty (OD / ODE)** (accredited duty day calculations)
- **Timetable Validation & Class Coverage**
- **Annual Leave Rollover**
- **Statutory & Institutional Reports**

---

## 2. Domain Entities

### `AcademicYear`
- `id`: UUID (Primary Key)
- `name`: String (e.g., `"2026–27"`, unique)
- `startDate`: Date
- `endDate`: Date
- `isCurrent`: Boolean (enforced single active year)
- `status`: String (`"ACTIVE"`, `"UPCOMING"`, `"COMPLETED"`, `"ARCHIVED"`)

### `Semester`
- `id`: UUID (Primary Key)
- `academicYearId`: UUID (foreign key to `AcademicYear`)
- `name`: String (e.g., `"Odd Semester 2026–27"`)
- `type`: Enum (`ODD`, `EVEN`)
- `startDate`: Date
- `endDate`: Date
- `teachingStartDate` / `teachingEndDate`: Date (nullable)
- `examStartDate` / `examEndDate`: Date (nullable)
- `isCurrent`: Boolean (enforced single active semester)
- `status`: String

### `CalendarDay`
- `id`: UUID (Primary Key)
- `date`: Date (ISO YYYY-MM-DD)
- `academicYearId`: UUID
- `semesterId`: UUID (nullable)
- `dayType`: Enum (`WORKING_DAY`, `WEEKLY_OFF`, `PUBLIC_HOLIDAY`, `RESTRICTED_HOLIDAY`, `VACATION`, `EXAMINATION`, `INSTITUTIONAL_EVENT`, `ACADEMIC_EVENT`, `SPECIAL_WORKING_DAY`)
- `title`: String (nullable)
- `description`: Text (nullable)
- `isWorkingDay`: Boolean
- `departmentId`: Int (nullable relation to Department for departmental events)
- `appliesToEmployeeType`: String (`"ALL"`, `"TEACHING"`, `"NON_TEACHING"`)
- `source`: String (`"MANUAL"`, `"ACADEMIC_CALENDAR"`, `"INSTITUTIONAL_ORDER"`)
- `createdById`: UUID (nullable relation to User)

### `RestrictedHoliday`
- `id`: UUID (Primary Key)
- `calendarDayId`: UUID (nullable relation to `CalendarDay`)
- `name`: String
- `date`: Date
- `active`: Boolean (default `true`)
- `annualYear`: String (e.g., `"2026–27"`)
- `eligibleEmployeeTypes`: String (`"ALL"`, or comma-separated)
- `description`: Text (nullable)

### `WeeklyWorkingPattern`
- `id`: UUID (Primary Key)
- `dayOfWeek`: Int (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
- `dayName`: String (`"Sunday"`, `"Monday"`, ...)
- `isWorkingDay`: Boolean (default: Sunday = `false`, Monday–Saturday = `true`)
- `description`: Text (nullable)

---

## 3. Important Domain Rules & Precedence

1. **No Contradictory Classifications:** A single date cannot have conflicting classifications for the same scope. Duplicate entries on the same date and department/scope are prevented (HTTP 409 Conflict).
2. **Special Working Day Override:** Declaring a `SPECIAL_WORKING_DAY` on a normal weekly off (e.g. Sunday or non-working Saturday) forces `isWorkingDay = true`, overriding the weekly off.
3. **Public Holidays:** Declaring a `PUBLIC_HOLIDAY` forces `isWorkingDay = false`.
4. **Restricted Holidays (RH):** Distinct from public holidays. Creating an RH day creates a linked master entry in `RestrictedHoliday` and does **not** automatically mark the day as non-working for every employee.
5. **Vacation Periods:** Date-range configured periods that generate calendar records for the entire range.
6. **Examination Periods:** Examinations are non-instructional but remain configurable working days for faculty invigilators (`isWorkingDay = true` by default).
7. **Academic Events:** Orientation, FDPs, and College Events do not disrupt attendance unless explicitly configured.
8. **Institutional Working Week:** Default pattern is Monday–Saturday working, Sunday weekly off, with administrative capability to customize day-of-week rules.

---

## 4. Integration Service APIs

The backend exposes `AcademicCalendarService` methods for other modules:

```typescript
// 1. Check if a given date is a working day
await calendarService.isWorkingDay(date, { departmentId, employeeType });

// 2. Obtain full semantic classification
await calendarService.getDayClassification(date, { departmentId, employeeType });

// 3. Calculate working days between date range
await calendarService.getWorkingDaysBetween(startDate, endDate, { departmentId, employeeType });

// 4. Calculate non-working days (holidays + weekly offs)
await calendarService.getNonWorkingDaysBetween(startDate, endDate, { departmentId, employeeType });

// 5. Get restricted holidays for an academic year
await calendarService.getRestrictedHolidays(year, { employeeType });

// 6. Current active academic year and semester
await calendarService.getCurrentAcademicYear();
await calendarService.getCurrentSemester();
```

---

## 5. REST Endpoints

Mounted under `/api/v1`:

### Academic Years
- `GET /api/v1/academic-years`
- `GET /api/v1/academic-years/current`
- `GET /api/v1/academic-years/:id`
- `POST /api/v1/academic-years` (`academic_calendar.manage`)
- `PATCH /api/v1/academic-years/:id` (`academic_calendar.manage`)
- `POST /api/v1/academic-years/:id/set-current` (`academic_calendar.manage`)

### Semesters
- `GET /api/v1/semesters`
- `GET /api/v1/semesters/current`
- `GET /api/v1/semesters/:id`
- `POST /api/v1/semesters` (`academic_calendar.manage`)
- `PATCH /api/v1/semesters/:id` (`academic_calendar.manage`)
- `POST /api/v1/semesters/:id/set-current` (`academic_calendar.manage`)

### Academic Calendar Days
- `GET /api/v1/academic-calendar`
- `GET /api/v1/academic-calendar/overview`
- `GET /api/v1/academic-calendar/working-pattern`
- `PATCH /api/v1/academic-calendar/working-pattern` (`academic_calendar.manage`)
- `GET /api/v1/academic-calendar/integration/check-day`
- `GET /api/v1/academic-calendar/integration/working-days`
- `GET /api/v1/academic-calendar/:id`
- `POST /api/v1/academic-calendar` (`academic_calendar.manage`)
- `POST /api/v1/academic-calendar/range` (`academic_calendar.manage`)
- `PATCH /api/v1/academic-calendar/:id` (`academic_calendar.manage`)
- `DELETE /api/v1/academic-calendar/:id` (`academic_calendar.manage`)

### Holidays & Restricted Holidays
- `GET /api/v1/holidays`
- `GET /api/v1/restricted-holidays`
- `POST /api/v1/restricted-holidays` (`academic_calendar.manage`)
- `PATCH /api/v1/restricted-holidays/:id` (`academic_calendar.manage`)

---

## 6. Web & Mobile User Interface

### Web Administration (`/academic-calendar`)
- **Overview:** Current academic year, active semester, working days count, and upcoming holidays & academic events.
- **Calendar View:** Interactive month view with previous/today/next navigation, subtle semantic badge colors (neutral, soft red, soft amber, soft violet, soft blue, soft teal, soft green).
- **List View:** Searchable table with filters for Academic Year, Semester, Day Type, Month, Working / Non-working.
- **Add Calendar Entry:** Modal for single-date event/holiday declarations.
- **Date-Range Entry:** Modal for multi-day vacations, examination sessions, or institutional closures.
- **Academic Years & Semesters Tab:** Admin controls to configure terms and mark active year/semester.
- **Holiday & RH Master Tab:** Master list of restricted holidays and public holidays.
- **Weekly Working Pattern Tab:** Toggle working status for each of the 7 days of the week.

### Mobile (`/calendar`)
- **Read-Only Screen:** Available to Faculty and HODs (no administrative mutation controls).
- **Views:** "Upcoming Events", "Month View", and "Restricted (RH)".
- **Card Format:** Semantic date rows with date number, day of week, title, and badge.
