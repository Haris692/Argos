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
