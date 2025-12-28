import { useMemo } from 'react'
import { getPreferredLanguage } from '../services/languagePref'
import { useLanguageNonce } from '../hooks/useLanguageNonce'
import { translations } from './translations'

export function useT() {
  const langNonce = useLanguageNonce()

  return useMemo(() => {
    const lang = getPreferredLanguage()
    const dict = translations[lang] || translations.tr

    function t(key, fallback) {
      const v = dict[key]
      if (typeof v === 'string') return v
      return typeof fallback === 'string' ? fallback : key
    }

    return { t, lang }
  }, [langNonce])
}
