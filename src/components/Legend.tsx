import { CalendarEvent, EventColor } from '@/types/event'

const COLOR_LABELS: Record<EventColor, string> = {
  'c-blue':   'Apresentações / Debates',
  'c-green':  'Olimpíadas de Matemática',
  'c-amber':  'Olimpíadas de Astronomia',
  'c-purple': 'OBAPO',
  'c-teal':   'Festa da Lanterna',
  'c-coral':  'Semana da Língua Alemã',
  'c-pink':   'Festa Junina',
  'c-red':    'Feriado',
  'c-gray':   'Outros',
}

const COLOR_BG: Record<EventColor, string> = {
  'c-blue':   'bg-blue-400',
  'c-green':  'bg-green-400',
  'c-amber':  'bg-amber-400',
  'c-purple': 'bg-purple-400',
  'c-coral':  'bg-orange-400',
  'c-teal':   'bg-teal-400',
  'c-pink':   'bg-pink-400',
  'c-red':    'bg-red-400',
  'c-gray':   'bg-gray-400',
}

interface Props {
  events: CalendarEvent[]
}

export default function Legend({ events }: Props) {
  const usedColors = [...new Set(events.map(e => e.cor))]
  if (usedColors.length === 0) return null

  return (
    <div className="shrink-0 flex flex-wrap items-center gap-x-5 gap-y-1 pt-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-escola-blue opacity-60">Legenda</p>
      {usedColors.map(color => (
        <div key={color} className="flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLOR_BG[color]}`} />
          <span className="text-[11px] text-gray-500">{COLOR_LABELS[color]}</span>
        </div>
      ))}
    </div>
  )
}
