# Homey WebOS
With the WebOS Plus app combined with Homey you can control your LG TV from anywhere in the world.

Main features:
- No infrared! TV is completely controlled via ethernet
- Stable on/off detection
- WakeOnLan to turn the tv on (TV must be connected with ethernet cable)
- Remote control button simulation to create amazing complex flows on your tv such as changing energy saving when playing music!

If you enjoy the app and can spare a few coins

<a href='https://ko-fi.com/N4N51GBG5' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://az743702.vo.msecnd.net/cdn/kofi4.png?v=2' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

## How to install from release zip

Make sure you have NPM installed

Make sure you have `homey` installed `npm i -g homey`

Download the release file `webos-plus-v*.zip` for the latest release and unzip.

Inside this folder run the command `homey app install`. Homey probably needs you to authenticate so just follow the steps provided in the terminal.


## How to install for source

Make sure you have NPM installed

Make sure you have `homey` installed `npm i -g homey`

Clone/download the repo to a folder on your computer.

Inside this folder run the command `npm run deploy`. Homey probably needs you to authenticate so just follow the steps provided in the terminal.

## All features

App capabilities are:
- Change volume
- Mute/unmute
- Change channel
- Power on/off over ethernet with WOL

Besides the basic capabilities you can create amazing flows:
* Actions:
  - On/off
  - Volume up/down
  - Set volume
  - Mute/unmute
  - Channel up/down
  - Set channel via number
  - Set channel via list selection
  - Set input source or app via list selection
  - Simulate remote control button (e.g. Left, Exit, Menu, Ok)
  - Send toast messages with icon

* Conditions:
  - On/Off
  - Current volume
  - Muted/unmuted
  - Current channel
  - Current app/input

* Triggers:
  - On/Off
  - Channel change
  - Volume change
  - App/input change
  - Sound output change

## Examples

Sorry, my Homey is in Dutch so you'll have to figure out any language differences yourself.

#### Energy Saving
[![Flow](https://flow-api.athom.com/api/flow/LvfkP1/image)](https://homey.app/f/LvfkP1/)






