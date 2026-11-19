/**
 * Whether a fabrication command or view is open: a tiny store the manager pane and the graphics area read without
 * loading the fabrication code (that stays in its own chunks until a fabrication tab is shown).
 */
import { create } from 'zustand';

export const useFabOpen = create<{ pm: boolean; view: boolean }>(() => ({ pm: false, view: false }));
export const FAB_TABS = ['weldshop', 'laser', 'quote'] as const;
