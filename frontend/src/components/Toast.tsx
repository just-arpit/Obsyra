import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function Toast({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';

        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-[6px] border border-app-border bg-white text-app-primary shadow-app-elevated transition-all"
          >
            {isSuccess && <CheckCircle2 className="w-4 h-4 text-app-success mt-0.5 shrink-0" />}
            {isError && <AlertCircle className="w-4 h-4 text-app-error mt-0.5 shrink-0" />}
            {!isSuccess && !isError && <Info className="w-4 h-4 text-app-primary mt-0.5 shrink-0" />}

            <div className="flex-1 text-xs leading-relaxed text-app-primary font-medium">{t.text}</div>

            <button
              onClick={() => onDismiss(t.id)}
              className="text-app-muted hover:text-app-primary p-0.5 shrink-0 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
