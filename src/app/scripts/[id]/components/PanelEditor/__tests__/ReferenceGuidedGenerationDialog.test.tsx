import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { ReferenceGuidedGenerationDialog } from "../ReferenceGuidedGenerationDialog";
import type { Panel } from "../../../types/script-editor.types";
import type { CharacterReference } from "../../../types/character.types";
import type { CharacterAsset } from "@/components/AssetLibrary/CharacterLibrary";

const toastMock = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

const newCharacter: CharacterAsset = {
  id: "char-2",
  name: "全新角色",
  description: "新建",
  base_image_url: null,
  tags: ["英雄"],
  training_status: "ready",
  usage_count: 0,
  views: [],
  expressions: [],
  outfits: [],
};

vi.mock("@/components/AssetLibrary/CreateCharacterDialog", () => ({
  __esModule: true,
  default: ({ open, onSubmit, onOpenChange }: any) =>
    open ? (
      <button
        data-testid="mock-create"
        onClick={async () => {
          await onSubmit(newCharacter);
          onOpenChange(false);
        }}
      >
        Mock Create
      </button>
    ) : null,
}));

vi.mock("@/components/AssetLibrary/ImageUploadDialog", () => ({
  __esModule: true,
  default: ({ open, onUploadSuccess }: any) =>
    open ? (
      <button data-testid="mock-upload" onClick={() => onUploadSuccess("data:image/png;base64,MOCK")}>
        Mock Upload
      </button>
    ) : null,
}));

const basePanel: Panel = {
  id: "panel-1",
  project_id: "proj-1",
  panel_order: 1,
  description: "测试分镜",
  panel_type: "medium",
  importance: "medium",
  camera_angle: "eye_level",
  shot_size: "medium_shot",
  dialogue: "",
  character_name: "",
  emotion: "",
  visual_prompt: "prompt",
};

const characters: CharacterReference[] = [
  {
    id: "char-1",
    name: "已有人物",
    description: "ready",
    base_image_url: null,
    tags: ["科幻"],
    training_status: "ready",
    views: [],
    expressions: [],
    outfits: [],
  },
];

const setup = (override: Partial<React.ComponentProps<typeof ReferenceGuidedGenerationDialog>> = {}) => {
  const onOpenChange = vi.fn();
  const onGenerated = vi.fn();
  const onCharactersRefresh = vi.fn();
  render(
    <ReferenceGuidedGenerationDialog
      open
      panel={basePanel}
      characters={characters}
      onOpenChange={onOpenChange}
      onGenerated={onGenerated}
      onCharactersRefresh={onCharactersRefresh}
      {...override}
    />
  );
  return { onOpenChange, onGenerated, onCharactersRefresh };
};

describe("ReferenceGuidedGenerationDialog", () => {
  beforeEach(() => {
    toastMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds newly created character into picker并触发刷新", async () => {
    const { onCharactersRefresh } = setup();

    fireEvent.click(screen.getByText("创建角色"));

    const mockButton = await screen.findByTestId("mock-create");
    fireEvent.click(mockButton);

    await waitFor(() => {
      expect(onCharactersRefresh).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText("全新角色")).toBeInTheDocument();
    });
  });

  it("上传三视图时会调用上传接口并提示成功", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl = typeof input === "string" ? input : input.toString();
        if (requestUrl.startsWith("data:image")) {
          return {
            ok: true,
            blob: async () => new Blob(["mock"], { type: "image/png" }),
          } as Response;
        }
        if (requestUrl === "/api/character/upload-image") {
          return {
            ok: true,
            json: async () => ({ image_url: "https://example.com/img.png" }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response;
      });

    setup();

    fireEvent.click(screen.getByText("补充三视图"));
    fireEvent.click(await screen.findByText("正面"));

    const uploadBtn = await screen.findByTestId("mock-upload");
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/character/upload-image",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("提示词生成失败时会弹出错误提示", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "生成失败" }),
    } as Response);

    setup();

    fireEvent.click(screen.getByText("重写提示词"));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "生成提示词失败",
          variant: "destructive",
        })
      );
    });
  });
});
