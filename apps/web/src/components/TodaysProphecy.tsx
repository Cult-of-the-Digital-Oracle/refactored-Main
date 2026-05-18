"use client";

import Image from "next/image";
import { useReadContract } from "wagmi";
import { CONTRACTS, ORACLE_MESSAGE_ABI } from "@/lib/contracts";
import PixelFrame from "@/components/PixelFrame";
import { ORACLE_ASSETS } from "@/lib/oracleAssets";

export function TodaysProphecy() {
  const { data, isLoading } = useReadContract({
    address: CONTRACTS.oracleMessage,
    abi: ORACLE_MESSAGE_ABI,
    functionName: "todaysProphecy",
  });

  const prophecy = data as
    | {
        text: string;
        timestamp: bigint;
        fulfillmentScore: number;
        resolutionReason: string;
        evidence: string;
        resolved: boolean;
      }
    | undefined;

  const blockNum = useReadContract({
    address: CONTRACTS.oracleMessage,
    abi: ORACLE_MESSAGE_ABI,
    functionName: "totalProphecies",
  });

  const hasText = !!prophecy?.text;

  return (
    <PixelFrame className="pixel-panel w-full overflow-hidden px-5 py-5 sm:px-6 sm:py-6" round={2}>
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <Image
          src={ORACLE_ASSETS.decoratives.horizontalDivider}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image
            src={ORACLE_ASSETS.ui.chainLink}
            alt="Prophecy"
            width={28}
            height={28}
            className="pixelated h-7 w-7"
          />
          <p className="text-lg uppercase tracking-[0.22em] text-[var(--pixel-border)]">
            Today&apos;s Prophecy
          </p>
        </div>
        <span className="text-sm uppercase tracking-[0.16em] text-[var(--pixel-muted)]">
          Live From Mantle
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-full bg-[rgba(240,217,160,0.14)]" />
          <div className="h-4 w-4/5 bg-[rgba(240,217,160,0.14)]" />
          <div className="h-4 w-2/3 bg-[rgba(240,217,160,0.14)]" />
        </div>
      ) : hasText ? (
        <>
          <p className="text-2xl leading-relaxed text-[var(--pixel-parchment)] sm:text-[2rem]">
            &ldquo;{prophecy!.text}&rdquo;
          </p>
          <p className="mt-4 border-t border-[rgba(200,168,75,0.2)] pt-3 text-sm uppercase tracking-[0.12em] text-[var(--pixel-muted)]">
            Recorded on Mantle · {new Date(Number(prophecy!.timestamp) * 1000).toLocaleDateString()} · immutable
          </p>
        </>
      ) : (
        <>
          <p className="text-2xl leading-relaxed text-[var(--pixel-muted)] sm:text-[2rem]">
            &ldquo;The Oracle has not yet spoken today. The chain awaits.&rdquo;
          </p>
          <p className="mt-4 border-t border-[rgba(200,168,75,0.16)] pt-3 text-sm uppercase tracking-[0.12em] text-[rgba(200,178,127,0.82)]">
            {blockNum.data !== undefined
              ? `${blockNum.data.toString()} prophecies recorded · next at midnight UTC`
              : "Listening to the chain..."}
          </p>
        </>
      )}
    </PixelFrame>
  );
}
