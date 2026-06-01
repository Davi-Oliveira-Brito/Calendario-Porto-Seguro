# Slideshow Semanal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o calendário de visualização mensal para um slideshow automático de 7 dias por vez, sem interação do usuário.

**Architecture:** Toda a mudança fica em `Calendar.tsx`. Uma função pura `buildWeeks` agrupa os dias em semanas. Um `setInterval` de 15s avança `weekIndex` com fade via `opacity` CSS. Botões de navegação, modal mobile e handlers de clique são removidos.

**Tech Stack:** React 19, Next.js 16, Tailwind CSS v4, TypeScript

---

### Task 1: Adicionar `buildWeeks` e substituir o grid pelo da semana atual

**Files:**
- Modify: `src/components/Calendar.tsx`

- [ ] **Step 1: Adicionar `buildWeeks` antes do componente**

Em `src/components/Calendar.tsx`, logo após as constantes `WEEKDAYS` (linha 15), inserir:

```ts
function buildWeeks(daysInMonth: number, firstDow: number): (number | null)[][] {
  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) weeks.push(week)
  return weeks
}
```

- [ ] **Step 2: Adicionar `useMemo` ao import**

Alterar a linha 3 de:
```ts
import { useState, useEffect } from 'react'
```
para:
```ts
import { useState, useEffect, useMemo } from 'react'
```

- [ ] **Step 3: Adicionar estado `weekIndex` e derivar `weeks`**

Após as linhas que calculam `firstDow` e `daysInMonth` (atualmente linhas 76–77), adicionar:

```ts
const weeks = useMemo(
  () => buildWeeks(daysInMonth, firstDow),
  [daysInMonth, firstDow]
)

const [weekIndex, setWeekIndex] = useState(() => {
  const fd = new Date(today.getFullYear(), today.getMonth(), 1).getDay()
  return Math.floor((today.getDate() - 1 + fd) / 7)
})
```

O lazy initializer do `useState` roda só uma vez no mount — captura `today` corretamente sem precisar de deps.

- [ ] **Step 4: Resetar `weekIndex` quando o mês muda (virada de mês à meia-noite)**

Adicionar este `useEffect` logo após o existente de `scheduleNextMidnight`:

```ts
useEffect(() => {
  setWeekIndex(0)
}, [mes, ano])
```

- [ ] **Step 5: Substituir o grid para renderizar só a semana atual**

Localizar o bloco do grid (dentro do `{loading ? ... : ( <div className="flex-1 min-h-0 grid grid-cols-7 gap-2" ...> ... </div> )}`) e substituir o conteúdo interno:

**Antes:**
```tsx
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
      onClick={() => setSelectedDay(day)}
    />
  )
})}
```

**Depois:**
```tsx
{(weeks[weekIndex] ?? []).map((day, i) =>
  day === null ? (
    <div key={`empty-${i}`} />
  ) : (
    <DayCell
      key={day}
      day={day}
      events={eventsForDay(day)}
      isToday={
        today.getDate()      === day &&
        today.getMonth() + 1 === mes &&
        today.getFullYear()  === ano
      }
    />
  )
)}
```

- [ ] **Step 6: Verificar no browser**

```bash
npm run dev
```

Abrir `http://localhost:3000`. O calendário deve mostrar apenas 7 células (a semana atual). As células devem estar bem maiores que antes.

- [ ] **Step 7: Commit**

```bash
git add src/components/Calendar.tsx
git commit -m "feat: renderizar semana atual no lugar do mês completo"
```

---

### Task 2: Adicionar slideshow automático com fade

**Files:**
- Modify: `src/components/Calendar.tsx`

- [ ] **Step 1: Adicionar estado `visible` para o fade**

Junto aos outros `useState`, adicionar:

```ts
const [visible, setVisible] = useState(true)
```

- [ ] **Step 2: Adicionar o `useEffect` do slideshow**

Após o `useEffect` do `keepAlive`/Supabase, adicionar:

```ts
useEffect(() => {
  if (weeks.length <= 1) return
  const interval = setInterval(() => {
    setVisible(false)
    setTimeout(() => {
      setWeekIndex(i => (i + 1) % weeks.length)
      setVisible(true)
    }, 300)
  }, 15_000)
  return () => clearInterval(interval)
}, [weeks.length])
```

- [ ] **Step 3: Aplicar classe de fade no wrapper do grid**

Localizar a `<div>` do grid:
```tsx
<div
  className="flex-1 min-h-0 grid grid-cols-7 gap-2"
  style={{ gridAutoRows: 'minmax(0, 1fr)' }}
>
```

Alterar para:
```tsx
<div
  className={`flex-1 min-h-0 grid grid-cols-7 gap-2 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
  style={{ gridAutoRows: 'minmax(0, 1fr)' }}
>
```

- [ ] **Step 4: Verificar no browser**

```bash
npm run dev
```

Aguardar 15 segundos. O grid deve fazer fade out suave, trocar de semana e fazer fade in. Conferir que o ciclo volta à semana 0 após a última.

- [ ] **Step 5: Commit**

```bash
git add src/components/Calendar.tsx
git commit -m "feat: slideshow automático de semanas com fade de 15s"
```

---

### Task 3: Remover interação (modal, botões, selectedDay)

**Files:**
- Modify: `src/components/Calendar.tsx`

- [ ] **Step 1: Remover estado `selectedDay` e variável derivada**

Remover as linhas:
```ts
const [selectedDay, setSelectedDay] = useState<number | null>(null)
const selectedEvents = selectedDay !== null ? eventsForDay(selectedDay) : []
```

- [ ] **Step 2: Remover o bloco do modal mobile inteiro**

Remover todo o bloco `{selectedDay !== null && ( <div className="fixed inset-0 z-50 ..."> ... </div> )}` (linhas 97–132 do arquivo original).

- [ ] **Step 3: Remover botões prev/next e handlers `prevMonth`/`nextMonth`**

Remover as funções:
```ts
const prevMonth = () => { ... }
const nextMonth = () => { ... }
```

Remover do JSX o bloco:
```tsx
<div className="flex gap-2">
  <button onClick={prevMonth} ...>←</button>
  <button onClick={nextMonth} ...>→</button>
</div>
```

- [ ] **Step 4: Verificar TypeScript sem erros**

```bash
npm run build
```

Esperado: build finaliza sem erros de tipo. Se houver erro de `selectedEvents` não utilizado ou referência a `prevMonth`/`nextMonth`, confirmar que as remoções dos steps anteriores estão completas.

- [ ] **Step 5: Commit**

```bash
git add src/components/Calendar.tsx
git commit -m "chore: remover interação (modal, botões, selectedDay)"
```

---

### Task 4: Adicionar indicador de pontinhos das semanas

**Files:**
- Modify: `src/components/Calendar.tsx`

- [ ] **Step 1: Adicionar os pontinhos no header**

No header, localizar o bloco onde ficavam os botões prev/next (que acabou de ser removido). No lugar, adicionar os pontinhos logo após o `<span>` com o nome do mês:

```tsx
<div className="flex gap-2 items-center">
  {weeks.map((_, i) => (
    <div
      key={i}
      className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
        i === weekIndex ? 'bg-escola-blue' : 'bg-gray-200'
      }`}
    />
  ))}
</div>
```

- [ ] **Step 2: Verificar no browser**

```bash
npm run dev
```

Conferir que os pontinhos aparecem no header à direita do nome do mês. O pontinho da semana atual deve estar azul. A cada 15s deve mudar junto com o fade do grid.

- [ ] **Step 3: Commit**

```bash
git add src/components/Calendar.tsx
git commit -m "feat: indicador de semanas (pontinhos) no header"
```

---

### Task 5: Verificação final

**Files:**
- Read: `src/components/Calendar.tsx` (verificação)

- [ ] **Step 1: Conferir que não sobrou referência a `selectedDay`, `prevMonth`, `nextMonth`, `onClick` em DayCell**

```bash
grep -n "selectedDay\|prevMonth\|nextMonth\|setSelectedDay" src/components/Calendar.tsx
```

Esperado: nenhuma saída.

- [ ] **Step 2: Build final limpo**

```bash
npm run build
```

Esperado: `✓ Compiled successfully` sem warnings de variáveis não utilizadas.

- [ ] **Step 3: Teste de ciclo completo no browser**

- Abrir `http://localhost:3000`
- Confirmar: semana atual visível, células grandes
- Aguardar 15s: fade out → nova semana → fade in
- Aguardar ciclo completo: volta à semana 0 após a última
- Pontinhos no header acompanham a semana ativa
- Nenhum botão ou área clicável visível

- [ ] **Step 4: Commit final se necessário**

Se houver qualquer ajuste de polish feito nesta task:

```bash
git add src/components/Calendar.tsx
git commit -m "polish: ajustes finais do slideshow semanal"
```
