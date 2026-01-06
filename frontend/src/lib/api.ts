/**
 * API Client
 *
 * HTTP client for communicating with the GameFactory backend API.
 */

import axios, { AxiosInstance } from 'axios'
import type { Batch, Game, MetricsSummary, Mechanic } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Create axios instance with default config
const client: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Request interceptor for logging (development only)
client.interceptors.request.use((config) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
  }
  return config
})

// Response interceptor for error handling
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An error occurred'
    console.error('[API Error]', message)
    return Promise.reject(new Error(message))
  }
)

/**
 * API methods for interacting with the backend
 */
export const api = {
  // ==================
  // Batches
  // ==================

  /**
   * List all batches with pagination
   */
  async listBatches(skip: number = 0, limit: number = 20): Promise<Batch[]> {
    const response = await client.get('/batches', {
      params: { skip, limit },
    })
    return response.data
  },

  /**
   * Get a single batch by ID
   */
  async getBatch(batchId: string): Promise<Batch> {
    const response = await client.get(`/batches/${batchId}`)
    return response.data
  },

  /**
   * Create a new batch
   */
  async createBatch(data: {
    name?: string
    count: number
    genre_mix: string[]
    constraints?: Record<string, unknown>
  }): Promise<Batch> {
    const payload = {
      name: data.name,
      game_count: data.count,
      genre_mix: data.genre_mix,
      constraints: data.constraints,
    }
    console.log('[API] Creating batch with payload:', payload)
    const response = await client.post('/batches', payload)
    console.log('[API] Batch created:', response.data)
    return response.data
  },

  /**
   * Start processing a batch
   */
  async startBatch(batchId: string): Promise<Batch> {
    const response = await client.post(`/batches/${batchId}/start`)
    return response.data
  },

  /**
   * Cancel a batch
   */
  async cancelBatch(batchId: string): Promise<Batch> {
    const response = await client.post(`/batches/${batchId}/cancel`)
    return response.data
  },

  // ==================
  // Games
  // ==================

  /**
   * List all games with pagination
   */
  async listGames(skip: number = 0, limit: number = 20): Promise<Game[]> {
    const response = await client.get('/games', {
      params: { skip, limit },
    })
    return response.data
  },

  /**
   * Get a single game by ID
   */
  async getGame(gameId: string): Promise<Game> {
    const response = await client.get(`/games/${gameId}`)
    return response.data
  },

  // ==================
  // Mechanics
  // ==================

  /**
   * List all mechanics
   */
  async listMechanics(genre?: string): Promise<Mechanic[]> {
    const response = await client.get('/mechanics', {
      params: genre ? { genre } : undefined,
    })
    return response.data
  },

  /**
   * Get a single mechanic by ID
   */
  async getMechanic(mechanicId: string): Promise<Mechanic> {
    const response = await client.get(`/mechanics/${mechanicId}`)
    return response.data
  },

  // ==================
  // Metrics
  // ==================

  /**
   * Get metrics summary for the dashboard
   */
  async getMetricsSummary(days: number = 30): Promise<MetricsSummary> {
    const response = await client.get('/metrics/summary', {
      params: { days },
    })
    return response.data
  },

  /**
   * Get metrics for a specific game
   */
  async getGameMetrics(gameId: string, days: number = 30): Promise<unknown> {
    const response = await client.get(`/metrics/games/${gameId}`, {
      params: { days },
    })
    return response.data
  },

  // ==================
  // Events
  // ==================

  /**
   * Record an analytics event
   */
  async recordEvent(event: {
    game_id: string
    event_type: string
    user_id?: string
    session_id?: string
    level?: number
    properties?: Record<string, unknown>
  }): Promise<void> {
    await client.post('/events', event)
  },

  // ==================
  // Logs
  // ==================

  /**
   * Get logs for a game
   */
  async getGameLogs(gameId: string, limit: number = 100): Promise<LogEntry[]> {
    const response = await client.get(`/logs/games/${gameId}`, {
      params: { limit },
    })
    return response.data
  },

  /**
   * Get logs for a batch
   */
  async getBatchLogs(batchId: string, limit: number = 100): Promise<LogEntry[]> {
    const response = await client.get(`/logs/batches/${batchId}`, {
      params: { limit },
    })
    return response.data
  },

  // ==================
  // Health
  // ==================

  /**
   * Check API health
   */
  async healthCheck(): Promise<{ status: string; app: string; version: string }> {
    const response = await axios.get(`${API_URL}/health`)
    return response.data
  },
}

// Log entry type
export interface LogEntry {
  id: string
  batch_id?: string
  game_id?: string
  step_number?: number
  log_level: string
  log_type: string
  message: string
  metadata?: Record<string, unknown>
  created_at: string
}

export default api
