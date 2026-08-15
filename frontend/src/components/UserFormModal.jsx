import { useState } from 'react'
import api from '../api/client'
import Button from './Button'
import BaseModal from './BaseModal'
import FieldLabel from './FieldLabel'

export default function UserFormModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    full_name: '',
    role: 'worker',
    password: '',
    account_status: 'active'
  })
  const [saving, setSaving] = useState(false)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.username.trim()) return alert('Please enter a username.')
    if (!form.email.trim()) return alert('Please enter an email address.')
    if (!form.full_name.trim()) return alert('Please enter the full name.')
    if (!form.password.trim()) return alert('Please enter a password.')

    setSaving(true)
    try {
      await api.post('/users', {
        username: form.username.trim().toLowerCase(),
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        role: form.role,
        password: form.password,
        account_status: form.account_status
      })
      onSaved?.()
      onClose?.()
    } catch (error) {
      console.error(error)
      alert(error.response?.data?.message || 'Failed to create user.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BaseModal
      title="Add User"
      subtitle="Create a new manager or worker account for QDTS login."
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button color="slate" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button color="blue" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Create User'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-1">
          <FieldLabel label="Username" required />
          <input
            type="text"
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            className="field-control"
            placeholder="e.g. siti_aminah"
            autoComplete="off"
          />
        </label>

        <label className="block sm:col-span-1">
          <FieldLabel label="Email" required />
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="field-control"
            placeholder="name@kaknorie.com"
            autoComplete="off"
          />
        </label>

        <label className="block sm:col-span-2">
          <FieldLabel label="Full Name" required />
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            className="field-control"
            placeholder="Display name on dashboards"
          />
        </label>

        <label className="block sm:col-span-1">
          <FieldLabel label="Role" required />
          <select
            value={form.role}
            onChange={(e) => update('role', e.target.value)}
            className="field-control"
          >
            <option value="manager">Manager</option>
            <option value="worker">Worker</option>
          </select>
        </label>

        <label className="block sm:col-span-1">
          <span className="field-label">Account Status</span>
          <select
            value={form.account_status}
            onChange={(e) => update('account_status', e.target.value)}
            className="field-control"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <label className="block sm:col-span-2">
          <FieldLabel label="Password" required />
          <input
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="field-control"
            placeholder="Minimum 6 characters"
            autoComplete="new-password"
          />
        </label>
      </div>
    </BaseModal>
  )
}
