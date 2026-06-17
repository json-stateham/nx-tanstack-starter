import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_BASE } from '@/lib/api';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

type Tab = 'login' | 'register';

async function authFetch(path: string, body: object): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });

  if (!res.ok) {
    const data: unknown = await res.json().catch(() => ({}));
    const message =
      data !== null &&
      typeof data === 'object' &&
      'message' in data &&
      typeof (data as Record<string, unknown>)['message'] === 'string'
        ? (data as Record<string, string>)['message']
        : 'Request failed';
    throw new Error(message);
  }
}

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const loginMutation = useMutation({
    mutationFn: () => authFetch('/auth/login', { email, password }),
    onSuccess: () => navigate({ to: '/' }),
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      authFetch('/auth/register', {
        email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      }),
    onSuccess: () => navigate({ to: '/' }),
  });

  const activeError = tab === 'login' ? loginMutation.error : registerMutation.error;
  const isPending = tab === 'login' ? loginMutation.isPending : registerMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'login') loginMutation.mutate();
    else registerMutation.mutate();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-emerald-400 text-zinc-950">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <span className="text-xl font-semibold">{t('home.appName')}</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="pb-2">
          <div className="flex rounded-lg bg-muted p-1">
            {(['login', 'register'] as Tab[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  tab === value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {value === 'login' ? t('login.tabLogin') : t('login.tabRegister')}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            {tab === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="firstName">
                    {t('login.firstName')}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({t('login.optional')})
                    </span>
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="lastName">
                    {t('login.lastName')}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({t('login.optional')})
                    </span>
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="password">{t('login.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={tab === 'register' ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {activeError && (
              <p role="alert" className="text-sm text-destructive">
                {activeError.message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? t('common.loading')
                : tab === 'login'
                  ? t('login.submitLogin')
                  : t('login.submitRegister')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
