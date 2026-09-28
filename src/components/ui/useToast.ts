import { useCallback, useRef, useState } from 'react';

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback((text: string) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setMessage(text);
    timerRef.current = window.setTimeout(() => setMessage(null), 2600);
  }, []);

  return { message, showToast };
}
