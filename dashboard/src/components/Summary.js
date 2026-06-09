import React, { useEffect, useState } from "react";
import api from "../api";

const Summary = () => {
  const [summary, setSummary] = useState({
    holdingsCount: 0,
    positionsCount: 0,
    watchlistCount: 0,
    totalInvestment: 0,
    currentValue: 0,
    pnl: 0,
    pnlPercent: 0,
  });

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await api.get("/api/portfolio");
        setSummary(response.data);
      } catch (err) {
        console.error("Failed to load summary", err);
      }
    };
    fetchSummary();
  }, []);

  return (
    <>
      <div className="username">
        <h6>Hi, Investor!</h6>
        <hr className="divider" />
      </div>

      <div className="section">
        <span>
          <p>Portfolio snapshot</p>
        </span>

        <div className="data">
          <div className="first">
            <h3>₹{summary.totalInvestment.toFixed(2)}</h3>
            <p>Total investment</p>
          </div>
          <hr />

          <div className="second">
            <p>
              Holdings <span>{summary.holdingsCount}</span>
            </p>
            <p>
              Positions <span>{summary.positionsCount}</span>
            </p>
          </div>
        </div>
        <hr className="divider" />
      </div>

      <div className="section">
        <span>
          <p>Performance</p>
        </span>

        <div className="data">
          <div className="first">
            <h3 className={summary.pnl >= 0 ? "profit" : "loss"}>
              ₹{summary.pnl.toFixed(2)} <small>{summary.pnlPercent.toFixed(2)}%</small>
            </h3>
            <p>P&L</p>
          </div>
          <hr />

          <div className="second">
            <p>
              Current Value <span>₹{summary.currentValue.toFixed(2)}</span>
            </p>
            <p>
              Watchlist <span>{summary.watchlistCount}</span>
            </p>
          </div>
        </div>
        <hr className="divider" />
      </div>
    </>
  );
};

export default Summary;
