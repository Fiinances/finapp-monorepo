import React, { createContext, useCallback, useContext, useState } from 'react';

interface SideMenuContextType {
    isMenuOpen: boolean;
    openMenu: () => void;
    closeMenu: () => void;
}

const SideMenuContext = createContext<SideMenuContextType>({
    isMenuOpen: false,
    openMenu: () => {},
    closeMenu: () => {},
});

export function SideMenuProvider({ children }: { children: React.ReactNode }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const openMenu = useCallback(() => setIsMenuOpen(true), []);
    const closeMenu = useCallback(() => setIsMenuOpen(false), []);

    return (
        <SideMenuContext.Provider value={{ isMenuOpen, openMenu, closeMenu }}>
            {children}
        </SideMenuContext.Provider>
    );
}

export function useSideMenu() {
    return useContext(SideMenuContext);
}
