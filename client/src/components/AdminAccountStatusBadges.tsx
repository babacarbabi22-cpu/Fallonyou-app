import React from "react";
import { Badge } from "./ui/badge";
import { adminAccountStatusCopy } from "../lib/admin-account-status-copy";

type Props = {
  language: keyof typeof adminAccountStatusCopy;
  hasPassword?: boolean | null;
  hasProfilePhoto?: boolean | null;
};

function statusStyle(value: boolean | null | undefined) {
  return value === true
    ? "border-green-500/40 text-green-700 dark:text-green-400"
    : value === false
      ? "border-amber-500/50 text-amber-800 dark:text-amber-400"
      : "text-muted-foreground";
}

export function AdminAccountStatusBadges({ language, hasPassword, hasProfilePhoto }: Props) {
  const copy = adminAccountStatusCopy[language];
  return (
    <div className="flex flex-wrap gap-1.5 mt-2" data-testid="admin-account-status">
      <Badge variant="outline" className={`text-xs ${statusStyle(hasPassword)}`} data-testid="admin-password-status">
        {hasPassword === true ? copy.passwordPresent : hasPassword === false ? copy.passwordMissing : copy.passwordUnknown}
      </Badge>
      <Badge variant="outline" className={`text-xs ${statusStyle(hasProfilePhoto)}`} data-testid="admin-photo-status">
        {hasProfilePhoto === true ? copy.photoPresent : hasProfilePhoto === false ? copy.photoMissing : copy.photoUnknown}
      </Badge>
    </div>
  );
}
