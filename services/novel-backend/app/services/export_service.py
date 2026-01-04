"""
导出服务 - 支持 TXT、Word、PDF 格式
"""
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from io import BytesIO
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class NovelExportService:
    """小说导出服务"""
    
    def __init__(self):
        pass
    
    def export_to_txt(
        self,
        project_title: str,
        chapters: List[Dict],
        include_outline: bool = False
    ) -> bytes:
        """
        导出为 TXT 纯文本
        
        Args:
            project_title: 项目标题
            chapters: 章节列表
            include_outline: 是否包含章节大纲
        
        Returns:
            TXT 文件内容（bytes）
        """
        try:
            lines = []
            
            # 标题
            lines.append(f"{project_title}\n")
            lines.append("=" * 50 + "\n\n")
            
            # 章节内容
            for chapter in chapters:
                # 章节标题
                lines.append(f"\n\n第{chapter['chapter_number']}章 {chapter['title']}\n")
                lines.append("-" * 40 + "\n\n")
                
                # 章节大纲（可选）
                if include_outline and chapter.get('outline'):
                    lines.append(f"【大纲】\n{chapter['outline']}\n\n")
                
                # 章节正文
                if chapter.get('content'):
                    lines.append(chapter['content'])
                    lines.append("\n\n")
                else:
                    lines.append("（内容为空）\n\n")
            
            # 统计信息
            total_words = sum(len(ch.get('content', '')) for ch in chapters)
            lines.append("\n" + "=" * 50 + "\n")
            lines.append(f"全文完 | 共 {len(chapters)} 章 | 总计 {total_words} 字\n")
            
            content = "".join(lines)
            return content.encode('utf-8')
            
        except Exception as e:
            logger.error(f"导出 TXT 失败: {str(e)}")
            raise
    
    def export_to_word(
        self,
        project_title: str,
        project_description: str,
        chapters: List[Dict],
        include_outline: bool = False
    ) -> bytes:
        """
        导出为 Word (.docx)
        
        Args:
            project_title: 项目标题
            project_description: 项目描述
            chapters: 章节列表
            include_outline: 是否包含章节大纲
        
        Returns:
            Word 文件内容（bytes）
        """
        try:
            doc = Document()
            
            # 设置标题样式
            title = doc.add_heading(project_title, level=0)
            title.alignment = WD_ALIGN_PARAGRAPH.CENTER
            
            # 项目描述
            if project_description:
                desc = doc.add_paragraph(project_description)
                desc.alignment = WD_ALIGN_PARAGRAPH.CENTER
                desc_format = desc.paragraph_format
                desc_format.space_after = Pt(12)
            
            doc.add_page_break()
            
            # 章节内容
            for chapter in chapters:
                # 章节标题
                chapter_title = doc.add_heading(
                    f"第{chapter['chapter_number']}章 {chapter['title']}", 
                    level=1
                )
                chapter_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
                
                # 章节大纲（可选）
                if include_outline and chapter.get('outline'):
                    outline_para = doc.add_paragraph()
                    outline_run = outline_para.add_run(f"【大纲】{chapter['outline']}")
                    outline_run.font.size = Pt(10)
                    outline_run.font.color.rgb = RGBColor(128, 128, 128)
                    outline_para.paragraph_format.space_after = Pt(12)
                
                # 章节正文
                if chapter.get('content'):
                    # 分段处理
                    paragraphs = chapter['content'].split('\n')
                    for para_text in paragraphs:
                        if para_text.strip():
                            para = doc.add_paragraph(para_text.strip())
                            para_format = para.paragraph_format
                            para_format.line_spacing = 1.5  # 1.5 倍行距
                            para_format.first_line_indent = Inches(0.3)  # 首行缩进
                else:
                    doc.add_paragraph("（内容为空）")
                
                # 章节分页
                if chapter != chapters[-1]:
                    doc.add_page_break()
            
            # 统计信息
            doc.add_page_break()
            total_words = sum(len(ch.get('content', '')) for ch in chapters)
            stats = doc.add_paragraph(
                f"全文完\n\n"
                f"共 {len(chapters)} 章\n"
                f"总计 {total_words:,} 字"
            )
            stats.alignment = WD_ALIGN_PARAGRAPH.CENTER
            
            # 保存到内存
            buffer = BytesIO()
            doc.save(buffer)
            buffer.seek(0)
            
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"导出 Word 失败: {str(e)}")
            raise
    
    def export_to_pdf(
        self,
        project_title: str,
        project_description: str,
        chapters: List[Dict],
        include_outline: bool = False
    ) -> bytes:
        """
        导出为 PDF
        
        Args:
            project_title: 项目标题
            project_description: 项目描述
            chapters: 章节列表
            include_outline: 是否包含章节大纲
        
        Returns:
            PDF 文件内容（bytes）
        """
        try:
            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18,
            )
            
            # 尝试注册中文字体（如果失败则使用默认字体）
            try:
                # macOS 系统字体
                pdfmetrics.registerFont(TTFont('Chinese', '/System/Library/Fonts/PingFang.ttc'))
                font_name = 'Chinese'
            except:
                try:
                    # Linux 系统字体
                    pdfmetrics.registerFont(TTFont('Chinese', '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'))
                    font_name = 'Chinese'
                except:
                    # 降级使用 Helvetica（不支持中文，但至少能生成）
                    font_name = 'Helvetica'
                    logger.warning("未找到中文字体，使用默认字体")
            
            # 定义样式
            styles = getSampleStyleSheet()
            
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontName=font_name,
                fontSize=24,
                textColor=RGBColor(0, 0, 0),
                spaceAfter=30,
                alignment=TA_CENTER,
            )
            
            chapter_title_style = ParagraphStyle(
                'ChapterTitle',
                parent=styles['Heading2'],
                fontName=font_name,
                fontSize=16,
                spaceAfter=12,
                spaceBefore=12,
                alignment=TA_CENTER,
            )
            
            normal_style = ParagraphStyle(
                'CustomNormal',
                parent=styles['Normal'],
                fontName=font_name,
                fontSize=11,
                leading=16,
                alignment=TA_JUSTIFY,
                firstLineIndent=20,
            )
            
            outline_style = ParagraphStyle(
                'Outline',
                parent=styles['Normal'],
                fontName=font_name,
                fontSize=9,
                textColor=RGBColor(128, 128, 128),
                spaceAfter=12,
            )
            
            # 构建文档内容
            story = []
            
            # 标题页
            story.append(Paragraph(project_title, title_style))
            if project_description:
                story.append(Paragraph(project_description, normal_style))
            story.append(PageBreak())
            
            # 章节内容
            for chapter in chapters:
                # 章节标题
                chapter_title = f"第{chapter['chapter_number']}章 {chapter['title']}"
                story.append(Paragraph(chapter_title, chapter_title_style))
                story.append(Spacer(1, 12))
                
                # 章节大纲（可选）
                if include_outline and chapter.get('outline'):
                    outline_text = f"【大纲】{chapter['outline']}"
                    story.append(Paragraph(outline_text, outline_style))
                
                # 章节正文
                if chapter.get('content'):
                    paragraphs = chapter['content'].split('\n')
                    for para_text in paragraphs:
                        if para_text.strip():
                            story.append(Paragraph(para_text.strip(), normal_style))
                            story.append(Spacer(1, 6))
                else:
                    story.append(Paragraph("（内容为空）", normal_style))
                
                # 章节分页
                if chapter != chapters[-1]:
                    story.append(PageBreak())
            
            # 统计信息
            story.append(PageBreak())
            total_words = sum(len(ch.get('content', '')) for ch in chapters)
            stats_text = f"全文完<br/><br/>共 {len(chapters)} 章<br/>总计 {total_words:,} 字"
            story.append(Paragraph(stats_text, chapter_title_style))
            
            # 生成 PDF
            doc.build(story)
            buffer.seek(0)
            
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"导出 PDF 失败: {str(e)}")
            raise
