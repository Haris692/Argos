// Database row types — mirror supabase/migrations/0001_initial_schema.sql

export interface Client {
  id: string
  owner_id: string
  name: string
  siret: string | null
  address: string | null
  tenant_id: string | null
  tenant_domain: string | null
  subscription_active: boolean
  subscription_price: number
  hourly_rate: number
  after_hours_multiplier: number
  billing_minimum_minutes: number
  billing_increment_minutes: number
  notes: string | null
  created_at: string
  archived_at: string | null
}

export interface Contact {
  id: string
  owner_id: string
  client_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  role: string | null
  is_primary: boolean
}

export type DeviceStatus = 'active' | 'stock' | 'retired'

export interface Device {
  id: string
  owner_id: string
  client_id: string
  hostname: string
  serial_number: string | null
  model: string | null
  os: string | null
  purchase_date: string | null
  warranty_end: string | null
  assigned_contact_id: string | null
  intune_enrolled: boolean
  defender_onboarded: boolean
  status: DeviceStatus
  notes: string | null
}

export interface License {
  id: string
  owner_id: string
  client_id: string
  product: string
  quantity: number
  assigned_contact_id: string | null
  renewal_date: string | null
  monthly_cost: number | null
}

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  active: 'Actif',
  stock: 'En stock',
  retired: 'Retiré',
}

export type TicketCategory = 'support' | 'admin' | 'securite' | 'projet' | 'supervision'
export type TicketPriority = 'bloquant' | 'normal' | 'bas'
export type TicketStatus = 'nouveau' | 'en_cours' | 'attente_client' | 'resolu' | 'ferme'

export interface Ticket {
  id: string
  owner_id: string
  reference: string
  client_id: string
  contact_id: string | null
  title: string
  description: string | null
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  billable: boolean
  created_at: string
  resolved_at: string | null
  closed_at: string | null
  resolution: string | null
}

export interface TimeEntry {
  id: string
  owner_id: string
  ticket_id: string
  date: string
  start_time: string | null
  duration_minutes: number
  after_hours: boolean
  description: string | null
  created_at: string
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  support: 'Support',
  admin: 'Administration',
  securite: 'Sécurité',
  projet: 'Projet',
  supervision: 'Supervision',
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  bloquant: 'Bloquant',
  normal: 'Normal',
  bas: 'Bas',
}

export interface MonthlyReport {
  id: string
  owner_id: string
  client_id: string
  month: string // YYYY-MM
  defender_alerts_reviewed: number | null
  defender_alerts_resolved: number | null
  devices_compliant: number | null
  devices_total: number | null
  updates_status: string | null
  accounts_reviewed: string | null
  recommendations: string | null
  generated_at: string | null
  sent_at: string | null
}

export type BillingSummaryStatus = 'brouillon' | 'valide' | 'facture_externe'

export interface BillingSummaryRow {
  id: string
  owner_id: string
  client_id: string
  month: string
  subscription_amount: number
  billable_minutes: number
  billable_amount: number
  after_hours_minutes: number
  after_hours_amount: number
  total_amount: number
  lines: import('@/lib/billingSummary').SummaryLine[]
  status: BillingSummaryStatus
  exported_at: string | null
}

export const BILLING_SUMMARY_STATUS_LABELS: Record<BillingSummaryStatus, string> = {
  brouillon: 'Brouillon',
  valide: 'Validé',
  facture_externe: 'Facturé (externe)',
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  attente_client: 'Attente client',
  resolu: 'Résolu',
  ferme: 'Fermé',
}
