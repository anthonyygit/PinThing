import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import './App.css'
import PTR from './assets/PTR.png'
import PTB from './assets/PTB.png'
import PTY from './assets/PTY.png'
import cupImg from './assets/cup.png'
import baseImg from './assets/base.png'

type HalfColor = 'red' | 'blue' | 'yellow'

interface Pin { top: HalfColor; bottom: HalfColor }
interface Cup { flipped: boolean } 
interface Round { pins: Pin[]; cups: Cup[] }

const POINTS: Record<HalfColor, number> = { red: 5, blue: 5, yellow: 15 }
const SECS_PER_GOAL = 1

const PIN_COMBOS: [HalfColor, HalfColor][] = [
  ['red', 'yellow'], ['blue', 'yellow'], ['yellow', 'yellow'], ['red', 'blue'],
]

const HALF_SRC: Record<HalfColor, string> = { red: PTR, blue: PTB, yellow: PTY }

// ── size knobs ───────────────────────────────────────────────────────────────
const PIN_SCALE = 1            
const CUP_SCALE = .98      

const IMG     = Math.round(80 * PIN_SCALE)
const CUP_IMG = Math.round(80 * CUP_SCALE)

const T_TOP    = Math.round(IMG * 50 / 500)
const PIN_SLOT = IMG - 2 * T_TOP

const CUP_LINE = Math.round(CUP_IMG * 265 / 500)
const CUP_OFFSET = 7  
const BASE_TOP_OFFSET = (IMG - T_TOP) - Math.round(IMG * 280 / 500)

function generateRound(): Round {
  const n = Math.floor(Math.random() * 6) + 1
  const pins: Pin[] = Array.from({ length: n }, () => {
    const [top, bottom] = PIN_COMBOS[Math.floor(Math.random() * PIN_COMBOS.length)]
    return { top, bottom }
  })
  const cups: Cup[] = Array.from({ length: Math.max(0, n - 1) }, () => ({
    flipped: Math.random() < 0.5,
  }))
  return { pins, cups }
}

function computeAnswer({ pins, cups }: Round) {
  let red = 0, blue = 0, yellow = 0
  function add(h: HalfColor) {
    if (h === 'red') red += POINTS.red
    else if (h === 'blue') blue += POINTS.blue
    else yellow += POINTS.yellow
  }
  add(pins[pins.length - 1].top)
  cups.forEach((cup, i) => add(cup.flipped ? pins[i + 1].bottom : pins[i].top))
  return { red, blue, yellow }
}

function blankInputs() { return { red: '', blue: '', yellow: '' } }

function PinStack({ round }: { round: Round }) {
  const { pins, cups } = round
  const n = pins.length
  const containerHeight = (n - 1) * PIN_SLOT + BASE_TOP_OFFSET + IMG

  return (
    <div style={{ position: 'relative', width: IMG, height: containerHeight }}>
      {pins.map((pin, i) => {
        const top = (n - 1 - i) * PIN_SLOT
        return (
          <Fragment key={i}>
            <img src={HALF_SRC[pin.top]} style={{
              position: 'absolute', top, left: 0,
              width: IMG, height: IMG, zIndex: 1,
            }} />
            <img src={HALF_SRC[pin.bottom]} style={{
              position: 'absolute', top, left: 0,
              width: IMG, height: IMG,
              transform: 'rotate(180deg)',
              zIndex: 1,
            }} />
          </Fragment>
        )
      })}

      <img src={baseImg} style={{
        position: 'absolute',
        top: (n - 1) * PIN_SLOT + BASE_TOP_OFFSET,
        left: 0,
        width: IMG,
        height: IMG,
        zIndex: 50,
      }} />

      {cups.map((cup, i) => {
        const seamY = (n - 1 - i) * PIN_SLOT
        const lineFromTop = cup.flipped ? (CUP_IMG - CUP_LINE) : CUP_LINE
        const cupTop  = seamY - lineFromTop + CUP_OFFSET
        const cupLeft = (IMG - CUP_IMG) / 2 
        return (
          <img key={`cup-${i}`} src={cupImg} style={{
            position: 'absolute',
            top: cupTop,
            left: cupLeft,
            width: CUP_IMG,
            height: CUP_IMG,
            transform: cup.flipped ? 'rotate(180deg)' : 'none',
            zIndex: 2,
          }} />
        )
      })}
    </div>
  )
}

export default function App() {
  const [timed, setTimed] = useState(false)
  const [round, setRound] = useState<Round>(() => generateRound())
  const [inputs, setInputs] = useState(blankInputs)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [gameOver, setGameOver] = useState<{ correct: { red: number; blue: number; yellow: number } } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function clearTimer() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }

  function startTimer(n: number) {
    clearTimer()
    const total = n * SECS_PER_GOAL
    setTimeLeft(total)
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearTimer(); return 0 }
        return t - 1
      })
    }, 1000)
  }

  useEffect(() => {
    if (timed && timeLeft === 0 && !gameOver && intervalRef.current === null) {
      setGameOver({ correct: computeAnswer(round) })
    }
  }, [timeLeft, timed, gameOver, round])

  const nextRound = useCallback((timedMode: boolean) => {
    const r = generateRound()
    setRound(r)
    setInputs(blankInputs)
    if (timedMode) startTimer(r.pins.length)
    else setTimeLeft(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = useCallback(() => {
    if (gameOver) return
    const correct = computeAnswer(round)
    const userRed = parseInt(inputs.red) || 0
    const userBlue = parseInt(inputs.blue) || 0
    const userYellow = parseInt(inputs.yellow) || 0
    const ok = userRed === correct.red && userBlue === correct.blue && userYellow === correct.yellow
    clearTimer()
    if (ok) { setScore(s => s + 1); nextRound(timed) }
    else setGameOver({ correct })
  }, [gameOver, round, inputs, timed, nextRound])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Enter') submit() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [submit])

  useEffect(() => () => clearTimer(), [])

  function restart() { setScore(0); setGameOver(null); nextRound(timed) }

  function toggleTimed() {
    const next = !timed
    setTimed(next)
    if (!gameOver) nextRound(next)
  }

  if (gameOver) {
    return (
      <div className="app">
        <div className="game-over-label">game over</div>
        <div className="score-num">{score}</div>
        <div className="game-over-answer">
          <span className="red">{gameOver.correct.red}</span>
          <span className="blue">{gameOver.correct.blue}</span>
          <span className="yellow">{gameOver.correct.yellow}</span>
        </div>
        <button onClick={restart}>Try Again</button>
        <button className="btn-ghost" onClick={toggleTimed}>{timed ? 'timed' : 'untimed'}</button>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="score-num">{score}</div>
      {timed && <div className={`timer ${timeLeft <= 3 ? 'urgent' : ''}`}>{timeLeft}</div>}
      <PinStack round={round} />
      <div className="inputs">
        {(['red', 'blue', 'yellow'] as HalfColor[]).map(c => (
          <div key={c} className="input-group">
            <label className={c}>{c}</label>
            <input
              type="number" min={0}
              value={inputs[c]}
              onChange={e => setInputs(prev => ({ ...prev, [c]: e.target.value }))}
              placeholder="0"
            />
          </div>
        ))}
      </div>
      <button onClick={submit}>Submit</button>
      <button className="btn-ghost" onClick={toggleTimed}>{timed ? 'timed - 1s/pin' : 'untimed'}</button>
    </div>
  )
}
