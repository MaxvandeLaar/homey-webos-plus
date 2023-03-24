Met de WebOS Plus app in samenwerking met Homey is het mogelijk om je LG TV vanuit de hele wereld te bedienen.

Belangrijke features:
- Geen infrarood! De tv wordt volledig aangestuurd via het netwerk.
- Stabiele aan/uit detectie.
- WakeOnLan om de tv aan te zetten (TV moet aangesloten zijn met een ethernet kabel)
- Simulatie van afstandsbediening knoppen om complexe flows op je tv te maken. Bijv. het veranderen van de energy saving instellingen wanneer je muziek afspeelt.

App capabilities zijn:
- Verander volume
- Mute/unmute
- Verander kanaal
- Media knoppen
- Aan/uit over ethernet met WOL

Besides the basic capabilities you can create amazing flows:
Naast de basis capabilities kan je mooie flows maken:
* Actions:
  - Aan/uit
  - Volume hoger/lager
  - Zet volume naar
  - Mute/unmute
  - Kanaal hoger/lager
  - Zet kanaal met nummer
  - Zet kanaal via lijst selectie
  - Verander input of start app met lijst selectie
  - Simuleer afstandbediening knoppen (e.g. Links, Exit, Menu, Ok)
  - Toast message incl. optionele icon
  - Media knoppen
  - Alert message, zie button voorbeeld hieronder
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
  - Aan/uit
  - Huidige volume
  - Muted/unmuted
  - Huidige kanaal
  - Huidige app/input

* Triggers:
  - Aan/uit
  - Kanaal veranderd
  - Volume veranderd
  - (un)Muted
  - App/input veranderd
  - Geluidsuitgang veranderd
  - Media knoppen
