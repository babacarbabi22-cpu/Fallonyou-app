import React from "react";
import { Mail } from "lucide-react";
import { Switch } from "./ui/switch";
import { messageNoticeCopy } from "../../../shared/message-notice-copy";

export function MessageEmailOption(props: {
  language: keyof typeof messageNoticeCopy; checked: boolean; pending: boolean; failed: boolean;
  hasEmail: boolean; verified: boolean; messagesEnabled: boolean; onChange(value: boolean): void;
}) {
  const copy = messageNoticeCopy[props.language];
  const cannotEnable = !props.hasEmail || !props.verified || !props.messagesEnabled;
  return (
    <div className="rounded-xl border p-3 space-y-2" data-testid="message-email-option">
      <div className="flex items-start gap-3">
        <Mail className="w-5 h-5 shrink-0 text-amber-500 mt-1" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{copy.label}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{copy.description}</p>
        </div>
        <Switch checked={props.checked} onCheckedChange={props.onChange}
          disabled={props.pending || props.failed || (cannotEnable && !props.checked)}
          aria-label={copy.label} data-testid="toggle-message-emails" />
      </div>
      {!props.hasEmail ? <p className="text-xs text-muted-foreground">{copy.noEmail}</p>
        : !props.verified ? <p className="text-xs text-muted-foreground">{copy.verify}</p> : null}
      {!props.messagesEnabled && <p className="text-xs text-muted-foreground">{copy.messagesOff}</p>}
      {props.failed && <p role="alert" className="text-xs text-destructive">{copy.failed}</p>}
    </div>
  );
}
