import Link from "next/link";
import { Button } from "@/components/ui/button";

const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1410' }}>
    <div className="text-center space-y-6">
      <div className="text-6xl font-comic text-foreground">404</div>
      <p className="text-muted-foreground">页面走丢了，返回首页继续创作吧。</p>
      <Link href="/">
        <Button variant="comic">返回首页</Button>
      </Link>
    </div>
  </div>
);

export default NotFoundPage;
