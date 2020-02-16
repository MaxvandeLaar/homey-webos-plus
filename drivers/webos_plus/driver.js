'use strict';

const Homey = require('homey');
const {ManagerArp} = require('homey');
const http = require('http');

class WebosPlusDriver extends Homey.Driver {
  onInit() {
    this.log('WebosPlus Driver has been inited');
  }

  ready(callback) {
    this.initActions();
    callback();
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
  }

  actionSendToast() {
    this._actionSendToast
      .registerRunListener((args, state) => {
        const device = args.webosDevice;
        const {message, iconData} = args;
        return new Promise((resolve, reject) => {
          device.sendToast(message,  iconData).then(() => {
            resolve(true);
          }, () => {resolve(true)});
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
          let channels = [];
          if (device.channelList.channels.length < 1 || device.channelList.date < new Date().setDate(new Date().getDate() - 1)) {
            device.connect();
            if (!device.lgtv) {
              return;
            }
            device.lgtv.request('ssap://tv/getChannelList', (err, result) => {
              if (err) {
                device.error(err);
              }
              if (result) {
                device.channelList.channels = result.channelList.map(channel => {
                  return {
                    name: channel.channelName,
                    description: channel.channelNumber,
                    number: channel.channelNumber,
                    search: `${channel.channelNumber} ${channel.channelName}`
                  };
                });
              }
              channels = device.channelList.channels.filter(channel => channel.search.toLowerCase().includes(query.toLowerCase()));
              channels = channels.sort((a, b) => {
                const numA = parseInt(a.number);
                const numB = parseInt(b.number);
                return numA > numB ? 1 : numB > numA ? -1 : 0;
              });
              resolve(channels);
            });
          } else {
            channels = device.channelList.channels.filter(channel => channel.search.toLowerCase().includes(query.toLowerCase()));
            channels = channels.sort((a, b) => {
              const numA = parseInt(a.number);
              const numB = parseInt(b.number);
              return numA > numB ? 1 : numB > numA ? -1 : 0;
            });
            resolve(channels);
          }
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
          let apps = [];
          if (device.launchPoints.apps.length < 1 || device.launchPoints.date < new Date().setDate(new Date().getDate() - 1)) {
            await device.connect();
            if (!device.lgtv) {
              return;
            }
            device.lgtv.request('ssap://com.webos.applicationManager/listLaunchPoints', (err, result) => {
              if (result) {
                device.launchPoints.apps = result.launchPoints.map(point => {
                  return {
                    name: point.title,
                    image: point.icon,
                    id: point.id
                  };
                });
              }
              apps = device.launchPoints.apps.filter(app => app.name.toLowerCase().includes(query.toLowerCase()));
              apps = apps.sort((a, b) => {
                return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : b.name.toLowerCase() > a.name.toLowerCase() ? -1 : 0;
              });
              resolve(apps);
            });
          } else {
            apps = device.launchPoints.apps.filter(app => app.name.toLowerCase().includes(query.toLowerCase()));
            apps = apps.sort((a, b) => {
              return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : b.name.toLowerCase() > a.name.toLowerCase() ? -1 : 0;
            });
            resolve(apps);
          }
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

  static _getTextBetweenTags(tag, string) {
    let re1 = new RegExp('<' + tag + '>(.*?)<\/' + tag + '>', 'g');
    let matches = string.match(re1);

    let re2 = new RegExp('<\/?' + tag + '>', 'g');
    if (matches) return matches[0].replace(re2, '');
    return null;
  }

}

module.exports = WebosPlusDriver;
