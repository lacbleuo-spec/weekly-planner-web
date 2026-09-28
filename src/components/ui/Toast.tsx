interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-6 z-[60] -translate-x-1/2">
      <div className="rounded-full bg-ink px-4 py-2.5 text-[13px] font-medium text-white shadow-float">
        {message}
      </div>
    </div>
  );
}
