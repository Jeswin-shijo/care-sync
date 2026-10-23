import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, auth, errorMessage, onSessionLost } from '../api/client';
import { roleFor } from '../api/mappers';
import type { ApiUser } from '../api/types';
import type { UserRole } from '../logic/hospital';
import { useToast } from './ToastContext';

/**
 * Who is using the app.
 * - `live`: signed in to the MediOS backend; data comes from the API and the role
 *   is the account's.
 * - `demo`: the offline demo on sample data (no account, free role switching).
 * - `checking`: resuming the session saved on this device.
 */
export type SessionStatus = 'checking' | 'signed-out' | 'live' | 'demo';

interface SessionValue {
  status: SessionStatus;
  user: ApiUser | null;
  /** The signed-in account's role in the app (live only). */
  role: UserRole | null;
  /** Set when the saved session could not be checked because the server was unreachable. */
  restoreError: string | null;
  /** Throws ApiError with the server's message on bad credentials or no connection. */
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  startDemo: () => void;
  retryRestore: () => void;
}

const SessionContext = createContext<SessionValue | undefined>(undefined);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [status, setStatus] = useState<SessionStatus>('checking');
  const [user, setUser] = useState<ApiUser | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // The app starts in 'checking'; only a retry needs to go back to it.
  const restore = useCallback(async () => {
    try {
      const restored = await auth.restore();
      setRestoreError(null);
      setUser(restored);
      setStatus(restored ? 'live' : 'signed-out');
    } catch (err) {
      // Offline or server down: keep the saved session and let the user retry.
      setRestoreError(err instanceof ApiError && err.status === 0 ? err.message : errorMessage(err));
      setStatus('signed-out');
    }
  }, []);

  useEffect(() => {
    restore();
  }, [restore]);

  useEffect(() => {
    onSessionLost(() => {
      if (statusRef.current !== 'live') return;
      setUser(null);
      setStatus('signed-out');
      showToast({ type: 'warning', title: 'Signed out', message: 'Your session has ended. Please sign in again.' });
    });
    return () => onSessionLost(null);
  }, [showToast]);

  const signIn = useCallback(async (email: string, password: string) => {
    const signedIn = await auth.signIn(email, password);
    setRestoreError(null);
    setUser(signedIn);
    setStatus('live');
  }, []);

  const signOut = useCallback(async () => {
    if (statusRef.current === 'live') await auth.signOut();
    setUser(null);
    setStatus('signed-out');
  }, []);

  const startDemo = useCallback(() => {
    setUser(null);
    setStatus('demo');
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      user,
      role: user ? roleFor(user.role) : null,
      restoreError,
      signIn,
      signOut,
      startDemo,
      retryRestore: () => {
        setStatus('checking');
        setRestoreError(null);
        restore();
      },
    }),
    [status, user, restoreError, signIn, signOut, startDemo, restore]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within a SessionProvider');
  return context;
};
