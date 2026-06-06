'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export type SearchableSelectOption = { value: string; label: string }

function normalizeQuery(query: string) {
  return query.trim().toLowerCase()
}

export function SearchableSelect({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled = false,
  required = false,
  emptyMessage = 'No matches',
  displayLabel,
  allowEmpty = false,
  emptyOptionLabel = 'None',
  actionOption,
  triggerClassName = '',
}: {
  id?: string
  label?: string
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  required?: boolean
  emptyMessage?: string
  displayLabel?: string
  allowEmpty?: boolean
  emptyOptionLabel?: string
  actionOption?: { label: string; onSelect: () => void }
  triggerClassName?: string
}) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const listboxId = `${fieldId}-listbox`
  const wrapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)

  const selected = useMemo(
    () => options.find(option => option.value === value),
    [options, value]
  )

  const filtered = useMemo(() => {
    const q = normalizeQuery(query)
    const matches = !q
      ? options
      : options.filter(option => option.label.toLowerCase().includes(q))
    if (!allowEmpty) return matches
    const emptyOption = { value: '', label: emptyOptionLabel }
    if (!q || emptyOptionLabel.toLowerCase().includes(q)) {
      return [emptyOption, ...matches]
    }
    return matches
  }, [options, query, allowEmpty, emptyOptionLabel])

  const rows = useMemo(() => {
    const items: Array<
      | { type: 'option'; option: SearchableSelectOption }
      | { type: 'action'; option: SearchableSelectOption }
    > = filtered.map(option => ({ type: 'option', option }))
    if (actionOption) {
      items.unshift({
        type: 'action',
        option: { value: '__action__', label: actionOption.label },
      })
    }
    return items
  }, [filtered, actionOption])

  useEffect(() => {
    if (!open) return
    setHighlightIndex(0)
    const t = window.setTimeout(() => searchRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    setHighlightIndex(index => Math.min(index, Math.max(rows.length - 1, 0)))
  }, [rows.length, open])

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  function close() {
    setOpen(false)
    setQuery('')
    setHighlightIndex(0)
  }

  function selectOption(next: string) {
    onChange(next)
    close()
  }

  function selectHighlighted() {
    const row = rows[highlightIndex]
    if (!row) return
    if (row.type === 'action') {
      actionOption?.onSelect()
      close()
      return
    }
    selectOption(row.option.value)
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    }
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightIndex(index => Math.min(index + 1, rows.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightIndex(index => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      selectHighlighted()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  const triggerLabel = displayLabel ?? selected?.label ?? placeholder
  const hasValue = Boolean(displayLabel || selected)

  return (
    <div
      className={`searchable-select${open ? ' searchable-select--open' : ''}`}
      ref={wrapRef}
    >
      {label ? (
        <label className="dash-label" htmlFor={fieldId}>
          {label}
        </label>
      ) : null}

      <button
        id={fieldId}
        type="button"
        className={`searchable-select-trigger btf-input w-full client-select-input ${triggerClassName}`.trim()}
        onClick={() => {
          if (disabled) return
          setOpen(current => !current)
        }}
        onKeyDown={onTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-required={required}
      >
        <span
          className={`searchable-select-value${hasValue ? '' : ' searchable-select-value--placeholder'}`}
        >
          {triggerLabel}
        </span>
        <ChevronDown size={16} className="searchable-select-chevron" aria-hidden />
      </button>

      {open ? (
        <div className="searchable-select-panel anim-fade">
          <div className="searchable-select-search-wrap">
            <Search size={14} className="searchable-select-search-icon" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              className="searchable-select-search"
              value={query}
              onChange={event => {
                setQuery(event.target.value)
                setHighlightIndex(0)
              }}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              autoComplete="off"
              spellCheck={false}
              aria-controls={listboxId}
            />
          </div>

          <ul id={listboxId} className="searchable-select-list" role="listbox">
            {rows.length === 0 ? (
              <li className="searchable-select-empty" role="presentation">
                {emptyMessage}
              </li>
            ) : (
              rows.map((row, index) => {
                const isAction = row.type === 'action'
                const isSelected = !isAction && row.option.value === value
                const isHighlighted = index === highlightIndex

                return (
                  <li key={isAction ? '__action__' : row.option.value} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`searchable-select-option${
                        isHighlighted ? ' searchable-select-option--highlighted' : ''
                      }${isSelected ? ' searchable-select-option--selected' : ''}${
                        isAction ? ' searchable-select-option--action' : ''
                      }`}
                      onMouseDown={event => event.preventDefault()}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => {
                        if (isAction) {
                          actionOption?.onSelect()
                          close()
                          return
                        }
                        selectOption(row.option.value)
                      }}
                    >
                      {row.option.label}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
