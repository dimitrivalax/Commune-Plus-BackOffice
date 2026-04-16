import type { User } from '~/types'

export async function useCustomersList() {
  const { data, status } = await useFetch<User[]>('/api/customers', {
    lazy: true
  })
  return { data, status }
}
