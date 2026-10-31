import { useState } from 'react';
import { ArrowLeftRight, Check, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface MutualSwapItem {
  id: string;
  requester: string;
  mySlot: string;
  partner: string;
  partnerSlot: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
}

const STORAGE_KEY = 'campushr-mutual-swaps-v1';

const INITIAL_SWAPS: MutualSwapItem[] = [
  {
    id: 'swap-1',
    requester: 'Prof. Asha Patil',
    mySlot: 'Mon · Period 2 · BCS501 (CSE 5A)',
    partner: 'Prof. Priya Kulkarni',
    partnerSlot: 'Wed · Period 4 · BCS502 (CSE 5A)',
    reason: 'VTU BoE valuation meeting on Monday morning.',
    status: 'PENDING',
  },
  {
    id: 'swap-2',
    requester: 'Prof. Ravi Hegde',
    mySlot: 'Tue · Period 3 · BCS301 (CSE 3B)',
    partner: 'Dr. Rahul Deshpande',
    partnerSlot: 'Thu · Period 2 · BCS304 (CSE 3B)',
    reason: 'NBA Criterion 3 documentation review.',
    status: 'APPROVED',
  },
];

function loadSwaps(): MutualSwapItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MutualSwapItem[];
  } catch {
    // Ignore storage errors
  }
  return INITIAL_SWAPS;
}

function saveSwaps(items: MutualSwapItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
}

export function MutualClassSwapCard({
  canDecide = false,
  currentUserName = 'Faculty Member',
}: {
  canDecide?: boolean;
  currentUserName?: string;
}) {
  const [swaps, setSwaps] = useState<MutualSwapItem[]>(loadSwaps);
  const [openForm, setOpenForm] = useState(false);
  const [mySlot, setMySlot] = useState('');
  const [partner, setPartner] = useState('');
  const [partnerSlot, setPartnerSlot] = useState('');
  const [reason, setReason] = useState('');

  function updateSwaps(next: MutualSwapItem[]) {
    setSwaps(next);
    saveSwaps(next);
  }

  function handlePropose(e: React.FormEvent) {
    e.preventDefault();
    if (!mySlot.trim() || !partner.trim() || !partnerSlot.trim()) {
      toast.error('Fill in both class slots and the partner faculty name.');
      return;
    }
    const created: MutualSwapItem = {
      id: `swap-${Date.now()}`,
      requester: currentUserName,
      mySlot: mySlot.trim(),
      partner: partner.trim(),
      partnerSlot: partnerSlot.trim(),
      reason: reason.trim() || 'Mutual period exchange',
      status: 'PENDING',
    };
    updateSwaps([created, ...swaps]);
    setMySlot('');
    setPartner('');
    setPartnerSlot('');
    setReason('');
    setOpenForm(false);
    toast.success('Mutual class swap request submitted.');
  }

  function decide(id: string, status: 'APPROVED' | 'DECLINED') {
    updateSwaps(
      swaps.map((item) => (item.id === id ? { ...item, status } : item)),
    );
    toast.success(
      status === 'APPROVED'
        ? 'Mutual class swap approved.'
        : 'Mutual class swap declined.',
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="size-4 text-primary" />
            <div>
              <CardTitle className="text-base">
                Mutual Class Swap (Peer Period Exchange)
              </CardTitle>
              <CardDescription className="text-xs">
                Exchange scheduled periods directly with a colleague without
                consuming leave balance.
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant={openForm ? 'outline' : 'default'}
            size="sm"
            onClick={() => setOpenForm((prev) => !prev)}
          >
            <Plus className="size-4" />
            {openForm ? 'Cancel' : 'Propose class swap'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {openForm && (
          <form
            onSubmit={handlePropose}
            className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="swap-my-slot" className="text-xs">
                Your class slot
              </Label>
              <Input
                id="swap-my-slot"
                placeholder="e.g. Mon · Period 2 · BCS501 (CSE 5A)"
                value={mySlot}
                onChange={(e) => setMySlot(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="swap-partner" className="text-xs">
                Colleague faculty name
              </Label>
              <Input
                id="swap-partner"
                placeholder="e.g. Prof. Priya Kulkarni"
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="swap-partner-slot" className="text-xs">
                Colleague’s class slot to exchange
              </Label>
              <Input
                id="swap-partner-slot"
                placeholder="e.g. Thu · Period 4 · BCS502 (CSE 5A)"
                value={partnerSlot}
                onChange={(e) => setPartnerSlot(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="swap-reason" className="text-xs">
                Reason / academic note
              </Label>
              <Input
                id="swap-reason"
                placeholder="e.g. Lab equipment setup / VTU meeting"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="submit" size="sm">
                Submit swap request
              </Button>
            </div>
          </form>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {swaps.map((swap) => (
            <div
              key={swap.id}
              className="flex flex-col justify-between gap-2.5 rounded-xl border bg-card p-3.5 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {swap.requester} ⇄ {swap.partner}
                </span>
                <Badge
                  variant="outline"
                  className={
                    swap.status === 'APPROVED'
                      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-800'
                      : swap.status === 'DECLINED'
                        ? 'border-red-500/30 bg-red-500/15 text-red-800'
                        : 'border-amber-500/30 bg-amber-500/15 text-amber-800'
                  }
                >
                  {swap.status}
                </Badge>
              </div>
              <div className="grid gap-1 rounded-lg bg-muted/40 p-2.5 text-xs">
                <div>
                  <span className="font-medium text-muted-foreground">
                    Gives:{' '}
                  </span>
                  <span className="font-mono text-foreground">
                    {swap.mySlot}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Takes:{' '}
                  </span>
                  <span className="font-mono text-foreground">
                    {swap.partnerSlot}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {swap.reason}
                </span>
                {canDecide && swap.status === 'PENDING' && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => decide(swap.id, 'APPROVED')}
                    >
                      <Check className="size-3.5" />
                      Approve swap
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-destructive"
                      onClick={() => decide(swap.id, 'DECLINED')}
                    >
                      <X className="size-3.5" />
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
