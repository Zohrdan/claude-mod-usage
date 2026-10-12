# usage-bar

A Claude Code mod that draws a slim usage band above the prompt, in the terminal (Claude Code) and in the desktop app (Code tab and Cowork):

```
✻ Opus 5.5 · 1M   ctx ━━━━━╸━━━━ 56% 560k/1M   5h ━╸━━━━━━━━ 13% ↻ 2h5m   wk ━╸━━━━━━━━ 14% ↻ 6d15h   $39.07
```

- **Model**: the model that answered the last turn
- **ctx**: how full the context window is, with tokens used / window size
- **5h / wk**: your subscription's 5-hour and weekly limits, with time until each resets (shown only on a subscription)
- **Cost**: what this session has cost so far

Each meter has its own colour (teal, violet, blue) and turns amber at 70% and rose at 90%. The track follows your theme. It updates after every turn and whenever a limit moves, and the countdowns tick every minute. If the band is too wide it wraps onto a second line.

Type `/usage-bar` to hide it or show it again.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install usage-bar --marketplace zohrdan/claude-mod-usage
```

Answer `y` to add the marketplace, then choose the user scope. With the user scope it also loads in local sessions the desktop app starts.

## Develop

```
claude --plugin-dir .          # run it from this folder
claude plugin validate .
claude plugin test .
```
