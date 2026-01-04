"""
JWT 认证中间件（与 Next.js 共享）
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from ..config import settings
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    从 JWT token 中提取用户 ID
    
    Args:
        credentials: HTTP Bearer 凭证
    
    Returns:
        用户 ID (UUID string)
    
    Raises:
        HTTPException: 认证失败
    """
    token = credentials.credentials
    
    try:
        # 解码 JWT（使用与 Next.js 相同的 secret）
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        # 提取用户 ID（兼容多种字段名）
        # 优先使用 userId，其次 sub（标准 JWT 字段）
        user_id: str = payload.get("userId") or payload.get("sub")
        
        if user_id is None:
            logger.error(f"JWT payload 缺少 userId/sub 字段: {payload}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的认证凭证",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.debug(f"认证成功: user_id={user_id}")
        return user_id
        
    except JWTError as e:
        logger.error(f"JWT 解码失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"认证异常: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="认证服务异常",
        )


async def get_optional_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str | None:
    """
    可选的用户认证（不强制要求登录）
    
    Returns:
        用户 ID 或 None
    """
    try:
        return await get_current_user_id(credentials)
    except HTTPException:
        return None
