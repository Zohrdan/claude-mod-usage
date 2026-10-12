#!/usr/bin/env bash
# usage-bar status line: model, context fill, 5h / weekly limits and cost.
# Works without plugins. Needs jq. Claude Code pipes the session's JSON to stdin.
in=$(cat)
j() { jq -r "$1 // empty" <<<"$in" 2>/dev/null; }

esc=$'\033'
rgb() { printf '%s[38;2;%d;%d;%dm' "$esc" "0x${1:1:2}" "0x${1:3:2}" "0x${1:5:2}"; }
B="${esc}[1m"; R="${esc}[0m"; DIM="${esc}[2m"
TRACK=$(rgb '#52525b')

heat() { # percent base-hex
  local p=${1%.*}
  if (( p >= 90 )); then rgb '#fb7185'; elif (( p >= 70 )); then rgb '#fbbf24'; else rgb "$2"; fi
}

bar() { # percent width
  local p=${1%.*} w=$2 halves full half empty s=''
  (( p < 0 )) && p=0; (( p > 100 )) && p=100
  halves=$(( (p * w * 2 + 50) / 100 )); full=$(( halves / 2 )); half=$(( halves % 2 ))
  empty=$(( w - full - half ))
  for ((i = 0; i < full; i++)); do s+='━'; done
  (( half )) && s+='╸'
  printf '%s%s' "$s" "$TRACK"
  for ((i = 0; i < empty; i++)); do printf '━'; done
}

tok() { # 560000 -> 560k
  local n=${1%.*}
  if (( n >= 1000000 )); then awk -v n="$n" 'BEGIN{v=n/1e6; printf (v==int(v)?"%dM":"%.1fM"), v}'
  elif (( n >= 1000 )); then printf '%dk' $(( (n + 500) / 1000 ))
  else printf '%d' "$n"; fi
}

left() { # resets_at (epoch seconds or ISO 8601) -> 2h5m / 6d15h
  local t=$1 now secs m d h
  [[ -z $t ]] && return
  if [[ $t =~ ^[0-9]+$ ]]; then secs=$t; else secs=$(date -d "$t" +%s 2>/dev/null || date -j -f '%Y-%m-%dT%H:%M:%S' "${t%%.*}" +%s 2>/dev/null) || return; fi
  now=$(date +%s); m=$(( (secs - now) / 60 ))
  (( m <= 0 )) && { printf 'now'; return; }
  d=$(( m / 1440 )); h=$(( m % 1440 / 60 )); m=$(( m % 60 ))
  if (( d > 0 )); then printf '%dd%dh' "$d" "$h"; elif (( h > 0 )); then printf '%dh%dm' "$h" "$m"; else printf '%dm' "$m"; fi
}

meter() { # label percent hex [tail]
  local c; c=$(heat "$2" "$3")
  printf '%s%s%s %s%s%s %s%s%3d%%%s' "$c" "$B" "$1" "$R" "$c" "$(bar "$2" 10)" "$R" "$c$B" "${2%.*}" "$R"
  [[ -n $4 ]] && printf ' %s%s%s' "$DIM" "$4" "$R"
  printf '   '
}

out=''
model=$(j '.model.display_name')
[[ -n $model ]] && out+="$(rgb '#d97757')${B}✻${R} ${B}${model}${R}   "

pct=$(j '.context_window.used_percentage')
used=$(j '.context_window.total_input_tokens')
size=$(j '.context_window.context_window_size')
if [[ -n $pct ]]; then
  tail=''; [[ -n $used && -n $size ]] && tail="$(tok "$used")/$(tok "$size")"
  out+=$(meter ctx "$pct" '#5eead4' "$tail")
fi

for k in five_hour:5h:'#a78bfa' seven_day:wk:'#60a5fa'; do
  IFS=: read -r key label hex <<<"$k"
  p=$(j ".rate_limits.$key.used_percentage")
  [[ -z $p ]] && continue
  r=$(left "$(j ".rate_limits.$key.resets_at")")
  out+=$(meter "$label" "$p" "$hex" "${r:+↻ $r}")
done

cost=$(j '.cost.total_cost_usd')
[[ -n $cost ]] && out+="$(rgb '#86efac')${B}\$$(printf '%.2f' "$cost")${R}"

printf '%s\n' "$out"
