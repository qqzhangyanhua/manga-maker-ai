"""画布模型服务桩。

路由仍按原样 new 出分析器、镜头规划、漫画生成和角色识别。
测试把这四个名字换成桩，避免请求打到真实模型。
"""
from __future__ import annotations

from typing import Optional


class _Dumpable:
    def __init__(self, payload: dict[str, object]) -> None:
        self._payload = payload

    def model_dump(self) -> dict[str, object]:
        return dict(self._payload)


class StubIdentification:
    def __init__(self) -> None:
        self.identified_characters = [
            _Dumpable(
                {
                    "character_name": "甲",
                    "confidence": 0.9,
                    "reason": "对白点名",
                }
            )
        ]
        self.unmatched_names: list[str] = []
        self.matched_character_ids = ["c1"]


class StubScriptAnalyzer:
    def __init__(self) -> None:
        return None

    async def analyze_chapter(self, chapter_content: str, chapter_number: int) -> list[_Dumpable]:
        return [
            _Dumpable(
                {
                    "segment_order": 1,
                    "content": "桩：室内对白",
                    "scene_description": "室内",
                    "character_actions": "站立",
                    "dialogue": "你好",
                    "estimated_duration": 30,
                    "emotion_tone": "平静",
                    "source_text_start": 0,
                    "source_text_end": 4,
                }
            )
        ]


class StubShotPlanner:
    def __init__(self) -> None:
        return None

    async def plan_shots(
        self,
        script_content: str,
        scene_description: str,
        character_actions: str,
        available_characters: Optional[list[dict[str, object]]] = None,
    ) -> list[_Dumpable]:
        return [
            _Dumpable(
                {
                    "shot_order": 1,
                    "camera_angle": "平视",
                    "shot_size": "中景",
                    "panel_type": "dialogue",
                    "shot_description": "桩：中景对白",
                    "composition_hint": "",
                    "character_ids": ["c1"],
                    "expression_types": ["平静"],
                    "prompt": "桩提示词",
                    "negative_prompt": "",
                    "location_key": "room",
                }
            )
        ]


class StubComicGenerator:
    def __init__(self) -> None:
        return None

    async def generate_finals(
        self,
        scenes: list[object],
        comic_style: str = "manga",
        add_speech_bubbles: bool = True,
    ) -> list[_Dumpable]:
        return [
            _Dumpable(
                {
                    "scene_id": "s1",
                    "shot_id": "h1",
                    "image_url": "",
                    "generation_prompt": "桩：漫画图",
                    "dialogue_layout": None,
                    "has_dialogue": False,
                    "status": "pending",
                }
            )
        ]


class StubCharacterIdentifier:
    def __init__(self) -> None:
        return None

    async def identify_characters(
        self,
        dialogue: Optional[str],
        scene_description: str,
        available_characters: list[dict[str, object]],
    ) -> StubIdentification:
        return StubIdentification()

    async def batch_identify(
        self,
        shots: list[dict[str, object]],
        available_characters: list[dict[str, object]],
    ) -> dict[str, StubIdentification]:
        results: dict[str, StubIdentification] = {}
        for shot in shots:
            shot_id = shot.get("shot_id")
            if isinstance(shot_id, str):
                results[shot_id] = StubIdentification()
        return results


def install_canvas_stubs(monkeypatch: object) -> None:
    from app.routers import canvas as canvas_router

    setattr_ = getattr(monkeypatch, "setattr")
    setattr_(canvas_router, "ScriptAnalyzer", StubScriptAnalyzer)
    setattr_(canvas_router, "ShotPlanner", StubShotPlanner)
    setattr_(canvas_router, "ComicGenerator", StubComicGenerator)
    setattr_(canvas_router, "CharacterIdentifier", StubCharacterIdentifier)
