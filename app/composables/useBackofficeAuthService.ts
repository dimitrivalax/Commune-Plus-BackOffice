export const useBackofficeAuthService = () => {
  async function fetchCurrentUser(token: string) {
    return await $fetch('/api/user/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
  }

  async function signup(payload: {
    firstName: string
    lastName: string
    fonction: string
    email: string
    password: string
  }) {
    return await $fetch('/api/auth/signup', {
      method: 'POST',
      body: payload
    })
  }

  return { fetchCurrentUser, signup }
}
