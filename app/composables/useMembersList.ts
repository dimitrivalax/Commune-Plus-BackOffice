import type { Member } from '~/types'

export async function useMembersList() {
  const { data: members } = await useFetch<Member[]>('/api/members', { default: () => [] })
  return { members }
}
