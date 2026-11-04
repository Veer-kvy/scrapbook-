import { useEffect } from 'react';
import { useAppStore } from '../../data/store';
import { navigate } from '../../lib/router';
import { useAppEffects } from '../../hooks/useAppEffects';
import { Splash } from '../UI/Splash';
import { LoginScreen } from './LoginScreen';
import { AdminShell } from './AdminShell';

export function AdminApp({ route }: { route: string }) {
  useAppEffects('admin');
  const booted = useAppStore((state) => state.booted);
  const boot = useAppStore((state) => state.boot);
  const user = useAppStore((state) => state.user);

  useEffect(() => {
    void boot('admin');
  }, [boot]);

  useEffect(() => {
    if (!booted) return;
    if (user && route === '/admin/login') navigate('/admin/dashboard', true);
    if (!user && route !== '/admin/login') navigate('/admin/login', true);
  }, [booted, user, route]);

  if (!booted) return <Splash label="opening the studio…" />;
  if (!user) return <LoginScreen />;
  if (route === '/admin/login') return <Splash label="taking you to the dashboard…" />;

  return <AdminShell route={route} />;
}
