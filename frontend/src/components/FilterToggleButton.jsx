import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import Button from './Button'

export default function FilterToggleButton({ open, onClick, activeCount = 0 }) {
  return (
    <Button
      color={activeCount > 0 ? 'brand' : 'slate'}
      variant="subtle"
      size="sm"
      onClick={onClick}
    >
      <SlidersHorizontal size={14} />
      Filters{activeCount > 0 ? ` (${activeCount})` : ''}
      {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </Button>
  )
}
