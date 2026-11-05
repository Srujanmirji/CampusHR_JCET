import React, { useEffect, useState, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  BookOpen,
  CheckCircle2,
  XCircle,
  Settings2,
  Trash2,
  List,
  Grid,
  Check,
  Layers,
  CalendarRange,
} from 'lucide-react';
import { useCan } from '@/features/auth/hooks/useCan';
import {
  type CalendarDay,
  type CalendarDayType,
  type AcademicYear,
  type Semester,
  type RestrictedHoliday,
  type WeeklyWorkingPattern,
  type CalendarOverview,
  fetchCalendarOverview,
  fetchAcademicYears,
  fetchSemesters,
  fetchCalendarDays,
  createCalendarDay,
  createCalendarRange,
  deleteCalendarDay,
  createAcademicYear,
  setCurrentAcademicYear,
  createSemester,
  setCurrentSemester,
  fetchRestrictedHolidays,
  createRestrictedHoliday,
  fetchWeeklyPatterns,
  updateWeeklyPatterns,
} from '../api/academicCalendar';

const DAY_TYPE_CONFIG: Record<
  CalendarDayType,
  { label: string; badgeClass: string; borderClass: string; bgClass: string; textClass: string }
> = {
  WORKING_DAY: {
    label: 'Working Day',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    borderClass: 'border-slate-200',
    bgClass: 'bg-slate-50/60',
    textClass: 'text-slate-700',
  },
  WEEKLY_OFF: {
    label: 'Weekly Off',
    badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
    borderClass: 'border-gray-200',
    bgClass: 'bg-gray-50/60',
    textClass: 'text-gray-600',
  },
  PUBLIC_HOLIDAY: {
    label: 'Public Holiday',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    borderClass: 'border-rose-200',
    bgClass: 'bg-rose-50/70',
    textClass: 'text-rose-800',
  },
  RESTRICTED_HOLIDAY: {
    label: 'Restricted Holiday',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    borderClass: 'border-amber-200',
    bgClass: 'bg-amber-50/70',
    textClass: 'text-amber-800',
  },
  VACATION: {
    label: 'Vacation',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    borderClass: 'border-purple-200',
    bgClass: 'bg-purple-50/70',
    textClass: 'text-purple-800',
  },
  EXAMINATION: {
    label: 'Examination',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    borderClass: 'border-blue-200',
    bgClass: 'bg-blue-50/70',
    textClass: 'text-blue-800',
  },
  INSTITUTIONAL_EVENT: {
    label: 'Institutional Event',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    borderClass: 'border-teal-200',
    bgClass: 'bg-teal-50/70',
    textClass: 'text-teal-800',
  },
  ACADEMIC_EVENT: {
    label: 'Academic Event',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    borderClass: 'border-indigo-200',
    bgClass: 'bg-indigo-50/70',
    textClass: 'text-indigo-800',
  },
  SPECIAL_WORKING_DAY: {
    label: 'Special Working Day',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderClass: 'border-emerald-200',
    bgClass: 'bg-emerald-50/70',
    textClass: 'text-emerald-800',
  },
};

export default function AcademicCalendarPage() {
  const can = useCan();
  const canManage = can('academic_calendar.manage');

  const [activeTab, setActiveTab] = useState<'calendar' | 'list' | 'holidays' | 'academic_years' | 'weekly_pattern'>('calendar');
  const [overview, setOverview] = useState<CalendarOverview | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [restrictedHolidays, setRestrictedHolidays] = useState<RestrictedHoliday[]>([]);
  const [weeklyPatterns, setWeeklyPatterns] = useState<WeeklyWorkingPattern[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  // Month navigation for Calendar View
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals
  const [showAddSingleModal, setShowAddSingleModal] = useState(false);
  const [showAddRangeModal, setShowAddRangeModal] = useState(false);
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [showAddSemesterModal, setShowAddSemesterModal] = useState(false);
  const [showAddRhModal, setShowAddRhModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  // Form states
  const [singleForm, setSingleForm] = useState({
    date: new Date().toISOString().split('T')[0]!,
    academicYearId: '',
    semesterId: '',
    dayType: 'PUBLIC_HOLIDAY' as CalendarDayType,
    title: '',
    description: '',
    isWorkingDay: false,
    appliesToEmployeeType: 'ALL',
  });

  const [rangeForm, setRangeForm] = useState({
    startDate: '',
    endDate: '',
    academicYearId: '',
    semesterId: '',
    dayType: 'VACATION' as CalendarDayType,
    title: '',
    description: '',
    isWorkingDay: false,
    appliesToEmployeeType: 'ALL',
  });

  const [yearForm, setYearForm] = useState({
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
    isCurrent: false,
  });

  const [semesterForm, setSemesterForm] = useState({
    academicYearId: '',
    name: 'Odd Semester 2026–27',
    type: 'ODD' as 'ODD' | 'EVEN',
    startDate: '2026-08-16',
    endDate: '2026-12-31',
    teachingStartDate: '2026-08-20',
    teachingEndDate: '2026-12-10',
    examStartDate: '2026-12-12',
    examEndDate: '2026-12-30',
    isCurrent: false,
  });

  const [rhForm, setRhForm] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0]!,
    annualYear: '2026–27',
    eligibleEmployeeTypes: 'ALL',
    description: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, years, sems, rh, wp] = await Promise.all([
        fetchCalendarOverview().catch(() => null),
        fetchAcademicYears().catch(() => []),
        fetchSemesters().catch(() => []),
        fetchRestrictedHolidays().catch(() => []),
        fetchWeeklyPatterns().catch(() => []),
      ]);

      setOverview(ov);
      setAcademicYears(years);
      setSemesters(sems);
      setRestrictedHolidays(rh);
      setWeeklyPatterns(wp);

      if (years.length > 0) {
        const curYear = years.find((y) => y.isCurrent) || years[0]!;
        setSingleForm((prev) => ({ ...prev, academicYearId: curYear.id }));
        setRangeForm((prev) => ({ ...prev, academicYearId: curYear.id }));
        setSemesterForm((prev) => ({ ...prev, academicYearId: curYear.id }));
        setRhForm((prev) => ({ ...prev, annualYear: curYear.name }));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthDays = async (targetDate: Date) => {
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const monthStr = `${y}-${m}`;
    try {
      const res = await fetchCalendarDays({ month: monthStr, pageSize: 200 });
      setCalendarDays(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadMonthDays(currentDate);
  }, [currentDate]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Day map for fast lookup
  const dayMap = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    for (const d of calendarDays) {
      const dateStr = d.date.split('T')[0]!;
      map.set(dateStr, d);
    }
    return map;
  }, [calendarDays]);

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCalendarDay(singleForm);
      setShowAddSingleModal(false);
      setSingleForm((prev) => ({ ...prev, title: '', description: '' }));
      await loadData();
      await loadMonthDays(currentDate);
    } catch (err: any) {
      alert(err?.message || 'Failed to create calendar entry');
    }
  };

  const handleCreateRange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCalendarRange(rangeForm);
      setShowAddRangeModal(false);
      setRangeForm((prev) => ({ ...prev, title: '', description: '', startDate: '', endDate: '' }));
      await loadData();
      await loadMonthDays(currentDate);
    } catch (err: any) {
      alert(err?.message || 'Failed to create date-range entry');
    }
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAcademicYear(yearForm);
      setShowAddYearModal(false);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to create academic year');
    }
  };

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSemester(semesterForm);
      setShowAddSemesterModal(false);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to create semester');
    }
  };

  const handleCreateRh = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRestrictedHoliday(rhForm);
      setShowAddRhModal(false);
      setRhForm((prev) => ({ ...prev, name: '', description: '' }));
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to create restricted holiday');
    }
  };

  const handleDeleteDay = async (id: string) => {
    if (!confirm('Are you sure you want to delete this calendar entry?')) return;
    try {
      await deleteCalendarDay(id);
      setSelectedDay(null);
      await loadData();
      await loadMonthDays(currentDate);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete calendar day');
    }
  };

  const handleToggleWeeklyPattern = async (dayOfWeek: number, currentStatus: boolean) => {
    const updated = weeklyPatterns.map((p) =>
      p.dayOfWeek === dayOfWeek ? { ...p, isWorkingDay: !currentStatus } : p,
    );
    try {
      const res = await updateWeeklyPatterns(updated);
      setWeeklyPatterns(res);
      await loadData();
      await loadMonthDays(currentDate);
    } catch (err: any) {
      alert(err?.message || 'Failed to update weekly pattern');
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Academic Calendar</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Manage academic years, semesters, holidays and institutional working days.
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddSingleModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Event / Holiday
            </button>
            <button
              onClick={() => setShowAddRangeModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
            >
              <CalendarRange className="w-4 h-4 text-slate-500" />
              Date-Range Entry
            </button>
          </div>
        )}
      </div>

      {/* Overview Cards (CampusHR Approved Style) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            Current Academic Year
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            {overview?.currentAcademicYear?.name ?? '2026–27'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {overview?.currentAcademicYear?.startDate
              ? `${overview.currentAcademicYear.startDate.split('T')[0]} to ${overview.currentAcademicYear.endDate.split('T')[0]}`
              : 'Active Year'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            Current Semester
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            {overview?.currentSemester?.name ?? 'Odd Semester'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {overview?.currentSemester?.startDate
              ? `${overview.currentSemester.startDate.split('T')[0]} to ${overview.currentSemester.endDate.split('T')[0]}`
              : 'Term Dates Configured'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Clock className="w-4 h-4 text-emerald-500" />
            Working Days (Term)
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            {overview?.semesterWorkingDays ?? '—'} <span className="text-xs font-normal text-slate-500">days</span>
          </div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">Mon–Sat schedule active</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Restricted Holidays
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            {restrictedHolidays.length} <span className="text-xs font-normal text-slate-500">available</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Elective leave master</div>
        </div>
      </div>

      {/* Upcoming Announcements Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming Holidays */}
        <div className="bg-rose-50/40 rounded-xl border border-rose-100 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800 uppercase tracking-wider mb-2">
            <span>Upcoming Holidays</span>
            <span className="text-[11px] font-normal lowercase bg-rose-100 px-2 py-0.5 rounded-full text-rose-700">next 5</span>
          </div>
          {overview?.upcomingHolidays && overview.upcomingHolidays.length > 0 ? (
            <div className="space-y-1.5">
              {overview.upcomingHolidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white/70 border border-rose-100">
                  <span className="font-medium text-slate-800">{h.title ?? 'Holiday'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{h.date.split('T')[0]}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-700 font-medium">
                      {h.dayType === 'PUBLIC_HOLIDAY' ? 'Public' : 'RH'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-rose-600/80 italic">No upcoming holidays scheduled in the next 30 days.</p>
          )}
        </div>

        {/* Upcoming Academic Events */}
        <div className="bg-indigo-50/40 rounded-xl border border-indigo-100 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-800 uppercase tracking-wider mb-2">
            <span>Upcoming Academic Events & Exams</span>
            <span className="text-[11px] font-normal lowercase bg-indigo-100 px-2 py-0.5 rounded-full text-indigo-700">scheduled</span>
          </div>
          {overview?.upcomingAcademicEvents && overview.upcomingAcademicEvents.length > 0 ? (
            <div className="space-y-1.5">
              {overview.upcomingAcademicEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white/70 border border-indigo-100">
                  <span className="font-medium text-slate-800">{e.title ?? 'Academic Event'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{e.date.split('T')[0]}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700 font-medium">
                      {e.dayType.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-indigo-600/80 italic">No academic events or exams currently listed.</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'calendar'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Grid className="w-4 h-4" />
            Calendar View
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <List className="w-4 h-4" />
            List View
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'holidays'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Holiday & RH Master
          </button>
          <button
            onClick={() => setActiveTab('academic_years')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'academic_years'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            Academic Years & Semesters
          </button>
          {canManage && (
            <button
              onClick={() => setActiveTab('weekly_pattern')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'weekly_pattern'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              Weekly Working Rules
            </button>
          )}
        </nav>
      </div>

      {/* TAB 1: CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Controls & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToToday}
                className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <h2 className="text-base font-semibold text-slate-900 ml-2">
                {monthNames[month]} {year}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter events by day type"
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-indigo-500"
              >
                <option value="ALL">All Event Types</option>
                <option value="PUBLIC_HOLIDAY">Public Holidays</option>
                <option value="RESTRICTED_HOLIDAY">Restricted Holidays</option>
                <option value="VACATION">Vacations</option>
                <option value="EXAMINATION">Examinations</option>
                <option value="INSTITUTIONAL_EVENT">Institutional Events</option>
                <option value="ACADEMIC_EVENT">Academic Events</option>
                <option value="SPECIAL_WORKING_DAY">Special Working Days</option>
                <option value="WORKING_DAY">Regular Working Days</option>
              </select>
            </div>
          </div>

          {/* Month Grid */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center py-2.5 text-xs font-semibold text-slate-600">
              <span className="text-rose-600">Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200">
              {/* Empty padding cells for start of month */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[105px] bg-slate-50/30 p-2 text-slate-300 select-none" />
              ))}

              {/* Real month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const mStr = String(month + 1).padStart(2, '0');
                const dStr = String(dayNum).padStart(2, '0');
                const fullDateStr = `${year}-${mStr}-${dStr}`;
                const entry = dayMap.get(fullDateStr);
                const isSunday = new Date(year, month, dayNum).getDay() === 0;

                // Determine classification
                let displayType: CalendarDayType = entry
                  ? entry.dayType
                  : isSunday
                  ? 'WEEKLY_OFF'
                  : 'WORKING_DAY';

                const config = DAY_TYPE_CONFIG[displayType] || DAY_TYPE_CONFIG.WORKING_DAY;

                // Filter check
                const isFilteredOut = typeFilter !== 'ALL' && displayType !== typeFilter;

                return (
                  <div
                    key={fullDateStr}
                    onClick={() => entry && setSelectedDay(entry)}
                    className={`min-h-[105px] p-2 transition-colors relative flex flex-col justify-between ${
                      entry ? `${config.bgClass} cursor-pointer hover:ring-1 hover:ring-indigo-400` : 'bg-white hover:bg-slate-50/60'
                    } ${isFilteredOut ? 'opacity-30' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${
                          isSunday ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {dayNum}
                      </span>
                      {entry && (
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-medium border ${config.badgeClass}`}
                        >
                          {config.label}
                        </span>
                      )}
                    </div>

                    {/* Entry Title or Details */}
                    {entry ? (
                      <div className="mt-1">
                        <p className={`text-xs font-medium truncate ${config.textClass}`}>
                          {entry.title || config.label}
                        </p>
                        {entry.description && (
                          <p className="text-[10px] text-slate-500 truncate">{entry.description}</p>
                        )}
                        <div className="mt-1 flex items-center gap-1 text-[10px]">
                          {entry.isWorkingDay ? (
                            <span className="text-emerald-700 font-medium inline-flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Working
                            </span>
                          ) : (
                            <span className="text-rose-700 font-medium inline-flex items-center gap-0.5">
                              <XCircle className="w-2.5 h-2.5" /> Off
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-auto text-[10px] text-slate-400">
                        {isSunday ? 'Weekly Off' : 'Working'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIST VIEW */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Configured Calendar Dates ({calendarDays.length})</h3>
            <span className="text-xs text-slate-500">Filtered for {monthNames[month]} {year}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Working Status</th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4">Source</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calendarDays.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      No custom calendar days created for this month.
                    </td>
                  </tr>
                ) : (
                  calendarDays.map((d) => {
                    const cfg = DAY_TYPE_CONFIG[d.dayType] || DAY_TYPE_CONFIG.WORKING_DAY;
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-800">
                          {d.date.split('T')[0]}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${cfg.badgeClass}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{d.title ?? '—'}</td>
                        <td className="py-3 px-4">
                          {d.isWorkingDay ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Working
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                              <XCircle className="w-3.5 h-3.5" /> Non-Working
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {d.department ? d.department.code : d.appliesToEmployeeType || 'Institution-wide'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[10px]">{d.source}</td>
                        {canManage && (
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteDay(d.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: HOLIDAY & RH MASTER */}
      {activeTab === 'holidays' && (
        <div className="space-y-6">
          {/* Restricted Holiday Master */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Restricted Holidays (RH Master)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selectable annual restricted holidays for faculty and staff leave allotment.
                </p>
              </div>
              {canManage && (
                <button
                  onClick={() => setShowAddRhModal(true)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Restricted Holiday
                </button>
              )}
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Holiday Name</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Academic Year</th>
                  <th className="py-3 px-4">Eligible Staff Category</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {restrictedHolidays.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                      No restricted holidays currently declared.
                    </td>
                  </tr>
                ) : (
                  restrictedHolidays.map((rh) => (
                    <tr key={rh.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-medium text-slate-900">{rh.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{rh.date.split('T')[0]}</td>
                      <td className="py-3 px-4 text-slate-600">{rh.annualYear}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700">
                          {rh.eligibleEmployeeTypes || 'ALL'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {rh.active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <XCircle className="w-3.5 h-3.5" /> Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ACADEMIC YEARS & SEMESTERS */}
      {activeTab === 'academic_years' && (
        <div className="space-y-6">
          {/* Academic Years List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Academic Years</h3>
                <p className="text-xs text-slate-500 mt-0.5">Configure institutional annual cycle and active academic year.</p>
              </div>
              {canManage && (
                <button
                  onClick={() => setShowAddYearModal(true)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Academic Year
                </button>
              )}
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Year Name</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">End Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Current Year</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {academicYears.map((ay) => (
                  <tr key={ay.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-900">{ay.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{ay.startDate.split('T')[0]}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{ay.endDate.split('T')[0]}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {ay.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {ay.isCurrent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Check className="w-3 h-3" /> Active Current
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        {!ay.isCurrent && (
                          <button
                            onClick={async () => {
                              await setCurrentAcademicYear(ay.id);
                              await loadData();
                            }}
                            className="px-2 py-1 text-[11px] font-medium border border-slate-200 rounded hover:bg-slate-50 text-slate-700"
                          >
                            Mark Current
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Semesters List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Semesters</h3>
                <p className="text-xs text-slate-500 mt-0.5">Odd/Even terms, teaching schedules and exam periods.</p>
              </div>
              {canManage && (
                <button
                  onClick={() => setShowAddSemesterModal(true)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Semester
                </button>
              )}
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Semester Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Term Dates</th>
                  <th className="py-3 px-4">Teaching Period</th>
                  <th className="py-3 px-4">Exam Period</th>
                  <th className="py-3 px-4">Current Term</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {semesters.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-medium text-slate-900">{s.name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        s.type === 'ODD' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {s.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {s.startDate.split('T')[0]} to {s.endDate.split('T')[0]}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {s.teachingStartDate && s.teachingEndDate
                        ? `${s.teachingStartDate.split('T')[0]} to ${s.teachingEndDate.split('T')[0]}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {s.examStartDate && s.examEndDate
                        ? `${s.examStartDate.split('T')[0]} to ${s.examEndDate.split('T')[0]}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {s.isCurrent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3" /> Current Term
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        {!s.isCurrent && (
                          <button
                            onClick={async () => {
                              await setCurrentSemester(s.id);
                              await loadData();
                            }}
                            className="px-2 py-1 text-[11px] font-medium border border-slate-200 rounded hover:bg-slate-50 text-slate-700"
                          >
                            Mark Current
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: WEEKLY WORKING RULES */}
      {activeTab === 'weekly_pattern' && canManage && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs p-6 max-w-2xl">
          <h3 className="text-base font-semibold text-slate-900">Institutional Weekly Working Pattern</h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure default working days vs weekly offs for the institution. Special Working Days and Public Holidays override this pattern automatically.
          </p>

          <div className="mt-5 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {weeklyPatterns.map((p) => (
              <div key={p.dayOfWeek} className="flex items-center justify-between p-3.5 hover:bg-slate-50/60">
                <div>
                  <span className="text-sm font-semibold text-slate-900">{p.dayName}</span>
                  <p className="text-xs text-slate-500">{p.description || (p.isWorkingDay ? 'Regular working day' : 'Official institutional weekly off')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleWeeklyPattern(p.dayOfWeek, p.isWorkingDay)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                    p.isWorkingDay
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  {p.isWorkingDay ? 'Working Day' : 'Weekly Off'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD SINGLE DAY ENTRY */}
      {showAddSingleModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Add Calendar Entry</h3>
            <p className="text-xs text-slate-500 mt-1">Declare a holiday, event, or special working day.</p>

            <form onSubmit={handleCreateSingle} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700">Date *</label>
                <input
                  type="date"
                  required
                  value={singleForm.date}
                  onChange={(e) => setSingleForm({ ...singleForm, date: e.target.value })}
                  className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Day Classification *</label>
                <select
                  value={singleForm.dayType}
                  onChange={(e) => {
                    const dt = e.target.value as CalendarDayType;
                    let isWorking = singleForm.isWorkingDay;
                    if (dt === 'SPECIAL_WORKING_DAY') isWorking = true;
                    if (dt === 'PUBLIC_HOLIDAY' || dt === 'WEEKLY_OFF') isWorking = false;
                    setSingleForm({ ...singleForm, dayType: dt, isWorkingDay: isWorking });
                  }}
                  className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="PUBLIC_HOLIDAY">Public Holiday (Non-working)</option>
                  <option value="RESTRICTED_HOLIDAY">Restricted Holiday (Elective)</option>
                  <option value="SPECIAL_WORKING_DAY">Special Working Day (Overrides weekly off)</option>
                  <option value="INSTITUTIONAL_EVENT">Institutional Event</option>
                  <option value="ACADEMIC_EVENT">Academic Event</option>
                  <option value="EXAMINATION">Examination</option>
                  <option value="VACATION">Vacation</option>
                  <option value="WEEKLY_OFF">Weekly Off</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Title / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kannada Rajyotsava, Internal Assessment"
                  value={singleForm.title}
                  onChange={(e) => setSingleForm({ ...singleForm, title: e.target.value })}
                  className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or VTU notification ref..."
                  value={singleForm.description}
                  onChange={(e) => setSingleForm({ ...singleForm, description: e.target.value })}
                  className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                <span className="text-xs font-medium text-slate-700">Is Working Day?</span>
                <input
                  type="checkbox"
                  checked={singleForm.isWorkingDay}
                  disabled={singleForm.dayType === 'PUBLIC_HOLIDAY' || singleForm.dayType === 'SPECIAL_WORKING_DAY'}
                  onChange={(e) => setSingleForm({ ...singleForm, isWorkingDay: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddSingleModal(false)}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD DATE-RANGE ENTRY */}
      {showAddRangeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Date-Range Calendar Entry</h3>
            <p className="text-xs text-slate-500 mt-1">Configure vacations, exam periods, or institutional closures.</p>

            <form onSubmit={handleCreateRange} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={rangeForm.startDate}
                    onChange={(e) => setRangeForm({ ...rangeForm, startDate: e.target.value })}
                    className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">End Date *</label>
                  <input
                    type="date"
                    required
                    value={rangeForm.endDate}
                    onChange={(e) => setRangeForm({ ...rangeForm, endDate: e.target.value })}
                    className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Type *</label>
                <select
                  value={rangeForm.dayType}
                  onChange={(e) => setRangeForm({ ...rangeForm, dayType: e.target.value as CalendarDayType })}
                  className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="VACATION">Vacation (e.g. Mid-term / Winter)</option>
                  <option value="EXAMINATION">Examination Period</option>
                  <option value="INSTITUTIONAL_EVENT">Institutional Closure / Event</option>
                  <option value="ACADEMIC_EVENT">Academic Period</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Semester Vacation, VTU Semester Exams"
                  value={rangeForm.title}
                  onChange={(e) => setRangeForm({ ...rangeForm, title: e.target.value })}
                  className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                <span className="text-xs font-medium text-slate-700">Is Working Period?</span>
                <input
                  type="checkbox"
                  checked={rangeForm.isWorkingDay}
                  onChange={(e) => setRangeForm({ ...rangeForm, isWorkingDay: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddRangeModal(false)}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Create Range Entries
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ACADEMIC YEAR */}
      {showAddYearModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Create Academic Year</h3>
            <p className="text-xs text-slate-500 mt-1">Define institutional cycle.</p>

            <form onSubmit={handleCreateYear} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700">Year Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026–27"
                  value={yearForm.name}
                  onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
                  className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={yearForm.startDate}
                    onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                    className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">End Date *</label>
                  <input
                    type="date"
                    required
                    value={yearForm.endDate}
                    onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                    className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="markCurYear"
                  checked={yearForm.isCurrent}
                  onChange={(e) => setYearForm({ ...yearForm, isCurrent: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="markCurYear" className="text-xs font-medium text-slate-700">
                  Mark as current active academic year
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(false)}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Create Year
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SEMESTER */}
      {showAddSemesterModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Create Semester</h3>
            <p className="text-xs text-slate-500 mt-1">Configure Odd/Even semester dates.</p>

            <form onSubmit={handleCreateSemester} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700">Semester Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Odd Semester 2026–27"
                  value={semesterForm.name}
                  onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })}
                  className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Type *</label>
                  <select
                    value={semesterForm.type}
                    onChange={(e) => setSemesterForm({ ...semesterForm, type: e.target.value as 'ODD' | 'EVEN' })}
                    className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ODD">Odd Semester</option>
                    <option value="EVEN">Even Semester</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Academic Year *</label>
                  <select
                    value={semesterForm.academicYearId}
                    onChange={(e) => setSemesterForm({ ...semesterForm, academicYearId: e.target.value })}
                    className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>{ay.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={semesterForm.startDate}
                    onChange={(e) => setSemesterForm({ ...semesterForm, startDate: e.target.value })}
                    className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">End Date *</label>
                  <input
                    type="date"
                    required
                    value={semesterForm.endDate}
                    onChange={(e) => setSemesterForm({ ...semesterForm, endDate: e.target.value })}
                    className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="markCurSem"
                  checked={semesterForm.isCurrent}
                  onChange={(e) => setSemesterForm({ ...semesterForm, isCurrent: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="markCurSem" className="text-xs font-medium text-slate-700">
                  Mark as active current semester
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddSemesterModal(false)}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Create Semester
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD RESTRICTED HOLIDAY */}
      {showAddRhModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Add Restricted Holiday (RH)</h3>
            <p className="text-xs text-slate-500 mt-1">Declare an elective holiday in the institutional master.</p>

            <form onSubmit={handleCreateRh} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700">Holiday Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Varamahalakshmi Vrata, Muharram"
                  value={rhForm.name}
                  onChange={(e) => setRhForm({ ...rhForm, name: e.target.value })}
                  className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Date *</label>
                <input
                  type="date"
                  required
                  value={rhForm.date}
                  onChange={(e) => setRhForm({ ...rhForm, date: e.target.value })}
                  className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Eligible Staff Category</label>
                <select
                  value={rhForm.eligibleEmployeeTypes}
                  onChange={(e) => setRhForm({ ...rhForm, eligibleEmployeeTypes: e.target.value })}
                  className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                >
                  <option value="ALL">All Employees</option>
                  <option value="TEACHING">Teaching Staff Only</option>
                  <option value="NON_TEACHING">Non-Teaching Staff Only</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddRhModal(false)}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
                >
                  Save Restricted Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DAY DETAIL / EDIT */}
      {selectedDay && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border ${DAY_TYPE_CONFIG[selectedDay.dayType]?.badgeClass || ''}`}>
                  {DAY_TYPE_CONFIG[selectedDay.dayType]?.label || selectedDay.dayType}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">{selectedDay.title ?? 'No Title'}</h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">{selectedDay.date.split('T')[0]}</p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs border-t border-slate-100 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Working Day Status:</span>
                <span className={`font-semibold ${selectedDay.isWorkingDay ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {selectedDay.isWorkingDay ? 'Working Day' : 'Non-Working Day'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scope:</span>
                <span className="text-slate-800">{selectedDay.department?.name || selectedDay.appliesToEmployeeType || 'Institution-wide'}</span>
              </div>
              {selectedDay.description && (
                <div className="mt-2 p-2 bg-slate-50 rounded text-slate-600">
                  {selectedDay.description}
                </div>
              )}
            </div>

            {canManage && (
              <div className="mt-5 pt-3 border-t border-slate-200 flex justify-between">
                <button
                  onClick={() => handleDeleteDay(selectedDay.id)}
                  className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Entry
                </button>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
