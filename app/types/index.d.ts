import type { AvatarProps } from "@nuxt/ui";

export type UserStatus = "subscribed" | "unsubscribed" | "bounced";
export type SaleStatus = "paid" | "failed" | "refunded";

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: AvatarProps;
  status: UserStatus;
  location: string;
}

export interface Mail {
  id: number;
  unread?: boolean;
  from: User;
  subject: string;
  body: string;
  date: string;
}

export interface Member {
  name: string;
  username: string;
  role: "member" | "owner";
  avatar: AvatarProps;
}

export interface Stat {
  title: string;
  icon: string;
  value: number | string;
  variation: number;
  formatter?: (value: number) => string;
}

export interface Sale {
  id: string;
  date: string;
  status: SaleStatus;
  email: string;
  amount: number;
}

export interface Notification {
  id: string | number;
  unread?: boolean;
  sender: User;
  body: string;
  date: string;
  type?: "signalement" | "reservation";
  entity_id?: string;
  title?: string;
}

export type Period = "daily" | "weekly" | "monthly";

export interface Range {
  start: Date;
  end: Date;
}

export type SignalementStatus =
  | "en_attente"
  | "en_cours"
  | "traite"
  | "archive";

export interface Signalement {
  id: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  address: string | null;
  comment: string | null;
  reponse: string | null;
  photo_url: string | null;
  last_name: string;
  first_name: string;
  email: string | null;
  phone: string | null;
  status: SignalementStatus;
  created_at: string;
  updated_at: string;
  city_id: string | null;
}

export interface MunicipalInfo {
  id: string;
  title: string;
  content: string;
  category: string | null;
  image_url: string | null;
  commune_id: string | null;
  event_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Salle {
  id: string;
  nom: string;
  adresse: string;
  nombre_max_places: number;
  description: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationSalle {
  id: string;
  salle_id: string;
  date_debut: string;
  date_fin: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  nom_association: string | null;
  status?: "en_attente" | "confirmée" | "refusée";
  created_at: string;
  updated_at: string;
  salles?: {
    id: string;
    nom: string;
    adresse: string;
  };
}

export interface Utilisateur {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  numero_de_rue: string | null;
  rue: string | null;
  code_postal: string | null;
  ville: string | null;
  email: string;
  role: "utilisateur" | "administrateur";
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
  communes?: Commune[];
}

export interface Commune {
  id: string;
  name: string;
  postal_code: string;
  email: string;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Proposition {
  id: string;
  commune_id: string;
  user_id: string;
  name: string;
  description: string;
  photo_url: string | null;
  user_firstname: string;
  user_lastname: string;
  user_email: string;
  votes_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  comments?: PropositionComment[];
}

export interface PropositionComment {
  id: string;
  proposition_id: string;
  user_firstname: string;
  user_lastname: string;
  user_email: string;
  content: string;
  created_at: string;
}
