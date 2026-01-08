"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialDialog } from "@/components/TrialDialog";
import { HeroSection, ShowcaseSection, Navbar, NovelSection, QuickAccessSection, TrialSection, Footer } from "@/components/Landing";

const HomePage = () => {
  const [showTrialDialog, setShowTrialDialog] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      {/* Navbar */}
      <Navbar />

      <main className="pt-16">
        {/* Hero Section with futuristic manga studio style */}
        <HeroSection onOpenTrial={() => setShowTrialDialog(true)} />

        {/* Novel Generation Prompt Section */}
        <NovelSection />

        {/* Showcase Section - Production Logs */}
        <ShowcaseSection />

        {/* Try It Section - Console Style */}
        <TrialSection onOpenTrial={() => setShowTrialDialog(true)} />

        {/* Quick Access - Bento Grid */}
        <QuickAccessSection />

        {/* Footer - Expanded */}
        <Footer />
      </main>

      {/* Trial Dialog */}
      <TrialDialog open={showTrialDialog} onOpenChange={setShowTrialDialog} />
    </div>
  );
};

export default HomePage;
