'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { createQuickClient } from '@/app/actions/clients'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { notifyError, runWithToast } from '@/lib/notify'

export type ClientOption = { id: string; name: string }

export function ClientSelectWithCreate({
  clients,
  value,
  onChange,
  disabled = false,
  selectId = 'client-select',
  label = 'Client',
  placeholder = 'Select client',
  required = true,
}: {
  clients: ClientOption[]
  value: string
  onChange: (clientId: string) => void
  disabled?: boolean
  selectId?: string
  label?: string
  placeholder?: string
  required?: boolean
}) {
  const [options, setOptions] = useState(clients)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newContact, setNewContact] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setOptions(clients)
  }, [clients])

  function startCreateClient() {
    setCreating(true)
    onChange('')
  }

  function handleSelectChange(next: string) {
    setCreating(false)
    onChange(next)
  }

  function handleCancelCreate() {
    setCreating(false)
    setNewName('')
    setNewEmail('')
    setNewContact('')
  }

  function handleCreateClient(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newEmail.trim()) {
      notifyError('Company name and email are required')
      return
    }

    startTransition(async () => {
      const result = await runWithToast(
        () =>
          createQuickClient({
            name: newName,
            email: newEmail,
            contactName: newContact || null,
          }),
        { loading: 'Creating client…', success: 'Client added' }
      )
      if (!result) return

      setOptions(prev => {
        if (prev.some(c => c.id === result.id)) return prev
        return [...prev, { id: result.id, name: result.name }].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      })
      onChange(result.id)
      setCreating(false)
      setNewName('')
      setNewEmail('')
      setNewContact('')
    })
  }

  const busy = disabled || pending

  const selectOptions = useMemo(
    () => options.map(client => ({ value: client.id, label: client.name })),
    [options]
  )

  return (
    <div className={`client-select-with-create${creating ? ' client-select-with-create--active' : ''}`}>
      <SearchableSelect
        id={selectId}
        label={label}
        options={selectOptions}
        value={creating ? '' : value}
        onChange={handleSelectChange}
        placeholder={placeholder}
        searchPlaceholder="Search clients…"
        disabled={busy}
        required={required && !creating}
        allowEmpty={!required}
        emptyOptionLabel={placeholder}
        displayLabel={creating ? '+ Create new client…' : undefined}
        actionOption={{
          label: '+ Create new client…',
          onSelect: startCreateClient,
        }}
      />

      {creating ? (
        <div className="client-quick-create" role="region" aria-label="Create new client">
          <div className="client-quick-create-head">
            <span className="client-quick-create-badge">New</span>
            <p className="client-quick-create-title">Create client</p>
          </div>
          <p className="client-quick-create-desc">
            Add company details below — they&apos;ll be selected automatically once saved.
          </p>
          <div className="client-quick-create-fields space-y-3">
            <div>
              <label className="dash-label" htmlFor={`${selectId}-new-name`}>
                Company name
              </label>
              <input
                id={`${selectId}-new-name`}
                className="btf-input w-full"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Acropolis Studios"
                disabled={busy}
                required
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="dash-label" htmlFor={`${selectId}-new-email`}>
                  Email
                </label>
                <input
                  id={`${selectId}-new-email`}
                  type="email"
                  className="btf-input w-full"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="hello@studio.gr"
                  disabled={busy}
                  required
                />
              </div>
              <div>
                <label className="dash-label" htmlFor={`${selectId}-new-contact`}>
                  Contact name <span className="dash-meta">(optional)</span>
                </label>
                <input
                  id={`${selectId}-new-contact`}
                  className="btf-input w-full"
                  value={newContact}
                  onChange={e => setNewContact(e.target.value)}
                  placeholder="Nikos Papadopoulos"
                  disabled={busy}
                />
              </div>
            </div>
            <div className="client-quick-create-actions">
              <button
                type="button"
                className="client-quick-create-submit dash-btn-primary btn-primary"
                disabled={busy}
                onClick={handleCreateClient}
              >
                Add client
              </button>
              <button
                type="button"
                className="dash-btn-ghost"
                disabled={busy}
                onClick={handleCancelCreate}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
