"use client"

import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Upload, RefreshCw, RotateCcw, XCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/admin/ui/Card'
import { Badge } from '@/components/admin/ui/Badge'
import { Button } from '@/components/admin/ui/Button'
import { Input, Select } from '@/components/admin/ui/Input'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TableLoading,
} from '@/components/admin/ui/Table'

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
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
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
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
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
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
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
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!res.ok) throw new Error('Actie mislukt')
      await load()
    } catch (e: any) {
      setMsg(e?.message || 'Fout')
    } finally {
      setBusy(false)
    }
  }

  const filtered = useMemo(() => items, [items])

  const statusVariant = (s: string) => {
    switch (s) {
      case 'pending': return 'warning'
      case 'claimed': return 'info'
      case 'used': return 'success'
      case 'revoked': return 'error'
      default: return 'default'
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Toegangslijst"
        description="Beheer wie toegang heeft tot de DISC Quiz"
        action={
          <Button
            variant="outline"
            onClick={load}
            loading={loading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Vernieuwen
          </Button>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Gebruiker toevoegen</CardTitle>
                <CardDescription>Voeg een enkele gebruiker toe aan de toegangslijst</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={onUpsert} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
                <Input
                  label="Naam"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Trainer email (optioneel)"
                  type="email"
                  value={form.trainer_email}
                  onChange={e => setForm(f => ({ ...f, trainer_email: e.target.value }))}
                />
                <Select
                  label="Thema"
                  value={form.theme}
                  onChange={e => setForm(f => ({ ...f, theme: e.target.value }))}
                  options={[
                    { value: 'tlc', label: 'TLC' },
                    { value: 'imk', label: 'IMK' },
                  ]}
                />
              </div>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.send_pdf_user}
                    onChange={e => setForm(f => ({ ...f, send_pdf_user: e.target.checked }))}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">PDF naar gebruiker</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.send_pdf_trainer}
                    onChange={e => setForm(f => ({ ...f, send_pdf_trainer: e.target.checked }))}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">PDF naar trainer</span>
                </label>
              </div>
              {msg && (
                <div className="p-3 rounded-lg bg-slate-100 text-sm text-slate-700">
                  {msg}
                </div>
              )}
              <Button type="submit" loading={busy} leftIcon={<Plus className="h-4 w-4" />}>
                Opslaan
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Bulk import</CardTitle>
                <CardDescription>Voeg meerdere gebruikers tegelijk toe</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Trainer e-mail (optioneel)"
              type="email"
              value={bulkTrainerEmail}
              onChange={e => setBulkTrainerEmail(e.target.value)}
              placeholder="trainer@example.com"
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Gebruikers e-mails (een per regel)
              </label>
              <textarea
                className="w-full h-28 px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={bulkUserEmails}
                onChange={e => setBulkUserEmails(e.target.value)}
                placeholder="jan@example.com&#10;marie@example.com&#10;piet@example.com"
              />
            </div>
            <Select
              label="Thema"
              value={bulkTheme}
              onChange={e => setBulkTheme(e.target.value)}
              options={[
                { value: 'tlc', label: 'TLC' },
                { value: 'imk', label: 'IMK' },
              ]}
            />
            <div className="flex items-center gap-6">
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkSendUser}
                  onChange={e => setBulkSendUser(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700">PDF naar gebruiker</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkSendTrainer}
                  onChange={e => setBulkSendTrainer(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700">PDF naar trainer</span>
              </label>
            </div>
            <Button
              variant="primary"
              onClick={onBulkImport}
              loading={busy}
              leftIcon={<Upload className="h-4 w-4" />}
              className="w-full"
            >
              Importeren
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Zoeken op email of naam..."
                value={q}
                onChange={e => setQ(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="w-full sm:w-40">
              <Select
                value={status}
                onChange={e => setStatus(e.target.value)}
                options={[
                  { value: '', label: 'Alle status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'claimed', label: 'Claimed' },
                  { value: 'used', label: 'Used' },
                  { value: 'revoked', label: 'Revoked' },
                ]}
              />
            </div>
            <div className="w-full sm:w-32">
              <Select
                value={theme}
                onChange={e => setTheme(e.target.value)}
                options={[
                  { value: '', label: 'Alle thema' },
                  { value: 'tlc', label: 'TLC' },
                  { value: 'imk', label: 'IMK' },
                ]}
              />
            </div>
            <Button variant="outline" onClick={load}>
              Zoeken
            </Button>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Gebruiker</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Alert</TableHead>
            <TableHead>Trainer</TableHead>
            <TableHead>PDF</TableHead>
            <TableHead>Thema</TableHead>
            <TableHead>Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableLoading colSpan={7} />
          ) : filtered.length === 0 ? (
            <TableEmpty colSpan={7} message="Geen gebruikers gevonden" />
          ) : (
            filtered.map(it => (
              <TableRow key={it.id} highlight={it.has_alert}>
                <TableCell>
                  <div>
                    <div className="font-medium text-slate-900">{it.full_name || 'Onbekend'}</div>
                    <div className="text-xs text-slate-500 font-mono">{it.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(it.status)}>
                    {it.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {it.has_alert ? (
                    <div className="flex items-center text-amber-600" title="Afwijkend patroon">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {it.trainer_email ? (
                    <span className="text-xs font-mono text-slate-600">{it.trainer_email}</span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {it.send_pdf_user && <Badge variant="info">User</Badge>}
                    {it.send_pdf_trainer && <Badge variant="default">Trainer</Badge>}
                    {!it.send_pdf_user && !it.send_pdf_trainer && <span className="text-slate-400">-</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{it.theme.toUpperCase()}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => doAction('reset', it.email)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Reset"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => doAction('revoke', it.email)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Intrekken"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
