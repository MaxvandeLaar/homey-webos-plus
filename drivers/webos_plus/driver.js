'use strict';

const Homey = require('homey');
const { ManagerArp } = require('homey');
const http = require('http');

class WebosPlusDriver extends Homey.Driver {
  onInit() {
    this.log('WebosPlus Driver has been inited');
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

    const devices = async() => {
      return Promise.all(Object.values(discoveryResults).map(result => this._mapDiscoveryResults(result)));
    };

    devices().then(result => {
      callback(null, result);
    }, (err) => {
      callback(err, null);
    });
  }

  static _getInfo( url) {

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
            result[ tag ] = this._getTextBetweenTags(tag, body)
          });

          resolve(result);
        });
        response.on('error', (err) => {
          reject(err);
        })
      });
    });
  }

  static _getTextBetweenTags( tag, string ) {
    let re1 = new RegExp('<' + tag + '>(.*?)<\/' + tag + '>', 'g');
    let matches = string.match(re1);

    let re2 = new RegExp('<\/?' + tag + '>', 'g');
    if( matches ) return matches[0].replace(re2,'');
    return null;
  }
}

module.exports = WebosPlusDriver;
