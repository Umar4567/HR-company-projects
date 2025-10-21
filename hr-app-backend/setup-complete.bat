@echo off
cd /d "C:\Users\HP\Desktop\hr-app-backend"

echo Generating JWT Secret...
node -e "const crypto=require('crypto'); const secret=crypto.randomBytes(32).toString('hex'); console.log('JWT_SECRET='+secret)" > temp_secret.txt
set /p JWT_SECRET=<temp_secret.txt
del temp_secret.txt

echo Creating .env file...
(
echo MONGODB_URI=mongodb://localhost:27017
echo %JWT_SECRET%
echo PORT=5000
echo NODE_ENV=development
) > .env

echo JWT Secret has been generated and saved to .env file!
echo Starting server...
npm run dev