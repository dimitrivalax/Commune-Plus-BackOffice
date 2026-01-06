import type { AvatarProps } from '@nuxt/ui'

export type UserStatus = 'subscribed' | 'unsubscribed' | 'bounced'
export type SaleStatus = 'paid' | 'failed' | 'refunded'

export interface User {
  id: number
  name: string
  email: string
  avatar?: AvatarProps
  status: UserStatus
  location: string
}

export interface Mail {
  id: number
  unread?: boolean
  from: User
  subject: string
  body: string
  date: string
}

export interface Member {
  name: string
  username: string
  role: 'member' | 'owner'
  avatar: AvatarProps
}

export interface Stat {
  title: string
  icon: string
  value: number | string
  variation: number
  formatter?: (value: number) => string
}

export interface Sale {
  id: string
  date: string
  status: SaleStatus
  email: string
  amount: number
}

export interface Notification {
  id: number
  unread?: boolean
  sender: User
  body: string
  date: string
}

export type Period = 'daily' | 'weekly' | 'monthly'

export interface Range {
  start: Date
  end: Date
}

export type SignalementStatus = 'en_attente' | 'en_cours' | 'traité'

export interface Signalement {
  id: string
  description: string | null
  latitude: number | null
  longitude: number | null
  location_accuracy: number | null
  address: string | null
  comment: string | null
  photo_url: string | null
  last_name: string
  first_name: string
  email: string | null
  phone: string | null
  status: SignalementStatus
  created_at: string
  updated_at: string
  city_id: string | null
}
