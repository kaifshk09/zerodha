import React, { useState, useEffect } from "react";
import api from "../api";
import { VerticalGraph } from "./VerticalGraph";

const apiBase = process.env.REACT_APP_API_URL || "";

const Holdings = () => {
  const [allHoldings, setAllHoldings] = useState([]);
  const [summary, setSummary] = useState({
    totalInvestment: 0,
    currentValue: 0,
    pnl: 0,
    pnlPercent: 0,
  });

  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const response = await api.get("/api/holdings");
        setAllHoldings(response.data);
      } catch (error) {
        console.error("Failed to load holdings:", error);
      }
    };

    fetchHoldings();

    const token = localStorage.getItem("authToken");
    if (!token) return undefined;

    const source = new EventSource(`${apiBase}/api/events?token=${token}`);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setAllHoldings(data.holdings || []);
        setSummary({
          totalInvestment: data.totalInvestment || 0,
          currentValue: data.currentValue || 0,
          pnl: data.pnl || 0,
          pnlPercent: data.pnlPercent || 0,
        });
      } catch (err) {
        console.error("Failed to parse event data", err);
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => source.close();
  }, []);

  const labels = allHoldings.map((stock) => stock.name);

  const data = {
    labels,
    datasets: [
      {
        label: "LTP",
        data: allHoldings.map((stock) => stock.price),
        backgroundColor: "rgba(54, 162, 235, 0.5)",
      },
    ],
  };

  return (
    <>
      <h3 className="title">Holdings ({allHoldings.length})</h3>

      <div className="order-table">
        <table>
          <thead>
            <tr>
              <th>Instrument</th>
              <th>Qty.</th>
              <th>Avg. cost</th>
              <th>LTP</th>
              <th>Cur. val</th>
              <th>P&L</th>
              <th>Net chg.</th>
              <th>Day chg.</th>
            </tr>
          </thead>
          <tbody>
            {allHoldings.map((stock, index) => {
              const curValue = stock.price * stock.qty;
              const isProfit = curValue - stock.avg * stock.qty >= 0.0;
              const profClass = isProfit ? "profit" : "loss";
              const dayClass = stock.isLoss ? "loss" : "profit";

              return (
                <tr key={stock._id || index}>
                  <td className="align-left">{stock.name}</td>
                  <td>{stock.qty}</td>
                  <td>{stock.avg.toFixed(2)}</td>
                  <td>{stock.price.toFixed(2)}</td>
                  <td>{curValue.toFixed(2)}</td>
                  <td className={profClass}>
                    {(curValue - stock.avg * stock.qty).toFixed(2)}
                  </td>
                  <td className={profClass}>{stock.net}</td>
                  <td className={dayClass}>{stock.day}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="row">
        <div className="col">
          <h5>
            {summary.totalInvestment.toFixed(2)}
          </h5>
          <p>Total investment</p>
        </div>
        <div className="col">
          <h5>
            {summary.currentValue.toFixed(2)}
          </h5>
          <p>Current value</p>
        </div>
        <div className="col">
          <h5 className={summary.pnl >= 0 ? "profit" : "loss"}>
            {summary.pnl.toFixed(2)} ({summary.pnlPercent.toFixed(2)}%)
          </h5>
          <p>P&L</p>
        </div>
      </div>
      <VerticalGraph data={data} />
    </>
  );
};

export default Holdings;
