import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { Navbar } from "./components/Navbar.jsx";
import { AuthModal } from "./components/AuthModal.jsx";
import { ConnectModal } from "./components/ConnectModal.jsx";

import { Landing } from "./pages/Landing.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { ChessDNA } from "./pages/ChessDNA.jsx";
import { Play } from "./pages/Play.jsx";
import { GameAnalysis } from "./pages/GameAnalysis.jsx";
import { Training } from "./pages/Training.jsx";
import { Evolution } from "./pages/Evolution.jsx";
import { GameHistory } from "./pages/GameHistory.jsx";
import { AICoach } from "./pages/AICoach.jsx";

const MainContent = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("landing");
  const [tabParams, setTabParams] = useState({});

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  const navigateTo = (tab, params = {}) => {
    setActiveTab(tab);
    setTabParams(params);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-dark-900 text-gold-400 font-semibold text-sm">
        Initializing Chess Evolve AI Laboratory...
      </div>
    );
  }

  const currentView = user ? (activeTab === "landing" ? "dashboard" : activeTab) : "landing";

  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 flex flex-col font-sans">
      <Navbar
        activeTab={currentView}
        setActiveTab={(t) => navigateTo(t)}
        onOpenConnect={() => {
          if (!user) setAuthModalOpen(true);
          else setConnectModalOpen(true);
        }}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        {currentView === "landing" && (
          <Landing
            onConnect={() => {
              if (!user) setAuthModalOpen(true);
              else setConnectModalOpen(true);
            }}
          />
        )}

        {currentView === "dashboard" && (
          <Dashboard
            onNavigate={navigateTo}
            onOpenConnect={() => setConnectModalOpen(true)}
          />
        )}
        {currentView === "dna" && <ChessDNA />}
        {currentView === "play" && <Play initialOpponentType={tabParams.opponentType || "PEAK_SELF"} />}
        {currentView === "analysis" && <GameAnalysis gameId={tabParams.gameId} onBack={() => navigateTo("dashboard")} />}
        {currentView === "training" && <Training />}
        {currentView === "evolution" && <Evolution />}
        {currentView === "history" && <GameHistory onAnalyzeGame={(gameId) => navigateTo("analysis", { gameId })} />}
        {currentView === "coach" && <AICoach />}
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          setConnectModalOpen(true);
        }}
      />

      <ConnectModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onSuccess={() => {
          setConnectModalOpen(false);
          navigateTo("dashboard");
        }}
      />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}

export default App;
