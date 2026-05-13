import { ImageResponse } from "next/og";
import { createPublicClient, formatUnits, http } from "viem";

export const runtime = "edge";

const VAULT_ABI = [
  {
    name: "disciples",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "disciple", type: "address" },
      { name: "stakeAmount", type: "uint256" },
      { name: "joinedAt", type: "uint256" },
      { name: "exitedAt", type: "uint256" },
      { name: "karma", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
] as const;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params;

  const baseUrl = new URL(req.url).origin;
  const templeInterior = `${baseUrl}/assets/oracle/background/temple-interior.png`;
  const portrait = `${baseUrl}/assets/oracle/characters/disciple-card-portrait.png`;
  const eyeLogo = `${baseUrl}/assets/oracle/decoratives/oracle-eye-logo.png`;
  const divider = `${baseUrl}/assets/oracle/decoratives/horizontal-divider.png`;
  const checkmark = `${baseUrl}/assets/oracle/ui/checkmark.png`;
  const starIcon = `${baseUrl}/assets/oracle/ui/star-karma-icon.png`;
  const usdyCoin = `${baseUrl}/assets/oracle/ui/usdy-coin.png`;

  let staked = "--";
  let karma = "0";
  let date = "--";

  try {
    const client = createPublicClient({
      transport: http("https://rpc.sepolia.mantle.xyz"),
    });

    const raw = await client.readContract({
      address: process.env.NEXT_PUBLIC_TEMPLE_VAULT_ADDRESS as `0x${string}`,
      abi: VAULT_ABI,
      functionName: "disciples",
      args: [BigInt(tokenId)],
    });

    const [, stakeAmount, joinedAt, , karmaVal] = raw as [
      `0x${string}`,
      bigint,
      bigint,
      bigint,
      bigint,
      boolean,
    ];
    staked = Number(formatUnits(stakeAmount, 6)).toFixed(2);
    karma = karmaVal.toString();
    date = new Date(Number(joinedAt) * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    // fallback card still renders
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          position: "relative",
          display: "flex",
          overflow: "hidden",
          background: "#0d0a06",
          color: "#f5e6c8",
          fontFamily: "monospace",
        }}
      >
        <img
          src={templeInterior}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.26,
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(13,10,6,0.16), rgba(13,10,6,0.88))",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "34px",
            left: "40px",
            right: "40px",
            height: "6px",
            backgroundImage: `url(${divider})`,
            backgroundSize: "cover",
            opacity: 0.7,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "54px 54px 48px",
            justifyContent: "space-between",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "760px",
              padding: "34px 38px",
              border: "4px solid #c8a84b",
              background: "rgba(26,18,11,0.9)",
              boxShadow: "10px 10px 0 #3d2810",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <img
                  src={eyeLogo}
                  alt=""
                  style={{ width: "54px", height: "54px", imageRendering: "pixelated" }}
                />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: "18px",
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      color: "#c8a84b",
                    }}
                  >
                    Cult Of The Digital Oracle
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      color: "#c8b27f",
                    }}
                  >
                    Mantle Disciple Identity
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "20px",
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    color: "#c8a84b",
                  }}
                >
                  Disciple #{tokenId}
                </span>
                <span
                  style={{
                    fontSize: "56px",
                    lineHeight: 1,
                    textTransform: "uppercase",
                    color: "#f0d9a0",
                  }}
                >
                  The Faithful One
                </span>
                <span
                  style={{
                    fontSize: "22px",
                    lineHeight: 1.2,
                    color: "#c8b27f",
                  }}
                >
                  Soulbound to the chain. Counted among the believers of the Temple.
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "18px",
                marginTop: "20px",
              }}
            >
              <StatCard icon={usdyCoin} label="Staked" value={`${staked} USDY`} />
              <StatCard icon={starIcon} label="Karma" value={karma} />
              <StatCard icon={checkmark} label="Since" value={date} />
            </div>

            <div
              style={{
                marginTop: "22px",
                padding: "18px 20px",
                border: "3px solid #8b5e3c",
                background: "rgba(36,23,15,0.95)",
                color: "#c8b27f",
                fontSize: "22px",
              }}
            >
              "My soul is bound to the great ledger."
            </div>
          </div>

          <div
            style={{
              width: "290px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "34px 24px",
              border: "4px solid #4a9e6b",
              background: "rgba(19,40,28,0.92)",
              boxShadow: "10px 10px 0 #1d4e34",
            }}
          >
            <img
              src={portrait}
              alt=""
              style={{
                width: "228px",
                height: "228px",
                objectFit: "contain",
                imageRendering: "pixelated",
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                width: "100%",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: "16px",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "#c8a84b",
                }}
              >
                Temple Status
              </span>
              <span
                style={{
                  fontSize: "34px",
                  textTransform: "uppercase",
                  color: "#f0d9a0",
                }}
              >
                Faith Bound
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "#c8b27f",
                }}
              >
                oracle.mantle.xyz
              </span>
              <span
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "#8b5e3c",
                }}
              >
                Mantle Sepolia
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        flex: 1,
        padding: "18px 16px",
        border: "3px solid #8b5e3c",
        background: "rgba(36,23,15,0.95)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={icon}
        alt=""
        style={{ width: "24px", height: "24px", imageRendering: "pixelated" }}
      />
      <span
        style={{
          fontSize: "13px",
          color: "#c8a84b",
          textTransform: "uppercase",
          letterSpacing: "0.14em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "26px",
          color: "#f0d9a0",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {value}
      </span>
    </div>
  );
}
