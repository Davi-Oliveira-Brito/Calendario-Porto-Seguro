'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import type { CalendarEvent, EventColor } from '@/types/event'

const TABLE = 'eventos'

const COLOR_OPTIONS: EventColor[] = [
  'c-blue', 'c-green', 'c-amber', 'c-purple', 'c-coral',
  'c-teal', 'c-pink', 'c-red', 'c-gray',
]

const COLOR_LABELS: Record<EventColor, string> = {
  'c-blue':   'Azul',
  'c-green':  'Verde',
  'c-amber':  'Âmbar',
  'c-purple': 'Roxo',
  'c-coral':  'Coral',
  'c-teal':   'Teal',
  'c-pink':   'Rosa',
  'c-red':    'Vermelho',
  'c-gray':   'Cinza',
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

type EventRow = CalendarEvent & { id: number }

const EMPTY_FORM = {
  data: '',
  horario: '',
  nome: '',
  local: '',
  cor: 'c-blue' as EventColor,
  feriado: false,
}

// ── Toast ─────────────────────────────────────────────────────────────────────

type ToastKind = 'success' | 'error' | 'info'
interface ToastItem { id: number; message: string; kind: ToastKind }

let toastSeq = 0

function Toasts({ items, onRemove }: { items: ToastItem[]; onRemove: (id: number) => void }) {
  const kindClass: Record<ToastKind, string> = {
    success: 'bg-escola-blue',
    error:   'bg-escola-red',
    info:    'bg-gray-700',
  }
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      {items.map(t => (
        <div key={t.id} className={`${kindClass[t.kind]} text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-64 max-w-sm`}>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="opacity-70 hover:opacity-100 text-lg leading-none">×</button>
        </div>
      ))}
    </div>
  )
}

// ── CSV parsing & deduplication ───────────────────────────────────────────────

const VALID_COLORS = new Set<string>(COLOR_OPTIONS)

interface ParseResult {
  valid: CalendarEvent[]
  errors: string[]
}

function parseCSV(text: string): ParseResult {
  const lines = text.trim().split('\n')
  const dataLines = lines[0].startsWith('dia') ? lines.slice(1) : lines
  const valid: CalendarEvent[] = []
  const errors: string[] = []

  dataLines.forEach((raw, idx) => {
    const lineNum = idx + 2
    if (!raw.trim()) return
    const parts = raw.split(',')
    if (parts.length < 8) { errors.push(`Linha ${lineNum}: colunas insuficientes`); return }
    const [diaS, mesS, anoS, nome, local, horario, cor, feriadoS] = parts
    const dia = Number(diaS), mes = Number(mesS), ano = Number(anoS)
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) { errors.push(`Linha ${lineNum}: dia inválido (${diaS})`); return }
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) { errors.push(`Linha ${lineNum}: mês inválido (${mesS})`); return }
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) { errors.push(`Linha ${lineNum}: ano inválido (${anoS})`); return }
    if (!nome?.trim()) { errors.push(`Linha ${lineNum}: nome obrigatório`); return }
    if (!VALID_COLORS.has(cor?.trim())) { errors.push(`Linha ${lineNum}: cor inválida (${cor?.trim()})`); return }
    valid.push({
      dia, mes, ano,
      nome: nome.trim(),
      local:   local?.trim()   || undefined,
      horario: horario?.trim() || undefined,
      cor: cor.trim() as EventColor,
      feriado: feriadoS?.trim() === 'true',
    })
  })

  return { valid, errors }
}

function dedupKey(r: CalendarEvent) {
  return `${r.dia}|${r.mes}|${r.ano}|${r.nome.toLowerCase().trim()}`
}

// ── Shared UI primitives ──────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-widest text-escola-blue mb-3">
      {children}
    </h2>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-2xl ${className}`}>
      {children}
    </div>
  )
}

const inputClass =
  'border border-gray-300 rounded-lg px-3 py-2 w-full text-gray-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-escola-blue focus:border-escola-blue'

const btnPrimary =
  'px-4 py-2 rounded-lg text-sm font-semibold transition bg-escola-blue text-white hover:opacity-90'

const btnDanger =
  'px-4 py-2 rounded-lg text-sm font-semibold transition bg-escola-red text-white hover:opacity-90'

const btnNeutral =
  'px-4 py-2 rounded-lg text-sm font-medium transition bg-gray-100 text-gray-800 hover:bg-gray-200'

// ── Modal importar CSV ────────────────────────────────────────────────────────

interface ImportModalProps {
  onImport: (file: File) => Promise<void>
  onClose: () => void
}

function ImportModal({ onImport, onClose }: ImportModalProps) {
  const [file,      setFile]      = useState<File | null>(null)
  const [dragging,  setDragging]  = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.name.endsWith('.csv')) setFile(dropped)
  }

  async function handleConfirm() {
    if (!file) return
    setImporting(true)
    await onImport(file)
    setImporting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md flex flex-col gap-5" onClick={e => e.stopPropagation()}>

        <h3 className="text-base font-bold text-gray-900">Importar CSV</h3>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl px-6 py-10 flex flex-col items-center gap-3 cursor-pointer transition select-none
            ${dragging
              ? 'border-escola-blue bg-blue-50'
              : 'border-gray-300 hover:border-escola-blue hover:bg-gray-50'
            }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm text-gray-500 text-center">
            Arraste o arquivo CSV aqui ou{' '}
            <span className="text-escola-blue font-semibold">clique para buscar</span>
          </p>
          {file
            ? <span className="text-xs font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">{file.name}</span>
            : <span className="text-xs text-gray-400">Somente arquivos .csv</span>
          }
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }}
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className={btnNeutral}>Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={!file || importing}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition
              ${file && !importing
                ? 'bg-escola-blue text-white hover:opacity-90'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
          >
            {importing ? 'Importando...' : 'Importar'}
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Modal deletar todos ───────────────────────────────────────────────────────

interface DeleteAllModalProps {
  month: string
  year: number
  onConfirm: () => void
  onClose: () => void
}

function DeleteAllModal({ month, year, onConfirm, onClose }: DeleteAllModalProps) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-1">Deletar todos os eventos</h3>
          <p className="text-sm text-gray-500">
            Essa ação vai remover <span className="font-semibold text-gray-700">todos os eventos de {month} {year}</span> permanentemente. Não pode ser desfeita.
          </p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="w-4 h-4 accent-escola-red"
          />
          <span className="text-sm font-medium text-gray-700">Tenho certeza</span>
        </label>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className={btnNeutral}>
            Cancelar
          </button>
          <button
            onClick={() => { if (confirmed) onConfirm() }}
            disabled={!confirmed}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition
              ${confirmed
                ? 'bg-escola-red text-white hover:opacity-90 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
          >
            Deletar todos
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed,      setAuthed]      = useState(false)
  const [email,       setEmail]       = useState('')
  const [pw,          setPw]          = useState('')
  const [loginError,  setLoginError]  = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear())

  const [events,  setEvents]  = useState<EventRow[]>([])
  const [loading, setLoading] = useState(false)
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [toasts,       setToasts]       = useState<ToastItem[]>([])
  const [showDeleteAll,  setShowDeleteAll]  = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  function toast(message: string, kind: ToastKind = 'success') {
    const id = ++toastSeq
    setToasts(prev => [...prev, { id, message, kind }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  const loadEvents = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from(TABLE).select('*')
      .eq('mes', selectedMonth).eq('ano', selectedYear)
      .order('dia', { ascending: true })
    if (error) toast('Erro ao carregar eventos: ' + error.message, 'error')
    setEvents((data as EventRow[]) ?? [])
    setLoading(false)
  }, [selectedMonth, selectedYear])

  useEffect(() => { if (authed) loadEvents() }, [authed, loadEvents])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    const { data, error } = await supabase
      .from('admins')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .eq('senha', pw)
      .maybeSingle()
    setLoginLoading(false)
    if (error) { setLoginError('Erro ao verificar credenciais.'); return }
    if (!data)  { setLoginError('Email ou senha incorretos.'); return }
    setAuthed(true)
  }

  async function handleDelete(id: number) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) { toast('Erro ao deletar: ' + error.message, 'error'); return }
    toast('Evento deletado.')
    loadEvents()
  }

  async function handleDeleteAll() {
    setShowDeleteAll(false)
    const { error } = await supabase
      .from(TABLE).delete()
      .eq('mes', selectedMonth).eq('ano', selectedYear)
    if (error) { toast('Erro ao deletar eventos: ' + error.message, 'error'); return }
    toast(`Todos os eventos de ${MONTHS[selectedMonth - 1]} ${selectedYear} foram deletados.`)
    loadEvents()
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!form.data) { toast('Selecione uma data.', 'error'); return }
    if (!form.nome.trim()) { toast('Nome é obrigatório.', 'error'); return }
    const [ano, mes, dia] = form.data.split('-').map(Number)
    const payload: CalendarEvent = {
      dia, mes, ano,
      nome:    form.nome.trim(),
      local:   form.local.trim()   || undefined,
      horario: form.horario.trim() || undefined,
      cor:     form.cor,
      feriado: form.feriado,
    }
    const { error } = await supabase.from(TABLE).insert(payload)
    if (error) { toast('Erro ao adicionar: ' + error.message, 'error'); return }
    toast('Evento adicionado.')
    setForm(EMPTY_FORM)
    loadEvents()
  }

  function handleExportCSV() {
    if (events.length === 0) { toast('Nenhum evento para exportar.', 'info'); return }
    const rows = events.map(ev =>
      [ev.dia, ev.mes, ev.ano, ev.nome, ev.local ?? '', ev.horario ?? '', ev.cor, ev.feriado].join(',')
    )
    const csv  = ['dia,mes,ano,nome,local,horario,cor,feriado', ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `eventos-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(`${events.length} evento(s) exportado(s).`)
  }

  async function handleImportFile(file: File) {
    const text = await file.text()
    const { valid, errors: parseErrors } = parseCSV(text)

    if (valid.length === 0) {
      toast(parseErrors.length > 0
        ? `Arquivo inválido: ${parseErrors.slice(0, 3).join(' | ')}`
        : 'Nenhum registro válido.', 'error')
      setShowImportModal(false)
      return
    }

    const pairs = [...new Set(valid.map(r => `${r.mes}|${r.ano}`))]
    const existingKeys = new Set<string>()
    for (const pair of pairs) {
      const [mes, ano] = pair.split('|').map(Number)
      const { data } = await supabase.from(TABLE).select('dia,mes,ano,nome').eq('mes', mes).eq('ano', ano)
      data?.forEach(r => existingKeys.add(dedupKey(r as CalendarEvent)))
    }

    const novos      = valid.filter(r => !existingKeys.has(dedupKey(r)))
    const duplicados = valid.length - novos.length

    if (novos.length === 0) {
      toast(`Todos os ${duplicados} registro(s) já existem. Nada importado.`, 'info')
      setShowImportModal(false)
      return
    }

    const { error } = await supabase.from(TABLE).insert(novos)
    setShowImportModal(false)
    if (error) { toast('Erro ao importar: ' + error.message, 'error'); return }

    const partes = [`${novos.length} evento(s) importado(s).`]
    if (duplicados         > 0) partes.push(`${duplicados} duplicado(s) ignorado(s).`)
    if (parseErrors.length > 0) partes.push(`${parseErrors.length} linha(s) inválida(s).`)
    toast(partes.join(' '))
    loadEvents()
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <form onSubmit={handleLogin} className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm flex flex-col gap-5 shadow-sm">
          <div className="flex flex-col items-center gap-3 mb-2">
            <Image src="/logo (1).png" alt="Colégio Visconde de Porto Seguro" width={140} height={100} className="object-contain" />
            <span className="text-sm font-semibold text-escola-blue tracking-wide">Unidade Panamby — Admin</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Email</label>
            <input
              type="email" placeholder="seu@email.com" required
              value={email} onChange={e => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Senha</label>
            <input
              type="password" placeholder="••••••••" required
              value={pw} onChange={e => setPw(e.target.value)}
              className={inputClass}
            />
          </div>
          {loginError && <p className="text-escola-red text-sm font-medium">{loginError}</p>}
          <button type="submit" disabled={loginLoading} className={btnPrimary + ' py-2.5 disabled:opacity-60'}>
            {loginLoading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </main>
    )
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  return (
    <>
      <Toasts items={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      {showImportModal && (
        <ImportModal
          onImport={handleImportFile}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {showDeleteAll && (
        <DeleteAllModal
          month={MONTHS[selectedMonth - 1]}
          year={selectedYear}
          onConfirm={handleDeleteAll}
          onClose={() => setShowDeleteAll(false)}
        />
      )}

      <main className="min-h-screen bg-gray-50">

        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image src="/logo (1).png" alt="Colégio Visconde de Porto Seguro" width={90} height={64} className="object-contain" />
              <div className="border-l border-gray-200 pl-4">
                <p className="text-xs text-gray-500 leading-none mb-0.5">Calendário escolar</p>
                <p className="text-base font-bold text-escola-blue leading-none">Unidade Panamby</p>
              </div>
            </div>
            <button
              onClick={() => setAuthed(false)}
              className="text-sm text-gray-500 hover:text-escola-red transition font-medium"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-10">

          {/* Seção 1 — Importar eventos */}
          <section>
            <SectionTitle>Importar eventos</SectionTitle>
            <Card className="p-6 flex flex-col gap-4">
              <p className="text-sm text-gray-600">
                Baixe o modelo CSV, preencha com os eventos e importe o arquivo. Duplicatas são detectadas automaticamente.
              </p>
              <div className="flex gap-3 flex-wrap">
                <a href="/modelo_eventos.csv" download className={btnNeutral}>
                  Baixar modelo CSV
                </a>
                <button onClick={() => setShowImportModal(true)} className={btnPrimary}>
                  Importar CSV
                </button>
              </div>
            </Card>
          </section>

          {/* Seção 2 — Adicionar evento */}
          <section>
            <SectionTitle>Adicionar evento</SectionTitle>
            <Card className="p-6">
              <form onSubmit={handleAddEvent} className="grid grid-cols-2 gap-4">

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600">Data</label>
                  <input
                    type="date" required
                    value={form.data}
                    onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600">Horário</label>
                  <input
                    type="text"
                    placeholder="Ex: 9h às 12h, Manhã e tarde"
                    value={form.horario}
                    onChange={e => setForm(f => ({ ...f, horario: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600">Nome</label>
                  <input
                    type="text" required
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600">Local</label>
                  <input
                    type="text"
                    value={form.local}
                    onChange={e => setForm(f => ({ ...f, local: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600">Cor</label>
                  <select
                    value={form.cor}
                    onChange={e => setForm(f => ({ ...f, cor: e.target.value as EventColor }))}
                    className={inputClass}
                  >
                    {COLOR_OPTIONS.map(c => <option key={c} value={c}>{COLOR_LABELS[c]}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox" id="feriado"
                    checked={form.feriado}
                    onChange={e => setForm(f => ({ ...f, feriado: e.target.checked }))}
                    className="w-4 h-4 accent-escola-blue"
                  />
                  <label htmlFor="feriado" className="text-sm font-medium text-gray-700">Feriado</label>
                </div>

                <div className="col-span-2 pt-2">
                  <button type="submit" className={btnPrimary}>
                    Adicionar evento
                  </button>
                </div>
              </form>
            </Card>
          </section>

          {/* Seção 3 — Eventos cadastrados */}
          <section className="pb-10">
            <SectionTitle>Eventos cadastrados</SectionTitle>
            <Card className="overflow-hidden">
              <div className="flex gap-3 items-center px-6 py-4 border-b border-gray-100 flex-wrap">
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-escola-blue"
                >
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-24 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-escola-blue"
                />
                <div className="ml-auto flex gap-2">
                  <button onClick={handleExportCSV} className={btnNeutral}>
                    Exportar CSV
                  </button>
                  <button
                    onClick={() => setShowDeleteAll(true)}
                    disabled={events.length === 0}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition
                      ${events.length > 0
                        ? 'bg-escola-red text-white hover:opacity-90'
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      }`}
                  >
                    Deletar todos
                  </button>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3 text-left">Dia</th>
                    <th className="px-6 py-3 text-left">Nome</th>
                    <th className="px-6 py-3 text-left">Local</th>
                    <th className="px-6 py-3 text-left">Horário</th>
                    <th className="px-6 py-3 text-left">Cor</th>
                    <th className="px-6 py-3 text-left">Feriado</th>
                    <th className="px-6 py-3 text-left">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Carregando...</td></tr>
                  )}
                  {!loading && events.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Nenhum evento neste mês.</td></tr>
                  )}
                  {events.map(ev => (
                    <tr key={ev.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-900">{ev.dia}</td>
                      <td className="px-6 py-3 text-gray-900 font-medium">{ev.nome}</td>
                      <td className="px-6 py-3 text-gray-500">{ev.local ?? '—'}</td>
                      <td className="px-6 py-3 text-gray-500">{ev.horario ?? '—'}</td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-700">{ev.cor}</span>
                      </td>
                      <td className="px-6 py-3 text-gray-700">{ev.feriado ? 'Sim' : 'Não'}</td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleDelete(ev.id)}
                          className="text-escola-red hover:opacity-70 text-xs font-semibold transition"
                        >
                          Deletar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>

        </div>
      </main>
    </>
  )
}
