"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  DAYPARTS,
  SPOT_CART_KEY,
  type DaypartId,
  type SpotCartItem,
} from "@/lib/sales-shared";

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

export interface SpotCartContextValue {
  items: SpotCartItem[];
  addItem: (daypartId: DaypartId, quantity?: number) => void;
  removeItem: (daypartId: DaypartId) => void;
  updateQuantity: (daypartId: DaypartId, quantity: number) => void;
  updateRate: (daypartId: DaypartId, rate: number) => void;
  clearCart: () => void;
  itemCount: number;
  totalSpots: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

export const SpotCartContext = createContext<SpotCartContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function SpotCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SpotCartItem[]>([]);
  const [isCartOpen, setCartOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount. We intentionally keep the read in an
  // effect (not a lazy useState initializer) so the server and first client
  // render both start from [] — reading localStorage during render would cause a
  // static-export hydration mismatch. The resulting setState calls are deferred
  // to a microtask so they don't run synchronously in the effect body
  // (react-hooks/set-state-in-effect); observable behavior is unchanged.
  useEffect(() => {
    let parsed: SpotCartItem[] | null = null;
    try {
      const raw = localStorage.getItem(SPOT_CART_KEY);
      if (raw) {
        const data = JSON.parse(raw) as SpotCartItem[];
        if (Array.isArray(data)) parsed = data;
      }
    } catch {
      // ignore
    }
    queueMicrotask(() => {
      if (parsed) setItems(parsed);
      setHydrated(true);
    });
  }, []);

  // Persist to localStorage on change (skip initial mount)
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(SPOT_CART_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback(
    (daypartId: DaypartId, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.daypartId === daypartId);
        if (existing) {
          return prev.map((i) =>
            i.daypartId === daypartId
              ? { ...i, quantity: i.quantity + quantity }
              : i
          );
        }
        const dp = DAYPARTS.find((d) => d.id === daypartId);
        if (!dp) return prev;
        return [
          ...prev,
          {
            daypartId,
            label: dp.label,
            rate: dp.defaultRate,
            quantity,
            startHour: dp.startHour,
            endHour: dp.endHour,
          },
        ];
      });
    },
    []
  );

  const removeItem = useCallback((daypartId: DaypartId) => {
    setItems((prev) => prev.filter((i) => i.daypartId !== daypartId));
  }, []);

  const updateQuantity = useCallback(
    (daypartId: DaypartId, quantity: number) => {
      setItems((prev) =>
        prev.map((i) =>
          i.daypartId === daypartId
            ? { ...i, quantity: Math.max(1, quantity) }
            : i
        )
      );
    },
    []
  );

  const updateRate = useCallback((daypartId: DaypartId, rate: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.daypartId === daypartId ? { ...i, rate: Math.max(0, rate) } : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(SPOT_CART_KEY);
  }, []);

  const value = useMemo<SpotCartContextValue>(() => {
    const itemCount = items.length;
    const totalSpots = items.reduce((sum, i) => sum + i.quantity, 0);
    const cartSubtotal = items.reduce(
      (sum, i) => sum + i.rate * i.quantity,
      0
    );
    return {
      items,
      addItem,
      removeItem,
      updateQuantity,
      updateRate,
      clearCart,
      itemCount,
      totalSpots,
      cartSubtotal,
      isCartOpen,
      setCartOpen,
    };
  }, [items, addItem, removeItem, updateQuantity, updateRate, clearCart, isCartOpen]);

  return (
    <SpotCartContext.Provider value={value}>
      {children}
    </SpotCartContext.Provider>
  );
}
