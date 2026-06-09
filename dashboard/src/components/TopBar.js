import React, { useCallback, useEffect, useState } from "react";
import api from "../api";
import Menu from "./Menu";

const TopBar = () => {
  const [symbol, setSymbol] = useState("AAPL");
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchQuote = useCallback(async (lookup) => {
    const nextSymbol = String(lookup || symbol || "").trim().toUpperCase();
    if (!nextSymbol) {
      setMessage("Enter a symbol first.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await api.get(`/api/quote/${encodeURIComponent(nextSymbol)}`);
      setQuote(response.data);
    } catch (err) {
      setQuote(null);
      setMessage(err.response?.data?.error || "Unable to load quote.");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchQuote("AAPL");
  }, [fetchQuote]);

  return (
    <div className="topbar-container">
      <div className="indices-container">
        <div className="market-widget">
          <p className="index">Live quote</p>
          <div className="live-quote">
            <div>
              <p className="quote-symbol">{quote?.symbol || symbol}</p>
              <p className="quote-price">{quote?.price ? quote.price.toFixed(2) : "--"}</p>
            </div>
            <div className={`quote-change ${quote?.changePercent && quote.changePercent.startsWith("-") ? "negative" : "positive"}`}>
              {quote?.changePercent ? `${quote.changePercent}` : loading ? "Loading..." : ""}
            </div>
          </div>
          <div className="market-search">
            <input
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              placeholder="Symbol e.g. AAPL"
            />
            <button type="button" onClick={() => fetchQuote(symbol)} disabled={loading}>
              Go
            </button>
          </div>
          {message && <p className="status-message">{message}</p>}
        </div>
      </div>

      <Menu />
    </div>
  );
};

export default TopBar;
