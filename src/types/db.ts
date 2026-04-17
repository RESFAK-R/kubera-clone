export type AssetKind =
  | 'cash'
  | 'stock'
  | 'crypto'
  | 'metal'
  | 'real_estate'
  | 'liability'
  | 'other'

export type SheetKind = 'asset' | 'debt'

export type TickerKind = 'stock' | 'crypto' | 'metal' | 'index'

export type TransactionKind =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'buy'
  | 'sell'
  | 'dividend'

export type Cadence = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type BeneficiaryRole = 'primary' | 'secondary' | 'trusted_angel'

export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF'

export interface Asset {
  id: string
  user_id: string
  portfolio_id: string | null
  name: string
  asset_type: AssetKind
  value: number
  currency: string
  sheet: string | null
  section: string | null
  cost_basis: number | null
  ticker: string | null
  quantity: number | null
  is_liability: boolean
  sort_order: number
  notes: string | null
  last_priced_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Sheet {
  id: string
  user_id: string
  name: string
  kind: SheetKind
  sort_order: number
  created_at: string
  updated_at: string
}

export interface NetWorthSnapshot {
  id: string
  user_id: string
  snapshot_date: string
  total_assets: number
  total_debts: number
  net_worth: number
  cash: number
  investable: number
  real_estate: number
  base_currency: string
  breakdown: Record<string, number>
  created_at: string
}

export interface TickerCache {
  id: string
  kind: TickerKind
  symbol: string
  name: string | null
  price: number
  currency: string
  change_24h: number | null
  change_pct_24h: number | null
  metadata: Record<string, unknown>
  fetched_at: string
}

export interface FxRate {
  id: string
  base: string
  quote: string
  rate: number
  rate_date: string
  fetched_at: string
}

export interface Beneficiary {
  id: string
  user_id: string
  role: BeneficiaryRole
  full_name: string
  email: string
  phone: string | null
  relationship: string | null
  notes: string | null
  notified_at: string | null
  created_at: string
  updated_at: string
}

export interface LifeBeatState {
  user_id: string
  check_interval_days: number
  last_active_at: string
  last_checked_at: string | null
  notifications_sent: number
  triggered: boolean
  enabled: boolean
  updated_at: string
}

export interface Document {
  id: string
  user_id: string
  title: string
  category: string | null
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  share_with_beneficiaries: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  asset_id: string | null
  kind: TransactionKind
  amount: number
  currency: string
  category: string | null
  description: string | null
  occurred_at: string
  recurring_rule_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface RecurringRule {
  id: string
  user_id: string
  name: string
  kind: 'income' | 'expense' | 'transfer'
  amount: number
  currency: string
  category: string | null
  cadence: Cadence
  start_date: string
  end_date: string | null
  next_run_date: string
  yearly_bump_pct: number
  enabled: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AiConversation {
  id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface AiMessage {
  id: string
  conversation_id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens_in: number | null
  tokens_out: number | null
  cached_tokens: number | null
  model: string | null
  created_at: string
}

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }
