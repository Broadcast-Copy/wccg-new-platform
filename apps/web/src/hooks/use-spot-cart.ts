"use client";

import { useContext } from "react";
import {
  SpotCartContext,
  type SpotCartContextValue,
} from "@/components/providers/spot-cart-provider";

export function useSpotCart(): SpotCartContextValue {
  const context = useContext(SpotCartContext);
  if (!context) {
    throw new Error(
      "useSpotCart must be used within a SpotCartProvider. " +
        "Ensure <SpotCartProvider> is rendered in the layout."
    );
  }
  return context;
}
