import React from 'react'

import { Link } from 'react-router-dom'

export default function Row({ title, children, seeAllQuery, seeAllTo }) {
  const to = seeAllTo || (seeAllQuery ? `/shows?q=${encodeURIComponent(seeAllQuery)}` : null)
  return (
    <section className="my-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-semibold">{title}</h3>
        {to ? (
          <Link to={to} className="text-sm underline hidden sm:inline">See all</Link>
        ) : (
          <div className="text-sm hidden sm:block">See all</div>
        )}
      </div>
      <div className="flex gap-3 overflow-x-scroll scrollbar-hide pb-2">
        {children}
      </div>
    </section>
  )
}
