import { supabase } from './supabase'
import { CalendarEvent } from '@/types/event'

export async function fetchEvents(mes: number, ano: number): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .eq('mes', mes)
    .eq('ano', ano)
    .order('dia', { ascending: true })

  if (error) {
    console.error('Erro Supabase:', error)
    return []
  }

  return (data ?? []).map(row => ({
    dia:     row.dia,
    mes:     row.mes,
    ano:     row.ano,
    nome:    row.nome,
    local:   row.local ?? undefined,
    horario: row.horario ?? undefined,
    cor:     row.cor ?? 'c-blue',
    feriado: row.feriado ?? false,
  }))
}