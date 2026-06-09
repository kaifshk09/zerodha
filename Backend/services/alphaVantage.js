const fetch = (...args) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args));

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing in Backend/.env`);
  return v;
}

async function getGlobalQuote(symbol) {
  const apiKey = requireEnv('ALPHA_VANTAGE_API_KEY');
  const sym = String(symbol || '').trim().toUpperCase();
  if (!sym) throw new Error('symbol is required');

  // Alpha Vantage: GLOBAL_QUOTE
  // https://www.alphavantage.co/documentation/#latestprice
  const url =
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AlphaVantage request failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const quote = json?.['Global Quote'];
  if (!quote || Object.keys(quote).length === 0) {
    // Alpha Vantage returns different formats on error/throttling.
    return null;
  }

  const priceStr = quote['05. price'];
  const changePercentStr = quote['10. change percent'];

  const price = Number(priceStr);
  const changePercent = String(changePercentStr || '').trim();

  if (!Number.isFinite(price)) return null;

  return {
    symbol: sym,
    price,
    changePercent,
  };
}

module.exports = {
  getGlobalQuote,
};

