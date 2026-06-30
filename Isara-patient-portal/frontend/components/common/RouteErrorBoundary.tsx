import { ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary';

type Props = {
  name: string;
  children: ReactNode;
};

export default function RouteErrorBoundary({ name, children }: Props) {
  return (
    <ErrorBoundary
      fallback={(
        <div className="flex flex-col items-center justify-center min-h-[320px] p-8" data-testid={`route-error-${name}`}>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md text-center">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Page error</h2>
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">
              Something went wrong loading this section ({name}).
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Reload page
            </button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
