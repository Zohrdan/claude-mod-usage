import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { bar, countdown, modelName, tokens } from '../hooks/format'

const BAND = {
  plugin: 'usage-bar',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10 },
} as const

// The engine's side, which nothing beneath a test supplies.
function bottoms(on: On) {
  mock.clock(on)
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('ui.render', ($, e) => h($.ui.resolve(e).Box, {}))
}

test('formats the pieces', async () => {
  expect(modelName('claude-opus-5-5[1m]')).toBe('Opus 5.5 · 1M')
  expect(modelName('claude-sonnet-5-5')).toBe('Sonnet 5.5')
  expect(tokens(560_000)).toBe('560k')
  expect(tokens(1_000_000)).toBe('1M')
  expect(countdown((2 * 60 + 5) * 60_000)).toBe('2h5m')
  expect(countdown((6 * 24 + 15) * 3_600_000)).toBe('6d15h')
  expect(bar(56, 10).join('').length).toBe(10)
})

test('draws context, limits and cost on every surface with a band', async ($, on) => {
  bottoms(on)
  await $.session.measure({
    context: { tokens: 560_000, window: 1_000_000, percent: 56 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 13, resetsAt: '2026-10-12T12:05:00Z' },
      { kind: 'seven_day', percentUsed: 14 },
    ],
    cost: { usd: 39.07 },
    changed: ['context', 'rateLimits', 'cost'],
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: '56%' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '5h' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'wk' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '$39.07' })).toBeDefined()
  }
})

test('/usage-bar hides the band', async ($, on) => {
  bottoms(on)
  const r = await $.command.run({ command: 'usage-bar', args: '' } as never)
  expect(JSON.stringify(r)).toContain('hidden')
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'ctx' })).toBeUndefined()
})
