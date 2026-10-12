import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage, SessionCost, SessionRateLimit } from 'claude-code'

import type { Snapshot } from '../types'
import { bar, countdown, heat, limitLabel, modelName, tokens, usd } from './format'

const snapshot = atom({ plugin: 'usage-bar', key: 'snapshot' } as const, { limits: [] } as Snapshot)
const now = atom({ plugin: 'usage-bar', key: 'now' } as const, 0)
const isHidden = atom({ plugin: 'usage-bar', key: 'isHidden' } as const, false)

const HUE: Record<string, string> = { ctx: '#5eead4', '5h': '#a78bfa', wk: '#60a5fa', spend: '#f472b6' }
const CTX_HUE = '#5eead4'
const ACCENT = '#d97757'

type Figures = { context: SessionContextUsage; rateLimits: SessionRateLimit[]; cost?: SessionCost }

async function record($: EngineInterface, f: Figures) {
  await update($, snapshot, s => ({
    ...s,
    contextPercent: f.context.percent,
    contextTokens: f.context.tokens,
    contextWindow: f.context.window,
    limits: f.rateLimits.map(l => ({ kind: l.kind, percent: l.percentUsed, resetsAt: l.resetsAt })),
    usd: f.cost?.usd ?? s.usd,
  }))
  const t = await $.clock.now()
  await update($, now, () => t)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await $.command.register({
      name: 'usage-bar',
      description: 'Show or hide the usage band above the prompt',
    })
    await record($, await $.session.usage())
    // Keep the reset countdowns honest between measurements.
    $.clock.every(60_000, () => {
      void $.clock.now().then(t => update($, now, () => t))
    })

    return started
  })

  on('command.run', { command: 'usage-bar' }, async $ => {
    const hidden = await update($, isHidden, v => !v)

    return { text: hidden ? 'Usage band hidden. Run /usage-bar to bring it back.' : 'Usage band shown.' }
  })

  on('session.measure', async ($, e, next) => {
    await record($, e)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const model = e.agentId ? undefined : e.usage?.model
    if (model) await update($, snapshot, s => ({ ...s, model }))

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const s = await read($, snapshot)
    const at = (await read($, now)) || (await $.clock.now())
    const width = 10

    const meter = (label: string, percent: number | undefined, tail?: string) => {
      const hue = percent === undefined ? 'subtle' : heat(percent, HUE[label] ?? CTX_HUE)
      const [fill, half, rest] = bar(percent ?? 0, width)

      return (
        <Box key={`m-${label}`} flexDirection="row" gap={1}>
          <Text color={hue} bold>{label}</Text>
          <Text>
            <Text color={hue}>{fill}{half}</Text>
            <Text color="subtle" dimColor>{rest}</Text>
          </Text>
          <Text color={hue} bold>{percent === undefined ? ' —' : `${Math.round(percent)}%`.padStart(3)}</Text>
          {tail && <Text color="subtle">{tail}</Text>}
        </Box>
      )
    }

    const name = modelName(s.model)
    const ctxTail =
      s.contextTokens !== undefined && s.contextWindow
        ? `${tokens(s.contextTokens)}/${tokens(s.contextWindow)}`
        : s.contextWindow
          ? tokens(s.contextWindow)
          : undefined

    return (
      <Box flexDirection="row" flexWrap="wrap" columnGap={3} paddingX={1}>
        {name && (
          <Box key="model" flexDirection="row" gap={1}>
            <Text color={ACCENT} bold>✻</Text>
            <Text bold>{name}</Text>
          </Box>
        )}
        {meter('ctx', s.contextPercent, ctxTail)}
        {s.limits.map(l =>
          meter(
            limitLabel(l.kind),
            l.percent,
            l.resetsAt ? `↻ ${countdown(Date.parse(l.resetsAt) - at)}` : undefined,
          ),
        )}
        {s.usd !== undefined && (
          <Text key="cost" color="#86efac" bold>{usd(s.usd)}</Text>
        )}
      </Box>
    )
  })
}
