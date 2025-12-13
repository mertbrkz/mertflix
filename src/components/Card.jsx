import { Link } from 'react-router-dom'

export default function Card({ to, title, subtitle, image, children }) {
  return (
    <Link to={to} className="block bg-gradient-to-b from-slate-800 to-slate-900 p-3 rounded-lg shadow-md hover:scale-[1.01] transition-transform">
      <div className="h-40 md:h-48 bg-cover bg-center rounded-md" style={{ backgroundImage: image ? `url(${image})` : undefined }} />
      <div className="mt-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        {children}
      </div>
    </Link>
  )
}
