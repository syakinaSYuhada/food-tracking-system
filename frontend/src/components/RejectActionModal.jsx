import { useState } from 'react'
import api from '../api/client'
import BaseModal from './BaseModal'
import Button from './Button'

function RejectActionModal({ actionId, managerId, onClose, onRejected }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleReject() {
    if (!reason.trim()) {
      alert('Please enter a rejection reason.')
      return
    }

    setSaving(true)
    try {
      await api.patch(`/corrective-actions/${actionId}/reject`, {
        rejected_by: managerId,
        rejection_reason: reason.trim()
      })
      onRejected?.()
      onClose()
    } catch (error) {
      alert(error.response?.data?.message || 'Could not reject action.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BaseModal
      title="Reject Corrective Action"
      subtitle="The assigned worker will need to redo this action with corrections."
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button color="slate" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button color="red" onClick={handleReject} disabled={saving}>
            {saving ? 'Rejecting...' : 'Reject Action'}
          </Button>
        </>
      }
    >
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">
          Rejection Reason <span className="text-red-500">*</span>
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Explain what needs to be corrected..."
          className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-100"
        />
      </label>
    </BaseModal>
  )
}

export default RejectActionModal
