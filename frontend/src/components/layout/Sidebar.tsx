import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelLeftClose, PanelLeftOpen, X, GraduationCap } from 'lucide-react';
import { navigation, facultyNavigation } from '@/data/navigation';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCan } from '@/features/auth/hooks/useCan';
import { useSession } from '@/features/auth/hooks/useSession';
import { useLeaveWaiting } from '@/features/leave/hooks/useLeaveWaiting';

export function Sidebar({
  collapsed = false,
  onCollapse,
  onNavigate,
  onClose,
}: {
  collapsed?: boolean;
  onCollapse?: () => void;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const { pathname } = useLocation();
  const can = useCan();
  const session = useSession();
  const userRole = session.status === 'signedIn' ? session.user.role : null;
  const isFaculty = userRole === 'Faculty';
  const baseNav = isFaculty ? facultyNavigation : navigation;
  const items = baseNav.filter((item) => can(item.permission));
  const pending = useLeaveWaiting().data?.length ?? 0;
  const groups = isFaculty
    ? ['Overview', 'My Academics', 'My Services', 'Communication']
    : ['Overview', 'People & academics', 'Administration'];
  return (
    <div className="sidebar-content" data-collapsed={collapsed}>
      <div className="sidebar-brand">
        <img
          src="/assets/jcet-logo.png"
          alt="JCET institutional logo"
          width="40"
          height="40"
        />
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="brand"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p>
                Campus<span>HR</span>
              </p>
              <span className="sidebar-brand-subtitle">JCET · Hubballi</span>
            </motion.div>
          )}
        </AnimatePresence>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="sidebar-close"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <X />
          </Button>
        )}
      </div>
      <nav aria-label="Main navigation" className="sidebar-nav">
        {groups
          .filter((group) => items.some((item) => item.group === group))
          .map((group) => (
            <div className="sidebar-group" key={group}>
              {!collapsed && <p className="sidebar-group-label">{group}</p>}
              <ul>
                {items
                  .filter((item) => item.group === group)
                  .map(({ path, label, icon: Icon }) => (
                    <li key={path}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <NavLink
                            to={path}
                            onClick={onNavigate}
                            aria-label={collapsed ? label : undefined}
                            className={cn(
                              'sidebar-link',
                              pathname === path && 'sidebar-link-active',
                            )}
                          >
                            <Icon aria-hidden="true" />
                            {!collapsed && <span>{label}</span>}
                            {!collapsed && path === '/leave' && pending > 0 && (
                              <span className="sidebar-count">
                                {pending}
                                <span className="sr-only">
                                  {' '}
                                  waiting for you
                                </span>
                              </span>
                            )}
                          </NavLink>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right">{label}</TooltipContent>
                        )}
                      </Tooltip>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
      </nav>
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-college">
            <GraduationCap aria-hidden="true" />
            <p>
              Built for our campus
              <span>
                Jain College of Engineering
                <br />
                and Technology, Hubballi
              </span>
            </p>
          </div>
        )}
        {onCollapse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={onCollapse}
                className="sidebar-collapse"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                {!collapsed && <span>Collapse menu</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
