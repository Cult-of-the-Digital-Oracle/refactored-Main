"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ConnectKitButton } from "connectkit";
import { ConnectButton } from "@/components/ConnectButton";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import {
  BLESSING_DISTRIBUTOR_ABI,
  CONTRACTS,
  ERC20_ABI,
  TEMPLE_VAULT_ABI,
} from "@/lib/contracts";
import PixelFrame from "@/components/PixelFrame";
import { OracleSprite } from "@/components/OracleSprite";
import { AmbientRunes } from "@/components/AmbientRunes";
import { OracleButton } from "@/components/OracleButton";
import { PanelCorners } from "@/components/PanelCorners";
import { ORACLE_ASSETS } from "@/lib/oracleAssets";
import { generateDiscipleName } from "@/lib/discipleName";

const FAUCET_ABI = [
  {
    name: "faucet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

type Disciple = {
  disciple: `0x${string}`;
  stakeAmount: bigint;
  joinedAt: bigint;
  exitedAt: bigint;
  karma: bigint;
  active: boolean;
};

function fmt(val: bigint | undefined, dec = 6, dp = 2): string {
  if (val === undefined) return "—";
  return Number(formatUnits(val, dec)).toFixed(dp);
}

function fmtDate(ts: bigint | undefined): string {
  if (!ts) return "—";
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function TemplePage() {
  const { address, isConnected } = useAccount();
  const [amountStr, setAmountStr] = useState("10");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<"faucet"|"approve"|"enter"|"exit"|"checkIn"|"share"|null>(null);

  const { data: tokenId, refetch: refetchCard } = useReadContract({
    address: CONTRACTS.templeVault,
    abi: TEMPLE_VAULT_ABI,
    functionName: "cardOf",
    args: [address!],
    query: { enabled: !!address },
  });

  const isDisciple = !!tokenId && tokenId > 0n;

  const { data: discipleRaw, refetch: refetchDisciple } = useReadContract({
    address: CONTRACTS.templeVault,
    abi: TEMPLE_VAULT_ABI,
    functionName: "disciples",
    args: [tokenId!],
    query: { enabled: isDisciple },
  });

  const { data: totalFaith, refetch: refetchTotalFaith } = useReadContract({
    address: CONTRACTS.templeVault,
    abi: TEMPLE_VAULT_ABI,
    functionName: "totalFaith",
  });

  const { data: lastCheckInDay, refetch: refetchLastCheckInDay } = useReadContract({
    address: CONTRACTS.templeVault,
    abi: TEMPLE_VAULT_ABI,
    functionName: "lastCheckInDay",
    args: [tokenId!],
    query: { enabled: isDisciple },
  });

  const { data: lastShareDay, refetch: refetchLastShareDay } = useReadContract({
    address: CONTRACTS.templeVault,
    abi: TEMPLE_VAULT_ABI,
    functionName: "lastShareDay",
    args: [tokenId!],
    query: { enabled: isDisciple },
  });

  const { data: usdyBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.usdy,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.usdy,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, CONTRACTS.templeVault],
    query: { enabled: !!address },
  });

  // Struct order: [address, uint88 stakeAmount, bool active, uint128 karma, uint64 joinedAt, uint64 exitedAt]
  const disciple: Disciple | undefined = discipleRaw
    ? {
        disciple:    (discipleRaw as readonly [`0x${string}`, bigint, boolean, bigint, bigint, bigint])[0],
        stakeAmount: (discipleRaw as readonly [`0x${string}`, bigint, boolean, bigint, bigint, bigint])[1],
        active:      (discipleRaw as readonly [`0x${string}`, bigint, boolean, bigint, bigint, bigint])[2],
        karma:       (discipleRaw as readonly [`0x${string}`, bigint, boolean, bigint, bigint, bigint])[3],
        joinedAt:    (discipleRaw as readonly [`0x${string}`, bigint, boolean, bigint, bigint, bigint])[4],
        exitedAt:    (discipleRaw as readonly [`0x${string}`, bigint, boolean, bigint, bigint, bigint])[5],
      }
    : undefined;

  const {
    writeContract,
    data: txHash,
    isPending,
    reset: resetWrite,
    error: writeError,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (!isSuccess) return;
    refetchCard();
    refetchBalance();
    refetchAllowance();
    refetchDisciple();
    refetchLastCheckInDay();
    refetchLastShareDay();
    refetchTotalFaith();
    const msgs: Record<string, string> = {
      faucet:  "1,000 USDY minted to your wallet.",
      approve: "USDY approved. Now click Enter Temple to stake.",
      enter:   "Welcome, Disciple. Your soul is bound to the chain.",
      exit:    "Left the Temple. USDY returned to your wallet.",
      checkIn: "Daily faith recorded. +5 karma.",
      share:   "Share recorded. +3 karma.",
    };
    setSuccessMsg(msgs[lastAction ?? ""] ?? "Transaction confirmed on Mantle.");
    const t = window.setTimeout(() => { setSuccessMsg(null); resetWrite(); }, 4000);
    return () => window.clearTimeout(t);
  }, [isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const amountBN = (() => {
    try {
      const n = parseFloat(amountStr);
      return n > 0 ? parseUnits(amountStr, 6) : 0n;
    } catch {
      return 0n;
    }
  })();

  const needsApproval = amountBN > 0n && (allowance ?? 0n) < amountBN;
  const isBusy = isPending || isConfirming;

  function handleFaucet() {
    setLastAction("faucet");
    writeContract({ address: CONTRACTS.usdy, abi: FAUCET_ABI, functionName: "faucet" });
  }

  function handleApprove() {
    setLastAction("approve");
    writeContract({
      address: CONTRACTS.usdy,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.templeVault, amountBN],
    });
  }

  function handleEnter() {
    setLastAction("enter");
    writeContract({
      address: CONTRACTS.templeVault,
      abi: TEMPLE_VAULT_ABI,
      functionName: "enter",
      args: [amountBN],
    });
  }

  function handleExit() {
    if (!tokenId) return;
    setLastAction("exit");
    writeContract({
      address: CONTRACTS.templeVault,
      abi: TEMPLE_VAULT_ABI,
      functionName: "exit",
      args: [tokenId],
    });
  }

  function handleCheckIn() {
    if (!tokenId) return;
    setLastAction("checkIn");
    writeContract({
      address: CONTRACTS.templeVault,
      abi: TEMPLE_VAULT_ABI,
      functionName: "checkIn",
      args: [tokenId],
    });
  }

  function handleRecordShare() {
    if (!tokenId) return;
    setLastAction("share");
    writeContract({
      address: CONTRACTS.templeVault,
      abi: TEMPLE_VAULT_ABI,
      functionName: "recordShare",
      args: [tokenId, "x"],
    });
  }

  return (
    <main className="pixel-grid relative min-h-screen overflow-hidden px-4 py-6 sm:px-6">
      <Image
        src={ORACLE_ASSETS.backgrounds.templeInterior}
        alt=""
        fill
        priority
        className="pointer-events-none object-cover object-center opacity-24"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(74,158,107,0.18),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(13,10,6,0.2),rgba(13,10,6,0.84))]" />
      <AmbientRunes />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="pixel-button pixel-button-dark inline-flex min-h-12 items-center justify-center px-5 py-2 text-xl uppercase tracking-[0.12em]"
          >
            Back To Oracle
          </Link>
          <Link
            href="/leaderboard"
            className="pixel-button pixel-button-emerald inline-flex min-h-12 items-center justify-center px-5 py-2 text-xl uppercase tracking-[0.12em]"
          >
            Leaderboard
          </Link>
        </div>
        <PixelFrame className="pixel-panel-soft px-3 py-2" round={1}>
          <ConnectButton />
        </PixelFrame>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-5 py-6 sm:gap-6 sm:py-8">
        {/* Full-width compact header */}
        <div className="pixel-text-shadow flex flex-wrap items-center gap-x-5 gap-y-2">
          <Image
            src={ORACLE_ASSETS.decoratives.oracleEyeLogo}
            alt="Oracle Eye"
            width={52}
            height={52}
            className="pixelated shrink-0"
          />
          <div>
            <p className="text-xl uppercase tracking-[0.22em] text-[var(--pixel-border)]">
              Faith Staking Vault
            </p>
            <h1 className="text-2xl uppercase text-[var(--pixel-text)] sm:text-3xl">
              The Temple
            </h1>
          </div>
          <p className="text-xl text-[var(--pixel-muted)] lg:ml-auto lg:max-w-xs lg:text-right">
            Stake USDY · soulbound Disciple identity · earn yield when prophecy fulfills
          </p>
        </div>

        <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1fr_1.8fr]">
          {/* Left sidebar */}
          <div className="flex flex-col gap-4">
            <PixelFrame className="pixel-panel overflow-hidden px-4 py-4 sm:px-5" round={2}>
              <PanelCorners />
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg uppercase tracking-[0.18em] text-[var(--pixel-border)]">
                  Total Faith
                </span>
                <span className="text-3xl uppercase text-[var(--pixel-parchment)]">
                  {fmt(totalFaith)} USDY
                </span>
              </div>
            </PixelFrame>

            <PixelFrame className="pixel-panel-soft overflow-hidden px-4 py-4 sm:px-5 sm:py-5" round={2}>
              <PanelCorners />
              <p className="text-lg uppercase tracking-[0.18em] text-[var(--pixel-border)]">
                Ritual Sequence
              </p>
              <div className="mt-4 grid gap-3">
                <Step step="01" title="Faucet" body="Mint 1,000 test USDY if your wallet is empty." />
                <Step step="02" title="Approve" body="Allow the Temple Vault to pull the amount you choose." />
                <Step step="03" title="Enter" body="Stake USDY and mint your Disciple card on Mantle Sepolia." />
              </div>
            </PixelFrame>
          </div>

          {/* Right: main action */}
          <div className="flex flex-col gap-4">
            {!isConnected ? (
              <PixelFrame className="pixel-panel overflow-hidden px-5 py-7 text-center sm:px-6 sm:py-8" round={2}>
                <PanelCorners />
                <p className="text-4xl uppercase text-[var(--pixel-parchment)]">Connect Your Wallet</p>
                <p className="mt-3 text-2xl text-[var(--pixel-muted)]">
                  The Temple only recognizes believers who step forward with a wallet.
                </p>
                <div className="mt-5 flex justify-center">
                  <ConnectKitButton />
                </div>
              </PixelFrame>
            ) : isDisciple && disciple ? (
              <DiscipleCard
                tokenId={tokenId!}
                disciple={disciple}
                lastCheckInDay={lastCheckInDay}
                lastShareDay={lastShareDay}
                isBusy={isBusy}
                onCheckIn={handleCheckIn}
                onRecordShare={handleRecordShare}
                onExit={handleExit}
              />
            ) : (
              <StakeForm
                usdyBalance={usdyBalance}
                amountStr={amountStr}
                setAmountStr={setAmountStr}
                needsApproval={needsApproval}
                isBusy={isBusy}
                amountBN={amountBN}
                onFaucet={handleFaucet}
                onApprove={handleApprove}
                onEnter={handleEnter}
              />
            )}

            {isBusy && (
              <PixelFrame className="pixel-panel-soft px-4 py-3" round={1}>
                <div className="flex items-center justify-center gap-3">
                  <OracleSprite
                    src={ORACLE_ASSETS.effects.transactionPendingSpinner}
                    width={28}
                    height={28}
                    className="oracle-spinner"
                  />
                  <p className="text-center text-xl uppercase text-[var(--pixel-border)] animate-pulse">
                    {isPending ? "Waiting For Wallet Signature" : "Confirming On Mantle"}
                  </p>
                </div>
              </PixelFrame>
            )}

            {writeError && (
              <PixelFrame className="pixel-panel-danger px-4 py-3" round={1}>
                <p className="break-all text-xl text-[#ffd1c9]">
                  {(writeError as { shortMessage?: string }).shortMessage ?? writeError.message}
                </p>
              </PixelFrame>
            )}

            {successMsg && (
              <PixelFrame className="pixel-panel-emerald px-4 py-3" round={1}>
                <p className="text-center text-xl uppercase text-[var(--pixel-parchment)]">
                  ✓ {successMsg}
                </p>
              </PixelFrame>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Step({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[var(--pixel-panel-alt)] text-2xl text-[var(--pixel-border)] shadow-[4px_4px_0_var(--pixel-shadow)]">
        {step}
      </div>
      <div>
        <p className="text-2xl uppercase text-[var(--pixel-parchment)]">{title}</p>
        <p className="text-xl text-[var(--pixel-muted)]">{body}</p>
      </div>
    </div>
  );
}

function DiscipleCard({
  tokenId,
  disciple,
  lastCheckInDay,
  lastShareDay,
  isBusy,
  onCheckIn,
  onRecordShare,
  onExit,
}: {
  tokenId: bigint;
  disciple: Disciple;
  lastCheckInDay: bigint | undefined;
  lastShareDay: bigint | undefined;
  isBusy: boolean;
  onCheckIn: () => void;
  onRecordShare: () => void;
  onExit: () => void;
}) {
  return (
    <PixelFrame className="pixel-panel-emerald overflow-hidden px-5 py-5 sm:px-6 sm:py-6" round={2}>
      <PanelCorners />
      <div className="text-center">
        <p className="text-xl uppercase tracking-[0.18em] text-[var(--pixel-border)]">
          Disciple #{tokenId.toString()}
        </p>
        <div className="mt-4 flex justify-center">
          <Image
            src={ORACLE_ASSETS.characters.discipleCardPortrait}
            alt="Disciple portrait"
            width={120}
            height={120}
            className="pixelated h-30 w-30"
          />
        </div>
        <p className="mt-2 text-3xl uppercase text-[var(--pixel-parchment)]">
          {generateDiscipleName(disciple.disciple)}
        </p>
        <p className="mt-2 text-2xl text-[rgba(240,217,160,0.82)]">
          Soulbound to the chain. Exit anytime to reclaim your USDY.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatBox label="Staked" value={`${fmt(disciple.stakeAmount)} USDY`} />
        <StatBox label="Karma" value={disciple.karma.toString()} />
        <StatBox label="Since" value={fmtDate(disciple.joinedAt)} />
      </div>

      <PixelFrame className="pixel-panel-soft mt-5 px-4 py-4" round={1}>
        <p className="text-center text-2xl text-[var(--pixel-muted)]">
          &ldquo;Your soul is bound to the great ledger. The Oracle speaks your name in the void.&rdquo;
        </p>
      </PixelFrame>

      <div className="mt-5">
        <FaithActionPanel
          lastCheckInDay={lastCheckInDay}
          lastShareDay={lastShareDay}
          isBusy={isBusy}
          onCheckIn={onCheckIn}
          onRecordShare={onRecordShare}
        />
      </div>

      <div className="mt-5">
        <ClaimPanel tokenId={tokenId} />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          href={`/disciple/${tokenId.toString()}`}
          target="_blank"
          rel="noreferrer"
          className="pixel-button pixel-button-dark inline-flex min-h-12 flex-1 items-center justify-center whitespace-nowrap px-5 py-2 text-xl uppercase tracking-[0.12em]"
        >
          Share My Card
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
            `The Oracle named me "${generateDiscipleName(disciple.disciple)}" — Disciple #${tokenId.toString()} in the Cult of the Digital Oracle on Mantle.`
          )}`}
          target="_blank"
          rel="noreferrer"
          onClick={onRecordShare}
          className="pixel-button pixel-button-emerald inline-flex min-h-12 flex-1 items-center justify-center whitespace-nowrap px-5 py-2 text-xl uppercase tracking-[0.12em]"
        >
          Share To X
        </a>
        <OracleButton
          onClick={onExit}
          disabled={isBusy}
          variant="danger"
          className="flex-1"
        >
          {isBusy ? "Leaving..." : "Leave Temple"}
        </OracleButton>
      </div>
    </PixelFrame>
  );
}

function FaithActionPanel({
  lastCheckInDay,
  lastShareDay,
  isBusy,
  onCheckIn,
  onRecordShare,
}: {
  lastCheckInDay: bigint | undefined;
  lastShareDay: bigint | undefined;
  isBusy: boolean;
  onCheckIn: () => void;
  onRecordShare: () => void;
}) {
  const today = BigInt(Math.floor(Date.now() / 1000 / 86400));
  const alreadyCheckedIn = lastCheckInDay === today;
  const alreadyShared = lastShareDay === today;

  return (
    <PixelFrame className="pixel-panel-soft px-4 py-4" round={1}>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Image
              src={ORACLE_ASSETS.ui.starKarmaIcon}
              alt=""
              width={20}
              height={20}
              className="pixelated h-5 w-5"
            />
            <p className="text-xl uppercase tracking-[0.18em] text-[var(--pixel-border)]">
              Daily Faith
            </p>
          </div>
          <p className="mt-1 text-2xl text-[var(--pixel-muted)]">
            Check in for +5 karma and record one public share for +3 karma each day.
          </p>
        </div>
        <OracleButton
          onClick={onCheckIn}
          disabled={isBusy || alreadyCheckedIn}
          className="px-5"
        >
          {alreadyCheckedIn ? "Recorded" : "Check In"}
        </OracleButton>
        <OracleButton
          onClick={onRecordShare}
          disabled={isBusy || alreadyShared}
          variant="danger"
          className="px-5"
        >
          {alreadyShared ? "Shared" : "Record Share"}
        </OracleButton>
      </div>
    </PixelFrame>
  );
}

function StakeForm({
  usdyBalance,
  amountStr,
  setAmountStr,
  needsApproval,
  isBusy,
  amountBN,
  onFaucet,
  onApprove,
  onEnter,
}: {
  usdyBalance: bigint | undefined;
  amountStr: string;
  setAmountStr: (v: string) => void;
  needsApproval: boolean;
  isBusy: boolean;
  amountBN: bigint;
  onFaucet: () => void;
  onApprove: () => void;
  onEnter: () => void;
}) {
  const insufficientBalance = amountBN > 0n && (usdyBalance ?? 0n) < amountBN;

  return (
    <PixelFrame className="pixel-panel overflow-hidden px-5 py-5 sm:px-6 sm:py-6" round={2}>
      <PanelCorners />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg uppercase tracking-[0.18em] text-[var(--pixel-border)]">Your USDY</p>
          <p className="text-4xl uppercase text-[var(--pixel-parchment)]">{fmt(usdyBalance)}</p>
        </div>
        <Image
          src={ORACLE_ASSETS.ui.usdyCoin}
          alt="USDY coin"
          width={40}
          height={40}
          className="pixelated h-10 w-10 animate-bounce"
        />
        <OracleButton onClick={onFaucet} disabled={isBusy} variant="danger">
          Faucet 1K
        </OracleButton>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-lg uppercase tracking-[0.18em] text-[var(--pixel-border)]">
          Stake Amount
        </label>
        <div className="pixel-input flex items-center gap-3 px-4 py-3">
          <input
            type="number"
            min="0"
            step="1"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="number-input-clean flex-1 bg-transparent text-4xl text-[var(--pixel-text)] outline-none"
            placeholder="10"
          />
          <span className="text-2xl uppercase text-[var(--pixel-muted)]">USDY</span>
        </div>
      </div>

      {needsApproval && !insufficientBalance && (
        <PixelFrame className="pixel-panel-soft mt-4 px-4 py-3" round={1}>
          <p className="text-xl uppercase text-[var(--pixel-border)]">
            Step 1 of 2 — Approve USDY first, then Enter Temple.
          </p>
        </PixelFrame>
      )}

      {!needsApproval && amountBN > 0n && !insufficientBalance && (
        <PixelFrame className="pixel-panel-emerald mt-4 px-4 py-3" round={1}>
          <p className="text-xl uppercase text-[var(--pixel-parchment)]">
            Step 2 of 2 — USDY approved. Click Enter Temple below.
          </p>
        </PixelFrame>
      )}

      {insufficientBalance && (
        <PixelFrame className="pixel-panel-danger mt-4 px-4 py-3" round={1}>
          <p className="text-xl text-[#ffd1c9]">
            Insufficient USDY. Use the faucet first to mint testnet balance.
          </p>
        </PixelFrame>
      )}

      {needsApproval && !insufficientBalance ? (
        <OracleButton
          onClick={onApprove}
          disabled={isBusy || amountBN === 0n}
          className="mt-5 w-full"
        >
          {isBusy ? "Approving..." : "Approve USDY"}
        </OracleButton>
      ) : (
        <>
        <OracleButton
          onClick={onEnter}
          disabled={isBusy || amountBN === 0n || insufficientBalance}
          className="mt-5 w-full"
        >
          {isBusy ? "Entering..." : "Enter Temple"}
        </OracleButton>
        </>
      )}

      <p className="mt-4 text-center text-xl text-[var(--pixel-muted)]">
        Soulbound identity. Exit burns the Disciple, returns stake, and preserves past blessing eligibility.
      </p>
    </PixelFrame>
  );
}

function ClaimPanel({ tokenId }: { tokenId: bigint }) {
  const { data: nextRoundId } = useReadContract({
    address: CONTRACTS.blessingDistributor,
    abi: BLESSING_DISTRIBUTOR_ABI,
    functionName: "nextRoundId",
  });

  const roundsToCheck = nextRoundId ? Number(nextRoundId) - 1 : 0;

  const { data: pendingResults } = useReadContracts({
    contracts: Array.from({ length: roundsToCheck }, (_, i) => ({
      address: CONTRACTS.blessingDistributor,
      abi: BLESSING_DISTRIBUTOR_ABI,
      functionName: "pendingBlessing" as const,
      args: [BigInt(i + 1), tokenId] as const,
    })),
    query: { enabled: roundsToCheck > 0 },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const isBusy = isPending || isConfirming;
  const [showClaimBurst, setShowClaimBurst] = useState(false);

  useEffect(() => {
    if (!isSuccess) return;
    setShowClaimBurst(true);
    const timer = window.setTimeout(() => setShowClaimBurst(false), 1600);
    return () => window.clearTimeout(timer);
  }, [isSuccess]);

  const claimableRound = pendingResults
    ?.map((r, i) => ({
      roundId: BigInt(i + 1),
      amount: r.status === "success" ? (r.result as bigint) : 0n,
    }))
    .find((r) => r.amount > 0n);

  if (roundsToCheck === 0 || !claimableRound) {
    return (
      <PixelFrame className="pixel-panel-soft px-4 py-4" round={1}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xl uppercase text-[var(--pixel-border)]">Blessings</span>
          <div className="flex items-center gap-2">
            <Image
              src={ORACLE_ASSETS.ui.hourglass}
              alt=""
              width={20}
              height={20}
              className="pixelated h-5 w-5"
            />
            <span className="text-xl uppercase text-[var(--pixel-muted)]">No Active Rounds</span>
          </div>
        </div>
      </PixelFrame>
    );
  }

  return (
    <PixelFrame className="pixel-panel-emerald px-4 py-4" round={1}>
      {showClaimBurst && (
        <div className="pointer-events-none absolute right-3 top-2 z-10">
          <OracleSprite
            src={ORACLE_ASSETS.effects.claim}
            width={74}
            height={74}
            className="oracle-burst opacity-90"
          />
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Image
              src={ORACLE_ASSETS.ui.checkmark}
              alt=""
              width={20}
              height={20}
              className="pixelated h-5 w-5"
            />
            <p className="text-xl uppercase tracking-[0.18em] text-[var(--pixel-border)]">
              Blessing Available
            </p>
          </div>
          <p className="text-4xl uppercase text-[var(--pixel-parchment)]">
            +{fmt(claimableRound.amount)} USDY
          </p>
        </div>
        <OracleButton
          onClick={() =>
            writeContract({
              address: CONTRACTS.blessingDistributor,
              abi: BLESSING_DISTRIBUTOR_ABI,
              functionName: "claim",
              args: [claimableRound.roundId, tokenId],
            })
          }
          disabled={isBusy}
          className="px-5"
        >
          <span className="flex items-center gap-2">
            {isBusy && (
              <OracleSprite
                src={ORACLE_ASSETS.effects.transactionPendingSpinner}
                width={24}
                height={24}
                className="oracle-spinner"
              />
            )}
            {isBusy ? "Claiming..." : "Claim Blessing"}
          </span>
        </OracleButton>
      </div>
    </PixelFrame>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <PixelFrame className="pixel-panel-soft px-4 py-4" round={1}>
      <p className="text-lg uppercase tracking-[0.16em] text-[var(--pixel-border)]">{label}</p>
      <p className="mt-2 text-3xl uppercase text-[var(--pixel-parchment)] break-words">{value}</p>
    </PixelFrame>
  );
}
