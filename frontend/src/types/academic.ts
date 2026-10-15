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

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  unread?: boolean;
  category?: 'Leave' | 'Timetable' | 'Attendance' | 'System';
}

export interface WorkflowState {
  version: 2;
  notifications: AppNotification[];
}
