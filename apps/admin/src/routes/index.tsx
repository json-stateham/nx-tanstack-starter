import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  Activity,
  Bell,
  Boxes,
  ChevronRight,
  Database,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/')({
  component: AdminHome,
});

function AdminHome() {
  const { t } = useTranslation();

  const { data: status } = useQuery({
    queryKey: ['admin-status'],
    queryFn: async () => ({
      environment: 'ready',
      services: 4,
      users: 1284,
      events: 36,
      updatedAt: new Date().toLocaleTimeString(),
    }),
  });

  const navItems = [
    { label: t('home.nav.overview'), icon: LayoutDashboard, active: true },
    { label: t('home.nav.users'), icon: Users },
    { label: t('home.nav.settings'), icon: Settings },
  ];

  const metrics = [
    {
      label: t('home.metrics.services'),
      value: status?.services ?? '-',
      detail: t('home.metrics.servicesDetail'),
      icon: Boxes,
    },
    {
      label: t('home.metrics.users'),
      value: status?.users.toLocaleString() ?? '-',
      detail: t('home.metrics.usersDetail'),
      icon: Users,
    },
    {
      label: t('home.metrics.events'),
      value: status?.events ?? '-',
      detail: t('home.metrics.eventsDetail'),
      icon: Activity,
    },
  ];

  const checklistItems = [
    t('home.workspace.routerGenerated'),
    t('home.workspace.queryClientActive'),
    t('home.workspace.tailwindCompiled'),
  ];

  return (
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="border-b bg-zinc-950 px-5 py-5 text-zinc-50 lg:border-b-0 lg:border-r lg:border-zinc-900">
        <div className="flex items-center justify-between gap-3 lg:block">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-emerald-400 text-zinc-950">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-base font-semibold">{t('home.appName')}</div>
              <div className="text-xs text-zinc-400">{t('home.controlPlane')}</div>
            </div>
          </div>
          <Button
            aria-label={t('home.notifications')}
            className="text-zinc-200 hover:bg-zinc-900 hover:text-white lg:hidden"
            size="icon"
            variant="ghost"
          >
            <Bell aria-hidden="true" />
          </Button>
        </div>

        <nav
          aria-label={t('home.notifications')}
          className="mt-5 grid grid-cols-3 gap-2 lg:mt-8 lg:grid-cols-1"
        >
          {navItems.map((item) => (
            <a
              aria-current={item.active ? 'page' : undefined}
              className={cn(
                'flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-50 lg:justify-start',
                item.active && 'bg-zinc-900 text-zinc-50',
              )}
              href="/"
              key={item.label}
            >
              <item.icon className="size-4" aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>

      <section className="grid content-start gap-6 px-5 py-6 sm:px-8">
        <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              TanStack Start
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">
              {t('home.header.title')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              {status?.environment ?? t('home.header.loading')}
            </Badge>
            <Button variant="outline">
              <Bell aria-hidden="true" />
              {t('home.header.alerts')}
            </Button>
            <LanguageSwitcher />
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3" aria-label="Admin metrics">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
                <CardDescription>{metric.label}</CardDescription>
                <metric.icon
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{metric.value}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {metric.detail}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader>
              <CardTitle>{t('home.workspace.title')}</CardTitle>
              <CardDescription>
                <Trans
                  i18nKey="home.workspace.description"
                  components={{ code: <code /> }}
                />
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {checklistItems.map((item) => (
                <div
                  className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3"
                  key={item}
                >
                  <div className="flex items-center gap-3">
                    <Database
                      className="size-4 text-primary"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                  <ChevronRight
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 text-zinc-50">
            <CardHeader>
              <CardTitle>{t('home.runtime.title')}</CardTitle>
              <CardDescription className="text-zinc-400">
                {t('home.runtime.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-semibold">
                {status?.updatedAt ?? t('home.runtime.pending')}
              </div>
              <p className="mt-3 text-sm text-zinc-400">
                {t('home.runtime.body')}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
