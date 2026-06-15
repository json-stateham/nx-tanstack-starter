import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';

import { i18n } from '../lib/i18n';
import '../styles.css';

const queryClient = new QueryClient();

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Admin' },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <Outlet />
          </QueryClientProvider>
        </I18nextProvider>
        <Scripts />
      </body>
    </html>
  );
}
