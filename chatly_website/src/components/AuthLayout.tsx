import type { ReactNode } from 'react';
import { BrandMark } from './BrandMark';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  headerExtra?: ReactNode;
};

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  headerExtra,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand/10 via-canvas to-accent/10 px-4 py-10 dark:from-brand/15 dark:via-canvas-night dark:to-accent/15">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandMark size={54} />
          {headerExtra}
          <div>
            <h1 className="text-2xl font-bold text-canvas-night dark:text-canvas">{title}</h1>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          </div>
        </div>

        <div className="panel p-6">{children}</div>

        {footer && (
          <div className="mt-4 text-center text-sm text-muted">{footer}</div>
        )}
      </div>
    </div>
  );
}
