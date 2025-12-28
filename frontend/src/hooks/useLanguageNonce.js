import { useEffect, useState } from 'react'

export function useLanguageNonce() {
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const onChanged = () => setNonce((n) => n + 1)
    window.addEventListener('mertflix:lang:changed', onChanged)
    return () => window.removeEventListener('mertflix:lang:changed', onChanged)
  }, [])

  return nonce
}
