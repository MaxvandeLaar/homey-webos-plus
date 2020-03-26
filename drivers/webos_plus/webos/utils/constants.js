const endpoints = {
  powerState: 'ssap://com.webos.service.tvpower/power/getPowerState',
  inputSocket: 'ssap://com.webos.service.networkinput/getPointerInputSocket',
  system: {
    off: 'ssap://system/turnOff'
  },
  volume: {
    get: 'ssap://audio/getVolume',
    set: 'ssap://audio/setVolume',
    mute: 'ssap://audio/setMute',
    up: 'ssap://audio/volumeUp',
    down: 'ssap://audio/volumeDown'
  },
  media: {
    play: 'ssap://media.controls/play',
    pause: 'ssap://media.controls/pause',
    fastForward: 'ssap://media.controls/fastForward',
    rewind: 'ssap://media.controls/rewind'
  },
  app: {
    launch: 'ssap://com.webos.applicationManager/launch',
    getForegroundApp: 'ssap://com.webos.applicationManager/getForegroundAppInfo',
    getAll: 'ssap://com.webos.applicationManager/listLaunchPoints'
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
  currentChannel: 'currentChannel',
  appList: 'appList',
  channelList: 'channelList'
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
