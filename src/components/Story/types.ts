export type StoryStep = "input" | "template" | "generating" | "result";

export type StoryLength = "short" | "medium" | "long";

export type StoryGenre = "suspense" | "romance" | "adventure" | "scifi" | "daily" | "fantasy";

export interface StoryCharacter {
    name: string;
    role: string;
    description: string;
}

export interface StoryAct {
    actNumber: number;
    name: string;
    summary: string;
}

export interface StoryOutline {
    title: string;
    genre: string;
    logline: string;
    setting: string;
    characters: StoryCharacter[];
    acts: StoryAct[];
    themes: string[];
}

export interface GeneratedStory {
    id?: string;
    title: string;
    genre: string;
    logline?: string;
    setting?: string;
    characters?: StoryCharacter[];
    acts?: StoryAct[];
    themes?: string[];
    outline?: StoryOutline;
    created_at?: string;
}

export interface PartialStory {
    title?: string;
    genre?: string;
    logline?: string;
    setting?: string;
    characterCount?: number;
    actCount?: number;
}

export interface StoryTemplate {
    id: string;
    name: string;
    category: string;
    description: string;
    structure: unknown;
    prompts: unknown;
}

export interface StoryGeneratorProps {
    onStoryGenerated?: (story: GeneratedStory) => void;
    onDraftChange?: (data: { premise: string; genre?: string; title?: string }) => void;
    initialPremise?: string;
    isGeneratingIdea?: boolean;
    selectedStyleKey?: string | null;
}

export interface StreamEventData {
    type: "validating" | "generating" | "saving" | "done" | "error" | "chunk";
    message: string;
    chunk?: string;
    outline?: StoryOutline;
    story?: GeneratedStory;
}
