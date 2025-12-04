import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

export type UserRole = "public" | "staff" | "management";

export interface StaffPermissions {
  viewRestrictedData: boolean;
  editContent: boolean;
  sendMessages: boolean;
  manageStaff: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  role: UserRole;
  pinHash: string;
  permissions: StaffPermissions;
  avatarIndex: number;
  isActive: boolean;
  lastActive: string;
  createdAt: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  permissions: StaffPermissions;
  avatarIndex: number;
}

interface AuthContextType {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CURRENT_USER: "@staffhub/current_user",
  STAFF_MEMBERS: "@staffhub/staff_members",
};

async function hashPin(pin: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin
  );
  return digest;
}

async function initializeDefaultStaff(): Promise<StaffMember[]> {
  const defaultStaff: StaffMember[] = [
    {
      id: "1",
      name: "Admin User",
      role: "management",
      pinHash: await hashPin("1234"),
      permissions: {
        viewRestrictedData: true,
        editContent: true,
        sendMessages: true,
        manageStaff: true,
      },
      avatarIndex: 0,
      isActive: true,
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      name: "Staff Member",
      role: "staff",
      pinHash: await hashPin("5678"),
      permissions: {
        viewRestrictedData: true,
        editContent: true,
        sendMessages: true,
        manageStaff: false,
      },
      avatarIndex: 1,
      isActive: true,
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];
  await AsyncStorage.setItem(STORAGE_KEYS.STAFF_MEMBERS, JSON.stringify(defaultStaff));
  return defaultStaff;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load stored user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      let staffMembers: StaffMember[] = [];
      const storedMembers = await AsyncStorage.getItem(STORAGE_KEYS.STAFF_MEMBERS);
      
      if (storedMembers) {
        staffMembers = JSON.parse(storedMembers);
      } else {
        staffMembers = await initializeDefaultStaff();
      }

      const pinHash = await hashPin(pin);
      const matchedStaff = staffMembers.find(
        (staff) => staff.pinHash === pinHash && staff.isActive
      );

      if (matchedStaff) {
        const currentUser: CurrentUser = {
          id: matchedStaff.id,
          name: matchedStaff.name,
          role: matchedStaff.role,
          permissions: matchedStaff.permissions,
          avatarIndex: matchedStaff.avatarIndex,
        };

        matchedStaff.lastActive = new Date().toISOString();
        await AsyncStorage.setItem(STORAGE_KEYS.STAFF_MEMBERS, JSON.stringify(staffMembers));
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
        setUser(currentUser);
        return { success: true };
      }

      return { success: false, error: "Invalid PIN code" };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "An error occurred during login" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: user !== null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
