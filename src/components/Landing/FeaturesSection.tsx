"use client";

import { Fingerprint, FileCode, LayoutGrid, Layers, Cpu, Scan } from "lucide-react";
import { cn } from "@/lib/utils";

export function FeaturesSection() {
  return (
    <section className="relative px-4 py-24 bg-[#0c0c0e]">
      {/* Top separator line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-mono uppercase tracking-widest text-zinc-500">
              System Modules
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Core Processing Units
          </h2>
          <p className="text-zinc-400 max-w-xl font-mono text-sm">
            Modular architecture. Each component operates independently with shared memory pools.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-1">
          {/* Module A: Entity Persistence - Primary Module */}
          <div className="md:col-span-4 lg:col-span-4 row-span-2 bg-zinc-900 border border-zinc-800 p-6 group hover:border-orange-500/50 transition-colors">
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500/10 text-orange-500">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Entity Persistence</h3>
                  <p className="text-xs font-mono text-zinc-500">ID_LOCK_v3.2</p>
                </div>
                <div className="ml-auto px-2 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-500 text-xs font-mono">
                  CORE_MODULE
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                Proprietary ID-locking algorithm ensures character facial stability across 100+ frames.
                Zero drift. Zero variance.
              </p>

              {/* Visual: 3 character thumbnails with face-lock lines */}
              <div className="flex-1 flex items-center justify-center py-4">
                <div className="relative flex items-center gap-6">
                  {/* Character thumbnails */}
                  {[
                    { frame: "F_001", status: "LOCKED" },
                    { frame: "F_054", status: "LOCKED" },
                    { frame: "F_127", status: "LOCKED" },
                  ].map((char, idx) => (
                    <div key={idx} className="relative">
                      {/* Character card */}
                      <div className="w-24 h-32 bg-zinc-800 border border-zinc-700 overflow-hidden group-hover:border-zinc-600 transition-colors">
                        {/* Silhouette placeholder */}
                        <div className="h-full flex flex-col items-center justify-center p-2">
                          {/* Head circle */}
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-zinc-700 border-2 border-zinc-600" />
                            {/* Face lock indicator */}
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
                              <Scan className="w-2 h-2 text-emerald-500" />
                            </div>
                          </div>
                          {/* Body */}
                          <div className="w-8 h-12 mt-1 bg-zinc-700 rounded-t-lg" />
                        </div>
                      </div>
                      {/* Label */}
                      <div className="mt-2 text-center">
                        <div className="text-xs font-mono text-zinc-500">{char.frame}</div>
                        <div className="text-[10px] font-mono text-emerald-500">{char.status}</div>
                      </div>
                    </div>
                  ))}

                  {/* Connecting lines - green face-lock lines */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ overflow: "visible" }}
                  >
                    <line
                      x1="48"
                      y1="20"
                      x2="144"
                      y2="20"
                      stroke="#22c55e"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                      opacity="0.6"
                    />
                    <line
                      x1="168"
                      y1="20"
                      x2="264"
                      y2="20"
                      stroke="#22c55e"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                      opacity="0.6"
                    />
                  </svg>
                </div>
              </div>

              {/* Stats footer */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
                <div>
                  <div className="text-2xl font-bold font-mono text-white">99.2%</div>
                  <div className="text-xs font-mono text-zinc-500">MATCH_RATE</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-white">100+</div>
                  <div className="text-xs font-mono text-zinc-500">FRAME_SPAN</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-emerald-500">ACTIVE</div>
                  <div className="text-xs font-mono text-zinc-500">ID_STATUS</div>
                </div>
              </div>
            </div>
          </div>

          {/* Module B: Script Parsing */}
          <div className="md:col-span-2 lg:col-span-2 bg-zinc-900 border border-zinc-800 p-5 group hover:border-orange-500/50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500/10 text-orange-500">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Script Parsing</h3>
                <p className="text-xs font-mono text-zinc-500">NLP_ENGINE</p>
              </div>
            </div>

            <p className="text-xs text-zinc-500 mb-4">
              Structured extraction from raw screenplay input. Scene, action, dialogue mapped to render params.
            </p>

            {/* Visual: Code block */}
            <div className="bg-black/40 p-3 border border-zinc-800 font-mono text-xs">
              <div className="text-zinc-600">{"// input.txt"}</div>
              <div className="text-zinc-400 mt-1">[SCENE: cliff, sunset]</div>
              <div className="text-zinc-400">[ACTION: turn, dramatic]</div>
              <div className="text-orange-400 mt-2">→ render_params.json</div>
            </div>
          </div>

          {/* Module C: Auto-Layout */}
          <div className="md:col-span-2 lg:col-span-2 bg-zinc-900 border border-zinc-800 p-5 group hover:border-orange-500/50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500/10 text-orange-500">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Auto-Layout</h3>
                <p className="text-xs font-mono text-zinc-500">GRID_GEN</p>
              </div>
            </div>

            <p className="text-xs text-zinc-500 mb-4">
              Panel composition based on narrative weight. Dynamic grid allocation.
            </p>

            {/* Visual: Grid preview */}
            <div className="grid grid-cols-3 gap-1 h-20">
              <div className="col-span-2 bg-zinc-800 border border-zinc-700" />
              <div className="bg-zinc-800 border border-zinc-700" />
              <div className="bg-zinc-800 border border-zinc-700" />
              <div className="col-span-2 bg-zinc-800 border border-zinc-700" />
            </div>
          </div>

          {/* Module D: Layered PSD Export */}
          <div className="md:col-span-2 lg:col-span-3 bg-zinc-900 border border-zinc-800 p-5 group hover:border-orange-500/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 text-orange-500">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Layered PSD Export</h3>
                  <p className="text-xs font-mono text-zinc-500">EXPORT_v2</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-500 mb-4">
              Full layer separation. Background, characters, effects, text on discrete channels.
            </p>

            {/* Visual: Layer stack */}
            <div className="space-y-1">
              {[
                { name: "TEXT_LAYER", color: "bg-amber-500" },
                { name: "FX_LAYER", color: "bg-purple-500" },
                { name: "CHAR_LAYER", color: "bg-orange-500" },
                { name: "BG_LAYER", color: "bg-zinc-600" },
              ].map((layer, idx) => (
                <div
                  key={layer.name}
                  className="flex items-center gap-2 px-2 py-1 bg-zinc-800/50 border border-zinc-700"
                  style={{ marginLeft: `${idx * 8}px` }}
                >
                  <div className={cn("w-2 h-2", layer.color)} />
                  <span className="text-[10px] font-mono text-zinc-400">{layer.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Output Formats */}
          <div className="md:col-span-2 lg:col-span-3 bg-zinc-900 border border-zinc-800 p-5 group hover:border-orange-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-zinc-500 mb-1">OUTPUT_FORMATS</div>
                <div className="text-white font-semibold text-sm">Export Pipeline</div>
              </div>
              <div className="flex gap-2">
                {["PSD", "PNG", "PDF", "TIFF"].map((fmt) => (
                  <div
                    key={fmt}
                    className={cn(
                      "px-2 py-1 border text-xs font-mono",
                      fmt === "PSD"
                        ? "bg-orange-500/10 border-orange-500/30 text-orange-500"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400"
                    )}
                  >
                    {fmt}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
