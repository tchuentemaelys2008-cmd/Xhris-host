import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';

export default getRequestConfig(async () => {
  const headersList = headers();
  const acceptLanguage = headersList.get('accept-language') || '';
  const primaryLang = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase() || 'fr';
  const locale = primaryLang === 'en' ? 'en' : 'fr';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
