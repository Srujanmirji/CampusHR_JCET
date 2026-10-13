import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Settings,
  UserRound,
  CircleHelp,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { navigation } from '@/data/navigation';
import { mockUser } from '@/data/mock/dashboard';
import { usePreviewSession } from '@/features/auth/hooks/usePreviewSession';
import { useAcademicWorkflow } from '@/features/leave/useAcademicWorkflow';
import { GlobalSearch } from './GlobalSearch';

export function Topbar({ onOpenNavigation }: { onOpenNavigation: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const session = usePreviewSession();
  const workflow = useAcademicWorkflow();
  const profileMenuTrigger = useRef<HTMLButtonElement>(null);
  const dialogTrigger = useRef<HTMLButtonElement | null>(null);
  const [dialog, setDialog] = useState<'profile' | 'about' | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const label =
    navigation.find((item) => item.path === pathname)?.label ?? 'CampusHR';

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onOpenNavigation}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
          <div className="topbar-breadcrumb">
            <span>Workspace</span>
            <ChevronRight aria-hidden="true" />
            <strong>{label}</strong>
          </div>
        </div>
        <GlobalSearch />
        <div className="topbar-actions">
          <Badge variant="outline" className="preview-badge">
            Prototype • Demo Data
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="About this preview"
                onClick={(event) => {
                  dialogTrigger.current = event.currentTarget;
                  setDialog('about');
                }}
              >
                <CircleHelp />
              </Button>
            </TooltipTrigger>
            <TooltipContent>About this preview</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="notification-trigger"
                aria-label={`Notifications, ${workflow.unreadCount} unread`}
              >
                <Bell />
                {workflow.unreadCount > 0 && (
                  <span className="notification-count">
                    {workflow.unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="notification-menu">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Campus updates</span>
                {workflow.unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground font-normal"
                    onClick={workflow.markAllNotificationsRead}
                  >
                    Mark read
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {workflow.notifications.slice(0, 5).map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    onSelect={() => navigate('/notifications')}
                  >
                    <span className="notification-menu-item">
                      <strong>{notification.title}</strong>
                      <span>{notification.body}</span>
                      <small>{notification.time}</small>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link to="/notifications">
                    View all notifications
                    <ChevronRight />
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="topbar-divider" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="profile-trigger"
                ref={profileMenuTrigger}
                aria-label="Open Dr. Ramesh K profile menu"
              >
                <Avatar>
                  <AvatarFallback>{mockUser.initials}</AvatarFallback>
                </Avatar>
                <span className="profile-copy">
                  <strong>{mockUser.name}</strong>
                  <span>{mockUser.role}</span>
                </span>
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                HOD / Decision-Maker Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onSelect={() => {
                    dialogTrigger.current = profileMenuTrigger.current;
                    setDialog('profile');
                  }}
                >
                  <UserRound />
                  My profile
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    dialogTrigger.current = profileMenuTrigger.current;
                    setResetConfirmOpen(true);
                  }}
                >
                  <RotateCcw />
                  Reset Demo Data
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    session.logout();
                    navigate('/login', { replace: true });
                    toast.success('Signed out of the preview.');
                  }}
                >
                  <LogOut />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            dialogTrigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {dialog === 'profile'
                ? 'Your decision-maker profile'
                : 'CampusHR · Frontend prototype'}
            </DialogTitle>
            <DialogDescription>
              {dialog === 'profile'
                ? 'The sample Dr. Ramesh K (HOD / HR Administrator) identity used throughout this prototype.'
                : 'A UI/UX proposal for Jain College of Engineering and Technology, Hubballi. Explore the dashboard and the leave-to-substitution workflow with local sample data. Other modules remain placeholders.'}
            </DialogDescription>
          </DialogHeader>
          {dialog === 'profile' && (
            <dl className="profile-details">
              <div>
                <dt>Name</dt>
                <dd>{mockUser.name}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{mockUser.role}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{mockUser.department}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{mockUser.email}</dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            profileMenuTrigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Reset CampusHR demo data?</DialogTitle>
            <DialogDescription>
              This will restore all sample leave requests to pending, remove
              substitute assignments, and reset notifications and counts to
              their original demo state.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setResetConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                workflow.resetDemoData();
                setResetConfirmOpen(false);
              }}
            >
              <RotateCcw />
              Reset Demo Data
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
