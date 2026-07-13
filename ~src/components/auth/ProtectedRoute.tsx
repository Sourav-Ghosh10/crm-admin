import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchCurrentUser } from "../../store/slices/authSlice";
import GlobalLoader from "../common/LoadingSpinner/GlobalLoader";
import { tokenStorage } from "../../services/api";

interface ProtectedRouteProps {
    children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const dispatch = useAppDispatch();
    const { isAuthenticated, isInitialized, user } = useAppSelector((state) => state.auth);
    const location = useLocation();

    useEffect(() => {
        // Check if tokens exist in localStorage
        const hasValidTokens = tokenStorage.getAccessToken() && tokenStorage.getRefreshToken();
        
        // If isAuthenticated is true but no tokens exist, clear auth state and redirect
        if (isAuthenticated && !hasValidTokens) {
            tokenStorage.clearTokens();
            return; // Will trigger redirect below
        }

        if (isAuthenticated && !user && !isInitialized) {
            dispatch(fetchCurrentUser());
        }
    }, [isAuthenticated, user, isInitialized, dispatch]);

    // If authenticated but session not yet restored from token, show loading
    if (isAuthenticated && !isInitialized) {
        return <GlobalLoader fullScreen message="Verifying session..." />;
    }

    if (!isAuthenticated) {
        // Redirect to login page with the return url
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
