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

async function authFetch<T = void>(path: string, body: object): Promise<T> {
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

  return res.json() as Promise<T>;
}

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [code, setCode] = useState('');

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
    onSuccess: () => setPendingEmail(email),
  });

  const verifyMutation = useMutation({
    mutationFn: () =>
      authFetch('/auth/verify-email', { email: pendingEmail, code }),
    onSuccess: () => navigate({ to: '/' }),
  });

  const resendMutation = useMutation({
    mutationFn: () => authFetch('/auth/resend-verification', { email: pendingEmail }),
  });

  if (pendingEmail !== null) {
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
            <h2 className="text-lg font-semibold">{t('login.checkEmailTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('login.checkEmailDesc', { email: pendingEmail })}
            </p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyMutation.mutate();
              }}
              className="grid gap-4"
            >
              <div className="grid gap-1.5">
                <Label htmlFor="code">{t('login.verificationCode')}</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              {verifyMutation.error && (
                <p role="alert" className="text-sm text-destructive">
                  {verifyMutation.error.message}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={verifyMutation.isPending}>
                {verifyMutation.isPending ? t('common.loading') : t('login.submitVerify')}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setPendingEmail(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t('login.backToLogin')}
                </button>
                <button
                  type="button"
                  onClick={() => resendMutation.mutate()}
                  disabled={resendMutation.isPending}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {resendMutation.isPending ? t('common.loading') : t('login.resend')}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
