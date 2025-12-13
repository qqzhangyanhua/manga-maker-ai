import { useState, useEffect, useCallback } from "react";
import type { SampleProject, SamplesResponse, CopyResponse } from "../types";

interface UseSamplesReturn {
  samples: SampleProject[];
  loading: boolean;
  error: string | null;
  copySample: (id: string) => Promise<CopyResponse>;
  copying: string | null;
}

export function useSamples(): UseSamplesReturn {
  const [samples, setSamples] = useState<SampleProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState<string | null>(null);

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/samples");
        const data: SamplesResponse = await res.json();
        setSamples(data.samples);
      } catch (err) {
        console.error("Failed to fetch samples:", err);
        setError("加载示例项目失败");
      } finally {
        setLoading(false);
      }
    };

    fetchSamples();
  }, []);

  const copySample = useCallback(async (id: string): Promise<CopyResponse> => {
    setCopying(id);
    try {
      const res = await fetch(`/api/samples/${id}/copy`, {
        method: "POST",
      });
      const data: CopyResponse = await res.json();
      return data;
    } catch (err) {
      console.error("Failed to copy sample:", err);
      return { success: false, error: "复制失败，请稍后重试" };
    } finally {
      setCopying(null);
    }
  }, []);

  return {
    samples,
    loading,
    error,
    copySample,
    copying,
  };
}
