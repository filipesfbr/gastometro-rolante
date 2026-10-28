// Símbolo do Gastômetro Rolante (cifrão sobre duas ondas). Geometria em docs/brand/gastometro-rolante/assets/gastometro-rolante/mark.svg.
type Props = { height?: number; tone?: 'auto' | 'ink' | 'white'; title?: string };

export function BrandMark({ height = 34, tone = 'auto', title }: Props) {
  const stroke = tone === 'ink' ? 'var(--tinta)' : tone === 'white' ? 'var(--branco)' : 'var(--accent)';
  const fill = tone === 'auto' ? 'var(--brand-bg)' : 'none';
  return (
    <svg
      width={(height * 26) / 34}
      height={height}
      viewBox="0 0 26 34"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect x="2" y="2" width="22" height="30" rx="11" fill={fill} stroke={stroke} strokeWidth="1.8" />
      <path d="M13 6.4 V20.6" stroke={stroke} strokeOpacity=".45" strokeWidth="1.4" />
      <path
        d="M15.94 10.27 C15.3 9.35 14.29 8.8 13 8.8 C11.16 8.8 10.06 9.81 10.06 11.1 C10.06 12.66 11.53 13.12 13 13.4 C14.47 13.68 15.94 14.14 15.94 15.7 C15.94 16.99 14.84 18 13 18 C11.71 18 10.7 17.45 10.06 16.53"
        stroke={stroke}
        strokeWidth="1.8"
      />
      <path d="M7 23.6 q1.5 -1.4 3 0 t3 0 t3 0 t3 0 M8.5 27 q1.5 -1.4 3 0 t3 0 t3 0" stroke={stroke} strokeOpacity=".45" strokeWidth="1.4" />
    </svg>
  );
}
