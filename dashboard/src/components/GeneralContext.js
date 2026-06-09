import React, { useState } from "react";

import BuyActionWindow from "./BuyActionWindow";

const GeneralContext = React.createContext({
  openBuyWindow: (uid) => {},
  openSellWindow: (uid) => {},
  closeBuyWindow: () => {},
});

export const GeneralContextProvider = (props) => {
  const [isOrderWindowOpen, setIsOrderWindowOpen] = useState(false);
  const [selectedStockUID, setSelectedStockUID] = useState("");
  const [selectedOrderMode, setSelectedOrderMode] = useState("BUY");

  const handleOpenBuyWindow = (uid) => {
    setSelectedOrderMode("BUY");
    setIsOrderWindowOpen(true);
    setSelectedStockUID(uid);
  };

  const handleOpenSellWindow = (uid) => {
    setSelectedOrderMode("SELL");
    setIsOrderWindowOpen(true);
    setSelectedStockUID(uid);
  };

  const handleCloseBuyWindow = () => {
    setIsOrderWindowOpen(false);
    setSelectedStockUID("");
    setSelectedOrderMode("BUY");
  };

  return (
    <GeneralContext.Provider
      value={{
        openBuyWindow: handleOpenBuyWindow,
        openSellWindow: handleOpenSellWindow,
        closeBuyWindow: handleCloseBuyWindow,
      }}
    >
      {props.children}
      {isOrderWindowOpen && (
        <BuyActionWindow uid={selectedStockUID} mode={selectedOrderMode} />
      )}
    </GeneralContext.Provider>
  );
};

export default GeneralContext;
