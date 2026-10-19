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
  KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { ChangePasswordDialog } from '@/features/auth/components/ChangePasswordDialog';
import { Button } from '@/components/ui/button';
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
import { navigation } from '@/data/navigation';
import type { SessionUser } from '@/features/auth/api/auth';
import { useSession } from '@/features/auth/hooks/useSession';
import { useAcademicWorkflow } from '@/features/leave/useAcademicWorkflow';
import { GlobalSearch } from './GlobalSearch';

// "hod.cse@…" → "HC"; "admin@…" → "AD".
function initialsOf(email: string) {
  const parts = email
    .split('@')[0]!
    .split(/[._-]+/)
    .filter(Boolean);
  const initials =
    parts.length > 1 ? parts.map((part) => part[0]).join('') : (parts[0] ?? '');
  return initials.slice(0, 2).toUpperCase();
}

export function Topbar({
  user,
  onOpenNavigation,
}: {
  user: SessionUser;
  onOpenNavigation: () => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const session = useSession();
  const workflow = useAcademicWorkflow();
  const profileMenuTrigger = useRef<HTMLButtonElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
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
                aria-label={`Open profile menu for ${user.email}`}
              >
                <Avatar>
                  <AvatarFallback>{initialsOf(user.email)}</AvatarFallback>
                </Avatar>
                <span className="profile-copy">
                  <strong>{user.email}</strong>
                  <span>{user.role}</span>
                </span>
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.role} account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onSelect={() => {
                    setProfileOpen(true);
                  }}
                >
                  <UserRound />
                  My profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>
                  <KeyRound />
                  Change password
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings />
                    Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={async () => {
                    await session.logout();
                    toast.success('Signed out.');
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
      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          profileMenuTrigger.current?.focus();
        }}
      />
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            profileMenuTrigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Your profile</DialogTitle>
            <DialogDescription>
              Your CampusHR account details.
            </DialogDescription>
          </DialogHeader>
          <dl className="profile-details">
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{user.role}</dd>
            </div>
          </dl>
        </DialogContent>
      </Dialog>
    </>
  );
}
