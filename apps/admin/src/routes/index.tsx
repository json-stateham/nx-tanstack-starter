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
    { label: 'Overview', icon: LayoutDashboard, active: true },
    { label: 'Users', icon: Users },
    { label: 'Settings', icon: Settings },
  ];

  const metrics = [
    {
      label: 'Services',
      value: status?.services ?? '-',
      detail: 'All systems responding',
      icon: Boxes,
    },
    {
      label: 'Users',
      value: status?.users.toLocaleString() ?? '-',
      detail: 'Active workspace seats',
      icon: Users,
    },
    {
      label: 'Events',
      value: status?.events ?? '-',
      detail: 'Queued for review',
      icon: Activity,
    },
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
              <div className="text-base font-semibold">Admin 1</div>
              <div className="text-xs text-zinc-400">Control plane</div>
            </div>
          </div>
          <Button
            aria-label="Notifications"
            className="text-zinc-200 hover:bg-zinc-900 hover:text-white lg:hidden"
            size="icon"
            variant="ghost"
          >
            <Bell aria-hidden="true" />
          </Button>
        </div>

        <nav
          aria-label="Primary navigation"
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
              Admin console
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              {status?.environment ?? 'loading'}
            </Badge>
            <Button variant="outline">
              <Bell aria-hidden="true" />
              Alerts
            </Button>
          </div>
        </header>

        <div
          className="grid gap-4 md:grid-cols-3"
          aria-label="Admin metrics"
        >
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
              <CardTitle>Workspace is ready</CardTitle>
              <CardDescription>
                Nx, TanStack Start, React Query, Tailwind, and shadcn-style UI
                are wired together in <code>apps/admin</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {['Router generated', 'Query client active', 'Tailwind compiled'].map(
                (item) => (
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
                ),
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 text-zinc-50">
            <CardHeader>
              <CardTitle>Runtime</CardTitle>
              <CardDescription className="text-zinc-400">
                Latest query refresh
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-semibold">
                {status?.updatedAt ?? 'pending'}
              </div>
              <p className="mt-3 text-sm text-zinc-400">
                Data comes through TanStack Query and renders inside shadcn
                primitives.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
