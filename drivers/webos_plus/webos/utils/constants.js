/*
 * LG WebOS TV app for Homey
 * Copyright (C) 2020  Max van de Laar
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
// https://github.com/ConnectSDK/Connect-SDK-iOS-Core/blob/894c28c8c4386e0c750b950bff549d00c7c4d8b1/Services/WebOSTVService.m

const endpoints = {
  powerState: 'ssap://com.webos.service.tvpower/power/getPowerState',
  inputSocket: 'ssap://com.webos.service.networkinput/getPointerInputSocket',
  system: {
    off: 'ssap://system/turnOff',
    launcher: {
      browser: 'sapp://system.launcher/open', // todo: implement launch browser
      launch: 'ssap://system.launcher/launch', // todo: implement launch apps
      state: 'ssap://system.launcher/getAppState', // todo: implement get App state
      close: 'ssap://system.launcher/close' // todo: implement close app
    },
    inputs: {
      list: 'ssap://tv/getExternalInputList',
      switch: 'ssap://tv/switchInput'
    }
  },
  volume: {
    get: 'ssap://audio/getVolume',
    set: 'ssap://audio/setVolume',
    mute: 'ssap://audio/setMute',
    getMute: 'ssap://audio/getMute', // todo: implement
    up: 'ssap://audio/volumeUp',
    down: 'ssap://audio/volumeDown'
  },
  media: {
    play: 'ssap://media.controls/play',
    pause: 'ssap://media.controls/pause',
    stop: 'ssap://media.controls/stop', //todo: implement?
    fastForward: 'ssap://media.controls/fastForward',
    rewind: 'ssap://media.controls/rewind',
    open: 'ssap://media.viewer/open' // todo: investigate what this is and how to implement
  },
  app: {
    launch: 'ssap://com.webos.applicationManager/launch',
    webapp: {
      launch: 'ssap://webapp/launchWebApp', // todo: implement?
      close: 'ssap://webapp/closeWebApp', // todo: implement?
      connect: 'ssap://webapp/connectToApp', // todo: implement?
      removePin: 'ssap://webapp/removePinnedWebApp', // todo: implement?
      isPinned: 'ssap://webapp/isWebAppPinned', // todo: implement?
      pin: 'ssap://webapp/pinWebApp' // todo: implement?
    },
    getForegroundApp: 'ssap://com.webos.applicationManager/getForegroundAppInfo',
    getAll: 'ssap://com.webos.applicationManager/listLaunchPoints',
    list: 'ssap://com.webos.applicationManager/listApps'
  },
  pairing: {
    setPin: 'ssap://pairing/setPin' // todo: implement?
  },
  channel: {
    current: 'ssap://tv/getCurrentChannel',
    up: 'ssap://tv/channelUp',
    down: 'ssap://tv/channelDown',
    set: 'ssap://tv/openChannel',
    list: 'ssap://tv/getChannelList'
  },
  audio: {
    getOutput: 'ssap://com.webos.service.apiadapter/audio/getSoundOutput',
    setOutput: 'ssap://com.webos.service.apiadapter/audio/changeSoundOutput'
  },
  toast: {
    create: 'ssap://system.notifications/createToast'
  }
};

const capabilities = {
  onOff: 'onoff',
  volumeSet: 'volume_set',
  volumeMute: 'volume_mute',
  volumeUp: 'volume_up',
  volumeDown: 'volume_down',
  channelUp: 'channel_up',
  channelDown: 'channel_down',
  speakerAlbum: 'speaker_album',
  speakerArtist: 'speaker_artist',
  speakerTrack: 'speaker_track',
  speakerPlaying: 'speaker_playing',
  speakerNext: 'speaker_next',
  speakerPrev: 'speaker_prev'
};

const store = {
  currentApp: 'currentApp',
  currentSoundOutput: 'currentSoundOutput',
  currentChannel: 'currentChannel'
};

const actions = {
  volume: {
    up: 'volumeUp',
    down: 'volumeDown'
  },
  channel: {
    up: 'channelUp',
    down: 'channelDown'
  }
};

module.exports = {
  endpoints,
  capabilities,
  store,
  actions
};
