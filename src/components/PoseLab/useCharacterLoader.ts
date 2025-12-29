import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Character } from "./types";

/**
 * Custom hook for loading user's characters from the API
 */
export function useCharacterLoader() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadCharacters = async () => {
      setIsLoadingCharacters(true);
      try {
        const response = await fetch("/api/character");
        if (!response.ok) {
          throw new Error("加载角色列表失败");
        }
        const data = await response.json();
        setCharacters(data.characters || []);
      } catch (error) {
        console.error("Failed to load characters:", error);
        toast({
          variant: "destructive",
          title: "加载失败",
          description: error instanceof Error ? error.message : "无法加载角色列表",
        });
      } finally {
        setIsLoadingCharacters(false);
      }
    };
    loadCharacters();
  }, [toast]);

  return {
    characters,
    isLoadingCharacters,
  };
}
