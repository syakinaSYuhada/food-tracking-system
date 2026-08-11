import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

function ListPagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalItems === 0 || totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  return (
    <div className="surface-card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="text-body text-brand-muted">
        Showing <span className="font-semibold text-brand-ink">{start}–{end}</span> of{' '}
        <span className="font-semibold text-brand-ink">{totalItems}</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="subtle"
          color="slate"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} />
          Previous
        </Button>

        <span className="min-w-[5rem] px-2 text-center text-caption font-semibold text-brand-muted">
          Page {page} of {totalPages}
        </span>

        <Button
          type="button"
          variant="subtle"
          color="slate"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}

export default ListPagination
