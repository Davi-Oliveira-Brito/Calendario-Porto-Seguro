export type EventColor =
  | 'c-blue'
  | 'c-green'
  | 'c-amber'
  | 'c-purple'
  | 'c-coral'
  | 'c-teal'
  | 'c-pink'
  | 'c-red'
  | 'c-gray'

export interface CalendarEvent {
  dia: number
  mes: number
  ano: number
  nome: string
  local?: string
  horario?: string
  cor: EventColor
  feriado: boolean
}