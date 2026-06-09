import React, { useEffect, useState } from "react";
import { Tooltip, Grow } from "@mui/material";
import {
  BarChartOutlined,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from "@mui/icons-material";
import api from "../api";
import { DoughnutChart } from "./DoughnoutChart";

const apiBase = process.env.REACT_APP_API_URL || "";

const WatchList = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [symbol, setSymbol] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        const response = await api.get("/api/watchlist");
        setWatchlist(response.data);
      } catch (err) {
        console.error("Failed to load watchlist", err);
      }
    };

    fetchWatchlist();

    const token = localStorage.getItem("authToken");
    if (!token) return undefined;

    const source = new EventSource(`${apiBase}/api/events?token=${token}`);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setWatchlist(data.watchlist || []);
      } catch (err) {
        console.error("Failed to parse watchlist event", err);
      }
    };
    source.onerror = () => source.close();

    return () => source.close();
  }, []);

  const handleAdd = async (event) => {
    event.preventDefault();
    const trimmedSymbol = symbol.trim().toUpperCase();
    const parsedTarget = Number(targetPrice);

    if (!trimmedSymbol) {
      setError("Enter a stock symbol.");
      return;
    }

    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setError("Enter a valid target price greater than zero.");
      return;
    }

    try {
      const response = await api.post("/api/watchlist", {
        symbol: trimmedSymbol,
        name: trimmedSymbol,
        lastPrice: 0,
        targetPrice: parsedTarget,
      });
      setWatchlist((current) => [response.data, ...current]);
      setSymbol("");
      setTargetPrice("");
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to add item.");
    }
  };

  const handleRemove = async (id) => {
    try {
      await api.delete(`/api/watchlist/${id}`);
      setWatchlist((current) => current.filter((item) => item._id !== id));
    } catch (err) {
      console.error("Failed to remove watchlist item", err);
    }
  };

  const labels = watchlist.map((item) => item.symbol || item.name);
  const data = {
    labels,
    datasets: [
      {
        label: "Watchlist value",
        data: watchlist.map((item) => item.lastPrice || 0),
        backgroundColor: [
          "rgba(255, 99, 132, 0.5)",
          "rgba(54, 162, 235, 0.5)",
          "rgba(255, 206, 86, 0.5)",
          "rgba(75, 192, 192, 0.5)",
          "rgba(153, 102, 255, 0.5)",
          "rgba(255, 159, 64, 0.5)",
        ],
      },
    ],
  };

  return (
    <div className="watchlist-container">
      <div className="search-container">
        <form className="watchlist-form" onSubmit={handleAdd} aria-label="Add to watchlist">
          <input
            name="symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Symbol (e.g. INFY)"
            className="search"
            aria-label="Stock symbol"
            maxLength={10}
            pattern="[A-Za-z0-9.\-]{1,10}"
            required
            autoFocus
          />
          <input
            name="targetPrice"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder="Target price (₹)"
            className="search"
            aria-label="Target price"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
          />
          <button
            className="btn btn-blue"
            type="submit"
            disabled={watchlist.length >= 50}
            title={watchlist.length >= 50 ? "Watchlist full (50)" : "Add to watchlist"}
          >
            {watchlist.length >= 50 ? "Full" : "Add"}
          </button>
        </form>
        <span className="counts">{watchlist.length} / 50</span>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <ul className="list">
        {watchlist.map((stock) => (
          <WatchListItem key={stock._id} stock={stock} onRemove={handleRemove} />
        ))}
      </ul>

      <DoughnutChart data={data} />
    </div>
  );
};

export default WatchList;

const WatchListItem = ({ stock, onRemove }) => {
  const [showWatchlistActions, setShowWatchlistActions] = useState(false);

  const handleMouseEnter = () => setShowWatchlistActions(true);
  const handleMouseLeave = () => setShowWatchlistActions(false);

  return (
    <li onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="item">
        <p className={stock.lastPrice >= 0 ? "up" : "down"}>{stock.symbol || stock.name}</p>
        <div className="item-info">
          <span className="percent">Target ₹{stock.targetPrice?.toFixed?.(2) ?? "-"}</span>
          {stock.lastPrice >= 0 ? (
            <KeyboardArrowUp className="up" />
          ) : (
            <KeyboardArrowDown className="down" />
          )}
          <span className="price">Last ₹{stock.lastPrice?.toFixed?.(2) ?? "-"}</span>
        </div>
      </div>
      {showWatchlistActions && (
        <span className="actions">
          <Tooltip title="Analytics" placement="top" arrow TransitionComponent={Grow}>
            <button className="action">
              <BarChartOutlined className="icon" />
            </button>
          </Tooltip>
          <Tooltip title="Remove" placement="top" arrow TransitionComponent={Grow}>
            <button className="btn btn-grey" onClick={() => onRemove(stock._id)}>
              Remove
            </button>
          </Tooltip>
        </span>
      )}
    </li>
  );
};
