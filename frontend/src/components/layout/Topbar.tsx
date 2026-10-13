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
} from 'lucide-react';
import { toast } from 'sonner';
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
  const [profileOpen, setProfileOpen] = useState(false);
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
                    setProfileOpen(true);
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
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    session.logout();
                    navigate('/login', { replace: true });
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
        </DialogContent>
      </Dialog>
    </>
  );
}
