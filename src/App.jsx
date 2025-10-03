// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Requests from "./pages/Requests";
import Shelters from "./pages/Shelters";
import FamilyLocator from "./pages/FamilyLocator";
import LoadingScreen from "./components/LoadingScreen"; // Updated component

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial app loading (e.g., 2-second delay)
    const timer = setTimeout(() => {
      setIsLoading(false); // Hide loading screen after delay
    }, 2000);

    return () => clearTimeout(timer); // Cleanup timer
  }, []);

  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Navbar stays at top */}
        <Navbar />

        {/* Main content: Show loading screen or routed content */}
        {isLoading ? (
          <LoadingScreen />
        ) : (
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/shelters" element={<Shelters />} />
              <Route path="/family-locator" element={<FamilyLocator />} />
            </Routes>
          </main>
        )}
      </div>
    </Router>
  );
}

export default App;