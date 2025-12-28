import { useT } from '../i18n/useT'

export default function Loading({ label, className = '' }) {
  const { t } = useT()
  const content = label == null ? t('common_loading') : label
  return (
    <div className={`py-16 text-center text-white/70 ${className}`}>
      {content}
    </div>
  )
}
