export default async function handler(req, res) {
  const sessionId = String(req.query.session_id || "");
  if (!sessionId.startsWith("cs_")) {
    res.status(400).json({ paid: false });
    return;
  }
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_atelierpro_SECRET_KEY;
  if (!key) {
    res.status(503).json({ paid: false, reason: "stripe-key-missing" });
    return;
  }
  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(sessionId), {
    headers: { Authorization: "Bearer " + key }
  });
  if (!stripeRes.ok) {
    res.status(402).json({ paid: false });
    return;
  }
  const session = await stripeRes.json();
  if (session.metadata && session.metadata.app && session.metadata.app !== "atelierkit") {
    res.status(403).json({ paid: false, reason: "wrong_app" });
    return;
  }
  const paid = (session.payment_status === "paid" || session.payment_status === "no_payment_required") && session.status === "complete";
  res.status(paid ? 200 : 402).json({ paid });
}
