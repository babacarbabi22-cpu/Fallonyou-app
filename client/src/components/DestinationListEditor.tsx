import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  label: string;
  placeholder: string;
  addLabel: string;
  values: string[];
  onChange: (values: string[]) => void;
  testId: string;
};

export function DestinationListEditor({ label, placeholder, addLabel, values, onChange, testId }: Props) {
  const [draft, setDraft] = useState("");
  const trimmed = draft.trim();
  const canAdd = !!trimmed && values.length < 10
    && !values.some(value => value.toLocaleLowerCase() === trimmed.toLocaleLowerCase());

  const add = () => {
    if (!canAdd) return;
    onChange([...values, trimmed]);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={testId} className="text-sm font-medium text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <Input
          id={testId}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          maxLength={80}
          placeholder={placeholder}
          className="rounded-xl min-w-0"
          data-testid={testId}
        />
        <Button type="button" variant="outline" onClick={add} disabled={!canAdd} aria-label={`${addLabel}: ${label}`} className="rounded-xl shrink-0">
          <Plus className="w-4 h-4 mr-1" />{addLabel}
        </Button>
      </div>
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {values.map((value, index) => (
            <li key={`${value}-${index}`} className="flex items-center gap-1 rounded-full bg-muted pl-3 pr-1 py-1 text-sm max-w-full">
              <span className="truncate">{value}</span>
              <button type="button" className="rounded-full p-1 hover:bg-background shrink-0" aria-label={`${label}: ${value} — eliminar`} onClick={() => onChange(values.filter((_, i) => i !== index))}>
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}