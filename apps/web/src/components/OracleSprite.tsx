import type { CSSProperties } from "react";

export function OracleSprite({
  src,
  width,
  height,
  className = "",
  style,
}: {
  src: string;
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={`oracle-sprite ${className}`}
      style={{
        width,
        height,
        backgroundImage: `url("${src}")`,
        ...style,
      }}
    />
  );
}
