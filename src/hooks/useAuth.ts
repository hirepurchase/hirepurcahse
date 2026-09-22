import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { LoginResponse } from "@/types";

export function useAuth() {
  const {
    user,
    userType,
    token,
    isAuthenticated,
    isLoading,
    setAuth,
    logout,
    initializeAuth,
  } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === "object" && error !== null) {
      const response = (error as { response?: { data?: { error?: string } } })
        .response;
      if (response?.data?.error) {
        return response.data.error;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  };

  const loginAdmin = async (email: string, password: string) => {
    try {
      const response = await api.post<LoginResponse>("/auth/admin/login", {
        email,
        password,
      });
      const { token, user } = response.data;
      setAuth(user, "admin", token);
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, "Login failed"),
      };
    }
  };

  const loginCustomer = async (phone: string, password: string) => {
    try {
      const response = await api.post<LoginResponse>("/auth/customer/login", {
        phone,
        password,
      });
      const { token, user } = response.data;
      setAuth(user, "customer", token);
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, "Login failed"),
      };
    }
  };


  const logoutUser = () => {
    logout();
    const loginPath = userType === "admin" ? "/admin-login" : "/customer-login";
    router.push(loginPath);
  };

  return {
    user,
    userType,
    token,
    isAuthenticated,
    isLoading,
    loginAdmin,
    loginCustomer,
    logout: logoutUser,
  };
}
