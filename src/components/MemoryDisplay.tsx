interface MemoryDisplayProps {
  value: number
}

export function MemoryDisplay({ value }: MemoryDisplayProps) {
  return (
    <div className="mb-4 p-3 bg-slate-700 dark:bg-slate-800 rounded-lg border border-slate-600 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Memory
        </span>
        <span className="text-lg font-bold text-purple-400 dark:text-purple-300">
          {value}
        </span>
      </div>
    </div>
  )
}
