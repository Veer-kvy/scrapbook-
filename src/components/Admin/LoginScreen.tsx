import { useState } from 'react';
import { useAppStore } from '../../data/store';
import { navigate } from '../../lib/router';
import { BACKEND_HINT } from '../../backend';
import { Icon } from '../UI/Icon';
import { Sticker } from '../Stickers/Sticker';
import { Input } from './ui';

export function LoginScreen() {
  const needsSetup = useAppStore((state) => state.needsSetup);
  const backendMode = useAppStore((state) => state.backendMode);
  const backendNote = useAppStore((state) => state.backendNote);
  const signIn = useAppStore((state) => state.signIn);
  const setupPasscode = useAppStore((state) => state.setupPasscode);
  const authBusy = useAppStore((state) => state.authBusy);
  const authError = useAppStore((state) => state.authError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const setupMode = backendMode === 'local' && needsSetup;

  const submit = async () => {
    setLocalError(null);
    if (setupMode) {
      if (passcode.trim().length < 4) {
        setLocalError('Choose a passcode with at least 4 characters.');
        return;
      }
      if (passcode !== confirm) {
        setLocalError('Those passcodes do not match yet.');
        return;
      }
      if (await setupPasscode(passcode)) navigate('/admin/dashboard', true);
      return;
    }
    if (backendMode === 'supabase') {
      if (!email.trim() || !password) {
        setLocalError('Enter the administrator email and password.');
        return;
      }
      if (await signIn({ email: email.trim(), password })) navigate('/admin/dashboard', true);
      return;
    }
    if (!passcode) {
      setLocalError('Enter your admin passcode.');
      return;
    }
    if (await signIn({ passcode })) navigate('/admin/dashboard', true);
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-10">
      <div className="admin-backdrop" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[430px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="relative grid h-16 w-16 place-items-center rounded-full border border-[#c98c9d]/40 bg-[rgba(255,248,238,.75)] text-deeprose shadow-paper">
            <Icon name="lock" size={24} />
            <span className="absolute -right-1 -top-1 block w-6 rotate-12">
              <Sticker id="heart" />
            </span>
          </span>
          <p className="mt-4 font-serif text-[0.66rem] uppercase tracking-[0.38em] text-deeprose/60">
            private studio
          </p>
          <h1 className="mt-2 font-display text-3xl text-ink">
            {setupMode ? 'Make this yours' : 'Welcome back'}
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/60">
            {setupMode
              ? 'Create the administrator passcode for this scrapbook. It is stored only in this browser and can be changed later in Settings.'
              : backendMode === 'supabase'
                ? 'Sign in with the administrator account you created in Supabase. There is no public sign-up.'
                : 'Enter the passcode you chose for this device. The public scrapbook stays open for readers.'}
          </p>
        </div>

        <form
          className="admin-card space-y-4 p-5 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {setupMode || backendMode === 'local' ? (
            <>
              <label className="block">
                <span className="label">{setupMode ? 'New passcode' : 'Admin passcode'}</span>
                <div className="relative">
                  <Input
                    type={show ? 'text' : 'password'}
                    value={passcode}
                    onChange={(event) => setPasscode(event.target.value)}
                    autoComplete={setupMode ? 'new-password' : 'current-password'}
                    placeholder={setupMode ? 'At least 4 characters' : 'Your passcode'}
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink/45 transition hover:bg-ink/5 hover:text-ink"
                    onClick={() => setShow((value) => !value)}
                    aria-label={show ? 'Hide passcode' : 'Show passcode'}
                  >
                    <Icon name="eye" size={16} />
                  </button>
                </div>
              </label>
              {setupMode && (
                <label className="block">
                  <span className="label">Confirm passcode</span>
                  <Input
                    type={show ? 'text' : 'password'}
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Type it once more"
                    required
                  />
                </label>
              )}
            </>
          ) : (
            <>
              <label className="block">
                <span className="label">Email</span>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  placeholder="you@example.com"
                  autoFocus
                  required
                />
              </label>
              <label className="block">
                <span className="label">Password</span>
                <div className="relative">
                  <Input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="Your password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink/45 transition hover:bg-ink/5 hover:text-ink"
                    onClick={() => setShow((value) => !value)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                  >
                    <Icon name="eye" size={16} />
                  </button>
                </div>
              </label>
            </>
          )}

          {(localError || authError) && (
            <p role="alert" className="rounded-xl bg-[#8f4a56]/10 px-3 py-2 text-[0.78rem] leading-snug text-[#8f4a56]">
              {localError || authError}
            </p>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={authBusy}>
            {authBusy ? (
              <>
                <Icon name="refresh" size={16} className="animate-spin" /> Please wait…
              </>
            ) : (
              <>
                {setupMode ? 'Create passcode & enter' : 'Enter the studio'}
                <Icon name="arrow-right" size={16} />
              </>
            )}
          </button>

          <div className="rounded-xl bg-[#f6ecdf] px-3 py-2.5 text-[0.68rem] leading-relaxed text-ink/55">
            <span className="flex items-start gap-2">
              <Icon name="info" size={14} className="mt-0.5 shrink-0 text-deeprose/60" />
              <span>
                <strong className="font-medium text-ink/70">{backendMode === 'supabase' ? 'Supabase' : 'Local development'} · </strong>
                {backendNote || BACKEND_HINT}
              </span>
            </span>
          </div>
        </form>

        <div className="mt-5 flex items-center justify-between text-[0.7rem] text-ink/50">
          <a href="#/" className="inline-flex items-center gap-1.5 transition hover:text-deeprose">
            <Icon name="arrow-left" size={13} /> Back to the scrapbook
          </a>
          <span className="hidden items-center gap-1.5 xs:flex">
            <Icon name="heart" size={11} /> kept private
          </span>
        </div>
      </div>
    </div>
  );
}
