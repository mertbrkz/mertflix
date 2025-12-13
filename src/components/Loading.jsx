export default function Loading({ label = 'Yükleniyor...', className = '' }) {
  return (
    <div className={`py-16 text-center text-white/70 ${className}`}>
      {label}
    </div>
  )
}
