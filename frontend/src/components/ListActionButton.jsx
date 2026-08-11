import { ArrowRight, CheckCircle, Eye, Plus, XCircle } from 'lucide-react'
import Button from './Button'

const PRESETS = {
  view: { color: 'slate', variant: 'subtle', icon: Eye, label: 'View' },
  verify: { color: 'green', variant: 'subtle', icon: CheckCircle, label: 'Verify' },
  reject: { color: 'red', variant: 'subtle', icon: XCircle, label: 'Reject' },
  review: { color: 'slate', variant: 'subtle', icon: Eye, label: 'Review' },
  assign: { color: 'brand', variant: 'subtle', icon: Plus, label: 'Assign' },
  open: { color: 'brand', variant: 'subtle', icon: ArrowRight, label: 'Open' }
}

export default function ListActionButton({
  intent = 'view',
  label,
  icon,
  color,
  variant,
  size = 'sm',
  className = 'list-action-btn',
  children,
  ...rest
}) {
  const preset = PRESETS[intent] || PRESETS.view
  const Icon = icon || preset.icon
  const text = children ?? label ?? preset.label

  return (
    <Button
      color={color || preset.color}
      variant={variant || preset.variant}
      size={size}
      className={className}
      {...rest}
    >
      {Icon ? <Icon size={14} strokeWidth={2.25} /> : null}
      {text}
    </Button>
  )
}
