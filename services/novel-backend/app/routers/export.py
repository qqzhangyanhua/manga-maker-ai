"""
小说导出 API 路由
"""
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.auth import get_current_user_id
from ..services.export_service import ExportService
from ..schemas.export import ExportRequest
from ..models import NovelProject


router = APIRouter(prefix="/export", tags=["export"])


@router.post("/projects/{project_id}")
async def export_novel(
    project_id: str,
    request: ExportRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    导出小说
    
    支持的格式：
    - txt: 纯文本格式
    - docx: Microsoft Word 格式
    - pdf: PDF 格式
    
    Args:
        project_id: 项目 ID
        request: 导出请求（包含格式和配置）
        user_id: 当前用户 ID
        db: 数据库会话
        
    Returns:
        文件流（StreamingResponse）
    """
    try:
        from sqlalchemy import select

        project_stmt = select(NovelProject).where(
            NovelProject.id == project_id,
            NovelProject.user_id == user_id
        )
        project_result = await db.execute(project_stmt)
        project = project_result.scalar_one_or_none()

        if not project:
            raise HTTPException(status_code=404, detail="项目不存在")

        # 创建导出服务
        export_service = ExportService(db)
        
        # 导出文件
        file_bytes = await export_service.export_novel(
            project_id=project_id,
            format=request.format,
            config=request.config
        )
        
        # 设置文件名和 MIME 类型
        filename = f"{project.title}.{request.format}"
        mime_types = {
            "txt": "text/plain; charset=utf-8",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "pdf": "application/pdf"
        }
        
        # 返回文件流
        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type=mime_types[request.format],
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(file_bytes))
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail=f"服务器配置错误: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"导出失败: {str(e)}"
        )


@router.get("/formats")
async def get_export_formats():
    """
    获取支持的导出格式列表
    
    Returns:
        支持的格式列表及其描述
    """
    return {
        "formats": [
            {
                "value": "txt",
                "label": "纯文本 (TXT)",
                "description": "适合上传到网文平台",
                "mime_type": "text/plain"
            },
            {
                "value": "docx",
                "label": "Word 文档 (DOCX)",
                "description": "适合投稿和编辑",
                "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            },
            {
                "value": "pdf",
                "label": "PDF 文档",
                "description": "适合阅读和分享",
                "mime_type": "application/pdf"
            }
        ]
    }
