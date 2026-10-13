import type { ReactNode } from "react";
import { AppContext } from "./AppContext";
import type { AppIdentity } from "../types";

export function AppContextProvider({ value, children }: { value: AppIdentity; children: ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
