import { useNavigate } from 'react-router-dom'

export default function Banner({ movie, to }) {
  if (!movie) return null

  const navigate = useNavigate()

  const backgroundStyle = {
    backgroundImage: `url(${movie.image?.original || movie.image?.medium || ''})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
  }

  function truncate(str, n) {
    return str?.length > n ? str.substr(0, n - 1) + "..." : str;
  }

  const rawSummary = movie.summary || movie.overview || ''
  const summary = rawSummary ? String(rawSummary).replace(/<[^>]+>/g, '') : ''

  return (
    <header
      className="relative text-white w-full h-[70vh] md:h-[80vh]"
      style={backgroundStyle}
    >
      <div className="h-full flex items-end">
        <div className="px-4 sm:px-6 lg:px-8 pb-10 md:pb-14 w-full max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold pb-2">
          {movie.name || movie.title || movie.original_name}
          </h1>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => { if (to) navigate(to) }}
              className="cursor-pointer text-white outline-none border border-white/20 font-bold rounded px-8 py-2 bg-black/50 hover:bg-black/70 transition-colors"
              disabled={!to}
              aria-disabled={!to}
              title={!to ? 'Detay yok' : 'Detaya git'}
            >
              Daha Fazla Bilgi
            </button>
          </div>

          <div className="pt-4 text-sm md:text-lg drop-shadow-lg text-white/90">
            {truncate(summary, 180)}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 w-full h-[7.4rem] bg-gradient-to-b from-transparent to-black" />
    </header>
  )
}
