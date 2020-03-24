'use strict';

const Homey = require('homey');
const {ManagerArp} = require('homey');
const http = require('http');
const https = require('https');

class WebosPlusDriver extends Homey.Driver {
  onInit() {
    this.log('WebosPlus Driver has been inited');
  }

  ready(callback) {
    this.initTriggers();
    this.initActions();
    this.initConditions();
    callback();
  }

  initTriggers() {
    this._triggerChannelChanged = new Homey.FlowCardTriggerDevice('webos_channel_changed').register();
    this._triggerChannelChangedToList = new Homey.FlowCardTriggerDevice('webos_channel_changed_to_list')
      .registerRunListener(( args, state ) => {
        return Promise.resolve( args.channel.number && `${args.channel.number}` === `${state.newChannel}` );
      })
      .register();
    this._triggerChannelChangedToNumber = new Homey.FlowCardTriggerDevice('webos_channel_changed_to_number')
      .registerRunListener(( args, state ) => {
        return Promise.resolve( args.channel && `${args.channel}` === `${state.newChannel}` );
      })
      .register();
    this._triggerChannelChangedToList
      .getArgument('channel')
      .registerAutocompleteListener((query, args) => {
        const device = args.webosDevice;
        return new Promise(async (resolve) => {
          const channels = await device.getChannelList(query);
          resolve(channels);
        });
      });

    this._triggerAppChanged = new Homey.FlowCardTriggerDevice('webos_app_changed').register();
    this._triggerAppChangedTo = new Homey.FlowCardTriggerDevice('webos_app_changed_to')
      .registerRunListener(( args, state ) => {
        return Promise.resolve( args.app && args.app.id === state.newApp );
      })
      .register();
    this._triggerAppChangedTo
      .getArgument('app')
      .registerAutocompleteListener((query, args) => {
        const device = args.webosDevice;
        return new Promise(async (resolve) => {
          const apps = await device.getAppList(query);
          resolve(apps);
        });
      });
    this._triggerSoundOutputChanged = new Homey.FlowCardTriggerDevice('webos_sound_output_changed').register();
    this._triggerSoundOutputChangedTo = new Homey.FlowCardTriggerDevice('webos_sound_output_changed_to')
      .registerRunListener(( args, state ) => {
        return Promise.resolve( args.output === state.newSoundOutput );
      })
      .register();
  }

  triggerChannelChanged(device, tokens, state) {
    this._triggerChannelChanged
      .trigger(device, tokens, state)
      .catch(this.error);
    this._triggerChannelChangedToList
      .trigger(device, tokens, state)
      .catch(this.error);
    this._triggerChannelChangedToNumber
      .trigger(device, tokens, state)
      .catch(this.error);
  }

  triggerAppChanged(device, tokens, state) {
    this._triggerAppChanged
      .trigger(device, tokens, state)
      .catch(this.error);
    this._triggerAppChangedTo
      .trigger(device, tokens, state)
      .catch(this.error);
  }

  triggerSoundOutputChanged(device, tokens, state) {
    this._triggerSoundOutputChanged
      .trigger(device, tokens, state)
      .catch(this.error);
    this._triggerSoundOutputChangedTo
      .trigger(device, tokens, state)
      .catch(this.error);
  }

  initConditions() {
    this._conditionMuted = new Homey.FlowCardCondition('webos_muted');
    this.conditionMuted();
    this._conditionVolumeEquals = new Homey.FlowCardCondition('webos_volume_equals');
    this.conditionVolumeEquals();
    this._conditionVolumeSmaller = new Homey.FlowCardCondition('webos_volume_smaller');
    this.conditionVolumeSmaller();
    this._conditionVolumeLarger = new Homey.FlowCardCondition('webos_volume_larger');
    this.conditionVolumeLarger();
    this._conditionChannelNumber = new Homey.FlowCardCondition('webos_channel_number');
    this.conditionChannelNumber();
    this._conditionChannelList = new Homey.FlowCardCondition('webos_channel_list');
    this.conditionChannelList();
    this._conditionApp = new Homey.FlowCardCondition('webos_app');
    this.conditionApp();
    this._conditionSoundOutput = new Homey.FlowCardCondition('webos_sound_output');
    this.conditionSoundOutput();
  }

  initActions() {
    this._actionChangeChannelList = new Homey.FlowCardAction('change_channel_list');
    this.actionChangeChannelList();
    this._actionChangeChannelNumber = new Homey.FlowCardAction('change_channel_number');
    this.actionChangeChannelNumber();
    this._actionLaunchApp = new Homey.FlowCardAction('launch_app');
    this.actionLaunchApp();
    this._actionSimulateButton = new Homey.FlowCardAction('simulate_button');
    this.actionSimulateButton();
    this._actionSendToast = new Homey.FlowCardAction('send_toast');
    this.actionSendToast();
    this._actionSendToastWithImage = new Homey.FlowCardAction('send_toast_with_image');
    this.actionSendToastWithImage();
    this._actionChangeSoundOutput = new Homey.FlowCardAction('change_sound_output');
    this.actionChangeSoundOutput();
  }

  conditionSoundOutput() {
    this._conditionSoundOutput
      .register()
      .registerRunListener(async (args, state) => {
        const device = args.webosDevice;
        const output = args.output;
        return new Promise((resolve, reject) => {
          device.getCurrentSoundOutput().then((res) => {
            resolve(res.toLowerCase() === output.toLowerCase())
          }, reject);
        });
      });
  }

  conditionChannelNumber() {
    this._conditionChannelNumber
      .register()
      .registerRunListener(async (args, state) => {
        const device = args.webosDevice;
        const channel = args.channel;
        return new Promise((resolve, reject) => {
          device.getCurrentChannel().then((res) => {
              resolve(`${channel}` === res.channelNumber);
            },
            (err) => {
              reject(err)
            });
        });
      });
  }

  conditionChannelList() {
    this._conditionChannelList
      .register()
      .registerRunListener(async (args, state) => {
        const device = args.webosDevice;
        const channel = args.channel;
        return new Promise((resolve, reject) => {
          device.getCurrentChannel().then((res) => {
              resolve(channel.number === res.channelNumber);
            },
            (err) => {
              reject(err)
            });
        });
      })
      .getArgument('channel')
      .registerAutocompleteListener((query, args) => {
        const device = args.webosDevice;
        return new Promise(async (resolve) => {
          const apps = await device.getChannelList(query);
          resolve(apps);
        });
      });
  }

  conditionVolumeLarger() {
    this._conditionVolumeLarger
      .register()
      .registerRunListener((args, state) => {
        const device = args.webosDevice;
        const volume = args.volume;
        const deviceVolume = device.getValue('volume_set');
        return Promise.resolve(deviceVolume > volume);
      });
  }

  conditionVolumeSmaller() {
    this._conditionVolumeSmaller
      .register()
      .registerRunListener((args, state) => {
        const device = args.webosDevice;
        const volume = args.volume;
        const deviceVolume = device.getValue('volume_set');
        return Promise.resolve(deviceVolume < volume);
      });
  }

  conditionVolumeEquals() {
    this._conditionVolumeEquals
      .register()
      .registerRunListener((args, state) => {
        const device = args.webosDevice;
        const volume = args.volume;
        const deviceVolume = device.getValue('volume_set');
        return Promise.resolve(deviceVolume === volume);
      });
  }

  conditionMuted() {
    this._conditionMuted
      .register()
      .registerRunListener((args, state) => {
        const device = args.webosDevice;
        const muted = device.getValue('volume_mute');
        return Promise.resolve(muted);
      });
  }

  conditionApp() {
    this._conditionApp
      .register()
      .registerRunListener(async (args, state) => {
        const device = args.webosDevice;
        const app = args.app;
        return new Promise((resolve, reject) => {
          device.getCurrentApp().then((res) => {
              resolve(app.id === res.appId);
            },
            (err) => {
              reject(err)
            });
        });
      })
      .getArgument('app')
      .registerAutocompleteListener((query, args) => {
        const device = args.webosDevice;
        return new Promise(async (resolve) => {
          const apps = await device.getAppList(query);
          resolve(apps);
        });
      });
  }

  actionChangeSoundOutput() {
    this._actionChangeSoundOutput
      .registerRunListener((args, state) => {
        const device = args.webosDevice;
        const {output} = args;
        return new Promise((resolve, reject) => {
          device.setSoundOutput(output).then(() => {
            resolve(true);
          }, reject)
        });
      })
      .register();
  }

  actionSendToastWithImage() {
    this._actionSendToastWithImage
      .registerRunListener((args, state) => {
        const device = args.webosDevice;
        const {message, droptoken} = args;
        let icon = '';
        return new Promise(async (resolve, reject) => {
          if (droptoken) {
            const imageStream = await droptoken.getStream();
            icon = await new Promise((resolve) => {
              imageStream.setEncoding('binary');
              const type = imageStream.contentType;
              const prefix = `data:${type};base64,`;
              let body = '';

              imageStream.on('data', (chunk) => {
                body += chunk;
              });

              imageStream.on('end', () => {
                const base64 = Buffer.from(body, 'binary').toString('base64');
                const data = prefix + base64;
                return resolve(data);
              });
            });
          }

          device.sendToast(message, icon).then(() => {
            resolve(true);
          }, () => {
            resolve(true)
          });
        });
      })
      .register()
  }

  actionSendToast() {
    this._actionSendToast
      .registerRunListener((args, state) => {
        const device = args.webosDevice;
        const {message, iconData} = args;
        let icon = iconData;
        return new Promise(async (resolve, reject) => {
          if (this._isUrl(iconData)) {
            icon = await this.encodeImage(iconData);
          }

          device.sendToast(message, icon).then(() => {
            resolve(true);
          }, () => {
            resolve(true)
          });
        });
      })
      .register()
  }

  actionSimulateButton() {
    this._actionSimulateButton
      .registerRunListener((args, state) => {
        const device = args.webosDevice;
        return new Promise((resolve, reject) => {
          device.simulateButton(args.button).then(() => {
            resolve(true);
          }, (_error) => {
            reject(false)
          });
        });
      })
      .register()
      .getArgument('button');
  }

  actionChangeChannelNumber() {
    this._actionChangeChannelNumber
      .registerRunListener((args, state) => {
        const device = args.webosDevice;
        return new Promise((resolve, reject) => {
          device.changeChannelTo(`${args.channel}`).then(() => {
            resolve(true);
          }, () => resolve(true));
        });
      })
      .register()
      .getArgument('channel');
  }

  actionChangeChannelList() {
    this._actionChangeChannelList
      .registerRunListener((args, state) => {
        const device = args.webosDevice;
        return new Promise((resolve, reject) => {
          device.changeChannelTo(args.channel.number).then(() => {
            resolve(true);
          }, () => resolve(true));
        });
      })
      .register()
      .getArgument('channel')
      .registerAutocompleteListener((query, args) => {
        const device = args.webosDevice;
        return new Promise(async (resolve) => {
          const channels = await device.getChannelList(query);
          resolve(channels);
        });
      });
  }

  actionLaunchApp() {
    this._actionLaunchApp
      .registerRunListener((args, state) => {
        const device = args.webosDevice;
        return new Promise((resolve, reject) => {
          device.launchApp(args.app.id).then(() => {
            resolve(true);
          }, (_error) => {
            resolve(false);
          });
        });
      })
      .register()
      .getArgument('app')
      .registerAutocompleteListener((query, args) => {
        const device = args.webosDevice;
        return new Promise(async (resolve) => {
          const apps = await device.getAppList(query);
          resolve(apps);
        });
      });
  }

  async _mapDiscoveryResults(result) {
    return new Promise(async (resolve, _reject) => {
      const info = await WebosPlusDriver._getInfo(result.headers.location).catch(this.error);
      const macAddress = await ManagerArp.getMAC(result.address).catch(this.error);
      const device = {
        name: info && info.friendlyName ? info.friendlyName : result.address,
        data: {
          id: result.id.replace(/uuid:/g, ''),
        },
        settings: {
          macAddress,
          ipAddress: result.address
        }
      };
      resolve(device);
    });
  }

  onPairListDevices(data, callback) {
    const discoveryStrategy = this.getDiscoveryStrategy();
    const discoveryResults = discoveryStrategy.getDiscoveryResults();

    const devices = async () => {
      return Promise.all(Object.values(discoveryResults).map(result => this._mapDiscoveryResults(result)));
    };

    devices().then(result => {
      callback(null, result);
    }, (err) => {
      callback(err, null);
    });
  }

  static _getInfo(url) {

    return new Promise((resolve, reject) => {
      http.get(url, (response) => {
        // Continuously update stream with data
        let body = '';
        response.on('data', (d) => {
          body += d;
        });
        response.on('end', () => {

          let tags = [
            'deviceType',
            'friendlyName',
            'manufacturer',
            'manufacturerURL',
            'modelDescription',
            'modelName',
            'modelURL',
            'modelNumber',
            'UDN'
          ];

          let result = {};
          tags.forEach((tag) => {
            result[tag] = this._getTextBetweenTags(tag, body)
          });

          resolve(result);
        });
        response.on('error', (err) => {
          reject(err);
        })
      });
    });
  }

  _isUrl(str) {
    const regexp = new RegExp(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/i);
    return regexp.test(str);
  }

  encodeImage(imageUrl) {
    return new Promise((resolve, reject) => {
      let request = https;
      if (imageUrl.startsWith('https')) {
        request = https;
      } else if (imageUrl.startsWith('http')) {
        request = http;
      } else {
        request = https;
        imageUrl = `https://${imageUrl}`;
      }

      request.get(imageUrl, (response) => {
        response.setEncoding('binary');
        const type = response.headers['content-type'];
        const prefix = `data:${type};base64,`;
        let body = '';

        response.on('data', (chunk) => {
          body += chunk;
        });

        response.on('end', () => {
          const base64 = Buffer.from(body, 'binary').toString('base64');
          const data = prefix + base64;
          return resolve(data);
        });
      });
    });
  }

  static _getTextBetweenTags(tag, string) {
    let re1 = new RegExp('<' + tag + '>(.*?)<\/' + tag + '>', 'g');
    let matches = string.match(re1);

    let re2 = new RegExp('<\/?' + tag + '>', 'g');
    if (matches) return matches[0].replace(re2, '');
    return null;
  }

}

module.exports = WebosPlusDriver;
