const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error("Missing STRIPE_SECRET_KEY in Netlify environment settings.");
}

let stripe = null;
try {
  stripe = require("stripe")(stripeSecretKey);
} catch (err) {
  console.error("Stripe initialization failed:", err.message);
}

const jsonResponse = (statusCode, bodyObj, origin = "*") => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  },
  body: JSON.stringify(bodyObj),
});

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    const origin = process.env.SITE_URL || process.env.URL || "*";
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method Not Allowed" });
  }

  if (!stripe) {
    return jsonResponse(500, {
      error: "Stripe not initialized. Add STRIPE_SECRET_KEY to Netlify",
    });
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    console.error("Failed to parse JSON body:", err.message);
    return jsonResponse(400, { error: "Invalid JSON", details: err.message });
  }

  const { lineItems, customerEmail, metadata } = body;

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return jsonResponse(400, {
      error: "lineItems must be a non-empty array",
    });
  }

  const siteUrl =
    process.env.SITE_URL ||
    process.env.URL ||
    process.env.FRONTEND_URL ||
    event.headers.origin ||
    "*";

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      customer_email: customerEmail,
      metadata,
      success_url: `${siteUrl}/?success=true`,
      cancel_url: `${siteUrl}/?canceled=true`,
      allow_promotion_codes: true,
    });
    console.log("Created checkout session:", session.id);

    return jsonResponse(
      200,
      { id: session.id, livemode: session.livemode },
      siteUrl
    );
  } catch (err) {
    console.error("Stripe error:", err.message);
    return jsonResponse(500, {
      error: "Failed to create checkout session",
      details: err.message,
    });
  }
};
