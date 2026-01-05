'use client'

/**
 * Navigation Component
 * 
 * Main navigation bar for the application.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { 
  LayoutDashboard, 
  Layers, 
  Gamepad2, 
  Puzzle, 
  BarChart3,
  Settings
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Batches', href: '/batches', icon: Layers },
  { name: 'Games', href: '/games', icon: Gamepad2 },
  { name: 'Mechanics', href: '/mechanics', icon: Puzzle },
  { name: 'Metrics', href: '/metrics', icon: BarChart3 },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex h-16 justify-between">
          <div className="flex">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Gamepad2 className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                GameFactory
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden sm:ml-10 sm:flex sm:space-x-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md',
                      isActive
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    )}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center">
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
