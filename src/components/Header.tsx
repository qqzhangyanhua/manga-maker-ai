import { Button } from "@/components/ui/button";
import { Sparkles, FolderOpen, FileText } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const Header = () => {
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-comic text-2xl text-foreground">ComicAI</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to="/#styles" 
            className={cn(
              "text-muted-foreground hover:text-foreground transition-colors",
              location.pathname === "/" && "text-foreground"
            )}
          >
            漫画风格
          </Link>
          <Link 
            to="/#characters" 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            角色选择
          </Link>
          <Link 
            to="/storyboard" 
            className={cn(
              "text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1",
              location.pathname === "/storyboard" && "text-foreground"
            )}
          >
            <FileText className="w-4 h-4" />
            分镜编辑
          </Link>
          <Link 
            to="/assets" 
            className={cn(
              "text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1",
              location.pathname === "/assets" && "text-foreground"
            )}
          >
            <FolderOpen className="w-4 h-4" />
            资产库
          </Link>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-2">
          <Link to="/storyboard" className="hidden sm:block">
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4" />
              分镜编辑
            </Button>
          </Link>
          <Button variant="glow" size="sm">
            开始创作
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
