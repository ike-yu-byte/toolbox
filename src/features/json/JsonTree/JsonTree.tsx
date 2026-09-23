import { useState } from 'react'
import { Icon } from '@/components/Icon/Icon'
import { rootTypeOf } from '@/features/json/jsonUtils'
import './JsonTree.scss'

interface JsonTreeProps {
  value: unknown
}

function renderPrimitive(value: unknown): string {
  if (typeof value === 'string') return `"${value}"`
  return String(value)
}

interface NodeProps {
  label: string
  value: unknown
  depth: number
  isLast: boolean
}

function TreeNode({ label, value, depth, isLast }: NodeProps) {
  const type = rootTypeOf(value)
  const [open, setOpen] = useState(depth < 2)

  if (type === 'object' || type === 'array') {
    const entries: [string, unknown][] =
      type === 'array'
        ? (value as unknown[]).map((item, index) => [String(index), item])
        : Object.entries(value as Record<string, unknown>)

    return (
      <div className="json-tree__node">
        <div className="json-tree__row">
          <button type="button" onClick={() => setOpen((prev) => !prev)} className="json-tree__toggle">
            <Icon
              name="chevron-right"
              size={11}
              className={`json-tree__caret${open ? ' json-tree__caret--open' : ''}`}
            />
          </button>
          <span className="json-tree__key">
            {label ? `${label}: ` : ''}
            {type === 'array' ? '[' : '{'}
          </span>
          {!open && (
            <span className="json-tree__meta">
              {entries.length} {type === 'array' ? 'items' : 'keys'} …
            </span>
          )}
        </div>

        {open && (
          <div className="json-tree__children">
            {entries.length === 0 && <div className="json-tree__empty">empty</div>}
            {entries.map(([childLabel, childValue], index) => (
              <TreeNode
                key={childLabel}
                label={type === 'array' ? `[${childLabel}]` : childLabel}
                value={childValue}
                depth={depth + 1}
                isLast={index === entries.length - 1}
              />
            ))}
          </div>
        )}

        <div className="json-tree__key">
          {type === 'array' ? ']' : '}'}
          {isLast ? '' : ','}
        </div>
      </div>
    )
  }

  return (
    <div className="json-tree__node">
      <span className="json-tree__key">{label}: </span>
      <span className={`json-tree__value json-tree__value--${type}`}>{renderPrimitive(value)}</span>
      {isLast ? '' : <span className="json-tree__punct">,</span>}
    </div>
  )
}

export function JsonTree({ value }: JsonTreeProps) {
  if (value === undefined) return null
  return (
    <div className="json-tree">
      <TreeNode label="" value={value} depth={0} isLast />
    </div>
  )
}
