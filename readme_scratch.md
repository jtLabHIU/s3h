# jtScratch

jtLab Scratch 3.0 for use with jtS3Helper

- Latest release branch: `dev191017`
- Current development branch: `dev_3.0`

for build the latest release branch, please checkout `jtScratch-desktop` branch on `scratch-gui` and `scratch-vm`

# How to install Scratch Desktop 3.0 from github

## installing Scratch-GUI

for Windows developer:
 you must git-clone repos into NTFS filesystem

- (fork from [scratch-gui](https://github.com/LLK/scratch-gui))
- `git clone https://github.com/jtLabHIU/scratch-vm.git` into $Wzenbu/jtScratch
- `cd scratch-vm`
- `git remote add upstream https://github.com/LLK/scratch-vm.git`
- `git config branch.develop.remote upstream https://github.com/jtLabHIU/scratch-vm.git`
- `npm install`
    - you may ignore warning messages
- `npm link`
- `cd ..`
- `git clone https://github.com/jtLabHIU/scratch-gui.git` into $Wzenbu/jtScratch
- `cd scratch-gui`
- `git remote add upstream https://github.com/LLK/scratch-gui.git`
- `git config branch.develop.remote upstream https://github.com/jtLabHIU/scratch-gui.git`
- `npm install`
    - you may ignore warning messages
- `npm link scratch-vm`
- `npm start`
    - you may ignore warnning messages (a lot of red and yellow strings)
- browse [http://localhost:8601/](http://localhost:8601/) from **Google Chrome** after "Compiled successfully" was logged

## build for desktop

- `git checkout --track origin/scratch-desktop` **on `scratch-gui`**
- re-run `npm install`
- `BUILD_MODE=dist STATIC_PATH=static npm run build` to build GUI for desktop
- `npm link`
- `cd ..`
- (fork from [scratch-desktop](https://github.com/LLK/scratch-desktop))
- `git clone https://github.com/jtLabHIU/scratch-desktop.git`
- `cd scratch-desktop`
- `npm install`
- `npm run fetch`
- `npm link scratch-gui`
- `npm run build-gui` **YOU MUST BE ADMINISTRATOR**
- `npm start` to check running with Electron
- `npm run dist`to publich a distribution package into `dist` folder

## update to new version of original Scratch 3.0
- git pull
- git push origin
- git checkout --track upstream/scratch-desktop
- git pull
- git push origin

## Where are translation files in?
- scratch-*/node_modules/scratch-l10n/locales/

# How to add your own extention
from [Scratch Wiki](https://ja.scratch-wiki.info/wiki/Scratch_3.0%E3%81%AE%E6%8B%A1%E5%BC%B5%E6%A9%9F%E8%83%BD%E3%82%92%E4%BD%9C%E3%81%A3%E3%81%A6%E3%81%BF%E3%82%88%E3%81%86)

## to scratch-gui

- put image files into `scratch-gui/src/lib/libraries/extensions`
    - 600x372 and 80x80
- edit `scratch-gui/src/lib/libraries/extensions/index.jsx`
    - import image files and add export default section

## to scratch-vm

- add new folder that named `scratch3_[extentionId]` under `scratch-vm\src\extensions`
- add `index.js` file under this folder
- write the class that named `scratch3[extensionId]`
- edit `scratch-vm\src\extension-support\extension-manager.js`
    - add `[extentionId]: () => require('../extensions/scratch3_[extentionId]'),`

# Adding HTTP feature

## Notice

- `request` module is not able to use with scratch extention reason from webpack problem.
    - use `nets` simply instead of `request`.
    - body needs decode, `(new TextDecoder).decode(body);`
- if an permission problem occurs with `npm link`, reboot your PC.

## resolve package dependency
- please remember `Node core module' (net, http, etc...) aren't have to `npm install [package]`, but these aren't in browsers. Therefore for webpack, we may use browser shim library instead of Node core module.
- for use external node package (run on `scratch-vm`)
    - `npm install --save [package]` 
    - add [package] to `externals` division of `webpack.config.js`
    - `npm run build`
    - restart `scratch-gui` webpack-dev-server if compile error is occured 
