import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Upload, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DOCUMENT_CATEGORY_MAP,
  useUploadDocument,
  type DocumentCategoryKey,
} from '../api/documents';

const SUGGESTED_TYPES: Record<DocumentCategoryKey, string[]> = {
  IDENTITY: ['Aadhaar Card', 'PAN Card', 'Passport', "Voter's ID"],
  ACADEMIC: [
    'Ph.D. Convocation / Degree',
    "Master's Degree Certificate",
    "Bachelor's Degree Certificate",
    '12th / PUC Marks Card',
    '10th / SSLC Marks Card',
  ],
  EMPLOYMENT: [
    'JCET Appointment Letter',
    'Previous College Experience Letter',
    'Relieving Letter',
    'Salary Slip / Bank Proof',
  ],
  CERTIFICATION: [
    'Faculty Development Program (FDP) Certificate',
    'NPTEL / Swayam Certification',
    'Conference / Workshop Certificate',
    'Published Research Paper (Scopus / IEEE)',
  ],
  OTHER: ['Medical Fitness Certificate', 'Bank Passbook Copy', 'Other Institutional Document'],
};

export function DocumentUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [category, setCategory] = useState<DocumentCategoryKey>('ACADEMIC');
  const [documentType, setDocumentType] = useState('Ph.D. Convocation / Degree');
  const [title, setTitle] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadDocument();

  const handleCategoryChange = (val: DocumentCategoryKey) => {
    setCategory(val);
    const suggestions = SUGGESTED_TYPES[val];
    if (suggestions && suggestions.length > 0) {
      setDocumentType(suggestions[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit.');
      return;
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(selected.type)) {
      toast.error('Only PDF, JPEG, PNG, and WEBP formats are accepted.');
      return;
    }

    setFile(selected);
    if (!title) {
      // Auto-populate title from filename without extension
      const cleanName = selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please choose a file to upload.');
      return;
    }
    if (!title.trim()) {
      toast.error('Please provide a document title.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('documentType', documentType);
    formData.append('title', title.trim());
    if (expiryDate) {
      formData.append('expiryDate', expiryDate);
    }

    uploadMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('Document uploaded successfully and queued for HR verification.');
        onOpenChange(false);
        setFile(null);
        setTitle('');
        setExpiryDate('');
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Upload Document for Verification
          </DialogTitle>
          <DialogDescription>
            Upload your institutional degrees, experience letters, or certifications. HR will verify your submission.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category">Document Category</Label>
            <Select
              value={category}
              onValueChange={(val) => handleCategoryChange(val as DocumentCategoryKey)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_CATEGORY_MAP).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Type suggestions */}
          <div className="space-y-1.5">
            <Label htmlFor="docType">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="docType">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                {SUGGESTED_TYPES[category].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Document Title / Description</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master of Technology Convocation Certificate"
              required
            />
          </div>

          {/* Expiry Date (Optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="expiry">Expiration Date (Optional)</Label>
            <Input
              id="expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Required for time-bound proofs like contracts, passport, or medical certificates.
            </p>
          </div>

          {/* File Picker */}
          <div className="space-y-1.5">
            <Label>Document File (PDF, PNG, JPG, max 10MB)</Label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-emerald-700 font-medium">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                  <span>{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
              ) : (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                  <p className="font-medium text-foreground">Click to browse or drag file here</p>
                  <p className="text-xs">Supports PDF, PNG, JPG up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || !title.trim() || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload & Submit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
