import { BrandMark } from './BrandMark.tsx';

// Nome em texto HTML, não em <img>: o <text> dos SVGs não carrega a Inter.
export function BrandLockup({ stacked = false, markHeight }: { stacked?: boolean; markHeight?: number }) {
  return (
    <span className={stacked ? 'lockup lockup--stacked' : 'lockup'}>
      <BrandMark height={markHeight ?? (stacked ? 52 : 34)} />
      <span className="lockup__name">
        Gastômetro <span className="lockup__accent">Rolante</span>
      </span>
    </span>
  );
}
