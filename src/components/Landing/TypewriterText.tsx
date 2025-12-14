"use client";

import { useEffect, useState, useCallback } from "react";

interface TypewriterTextProps {
  lines: string[];
  typingSpeed?: number;
  lineDelay?: number;
  onLineComplete?: (lineIndex: number) => void;
  onComplete?: () => void;
  loop?: boolean;
  loopDelay?: number;
}

export function TypewriterText({
  lines,
  typingSpeed = 50,
  lineDelay = 500,
  onLineComplete,
  onComplete,
  loop = true,
  loopDelay = 3000,
}: TypewriterTextProps) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const resetAnimation = useCallback(() => {
    setDisplayedLines([]);
    setCurrentLineIndex(0);
    setCurrentCharIndex(0);
    setIsTyping(true);
  }, []);

  useEffect(() => {
    if (!isTyping) return;

    const currentLine = lines[currentLineIndex];
    if (!currentLine) return;

    if (currentCharIndex < currentLine.length) {
      const timeout = setTimeout(() => {
        setDisplayedLines((prev) => {
          const newLines = [...prev];
          newLines[currentLineIndex] =
            (newLines[currentLineIndex] || "") + currentLine[currentCharIndex];
          return newLines;
        });
        setCurrentCharIndex((prev) => prev + 1);
      }, typingSpeed);

      return () => clearTimeout(timeout);
    } else {
      // Line complete
      onLineComplete?.(currentLineIndex);

      if (currentLineIndex < lines.length - 1) {
        const timeout = setTimeout(() => {
          setCurrentLineIndex((prev) => prev + 1);
          setCurrentCharIndex(0);
        }, lineDelay);

        return () => clearTimeout(timeout);
      } else {
        // All lines complete
        setIsTyping(false);
        onComplete?.();

        if (loop) {
          const timeout = setTimeout(() => {
            resetAnimation();
          }, loopDelay);

          return () => clearTimeout(timeout);
        }
      }
    }
  }, [
    currentCharIndex,
    currentLineIndex,
    isTyping,
    lineDelay,
    lines,
    loop,
    loopDelay,
    onComplete,
    onLineComplete,
    resetAnimation,
    typingSpeed,
  ]);

  return (
    <div className="font-mono text-sm leading-relaxed">
      {/* Line numbers + content */}
      <div className="space-y-1">
        {lines.map((line, index) => (
          <div key={index} className="flex">
            <span className="w-8 text-right pr-3 text-slate-600 select-none">
              {index + 1}
            </span>
            <span className="text-slate-300">
              {displayedLines[index] || ""}
              {index === currentLineIndex && isTyping && (
                <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-0.5 align-middle" />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
