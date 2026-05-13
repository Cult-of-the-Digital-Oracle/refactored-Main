import { OracleSprite } from "@/components/OracleSprite";
import { ORACLE_ASSETS } from "@/lib/oracleAssets";

const RUNES = [
  { left: "6%", top: "18%", delay: "0s", opacity: 0.32, scale: 1 },
  { left: "18%", top: "62%", delay: "0.7s", opacity: 0.22, scale: 0.9 },
  { left: "44%", top: "12%", delay: "1.2s", opacity: 0.28, scale: 1.1 },
  { left: "74%", top: "28%", delay: "0.4s", opacity: 0.24, scale: 0.86 },
  { left: "86%", top: "68%", delay: "1.6s", opacity: 0.3, scale: 1 },
];

export function AmbientRunes() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {RUNES.map((rune, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            left: rune.left,
            top: rune.top,
            opacity: rune.opacity,
            transform: `scale(${rune.scale})`,
          }}
        >
          <OracleSprite
            src={ORACLE_ASSETS.decoratives.floatingParticleRune}
            width={28}
            height={28}
            className="oracle-rune"
            style={{ animationDelay: rune.delay }}
          />
        </div>
      ))}
    </div>
  );
}
