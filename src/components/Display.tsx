import { forwardRef } from 'react'
import { Copy, Check } from 'lucide-react'

interface DisplayProps {
  value: string
  onCopy: () => void
  copied: boolean
}

export const Display = forwardRef<HTMLDivElement, DisplayProps>(
  ({ value, onCopy, copied }, ref) => {
    return (
      <div
        ref={ref}
        className="relative mb-6 p-6 bg-gradient-to-br from-slate-900 to-slate-950 dark:from-slate-950 dark:to-slate-1000 rounded-xl border border-slate-700 dark:border-slate-800 shadow-inner"
      >
        <div className="text-right">
          <div className="text-5xl sm:text-6xl font-bold text-blue-400 dark:text-blue-300 break-words overflow-hidden">
            {value}
          </div>
        </div>
        <button
          onClick={onCopy}
          className="absolute top-4 right-4 p-2 rounded-lg bg-slate-700 dark:bg-slate-800 hover:bg-slate-600 dark:hover:bg-slate-700 transition-all duration-200 active:scale-95"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-5 h-5 text-green-400" />
          ) : (
            <Copy className="w-5 h-5 text-slate-300" />
          )}
        </button>
      </div>
    )
  }
)

Display.displayName = 'Display'
