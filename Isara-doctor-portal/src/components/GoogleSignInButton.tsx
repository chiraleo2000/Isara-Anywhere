import { useState } from 'react';
import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from './common/AuthProvider';

interface Props {
  readonly onSuccess?: () => void;
  readonly onError?: (message: string) => void;
  readonly onPendingApproval?: (userId?: string) => void;
  readonly onNotRegistered?: (email?: string) => void;
  readonly onPasswordNotSet?: (email?: string) => void;
}

/**
 * Renders the Google Sign-In button. Hidden gracefully if VITE_GOOGLE_CLIENT_ID
 * is not configured. Forwards specific server codes to dedicated callbacks.
 */
export default function GoogleSignInButton({ onSuccess, onError, onPendingApproval, onNotRegistered, onPasswordNotSet }: Props) {
  const { loginWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) return null;

  const handleCredential = async (cred: CredentialResponse) => {
    if (!cred.credential) {
      onError?.('No credential returned from Google');
      return;
    }
    setBusy(true);
    try {
      await loginWithGoogle(cred.credential);
      onSuccess?.();
    } catch (err) {
      const e = err as Error & { code?: string; userId?: string; email?: string };
      const code = (e.code || '').toUpperCase();
      if (code === 'PENDING_APPROVAL') {
        onPendingApproval?.(e.userId);
      } else if (code === 'NOT_REGISTERED') {
        onNotRegistered?.(e.email);
      } else if (code === 'PASSWORD_NOT_SET') {
        onPasswordNotSet?.(e.email);
      } else {
        onError?.(e.message || 'Google sign-in failed');
      }
    } finally {
      setBusy(false);
    }
  };

  // Self-contained provider: works regardless of whether a parent GoogleOAuthProvider
  // exists in the tree (e.g. older deployed bundles without the root provider).
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="w-full flex flex-col items-center" data-testid="google-sso-container">
        <div className={busy ? 'opacity-50 pointer-events-none' : ''}>
          <GoogleLogin
            onSuccess={handleCredential}
            onError={() => onError?.('Google sign-in was cancelled or failed')}
            useOneTap={false}
            theme="outline"
            size="large"
            text="signin_with"
            shape="rectangular"
            width="320"
          />
        </div>
        {busy && (
          <p className="mt-2 text-sm text-gray-500">Signing in…</p>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}
