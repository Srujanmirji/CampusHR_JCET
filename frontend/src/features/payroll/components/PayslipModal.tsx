import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { employees } from '@/data/mock/employees';
import type { PayrollRecord } from '@/types/academic';
import { Printer, Landmark } from 'lucide-react';
import { toast } from 'sonner';

interface PayslipModalProps {
  record: PayrollRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayslipModal({ record, open, onOpenChange }: PayslipModalProps) {
  if (!record) return null;

  const faculty = employees.find((e) => e.id === record.employeeId);
  if (!faculty) return null;

  function formatRupees(amount: number) {
    return '₹' + amount.toLocaleString('en-IN');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold">
                Jain College of Engineering & Technology
              </DialogTitle>
              <DialogDescription className="text-xs">
                Hubballi · Salary Payslip for {record.month}
              </DialogDescription>
            </div>
            <Badge variant="outline" className="border-amber-400 bg-amber-500/10 text-amber-700">
              Demo Preview
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Employee Metadata */}
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3">
            <div>
              <span className="text-muted-foreground">Employee Name:</span>
              <p className="font-bold text-foreground text-sm">{faculty.name}</p>
              <span className="text-muted-foreground">Designation:</span>
              <p className="font-medium text-foreground">{faculty.designation}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Employee ID:</span>
              <p className="font-mono font-bold text-foreground">{faculty.id}</p>
              <span className="text-muted-foreground">Department:</span>
              <p className="font-medium text-foreground">{faculty.department}</p>
            </div>
          </div>

          {/* Earnings vs Deductions Table */}
          <div className="grid grid-cols-2 gap-4">
            {/* Earnings */}
            <div className="rounded-lg border p-3">
              <h5 className="mb-2 font-semibold uppercase text-emerald-700 dark:text-emerald-400 text-[11px]">
                Earnings (Gross)
              </h5>
              <div className="space-y-1.5">
                <div className="flex justify-between border-b pb-1">
                  <span>Basic Pay:</span>
                  <span className="font-mono font-medium">{formatRupees(record.basicSalary)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>HRA (House Rent):</span>
                  <span className="font-mono font-medium">{formatRupees(record.hra)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>DA (Dearness Allowance):</span>
                  <span className="font-mono font-medium">{formatRupees(record.da)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Special Allowance:</span>
                  <span className="font-mono font-medium">{formatRupees(record.allowances)}</span>
                </div>
                <div className="flex justify-between pt-1 font-bold">
                  <span>Total Gross:</span>
                  <span className="font-mono text-emerald-600">{formatRupees(record.grossSalary)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="rounded-lg border p-3">
              <h5 className="mb-2 font-semibold uppercase text-red-700 dark:text-red-400 text-[11px]">
                Statutory Deductions
              </h5>
              <div className="space-y-1.5">
                <div className="flex justify-between border-b pb-1">
                  <span>Provident Fund (PF):</span>
                  <span className="font-mono font-medium">{formatRupees(record.pf)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Professional Tax (PT):</span>
                  <span className="font-mono font-medium">{formatRupees(record.pt)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Tax Deducted (TDS):</span>
                  <span className="font-mono font-medium">{formatRupees(record.tds)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>LOP / Loss of Pay:</span>
                  <span className="font-mono font-medium">₹0</span>
                </div>
                <div className="flex justify-between pt-1 font-bold">
                  <span>Total Deductions:</span>
                  <span className="font-mono text-red-600">{formatRupees(record.deductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay Callout */}
          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3.5">
            <div>
              <span className="font-semibold text-xs text-muted-foreground">Net Salary Payable</span>
              <div className="text-xl font-bold text-foreground">{formatRupees(record.netSalary)}</div>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Landmark className="h-3 w-3" />
                <span>Mode: {record.paymentMode}</span>
              </div>
              <span className="font-mono">{record.accountNumber}</span>
            </div>
          </div>

          <p className="text-[11px] italic text-muted-foreground text-center">
            Notice: Prototype payroll values are fictional and shown only for UI demonstration.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.info('Printing payslip PDF will be enabled after backend integration.', {
                id: 'print-ps',
              })
            }
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
