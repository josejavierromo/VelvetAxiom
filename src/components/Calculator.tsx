import { useState, useEffect, useRef } from 'react'
import { Copy, Delete, RotateCcw } from 'lucide-react'
import { Display } from './Display'
import { ButtonGrid } from './ButtonGrid'
import { History } from './History'
import { MemoryDisplay } from './MemoryDisplay'

export function Calculator() {
  const [display, setDisplay] = useState('0')
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [waitingForNewValue, setWaitingForNewValue] = useState(false)
  const [memory, setMemory] = useState(0)
  const [isScientific, setIsScientific] = useState(false)
  const [history, setHistory] = useState<Array<{ expression: string; result: string }>>([])
  const [copied, setCopied] = useState(false)
  const displayRef = useRef<HTMLDivElement>(null)

  // Keyboard support
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key

      if (/[0-9.]/.test(key)) {
        handleNumberClick(key)
      } else if (key === '+' || key === '-' || key === '*' || key === '/') {
        e.preventDefault()
        const op = key === '*' ? '×' : key === '/' ? '÷' : key
        handleOperationClick(op)
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault()
        handleEquals()
      } else if (key === 'Backspace') {
        e.preventDefault()
        handleBackspace()
      } else if (key.toLowerCase() === 'c') {
        e.preventDefault()
        handleClear()
      } else if (key.toLowerCase() === 'a') {
        e.preventDefault()
        handleAllClear()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [display, previousValue, operation, waitingForNewValue])

  const handleNumberClick = (num: string) => {
    if (num === '.' && display.includes('.')) return

    if (waitingForNewValue) {
      setDisplay(num === '.' ? '0.' : num)
      setWaitingForNewValue(false)
    } else {
      setDisplay(display === '0' && num !== '.' ? num : display + num)
    }
  }

  const handleOperationClick = (op: string) => {
    const currentValue = parseFloat(display)

    if (previousValue !== null && operation && !waitingForNewValue) {
      const result = performCalculation(previousValue, currentValue, operation)
      setDisplay(String(result))
      setPreviousValue(result)
    } else {
      setPreviousValue(currentValue)
    }

    setOperation(op)
    setWaitingForNewValue(true)
  }

  const performCalculation = (prev: number, current: number, op: string): number => {
    switch (op) {
      case '+':
        return prev + current
      case '-':
        return prev - current
      case '×':
        return prev * current
      case '÷':
        if (current === 0) {
          setDisplay('Error: Division by zero')
          return prev
        }
        return prev / current
      case '^':
        return Math.pow(prev, current)
      case '%':
        return prev % current
      default:
        return current
    }
  }

  const handleEquals = () => {
    if (previousValue !== null && operation) {
      const currentValue = parseFloat(display)
      const result = performCalculation(previousValue, currentValue, operation)
      const resultStr = formatResult(result)

      // Add to history
      const expression = `${previousValue} ${operation} ${currentValue}`
      setHistory([{ expression, result: resultStr }, ...history.slice(0, 49)])

      setDisplay(resultStr)
      setPreviousValue(null)
      setOperation(null)
      setWaitingForNewValue(true)
    }
  }

  const handleSingleOperationClick = (op: string) => {
    const currentValue = parseFloat(display)
    let result: number

    switch (op) {
      case '√':
        result = Math.sqrt(currentValue)
        break
      case '%':
        result = currentValue / 100
        break
      case '1/x':
        if (currentValue === 0) {
          setDisplay('Error: Division by zero')
          return
        }
        result = 1 / currentValue
        break
      case 'sin':
        result = Math.sin((currentValue * Math.PI) / 180)
        break
      case 'cos':
        result = Math.cos((currentValue * Math.PI) / 180)
        break
      case 'tan':
        result = Math.tan((currentValue * Math.PI) / 180)
        break
      case 'log':
        if (currentValue <= 0) {
          setDisplay('Error: Invalid input')
          return
        }
        result = Math.log10(currentValue)
        break
      case 'ln':
        if (currentValue <= 0) {
          setDisplay('Error: Invalid input')
          return
        }
        result = Math.log(currentValue)
        break
      case '±':
        result = -currentValue
        break
      default:
        return
    }

    const resultStr = formatResult(result)
    setHistory([{ expression: `${op}(${currentValue})`, result: resultStr }, ...history.slice(0, 49)])
    setDisplay(resultStr)
    setWaitingForNewValue(true)
  }

  const formatResult = (num: number): string => {
    if (!isFinite(num)) return 'Error'
    if (Number.isInteger(num)) return String(num)
    return parseFloat(num.toFixed(10)).toString()
  }

  const handleBackspace = () => {
    if (display.length === 1) {
      setDisplay('0')
    } else {
      setDisplay(display.slice(0, -1))
    }
  }

  const handleClear = () => {
    setDisplay('0')
    setWaitingForNewValue(true)
  }

  const handleAllClear = () => {
    setDisplay('0')
    setPreviousValue(null)
    setOperation(null)
    setWaitingForNewValue(false)
    setMemory(0)
    setHistory([])
  }

  const handleMemoryAdd = () => {
    setMemory(memory + parseFloat(display))
    setWaitingForNewValue(true)
  }

  const handleMemorySubtract = () => {
    setMemory(memory - parseFloat(display))
    setWaitingForNewValue(true)
  }

  const handleMemoryRecall = () => {
    setDisplay(String(memory))
    setWaitingForNewValue(true)
  }

  const handleMemoryClear = () => {
    setMemory(0)
  }

  const handleCopyResult = async () => {
    try {
      await navigator.clipboard.writeText(display)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleHistoryClick = (expression: string) => {
    setDisplay(expression)
    setWaitingForNewValue(true)
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Calculator */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 rounded-2xl shadow-2xl p-6 border border-slate-700 dark:border-slate-800">
            {/* Display */}
            <Display
              value={display}
              onCopy={handleCopyResult}
              copied={copied}
              ref={displayRef}
            />

            {/* Memory Display */}
            {memory !== 0 && <MemoryDisplay value={memory} />}

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setIsScientific(false)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                  !isScientific
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-700 dark:bg-slate-800 text-slate-300 hover:bg-slate-600 dark:hover:bg-slate-700'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setIsScientific(true)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                  isScientific
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-slate-700 dark:bg-slate-800 text-slate-300 hover:bg-slate-600 dark:hover:bg-slate-700'
                }`}
              >
                Scientific
              </button>
            </div>

            {/* Button Grid */}
            <ButtonGrid
              isScientific={isScientific}
              onNumberClick={handleNumberClick}
              onOperationClick={handleOperationClick}
              onSingleOperationClick={handleSingleOperationClick}
              onEquals={handleEquals}
              onClear={handleClear}
              onAllClear={handleAllClear}
              onBackspace={handleBackspace}
              onMemoryAdd={handleMemoryAdd}
              onMemorySubtract={handleMemorySubtract}
              onMemoryRecall={handleMemoryRecall}
              onMemoryClear={handleMemoryClear}
            />

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={handleBackspace}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-700 dark:bg-slate-800 hover:bg-slate-600 dark:hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-all duration-200 active:scale-95"
              >
                <Delete className="w-4 h-4" />
                Backspace
              </button>
              <button
                onClick={handleAllClear}
                className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 active:scale-95"
              >
                AC
              </button>
            </div>
          </div>
        </div>

        {/* History Sidebar */}
        <div className="lg:col-span-1">
          <History
            items={history}
            onItemClick={handleHistoryClick}
            onClear={() => setHistory([])}
          />
        </div>
      </div>
    </div>
  )
}
