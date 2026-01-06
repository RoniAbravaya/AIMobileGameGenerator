'use client'

/**
 * New Batch Page
 * 
 * Form for creating a new batch of games.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Loader2, ArrowLeft, Gamepad2 } from 'lucide-react'
import Link from 'next/link'

const AVAILABLE_GENRES = [
  { id: 'platformer', name: 'Platformer', description: 'Jump and run games' },
  { id: 'runner', name: 'Runner', description: 'Endless running games' },
  { id: 'puzzle', name: 'Puzzle', description: 'Brain teasers and logic games' },
  { id: 'arcade', name: 'Arcade', description: 'Classic arcade-style games' },
  { id: 'shooter', name: 'Shooter', description: 'Action shooting games' },
  { id: 'casual', name: 'Casual', description: 'Simple, easy-to-play games' },
]

export default function NewBatchPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [name, setName] = useState('')
  const [gameCount, setGameCount] = useState(10)
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['platformer', 'runner', 'puzzle'])
  const [error, setError] = useState<string | null>(null)

  const createBatch = useMutation({
    mutationFn: (data: { name?: string; count: number; genre_mix: string[] }) =>
      api.createBatch(data),
    onSuccess: (batch: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      queryClient.invalidateQueries({ queryKey: ['batches-all'] })
      router.push(`/batches/${batch.id}`)
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create batch')
    },
  })

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((g) => g !== genreId)
        : [...prev, genreId]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (selectedGenres.length === 0) {
      setError('Please select at least one genre')
      return
    }

    console.log('[NewBatch] Submitting with gameCount:', gameCount)
    
    createBatch.mutate({
      name: name || undefined,
      count: gameCount,
      genre_mix: selectedGenres,
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          href="/batches"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Batch</h1>
          <p className="text-gray-600">Generate multiple games at once</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Batch Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Batch Name (optional)
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., January 2026 Games"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Leave empty to auto-generate a name
          </p>
        </div>

        {/* Game Count */}
        <div>
          <label htmlFor="gameCount" className="block text-sm font-medium text-gray-700 mb-2">
            Number of Games
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              id="gameCount"
              min="1"
              max="50"
              value={gameCount}
              onChange={(e) => setGameCount(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="w-12 text-center font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded">
              {gameCount}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Each game will be generated through the 12-step pipeline
          </p>
        </div>

        {/* Genre Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Genre Mix
          </label>
          <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_GENRES.map((genre) => (
              <button
                key={genre.id}
                type="button"
                onClick={() => toggleGenre(genre.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedGenres.includes(genre.id)
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Gamepad2
                    className={`h-5 w-5 ${
                      selectedGenres.includes(genre.id)
                        ? 'text-indigo-600'
                        : 'text-gray-400'
                    }`}
                  />
                  <div>
                    <p
                      className={`font-medium ${
                        selectedGenres.includes(genre.id)
                          ? 'text-indigo-900'
                          : 'text-gray-900'
                      }`}
                    >
                      {genre.name}
                    </p>
                    <p className="text-xs text-gray-500">{genre.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Selected: {selectedGenres.length} genre{selectedGenres.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Link
            href="/batches"
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createBatch.isPending || selectedGenres.length === 0}
            className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createBatch.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Gamepad2 className="h-5 w-5 mr-2" />
                Create Batch
              </>
            )}
          </button>
        </div>
      </form>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Each game goes through a 12-step generation pipeline</li>
          <li>• AI generates GDD, code, assets, and analytics</li>
          <li>• Games are built and deployed to GitHub repositories</li>
          <li>• Progress is tracked in real-time on the batch details page</li>
        </ul>
      </div>
    </div>
  )
}

