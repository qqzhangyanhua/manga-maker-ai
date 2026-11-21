"""画布模型服务被桩替换后，接口返回桩的结果，不调用模型。"""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_analyze_script_uses_model_stub(client: TestClient, canvas_services: None) -> None:
    response = client.post(
        "/canvas/analyze-script",
        json={"chapter_content": "甲站在室内。", "chapter_number": 1},
    )

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "segments": [
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
        ],
    }


def test_plan_shots_uses_model_stub(client: TestClient, canvas_services: None) -> None:
    response = client.post(
        "/canvas/plan-shots",
        json={
            "script_content": "甲走进房间",
            "scene_description": "室内",
            "character_actions": "走进",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["shots"][0]["shot_description"] == "桩：中景对白"
    assert body["shots"][0]["prompt"] == "桩提示词"


def test_generate_finals_uses_model_stub(client: TestClient, canvas_services: None) -> None:
    response = client.post(
        "/canvas/generate-finals",
        json={
            "scenes": [
                {
                    "scene_id": "s1",
                    "shot_id": "h1",
                    "image_url": "http://127.0.0.1:9/a.png",
                }
            ],
            "comic_style": "manga",
            "add_speech_bubbles": True,
        },
    )

    assert response.status_code == 200
    assert response.json()["panels"] == [
        {
            "scene_id": "s1",
            "shot_id": "h1",
            "image_url": "",
            "generation_prompt": "桩：漫画图",
            "dialogue_layout": None,
            "has_dialogue": False,
            "status": "pending",
        }
    ]


def test_identify_characters_uses_model_stub(client: TestClient, canvas_services: None) -> None:
    response = client.post(
        "/canvas/identify-characters",
        json={
            "dialogue": "甲：你好",
            "scene_description": "室内",
            "available_characters": [{"id": "c1", "name": "甲"}],
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "identified_characters": [
            {"character_name": "甲", "confidence": 0.9, "reason": "对白点名"}
        ],
        "unmatched_names": [],
        "matched_character_ids": ["c1"],
    }


def test_batch_identify_characters_uses_model_stub(client: TestClient, canvas_services: None) -> None:
    response = client.post(
        "/canvas/batch-identify-characters",
        json={
            "shots": [{"shot_id": "h1", "dialogue": "甲：你好", "description": "室内"}],
            "available_characters": [{"id": "c1", "name": "甲"}],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["results"]["h1"]["matched_character_ids"] == ["c1"]
    assert body["summary"] == {"total_shots": 1, "shots_with_characters": 1}
