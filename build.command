export NODE_OPTIONS="--max-old-space-size=4096" # ageinst for `Javascript heap out of memory`
cd ../scratch-vm
npm install
npm link
npm run build
cd ../scratch-gui
npm install
npm link
npm link scratch-vm
cd ../scratch-desktop
npm install
npm link scratch-gui
npm run dist        # WARNING: This command is failed when it is disconnected from the internet. 
cd ../s3h
npx electron-packager . jtS3H --platform=win32 --arch=x64 --overwrite --icon=./asset/icon_org.png
cp -rf ./jtS3H-win32-x64/resources/app/asset ./jtS3H-win32-x64
rm -rf ./jtS3H-win32-x64/win-unpacked
cp -rf ../scratch-desktop/dist/win-unpacked ./jtS3H-win32-x64
