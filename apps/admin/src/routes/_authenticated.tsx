import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { getCurrentUser } from '@/lib/auth';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (!user) {
      throw redirect({ to: '/login' });
    }
    return { user };
  },
  component: () => <Outlet />,
});
