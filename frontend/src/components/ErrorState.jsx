import { useT } from '../i18n/useT'

export default function ErrorState({
  title,
  message,
  onRetry,
  retryLabel,
  className = '',
}) {
  const { t } = useT()
  const resolvedTitle = title || t('common_something_went_wrong')
  const resolvedRetryLabel = retryLabel || t('common_try_again')

  return (
    <div className={`py-10 text-center ${className}`}>
      <div className="text-rose-500 font-semibold">{resolvedTitle}</div>
      {message ? <div className="text-white/70 mt-2">{message}</div> : null}
      {typeof onRetry === 'function' ? (
        <div className="mt-4">
          <button
            type="button"
            className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5"
            onClick={onRetry}
          >
            {resolvedRetryLabel}
          </button>
        </div>
      ) : null}
    </div>
  )
}
