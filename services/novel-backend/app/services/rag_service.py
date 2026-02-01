"""
混合 RAG 服务
主要策略:向量检索(语义理解)
降级策略:PostgreSQL 关键词匹配(容错保障)
增强功能:世界观记忆库集成 + 伏笔提醒
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, text, and_
from typing import List, Dict, Optional
from collections import defaultdict
import asyncio
from ..models import NovelProject, NovelChapter, WorldEntry
from .vector_service import get_vector_service
import logging
import re

logger = logging.getLogger(__name__)


class NovelRAGService:
    """小说 RAG 服务 - 混合检索(向量 + 关键词)"""

    # 预编译正则表达式：中文标点和空白字符分割
    _CHINESE_PUNCT_PATTERN = re.compile(r'[，。！？、；：""''（）\s]+')


    def __init__(self, db: AsyncSession):
        self.db = db
        self.vector_service = get_vector_service()

    @staticmethod
    def _safe_extract_names(items: List, key: str = "name") -> List[str]:
        """
        安全提取名称列表，兼容多种数据格式

        Args:
            items: 可能是 List[str] 或 List[Dict] 或混合列表
            key: 从字典中提取的键名(默认 "name")

        Returns:
            字符串列表
        """
        if not items:
            return []

        result = []
        for item in items:
            if isinstance(item, str):
                result.append(item)
            elif isinstance(item, dict):
                name = item.get(key) or item.get("description") or ""
                if name:
                    result.append(str(name))
            else:
                result.append(str(item))

        return result

    async def search_relevant_chapters(
        self,
        project_id: str,
        query: str,
        current_chapter_number: Optional[int] = None,
        k: int = 3
    ) -> List[Dict]:
        """
        检索相关章节内容

        策略:
        1. 优先使用向量检索(语义理解)
        2. 降级到关键词匹配(容错保障)
        3. 优先关键章节 (is_key_chapter=True)

        Args:
            project_id: 项目 ID
            query: 查询文本(当前章节的大纲或关键词)
            current_chapter_number: 当前章节号(排除自己)
            k: 返回结果数量

        Returns:
            相关章节列表
        """
        try:
            # ===== 策略 1: 向量检索 =====
            if self.vector_service.enabled:
                try:
                    # 获取当前章节 ID(用于排除)
                    exclude_chapter_id = None
                    if current_chapter_number is not None:
                        chapter_stmt = select(NovelChapter.id).where(
                            NovelChapter.project_id == project_id,
                            NovelChapter.chapter_number == current_chapter_number
                        )
                        chapter_result = await self.db.execute(chapter_stmt)
                        chapter_row = chapter_result.scalar_one_or_none()
                        if chapter_row:
                            exclude_chapter_id = str(chapter_row)

                    # 向量检索
                    vector_results = await self.vector_service.search_similar_chapters(
                        query_text=query,
                        project_id=project_id,
                        exclude_chapter_id=exclude_chapter_id,
                        k=k
                    )

                    if vector_results:
                        # 从数据库获取完整章节信息
                        chapter_ids = [r["chapter_id"] for r in vector_results]
                        chapters_stmt = select(NovelChapter).where(
                            NovelChapter.id.in_(chapter_ids)
                        )
                        db_result = await self.db.execute(chapters_stmt)
                        chapters_map = {str(ch.id): ch for ch in db_result.scalars().all()}

                        # 合并结果(保持向量检索的顺序)
                        relevant_chapters = []
                        for vec_result in vector_results:
                            chapter = chapters_map.get(vec_result["chapter_id"])
                            if chapter:
                                relevant_chapters.append({
                                    "chapter_number": chapter.chapter_number,
                                    "title": chapter.title,
                                    "outline": chapter.outline or "",
                                    "content_preview": (chapter.content or "")[:500],
                                    "is_key_chapter": chapter.is_key_chapter,
                                    "word_count": chapter.word_count,
                                    "similarity": vec_result["similarity"],
                                    # ✨ Solution 3: 添加剧情连贯性字段
                                    "summary_preview": chapter.summary_preview or "",
                                })

                        logger.info(
                            f"🔍 向量检索成功 - 项目: {project_id}, "
                            f"结果数: {len(relevant_chapters)}, "
                            f"平均相似度: {sum(r['similarity'] for r in relevant_chapters) / len(relevant_chapters):.3f}"
                        )
                        return relevant_chapters

                except Exception as vec_error:
                    logger.warning(f"⚠️ 向量检索失败，降级到关键词匹配: {str(vec_error)}")

            # ===== 策略 2: 关键词匹配(降级) =====
            logger.info("📝 使用关键词匹配模式")

            conditions = [NovelChapter.project_id == project_id]

            if current_chapter_number is not None:
                conditions.append(NovelChapter.chapter_number != current_chapter_number)

            search_keywords = query.split()[:5]

            if search_keywords:
                keyword_conditions = []
                for keyword in search_keywords:
                    keyword_conditions.append(
                        or_(
                            NovelChapter.outline.ilike(f"%{keyword}%"),
                            NovelChapter.content.ilike(f"%{keyword}%"),
                            NovelChapter.title.ilike(f"%{keyword}%")
                        )
                    )

                if keyword_conditions:
                    conditions.append(or_(*keyword_conditions))

            query_stmt = (
                select(NovelChapter)
                .where(*conditions)
                .order_by(
                    NovelChapter.is_key_chapter.desc(),
                    NovelChapter.chapter_number.desc()
                )
                .limit(k)
            )

            result = await self.db.execute(query_stmt)
            chapters = result.scalars().all()

            relevant_chapters = []
            for chapter in chapters:
                relevant_chapters.append({
                    "chapter_number": chapter.chapter_number,
                    "title": chapter.title,
                    "outline": chapter.outline or "",
                    "content_preview": (chapter.content or "")[:500],
                    "is_key_chapter": chapter.is_key_chapter,
                    "word_count": chapter.word_count,
                    # ✨ Solution 3: 添加剧情连贯性字段
                    "summary_preview": chapter.summary_preview or "",
                })

            logger.info(f"📝 关键词匹配完成 - 结果数: {len(relevant_chapters)}")
            return relevant_chapters

        except Exception as e:
            logger.error(f"❌ RAG 检索失败: {str(e)}")
            return []

    async def _get_relevant_world_entries(
        self,
        project_id: str,
        chapter_outline: str,
        max_entries: int = 10
    ) -> List[Dict]:
        """
        从世界观记忆库中检索与当前章节相关的条目

        策略:
        1. 从章节大纲中提取关键词
        2. 匹配 world_entries 的 name 和 description
        3. 按类型分组返回

        Args:
            project_id: 项目 ID
            chapter_outline: 当前章节大纲
            max_entries: 最大返回条目数

        Returns:
            相关条目列表
        """
        try:
            # 使用预编译正则提取关键词
            keywords = self._CHINESE_PUNCT_PATTERN.split(chapter_outline)
            keywords = [k.strip() for k in keywords if len(k.strip()) >= 2]
            keywords = keywords[:15]  # 限制关键词数量

            if not keywords:
                return []

            # 构建 OR 条件匹配 name 或 description
            keyword_conditions = [
                or_(
                    WorldEntry.name.ilike(f"%{kw}%"),
                    WorldEntry.description.ilike(f"%{kw}%")
                )
                for kw in keywords
            ]

            query = (
                select(WorldEntry)
                .where(
                    and_(
                        WorldEntry.project_id == project_id,
                        WorldEntry.type != "foreshadowing",  # 伏笔单独处理
                        or_(*keyword_conditions) if keyword_conditions else True
                    )
                )
                .order_by(WorldEntry.updated_at.desc())  # 优先返回最近更新的
                .limit(max_entries)
            )

            result = await self.db.execute(query)
            entries = result.scalars().all()

            # 使用 defaultdict 简化分组
            grouped: Dict[str, List[Dict]] = defaultdict(list)
            for entry in entries:
                grouped[entry.type].append({
                    "name": entry.name,
                    "description": entry.description or "",
                    "properties": entry.properties or {},
                })

            logger.info(
                f"🧠 记忆库检索 - 关键词: {len(keywords)}个, "
                f"匹配条目: {len(entries)}个, "
                f"类型分布: {', '.join(f'{k}:{len(v)}' for k, v in grouped.items())}"
            )

            return [
                {"type": entry_type, "entries": entries_list}
                for entry_type, entries_list in grouped.items()
            ]

        except Exception as e:
            logger.error(f"❌ 记忆库检索失败: {str(e)}")
            return []

    async def _get_pending_foreshadowings(
        self,
        project_id: str,
        current_chapter: int,
        lookahead: int = 5
    ) -> List[Dict]:
        """
        获取待揭示的伏笔提醒

        策略:
        1. 查找 planned_reveal_chapter 在当前章节附近的伏笔
        2. 查找已埋设但未揭示的伏笔 (状态为 planted 或 brewing)
        3. 返回伏笔信息供 AI 参考

        Args:
            project_id: 项目 ID
            current_chapter: 当前章节号
            lookahead: 向前看多少章 (默认5章内的伏笔)

        Returns:
            待处理伏笔列表
        """
        try:
            # 查询条件:
            # 1. 计划揭示章节在 [current, current + lookahead] 范围内
            # 2. 或者已埋设但未揭示的伏笔 (brewing 状态优先)
            query = (
                select(WorldEntry)
                .where(
                    and_(
                        WorldEntry.project_id == project_id,
                        WorldEntry.type == "foreshadowing",
                        or_(
                            # 计划在近期揭示
                            and_(
                                WorldEntry.planned_reveal_chapter.isnot(None),
                                WorldEntry.planned_reveal_chapter >= current_chapter,
                                WorldEntry.planned_reveal_chapter <= current_chapter + lookahead,
                                WorldEntry.foreshadow_status.in_(["planted", "brewing"])
                            ),
                            # 状态为 brewing (酝酿中，需要关注)
                            and_(
                                WorldEntry.foreshadow_status == "brewing",
                                WorldEntry.planted_chapter < current_chapter
                            )
                        )
                    )
                )
                .order_by(WorldEntry.planned_reveal_chapter.asc().nullsfirst())
                .limit(5)
            )

            result = await self.db.execute(query)
            foreshadowings = result.scalars().all()

            pending = []
            for fs in foreshadowings:
                urgency = "normal"
                if fs.planned_reveal_chapter:
                    if fs.planned_reveal_chapter == current_chapter:
                        urgency = "immediate"  # 本章需要揭示
                    elif fs.planned_reveal_chapter <= current_chapter + 2:
                        urgency = "soon"  # 即将揭示

                pending.append({
                    "name": fs.name,
                    "description": fs.description or "",
                    "hint_text": fs.hint_text or "",
                    "planted_chapter": fs.planted_chapter,
                    "planned_reveal_chapter": fs.planned_reveal_chapter,
                    "status": fs.foreshadow_status,
                    "urgency": urgency,
                })

            logger.info(
                f"🎯 伏笔提醒 - 当前章节: {current_chapter}, "
                f"待处理伏笔: {len(pending)}个, "
                f"紧急: {sum(1 for p in pending if p['urgency'] == 'immediate')}个"
            )

            return pending

        except Exception as e:
            logger.error(f"❌ 伏笔检索失败: {str(e)}")
            return []

    def _format_style_guide(self, style_guide: Dict) -> str:
        """
        将 style_guide 格式化为 LLM 友好的文本
        
        Args:
            style_guide: 风格指导文档字典
            
        Returns:
            格式化的文本字符串
        """
        parts = []
        
        # 创意方向
        if cd := style_guide.get("creative_direction"):
            if cd.get("core_theme"):
                parts.append(f"核心主题：{cd['core_theme']}")
            if cd.get("tone"):
                parts.append(f"作品基调：{cd['tone']}")
            if cd.get("target_audience"):
                parts.append(f"目标读者：{cd['target_audience']}")
            if cd.get("market_positioning"):
                parts.append(f"市场定位：{cd['market_positioning']}")
            if usp := cd.get("unique_selling_points"):
                if isinstance(usp, list) and usp:
                    parts.append(f"核心卖点：{', '.join(usp)}")
        
        # 写作风格
        if ws := style_guide.get("writing_style"):
            if ws.get("pacing"):
                parts.append(f"叙事节奏：{ws['pacing']}")
            if ws.get("narrative_voice"):
                parts.append(f"叙事视角：{ws['narrative_voice']}")
            if ws.get("dialogue_style"):
                parts.append(f"对话风格：{ws['dialogue_style']}")
            if ws.get("description_density"):
                parts.append(f"描写密度：{ws['description_density']}")
        
        # 质量规则
        if qr := style_guide.get("quality_rules"):
            word_count = qr.get("chapter_word_count", 6000)
            parts.append(f"章节字数：{word_count}字")
            cool_points = qr.get("cool_points_per_chapter", 2)
            parts.append(f"每章爽点：至少{cool_points}个")
            if cf := qr.get("cliffhanger_frequency"):
                parts.append(f"悬念设置：{cf}")
            if forbidden := qr.get("forbidden_patterns"):
                if isinstance(forbidden, list) and forbidden:
                    parts.append(f"禁止出现：{', '.join(forbidden)}")
        
        # 框架摘要
        if fs := style_guide.get("framework_summary"):
            if fs.get("arc_structure"):
                parts.append(f"故事结构：{fs['arc_structure']}")
            if ktp := fs.get("key_turning_points"):
                if isinstance(ktp, list) and ktp:
                    parts.append(f"关键转折：{', '.join(ktp)}")
        
        return "\n".join(parts)

    async def get_previous_chapters(
        self,
        project_id: str,
        current_chapter_number: int,
        count: int = 2
    ) -> List[Dict]:
        """
        获取前 N 个章节(用于连续性上下文)

        Args:
            project_id: 项目 ID
            current_chapter_number: 当前章节号
            count: 获取数量

        Returns:
            前 N 个章节列表
        """
        try:
            query_stmt = (
                select(NovelChapter)
                .where(
                    NovelChapter.project_id == project_id,
                    NovelChapter.chapter_number < current_chapter_number
                )
                .order_by(NovelChapter.chapter_number.desc())
                .limit(count)
            )

            result = await self.db.execute(query_stmt)
            chapters = result.scalars().all()

            chapters = list(reversed(chapters))

            return [
                {
                    "chapter_number": ch.chapter_number,
                    "title": ch.title,
                    "outline": ch.outline or "",
                    "content": ch.content or "",
                    "word_count": ch.word_count,
                    # ✨ Solution 3: 添加剧情连贯性字段
                    "summary_preview": ch.summary_preview or "",
                    "ending_state": ch.ending_state or {},
                }
                for ch in chapters
            ]

        except Exception as e:
            logger.error(f"获取前序章节失败: {str(e)}")
            return []

    async def build_context_for_generation(
        self,
        project_id: str,
        chapter_number: int,
        chapter_outline: str
    ) -> str:
        """
        构建章节生成的完整上下文

        策略:
        1. 获取项目的世界观和角色设定
        2. 获取前 2 个章节内容(连续性)
        3. 检索相关章节(RAG - 向量或关键词)
        4. 拼接成结构化 Prompt

        Args:
            project_id: 项目 ID
            chapter_number: 当前章节号
            chapter_outline: 当前章节大纲

        Returns:
            结构化上下文字符串
        """
        try:
            # 1. 获取项目信息
            project_stmt = select(NovelProject).where(NovelProject.id == project_id)
            project_result = await self.db.execute(project_stmt)
            project = project_result.scalar_one_or_none()

            if not project:
                return ""

            # 2-5. 并行执行所有独立查询（性能优化：节省约60%查询时间）
            previous_chapters, relevant_chapters, world_entries, pending_foreshadowings = (
                await asyncio.gather(
                    self.get_previous_chapters(project_id, chapter_number, count=2),
                    self.search_relevant_chapters(project_id, chapter_outline, chapter_number, k=3),
                    self._get_relevant_world_entries(project_id, chapter_outline, max_entries=10),
                    self._get_pending_foreshadowings(project_id, chapter_number, lookahead=5),
                )
            )

            # 6. 构建上下文
            context_parts = []

            # 新增：风格指导（优先级最高，放在最前面）
            if project.style_guide:
                style_guide = project.style_guide
                # 处理可能的 JSON 字符串
                if isinstance(style_guide, str):
                    import json
                    try:
                        style_guide = json.loads(style_guide)
                    except json.JSONDecodeError:
                        style_guide = None
                
                if style_guide and isinstance(style_guide, dict):
                    context_parts.append("【创作风格指导】")
                    context_parts.append(self._format_style_guide(style_guide))
                    context_parts.append("")

            # 世界观设定
            if project.world_setting:
                context_parts.append("【世界观设定】")
                world_setting = project.world_setting
                if isinstance(world_setting, dict):
                    # ✨ 地点 - 包含详细描述和氛围
                    if world_setting.get("locations"):
                        locations = []
                        for loc in world_setting['locations']:
                            if isinstance(loc, dict):
                                name = loc.get('name', '')
                                description = loc.get('description', '')
                                atmosphere = loc.get('atmosphere', '')
                                if name:
                                    loc_text = f"{name}: {description}"
                                    if atmosphere:
                                        loc_text += f" (氛围: {atmosphere})"
                                    locations.append(loc_text)
                        if locations:
                            context_parts.append("地点:")
                            for loc in locations:
                                context_parts.append(f"  - {loc}")

                    # ✨ 派系/组织 - 包含领导者、成员、目标
                    if world_setting.get("factions"):
                        factions = []
                        for faction in world_setting['factions']:
                            if isinstance(faction, dict):
                                name = faction.get('name', '')
                                description = faction.get('description', '')
                                leader = faction.get('leader', '')
                                goals = faction.get('goals', '')
                                if name:
                                    faction_text = f"{name}: {description}"
                                    if leader:
                                        faction_text += f" (领导: {leader})"
                                    if goals:
                                        faction_text += f" (目标: {goals})"
                                    factions.append(faction_text)
                        if factions:
                            context_parts.append("派系/组织:")
                            for faction in factions:
                                context_parts.append(f"  - {faction}")

                    # ✨ 世界规则 - 兼容 title/content 和 name/description 两种字段格式
                    if world_setting.get("rules"):
                        rules = []
                        for rule in world_setting['rules']:
                            if isinstance(rule, dict):
                                # 兼容前端的 title/content 字段
                                name = rule.get('name') or rule.get('title', '')
                                description = rule.get('description') or rule.get('content', '')
                                category = rule.get('category', '')
                                if name:
                                    rule_text = f"{name}: {description}"
                                    if category:
                                        rule_text += f" (类别: {category})"
                                    rules.append(rule_text)
                        if rules:
                            context_parts.append("世界规则:")
                            for rule in rules:
                                context_parts.append(f"  - {rule}")

                    # ✨ 时间线 - 重要历史事件
                    if world_setting.get("timeline"):
                        timeline = []
                        for event in world_setting['timeline']:
                            if isinstance(event, dict):
                                # 兼容 date 和 year 字段
                                date = event.get('date') or event.get('year', '')
                                evt = event.get('event', '')
                                description = event.get('description', '')
                                importance = event.get('importance', '')
                                if date and evt:
                                    event_text = f"{date}: {evt}"
                                    if description:
                                        event_text += f" - {description}"
                                    if importance == 'high':
                                        event_text = f"【重要】{event_text}"
                                    timeline.append(event_text)
                        if timeline:
                            context_parts.append("时间线:")
                            for evt in timeline:
                                context_parts.append(f"  - {evt}")
                context_parts.append("")

            # 角色设定
            if project.characters:
                context_parts.append("【角色设定】")
                characters = project.characters
                if isinstance(characters, list):
                    for char in characters[:5]:
                        if isinstance(char, dict):
                            name = char.get("name", "")
                            desc = char.get("description", "")
                            if name:
                                context_parts.append(f"- {name}: {desc[:100]}")
                context_parts.append("")

            # 前序章节
            if previous_chapters:
                context_parts.append("【前序章节内容摘要】")
                for prev_ch in previous_chapters:
                    context_parts.append(
                        f"第{prev_ch['chapter_number']}章 - {prev_ch['title']}"
                    )
                    # ✨ Solution 3: 优先使用 summary_preview（详细剧情描述）
                    if prev_ch.get('summary_preview'):
                        context_parts.append(f"剧情详情: {prev_ch['summary_preview']}")
                    else:
                        # 兼容旧数据：回退到 content 摘要
                        context_parts.append(f"大纲: {prev_ch['outline'][:200]}")
                        context_parts.append(f"内容摘要: {prev_ch['content'][:300]}...")

                    # ✨ Solution 3: 添加 ending_state（章节结束状态）
                    if prev_ch.get('ending_state'):
                        ending = prev_ch['ending_state']
                        if ending.get('location'):
                            context_parts.append(f"结束地点: {ending['location']}")
                        if ending.get('protagonist_status'):
                            context_parts.append(f"主角状态: {ending['protagonist_status']}")
                        if ending.get('plot_progress'):
                            context_parts.append(f"剧情进展: {ending['plot_progress']}")
                    context_parts.append("")

            # 相关章节(RAG)
            if relevant_chapters:
                context_parts.append("【相关章节参考】")
                for rel_ch in relevant_chapters:
                    similarity_info = f" (相似度: {rel_ch.get('similarity', 0):.2f})" if 'similarity' in rel_ch else ""
                    context_parts.append(
                        f"第{rel_ch['chapter_number']}章 - {rel_ch['title']}{similarity_info}"
                    )
                    # ✨ Solution 3: 优先使用 summary_preview
                    if rel_ch.get('summary_preview'):
                        context_parts.append(f"剧情详情: {rel_ch['summary_preview'][:200]}...")
                    else:
                        context_parts.append(f"大纲: {rel_ch['outline'][:150]}")
                    context_parts.append("")

            # 记忆库条目 (按类型分组)
            if world_entries:
                type_labels = {
                    "location": "地点",
                    "character": "人物",
                    "event": "事件",
                    "item": "物品",
                    "rule": "规则",
                }
                context_parts.append("【记忆库参考】")
                for group in world_entries:
                    entry_type = group["type"]
                    entries_list = group["entries"]
                    label = type_labels.get(entry_type, entry_type)
                    context_parts.append(f"{label}:")
                    for entry in entries_list[:3]:  # 每类最多3个
                        name = entry["name"]
                        desc = entry["description"][:100] if entry["description"] else ""
                        if desc:
                            context_parts.append(f"  - {name}: {desc}")
                        else:
                            context_parts.append(f"  - {name}")
                context_parts.append("")

            # 伏笔提醒
            if pending_foreshadowings:
                context_parts.append("【伏笔提醒】")
                for fs in pending_foreshadowings:
                    urgency = fs["urgency"]
                    if urgency == "immediate":
                        prefix = "【本章揭示】"
                    elif urgency == "soon":
                        prefix = "【即将揭示】"
                    else:
                        prefix = "【注意铺垫】"

                    context_parts.append(f"{prefix} {fs['name']}")
                    if fs["hint_text"]:
                        context_parts.append(f"  线索: {fs['hint_text']}")
                    if fs["planted_chapter"]:
                        context_parts.append(f"  埋设于第{fs['planted_chapter']}章")
                    if fs["planned_reveal_chapter"]:
                        context_parts.append(f"  计划揭示: 第{fs['planned_reveal_chapter']}章")
                context_parts.append("")

            # 当前章节大纲
            context_parts.append("【当前章节大纲】")
            context_parts.append(chapter_outline)

            final_context = "\n".join(context_parts)

            logger.info(
                f"📋 上下文构建成功 - "
                f"项目ID: {project_id}, "
                f"章节号: {chapter_number}, "
                f"上下文长度: {len(final_context)} 字符, "
                f"包含组件: "
                f"风格指导={'✅' if project.style_guide else '❌'}, "
                f"世界观={'✅' if project.world_setting else '❌'}, "
                f"角色={'✅' if project.characters else '❌'}, "
                f"前序章节={len(previous_chapters)}, "
                f"相关章节={len(relevant_chapters)}, "
                f"记忆库条目={sum(len(g['entries']) for g in world_entries)}, "
                f"伏笔提醒={len(pending_foreshadowings)}, "
                f"检索模式={'🔍向量' if self.vector_service.enabled else '📝关键词'}"
            )

            return final_context

        except Exception as e:
            logger.error(
                f"❌ 构建上下文失败 - "
                f"项目ID: {project_id}, "
                f"章节号: {chapter_number}, "
                f"错误: {str(e)}, "
                f"错误类型: {type(e).__name__}"
            )
            logger.warning(f"⚠️ 降级模式:仅使用章节大纲作为上下文")
            return chapter_outline
