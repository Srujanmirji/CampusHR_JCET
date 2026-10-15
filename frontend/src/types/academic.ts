export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';
export type Department = 'CSE' | 'ECE' | 'ME' | 'CE' | 'AI & ML' | 'MBA';
export type EmploymentType = 'Permanent' | 'Contract' | 'Probationary';
export type EmployeeStatus = 'Active' | 'On Leave' | 'Available';

export interface Employee {
  id: string;
  name: string;
  initials: string;
  department: Department;
  designation: string;
  employmentType: EmploymentType;
  joiningDate: string;
  email: string;
  phone: string;
  status: EmployeeStatus;
  qualification: string;
  experience: string;
  specialization: string;
  subjectsHandled: string[];
  teachingStaff: boolean;
  photo?: string;
  bio?: string;
}

export interface DepartmentInfo {
  code: Department;
  name: string;
  hod: string;
  hodId: string;
  employees: number;
  teaching: number;
  nonTeaching: number;
  attendanceRate: number;
  description: string;
}

export type AttendanceStatus =
  'Present' | 'Late' | 'Absent' | 'On Leave' | 'Half Day';

export interface AttendanceRecord {
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workingHours: string;
  status: AttendanceStatus;
  shift: string;
  biometricTerminal: string;
}

export interface TimetableClass {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  timeSlot: string;
  timeRange: string;
  startHour: number;
  endHour: number;
  subjectCode: string;
  subject: string;
  facultyId: string;
  facultyName: string;
  room: string;
  cohort: string;
  semester: string;
  department: Department;
  isLab?: boolean;
  batch?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: 'Casual Leave' | 'Medical Leave' | 'Earned Leave';
  start: string;
  end: string;
  days: number;
  reason: string;
  balance: { casual: number; medical: number; earned: number };
  history: { date: string; type: string; days: number }[];
  status: LeaveStatus;
}

export interface AffectedClass {
  id: string;
  leaveId: string;
  date: string;
  subject: string;
  shortSubject: string;
  cohort: string;
  start: number;
  end: number;
  room: string;
  department: Department;
  hours: number;
  candidateIds: string[];
}

export interface FacultyExpertise {
  facultyId: string;
  subject: string;
  workload: number;
  capacity: number;
  semesters: number;
  available: { start: number; end: number }[];
  points: {
    subject: number;
    availability: number;
    department: number;
    workload: number;
    experience: number;
  };
}

export type Coverage =
  { kind: 'faculty'; facultyId: string } | { kind: 'waived'; reason: string };

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  unread?: boolean;
  category?: 'Leave' | 'Timetable' | 'Attendance' | 'System';
}

export interface WorkflowState {
  version: 1;
  statuses: Record<string, LeaveStatus>;
  coverage: Record<string, Coverage>;
  rejectionReasons: Record<string, string>;
  activeLeaveId: string | null;
  notifications: AppNotification[];
}
