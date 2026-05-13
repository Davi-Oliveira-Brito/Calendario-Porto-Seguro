'use client'

import { useState, useEffect } from 'react'
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

export default function Calendar() {
  const today = new Date()
  const [mes, setMes] = useState(today.getMonth() + 1)
  const [ano, setAno] = useState(today.getFullYear())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

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

  const prevMonth = () => {
    if (mes === 1) { setMes(12); setAno(a => a - 1) }
    else setMes(m => m - 1)
  }
  const nextMonth = () => {
    if (mes === 12) { setMes(1); setAno(a => a + 1) }
    else setMes(m => m + 1)
  }

  const eventsForDay = (day: number) => events.filter(e => e.dia === day)

  return (
    <div className="min-h-screen bg-[#fafafa]">

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4 flex items-center justify-between">

          {/* Logo + identificação */}
          <div className="flex items-center gap-4">
            <Image
              src="/logo (1).png"
              alt="Colégio Visconde de Porto Seguro"
              width={80}
              height={58}
              className="object-contain"
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
                className="w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-escola-blue hover:text-escola-blue transition flex items-center justify-center text-sm"
              >
                ←
              </button>
              <button
                onClick={nextMonth}
                className="w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-escola-blue hover:text-escola-blue transition flex items-center justify-center text-sm"
              >
                →
              </button>
            </div>
          </div>

        </div>
      </header>

      <div className="p-6">

        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs font-bold uppercase tracking-wider text-escola-blue py-1 opacity-70">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-96 text-gray-400 text-sm">
            Carregando eventos...
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const isToday =
                today.getDate()     === day &&
                today.getMonth() + 1 === mes &&
                today.getFullYear()  === ano
              return (
                <DayCell
                  key={day}
                  day={day}
                  events={eventsForDay(day)}
                  isToday={isToday}
                />
              )
            })}
          </div>
        )}
      </div>

      <Legend events={events} />
    </div>
  )
}
