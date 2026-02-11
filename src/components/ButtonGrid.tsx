interface ButtonGridProps {
  isScientific: boolean
  onNumberClick: (num: string) => void
  onOperationClick: (op: string) => void
  onSingleOperationClick: (op: string) => void
  onEquals: () => void
  onClear: () => void
  onAllClear: () => void
  onBackspace: () => void
  onMemoryAdd: () => void
  onMemorySubtract: () => void
  onMemoryRecall: () => void
  onMemoryClear: () => void
}

export function ButtonGrid({
  isScientific,
  onNumberClick,
  onOperationClick,
  onSingleOperationClick,
  onEquals,
  onClear,
  onAllClear,
  onBackspace,
  onMemoryAdd,
  onMemorySubtract,
  onMemoryRecall,
  onMemoryClear,
}: ButtonGridProps) {
  const Button = ({
    onClick,
    children,
    variant = 'default',
    className = '',
  }: {
    onClick: () => void
    children: React.ReactNode
    variant?: 'default' | 'operation' | 'equals' | 'function'
    className?: string
  }) => {
    const baseClasses =
      'py-4 px-3 sm:px-4 rounded-lg font-semibold text-sm sm:text-base transition-all duration-150 active:scale-95 hover:shadow-lg'

    const variantClasses = {
      default:
        'bg-slate-700 dark:bg-slate-800 text-slate-100 hover:bg-slate-600 dark:hover:bg-slate-700',
      operation:
        'bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-md',
      equals:
        'bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-600 shadow-md col-span-2',
      function:
        'bg-purple-600 text-white hover:bg-purple-700 dark:hover:bg-purple-600 shadow-md',
    }

    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      >
        {children}
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {/* Standard Mode */}
      {!isScientific && (
        <>
          {/* Memory Row */}
          <div className="grid grid-cols-4 gap-2">
            <Button onClick={onMemoryAdd} variant="function">
              M+
            </Button>
            <Button onClick={onMemorySubtract} variant="function">
              M-
            </Button>
            <Button onClick={onMemoryRecall} variant="function">
              MR
            </Button>
            <Button onClick={onMemoryClear} variant="function">
              MC
            </Button>
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-4 gap-2">
            <Button onClick={onClear} variant="function">
              C
            </Button>
            <Button onClick={() => onSingleOperationClick('±')} variant="function">
              ±
            </Button>
            <Button onClick={() => onSingleOperationClick('%')} variant="function">
              %
            </Button>
            <Button onClick={() => onOperationClick('÷')} variant="operation">
              ÷
            </Button>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-4 gap-2">
            <Button onClick={() => onNumberClick('7')}>7</Button>
            <Button onClick={() => onNumberClick('8')}>8</Button>
            <Button onClick={() => onNumberClick('9')}>9</Button>
            <Button onClick={() => onOperationClick('×')} variant="operation">
              ×
            </Button>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-4 gap-2">
            <Button onClick={() => onNumberClick('4')}>4</Button>
            <Button onClick={() => onNumberClick('5')}>5</Button>
            <Button onClick={() => onNumberClick('6')}>6</Button>
            <Button onClick={() => onOperationClick('-')} variant="operation">
              −
            </Button>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-4 gap-2">
            <Button onClick={() => onNumberClick('1')}>1</Button>
            <Button onClick={() => onNumberClick('2')}>2</Button>
            <Button onClick={() => onNumberClick('3')}>3</Button>
            <Button onClick={() => onOperationClick('+')} variant="operation">
              +
            </Button>
          </div>

          {/* Row 5 */}
          <div className="grid grid-cols-4 gap-2">
            <Button onClick={() => onNumberClick('0')} className="col-span-2">
              0
            </Button>
            <Button onClick={() => onNumberClick('.')}>.</Button>
            <Button onClick={onEquals} variant="equals" className="col-span-1">
              =
            </Button>
          </div>

          {/* Advanced Functions */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-700 dark:border-slate-800">
            <Button onClick={() => onSingleOperationClick('√')} variant="function">
              √
            </Button>
            <Button onClick={() => onOperationClick('^')} variant="function">
              x^y
            </Button>
            <Button onClick={() => onSingleOperationClick('1/x')} variant="function">
              1/x
            </Button>
            <Button onClick={() => onOperationClick('%')} variant="function">
              mod
            </Button>
          </div>
        </>
      )}

      {/* Scientific Mode */}
      {isScientific && (
        <>
          {/* Memory Row */}
          <div className="grid grid-cols-6 gap-2">
            <Button onClick={onMemoryAdd} variant="function" className="text-xs">
              M+
            </Button>
            <Button onClick={onMemorySubtract} variant="function" className="text-xs">
              M-
            </Button>
            <Button onClick={onMemoryRecall} variant="function" className="text-xs">
              MR
            </Button>
            <Button onClick={onMemoryClear} variant="function" className="text-xs">
              MC
            </Button>
            <Button onClick={onClear} variant="function" className="text-xs">
              C
            </Button>
            <Button onClick={() => onSingleOperationClick('±')} variant="function" className="text-xs">
              ±
            </Button>
          </div>

          {/* Trig Row */}
          <div className="grid grid-cols-6 gap-2">
            <Button onClick={() => onSingleOperationClick('sin')} variant="function" className="text-xs">
              sin
            </Button>
            <Button onClick={() => onSingleOperationClick('cos')} variant="function" className="text-xs">
              cos
            </Button>
            <Button onClick={() => onSingleOperationClick('tan')} variant="function" className="text-xs">
              tan
            </Button>
            <Button onClick={() => onSingleOperationClick('log')} variant="function" className="text-xs">
              log
            </Button>
            <Button onClick={() => onSingleOperationClick('ln')} variant="function" className="text-xs">
              ln
            </Button>
            <Button onClick={() => onOperationClick('÷')} variant="operation" className="text-xs">
              ÷
            </Button>
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-6 gap-2">
            <Button onClick={() => onNumberClick('7')}>7</Button>
            <Button onClick={() => onNumberClick('8')}>8</Button>
            <Button onClick={() => onNumberClick('9')}>9</Button>
            <Button onClick={() => onSingleOperationClick('√')} variant="function">
              √
            </Button>
            <Button onClick={() => onOperationClick('^')} variant="function">
              x^y
            </Button>
            <Button onClick={() => onOperationClick('×')} variant="operation">
              ×
            </Button>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-6 gap-2">
            <Button onClick={() => onNumberClick('4')}>4</Button>
            <Button onClick={() => onNumberClick('5')}>5</Button>
            <Button onClick={() => onNumberClick('6')}>6</Button>
            <Button onClick={() => onSingleOperationClick('%')} variant="function">
              %
            </Button>
            <Button onClick={() => onSingleOperationClick('1/x')} variant="function">
              1/x
            </Button>
            <Button onClick={() => onOperationClick('-')} variant="operation">
              −
            </Button>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-6 gap-2">
            <Button onClick={() => onNumberClick('1')}>1</Button>
            <Button onClick={() => onNumberClick('2')}>2</Button>
            <Button onClick={() => onNumberClick('3')}>3</Button>
            <Button onClick={() => onNumberClick('.')}>.</Button>
            <Button onClick={() => onNumberClick('0')}>0</Button>
            <Button onClick={() => onOperationClick('+')} variant="operation">
              +
            </Button>
          </div>

          {/* Equals Row */}
          <div className="grid grid-cols-6 gap-2">
            <Button onClick={onEquals} variant="equals" className="col-span-6">
              =
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
