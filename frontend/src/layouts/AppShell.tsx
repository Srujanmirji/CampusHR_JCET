import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { usePreviewSession } from '@/features/auth/hooks/usePreviewSession';

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signedIn } = usePreviewSession();
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    main.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);
  if (!signedIn) return <Navigate to="/login" replace />;
  return (
    <div className="app-shell" data-collapsed={collapsed}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <aside className="desktop-sidebar">
        <Sidebar
          collapsed={collapsed}
          onCollapse={() => setCollapsed(!collapsed)}
        />
      </aside>
      <div className="app-workspace">
        <Topbar onOpenNavigation={() => setMobileOpen(true)} />
        <main
          id="main-content"
          ref={main}
          tabIndex={-1}
          className="main-content"
        >
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>
            CampusHR · Jain College of Engineering and Technology, Hubballi
          </span>
        </footer>
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="mobile-navigation"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Main navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Navigate CampusHR.
          </SheetDescription>
          <Sidebar
            onClose={() => setMobileOpen(false)}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
