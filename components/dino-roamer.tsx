export function DinoRoamer() {
  return (
    <div className="dino-roamer" aria-hidden="true">
      <div className="dino-bob">
        <svg viewBox="0 0 84 60" width="84" height="60" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 34 C 10 30, 2 28, 4 24 C 6 30, 14 34, 22 36 Z" fill="var(--accent)" />
          <ellipse cx="40" cy="32" rx="22" ry="14" fill="var(--accent)" />
          <polygon points="18,20 22,10 26,20" fill="var(--ink)" />
          <polygon points="28,17 32,7 36,17" fill="var(--ink)" />
          <polygon points="38,15 42,5 46,15" fill="var(--ink)" />
          <polygon points="48,16 52,7 56,16" fill="var(--ink)" />
          <circle cx="63" cy="22" r="10" fill="var(--accent)" />
          <ellipse cx="72" cy="25" rx="5" ry="4" fill="var(--accent)" />
          <circle cx="66" cy="19" r="1.8" fill="var(--ink)" />
          <rect x="50" y="30" width="10" height="4" rx="2" fill="var(--ink)" transform="rotate(20 50 30)" />
          <g className="dino-leg-back">
            <rect x="24" y="40" width="9" height="16" rx="4" fill="var(--accent)" />
            <ellipse cx="28.5" cy="57" rx="6" ry="3" fill="var(--ink)" />
          </g>
          <g className="dino-leg-front">
            <rect x="46" y="40" width="9" height="16" rx="4" fill="var(--accent)" />
            <ellipse cx="50.5" cy="57" rx="6" ry="3" fill="var(--ink)" />
          </g>
        </svg>
      </div>
    </div>
  )
}
