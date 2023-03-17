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

'use strict';

const fetch = require('node-fetch');
const WebOSTV = require('./webos/WebOSTV');
const {capabilities, store} = require('./webos/utils/constants');
const net = require('net');
const https = require('https');

const unsecureHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

class WebosPlusDevice extends WebOSTV {
  async onInit() {
    // Init LGTV
    this.construct();

    // Initialise media screen image
    this.image = await this.homey.images.createImage();
    this.image.setUrl(null);
    this.setAlbumArtImage(this.image)
    this._driver = this.homey.drivers.getDriver('webos_plus');

    this._driver.initReady(async () => {
      this.log('onInit: Device Ready!');
      this._connect();
      await this.registerCapabilities().catch(this.error);
      this.initDevice();
    });
  }

  onDiscoveryResult(discoveryResult) {
    this.setAvailable();
    discoveryResult.id = discoveryResult.id.replace(/uuid:/g, '');
    return discoveryResult.id === this.getData().id;
  }

  onDiscoveryAvailable(discoveryResult) {
    this.setAvailable();
    const ipAddress = this.getSettings().ipAddress;
    if (this.getSettings().manualIpAddress === true && ipAddress !== '0.0.0.0'){
      return Promise.resolve(true);
    }
    if (ipAddress !== discoveryResult.address) {
      this.setSettings({ipAddress: discoveryResult.address}).then(() => {
        this._connect();
      }).catch(this.error);
    }
    return Promise.resolve(true);
  }

  onDiscoveryAddressChanged(discoveryResult) {
    this.setAvailable();
    const ipAddress = this.getSettings().ipAddress;
    if (this.getSettings().manualIpAddress === true && ipAddress !== '0.0.0.0'){
      return Promise.resolve(true);
    }
    if (ipAddress !== discoveryResult.address) {
      this.setSettings({ipAddress: discoveryResult.address}).then(() => {
        this._connect();
      }).catch(this.error);
    }
    return Promise.resolve(true);
  }

  onDiscoveryLastSeenChanged(discoveryResult) {
    this.setAvailable();
    return Promise.resolve(true);
  }

  /**
   * Initialise the WebOS Tv
   * @returns {Promise<void>}
   */
  async initDevice() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    if (this.getSettings().usePoll) {
      this.poll();
    }
    this.lgtv.on('connect', () => {
      if (!this.getSettings().usePoll) {
        this.powerStateListener();
      }
      this.setCapabilityValue(capabilities.onOff, true);
      this.volumeListener();
      this.appListener();
      this.soundOutputListener();
      this.channelListener();
    });
    this.lgtv.on('close', () => {
      this.setCapabilityValue(capabilities.onOff, false);
    });
    this.lgtv.on('error', (error) => {
      if (error.code === 'EHOSTUNREACH') {
        this.setCapabilityValue(capabilities.onOff, false);
      }
    });
  }

  /**
   * Register all capabilities
   *
   * @returns {Promise<void>}
   */
  async registerCapabilities() {
    // Used for displaying the current app/input
    if (!this.hasCapability(capabilities.speakerArtist)) {
      await this.addCapability(capabilities.speakerArtist);
    }

    // Used for displaying the current channel
    if (!this.hasCapability(capabilities.speakerTrack)) {
      await this.addCapability(capabilities.speakerTrack);
    }

    // Used for displaying the app/input icon
    if (!this.hasCapability(capabilities.speakerAlbum)) {
      await this.addCapability(capabilities.speakerAlbum);
    }

    if (!this.hasCapability(capabilities.speakerPlaying)) {
      await this.addCapability(capabilities.speakerPlaying);
    }

    if (!this.hasCapability(capabilities.speakerNext)) {
      await this.addCapability(capabilities.speakerNext);
    }

    if (!this.hasCapability(capabilities.speakerPrev)) {
      await this.addCapability(capabilities.speakerPrev);
    }

    this.registerCapabilityListener(capabilities.onOff, this.toggleOnOff.bind(this));
    this.registerCapabilityListener(capabilities.volumeSet, this.volumeSet.bind(this));
    this.registerCapabilityListener(capabilities.volumeMute, this.volumeMute.bind(this));
    this.registerCapabilityListener(capabilities.volumeUp, this.volumeUp.bind(this));
    this.registerCapabilityListener(capabilities.volumeDown, this.volumeDown.bind(this));
    this.registerCapabilityListener(capabilities.channelUp, this._channelUp.bind(this));
    this.registerCapabilityListener(capabilities.channelDown, this._channelDown.bind(this));
    this.registerCapabilityListener(capabilities.speakerPlaying, this._mediaTogglePlayPause.bind(this));
    this.registerCapabilityListener(capabilities.speakerNext, this._mediaNext.bind(this));
    this.registerCapabilityListener(capabilities.speakerPrev, this._mediaPrev.bind(this));
  }

  /**
   * Listen for changes in on/off state
   */
  powerStateListener() {
    this.log(`powerStateListener: Called`);
    this._powerStateListener(() => {
      this.log(`powerStateListener: received on`);
      this.setCapabilityValue(capabilities.onOff, true);
    }, () => {
      this.log(`powerStateListener: received off`);
      this.setCapabilityValue(capabilities.onOff, false);
    });
  }

  onSettings(oldSettings, newSettings, changedKeys) {
    if (oldSettings.usePoll !== newSettings.usePoll){
      this.lgtv.disconnect();
      this.construct();
      this._connect();
      this.initDevice();
    }
    if (newSettings.usePoll) {
      this.poll();
    }
    return Promise.resolve(true);
  }

  poll() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.pollInterval = setInterval(() => {
      const client = new net.Socket();
      const cancel = setTimeout(() => {
        if (this.getCapabilityValue(capabilities.onOff)){
          this.setCapabilityValue(capabilities.onOff, false);
        }
        client.destroy();
      }, this.getSettings().pollTimeout * 1000);

      client.on('error', (error) => {
        if (this.getCapabilityValue(capabilities.onOff)){
          this.setCapabilityValue(capabilities.onOff, false);
        }
        this.error(error);
        clearTimeout(cancel);
        client.destroy();
      });

      client.connect(3000, this.getSettings().ipAddress, () => {
        if (!this.getCapabilityValue(capabilities.onOff)) {
          this.setCapabilityValue(capabilities.onOff, true);
          if (!this.subsSet) {
            this.lgtv.disconnect();
            this.construct();
            this._connect();
            this.initDevice();
          }
        }
        clearTimeout(cancel);
        client.destroy();
      });
    }, this.getSettings().pollInterval * 1000);
  }

  checkOnOff(value) {
    if (value === null || value === undefined || value === '') {
      this.setCapabilityValue(capabilities.onOff, false);
      return false;
    } else {
      this.setCapabilityValue(capabilities.onOff, true);
      return true;
    }
  }

  /**
   * Listen for changes in volume
   */
  volumeListener() {
    this.log(`volumeListener: Called`);
    this._volumeListener((newVolume) => {
      if (!this.checkOnOff(newVolume)) {
        return;
      }
      const currentVolume = this.getCapabilityValue(capabilities.volumeSet);
      this.log(`volumeListener: Volume changed from ${currentVolume} to ${newVolume}`);
      if (currentVolume !== newVolume) {
        this.log(`volumeListener: Capability ${capabilities.volumeSet} to ${newVolume}`);
        this.setCapabilityValue(capabilities.volumeSet, newVolume);
      }
    }, (newMutedValue) => {
      if (!this.checkOnOff(newMutedValue)) {
        return;
      }
      const currentMute = this.getCapabilityValue(capabilities.volumeMute);
      this.log(`volumeListener: Mute changed from ${currentMute} to ${newMutedValue}`);
      if (currentMute !== newMutedValue) {
        this.log(`volumeListener: Capability ${capabilities.volumeMute} to ${newMutedValue}`);
        this.setCapabilityValue(capabilities.volumeMute, newMutedValue)
          .catch(this.error);
        this._driver.triggerVolumeMuteChanged(this, {}, {muted: newMutedValue});
      }
    });
  }

  /**
   * Listen for changes in app/input
   */
  appListener() {
    this.log(`appListener: Called`);
    this._appListener(async (newAppId) => {
      const oldAppId = this.getStoreValue(store.currentApp);
      this.log(`appListener: App/input changed from ${oldAppId} to ${newAppId}`);
      if (!this.checkOnOff(newAppId)) {
        return;
      }

      if (newAppId !== oldAppId) {
        this.log(`appListener: Store ${store.currentApp} set to ${newAppId}`);
        this.setStoreValue(store.currentApp, newAppId);

        this.log(`appListener: Flow trigger app/input changed`);
        this._driver.triggerAppChanged(this, {
          oldApp: oldAppId,
          newApp: newAppId
        }, {
          oldApp: oldAppId,
          newApp: newAppId
        });
      }

      this.log(`appListener: Gather media screen information for ${newAppId}`);
      const allApps = await this._appListLaunchPoints().catch(this.error);
      if (!allApps) {
        this.error('appListener: No Apps/inputs found');
        return;
      }
      const app = allApps.find(app => app.id === newAppId);
      if (!app) {
        this.error(`appListener: No app found for ${newAppId}`);
        return;
      }

      this.log(`appListener: App found for '${newAppId}' ${app.name}`);
      this.setCapabilityValue(capabilities.speakerArtist, app.name);

      this.log(`appListener: Try to get the current channel to gather more media screen information for '${newAppId}' ${app.name}`);
      const channel = await this._channelCurrent().catch(this.error);
      if (!channel) {
        this.log(`appListener: No channel found for '${newAppId}' ${app.name}, probably not LiveTV. Set capability ${capabilities.speakerTrack} to empty string`);
        this.setCapabilityValue(capabilities.speakerTrack, '');
      } else {
        this.log(`appListener: Channel found for '${newAppId}' ${app.name}. Set capability ${capabilities.speakerTrack} to '${this._formatSpeakerTrack(channel.channelNumber, channel.channelName)}'`);
        this.setCapabilityValue(capabilities.speakerTrack, this._formatSpeakerTrack(channel.channelNumber, channel.channelName));
      }

      if (!app.imageLarge && !app.image) {
        this.log(`appListener: No image found for '${newAppId}' ${app.name}`);
        return;
      }

      this.log(`appListener: Set image for '${newAppId}' ${app.name} (${app.imageLarge || app.image})`);
      this.image.setStream(async (stream) => {

        const appImage = await fetch(app.imageLarge || app.image, {method: 'get', agent: unsecureHttpsAgent}).catch(console.error);

        if (!appImage.ok) {
          this.error('appListener: Get image failed');
          throw new Error('Invalid Response');
        }

        return appImage.body.pipe(stream);
      });

      this.image.update();
    });
  }

  /**
   * Listen for changes in sound output
   */
  soundOutputListener() {
    this.log(`soundOutputListener: Called`);
    this._soundOutputListener((newSoundOutput) => {
      if (!this.checkOnOff(newSoundOutput)) {
        return;
      }

      const oldSoundOutput = this.getStoreValue(store.currentSoundOutput);
      this.log(`soundOutputListener: Sound output changed from ${oldSoundOutput} to ${newSoundOutput}`);

      if (newSoundOutput && oldSoundOutput !== newSoundOutput) {
        this.log(`soundOutputListener: Store ${store.currentSoundOutput} to ${newSoundOutput}`);
        this.setStoreValue(store.currentSoundOutput, newSoundOutput);

        this.log(`soundOutputListener: Flow trigger sound output changed`);
        this._driver.triggerSoundOutputChanged(this, {
          oldSoundOutput,
          newSoundOutput
        }, {
          oldSoundOutput,
          newSoundOutput
        });
      }
    });
  }

  /**
   * Listen for changes in channel
   */
  channelListener() {
    this.log(`channelListener: Called`);
    this._channelListener((newChannel) => {
      if (!this.checkOnOff(newChannel)) {
        return;
      }
      const oldChannel = this.getStoreValue(store.currentChannel);
      this.log(`channelListener: Channel changed from ${oldChannel} to ${newChannel.channelName}`);

      this.log(`channelListener: Set capability ${capabilities.speakerTrack} to '${this._formatSpeakerTrack(newChannel.channelNumber, newChannel.channelName)}'`);
      this.setCapabilityValue(capabilities.speakerTrack, this._formatSpeakerTrack(newChannel.channelNumber, newChannel.channelName));

      if (`${newChannel.channelNumber}` !== `${oldChannel}`) {
        this.log(`channelListener: Set Store ${store.currentChannel} to '${newChannel.channelNumber}'`);
        this.setStoreValue(store.currentChannel, `${newChannel.channelNumber}`);

        this.log(`soundOutputListener: Flow trigger channel changed`);
        this._driver.triggerChannelChanged(this, {
          oldChannel,
          newChannel: newChannel.channelNumber
        }, {
          oldChannel,
          newChannel: newChannel.channelNumber
        });
      }
    });
  }

  /**
   * Toggle power state on/off
   *
   * @param {boolean} value Represents on|off with true|false
   * @returns {Promise<void>}
   */
  async toggleOnOff(value) {
    this.log(`toggleOnOff: Called`, value);
    if (value) {
      this.log(`toggleOnOff: Try to turn the tv on`);
      const on = await this._turnOn().catch(this.error);
      if (on) {
        this.log(`toggleOnOff: TV turned on. Set capability ${capabilities.onOff} to ${value}`);
        this.setCapabilityValue(capabilities.onOff, true);
      }
    } else {
      this.log(`toggleOnOff: Try to turn the tv off`);
      const off = this._turnOff().catch(this.error);
      if (off) {
        this.log(`toggleOnOff: TV turned off. Set capability ${capabilities.onOff} to ${value}`);
        this.setCapabilityValue(capabilities.onOff, false);
      }
    }
  }

  /**
   * Set the volume to a specific value
   *
   * @param {number} value Represents the volume value
   * @returns {Promise<void>}
   */
  async volumeSet(value) {
    this.log(`volumeSet: Called`, value);
    this.log(`volumeSet: Try to set the volume to ${value}`);
    const newVolume = await this._volumeSet(value).catch(this.error);
    if (newVolume) {
      this.log(`volumeSet: Volume set. Set capability ${capabilities.volumeSet} to ${value}`);
      this.setCapabilityValue(capabilities.volumeSet, value);
    }
  }

  /**
   * Toggle mute
   *
   * @param value
   * @returns {Promise<void>}
   */
  async volumeMute(value) {
    this.log(`volumeMute: Called`, value);
    this.log(`volumeMute: Try to set mute to ${value}`);
    const response = await this._volumeMute(value);
    if (response) {
      this.log(`volumeMute: Mute set. Set capability ${capabilities.volumeMute} to ${value}`);
      this.setCapabilityValue(capabilities.volumeMute, response.muted);
    }
  }

  /**
   * Increase volume by 1
   *
   * @returns {Promise<void>}
   */
  async volumeUp() {
    this.log(`volumeUp: Called`);
    const volume = this.getCapabilityValue(capabilities.volumeSet);
    this.log(`volumeUp: Current volume ${volume}. Try to increase the volume`);
    const response = await this._volumeUp();
    if (response) {
      this.log(`volumeUp: Volume increased. Set capability ${capabilities.volumeSet} to ${volume + 1}`);
      this.setCapabilityValue(capabilities.volumeSet, volume + 1);
    }
  };

  /**
   * Decrease volume by 1
   * @returns {Promise<void>}
   */
  async volumeDown() {
    this.log(`volumeDown: Called`);
    const volume = this.getCapabilityValue(capabilities.volumeSet);
    this.log(`volumeDown: Current volume ${volume}. Try to decrease the volume`);
    const response = await this._volumeDown();
    if (response) {
      this.log(`volumeDown: Volume decreased. Set capability ${capabilities.volumeSet} to ${volume - 1}`);
      this.setCapabilityValue(capabilities.volumeSet, volume - 1);
    }
  }

  /**
   * Get all apps with filter option by name
   *
   * @param {string} query Search value
   * @returns {Promise<*[]>}
   */
  async filteredAppList(query = '') {
    const device = this;
    this.log(`filteredAppList: Called`, query);

    function _filter(list, query) {
      device.log(`filteredAppList: Filter list with query '${query}'`, list);
      let tmp = list.filter(app => app.name.toLowerCase().includes(query.toLowerCase()));
      device.log(`filteredAppList: Filter sort result by name`, tmp);
      return tmp.sort((a, b) => {
        return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : b.name.toLowerCase() > a.name.toLowerCase() ? -1 : 0;
      });
    }

    this.log(`filteredAppList: try to get all apps/inputs`);
    const list = await this._appList().catch(this.error);
    if (!list) {
      this.error(`filteredAppList: No apps/inputs found! Return empty array`);
      return [];
    }
    return _filter(list, query);
  }

  /**
   * Get all external inputs with filter option by label
   *
   * @param {string} query Search value
   * @returns {Promise<*[]>}
   */
  async filteredExternalInputList(query = '') {
    const device = this;
    this.log(`filteredExternalInputList: Called`, query);

    function _filter(list, query) {
      device.log(`filteredExternalInputList: Filter list with query '${query}'`, list);
      let tmp = list.filter(input => input.name.toLowerCase().includes(query.toLowerCase()));
      device.log(`filteredExternalInputList: Filter sort result by label`, tmp);
      return tmp.sort((a, b) => {
        return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : b.name.toLowerCase() > a.name.toLowerCase() ? -1 : 0;
      });
    }

    this.log(`filteredExternalInputList: try to get all external inputs`);
    const list = await this._externalInputList().catch(this.error);
    if (!list) {
      this.error(`filteredExternalInputList: No external inputs found! Return empty array`);
      return [];
    }
    return _filter(list, query);
  }

  /**
   * Get all channels with filter option by name or number
   *
   * @param {string} query Search value
   * @returns {Promise<*[]>}
   */
  async filteredChannelList(query = '') {
    this.log(`filteredChannelList: Called`, query);
    const device = this;

    function _filter(list, query) {
      device.log(`filteredChannelList: Filter list with query '${query}'`, list);
      let tmp = list.filter(channel => channel.search.toLowerCase().includes(query.toLowerCase()));
      device.log(`filteredChannelList: Filter sort result by number`, tmp);
      return tmp.sort((a, b) => {
        const numA = parseInt(a.number);
        const numB = parseInt(b.number);
        return numA > numB ? 1 : numB > numA ? -1 : 0;
      });
    }

    this.log(`filteredChannelList: try to get all channels`);
    const list = await this._channelList().catch(this.error);
    if (!list) {
      this.error(`filteredChannelList: No channels found! Return empty array`);
      return [];
    }
    return _filter(list, query);
  }

  /**
   * Format the speaker track
   *
   * @param {string|number} number The channel number
   * @param {string} name The channel name
   * @returns {string}
   * @private
   */
  _formatSpeakerTrack(number, name) {
    let track = number ? `${number}` : '';

    if (name) {
      track = track && track.length > 0 ? `${track} | ${name}` : `${name};`
    }
    return track;
  };
}

module.exports = WebosPlusDevice;
