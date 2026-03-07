import { createContext, useCallback, useContext, useState } from 'react';

interface SidebarSlotContextValue {
  slotEl: HTMLElement | null;
  registerSlot: (el: HTMLElement | null) => void;
}

const SidebarSlotContext = createContext<SidebarSlotContextValue>({
  slotEl: null,
  registerSlot: () => {},
});

export function SidebarSlotProvider({ children }: { children: React.ReactNode }) {
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);
  const registerSlot = useCallback((el: HTMLElement | null) => setSlotEl(el), []);
  return (
    <SidebarSlotContext.Provider value={{ slotEl, registerSlot }}>
      {children}
    </SidebarSlotContext.Provider>
  );
}

export function useSidebarSlot() {
  return useContext(SidebarSlotContext);
}
