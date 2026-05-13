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
  'c-blue':   'bg-blue-100',
  'c-green':  'bg-green-100',
  'c-amber':  'bg-amber-100',
  'c-purple': 'bg-purple-100',
  'c-coral':  'bg-orange-100',
  'c-teal':   'bg-teal-100',
  'c-pink':   'bg-pink-100',
  'c-red':    'bg-red-100',
  'c-gray':   'bg-gray-100',
}

interface Props {
  events: CalendarEvent[]
}

export default function Legend({ events }: Props) {
  const usedColors = [...new Set(events.map(e => e.cor))]
  if (usedColors.length === 0) return null

  return (
    <div className="px-2 pb-4 sm:px-6 sm:pb-6">
      <p className="text-xs font-bold uppercase tracking-widest text-escola-blue mb-3 opacity-70">Legenda</p>
      <div className="flex flex-wrap gap-3">
        {usedColors.map(color => (
          <div key={color} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-sm ${COLOR_BG[color]}`} />
            <span className="text-xs text-gray-600">{COLOR_LABELS[color]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
