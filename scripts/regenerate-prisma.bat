@echo off
echo ========================================
echo Prisma Client 重新生成脚本
echo ========================================
echo.
echo 正在关闭 Node.js 进程...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo.
echo 正在生成 Prisma Client...
cd /d "%~dp0"
call npx prisma generate

echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo ✅ Prisma Client 生成成功！
) else (
    echo ❌ 生成失败，请检查错误信息
)
echo ========================================
pause
