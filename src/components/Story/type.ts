export type StoryAct = {
  actNumber?: number;
  name: string;
  summary?: string;
  scenes?: string[];
  keyEvents?: string[];
  conflicts?: string[];
  memorableQuotes?: string[];
  conflictRhythm?: unknown;
  characterDevelopment?: string;
};

export type StoryCharacter = {
  name: string;
  role?: string;
  description?: string;
  arc?: string;
  traits?: string[];
  motivation?: string;
  conflict?: string;
  relationships?: string[];
  visualHint?: string;
};

export type StoryOutline = {
  title?: string;
  genre?: string;
  logline?: string;
  setting?: string;
  acts: StoryAct[];
  characters: StoryCharacter[];
  themes: string[];
};

export type EditableStory = {
  id?: string | null;
  title?: string;
  premise?: string;
  genre?: string;
  outline?: StoryOutline;
  characters?: StoryCharacter[];
  acts?: StoryAct[];
  themes?: string[];
  logline?: string;
  setting?: string;
};
