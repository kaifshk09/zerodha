import React, { useContext } from "react";
import AuthContext from "./AuthContext";

const RequireAuth = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!user) {
    const frontendLoginUrl = process.env.REACT_APP_FRONTEND_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : undefined);
    if (frontendLoginUrl) {
      window.location.href = `${frontendLoginUrl}/login`;
      return null;
    }
    return <div className="loading-screen">Frontend login URL not configured</div>;
  }

  return children;
};

export default RequireAuth;
