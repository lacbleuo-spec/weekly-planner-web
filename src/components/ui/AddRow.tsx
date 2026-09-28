import { Plus } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

interface AddRowProps {
  placeholder: string;
  onSubmit: (value: string) => void;
}

export function AddRow({ placeholder, onSubmit }: AddRowProps) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
  };

  return (
    <div className="mt-2 flex items-center gap-1.5 border-t border-line pt-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-faint focus:outline-none"
      />
      <button
        onClick={submit}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent transition hover:bg-accent hover:text-white"
        aria-label={placeholder}
      >
        <Plus size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
