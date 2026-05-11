import { NextRequest, NextResponse } from 'next/server'
import { fetchEvents } from '@/lib/fetchEvents'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mes = parseInt(searchParams.get('mes') ?? '0')
  const ano = parseInt(searchParams.get('ano') ?? '0')

  if (!mes || !ano) {
    return NextResponse.json({ error: 'Parâmetros mes e ano são obrigatórios' }, { status: 400 })
  }

  const events = await fetchEvents(mes, ano)
  return NextResponse.json(events)
}