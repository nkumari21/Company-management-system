@echo off
echo Setting up Company Management System...

REM Navigate to project directory
cd /d "C:\Users\user\OneDrive\Desktop\company-management-system"

REM Step 1: Setup Backend
echo.
echo Setting up Backend...
cd backend

REM Install backend dependencies
echo Installing backend dependencies...
call npm install

REM Create .env file if it doesn't exist
if not exist .env (
    echo PORT=5000 >> .env
    echo MONGODB_URI=mongodb+srv://Neha:TheNeha21@cluster0.dmkvo.mongodb.net/company_management?retryWrites=true^&w=majority >> .env
    echo JWT_SECRET=your_super_secret_jwt_key_change_in_production_12345 >> .env
    echo JWT_EXPIRE=7d >> .env
    echo NODE_ENV=development >> .env
)

cd ..

REM Step 2: Setup Frontend
echo.
echo Setting up Frontend...
cd frontend

REM Install frontend dependencies
echo Installing frontend dependencies...
call npm install

REM Create public folder and files
if not exist public mkdir public
cd public

REM Create index.html
echo ^<!DOCTYPE html^> > index.html
echo ^<html lang="en"^> >> index.html
echo   ^<head^> >> index.html
echo     ^<meta charset="utf-8" /^> >> index.html
echo     ^<link rel="icon" href="%PUBLIC_URL%/favicon.ico" /^> >> index.html
echo     ^<meta name="viewport" content="width=device-width, initial-scale=1" /^> >> index.html
echo     ^<meta name="theme-color" content="#000000" /^> >> index.html
echo     ^<meta name="description" content="Company Management System" /^> >> index.html
echo     ^<title^>Company Management System^</title^> >> index.html
echo   ^</head^> >> index.html
echo   ^<body^> >> index.html
echo     ^<noscript^>You need to enable JavaScript to run this app.^</noscript^> >> index.html
echo     ^<div id="root"^>^</div^> >> index.html
echo   ^</body^> >> index.html
echo ^</html^> >> index.html

REM Create manifest.json
echo { > manifest.json
echo   "short_name": "CMS", >> manifest.json
echo   "name": "Company Management System", >> manifest.json
echo   "icons": [ >> manifest.json
echo     { >> manifest.json
echo       "src": "favicon.ico", >> manifest.json
echo       "sizes": "64x64 32x32 24x24 16x16", >> manifest.json
echo       "type": "image/x-icon" >> manifest.json
echo     } >> manifest.json
echo   ], >> manifest.json
echo   "start_url": ".", >> manifest.json
echo   "display": "standalone", >> manifest.json
echo   "theme_color": "#000000", >> manifest.json
echo   "background_color": "#ffffff" >> manifest.json
echo } >> manifest.json

REM Create favicon.ico (dummy)
echo dummy > favicon.ico

cd ..

echo.
echo Setup Complete!
echo.
echo To run the application:
echo 1. Open Terminal 1: cd backend && npm run dev
echo 2. Open Terminal 2: cd frontend && npm start
echo 3. Access at: http://localhost:3000
pause