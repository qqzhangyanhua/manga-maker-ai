import { cn } from "@/lib/utils";

interface StyleCardProps {
  name: string;
  nameEn: string;
  image: string;
  color: string;
  selected: boolean;
  onClick: () => void;
}

const StyleCard = ({ name, nameEn, image, color, selected, onClick }: StyleCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "comic-card group relative w-full aspect-[3/4] overflow-hidden transition-all duration-300",
        "hover:scale-105 hover:-rotate-1",
        selected && "ring-4 ring-primary scale-105"
      )}
    >
      {/* Image */}
      <img
        src={image}
        alt={name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div 
          className={cn(
            "inline-block px-3 py-1 rounded-full text-xs font-bold mb-2",
            color
          )}
        >
          {nameEn}
        </div>
        <h3 className="font-comic text-2xl text-foreground text-comic-shadow">
          {name}
        </h3>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-3 right-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center animate-scale-in">
          <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
};

export default StyleCard;
