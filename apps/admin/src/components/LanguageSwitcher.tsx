import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LANGUAGES = [
  { code: 'en', label: 'EN — English' },
  { code: 'ru', label: 'RU — Русский' },
  { code: 'ar', label: 'AR — العربية' },
  { code: 'cn', label: 'CN — 中文' },
  { code: 'ja', label: 'JA — 日本語' },
  { code: 'es', label: 'ES — Español' },
] as const;

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  return (
    <Select value={i18n.language} onValueChange={(v: string) => i18n.changeLanguage(v)}>
      <SelectTrigger className="w-36" aria-label="Select language">
        <Globe className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map(({ code, label }) => (
          <SelectItem key={code} value={code}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
