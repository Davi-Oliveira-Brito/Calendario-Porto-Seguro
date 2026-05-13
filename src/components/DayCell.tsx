import { CalendarEvent } from '@/types/event'

const COLOR_CLASSES: Record<string, string> = {
  'c-blue':   'bg-blue-100 text-blue-900',
  'c-green':  'bg-green-100 text-green-900',
  'c-amber':  'bg-amber-100 text-amber-900',
  'c-purple': 'bg-purple-100 text-purple-900',
  'c-coral':  'bg-orange-100 text-orange-900',
  'c-teal':   'bg-teal-100 text-teal-900',
  'c-pink':   'bg-pink-100 text-pink-900',
  'c-red':    'bg-red-100 text-red-900',
  'c-gray':   'bg-gray-100 text-gray-900',
}

const COLOR_DOT: Record<string, string> = {
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
  day: number
  events: CalendarEvent[]
  isToday: boolean
  onClick?: () => void
}

export default function DayCell({ day, events, isToday, onClick }: Props) {
  const isHoliday = events.some(e => e.feriado)

  return (
    <div
      onClick={onClick}
      className={[
        'rounded-xl border flex flex-col shadow-[0_1px_4px_rgba(0,0,0,0.06)]',
        'min-h-14 p-1 gap-0.5',
        'sm:min-h-24 sm:p-2 sm:gap-1',
        isHoliday ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100',
        isToday   ? 'ring-2 ring-escola-red'   : '',
        onClick   ? 'sm:cursor-default active:brightness-95' : '',
      ].join(' ')}
    >
      <span className={[
        'text-[10px] sm:text-xs font-bold',
        'mb-0.5 sm:mb-1',
        isToday   ? 'text-escola-red'  :
        isHoliday ? 'text-escola-red'  :
                    'text-gray-400',
      ].join(' ')}>
        {day}
      </span>

      {/* Mobile: bolinhas coloridas */}
      {events.length > 0 && (
        <div className="flex flex-wrap gap-0.5 sm:hidden">
          {events.slice(0, 4).map((ev, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${COLOR_DOT[ev.cor] ?? COLOR_DOT['c-gray']}`}
            />
          ))}
        </div>
      )}

      {/* Desktop: badges com texto */}
      <div className="hidden sm:flex flex-col gap-1">
        {events.map((ev, i) => (
          <div
            key={i}
            className={`text-[10px] leading-tight rounded px-1.5 py-1 font-medium ${COLOR_CLASSES[ev.cor] ?? COLOR_CLASSES['c-gray']}`}
          >
            <div>{ev.nome}</div>
            {ev.horario && <div className="opacity-60 font-normal">{ev.horario}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
