import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StaffMember, StaffPermissions, useAuth } from "./AuthContext";
import * as Crypto from "expo-crypto";

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: number;
  recipientId: string;
  recipientName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: number;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: string;
  isPublished: boolean;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
}

interface DataContextType {
  staffMembers: StaffMember[];
  messages: Message[];
  conversations: Conversation[];
  contentItems: ContentItem[];
  categories: Category[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  addStaffMember: (name: string, role: "staff" | "management", permissions: StaffPermissions) => Promise<string>;
  updateStaffMember: (id: string, updates: Partial<StaffMember>) => Promise<void>;
  removeStaffMember: (id: string) => Promise<void>;
  resetStaffPin: (id: string) => Promise<string>;
  sendMessage: (recipientId: string, content: string) => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  addContentItem: (title: string, description: string, category: string) => Promise<void>;
  updateContentItem: (id: string, updates: Partial<ContentItem>) => Promise<void>;
  deleteContentItem: (id: string) => Promise<void>;
  publishContentItem: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  STAFF_MEMBERS: "@staffhub/staff_members",
  MESSAGES: "@staffhub/messages",
  CONTENT_ITEMS: "@staffhub/content_items",
};

async function hashPin(pin: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin
  );
  return digest;
}

function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: "1", name: "Policies", icon: "file-text", itemCount: 0 },
  { id: "2", name: "Procedures", icon: "list", itemCount: 0 },
  { id: "3", name: "Announcements", icon: "bell", itemCount: 0 },
  { id: "4", name: "Training", icon: "book-open", itemCount: 0 },
  { id: "5", name: "Resources", icon: "folder", itemCount: 0 },
  { id: "6", name: "Contacts", icon: "users", itemCount: 0 },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      setStaffMembers([]);
      setMessages([]);
      setContentItems([]);
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [storedStaff, storedMessages, storedContent] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.STAFF_MEMBERS),
        AsyncStorage.getItem(STORAGE_KEYS.MESSAGES),
        AsyncStorage.getItem(STORAGE_KEYS.CONTENT_ITEMS),
      ]);

      if (storedStaff) setStaffMembers(JSON.parse(storedStaff));
      if (storedMessages) setMessages(JSON.parse(storedMessages));
      if (storedContent) setContentItems(JSON.parse(storedContent));
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = useCallback(async () => {
    await loadData();
  }, []);

  const conversations = React.useMemo((): Conversation[] => {
    if (!user) return [];

    const userMessages = messages.filter(
      (m) => m.senderId === user.id || m.recipientId === user.id
    );

    const conversationMap = new Map<string, Conversation>();

    userMessages.forEach((message) => {
      const otherId = message.senderId === user.id ? message.recipientId : message.senderId;
      const otherName = message.senderId === user.id ? message.recipientName : message.senderName;
      const otherAvatar = message.senderId === user.id ? 0 : message.senderAvatar;

      const existing = conversationMap.get(otherId);
      const messageTime = new Date(message.timestamp).getTime();
      const existingTime = existing ? new Date(existing.lastMessageTime).getTime() : 0;

      if (!existing || messageTime > existingTime) {
        conversationMap.set(otherId, {
          id: otherId,
          participantId: otherId,
          participantName: otherName,
          participantAvatar: otherAvatar,
          lastMessage: message.content,
          lastMessageTime: message.timestamp,
          unreadCount: existing 
            ? existing.unreadCount + (message.recipientId === user.id && !message.isRead ? 1 : 0)
            : (message.recipientId === user.id && !message.isRead ? 1 : 0),
        });
      } else if (message.recipientId === user.id && !message.isRead) {
        existing.unreadCount += 1;
      }
    });

    return Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }, [messages, user]);

  const categories = React.useMemo((): Category[] => {
    return DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      itemCount: contentItems.filter((item) => item.category === cat.name && item.isPublished).length,
    }));
  }, [contentItems]);

  const addStaffMember = useCallback(async (
    name: string,
    role: "staff" | "management",
    permissions: StaffPermissions
  ): Promise<string> => {
    const pin = generatePin();
    const newStaff: StaffMember = {
      id: Date.now().toString(),
      name,
      role,
      pinHash: await hashPin(pin),
      permissions,
      avatarIndex: Math.floor(Math.random() * 6),
      isActive: true,
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const updatedStaff = [...staffMembers, newStaff];
    await AsyncStorage.setItem(STORAGE_KEYS.STAFF_MEMBERS, JSON.stringify(updatedStaff));
    setStaffMembers(updatedStaff);
    return pin;
  }, [staffMembers]);

  const updateStaffMember = useCallback(async (id: string, updates: Partial<StaffMember>) => {
    const updatedStaff = staffMembers.map((staff) =>
      staff.id === id ? { ...staff, ...updates } : staff
    );
    await AsyncStorage.setItem(STORAGE_KEYS.STAFF_MEMBERS, JSON.stringify(updatedStaff));
    setStaffMembers(updatedStaff);
  }, [staffMembers]);

  const removeStaffMember = useCallback(async (id: string) => {
    const updatedStaff = staffMembers.filter((staff) => staff.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.STAFF_MEMBERS, JSON.stringify(updatedStaff));
    setStaffMembers(updatedStaff);
  }, [staffMembers]);

  const resetStaffPin = useCallback(async (id: string): Promise<string> => {
    const pin = generatePin();
    const updatedStaff = staffMembers.map((staff) =>
      staff.id === id ? { ...staff, pinHash: "" } : staff
    );
    
    const staffToUpdate = updatedStaff.find((s) => s.id === id);
    if (staffToUpdate) {
      staffToUpdate.pinHash = await hashPin(pin);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.STAFF_MEMBERS, JSON.stringify(updatedStaff));
    setStaffMembers(updatedStaff);
    return pin;
  }, [staffMembers]);

  const sendMessage = useCallback(async (recipientId: string, content: string) => {
    if (!user) return;

    const recipient = staffMembers.find((s) => s.id === recipientId);
    if (!recipient) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatarIndex,
      recipientId,
      recipientName: recipient.name,
      content,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    const updatedMessages = [...messages, newMessage];
    await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(updatedMessages));
    setMessages(updatedMessages);
  }, [messages, user, staffMembers]);

  const markMessageAsRead = useCallback(async (messageId: string) => {
    const updatedMessages = messages.map((msg) =>
      msg.id === messageId ? { ...msg, isRead: true } : msg
    );
    await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(updatedMessages));
    setMessages(updatedMessages);
  }, [messages]);

  const addContentItem = useCallback(async (title: string, description: string, category: string) => {
    if (!user) return;

    const newItem: ContentItem = {
      id: Date.now().toString(),
      title,
      description,
      category,
      isPublished: false,
      authorId: user.id,
      authorName: user.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedItems = [...contentItems, newItem];
    await AsyncStorage.setItem(STORAGE_KEYS.CONTENT_ITEMS, JSON.stringify(updatedItems));
    setContentItems(updatedItems);
  }, [contentItems, user]);

  const updateContentItem = useCallback(async (id: string, updates: Partial<ContentItem>) => {
    const updatedItems = contentItems.map((item) =>
      item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    );
    await AsyncStorage.setItem(STORAGE_KEYS.CONTENT_ITEMS, JSON.stringify(updatedItems));
    setContentItems(updatedItems);
  }, [contentItems]);

  const deleteContentItem = useCallback(async (id: string) => {
    const updatedItems = contentItems.filter((item) => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.CONTENT_ITEMS, JSON.stringify(updatedItems));
    setContentItems(updatedItems);
  }, [contentItems]);

  const publishContentItem = useCallback(async (id: string) => {
    await updateContentItem(id, { isPublished: true });
  }, [updateContentItem]);

  return (
    <DataContext.Provider
      value={{
        staffMembers,
        messages,
        conversations,
        contentItems,
        categories,
        isLoading,
        refreshData,
        addStaffMember,
        updateStaffMember,
        removeStaffMember,
        resetStaffPin,
        sendMessage,
        markMessageAsRead,
        addContentItem,
        updateContentItem,
        deleteContentItem,
        publishContentItem,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
