import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-comic text-2xl text-foreground">ComicAI</span>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#styles" className="text-muted-foreground hover:text-foreground transition-colors">
            漫画风格
          </a>
          <a href="#characters" className="text-muted-foreground hover:text-foreground transition-colors">
            角色选择
          </a>
          <a href="#gallery" className="text-muted-foreground hover:text-foreground transition-colors">
            作品展示
          </a>
        </nav>

        {/* CTA */}
        <Button variant="glow" size="sm">
          开始创作
        </Button>
      </div>
    </header>
  );
};

export default Header;
