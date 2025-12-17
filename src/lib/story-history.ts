/**
 * Story History Management - LocalStorage for draft stories
 */

export interface StoryHistoryItem {
    id: string;
    premise: string;
    title?: string;
    genre?: string;
    status: "draft" | "generating" | "completed";
    createdAt: number;
    updatedAt: number;
    outline?: any;
}

const STORAGE_KEY = "manga_maker_story_history";
const MAX_HISTORY_ITEMS = 10;

/**
 * Get all story history items
 */
export function getStoryHistory(): StoryHistoryItem[] {
    if (typeof window === "undefined") return [];

    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];

        const items = JSON.parse(data) as StoryHistoryItem[];
        // Sort by updatedAt descending
        return items.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
        console.error("Failed to load story history:", error);
        return [];
    }
}

/**
 * Save or update a story history item
 */
export function saveStoryHistory(item: Omit<StoryHistoryItem, "id" | "createdAt" | "updatedAt">): StoryHistoryItem {
    if (typeof window === "undefined") {
        throw new Error("Cannot save story history on server side");
    }

    const now = Date.now();
    const history = getStoryHistory();

    // Check if item already exists (by premise)
    const existingIndex = history.findIndex((h) => h.premise === item.premise);

    let newItem: StoryHistoryItem;

    if (existingIndex >= 0) {
        // Update existing item
        newItem = {
            ...history[existingIndex],
            ...item,
            updatedAt: now,
        };
        history[existingIndex] = newItem;
    } else {
        // Create new item
        newItem = {
            ...item,
            id: `story_${now}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: now,
            updatedAt: now,
        };
        history.unshift(newItem);
    }

    // Keep only MAX_HISTORY_ITEMS
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
        return newItem;
    } catch (error) {
        console.error("Failed to save story history:", error);
        throw error;
    }
}

/**
 * Get a single story history item by ID
 */
export function getStoryHistoryById(id: string): StoryHistoryItem | null {
    const history = getStoryHistory();
    return history.find((item) => item.id === id) || null;
}

/**
 * Delete a story history item
 */
export function deleteStoryHistory(id: string): void {
    if (typeof window === "undefined") return;

    const history = getStoryHistory();
    const filtered = history.filter((item) => item.id !== id);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.error("Failed to delete story history:", error);
    }
}

/**
 * Clear all story history
 */
export function clearStoryHistory(): void {
    if (typeof window === "undefined") return;

    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error("Failed to clear story history:", error);
    }
}

/**
 * Auto-save current state (debounced in component)
 */
export function autoSaveStory(data: {
    premise: string;
    genre?: string;
    title?: string;
    status: "draft" | "generating" | "completed";
    outline?: any;
}): StoryHistoryItem {
    return saveStoryHistory(data);
}
