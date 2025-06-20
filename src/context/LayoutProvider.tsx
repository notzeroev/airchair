"use client";

import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface LayoutContextProps {
  colorClass?: string;
  setColorClass?: (color: string) => void;
}

const LayoutContext = createContext<LayoutContextProps>({});

export const useLayoutContext = () => useContext(LayoutContext);

export const LayoutProvider = ({ children }: { children: ReactNode }) => {
  const [colorClass, setColorClass] = useState<string | undefined>(undefined);

  return (
    <LayoutContext.Provider value={{ colorClass, setColorClass }}>
      {children}
    </LayoutContext.Provider>
  );
};
