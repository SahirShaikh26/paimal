import { createContext, useContext } from 'react';

// Lets any screen's TopBar (and the More tab) open the shared slide-out drawer
// without threading props through the whole navigator tree.
export const DrawerContext = createContext({ open: () => {}, close: () => {} });
export const useDrawer = () => useContext(DrawerContext);
