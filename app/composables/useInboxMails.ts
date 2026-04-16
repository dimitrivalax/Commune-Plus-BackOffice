import type { Mail } from '~/types'

export async function useInboxMails() {
  const { data: mails } = await useFetch<Mail[]>('/api/mails', { default: () => [] })
  return { mails }
}
