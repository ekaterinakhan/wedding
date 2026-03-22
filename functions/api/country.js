export async function onRequest(context) {
  const country = context.request.headers.get("CF-IPCountry") || "XX";
  return new Response(JSON.stringify({ country }), {
    headers: { "Content-Type": "application/json" },
  });
}
