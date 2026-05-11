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

interface Props {
  day: number
  events: CalendarEvent[]
  isToday: boolean
}

export default function DayCell({ day, events, isToday }: Props) {
  const isHoliday = events.some(e => e.feriado)

  return (
    <div className={[
      'min-h-24 rounded-xl border p-2 flex flex-col gap-1 shadow-[0_1px_4px_rgba(0,0,0,0.06)]',
      isHoliday ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100',
      isToday   ? 'ring-2 ring-escola-red'   : '',
    ].join(' ')}>
      <span className={[
        'text-xs font-bold mb-1',
        isToday   ? 'text-escola-red'  :
        isHoliday ? 'text-escola-red'  :
                    'text-gray-400',
      ].join(' ')}>
        {day}
      </span>
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
  )
}
