import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth/hooks/useSession';
import { documentBlob, type DocumentItem } from '../api/documents';
export function DocumentPreviewDialog({
  document,
  open,
  onOpenChange,
}: {
  document: DocumentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const id = document?.id;
  const session = useSession();
  const userId = session.status === 'signedIn' ? session.user.id : null;
  const [retry, setRetry] = useState(0);
  return (
    <Dialog open={open && !!userId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{document?.title ?? 'Document preview'}</DialogTitle>
        </DialogHeader>
        {open && id && userId && (
          <Preview
            key={`${userId}:${id}:${retry}`}
            id={id}
            title={document?.title ?? 'Document'}
            onRetry={() => setRetry((value) => value + 1)}
          />
        )}
        <p className="text-sm text-muted-foreground">
          Preview requires your current document permissions. Close this window
          to release the preview.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Preview({
  id,
  title,
  onRetry,
}: {
  id: string;
  title: string;
  onRetry: () => void;
}) {
  const [preview, setPreview] = useState<{ url: string; mime: string } | null>(
    null,
  );
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true,
      url: string | undefined;
    void documentBlob(id)
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setPreview({ url, mime: blob.type });
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  return (
    <>
      {error ? (
        <div role="alert">
          Document could not be loaded.{' '}
          <Button onClick={() => onRetry()}>Retry preview</Button>
        </div>
      ) : !preview ? (
        <p role="status">Loading protected document…</p>
      ) : preview.mime === 'application/pdf' ? (
        <iframe title={title} src={preview.url} className="w-full min-h-96" />
      ) : (
        <img
          src={preview.url}
          alt={title}
          className="w-full max-h-96 object-contain"
        />
      )}
    </>
  );
}
