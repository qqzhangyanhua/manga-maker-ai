import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Palette } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0 halftone-pattern opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      <div className="absolute inset-0 action-lines" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8 animate-slide-in">
          <Zap className="w-4 h-4 text-secondary" />
          <span className="text-sm font-semibold text-foreground">AI 驱动的漫画创作平台</span>
        </div>

        {/* Main Title */}
        <h1 className="font-comic text-5xl md:text-7xl lg:text-8xl mb-6 animate-slide-in-delay-1">
          <span className="comic-title">用 AI 创造</span>
          <br />
          <span className="text-foreground">你的专属漫画</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-in-delay-2">
          选择你喜欢的漫画风格和角色，描述场景，让 AI 为你生成独一无二的漫画作品
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-in-delay-3">
          <Button variant="comic" size="xl">
            <Sparkles className="w-5 h-5" />
            立即开始创作
          </Button>
          <Button variant="outline" size="xl">
            <Palette className="w-5 h-5" />
            浏览作品库
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          <div className="text-center">
            <div className="font-comic text-3xl md:text-4xl text-secondary">10+</div>
            <div className="text-sm text-muted-foreground">漫画风格</div>
          </div>
          <div className="text-center">
            <div className="font-comic text-3xl md:text-4xl text-accent">50+</div>
            <div className="text-sm text-muted-foreground">预设角色</div>
          </div>
          <div className="text-center">
            <div className="font-comic text-3xl md:text-4xl text-primary">∞</div>
            <div className="text-sm text-muted-foreground">创意可能</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-foreground/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-foreground/50 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
