import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center gap-4 px-6">
      <EmptyState
        title="Page not found"
        description="This page doesn’t exist. Return to your workspace to continue."
      />
      <Button asChild>
        <Link to="/">Return to CampusHR</Link>
      </Button>
    </main>
  );
}
