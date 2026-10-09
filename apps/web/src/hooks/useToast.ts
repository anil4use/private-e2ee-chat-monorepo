import { useState, useCallback } from 'react';
import { ToastMessage, ToastType } from '@/components/Toast';

let toastCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((
    type: ToastType,
    title: string,
    description?: string,
    duration?: number
  ) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, title, description, duration }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}
