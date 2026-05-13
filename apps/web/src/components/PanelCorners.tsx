import Image from "next/image";
import { ORACLE_ASSETS } from "@/lib/oracleAssets";

export function PanelCorners() {
  return (
    <>
      <Image
        src={ORACLE_ASSETS.decoratives.cornerOrnament}
        alt=""
        width={44}
        height={44}
        className="pointer-events-none absolute left-2 top-2 z-10 pixelated opacity-85"
      />
      <Image
        src={ORACLE_ASSETS.decoratives.cornerOrnament}
        alt=""
        width={44}
        height={44}
        className="pointer-events-none absolute right-2 top-2 z-10 pixelated opacity-85 [transform:scaleX(-1)]"
      />
      <Image
        src={ORACLE_ASSETS.decoratives.cornerOrnament}
        alt=""
        width={44}
        height={44}
        className="pointer-events-none absolute bottom-2 left-2 z-10 pixelated opacity-85 [transform:scaleY(-1)]"
      />
      <Image
        src={ORACLE_ASSETS.decoratives.cornerOrnament}
        alt=""
        width={44}
        height={44}
        className="pointer-events-none absolute bottom-2 right-2 z-10 pixelated opacity-85 [transform:scale(-1)]"
      />
    </>
  );
}
