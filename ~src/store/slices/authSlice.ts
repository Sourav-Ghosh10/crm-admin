import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../../types/user.types";
import { authService } from "../../services/authService";
import type { LoginCredentials } from "../../services/authService";
import { tokenStorage } from "../../services/api";
import { getErrorMessage } from "../../utils/errorHandling";

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: authService.isAuthenticated(),
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  "auth/login",
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      if (!response.success) {
        return rejectWithValue("Login failed");
      }
      return response.data;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, "Invalid email or password");
      // If errorMessage is an array, join them; otherwise use as is
      const message = Array.isArray(errorMessage) ? errorMessage.join(", ") : errorMessage;
      return rejectWithValue(message);
    }
  },
);

export const loginWithGoogle = createAsyncThunk(
  "auth/loginWithGoogle",
  async (checked: boolean = true, { rejectWithValue }) => {
    try {
      const response = await authService.loginWithGoogle(checked);
      if (!response.success) {
        return rejectWithValue("Google login failed");
      }
      return response.data;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, "Google login failed");
      // If errorMessage is an array, join them; otherwise use as is
      const message = Array.isArray(errorMessage) ? errorMessage.join(", ") : errorMessage;
      return rejectWithValue(message);
    }
  },
);

export const logout = createAsyncThunk("auth/logout", async () => {
  await authService.logout();
});

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getCurrentUser();
      return response.data.user;
    } catch {
      tokenStorage.clearTokens();
      return rejectWithValue("Failed to fetch user");
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (
      state,
      action: PayloadAction<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>,
    ) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.error = null;
      tokenStorage.setTokens(
        action.payload.accessToken,
        action.payload.refreshToken,
      );
    },
    logoutSuccess: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
      tokenStorage.clearTokens();
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string;
      })
      // Google Login
      .addCase(loginWithGoogle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(loginWithGoogle.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {

        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
        tokenStorage.clearTokens();
      })
      .addCase(logout.rejected, (state) => {
        // Even if logout API fails, clear local state
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
        tokenStorage.clearTokens();
      })
      // Fetch current user
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.isInitialized = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.isInitialized = true;
        state.error = null;
        tokenStorage.clearTokens();
      });
  },
});

export const { loginSuccess, logoutSuccess, clearError } = authSlice.actions;
export default authSlice.reducer;
