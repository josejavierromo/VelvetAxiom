import { createFileRoute } from '@tanstack/react-router'
import { Calculator } from '../components/Calculator'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4 py-8">
      <Calculator />
    </div>
  )
}
