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
  onClick?: () => void
}

export default function DayCell({ day, events, isToday, onClick }: Props) {
  const isHoliday = events.some(e => e.feriado)
  const count = events.length
  const textSize  = 'text-sm'
  const px        = count > 4 ? 'px-1'         : 'px-1.5'
  const showHour  = count <= 3

  return (
    <div
      onClick={onClick}
      className={[
        'rounded-xl border flex flex-col overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]',
        'h-full p-2 gap-1',
        isHoliday ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100',
        isToday   ? 'ring-2 ring-escola-red'   : '',
        onClick   ? 'active:brightness-95' : '',
      ].join(' ')}
    >
      <span className={[
        'text-sm font-bold leading-none shrink-0',
        isToday   ? 'text-escola-red'  :
        isHoliday ? 'text-escola-red'  :
                    'text-gray-400',
      ].join(' ')}>
        {day}
      </span>

      <div className="flex-1 min-h-0 flex flex-col gap-0.5 overflow-hidden">
        {events.map((ev, i) => (
          <div
            key={i}
            className={`flex-1 min-h-0 flex flex-col justify-center overflow-hidden rounded ${px} font-medium ${textSize} ${COLOR_CLASSES[ev.cor] ?? COLOR_CLASSES['c-gray']}`}
          >
            <div className="line-clamp-2 font-semibold leading-tight">{ev.nome}</div>
            {showHour && ev.horario && <div className="opacity-60 font-normal leading-tight line-clamp-1">{ev.horario}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
