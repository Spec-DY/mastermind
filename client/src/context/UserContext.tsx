"use client";
import React, { createContext, useState, useContext, ReactNode } from "react";

type UserContextType = {
  username: string | null;
  setUsername: (name: string) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [username, setUsername] = useState<string | null>(null);

  const value = {
    username,
    setUsername,
  };
  console.log("Context username is: " + username);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
