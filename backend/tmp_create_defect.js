(async () => {
  try {
    // wait for server
    const waitFor = async () => {
      for (let i = 0; i < 60; i++) {
        try {
          const r = await fetch('http://localhost:3000/')
          // server responded
          return
        } catch (e) {
          await new Promise((r) => setTimeout(r, 1000))
        }
      }
      throw new Error('Server did not become available')
    }

    await waitFor()

    const payload = {
      product_id: 1,
      batch_id: 1,
      detected_at_stage: 'Retort Process',
      defect_type: 'Bloated Packaging',
      defect_type_other: null,
      problem_level: 'Food Safety Risk',
      description: 'Test create after backend restart',
      qty_affected: 1,
      qty_on_hold: 1,
      qty_relabelled: 0,
      qty_repacked: 0,
      qty_reworked: 0,
      qty_discarded: 0,
      containment_status: 'Segregated / On Hold',
      suggested_product_handling: 'Discard Required',
      suggested_machine_handling: 'Review retort process',
      created_by: 1,
      investigation_notes: 'test restart'
    }

    const res = await fetch('http://localhost:3000/api/defects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const text = await res.text()
    console.log('CREATE_STATUS', res.status)
    console.log('CREATE_BODY', text)
  } catch (e) {
    console.error('ERROR', e.message)
    process.exit(1)
  }
})()
