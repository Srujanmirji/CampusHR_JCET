import { LoaderCircle } from 'lucide-react';

export function FullPageLoader({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="flex min-h-svh items-center justify-center gap-3 bg-background text-muted-foreground"
    >
      <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
