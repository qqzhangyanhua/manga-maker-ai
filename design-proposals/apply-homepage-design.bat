@echo off
REM 应用基于首页的统一设计（Windows）
REM 使用方式: apply-homepage-design.bat

setlocal

echo ========================================
echo ComicAI 设计统一工具
echo 基于首页设计，统一全站风格
echo ========================================
echo.

REM 备份当前文件
echo [1/3] 备份当前文件...
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

if exist src\app\scripts\page.tsx (
    copy src\app\scripts\page.tsx src\app\scripts\page.tsx.backup.%TIMESTAMP% >nul
    echo   ✓ 已备份 scripts/page.tsx
)

if exist src\app\story\page.tsx (
    copy src\app\story\page.tsx src\app\story\page.tsx.backup.%TIMESTAMP% >nul
    echo   ✓ 已备份 story/page.tsx
)

echo.

REM 应用新设计
echo [2/3] 应用统一设计...

if exist design-proposals\homepage-based-scripts.tsx (
    copy design-proposals\homepage-based-scripts.tsx src\app\scripts\page.tsx >nul
    echo   ✓ 已应用 scripts/page.tsx（基于首页设计）
) else (
    echo   ✗ 未找到 homepage-based-scripts.tsx
)

if exist design-proposals\homepage-based-story.tsx (
    copy design-proposals\homepage-based-story.tsx src\app\story\page.tsx >nul
    echo   ✓ 已应用 story/page.tsx（基于首页设计）
) else (
    echo   ✗ 未找到 homepage-based-story.tsx
)

echo.

REM 完成提示
echo [3/3] 完成!
echo.
echo ========================================
echo ✅ 设计统一完成！
echo ========================================
echo.
echo 已应用的改进：
echo   • 背景色统一为 #09090b
echo   • 强调色统一为 orange-500
echo   • 卡片样式与首页保持一致
echo   • hover 效果与首页保持一致
echo.
echo 下一步：
echo   1. 启动开发服务器: pnpm dev
echo   2. 访问以下页面查看效果:
echo      - http://localhost:3000/scripts
echo      - http://localhost:3000/story
echo   3. 如需回滚，备份文件位于 src\app\*\page.tsx.backup.%TIMESTAMP%
echo.
echo 设计规范文档：
echo   design-proposals\HOMEPAGE_BASED_DESIGN_SYSTEM.md
echo.

endlocal
