'use strict';

const Homey = require('homey');
const wol = require('node-wol');
const {ManagerArp} = require('homey');
const mac = require('mac-regex');

class WebosPlusDevice extends Homey.Device {
  onInit() {
    this.settings = this.getSettings();
    this.connected = false;
    this.latestOnOffChange = Date.now();
    this.launchPoints = {
      apps: [],
      date: new Date()
    };

    this.channelList = {
      channels: [],
      date: new Date()
    };

    this._driver = this.getDriver();
    this._driver.ready(() => {
      this.log('Device Ready!');
      this.connect();
      this.registerListeners();
      this.poll();
    });
  }

  onDiscoveryResult(discoveryResult) {
    discoveryResult.id = discoveryResult.id.replace(/uuid:/g, '');
    return discoveryResult.id === this.getData().id;
  }

  async onDiscoveryAvailable(discoveryResult) {
    await this.connect();
    return true;
  }

  onDiscoveryAddressChanged(discoveryResult) {
    this.setSettings({ipAddress: discoveryResult.address}).then(() => {
      this.connect(true);
      this.poll();
    });
  }

  onDiscoveryLastSeenChanged(discoveryResult) {
    // When the device is offline, try to reconnect here
    this.connect();
  }

  registerListeners() {
    this.registerCapabilityListener('onoff', this.toggleOnOff.bind(this));
    this.registerCapabilityListener('volume_set', this.setVolume.bind(this));
    this.registerCapabilityListener('volume_mute', this.muteVolume.bind(this));
    this.registerCapabilityListener('volume_up', this.setVolumeUpDown.bind(this, true));
    this.registerCapabilityListener('volume_down', this.setVolumeUpDown.bind(this, false));
    this.registerCapabilityListener('channel_up', this.setChannelUpDown.bind(this, 'channelUp'));
    this.registerCapabilityListener('channel_down', this.setChannelUpDown.bind(this, 'channelDown'));
  }

  onSettings(oldSettings, newSettings, changedKeys) {
    this.settings = newSettings;
    this.poll();
    return Promise.resolve(true);
  }

  poll() {
    if (this.checkStateInterval) {
      clearInterval(this.checkStateInterval);
    }
    this.checkStateInterval = setInterval(() => {
      this.checkOnOff();
    }, this.settings.pollInterval * 1000);
  }

  checkOnOff() {
    const ipAddress = this.settings.ipAddress;
    ManagerArp.getMAC(ipAddress).then((result => {
      const validMac = mac({exact: true}).test(result);
      if (!validMac) {
        this.handleOff();
      } else {
        this.handleOn();
      }
    })).catch(error => {
      this.handleOff();
    });
  }

  async checkVolume() {
    if (!this.connected || !this.lgtv) {
      return;
    }
    this.lgtv.subscribe('ssap://audio/getVolume', (err, res) => {
      if (!res) {
        return;
      }
      if (res.changed && res.changed.indexOf('volume') !== -1) {
        const currentVolume = this.getCapabilityValue('volume_set');
        if (currentVolume !== res.volume) {
          this.setCapabilityValue('volume_set', res.volume)
            .catch(this.error);
        }
      }
      if (res.changed && res.changed.indexOf('muted') !== -1) {
        const currentMute = this.getCapabilityValue('volume_mute');
        if (currentMute !== res.muted) {
          this.setCapabilityValue('volume_mute', res.muted)
            .catch(this.error);
        }
      }
    });
  }

  connect(reconnect = false) {
    if (this.lgtv && reconnect) {
      this.connected = false;
      this.lgtv.disconnect();
    }

    if (this.lgtv && this.connected) {
      return;
    }
    this.log(`Connect to TV ${this.settings.ipAddress}`);

    this.lgtv = require('./lgtv2/lgtv2')({
      url: `ws://${this.settings.ipAddress}:3000`,
      reconnect: 5000
    });

    this.lgtv.on('prompt', () => {
      this.log('please authorize on TV');
    });

    this.lgtv.on('close', () => {
      this.log('Disconnected');
      this.connected = false;
      this.lgtv = null;
    });

    return new Promise((resolve, reject) => {
      this.lgtv.on('error', (err) => {
        this.error(err);
        resolve(true);
      });

      this.lgtv.on('connect', () => {
        this.connected = true;
        this.log('connected');
        this.checkVolume();
        resolve(true);
      });
    });
  }

  async simulateButton(button) {
    return new Promise(async (resolve, reject) => {
      await this.connect();
      this.lgtv.getSocket(
        'ssap://com.webos.service.networkinput/getPointerInputSocket',
        async (err, sock) => {
          if (err) {
            this.error(err);
            reject(err);
          }
          if (!err) {
            sock.send('button', {name: button.toUpperCase()});
            sock.close();
            resolve(true);
          }
        }
      );
    });
  }

  async launchApp(id) {
    return new Promise(async (resolve, reject) => {
      await this.connect();
      this.lgtv.request('ssap://com.webos.applicationManager/launch', {id}, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  async setVolume(value) {
    await this.connect();
    const currentValue = this.getCapabilityValue('volume_set');
    this.lgtv.request('ssap://audio/setVolume', {volume: value}, (err, res) => {
      if (value !== currentValue) {
        this.setCapabilityValue('volume_set', value)
          .catch(this.error);
      }
    });
  }

  async setVolumeUpDown(up) {
    await this.connect();
    const action = up ? 'volumeUp' : 'volumeDown';
    this.lgtv.request(`ssap://audio/${action}`, (err, res) => {
      if (err) {
        this.error(err);
      } else {
        let volume = this.getCapabilityValue('volume_set');
        volume = up ? volume + 1 : volume - 1;
        this.setCapabilityValue('volume_set', volume)
          .catch(this.error);
      }
    });
  }

  async muteVolume(value) {
    await this.connect();
    this.lgtv.request('ssap://audio/setMute', {mute: value}, (err, res) => {
      this.setCapabilityValue('volume_mute', value)
        .catch(this.error);
    });
  }

  async setChannelUpDown(action) {
    await this.connect();
    this.lgtv.request(`ssap://tv/${action}`, (err, res) => {
      if (err) {
        this.error(err);
      }
    });
  }

  async sendToast(message, iconData) {
    await this.connect();
    let data = {message};
    if (iconData) {
      data['iconExtension'] = 'tiff';
      data['iconData'] = iconData;
      if (data.iconData.includes(',')) {
        data.iconData = data.iconData.split(',')[1];
      }
    }
    return new Promise((resolve, reject) => {
      this.lgtv.request('ssap://system.notifications/createToast', data, (err, res) => {
        if (err) {
          this.error(err);
          reject(err);
        }
        resolve(res);
      });
    });
  }

  changeChannelTo(channelNumber) {
    return new Promise(async (resolve, reject) => {
      await this.connect();
      this.lgtv.request(`ssap://tv/openChannel`, {channelNumber}, (err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(true);
        }
      });
    });
  }

  getCurrentChannel() {
    return new Promise(async (resolve, reject) => {
      await this.connect();
      this.lgtv.request('ssap://tv/getCurrentChannel', (err, res) => {
        if (err) {
          reject(err);
        }
        resolve(res);
      })
    });
  }

  getAppList(query = '') {
    function _filter(list, query) {
      let tmp = list.apps.filter(app => app.name.toLowerCase().includes(query.toLowerCase()));
      return tmp.sort((a, b) => {
        return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : b.name.toLowerCase() > a.name.toLowerCase() ? -1 : 0;
      });
    }

    return new Promise(async (resolve) => {
      let apps = [];
      if (this.launchPoints.apps.length < 1 || this.launchPoints.date < new Date().setDate(new Date().getDate() - 1)) {
        await this.connect();
        if (!this.lgtv) {
          return;
        }
        this.lgtv.request('ssap://com.webos.applicationManager/listLaunchPoints', (err, result) => {
          if (result) {
            this.launchPoints.apps = result.launchPoints.map(point => {
              return {
                name: point.title,
                image: point.icon,
                id: point.id
              };
            });
          }
          apps = _filter(this.launchPoints, query);
          resolve(apps);
        });
      } else {
        apps = _filter(this.launchPoints, query);
        resolve(apps);
      }
    });
  }

  getChannelList(query = '') {
    function _filter(list, query){
      let tmp = list.channels.filter(channel => channel.search.toLowerCase().includes(query.toLowerCase()));
      return tmp.sort((a, b) => {
        const numA = parseInt(a.number);
        const numB = parseInt(b.number);
        return numA > numB ? 1 : numB > numA ? -1 : 0;
      });
    }

    return new Promise(async (resolve) => {
      let channels = [];
      if (this.channelList.channels.length < 1 || this.channelList.date < new Date().setDate(new Date().getDate() - 1)) {
        this.connect();
        if (!this.lgtv) {
          return;
        }
        this.lgtv.request('ssap://tv/getChannelList', (err, result) => {
          if (err) {
            this.error(err);
          }
          if (result) {
            this.channelList.channels = result.channelList.map(channel => {
              return {
                name: channel.channelName,
                description: channel.channelNumber,
                number: channel.channelNumber,
                search: `${channel.channelNumber} ${channel.channelName}`
              };
            });
          }
          channels = _filter(this.channelList, query);
          resolve(channels);
        });
      } else {
        channels = _filter(this.channelList, query);
        resolve(channels);
      }
    });
  }

  getCurrentApp() {
    return new Promise(async (resolve, reject) => {
      await this.connect();
      this.lgtv.request('ssap://com.webos.applicationManager/getForegroundAppInfo', (err, res) => {
        if (err) {
          reject(err);
        }
        resolve(res)
      });
    });
  }

  turnOff() {
    if (!this.connected || !this.lgtv) {
      return;
    }
    this.lgtv.request('ssap://system/turnOff', (err, res) => {
      this.handleOff();
    });
  }

  handleOff() {
    this.connected = false;
    if (this.lgtv) {
      this.lgtv.disconnect();
    }
    const currentValue = this.getCapabilityValue('onoff');
    const lastChange = (Date.now() - this.latestOnOffChange) / 1000;
    if (currentValue && lastChange > 90) {
      this.latestOnOffChange = Date.now();
      this.setCapabilityValue('onoff', false).catch(this.error);
    }
  };

  handleOn() {
    this.connect();
    const currentValue = this.getCapabilityValue('onoff');
    const lastChange = (Date.now() - this.latestOnOffChange) / 1000;
    if (!currentValue && lastChange > 90) {
      this.latestOnOffChange = Date.now();
      this.setCapabilityValue('onoff', true).catch(this.error);
    }
  }

  turnOn() {
    const {macAddress} = this.settings;
    try {
      wol.wake(macAddress, (error) => {
        if (error !== undefined) throw error;
      });

      this.handleOn();
      return Promise.resolve(true);
    } catch (error) {
      this.log(`Failed waking up ${macAddress}`);
      return Promise.reject(new Error(`Failed waking up ${macAddress}`));
    }
  }

  toggleOnOff(value) {
    if (!value && this.getCapabilityValue('onoff')) {
      if (!this.connected) {
        this.connect().then(this.turnOff);
      } else {
        this.turnOff();
        return Promise.resolve(true);
      }
    } else {
      return this.turnOn();
    }
  }

  getValue(name) {
    return this.getCapabilityValue(name);
  }

  getCurrentSoundOutput(){
    return new Promise(async (resolve, reject) => {
      await this.connect();
      this.lgtv.request(`ssap://com.webos.service.apiadapter/audio/getSoundOutput`, (err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(res.soundOutput);
        }
      });
    });
  }

  setSoundOutput(output) {
    return new Promise(async (resolve, reject) => {
      await this.connect();
      this.lgtv.request(`ssap://com.webos.service.apiadapter/audio/changeSoundOutput`, {output}, (err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(true);
        }
      });
    });
  }
}

module.exports = WebosPlusDevice;
