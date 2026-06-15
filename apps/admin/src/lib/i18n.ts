import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from '../locales/ar.json';
import cn from '../locales/cn.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import ja from '../locales/ja.json';
import ru from '../locales/ru.json';

export const i18n = i18next.createInstance();

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    ar: { translation: ar },
    cn: { translation: cn },
    ja: { translation: ja },
    es: { translation: es },
  },
  interpolation: {
    escapeValue: false,
  },
});
