@echo off
REM 设计方案快速应用脚本 (Windows)
REM 使用方式: apply-design.bat [vercel|linear|apple]

setlocal

set STYLE=%1

if "%STYLE%"=="" (
    echo 请指定风格: vercel, linear, 或 apple
    echo 使用方式: apply-design.bat [vercel^|linear^|apple]
    exit /b 1
)

echo 正在应用 %STYLE% 风格...

REM 备份当前文件
echo 1. 备份当前文件...
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
copy src\app\scripts\page.tsx src\app\scripts\page.tsx.backup.%TIMESTAMP% >nul
echo    ✓ 已备份 scripts/page.tsx

REM 应用新设计
echo 2. 应用新设计...
if "%STYLE%"=="vercel" (
    copy design-proposals\vercel-style-scripts.tsx src\app\scripts\page.tsx >nul
    echo    ✓ 已应用 Vercel 风格
) else if "%STYLE%"=="linear" (
    copy design-proposals\linear-style-scripts.tsx src\app\scripts\page.tsx >nul
    echo    ✓ 已应用 Linear 风格
) else if "%STYLE%"=="apple" (
    copy design-proposals\apple-style-scripts.tsx src\app\scripts\page.tsx >nul
    echo    ✓ 已应用 Apple 风格
) else (
    echo ❌ 未知风格: %STYLE%
    echo 请选择: vercel, linear, 或 apple
    exit /b 1
)

echo.
echo ✅ 设计方案应用成功!
echo.
echo 下一步:
echo 1. 启动开发服务器: pnpm dev
echo 2. 访问 http://localhost:3000/scripts 查看效果
echo 3. 如需回滚，备份文件位于: src\app\scripts\page.tsx.backup.*
echo.

endlocal
