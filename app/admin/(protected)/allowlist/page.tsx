"use client"

import { useEffect, useMemo, useRef, useState } from 'react'

type Item = {
  id: string
  email: string
  full_name: string | null
  status: string
  trainer_email: string | null
  send_pdf_user: boolean
  send_pdf_trainer: boolean
  theme: string
  created_at: string
  has_alert?: boolean
}

export default function AdminAllowlistPage() {
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    trainer_email: '',
    send_pdf_user: true,
    send_pdf_trainer: false,
    theme: 'tlc',
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [theme, setTheme] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  // Bulk import state
  const [bulkTrainerEmail, setBulkTrainerEmail] = useState('')
  const [bulkUserEmails, setBulkUserEmails] = useState('')
  const [bulkSendUser, setBulkSendUser] = useState(true)
  const [bulkSendTrainer, setBulkSendTrainer] = useState(false)
  const [bulkTheme, setBulkTheme] = useState('tlc')

  async function load() {
    setLoading(true)
    try {
      const url = new URL('/api/admin/allowlist/search', window.location.origin)
      if (q) url.searchParams.set('q', q)
      if (status) url.searchParams.set('status', status)
      if (theme) url.searchParams.set('theme', theme)
      const res = await fetch(url.toString())
      const j = await res.json()
      setItems(j.items || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function onUpsert(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/allowlist/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          full_name: form.full_name.trim() || undefined,
          trainer_email: form.trainer_email.trim() || null,
          send_pdf_user: !!form.send_pdf_user,
          send_pdf_trainer: !!form.send_pdf_trainer,
          theme: form.theme,
        })
      })
      if (!res.ok) throw new Error('Upsert failed')
      setMsg('Opgeslagen')
      setForm({ email: '', full_name: '', trainer_email: '', send_pdf_user: true, send_pdf_trainer: false, theme: 'tlc' })
      await load()
    } catch (e: any) {
      setMsg(e?.message || 'Fout')
    } finally {
      setBusy(false)
    }
  }

  async function onBulkImport() {
    const emails = bulkUserEmails.split('\n').map(e => e.trim()).filter(Boolean)
    if (emails.length === 0) {
      setMsg('Voer minimaal één gebruikers e-mailadres in')
      return
    }
    
    const trainerEmail = bulkTrainerEmail.trim()
    const rows = emails.map(email => ({
      email,
      full_name: undefined,
      trainer_email: trainerEmail || null,
      send_pdf_user: bulkSendUser,
      send_pdf_trainer: bulkSendTrainer,
      theme: bulkTheme,
    }))
    
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/allowlist/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      })
      const result = await res.json()
      if (!res.ok) {
        console.error('Bulk import failed:', result)
        throw new Error(result.error || 'Import mislukt')
      }
      setMsg(`Import voltooid: ${emails.length} gebruiker(s) toegevoegd`)
      setBulkUserEmails('')
      setBulkTrainerEmail('')
      await load()
    } catch (e: any) {
      setMsg(e?.message || 'Fout')
    } finally {
      setBusy(false)
    }
  }

  async function doAction(kind: 'reset' | 'revoke', email: string) {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/allowlist/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (!res.ok) throw new Error('Actie mislukt')
      await load()
    } catch (e: any) {
      setMsg(e?.message || 'Fout')
    } finally {
      setBusy(false)
    }
  }

  const filtered = useMemo(() => items, [items])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Allowlist</h1>

      <section className="grid md:grid-cols-2 gap-6">
        <form onSubmit={onUpsert} className="border rounded p-4 bg-white space-y-3">
          <h2 className="font-semibold">Toevoegen/Updaten</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm">Email</label>
              <input className="w-full border rounded px-3 py-2" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm">Naam</label>
              <input className="w-full border rounded px-3 py-2" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm">Trainer email (optioneel)</label>
              <input className="w-full border rounded px-3 py-2" type="email" value={form.trainer_email} onChange={e => setForm(f => ({ ...f, trainer_email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm">Thema</label>
              <select className="w-full border rounded px-3 py-2" value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))}>
                <option value="tlc">TLC</option>
                <option value="imk">IMK</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.send_pdf_user} onChange={e => setForm(f => ({ ...f, send_pdf_user: e.target.checked }))} /> PDF naar gebruiker</label>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.send_pdf_trainer} onChange={e => setForm(f => ({ ...f, send_pdf_trainer: e.target.checked }))} /> PDF naar trainer</label>
          </div>
          {msg && <div className="text-sm text-gray-700">{msg}</div>}
          <button className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400" disabled={busy} type="submit">Opslaan</button>
        </form>

        <div className="border rounded p-4 bg-white space-y-3">
          <h2 className="font-semibold">Bulk import</h2>
          <p className="text-sm text-gray-600">Voeg meerdere gebruikers tegelijk toe met dezelfde instellingen.</p>
          
          <div>
            <label className="block text-sm font-medium mb-1">Trainer e-mail (optioneel)</label>
            <input 
              className="w-full border rounded px-3 py-2" 
              type="email"
              value={bulkTrainerEmail} 
              onChange={e => setBulkTrainerEmail(e.target.value)}
              placeholder="trainer@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Gebruikers e-mails (één per regel)</label>
            <textarea 
              className="w-full h-32 border rounded p-2 font-mono text-sm" 
              value={bulkUserEmails}
              onChange={e => setBulkUserEmails(e.target.value)}
              placeholder="jan@example.com&#10;marie@example.com&#10;piet@example.com"
            ></textarea>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Thema</label>
              <select className="w-full border rounded px-3 py-2" value={bulkTheme} onChange={e => setBulkTheme(e.target.value)}>
                <option value="tlc">TLC</option>
                <option value="imk">IMK</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={bulkSendUser} onChange={e => setBulkSendUser(e.target.checked)} />
              PDF naar gebruiker
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={bulkSendTrainer} onChange={e => setBulkSendTrainer(e.target.checked)} />
              PDF naar trainer
            </label>
          </div>
          
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400" disabled={busy} onClick={onBulkImport}>
            Importeren
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm">Zoek</label>
            <input className="border rounded px-3 py-2" value={q} onChange={e => setQ(e.target.value)} placeholder="email of naam" />
          </div>
          <div>
            <label className="block text-sm">Status</label>
            <select className="border rounded px-3 py-2" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">alle</option>
              <option value="pending">pending</option>
              <option value="claimed">claimed</option>
              <option value="used">used</option>
              <option value="revoked">revoked</option>
            </select>
          </div>
          <div>
            <label className="block text-sm">Thema</label>
            <select className="border rounded px-3 py-2" value={theme} onChange={e => setTheme(e.target.value)}>
              <option value="">alle</option>
              <option value="tlc">TLC</option>
              <option value="imk">IMK</option>
            </select>
          </div>
          <button className="px-3 py-2 border rounded hover:bg-gray-50" onClick={load}>Zoeken</button>
        </div>

        <div className="border rounded overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-2">Email</th>
                <th className="p-2">Naam</th>
                <th className="p-2">Status</th>
                <th className="p-2">Alert</th>
                <th className="p-2">Trainer</th>
                <th className="p-2">User/Trainer</th>
                <th className="p-2">Thema</th>
                <th className="p-2">Acties</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="p-2" colSpan={8}>Laden…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="p-2" colSpan={8}>Geen resultaten</td></tr>
              ) : filtered.map(it => (
                <tr key={it.id} className={`border-t ${it.has_alert ? 'bg-yellow-50' : ''}`}>
                  <td className="p-2">{it.email}</td>
                  <td className="p-2">{it.full_name || '—'}</td>
                  <td className="p-2">{it.status}</td>
                  <td className="p-2">
                    {it.has_alert ? (
                      <span className="text-yellow-600 font-semibold" title="Afwijkend patroon: alle scores onder 50% OF alle scores boven/gelijk aan 50%">⚠️</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-2">{it.trainer_email || '—'}</td>
                  <td className="p-2">{it.send_pdf_user ? 'U' : '—'}/{it.send_pdf_trainer ? 'T' : '—'}</td>
                  <td className="p-2">{it.theme}</td>
                  <td className="p-2 space-x-2">
                    <button className="px-2 py-1 border rounded" onClick={() => doAction('reset', it.email)}>Reset</button>
                    <button className="px-2 py-1 border rounded" onClick={() => doAction('revoke', it.email)}>Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
