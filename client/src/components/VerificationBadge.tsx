import { useState, useRef } from "react";
import { CheckCircle2, Clock, ShieldAlert, ShieldCheck, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { profileSettingsCopy } from "@/lib/profile-settings-copy";

// Small badge shown next to user names
export function VerifiedBadge({ className = "" }: { className?: string }) {
  const { language } = useI18n();
  return (
    <CheckCircle2
      className={`w-4 h-4 text-blue-500 fill-blue-100 dark:fill-blue-900 ${className}`}
      aria-label={profileSettingsCopy[language].verifiedLabel}
    />
  );
}

interface VerificationStatusProps {
  user: {
    isVerified?: string | null;
    verificationStatus?: string | null;
    verificationRejectedReason?: string | null;
  };
}

export function VerificationStatus({ user }: VerificationStatusProps) {
  const { language, t } = useI18n();
  const copy = profileSettingsCopy[language];
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const status = user?.isVerified === "true" ? "approved" : (user?.verificationStatus || "none");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("selfie", selectedFile);
      const res = await fetch("/api/verification/submit", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(copy.uploadError);
      }
      toast({ title: copy.sentTitle, description: copy.sentDescription });
      setPreviewUrl(null);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    } catch {
      toast({ title: t.common.error, description: copy.uploadError, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (status === "approved") {
    return (
      <div data-testid="verification-status" className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="font-semibold text-blue-800 dark:text-blue-200 text-sm">{copy.verifiedLabel} ✓</p>
          <p className="text-xs text-blue-600 dark:text-blue-400">{copy.approvedDescription}</p>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div data-testid="verification-status" className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">{copy.pendingTitle}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400">{copy.pendingDescription}</p>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div data-testid="verification-status" className="space-y-3">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-red-800 dark:text-red-200 text-sm">{copy.rejectedTitle}</p>
            {user.verificationRejectedReason && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{user.verificationRejectedReason}</p>
            )}
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">{copy.retryDescription}</p>
          </div>
        </div>
        <SelfieUploadPanel
          previewUrl={previewUrl}
          fileInputRef={fileInputRef}
          isUploading={isUploading}
          onFileSelect={handleFileSelect}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isRetry
        />
      </div>
    );
  }

  return (
    <div data-testid="verification-status" className="space-y-3">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-muted/50 border border-border">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <p className="font-semibold text-sm">{copy.verificationTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {copy.verificationInstructions}
          </p>
        </div>
      </div>
      <SelfieUploadPanel
        previewUrl={previewUrl}
        fileInputRef={fileInputRef}
        isUploading={isUploading}
        onFileSelect={handleFileSelect}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}

function SelfieUploadPanel({
  previewUrl,
  fileInputRef,
  isUploading,
  onFileSelect,
  onSubmit,
  onCancel,
  isRetry = false,
}: {
  previewUrl: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  isUploading: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isRetry?: boolean;
}) {
  const { language, t } = useI18n();
  const copy = profileSettingsCopy[language];
  if (previewUrl) {
    return (
      <div className="space-y-3">
        <div className="relative rounded-2xl overflow-hidden">
          <img src={previewUrl} alt={copy.previewAlt} className="w-full h-48 object-cover" />
          <button
            onClick={onCancel}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white"
            data-testid="button-cancel-selfie"
            aria-label={t.common.cancel}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <Button
          onClick={onSubmit}
          disabled={isUploading}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold"
          data-testid="button-submit-selfie"
        >
          {isUploading ? copy.uploading : copy.submit}
        </Button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={onFileSelect}
        className="hidden"
        data-testid="input-selfie-file"
      />
      <Button
        variant="outline"
        className="w-full h-12 rounded-xl border-dashed border-2 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-medium"
        onClick={() => fileInputRef.current?.click()}
        data-testid="button-take-selfie"
      >
        <Camera className="w-5 h-5 mr-2" />
        {isRetry ? copy.retrySelfie : copy.takeSelfie}
      </Button>
    </>
  );
}
