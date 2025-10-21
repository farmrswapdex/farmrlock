import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LockerInterface from "@/components/LockerInterface";
import LocksQuery from "@/components/LocksQuery";
import UnlockPage from "@/components/UnlockPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LockerInterface />} />
        <Route path="/query" element={<LocksQuery />} />
        <Route path="/unlock" element={<UnlockPage />} />
      </Routes>
    </Router>
  );
}

export default App;
