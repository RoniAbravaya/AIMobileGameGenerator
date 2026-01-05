/**
 * TypeScript Types
 * 
 * Shared types for the frontend application.
 */

export interface Batch {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  game_count: number
  genre_mix: string[]
  constraints?: Record<string, any>
  created_at: string
  started_at?: string
  completed_at?: string
  games?: GameSummary[]
}

export interface GameSummary {
  id: string
  name: string
  slug: string
  genre: string
  status: string
  current_step: number
  step_progress: number
  github_repo_url?: string
  created_at: string
}

export interface Game extends GameSummary {
  batch_id?: string
  github_repo?: string
  gdd_spec: Record<string, any>
  analytics_spec: Record<string, any>
  selected_mechanics: string[]
  selected_template?: string
  updated_at: string
  published_at?: string
  steps: Step[]
}

export interface Step {
  id: string
  game_id: string
  step_number: number
  step_name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  retry_count: number
  max_retries: number
  started_at?: string
  completed_at?: string
  error_message?: string
  artifacts: Record<string, any>
  validation_results: Record<string, any>
}

export interface Mechanic {
  id: string
  name: string
  source_url: string
  flame_example?: string
  genre_tags: string[]
  input_model: 'tap' | 'drag' | 'joystick' | 'tilt' | 'swipe' | 'multi_touch'
  complexity: number
  description?: string
  compatible_with_ads: boolean
  compatible_with_levels: boolean
  is_active: boolean
  created_at: string
}

export interface GameMetrics {
  id: string
  game_id: string
  date: string
  installs: number
  dau: number
  sessions: number
  avg_session_duration_seconds: number
  retention_d1: number
  retention_d7: number
  retention_d30: number
  levels_completed: number
  levels_failed: number
  ad_impressions: number
  ad_revenue_cents: number
  iap_revenue_cents: number
  total_revenue_cents: number
  completion_rate: number
  score: number
}

export interface MetricsSummary {
  total_games: number
  total_installs: number
  total_dau: number
  avg_retention_d1: number
  avg_retention_d7: number
  total_ad_revenue_cents: number
  total_iap_revenue_cents: number
  top_games: GameMetricsSummary[]
}

export interface GameMetricsSummary {
  game_id: string
  game_name: string
  installs: number
  dau: number
  retention_d7: number
  score: number
}

export interface AnalyticsEvent {
  game_id: string
  event_type: string
  user_id?: string
  session_id?: string
  level?: number
  properties?: Record<string, any>
  device_info?: Record<string, any>
  timestamp: string
}
