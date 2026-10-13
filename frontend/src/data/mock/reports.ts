export interface ReportCategory {
  id: string;
  title: string;
  category: string;
  description: string;
  badge?: string;
  metricLabel: string;
  metricValue: string;
  iconName: string;
  updatedAt: string;
}

export const reportCategories: ReportCategory[] = [
  {
    id: 'academic-continuity',
    title: 'Academic Continuity Report',
    category: 'Academics & Operations',
    description:
      'Tracks teaching continuity, affected lectures due to faculty leaves, Smart Substitution assignments, and coverage efficiency.',
    badge: 'Key Executive KPI',
    metricLabel: 'Coverage Rate',
    metricValue: '94%',
    iconName: 'Repeat2',
    updatedAt: 'Updated 20 mins ago',
  },
  {
    id: 'attendance-analytics',
    title: 'Attendance Report',
    category: 'Workforce & Compliance',
    description:
      'Daily biometric check-ins, late arrivals, half-day leaves, and department-wise attendance averages across campus.',
    metricLabel: 'Campus Attendance',
    metricValue: '94.2%',
    iconName: 'CalendarCheck2',
    updatedAt: 'Updated Today 08:30 AM',
  },
  {
    id: 'leave-analytics',
    title: 'Leave Analytics & Trends',
    category: 'HR Management',
    description:
      'Monthly distribution of Casual, Medical, and Earned leaves, departmental absence frequencies, and quota utilization.',
    metricLabel: 'Monthly Leave Days',
    metricValue: '38 Days',
    iconName: 'CalendarDays',
    updatedAt: 'October 2026 cycle',
  },
  {
    id: 'faculty-workload',
    title: 'Faculty Workload Distribution',
    category: 'Academics & Accreditation',
    description:
      'Audit of VTU/AICTE teaching hours per week across Professors, Associate Professors, and Assistant Professors.',
    metricLabel: 'Faculty at Normal Load',
    metricValue: '81.8%',
    iconName: 'ChartNoAxesCombined',
    updatedAt: 'Weekly audit',
  },
  {
    id: 'department-strength',
    title: 'Department Strength & Cadre Ratio',
    category: 'Institutional Planning',
    description:
      'Cadre ratio breakdown (Professors to Assistant Professors), student-to-faculty ratios, and non-teaching lab staff allocations.',
    metricLabel: 'Total Headcount',
    metricValue: '186 Staff',
    iconName: 'Building2',
    updatedAt: 'Quarterly review',
  },
  {
    id: 'faculty-qualification',
    title: 'Faculty Qualification Profile',
    category: 'Accreditation',
    description:
      'Breakdown of Ph.D holders, pursuing Ph.D scholars, M.Tech specialists, and indexed publication counts for NBA/NAAC.',
    metricLabel: 'Doctorate Ratio',
    metricValue: '48.5%',
    iconName: 'GraduationCap',
    updatedAt: 'NBA Cycle 2026',
  },
  {
    id: 'payroll-summary',
    title: 'Payroll & Disbursal Summary',
    category: 'Finance & Accounts',
    description:
      'Consolidated monthly compensation, statutory PF/ESI/PT deductions, and bank transfer batches.',
    metricLabel: 'Net Disbursable',
    metricValue: '₹1.04 Cr',
    iconName: 'WalletCards',
    updatedAt: 'Draft for Oct 2026',
  },
  {
    id: 'naac-nba-reporting',
    title: 'NAAC / NBA Faculty Metric Dossier',
    category: 'Compliance & Audit',
    description:
      'Automated Criteria 2.1, 2.2, 2.4 datasets with faculty retention rate, student-teacher ratio, and sanction letters.',
    badge: 'VTU / NBA Audit',
    metricLabel: 'Audit Readiness',
    metricValue: '96%',
    iconName: 'Award',
    updatedAt: 'Autumn 2026 cycle',
  },
];

export const academicContinuityData = {
  affectedClassesThisMonth: 18,
  classesSuccessfullyCovered: 17,
  coverageRate: 94,
  uncoveredClasses: 1,
  facultyLeavesHandled: 11,
  averageResolutionTime: '18 mins',
};

export const facultyByDepartmentData = [
  { department: 'CSE', employees: 42, label: 'Computer Science' },
  { department: 'ECE', employees: 38, label: 'Electronics & Comm.' },
  { department: 'ME', employees: 28, label: 'Mechanical' },
  { department: 'CE', employees: 24, label: 'Civil' },
  { department: 'AI & ML', employees: 22, label: 'Artificial Intelligence' },
  { department: 'MBA', employees: 32, label: 'Management' },
];

export const monthlyLeaveTrends = [
  { month: 'Jun', Casual: 22, Medical: 12, Earned: 10 },
  { month: 'Jul', Casual: 18, Medical: 8, Earned: 14 },
  { month: 'Aug', Casual: 25, Medical: 14, Earned: 12 },
  { month: 'Sep', Casual: 20, Medical: 11, Earned: 9 },
  { month: 'Oct', Casual: 19, Medical: 10, Earned: 9 },
];

export const workloadDistributionData = [
  { category: 'Underloaded (<14h)', count: 14, color: '#3b82f6' },
  { category: 'Normal Load (14–16h)', count: 108, color: '#10b981' },
  { category: 'Near Limit (17h)', count: 6, color: '#f59e0b' },
  { category: 'At Capacity / Overload (18h+)', count: 4, color: '#ef4444' },
];

export const qualificationBreakdownData = [
  { qualification: 'Ph.D Degree', percentage: 48, count: 64 },
  { qualification: 'M.Tech / M.E', percentage: 44, count: 58 },
  { qualification: 'B.E / Technical Diploma', percentage: 8, count: 10 },
];
