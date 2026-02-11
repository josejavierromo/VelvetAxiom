import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const [isDark, setIsDark] = useState(true)

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
        {/* Header */}
        <header className="border-b border-slate-700 dark:border-slate-800 bg-slate-800/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                🧮 Velvet Axiom
              </div>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Calculator</span>
            </div>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg bg-slate-700 dark:bg-slate-800 hover:bg-slate-600 dark:hover:bg-slate-700 transition-colors duration-200"
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600" />
              )}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-700 dark:border-slate-800 bg-slate-800/50 dark:bg-slate-900/50 backdrop-blur-sm mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
            <p>Velvet Axiom Calculator • Precision Math for Every Task</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
