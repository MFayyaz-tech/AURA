// Netlify function that returns the Stripe publishable key (safe to expose)
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

exports.handler = async (event) => {
  const origin = process.env.SITE_URL || process.env.BASEURL || "*";
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
  };
  if (!publishableKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Publishable key not configured on server",
      }),
    };
  }
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ publishableKey }),
  };
};
