import { PanelData } from "@/components/Storyboard/StoryboardPanel";

type PanelDetailsProps = {
  panel: PanelData;
};

export const PanelDetails = ({ panel }: PanelDetailsProps) => {
  return (
    <div className="mt-6 p-4 rounded-lg bg-muted border border-border">
      <h3 className="font-semibold text-foreground mb-2">分镜详情</h3>
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">镜头类型：</span>
          <span className="text-foreground font-semibold">
            {panel.type === "wide" && "远景/全景"}
            {panel.type === "medium" && "中景"}
            {panel.type === "closeup" && "特写"}
            {panel.type === "action" && "动作镜头"}
            {panel.type === "dialogue" && "对话场景"}
            {panel.type === "transition" && "过渡镜头"}
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">画面描述：</span>
          <span className="text-foreground">{panel.description}</span>
        </p>
        {panel.dialogue && (
          <p>
            <span className="text-muted-foreground">对白：</span>
            <span className="text-foreground italic">"{panel.dialogue}"</span>
          </p>
        )}
        {panel.character && (
          <p>
            <span className="text-muted-foreground">角色：</span>
            <span className="text-foreground">{panel.character}</span>
            {panel.emotion && <span className="text-muted-foreground"> ({panel.emotion})</span>}
          </p>
        )}
      </div>
    </div>
  );
};
