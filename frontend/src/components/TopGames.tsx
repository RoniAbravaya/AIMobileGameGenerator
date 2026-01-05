'use client'

/**
 * Top Games Component
 * 
 * Shows the top performing games by score.
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Link from 'next/link'
import { clsx } from 'clsx'
import { ChevronRight, Trophy } from 'lucide-react'

export function TopGames() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['metrics-summary'],
    queryFn: () => api.getMetricsSummary(7),
  })

  const topGames = metrics?.top_games || []

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Top Games</h2>
        <span className="text-sm text-gray-500">Last 7 days</span>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-gray-100 rounded" />
          ))}
        </div>
      ) : topGames.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No games with metrics yet. Generate games and collect analytics.
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {topGames.slice(0, 5).map((game: any, index: number) => (
            <li key={game.game_id}>
              <Link
                href={`/games/${game.game_id}`}
                className="block px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className={clsx(
                        'flex items-center justify-center w-8 h-8 rounded-full',
                        index === 0
                          ? 'bg-yellow-100 text-yellow-600'
                          : index === 1
                          ? 'bg-gray-100 text-gray-600'
                          : index === 2
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-gray-50 text-gray-500'
                      )}
                    >
                      {index < 3 ? (
                        <Trophy className="h-4 w-4" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-900">{game.game_name}</p>
                      <p className="text-sm text-gray-500">
                        {game.installs?.toLocaleString()} installs • {game.dau?.toLocaleString()} DAU
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Score: {game.score?.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500">
                        D7 Ret: {(game.retention_d7 * 100).toFixed(1)}%
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <Link
          href="/metrics"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all metrics →
        </Link>
      </div>
    </div>
  )
}
