import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAcademicWorkflow } from '@/features/leave/useAcademicWorkflow';
import { initialSettings } from '@/data/mock/settings';
import { Building2, Clock, Bell, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const workflow = useAcademicWorkflow();
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [settings, setSettings] = useState(initialSettings);

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    toast.success('Settings saved for this session.');
  }

  function handleConfirmReset() {
    workflow.resetDemoData();
    setResetModalOpen(false);
  }

  return (
    <PageTransition>
      <PageHeader
        title="Settings & Institutional Rules"
        description="Configure academic parameters, VTU workload thresholds, and system preferences."
      />

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Workflow data reset */}
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-foreground">
                  Reset workflow data
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                Restore leave requests, substitute assignments, notifications,
                and counts to their starting state.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              className="gap-2 self-start sm:self-auto"
              onClick={() => setResetModalOpen(true)}
            >
              <RotateCcw className="h-4 w-4" />
              Reset data
            </Button>
          </div>
        </div>

        {/* Section 1: General Campus Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">
                General Institution Settings
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Affiliation parameters and active academic calendar period.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">College Name</Label>
              <Input
                value={settings.general.collegeName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: {
                      ...settings.general,
                      collegeName: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Campus Location</Label>
              <Input
                value={settings.general.campusLocation}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: {
                      ...settings.general,
                      campusLocation: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">University Affiliation</Label>
              <Input
                value={settings.general.affiliation}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: {
                      ...settings.general,
                      affiliation: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Academic Year & Semester</Label>
              <Input
                value={`${settings.general.academicYear} · ${settings.general.currentSemester}`}
                readOnly
                className="bg-muted/40 font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: HR Rules & Workload Limits */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">
                HR Rules & VTU Workload Thresholds
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Weekly teaching hour maximums governing the Smart Substitution
              engine.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Assistant Professor Cap</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.hrRules.workloadAssistantProf}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      hrRules: {
                        ...settings.hrRules,
                        workloadAssistantProf: Number(e.target.value),
                      },
                    })
                  }
                  className="font-mono text-xs"
                />
                <span className="text-xs text-muted-foreground">hrs/wk</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Associate Professor Cap</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.hrRules.workloadAssociateProf}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      hrRules: {
                        ...settings.hrRules,
                        workloadAssociateProf: Number(e.target.value),
                      },
                    })
                  }
                  className="font-mono text-xs"
                />
                <span className="text-xs text-muted-foreground">hrs/wk</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Professor & HOD Cap</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.hrRules.workloadProfessor}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      hrRules: {
                        ...settings.hrRules,
                        workloadProfessor: Number(e.target.value),
                      },
                    })
                  }
                  className="font-mono text-xs"
                />
                <span className="text-xs text-muted-foreground">hrs/wk</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Leave Approval Hierarchy</Label>
              <Input
                value={settings.hrRules.leaveApprovalLevels}
                readOnly
                className="bg-muted/40 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Standard Campus Working Hours</Label>
              <Input
                value={`${settings.hrRules.workingHoursStart} – ${settings.hrRules.workingHoursEnd}`}
                readOnly
                className="bg-muted/40 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Minimum Biometric Attendance</Label>
              <Input
                value={`${settings.hrRules.minimumAttendanceThreshold}%`}
                readOnly
                className="bg-muted/40 text-xs font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Notification Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">
                Notification Delivery Channels
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Delivery preferences for leave requests, substitution allocations,
              and circulars.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label
                  className="text-xs font-semibold cursor-pointer"
                  htmlFor="email-notif"
                >
                  Email Notifications
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Send immediate email dispatch to substitute faculty when class
                  reassignment is confirmed.
                </p>
              </div>
              <Checkbox
                id="email-notif"
                checked={settings.notifications.emailAlerts}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: {
                      ...settings.notifications,
                      emailAlerts: Boolean(checked),
                    },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label
                  className="text-xs font-semibold cursor-pointer"
                  htmlFor="inapp-notif"
                >
                  In-App Notification Alerts
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Display real-time badge updates and activity logs in the
                  Topbar bell dropdown.
                </p>
              </div>
              <Checkbox
                id="inapp-notif"
                checked={settings.notifications.inAppNotifications}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: {
                      ...settings.notifications,
                      inAppNotifications: Boolean(checked),
                    },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label
                  className="text-xs font-semibold cursor-pointer"
                  htmlFor="push-notif"
                >
                  Mobile SMS & WhatsApp Circulars
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Send high-priority SMS alerts for urgent timetable changes or
                  college declarations.
                </p>
              </div>
              <Checkbox
                id="push-notif"
                checked={settings.notifications.mobilePush}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: {
                      ...settings.notifications,
                      mobilePush: Boolean(checked),
                    },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" className="gap-2">
            <Save className="h-4 w-4" />
            Save Configuration
          </Button>
        </div>
      </form>

      {/* Confirmation dialog for workflow data reset */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset workflow data?</DialogTitle>
            <DialogDescription>
              This restores all leave requests to their starting state, removes
              substitute assignments, and resets counts.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setResetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmReset}>
              Reset data
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
