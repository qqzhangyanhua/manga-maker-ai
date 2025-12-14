/**
 * Typewriter effect hook for streaming text display
 * 打字机效果：逐字显示文本内容
 */

import { useState, useEffect, useRef } from "react";

interface TypewriterOptions {
  speed?: number; // 每个字符的延迟（毫秒）
  startDelay?: number; // 开始前的延迟
  onComplete?: () => void; // 完成回调
}

/**
 * 打字机效果 hook
 * @param fullText 完整文本
 * @param enabled 是否启用打字机效果
 * @param options 配置选项
 */
export function useTypewriterEffect(
  fullText: string,
  enabled: boolean = true,
  options: TypewriterOptions = {}
): { displayText: string; isTyping: boolean } {
  const { speed = 20, startDelay = 0, onComplete } = options;

  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const currentIndexRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 如果不启用打字机效果，直接显示完整文本
    if (!enabled) {
      setDisplayText(fullText);
      setIsTyping(false);
      return;
    }

    // 如果文本为空，重置状态
    if (!fullText) {
      setDisplayText("");
      setIsTyping(false);
      currentIndexRef.current = 0;
      return;
    }

    // 如果文本变短了（比如被替换），重置
    if (fullText.length < displayText.length) {
      setDisplayText("");
      currentIndexRef.current = 0;
    }

    // 如果已经显示完整，不需要继续
    if (displayText === fullText) {
      setIsTyping(false);
      return;
    }

    setIsTyping(true);

    // 开始延迟
    const startTimer = setTimeout(() => {
      // 逐字添加
      const typeNextChar = () => {
        if (currentIndexRef.current < fullText.length) {
          setDisplayText(fullText.substring(0, currentIndexRef.current + 1));
          currentIndexRef.current++;

          timerRef.current = setTimeout(typeNextChar, speed);
        } else {
          // 打字完成
          setIsTyping(false);
          onComplete?.();
        }
      };

      typeNextChar();
    }, startDelay);

    return () => {
      clearTimeout(startTimer);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [fullText, enabled, speed, startDelay, displayText, onComplete]);

  return { displayText, isTyping };
}

/**
 * 为对象的多个字段应用打字机效果
 */
export function useMultiFieldTypewriter<T extends Record<string, string>>(
  fields: T,
  enabled: boolean = true,
  speed: number = 20
): { displayFields: T; isAnyTyping: boolean } {
  const [displayFields, setDisplayFields] = useState<T>(fields);
  const [activeField, setActiveField] = useState<keyof T | null>(null);
  const fieldKeys = Object.keys(fields) as (keyof T)[];
  const currentFieldIndexRef = useRef(0);
  const currentCharIndexRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      setDisplayFields(fields);
      setActiveField(null);
      return;
    }

    // 重置状态
    currentFieldIndexRef.current = 0;
    currentCharIndexRef.current = 0;
    setDisplayFields({} as T);

    const typeNextChar = () => {
      const fieldIndex = currentFieldIndexRef.current;
      if (fieldIndex >= fieldKeys.length) {
        // 所有字段都完成了
        setActiveField(null);
        return;
      }

      const fieldKey = fieldKeys[fieldIndex];
      const fullText = fields[fieldKey] || "";
      const charIndex = currentCharIndexRef.current;

      if (charIndex < fullText.length) {
        // 继续当前字段的打字
        setDisplayFields((prev) => ({
          ...prev,
          [fieldKey]: fullText.substring(0, charIndex + 1),
        }));
        setActiveField(fieldKey);
        currentCharIndexRef.current++;
        timerRef.current = setTimeout(typeNextChar, speed);
      } else {
        // 当前字段完成，移到下一个字段
        currentFieldIndexRef.current++;
        currentCharIndexRef.current = 0;
        timerRef.current = setTimeout(typeNextChar, speed * 2); // 字段间稍微停顿
      }
    };

    timerRef.current = setTimeout(typeNextChar, 100);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [fields, enabled, speed, fieldKeys]);

  return {
    displayFields,
    isAnyTyping: activeField !== null,
  };
}
