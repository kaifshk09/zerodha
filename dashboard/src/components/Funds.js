import React, { useEffect, useState } from "react";
import api from "../api";

const Funds = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("DEPOSIT");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const loadFunds = async () => {
    try {
      const response = await api.get("/api/funds");
      setBalance(response.data.balance || 0);
      setTransactions(response.data.transactions || []);
    } catch (err) {
      console.error("Unable to load funds:", err);
      setError("Unable to load fund data. Please refresh.");
    }
  };

  useEffect(() => {
    loadFunds();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/funds", { amount: parsedAmount, type, note });
      setAmount("");
      setNote("");
      setSuccess(`${type === "DEPOSIT" ? "Deposit" : "Withdrawal"} saved successfully.`);
      await loadFunds();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save transaction.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="funds">
        <p>Instant, zero-cost fund transfers with UPI</p>
      </div>

      <div className="row funds-grid">
        <div className="col fund-card">
          <span>
            <p>Portfolio Cash Balance</p>
          </span>
          <div className="table">
            <div className="data">
              <p>Available cash</p>
              <p className="imp colored">{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <hr />
            <form className="funds-form" onSubmit={handleSubmit}>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <select value={type} onChange={(event) => setType(event.target.value)}>
                <option value="DEPOSIT">Deposit</option>
                <option value="WITHDRAW">Withdraw</option>
              </select>
              <input
                type="text"
                placeholder="Note (optional)"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <button className="btn btn-green" type="submit" disabled={loading}>
                {loading ? "Saving..." : type === "DEPOSIT" ? "Add Funds" : "Withdraw"}
              </button>
            </form>
            {error && <p className="status-message error">{error}</p>}
            {success && <p className="status-message success">{success}</p>}

            <div className="transaction-list">
              {transactions.length === 0 ? (
                <p className="commodity">No fund transactions yet.</p>
              ) : (
                transactions.map((transaction) => (
                  <div className="transaction-row" key={transaction._id}>
                    <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
                    <span className={`transaction-type ${transaction.type === "WITHDRAW" ? "transaction-withdraw" : "transaction-deposit"}`}>
                      {transaction.type}
                    </span>
                    <span className="transaction-amount">
                      {transaction.type === "WITHDRAW" ? "-" : "+"}
                      {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col">
          <div className="commodity">
            <p>You don't have a commodity account</p>
            <button className="btn btn-blue" type="button">Open Account</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Funds;
