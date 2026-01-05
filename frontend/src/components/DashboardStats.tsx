'use client'

/**
 * Dashboard Stats Component
 * 
 * Displays key metrics at a glance.
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Layers, Gamepad2, Users, DollarSign } from 'lucide-react'

export function DashboardStats() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['metrics-summary'],
    queryFn: () => api.getMetricsSummary(30),
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse h-24 bg-gray-200 rounded-lg" />
        ))}
      </div>
    )
  }

  const stats = [
    {
      name: 'Total Games',
      value: metrics?.total_games || 0,
      icon: Gamepad2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Total Installs',
      value: metrics?.total_installs?.toLocaleString() || '0',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Daily Active Users',
      value: metrics?.total_dau?.toLocaleString() || '0',
      icon: Layers,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Revenue (30d)',
      value: `$${((metrics?.total_ad_revenue_cents || 0) / 100).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
