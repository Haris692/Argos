// Functional color vocabulary (Linear/Raycast-inspired): every hue means
// something. Green = money, sky = clients/support, amber = in progress,
// violet = reports, rose = security, red = blocking. Used as Badge/chip
// class overlays on the dark ink base.

import type { DeviceStatus, TicketCategory, TicketPriority, TicketStatus } from '@/types'

export const STATUS_COLORS: Record<TicketStatus, string> = {
  nouveau: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  en_cours: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  attente_client: 'border-violet-400/30 bg-violet-400/10 text-violet-300',
  resolu: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  ferme: 'border-white/10 bg-white/5 text-muted-foreground',
}

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  bloquant: 'border-red-400/35 bg-red-400/10 text-red-300',
  normal: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  bas: 'border-white/10 bg-white/5 text-muted-foreground',
}

export const CATEGORY_COLORS: Record<TicketCategory, string> = {
  support: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  admin: 'border-teal-400/30 bg-teal-400/10 text-teal-300',
  securite: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
  projet: 'border-violet-400/30 bg-violet-400/10 text-violet-300',
  supervision: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
}

export const DEVICE_STATUS_COLORS: Record<DeviceStatus, string> = {
  active: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  stock: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  retired: 'border-white/10 bg-white/5 text-muted-foreground',
}

/** Chip for the supervision subscription — money hue. */
export const SUBSCRIPTION_CHIP = 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'

/** Neutral chip for secondary information. */
export const NEUTRAL_CHIP = 'border-white/10 bg-white/5 text-muted-foreground'
