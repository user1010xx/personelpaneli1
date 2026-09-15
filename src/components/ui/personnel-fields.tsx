import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function PersonnelFields({
  names,
  onChange,
}: {
  names: string[];
  onChange: (names: string[]) => void;
}) {
  return (
    <div>
      <Label>Personeller</Label>
      <div className="space-y-2">
        {names.map((name, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(event) => {
                const next = [...names];
                next[index] = event.target.value;
                onChange(next);
              }}
              placeholder={`${index + 1}. personel adı`}
              required
              autoFocus={index === 0}
            />
            {names.length > 1 ? (
              <button
                type="button"
                onClick={() => onChange(names.filter((_, itemIndex) => itemIndex !== index))}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label={`${index + 1}. personeli kaldır`}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={names.length >= 50}
          onClick={() => onChange([...names, ""])}
        >
          <Plus className="h-4 w-4" />
          Personel Ekle
        </Button>
      </div>
    </div>
  );
}