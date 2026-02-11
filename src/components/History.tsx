import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface HistoryItem {
  expression: string
  result: string
}

interface HistoryProps {
  items: HistoryItem[]
  onItemClick: (result: string) => void
  onClear: () => void
}

export function History({ items, onItemClick, onClear }: HistoryProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 rounded-2xl shadow-2xl p-6 border border-slate-700 dark:border-slate-800 h-fit sticky top-24">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-100">History</h2>
        <div className="flex gap-2">
          {items.length > 0 && (
            <button
              onClick={onClear}
              className="p-2 rounded-lg bg-slate-700 dark:bg-slate-800 hover:bg-red-600 dark:hover:bg-red-600 text-slate-300 hover:text-white transition-all duration-200 active:scale-95"
              title="Clear history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg bg-slate-700 dark:bg-slate-800 hover:bg-slate-600 dark:hover:bg-slate-700 text-slate-300 transition-all duration-200"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
              No calculations yet
            </p>
          ) : (
            items.map((item, index) => (
              <button
                key={index}
                onClick={() => onItemClick(item.result)}
                className="w-full text-left p-3 rounded-lg bg-slate-700 dark:bg-slate-800 hover:bg-slate-600 dark:hover:bg-slate-700 transition-all duration-200 active:scale-95 group"
              >
                <div className="text-xs text-slate-400 dark:text-slate-500 group-hover:text-slate-300 truncate">
                  {item.expression}
                </div>
                <div className="text-sm font-semibold text-blue-400 dark:text-blue-300 group-hover:text-blue-300">
                  = {item.result}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Keyboard Hint */}
      <div className="mt-6 pt-6 border-t border-slate-700 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 space-y-1">
        <p className="font-semibold text-slate-300 dark:text-slate-400 mb-2">Keyboard Shortcuts</p>
        <p>• Numbers: <span className="text-slate-300">0-9</span></p>
        <p>• Operations: <span className="text-slate-300">+ - * /</span></p>
        <p>• Equals: <span className="text-slate-300">Enter</span> or <span className="text-slate-300">=</span></p>
        <p>• Clear: <span className="text-slate-300">C</span></p>
        <p>• All Clear: <span className="text-slate-300">A</span></p>
        <p>• Backspace: <span className="text-slate-300">Backspace</span></p>
      </div>
    </div>
  )
}
