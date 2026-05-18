import Image from "next/image";
import { ORACLE_ASSETS } from "@/lib/oracleAssets";

const SIZE = 56;

export function PanelCorners({ size = SIZE }: { size?: number }) {
  return (
    <>
      {/* top-left */}
      <Image
        src={ORACLE_ASSETS.decoratives.cornerOrnament}
        alt=""
        width={size}
        height={size}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 pixelated z-10 opacity-85"
        style={{ imageRendering: "pixelated" }}
      />
      {/* top-right — mirror horizontally */}
      <Image
        src={ORACLE_ASSETS.decoratives.cornerOrnament}
        alt=""
        width={size}
        height={size}
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 pixelated z-10 opacity-85"
        style={{ imageRendering: "pixelated", transform: "scaleX(-1)" }}
      />
      {/* bottom-left — mirror vertically */}
      <Image
        src={ORACLE_ASSETS.decoratives.cornerOrnament}
        alt=""
        width={size}
        height={size}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 pixelated z-10 opacity-85"
        style={{ imageRendering: "pixelated", transform: "scaleY(-1)" }}
      />
      {/* bottom-right — mirror both */}
      <Image
        src={ORACLE_ASSETS.decoratives.cornerOrnament}
        alt=""
        width={size}
        height={size}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 pixelated z-10 opacity-85"
        style={{ imageRendering: "pixelated", transform: "scale(-1, -1)" }}
      />
    </>
  );
}
