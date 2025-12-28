import { apiFetch } from './api'

export function getMyProfile() {
  return apiFetch('/me/profile')
}

export function updateMyProfile({ username, bio, avatarStyle, avatarSeed }) {
  return apiFetch('/me/profile', {
    method: 'PUT',
    body: {
      username,
      bio,
      avatarStyle,
      avatarSeed,
    },
  })
}

export function getMySecurity() {
  return apiFetch('/me/security')
}

export function updateMyPassword({ currentPassword, newPassword }) {
  return apiFetch('/me/password', {
    method: 'POST',
    body: { oldPassword: currentPassword, newPassword },
  })
}

export function requestEmailChange({ newEmail }) {
  return apiFetch('/me/email-change/request', {
    method: 'POST',
    body: { newEmail },
  })
}

export function confirmEmailChange({ requestId, newEmail, code }) {
  return apiFetch('/me/email-change/confirm', {
    method: 'POST',
    body: { requestId, newEmail, code },
  })
}

export function setTwoFactorEnabled({ enabled }) {
  return apiFetch('/me/2fa', {
    method: 'POST',
    body: { enabled },
  })
}

export function deactivateAccount({ password }) {
  return apiFetch('/me/deactivate', {
    method: 'POST',
    body: { password },
  })
}

export function deleteAccount({ password }) {
  return apiFetch('/me/delete', {
    method: 'POST',
    body: { password },
  })
}
