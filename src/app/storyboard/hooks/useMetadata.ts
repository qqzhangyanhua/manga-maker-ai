import { useState, useEffect } from "react";
import { CharacterOption, StyleOption } from "../types";

export const useMetadata = () => {
  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [styles, setStyles] = useState<StyleOption[]>([]);

  useEffect(() => {
    async function fetchMeta() {
      try {
        const [charRes, styleRes] = await Promise.all([
          fetch("/api/character"),
          fetch("/api/comic-styles"),
        ]);

        if (charRes.ok) {
          const data = await charRes.json();
          const mapped: CharacterOption[] = (data.characters || []).map((c: {
            id: string;
            name: string;
            views?: unknown[];
          }) => ({
            id: c.id,
            name: c.name,
            viewCount: c.views?.length || 0,
          }));
          setCharacters(mapped);
        }

        if (styleRes.ok) {
          const data = await styleRes.json();
          const mapped: StyleOption[] = (data.data || []).map((s: {
            style_key: string;
            name_zh: string;
            name_en: string;
            description?: string | null;
          }) => ({
            style_key: s.style_key,
            name_zh: s.name_zh,
            name_en: s.name_en,
            description: s.description,
          }));
          setStyles(mapped);
        }
      } catch (err) {
        console.warn("加载角色/风格失败", err);
      }
    }

    fetchMeta();
  }, []);

  return { characters, styles };
};
