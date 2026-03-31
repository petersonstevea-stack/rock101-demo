export function StageReadyLogo({ width = 210 }: { width?: number }) {
  const height = Math.round(92 * (width / 210));
  return (
    <svg
      viewBox="0 0 210 92"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="210" height="92" fill="#000000"/>
      <rect x="2" y="2" width="206" height="88" rx="6"
        fill="none" stroke="white" strokeWidth="2.5"/>
      <rect x="7" y="7" width="196" height="78" rx="4"
        fill="none" stroke="white" strokeWidth="0.6" opacity="0.18"/>
      <line x1="155" y1="2" x2="155" y2="90"
        stroke="white" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.28"/>
      <circle cx="155" cy="2"  r="6" fill="#000000" stroke="white" strokeWidth="2"/>
      <circle cx="155" cy="90" r="6" fill="#000000" stroke="white" strokeWidth="2"/>
      <text x="75" y="32"
        textAnchor="middle" dominantBaseline="central"
        fontFamily="var(--font-big-shoulders)"
        fontWeight="900" fontSize="30" letterSpacing="5"
        fill="white">STAGE</text>
      <line x1="16" y1="47" x2="138" y2="47"
        stroke="white" strokeWidth="0.6" opacity="0.22"/>
      <text x="75" y="65"
        textAnchor="middle" dominantBaseline="central"
        fontFamily="var(--font-barlow-condensed)"
        fontWeight="900" fontStyle="italic" fontSize="19" letterSpacing="9"
        fill="white" opacity="0.75">READY</text>
      <text x="183" y="46"
        textAnchor="middle" dominantBaseline="central"
        fontFamily="var(--font-barlow-condensed)"
        fontSize="7.5" fill="white" opacity="0.15"
        transform="rotate(90,183,46)">STAGE READY</text>
    </svg>
  );
}
