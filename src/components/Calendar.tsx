'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { CalendarEvent } from '@/types/event'
import DayCell from './DayCell'
import Legend from './Legend'

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function buildWeeks(daysInMonth: number, firstDow: number): (number | null)[][] {
  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) weeks.push(week)
  return weeks
}

export default function Calendar() {
  const today = new Date()
  const [mes, setMes] = useState(today.getMonth() + 1)
  const [ano, setAno] = useState(today.getFullYear())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [weekIndex, setWeekIndex] = useState(() => {
    const fd = new Date(today.getFullYear(), today.getMonth(), 1).getDay()
    return Math.floor((today.getDate() - 1 + fd) / 7)
  })
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    function scheduleNextMidnight() {
      const now = new Date()
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      const msUntilMidnight = nextMidnight.getTime() - now.getTime()
      timeout = setTimeout(() => {
        const d = new Date()
        setMes(d.getMonth() + 1)
        setAno(d.getFullYear())
        scheduleNextMidnight()
      }, msUntilMidnight)
    }

    scheduleNextMidnight()
    return () => clearTimeout(timeout)
  }, [])

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    setWeekIndex(0)
  }, [mes, ano])

  useEffect(() => {
    let cancelled = false

    async function fetchEvents(showLoading: boolean) {
      if (showLoading) setLoading(true)
      const { data } = await supabase
        .from('eventos')
        .select('*')
        .eq('mes', mes)
        .eq('ano', ano)
        .order('dia', { ascending: true })
      if (!cancelled) { setEvents((data as CalendarEvent[]) ?? []); setLoading(false) }
    }

    fetchEvents(true)

    const channel = supabase
      .channel(`eventos-${mes}-${ano}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos' }, () => {
        fetchEvents(false)
      })
      .subscribe()

    // ping diário para manter o projeto Supabase ativo
    const keepAlive = setInterval(() => fetchEvents(false), 86_400_000)

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
      clearInterval(keepAlive)
    }
  }, [mes, ano])

  const firstDow    = new Date(ano, mes - 1, 1).getDay()
  const daysInMonth = new Date(ano, mes, 0).getDate()

  const weeks = useMemo(
    () => buildWeeks(daysInMonth, firstDow),
    [daysInMonth, firstDow]
  )

  useEffect(() => {
    if (weeks.length <= 1) return
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setWeekIndex(i => (i + 1) % weeks.length)
        setVisible(true)
      }, 300)
    }, 15_000)
    return () => clearInterval(interval)
  }, [weeks.length])

  const prevMonth = () => {
    if (mes === 1) { setMes(12); setAno(a => a - 1) }
    else setMes(m => m - 1)
  }
  const nextMonth = () => {
    if (mes === 12) { setMes(1); setAno(a => a + 1) }
    else setMes(m => m + 1)
  }

  const eventsForDay = (day: number) => events.filter(e => e.dia === day)

  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const selectedEvents = selectedDay !== null ? eventsForDay(selectedDay) : []

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#fafafa]">

      {/* Modal mobile — eventos do dia */}
      {selectedDay !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:hidden"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-white w-full rounded-t-2xl p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                {selectedDay} de {MONTHS[mes - 1]}
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum evento neste dia.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {selectedEvents.map((ev, i) => (
                  <li key={i} className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-900">{ev.nome}</span>
                    {ev.horario && <span className="text-xs text-gray-500">{ev.horario}</span>}
                    {ev.local   && <span className="text-xs text-gray-500">{ev.local}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-2">

          {/* Logo + identificação */}
          <div className="flex items-center gap-4">
            <Image
              src="/logo (1).png"
              alt="Colégio Visconde de Porto Seguro"
              width={80}
              height={58}
              className="object-contain w-14 sm:w-20"
            />
            <div className="border-l border-gray-200 pl-4">
              <p className="text-xs text-gray-500 leading-none mb-0.5">Calendário escolar</p>
              <p className="text-base font-bold text-escola-blue leading-none">Unidade Panamby</p>
            </div>
          </div>

          {/* Navegação de mês */}
          <div className="flex items-center gap-4">
            <span className="text-2xl font-light text-gray-800">
              {MONTHS[mes - 1]}{' '}
              <span className="font-semibold text-escola-blue">{ano}</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={prevMonth}
                className="w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-escola-blue hover:text-escola-blue transition flex items-center justify-center"
              >
                ←
              </button>
              <button
                onClick={nextMonth}
                className="w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-escola-blue hover:text-escola-blue transition flex items-center justify-center"
              >
                →
              </button>
            </div>
          </div>

        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col px-4 pt-2 pb-3 gap-1.5">

        {/* Cabeçalho dos dias da semana */}
        <div className="shrink-0 grid grid-cols-7 gap-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-bold uppercase tracking-wider text-escola-blue py-1 opacity-70">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Carregando eventos...
          </div>
        ) : (
          <div
            className={`flex-1 min-h-0 grid grid-cols-7 gap-2 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
            style={{ gridAutoRows: 'minmax(0, 1fr)' }}
          >
            {(weeks[weekIndex] ?? []).map((day, i) =>
              day === null ? (
                <div key={`empty-${i}`} />
              ) : (
                <DayCell
                  key={day}
                  day={day}
                  events={eventsForDay(day)}
                  isToday={
                    today.getDate()      === day &&
                    today.getMonth() + 1 === mes &&
                    today.getFullYear()  === ano
                  }
                />
              )
            )}
          </div>
        )}

        <Legend events={events} />
      </div>
    </div>
  )
}
