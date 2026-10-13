export interface AppSettings {
  general: {
    collegeName: string;
    campusLocation: string;
    affiliation: string;
    academicYear: string;
    currentSemester: string;
    collegeCode: string;
  };
  hrRules: {
    workloadAssistantProf: number;
    workloadAssociateProf: number;
    workloadProfessor: number;
    leaveApprovalLevels: string;
    workingHoursStart: string;
    workingHoursEnd: string;
    biometricGracePeriodMinutes: number;
    minimumAttendanceThreshold: number;
  };
  notifications: {
    emailAlerts: boolean;
    inAppNotifications: boolean;
    mobilePush: boolean;
    weeklyDigest: boolean;
  };
}

export const initialSettings: AppSettings = {
  general: {
    collegeName: 'Jain College of Engineering and Technology, Hubballi',
    campusLocation: 'Hubballi, Karnataka - 580030',
    affiliation: 'Visvesvaraya Technological University (VTU), Belagavi',
    academicYear: '2026–2027',
    currentSemester: 'Odd Semester (3rd, 5th, 7th Semesters)',
    collegeCode: 'JCET-HBL',
  },
  hrRules: {
    workloadAssistantProf: 18,
    workloadAssociateProf: 16,
    workloadProfessor: 14,
    leaveApprovalLevels: 'Single Level (HOD Approval)',
    workingHoursStart: '08:30 AM',
    workingHoursEnd: '04:30 PM',
    biometricGracePeriodMinutes: 15,
    minimumAttendanceThreshold: 75,
  },
  notifications: {
    emailAlerts: true,
    inAppNotifications: true,
    mobilePush: false,
    weeklyDigest: true,
  },
};
