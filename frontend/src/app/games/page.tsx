'use client'

/**
 * Games List Page
 * 
 * Displays all games with status and links to details.
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { clsx } from 'clsx'
import { Loader2, Gamepad2, ChevronRight, Github } from 'lucide-react'

const statusColors: Record<string, string> = {
  created: 'bg-gray-100 text-gray-600',
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-600',
  generating: 'bg-blue-100 text-blue-600',
  completed: 'bg-green-100 text-green-600',
  failed: 'bg-red-100 text-red-600',
  cancelled: 'bg-yellow-100 text-yellow-600',
}

export default function GamesPage() {
  const { data: games, isLoading } = useQuery({
    queryKey: ['games-all'],
    queryFn: () => api.listGames(0, 100),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Games</h1>
        <p className="text-gray-600">All generated games and their progress</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : !games || games.length === 0 ? (
          <div className="p-12 text-center">
            <Gamepad2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No games yet</p>
            <Link
              href="/batches/new"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
            >
              Create a Batch
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {games.map((game: any) => (
              <li key={game.id}>
                <Link
                  href={`/games/${game.id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={clsx(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          statusColors[game.status] || 'bg-gray-100'
                        )}
                      >
                        <Gamepad2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{game.name}</p>
                        <p className="text-sm text-gray-500">
                          {game.genre} • Step {game.current_step}/12
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span
                        className={clsx(
                          'px-2.5 py-0.5 text-xs font-medium rounded-full',
                          statusColors[game.status] || 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {game.status}
                      </span>
                      {game.github_repo_url && (
                        <Github className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(game.created_at), { addSuffix: true })}
                      </span>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
