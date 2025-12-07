"use client";

import { useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import StyleCard from "@/components/StyleCard";
import CharacterCard from "@/components/CharacterCard";
import GeneratorSection from "@/components/GeneratorSection";

const comicStyles = [
  {
    id: "manga",
    name: "日式漫画",
    nameEn: "MANGA",
    image: "/assets/style-manga.jpg",
    color: "bg-comic-pink text-background",
  },
  {
    id: "american",
    name: "美式漫画",
    nameEn: "AMERICAN",
    image: "/assets/style-american.jpg",
    color: "bg-comic-red text-foreground",
  },
  {
    id: "webtoon",
    name: "韩式条漫",
    nameEn: "WEBTOON",
    image: "/assets/style-webtoon.jpg",
    color: "bg-comic-blue text-background",
  },
  {
    id: "european",
    name: "欧式漫画",
    nameEn: "EUROPEAN",
    image: "/assets/style-european.jpg",
    color: "bg-comic-purple text-foreground",
  },
  {
    id: "watercolor",
    name: "水彩风格",
    nameEn: "WATERCOLOR",
    image: "/assets/style-watercolor.jpg",
    color: "bg-comic-green text-background",
  },
  {
    id: "retro",
    name: "复古漫画",
    nameEn: "RETRO",
    image: "/assets/style-retro.jpg",
    color: "bg-comic-orange text-background",
  },
];

const characters = [
  {
    id: "hero",
    name: "超级英雄",
    description: "正义凛然，守护城市的勇者",
    image: "/assets/char-hero.jpg",
  },
  {
    id: "warrior",
    name: "幻想战士",
    description: "手持神剑，征战异世界",
    image: "/assets/char-warrior.jpg",
  },
  {
    id: "student",
    name: "校园少年",
    description: "青春洋溢，追逐梦想",
    image: "/assets/char-student.jpg",
  },
  {
    id: "detective",
    name: "神秘侦探",
    description: "洞察一切，揭开真相",
    image: "/assets/char-detective.jpg",
  },
  {
    id: "magician",
    name: "魔法师",
    description: "掌控元素，操纵魔法",
    image: "/assets/char-magician.jpg",
  },
  {
    id: "cyberpunk",
    name: "赛博朋克",
    description: "未来都市的科技战士",
    image: "/assets/char-cyberpunk.jpg",
  },
];

const HomePage = () => {
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);

  const selectedStyleName = comicStyles.find((style) => style.id === selectedStyle)?.name || null;
  const selectedCharacterName = characters.find((character) => character.id === selectedCharacter)?.name || null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <HeroSection />

        <section id="styles" className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-comic text-4xl md:text-5xl comic-title mb-4">
                选择漫画风格
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                从日式漫画到美式超英，选择你最喜欢的艺术风格
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
              {comicStyles.map((style, index) => (
                <div 
                  key={style.id} 
                  className="animate-slide-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <StyleCard
                    name={style.name}
                    nameEn={style.nameEn}
                    image={style.image}
                    color={style.color}
                    selected={selectedStyle === style.id}
                    onClick={() => setSelectedStyle(style.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="characters" className="py-20 px-4 bg-card/50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-comic text-4xl md:text-5xl comic-title mb-4">
                选择角色类型
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                选择一个基础角色类型，AI 会根据你的描述进行个性化调整
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {characters.map((character, index) => (
                <div 
                  key={character.id}
                  className="animate-slide-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CharacterCard
                    name={character.name}
                    description={character.description}
                    image={character.image}
                    selected={selectedCharacter === character.id}
                    onClick={() => setSelectedCharacter(character.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <GeneratorSection 
          selectedStyle={selectedStyleName}
          selectedCharacter={selectedCharacterName}
        />

        <footer className="py-12 px-4 border-t border-border">
          <div className="max-w-7xl mx-auto text-center">
            <div className="font-comic text-2xl text-foreground mb-4">ComicAI</div>
            <p className="text-muted-foreground text-sm">
              用 AI 释放你的创意，创造属于你的漫画世界
            </p>
            <p className="text-muted-foreground/60 text-xs mt-4">
              © 2024 ComicAI. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default HomePage;
