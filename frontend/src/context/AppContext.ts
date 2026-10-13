import { createContext, useContext } from "react";
import type { AppIdentity } from "../types";

export const AppContext = createContext<AppIdentity | null>(null);

export function useAppIdentity(): AppIdentity {
  const context = useContext(AppContext);
  if (!context) throw new Error("Account identity must be used within the application context.");
  return context;
}
