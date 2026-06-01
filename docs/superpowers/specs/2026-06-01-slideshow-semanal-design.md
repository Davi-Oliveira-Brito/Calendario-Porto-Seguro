# Slideshow Semanal — Design Spec

**Data:** 2026-06-01  
**Status:** aprovado

## Contexto

O calendário escolar fica numa tela 24x7 sem ninguém interagindo. Mostrar o mês inteiro (30 dias) deixa as células pequenas e a informação difícil de ler. A solução é exibir 7 dias por vez e avançar automaticamente, como uma apresentação.

## Comportamento

- Exibe 7 dias por vez (uma semana do grid mensal, incluindo slots vazios do `firstDow`)
- Avança automaticamente a cada **15 segundos**
- Ao atingir a última semana do mês, volta à semana 0 (loop contínuo)
- Inicia na semana que contém o dia de hoje
- **Sem interação do usuário** — nenhum botão, nenhum modal, nenhum click handler

## Transição

Fade simples via Tailwind: `transition-opacity duration-300`. No momento da troca, o grid vai a `opacity-0`, o estado atualiza, volta a `opacity-100`. Sem bibliotecas externas.

## Indicador de semanas

Barra de pontinhos fina abaixo do header (ex: `● ○ ○ ○`). Um ponto por semana do mês; o atual destacado em `escola-blue`. Dá contexto visual sem precisar de interação.

## Mudanças em `Calendar.tsx`

| O que sai | O que entra |
|-----------|-------------|
| Estado `selectedDay` | Estado `weekIndex: number` |
| Modal mobile | `setInterval` de 15s |
| Botões prev/next mês | Lógica de agrupamento de semanas |
| `onClick` nos `DayCell` | Indicador de progresso |

## O que NÃO muda

- `DayCell.tsx` — sem alteração
- `Legend.tsx` — sem alteração
- `lib/supabase.ts`, `lib/fetchEvents.ts` — sem alteração
- `types/event.ts` — sem alteração
- Subscription real-time Supabase — mantida
- Keep-alive diário — mantido
- Lógica de virada de mês à meia-noite — mantida

## Lógica de agrupamento de semanas

```
semana 0: slots [0 .. firstDow-1] (vazios) + dias até completar 7 slots
semana 1: próximos 7 dias
...
última semana: dias restantes (pode ter menos de 7)
```

O grid continua `grid-cols-7` — semanas incompletas simplesmente não preenchem todos os slots.

## Cálculo da semana inicial

```
weekIndex = Math.floor((today.getDate() - 1 + firstDow) / 7)
```

Recalcula sempre que `mes`/`ano` mudam (virada de mês à meia-noite).
