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
    this.device = this;
    this._driver = this.getDriver();
    this._driver.ready(() => {
      this.log('Device Ready!!');
      this.connect();
      this.registerListeners();
      this.poll();
      this.flowActions();
    });
  }

  onDiscoveryResult(discoveryResult) {
    discoveryResult.id = discoveryResult.id.replace(/uuid:/g, '');
    return discoveryResult.id === this.getData().id;
  }

  onDiscoveryAvailable(discoveryResult) {
    this.connect();
  }

  onDiscoveryAddressChanged(discoveryResult) {
    this.setSettings({ipAddress: discoveryResult.address});
    this.connect(true);
    this.poll();
  }

  onDiscoveryLastSeenChanged(discoveryResult) {
    // When the device is offline, try to reconnect here
  }

  registerListeners() {
    this.registerCapabilityListener('onoff', this.toggleOnOff.bind(this));
    this.registerCapabilityListener('volume_set', this.setVolume.bind(this));
    this.registerCapabilityListener('volume_mute', this.muteVolume.bind(this));
    this.registerCapabilityListener('volume_up', this.setVolumeUp.bind(this));
    this.registerCapabilityListener('volume_down', this.setVolumeDown.bind(this));
    this.registerCapabilityListener('channel_up', this.setChannelUp.bind(this));
    this.registerCapabilityListener('channel_down', this.setChannelDown.bind(this));
  }

  flowActions() {
    Homey.app._actionLaunchApp
      .registerRunListener((args, state) => {
        return new Promise((resolve, reject) => {
          this.log('launch app action');
          this.log('args', args);
          this.log('state', state);
          this.launchApp(args.app.id).then(() => {
            resolve(true);
          }, (_error) => {
            resolve(false);
          });
        });
      })
      .register()
      .getArgument('app')
      .registerAutocompleteListener((query, args) => {
        this.log(query);
        return new Promise((resolve) => {
          let apps = [];
          if (this.launchPoints.apps.length < 1 || this.launchPoints.date < new Date().setDate(new Date().getDate() - 1)) {
            this.lgtv.request('ssap://com.webos.applicationManager/listLaunchPoints', (err, result) => {
              this.log(result);
              if (result) {
                this.launchPoints.apps = result.launchPoints.map(point => {
                  return {
                    name: point.title,
                    image: point.icon,
                    id: point.id
                  };
                });
              }
              apps = this.launchPoints.apps.filter(app => app.name.toLowerCase().includes(query.toLowerCase()));
              resolve(apps);
            });
          } else {
            apps = this.launchPoints.apps.filter(app => app.name.toLowerCase().includes(query.toLowerCase()));
            resolve(apps);
          }
        });
      });

    Homey.app._actionChangeVolume
      .registerRunListener(async (args, state) => {
        await this.setVolume(args.volume);
        return Promise.resolve(true);
      })
      .register();
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

  checkVolume() {
    if (!this.connected) {
      return;
    }
    this.lgtv.subscribe('ssap://audio/getVolume', (err, res) => {
      if (!res) {
        return;
      }
      if (res.changed && res.changed.indexOf('volume') !== -1) {
        const currentVolume = this.getCapabilityValue('volume_set');
        if (currentVolume !== res.volume) {
          // this._driver.triggerVolumeChanged(this.device, res.volume);

          this.setCapabilityValue('volume_set', res.volume)
            .catch(this.error);
        }
      }
      if (res.changed && res.changed.indexOf('muted') !== -1) {
        this.setCapabilityValue('volume_mute', res.muted)
          .catch(this.error);
      }
    });
  }

  connect(reconnect = false) {
    if (this.lgtv && reconnect) {
      this.connected = false;
      this.lgtv.disconnect();
    }

    if (this.connected) {
      return;
    }

    this.lgtv = require('./lgtv2/lgtv2')({
      url: `ws://${this.settings.ipAddress}:3000`,
      reconnect: 5000
    });

    this.lgtv.on('prompt', () => {
      this.log('please authorize on TV');
    });

    this.lgtv.on('close', () => {
      this.connected = false;
    });

    return new Promise((resolve, reject) => {
      this.lgtv.on('error', (err) => {
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

  async launchApp(id) {
    return new Promise(async (resolve, reject) => {
      if (!this.connected) {
        await this.connect();
      }

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
    if (!this.connected) {
      await this.connect();
    }
    this.lgtv.request('ssap://audio/setVolume', {volume: value}, (err, res) => {
      this.setCapabilityValue('volume_set', value)
        .catch(this.error);
    });
  }

  async setVolumeUp() {
    if (!this.connected) {
      await this.connect();
    }
    this.lgtv.request('ssap://audio/volumeUp', (err, res) => {
      if (err) {
        this.error(err);
      } else {
        let volume = this.getCapabilityValue('volume_set') + 1;
        this.setCapabilityValue('volume_set', volume)
          .catch(this.error);
      }
    });
  }

  async setVolumeDown() {
    if (!this.connected) {
      await this.connect();
    }
    this.lgtv.request('ssap://audio/volumeDown', (err, res) => {
      if (err) {
        this.error(err);
      } else {
        let volume = this.getCapabilityValue('volume_set') - 1;
        this.setCapabilityValue('volume_set', volume)
          .catch(this.error);
      }
    });
  }

  async muteVolume(value) {
    if (!this.connected) {
      await this.connect();
    }
    this.lgtv.request('ssap://audio/setMute', {mute: value}, (err, res) => {
      this.setCapabilityValue('volume_mute', value)
        .catch(this.error);
    });
  }

  async setChannelUp() {
    if (!this.connected) {
      await this.connect();
    }
    this.lgtv.request('ssap://tv/channelUp', (err, res) => {
      if (err) {
        this.error(err);
      } else {
        // let volume = this.getCapabilityValue('volume_set') - 1;
        // this.setCapabilityValue('volume_set', volume)
        //   .catch(this.error);
      }
    });
  }

  async setChannelDown() {
    if (!this.connected) {
      await this.connect();
    }
    this.lgtv.request('ssap://tv/channelDown', (err, res) => {
      if (err) {
        this.error(err);
      } else {
        // let volume = this.getCapabilityValue('volume_set') - 1;
        // this.setCapabilityValue('volume_set', volume)
        //   .catch(this.error);
      }
    });
  }

  turnOff() {
    this.lgtv.request('ssap://system/turnOff', (err, res) => {
      this.handleOff();
    });
  }

  handleOff() {
    this.connected = false;
    this.lgtv.disconnect();
    const currentValue = this.getCapabilityValue('onoff');
    const lastChange = (this.latestOnOffChange - Date.now()) / 1000;
    if (currentValue && lastChange > 30) {
      this.latestOnOffChange = Date.now();
      this.setCapabilityValue('onoff', false).catch(this.error);
      // this._driver.triggerTvOff(this);
    }
  };

  handleOn() {
    this.connect();
    const currentValue = this.getCapabilityValue('onoff');
    const lastChange = (this.latestOnOffChange - Date.now()) / 1000;
    if (!currentValue && lastChange > 30) {
      this.latestOnOffChange = Date.now();
      this.setCapabilityValue('onoff', true).catch(this.error);
      // this._driver.triggerTvOn(this);
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
}

module.exports = WebosPlusDevice;
