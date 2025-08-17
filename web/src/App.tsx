import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LandingPage } from "./components/LandingPage";
import { Dashboard } from "./components/Dashboard";
import { MergeStrategiesPage } from "./components/MergeStrategiesPage";
import NewAdminPanel from "./components/NewAdminPanel";
import "./styles.css";

const AppContent: React.FC = () => {
  const {
    isAuthenticated,
    isLoading,
    login,
    signup,
    continueAsGuest,
    error,
    user,
  } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Use user variable to prevent TypeScript unused variable error
  // This will be properly used when admin panel is re-enabled post-hackathon
  React.useEffect(() => {
    // Silent use of user variable for TypeScript compliance
    if (user) {
      // Admin functionality temporarily disabled for hackathon
      console.debug("User authenticated:", user.email);
    }
  }, [user]);

  // Listen for URL changes
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Update path when it changes
  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, [window.location.pathname]);

  const isAdminPath = currentPath === "/admin";
  const isMergeStrategiesPath = currentPath === "/merge-strategies";
  // const isAdmin = user?.email === "mdsajid8636@gmail.com"; // Temporarily disabled for hackathon

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="spinner border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if there's an authentication error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Error
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show merge strategies page (accessible to everyone)
  if (isMergeStrategiesPath) {
    return <MergeStrategiesPage />;
  }

  // Show enhanced admin panel for admin users on /admin path
  if (isAuthenticated && isAdminPath) {
    const isAdmin =
      user?.email === "mdsajid8636@gmail.com" ||
      user?.subscription_plan === "enterprise";
    if (isAdmin) {
      return <NewAdminPanel />;
    } else {
      // Redirect non-admin users to dashboard
      window.history.pushState({}, "", "/");
      setCurrentPath("/");
      return <Dashboard />;
    }
  }

  // Show dashboard if authenticated, otherwise show landing page
  return isAuthenticated ? (
    <Dashboard />
  ) : (
    <LandingPage
      onLogin={login}
      onSignup={signup}
      onContinueAsGuest={continueAsGuest}
      isLoading={isLoading}
    />
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
