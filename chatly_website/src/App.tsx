import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Spinner } from './components/Spinner';
import { BrandMark } from './components/BrandMark';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ChatPage } from './pages/ChatPage';
import { CallOverlay } from './components/CallOverlay';
import { CallToast } from './components/CallToast';

function FullPageLoader() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted">
      <BrandMark size={44} />
      <Spinner label="Restoring your session…" />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { currentUser, restoring } = useAuth();

  if (restoring) return <FullPageLoader />;
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { currentUser, restoring } = useAuth();

  if (restoring) return <FullPageLoader />;
  if (currentUser) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      {/* Call UI renders above every route so it survives navigation. */}
      <CallOverlay />
      <CallToast />

      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <LoginPage />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectIfAuthed>
              <SignUpPage />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/reset"
          element={
            <RedirectIfAuthed>
              <ResetPasswordPage />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <ChatPage />
            </RequireAuth>
          }
        />
        <Route
          path="/app/:conversationId"
          element={
            <RequireAuth>
              <ChatPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </>
  );
}
