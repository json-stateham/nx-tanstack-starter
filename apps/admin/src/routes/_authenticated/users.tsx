import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchUsers, type UserListItemDto } from '@/lib/users';

const searchSchema = z.object({
  page: z.number().int().min(1).catch(1),
});

const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<UserListItemDto['status'], BadgeProps['variant']> = {
  ACTIVE: 'default',
  PENDING_VERIFICATION: 'secondary',
  SUSPENDED: 'destructive',
  BANNED: 'destructive',
};

export const Route = createFileRoute('/_authenticated/users')({
  validateSearch: searchSchema,
  beforeLoad: ({ context }) => {
    if (context.user.role !== 'ADMIN') {
      throw redirect({ to: '/' });
    }
  },
  component: UsersPage,
});

function UsersPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate({ from: Route.fullPath });
  const { page } = Route.useSearch();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', page, PAGE_SIZE],
    queryFn: () => fetchUsers({ page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  const goToPage = (nextPage: number) => {
    navigate({ search: { page: nextPage } });
  };

  return (
    <main className="grid min-h-screen content-start gap-6 bg-background px-5 py-6 text-foreground sm:px-8">
      <header className="flex items-center justify-between border-b pb-6">
        <h1 className="text-3xl font-semibold tracking-normal">{t('users.title')}</h1>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
      {isError && <p className="text-sm text-destructive">{t('common.error')}</p>}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('users.columns.email')}</TableHead>
                <TableHead>{t('users.columns.name')}</TableHead>
                <TableHead>{t('users.columns.role')}</TableHead>
                <TableHead>{t('users.columns.status')}</TableHead>
                <TableHead>{t('users.columns.createdAt')}</TableHead>
                <TableHead>{t('users.columns.lastLogin')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t('users.empty')}
                  </TableCell>
                </TableRow>
              )}
              {data.data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.profile
                      ? `${user.profile.firstName} ${user.profile.lastName}`
                      : t('users.noName')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(`users.roles.${user.role}`)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[user.status]}>
                      {t(`users.statuses.${user.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString(i18n.language)}</TableCell>
                  <TableCell>
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString(i18n.language)
                      : t('users.never')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              {t('users.pagination.previous')}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t('users.pagination.pageOf', { page, totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              {t('users.pagination.next')}
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
