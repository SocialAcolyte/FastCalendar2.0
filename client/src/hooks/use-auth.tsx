import { createContext, ReactNode, useContext, useEffect } from "react";
import { useQuery, useMutation, UseMutationResult } from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGuestStorage } from "./use-guest-storage";
import { z } from "zod";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  isGuest: boolean;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  updateUserMutation: UseMutationResult<SelectUser, Error, UpdateUserData>;
  continueAsGuest: () => void;
};

type LoginData = Pick<InsertUser, "username" | "password">;
type UpdateUserData = Pick<InsertUser, "birthdate" | "lifespan_option">;

const loginSchema = insertUserSchema.pick({
  username: true,
  password: true,
}).extend({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const AuthContext = createContext<AuthContextType | null>(null);

const GUEST_FLAG_KEY = "is_guest_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const guestStorage = useGuestStorage();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const isGuest = localStorage.getItem(GUEST_FLAG_KEY) === "true";

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      await loginSchema.parseAsync(credentials);
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      localStorage.removeItem(GUEST_FLAG_KEY);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      await loginSchema.parseAsync(credentials);
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      localStorage.removeItem(GUEST_FLAG_KEY);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Success",
        description: "Registered successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!isGuest) {
        await apiRequest("POST", "/api/logout");
      }
      localStorage.removeItem(GUEST_FLAG_KEY);
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: UpdateUserData) => {
      const res = await apiRequest("PATCH", "/api/user", data);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const continueAsGuest = () => {
    localStorage.setItem(GUEST_FLAG_KEY, "true");
    queryClient.setQueryData(["/api/user"], null);
    window.location.href = "/";
  };

  // Set up mock events query for guest mode
  useEffect(() => {
    if (isGuest) {
      queryClient.setQueryData(["/api/events"], guestStorage.events);
    }
  }, [isGuest, guestStorage.events]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        isGuest,
        loginMutation,
        logoutMutation,
        registerMutation,
        updateUserMutation,
        continueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}