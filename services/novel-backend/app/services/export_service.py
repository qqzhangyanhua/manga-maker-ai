"""
小说导出服务
支持 TXT、Word (DOCX)、PDF 三种格式
"""
import io
from typing import List, Literal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import NovelProject, NovelChapter
from ..schemas.export import ExportConfig


class ExportService:
    """小说导出服务"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def export_novel(
        self,
        project_id: str,
        format: Literal["txt", "docx", "pdf"],
        config: ExportConfig
    ) -> bytes:
        """
        导出小说
        
        Args:
            project_id: 项目 ID
            format: 导出格式（txt/docx/pdf）
            config: 导出配置
            
        Returns:
            文件字节流
        """
        # 查询项目和章节
        stmt = (
            select(NovelProject)
            .where(NovelProject.id == project_id)
            .options(selectinload(NovelProject.chapters))
        )
        result = await self.db.execute(stmt)
        project = result.scalar_one_or_none()
        
        if not project:
            raise ValueError(f"项目不存在: {project_id}")
        
        # 获取章节列表（按章节号排序）
        chapters = sorted(project.chapters, key=lambda c: c.chapter_number)
        
        if not chapters:
            raise ValueError("项目没有章节，无法导出")
        
        # 根据格式调用不同的导出方法
        if format == "txt":
            return self._export_txt(project, chapters, config)
        elif format == "docx":
            return self._export_docx(project, chapters, config)
        elif format == "pdf":
            return self._export_pdf(project, chapters, config)
        else:
            raise ValueError(f"不支持的导出格式: {format}")
    
    def _export_txt(
        self,
        project: NovelProject,
        chapters: List[NovelChapter],
        config: ExportConfig
    ) -> bytes:
        """导出为 TXT 纯文本格式"""
        lines = []
        
        # 添加元数据
        if config.include_metadata:
            lines.append(project.title)
            lines.append(f"作者：{project.user_id}")  # 注意：这里需要关联查询用户信息
            if project.description:
                lines.append(f"\n简介：{project.description}")
            lines.append("\n" + "="*50 + "\n")
        
        # 添加章节
        for chapter in chapters:
            # 章节标题
            lines.append(f"\n第{chapter.chapter_number}章 {chapter.title}\n")
            
            # 章节内容
            lines.append(chapter.content)
            
            # 章节分隔符
            if config.chapter_separator:
                lines.append("\n" + "="*50 + "\n")
        
        # 转换为字节流
        text = "\n".join(lines)
        return text.encode("utf-8")
    
    def _export_docx(
        self,
        project: NovelProject,
        chapters: List[NovelChapter],
        config: ExportConfig
    ) -> bytes:
        """导出为 Word (DOCX) 格式"""
        try:
            from docx import Document
            from docx.shared import Pt, RGBColor
            from docx.enum.text import WD_ALIGN_PARAGRAPH
        except ImportError:
            raise ImportError("请安装 python-docx: pip install python-docx")
        
        doc = Document()
        
        # 添加元数据
        if config.include_metadata:
            # 标题
            title = doc.add_heading(project.title, 0)
            title.alignment = WD_ALIGN_PARAGRAPH.CENTER
            
            # 作者
            author_para = doc.add_paragraph(f"作者：{project.user_id}")
            author_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            
            # 简介
            if project.description:
                doc.add_paragraph()
                intro_heading = doc.add_heading("简介", level=2)
                intro_heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
                doc.add_paragraph(project.description)
            
            # 分页
            doc.add_page_break()
        
        # 添加章节
        for chapter in chapters:
            # 章节标题
            chapter_heading = doc.add_heading(
                f"第{chapter.chapter_number}章 {chapter.title}",
                level=1
            )
            
            # 章节内容
            content_para = doc.add_paragraph(chapter.content)
            
            # 设置段落格式
            content_para.paragraph_format.first_line_indent = Pt(24)  # 首行缩进
            content_para.paragraph_format.line_spacing = 1.5  # 行间距
            
            # 章节分页
            if config.chapter_separator:
                doc.add_page_break()
        
        # 保存到字节流
        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer.read()
    
    def _export_pdf(
        self,
        project: NovelProject,
        chapters: List[NovelChapter],
        config: ExportConfig
    ) -> bytes:
        """导出为 PDF 格式"""
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            from reportlab.lib.units import cm
        except ImportError:
            raise ImportError("请安装 reportlab: pip install reportlab")
        
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        
        # 注册中文字体
        try:
            # 尝试使用系统字体
            font_name = config.font_family or "SimSun"
            # 注意：实际部署时需要提供字体文件路径
            # 这里使用 reportlab 内置的字体作为后备
            from reportlab.pdfbase.cidfonts import UnicodeCIDFont
            pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
            font_name = 'STSong-Light'
        except Exception:
            # 如果无法加载中文字体，使用默认字体
            font_name = 'Helvetica'
        
        font_size = config.font_size or 12
        line_height = font_size * 1.5
        margin = 2 * cm
        y = height - margin
        
        # 添加元数据
        if config.include_metadata:
            # 标题
            c.setFont(font_name, 18)
            title_width = c.stringWidth(project.title, font_name, 18)
            c.drawString((width - title_width) / 2, y, project.title)
            y -= 30
            
            # 作者
            c.setFont(font_name, 12)
            author_text = f"作者：{project.user_id}"
            author_width = c.stringWidth(author_text, font_name, 12)
            c.drawString((width - author_width) / 2, y, author_text)
            y -= 20
            
            # 简介
            if project.description:
                y -= 20
                c.setFont(font_name, 10)
                desc_lines = self._wrap_text(
                    project.description,
                    width - 2 * margin,
                    font_name,
                    10,
                    c
                )
                for line in desc_lines:
                    if y < margin:
                        c.showPage()
                        y = height - margin
                    c.drawString(margin, y, line)
                    y -= line_height
            
            # 新页开始正文
            c.showPage()
            y = height - margin
        
        # 添加章节
        c.setFont(font_name, font_size)
        
        for chapter in chapters:
            # 章节标题
            c.setFont(font_name, 14)
            chapter_title = f"第{chapter.chapter_number}章 {chapter.title}"
            c.drawString(margin, y, chapter_title)
            y -= 30
            
            # 章节内容
            c.setFont(font_name, font_size)
            content_lines = self._wrap_text(
                chapter.content,
                width - 2 * margin,
                font_name,
                font_size,
                c
            )
            
            for line in content_lines:
                if y < margin:  # 换页
                    c.showPage()
                    y = height - margin
                    c.setFont(font_name, font_size)
                
                c.drawString(margin, y, line)
                y -= line_height
            
            # 章节分页
            if config.chapter_separator:
                c.showPage()
                y = height - margin
                c.setFont(font_name, font_size)
        
        # 保存 PDF
        c.save()
        buffer.seek(0)
        return buffer.read()
    
    def _wrap_text(
        self,
        text: str,
        max_width: float,
        font_name: str,
        font_size: int,
        canvas_obj: "canvas.Canvas"
    ) -> List[str]:
        """
        文本自动换行
        
        Args:
            text: 要换行的文本
            max_width: 最大宽度（点）
            font_name: 字体名称
            font_size: 字体大小
            canvas_obj: Canvas 对象（用于测量文本宽度）
            
        Returns:
            换行后的文本列表
        """
        lines = []
        paragraphs = text.split('\n')
        
        for paragraph in paragraphs:
            if not paragraph.strip():
                lines.append('')
                continue
            
            words = list(paragraph)  # 中文按字符分割
            current_line = ''
            
            for word in words:
                test_line = current_line + word
                width = canvas_obj.stringWidth(test_line, font_name, font_size)
                
                if width <= max_width:
                    current_line = test_line
                else:
                    if current_line:
                        lines.append(current_line)
                    current_line = word
            
            if current_line:
                lines.append(current_line)
        
        return lines
