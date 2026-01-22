import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireCashIn?: boolean;
}

export default function ProtectedRoute({ children, requireCashIn = false }: ProtectedRouteProps) {
  const location = useLocation();
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const hasCashIn = localStorage.getItem("cashInAmount") !== null;

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // For cashier dashboard, require cash in
  if (requireCashIn && !hasCashIn && location.pathname === "/cashier") {
    return <Navigate to="/login" replace state={{ requireCashIn: true }} />;
  }

  return <>{children}</>;
}

