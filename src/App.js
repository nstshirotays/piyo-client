import "./styles.css";
import React, { useState } from "react";
import ResponsiveAppBar from "./components/ResponsiveAppBar";
import Deposit from "./components/Deposit";
import Loan from "./components/Loan";
import Quake from "./components/Quake";
import PiyoBuy from "./components/PiyoBuy";
import StickyFooter from "./components/StickyFooter";

const App = () => {

  const [page, setPage] = useState("預金");

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };


  return (
    <div className="container">
      <ResponsiveAppBar handlePageChange={handlePageChange} />

      {page === "預金" && <Deposit />}
      {page === "ローン" && <Loan />}
      {page === "保険" && <Quake />}
      {page === "PIYOコイン" && <PiyoBuy />}

      <StickyFooter/>

    </div>
  );
};

export default App;
