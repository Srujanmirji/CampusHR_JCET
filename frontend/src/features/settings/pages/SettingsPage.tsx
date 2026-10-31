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
import { initialSettings } from '@/data/mock/settings';
import { Building2, Clock, Bell, Save, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [settings, setSettings] = useState(initialSettings);
  const [appearance, setAppearance] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );

  function applyAppearance(next: 'light' | 'dark') {
    setAppearance(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="color-scheme"]',
    );
    if (meta) meta.content = next;
    try {
      localStorage.setItem('campushr-color-scheme', next);
    } catch {
      // Ignore storage blocks
    }
  }

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    toast.success('Settings saved for this session.');
  }

  return (
    <PageTransition>
      <PageHeader
        title="Settings & Institutional Rules"
        description="Configure academic parameters, VTU workload thresholds, and system preferences."
      />

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 0: Apple Appearance Mode */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {appearance === 'dark' ? (
                <Moon className="h-4 w-4 text-primary" />
              ) : (
                <Sun className="h-4 w-4 text-primary" />
              )}
              <CardTitle className="text-base">Appearance</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Switch between Apple Light and Dark appearance modes for this
              browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant={appearance === 'light' ? 'default' : 'outline'}
              onClick={() => applyAppearance('light')}
            >
              <Sun className="h-4 w-4" />
              Light Appearance
            </Button>
            <Button
              type="button"
              variant={appearance === 'dark' ? 'default' : 'outline'}
              onClick={() => applyAppearance('dark')}
            >
              <Moon className="h-4 w-4" />
              Dark Appearance
            </Button>
          </CardContent>
        </Card>

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
    </PageTransition>
  );
}
