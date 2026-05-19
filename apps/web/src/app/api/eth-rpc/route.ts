export async function POST(req: Request) {
  const body = await req.text();
  const res = await fetch("https://rpc.ankr.com/eth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await res.text();
  return new Response(data, {
    headers: { "Content-Type": "application/json" },
  });
}
