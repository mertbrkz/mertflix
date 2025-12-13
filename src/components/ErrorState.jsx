export default function ErrorState({
  title = 'Bir şeyler ters gitti',
  message,
  onRetry,
  className = '',
}) {
  return (
    <div className={`py-10 text-center ${className}`}>
      <div className="text-rose-500 font-semibold">{title}</div>
      {message ? <div className="text-white/70 mt-2">{message}</div> : null}
      {typeof onRetry === 'function' ? (
        <div className="mt-4">
          <button
            type="button"
            className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5"
            onClick={onRetry}
          >
            Tekrar dene
          </button>
        </div>
      ) : null}
    </div>
  )
}
