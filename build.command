npx electron-packager . jtS3H --platform=win32 --arch=x64 --overwrite --icon=./asset/icon_org.png
cp -rf ./jtS3H-win32-x64/resources/app/asset ./jtS3H-win32-x64
rm -rf ./jtS3H-win32-x64/win-unpacked
cp -rf ../scratch-desktop/dist/win-unpacked ./jtS3H-win32-x64
