import React, { useState, useContext } from "react";

import api from "../api";

import GeneralContext from "./GeneralContext";

import "./BuyActionWindow.css";

const BuyActionWindow = ({ uid, mode = "BUY" }) => {
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockPrice, setStockPrice] = useState(0.0);
  const [error, setError] = useState("");
  const { closeBuyWindow } = useContext(GeneralContext);

  const handleOrderClick = async () => {
    try {
      await api.post("/api/orders", {
        name: uid,
        qty: Number(stockQuantity) || 0,
        price: Number(stockPrice) || 0,
        mode,
      });
    } catch (err) {
      console.error("Failed to place order:", err);
      setError(err.response?.data?.error || "Unable to place order.");
    } finally {
      closeBuyWindow();
    }
  };

  const handleCancelClick = () => {
    closeBuyWindow();
  };

  return (
    <div className="container" id="buy-window" draggable="true">
      <div className="regular-order">
        <h2>{mode === "SELL" ? "Sell Order" : "Buy Order"}</h2>
        <div className="inputs">
          <fieldset>
            <legend>Qty.</legend>
            <input
              type="number"
              name="qty"
              id="qty"
              min="1"
              onChange={(e) => setStockQuantity(e.target.value)}
              value={stockQuantity}
            />
          </fieldset>
          <fieldset>
            <legend>Price</legend>
            <input
              type="number"
              name="price"
              id="price"
              step="0.05"
              min="0"
              onChange={(e) => setStockPrice(e.target.value)}
              value={stockPrice}
            />
          </fieldset>
        </div>
        {error && <div className="auth-error">{error}</div>}
      </div>

      <div className="buttons">
        <span>Margin required ₹140.65</span>
        <div>
          <button className="btn btn-blue" onClick={handleOrderClick}>
            {mode === "SELL" ? "Sell" : "Buy"}
          </button>
          <button className="btn btn-grey" onClick={handleCancelClick}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyActionWindow;
