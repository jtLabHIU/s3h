# How to install Scratch Desktop 3.0 from github

## installing zenbuPortable
- install [zenbuPortable](https://github.com/jtfuruhata/zenbuHQ) from github

## installing Node.js onto zenbuPortable
- deflate Node.js to $Pzenbu/node.js

## installing Scratch-GUI
- (fork from [scratch-gui](https://github.com/LLK/scratch-gui))
- `git clone https://github.com/jtLabHIU/scratch-vm.git` into $Wzenbu/Scratch/repos
- `cd scratch-vm`
- `git remote add upstream https://github.com/LLK/scratch-vm.git`
- `git config branch.develop.remote upstream https://github.com/jtLabHIU/scratch-vm.git`
- `npm install`
    - you may ignore warning messages
- `npm link`
- `cd ..`
- `git clone https://github.com/jtLabHIU/scratch-gui.git` into $Wzenbu/Scratch/repos
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

- `git checkout scratch-desktop` **on `scratch-gui`**
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

## update to new version
- git pull
- git push origin
- git checkout --track upstream/scratch-desktop
- git pull
- git push origin

## Where are translation files in?
- scratch-*/node_modules/scratch-l10n/locales/

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

## readyState
- _commServ.connected
- _device.socket.ready
- _device.status.ready
- _wifi.connectionState.connected

- commServ
    - jtWebSockRepeater._commServ
        - construct ... null
        - init() ... _commServ.connected true/false
    
