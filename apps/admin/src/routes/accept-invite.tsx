import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_BASE } from '@/lib/api';

const searchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute('/accept-invite')({
  validateSearch: searchSchema,
  component: AcceptInvitePage,
});

async function acceptInviteFetch(token: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/accept-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
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

function AcceptInvitePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useSearch({ from: '/accept-invite' });

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [matchError, setMatchError] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      if (password !== confirm) {
        setMatchError(true);
        throw new Error(t('acceptInvite.passwordMismatch'));
      }
      setMatchError(false);
      return acceptInviteFetch(token ?? '', password);
    },
    onSuccess: () => navigate({ to: '/' }),
  });

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <p className="text-center text-sm text-destructive">{t('acceptInvite.invalidToken')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h2 className="text-lg font-semibold">{t('acceptInvite.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('acceptInvite.desc')}</p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="grid gap-4"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="password">{t('acceptInvite.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="confirm">{t('acceptInvite.confirmPassword')}</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            {(matchError || mutation.error) && (
              <p role="alert" className="text-sm text-destructive">
                {matchError ? t('acceptInvite.passwordMismatch') : mutation.error?.message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? t('common.loading') : t('acceptInvite.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
