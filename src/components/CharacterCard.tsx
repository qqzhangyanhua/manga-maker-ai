import { cn } from "@/lib/utils";

interface CharacterCardProps {
  name: string;
  description: string;
  image: string;
  selected: boolean;
  onClick: () => void;
}

const CharacterCard = ({ name, description, image, selected, onClick }: CharacterCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl transition-all duration-300",
        "bg-card border-2 border-border hover:border-primary",
        "hover:shadow-glow hover:scale-102",
        selected && "border-primary shadow-glow scale-102"
      )}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Avatar */}
        <div className={cn(
          "relative w-16 h-16 rounded-full overflow-hidden border-3 transition-all duration-300",
          selected ? "border-primary" : "border-foreground/20",
          "group-hover:border-primary"
        )}>
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1 text-left">
          <h4 className="font-comic text-lg text-foreground">{name}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {/* Check indicator */}
        <div className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
          selected 
            ? "bg-primary border-primary" 
            : "border-foreground/30 group-hover:border-primary"
        )}>
          {selected && (
            <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
};

export default CharacterCard;
