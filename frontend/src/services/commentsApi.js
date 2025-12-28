import { apiFetch } from './api'

export async function fetchComments(mediaType, tmdbId) {
  const qs = new URLSearchParams({ mediaType, tmdbId: String(tmdbId) })
  const data = await apiFetch(`/comments?${qs.toString()}`)
  return Array.isArray(data?.comments) ? data.comments : []
}

export async function postComment(mediaType, tmdbId, body) {
  return apiFetch('/comments', {
    method: 'POST',
    body: { mediaType, tmdbId, body },
  })
}

export async function deleteComment(commentId) {
  return apiFetch(`/comments/${encodeURIComponent(String(commentId))}`, {
    method: 'DELETE',
  })
}

// value: 1 (up), -1 (down), 0 (clear)
export async function voteComment(commentId, value) {
  return apiFetch(`/comments/${encodeURIComponent(String(commentId))}/vote`, {
    method: 'POST',
    body: { value },
  })
}
