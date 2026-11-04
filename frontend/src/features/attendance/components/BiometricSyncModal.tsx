import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Fingerprint,
  Radio,
  UploadCloud,
  CheckCircle2,
  RefreshCw,
  Server,
  FileSpreadsheet,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getBiometricDevices,
  getBiometricStats,
  syncBiometricPunches,
  importBiometricRows,
  type BiometricSyncResult,
  type BiometricImportResult,
} from '../api/attendance';

interface BiometricSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BiometricSyncModal({
  open,
  onOpenChange,
}: BiometricSyncModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'terminals' | 'import'>(
    'terminals',
  );
  const [copiedKey, setCopiedKey] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [syncResult, setSyncResult] = useState<
    BiometricSyncResult | BiometricImportResult | null
  >(null);

  // 1. Fetch devices
  const {
    data: devices,
    isLoading: devicesLoading,
    refetch: refetchDevices,
  } = useQuery({
    queryKey: ['biometric', 'devices'],
    queryFn: getBiometricDevices,
    enabled: open,
  });

  // 2. Fetch stats
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['biometric', 'stats'],
    queryFn: getBiometricStats,
    enabled: open,
  });

  // 3. Test terminal punch sync mutation
  const syncMutation = useMutation({
    mutationFn: () => {
      const now = new Date();
      const checkInTime = new Date(now);
      checkInTime.setHours(9, 5, 0, 0);

      return syncBiometricPunches({
        deviceId: 'JCET-BIO-01',
        location: 'Main Gate Terminal',
        punches: [
          {
            employeeCode: 'JCET-CSE-001',
            timestamp: checkInTime.toISOString(),
            punchType: 'AUTO',
            verificationType: 'FINGERPRINT',
          },
        ],
      });
    },
    onSuccess: (data) => {
      setSyncResult(data);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['biometric'] });
      toast.success(
        `Synced ${data.syncedCount} punch(es) from Terminal successfully.`,
      );
    },
    onError: (err: Error) => {
      toast.error(`Sync failed: ${err.message}`);
    },
  });

  // 4. Batch file import mutation
  const importMutation = useMutation({
    mutationFn: async (text: string) => {
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('employeeCode'));

      if (!lines.length) {
        throw new Error('Please enter at least one attendance row.');
      }

      const rows = lines.map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        const [employeeCode, date, checkIn, checkOut, status, notes] = parts;
        return {
          employeeCode,
          date,
          checkIn: checkIn || undefined,
          checkOut: checkOut || undefined,
          status: status as
            'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE' | 'LATE' | undefined,
          notes: notes || 'Log file import',
        };
      });

      return importBiometricRows({
        deviceId: 'CSV_BATCH_INGEST',
        rows,
      });
    },
    onSuccess: (data) => {
      setSyncResult(data);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['biometric'] });
      toast.success(
        `Imported ${data.importedCount} attendance row(s) successfully.`,
      );
      setCsvContent('');
    },
    onError: (err: Error) => {
      toast.error(`Import failed: ${err.message}`);
    },
  });

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/api/v1/attendance/biometric/sync`,
    );
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast.success('Machine webhook URL copied to clipboard.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setCsvContent(content);
    };
    reader.readAsText(file);
    toast.info(`Loaded file: ${file.name}`);
  };

  const loadSampleCsv = () => {
    const today = new Date().toISOString().split('T')[0];
    const sample = `employeeCode,date,checkIn,checkOut,status,notes\nJCET-CSE-001,${today},${today}T08:58:00.000Z,${today}T17:15:00.000Z,PRESENT,Morning Shift\nJCET-CSE-002,${today},${today}T09:22:00.000Z,${today}T17:05:00.000Z,LATE,Traffic delay\nJCET-ECE-001,${today},${today}T09:02:00.000Z,${today}T13:00:00.000Z,HALF_DAY,Afternoon official duty`;
    setCsvContent(sample);
    toast.info('Sample biometric CSV data inserted.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Biometric Machine Sync & Devices</DialogTitle>
              <DialogDescription>
                Live campus biometric terminal monitoring, push webhook
                listener, and attendance log ingestion.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Sync Summary Banner */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg border text-sm">
          <div>
            <span className="text-xs text-muted-foreground block">
              Biometric Check-ins Today
            </span>
            <span className="text-xl font-bold text-foreground">
              {statsLoading ? '...' : (stats?.todayBiometricCount ?? 0)}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">
              Active Terminals
            </span>
            <span className="text-xl font-bold text-emerald-600 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-500" />
              {statsLoading ? '...' : `${stats?.activeDevicesCount ?? 5}/5`}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">
              Last Sync Time
            </span>
            <span className="text-xs font-medium text-foreground">
              {stats?.lastSyncTime
                ? new Date(stats.lastSyncTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Active Today'}
            </span>
          </div>
        </div>

        {/* Sync Result Feedback Banner */}
        {syncResult && (
          <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm">
            <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Sync Operation Complete
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
              Processed{' '}
              {'syncedCount' in syncResult
                ? syncResult.syncedCount
                : syncResult.importedCount}{' '}
              punches/records.
              {syncResult.unmatchedCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400 ml-1">
                  ({syncResult.unmatchedCount} unmatched employee codes:{' '}
                  {syncResult.unmatchedCodes.join(', ')})
                </span>
              )}
            </p>
          </div>
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'terminals' | 'import')}
        >
          <TabsList className="grid grid-cols-2">
            <TabsTrigger
              value="terminals"
              className="flex items-center gap-1.5"
            >
              <Server className="h-4 w-4" />
              Campus Terminals ({devices?.length || 5})
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4" />
              Log File Import (eSSL / ZKTeco)
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: TERMINALS & LIVE SYNC */}
          <TabsContent value="terminals" className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Registered physical attendance machines at JCET campus
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    refetchDevices();
                    refetchStats();
                  }}
                  disabled={devicesLoading}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {syncMutation.isPending ? (
                    <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Fingerprint className="h-3.5 w-3.5 mr-1" />
                  )}
                  Test Terminal Sync
                </Button>
              </div>
            </div>

            {/* Device Cards */}
            <div className="grid gap-2.5 sm:grid-cols-2">
              {devices?.map((dev) => (
                <div
                  key={dev.id}
                  className="p-3 border rounded-lg bg-card/60 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                        {dev.name}
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200"
                        >
                          <Radio className="h-2 w-2 mr-1 animate-pulse text-emerald-500" />
                          ONLINE
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {dev.location}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>IP: {dev.ipAddress}</span>
                    <span>Model: {dev.model}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Hardware Webhook Instructions */}
            <div className="p-3.5 rounded-lg border bg-muted/30 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Machine Sync Webhook Configuration (IT Admin)
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyWebhook}
                  className="h-7 text-xs"
                >
                  {copiedKey ? (
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-1" />
                  )}
                  Copy Endpoint
                </Button>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Configure your campus eSSL eTimeTrackLite Sync Agent or ZKTeco
                Push SDK to forward punches to:
              </p>
              <div className="font-mono bg-background p-2 rounded border text-[11px] overflow-x-auto text-foreground">
                POST /api/v1/attendance/biometric/sync
                <br />
                Header: x-biometric-key: jcet-biometric-terminal-secret-2026
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: CSV/DAT LOG FILE IMPORT */}
          <TabsContent value="import" className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">
                  Upload CSV or Raw Terminal Log File
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={loadSampleCsv}
                  className="h-7 text-xs text-primary"
                >
                  Fill Sample Template
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".csv,.txt,.dat"
                  onChange={handleFileUpload}
                  className="text-xs cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground">
                  Format: employeeCode, date, checkIn, checkOut, status, notes
                </span>
                <Textarea
                  placeholder="JCET-CSE-001, 2026-11-04, 2026-11-04T09:00:00Z, 2026-11-04T17:15:00Z, PRESENT, Main Shift"
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  rows={6}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCsvContent('')}
                disabled={!csvContent}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() => importMutation.mutate(csvContent)}
                disabled={!csvContent || importMutation.isPending}
                className="bg-primary text-primary-foreground"
              >
                {importMutation.isPending ? (
                  <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <UploadCloud className="h-3.5 w-3.5 mr-1" />
                )}
                Ingest Attendance Rows
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
