"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = { id: number; title: string; body?: string; href?: string; tone: "ok" | "error" };
type Push = (t: Omit<Toast, "id">) => void;

const ToastContext = createContext<Push>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback<Push>((t) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 7_000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`glass pointer-events-auto rounded-2xl px-4 py-3 text-sm shadow-2xl ${
              t.tone === "error" ? "border-red-400/30" : "border-sage/30"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              <span className={`h-2 w-2 rounded-full ${t.tone === "error" ? "bg-red-400" : "bg-sage"}`} />
              {t.title}
            </div>
            {t.body && <p className="mt-1 text-mute break-words">{t.body}</p>}
            {t.href && (
              <a href={t.href} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sage underline-offset-4 hover:underline">
                View on explorer ↗
              </a>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
