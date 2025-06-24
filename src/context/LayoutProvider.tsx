"use client";

import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface LayoutContextProps {
  colorClass?: string;
  setColorClass?: (color: string) => void;
  baseName?: string;
  setBaseName?: (name: string) => void;
}

const LayoutContext = createContext<LayoutContextProps>({});

export const useLayoutContext = () => useContext(LayoutContext);

export const LayoutProvider = ({ children }: { children: ReactNode }) => {
  const [colorClass, setColorClass] = useState<string | undefined>(undefined);
  const [baseName, setBaseName] = useState<string | undefined>(undefined);

  return (
    <LayoutContext.Provider value={{ colorClass, setColorClass, baseName, setBaseName }}>
      {children}
    </LayoutContext.Provider>
  );
};