With the WebOS Plus app combined with Homey you can control your LG TV from anywhere in the world.

Main features:
- No infrared! TV is completely controlled via ethernet
- Stable on/off detection
- WakeOnLan to turn the tv on (TV must be connected with ethernet cable)
- Remote control button simulation to create amazing complex flows on your tv such as changing energy saving when playing music!

App capabilities are:
- Change volume
- Mute/unmute
- Change channel
- Media controls
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
  - Toast with optional icon
  - Media controls
  - Alert message, see button example below
  ```
    buttons: [
       {
         label: 'Netflix',
         onclick: 'luna://com.webos.applicationManager/launch',
         params: {id: 'netflix'},
         buttonType: 'confirm',
         focus: true,
       }, {
         label: 'Google',
         onclick: 'luna://com.webos.applicationManager/launch',
         params: {id: 'com.webos.app.browser', target: 'https://google.nl'},
         buttonType: 'confirm'
       }, {
         label: 'Cancel',
         buttonType: 'cancel'
       },
     ],
  ```

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
  - (un)Muted
  - App/input change
  - Sound output change
  - Media controls
