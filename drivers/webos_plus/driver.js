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

'use strict'

const Homey = require('homey')
const http = require('http')
const https = require('https')
const {capabilities} = require('./webos/utils/constants')

class WebosPlusDriver extends Homey.Driver {
  onInit() {
    this.log('WebosPlus Driver has been inited')
  }

  initReady(callback) {
    this.initTriggers()
    this.initActions()
    this.initConditions()
    callback()
  }

  initTriggers() {
    this._triggerChannelChanged = this.homey.flow.getDeviceTriggerCard('webos_channel_changed')
    this._triggerVolumeMuted = this.homey.flow.getDeviceTriggerCard('webos_volume_muted')
    this._triggerVolumeUnmuted = this.homey.flow.getDeviceTriggerCard('webos_volume_unmuted')
    this._triggerChannelChangedToList = this.homey.flow.getDeviceTriggerCard('webos_channel_changed_to_list')
      .registerRunListener((args, state) => {
        return Promise.resolve(args.channel.number && `${ args.channel.number }` === `${ state.newChannel }`)
      })
    this._triggerChannelChangedToNumber = this.homey.flow.getDeviceTriggerCard('webos_channel_changed_to_number')
      .registerRunListener((args, state) => {
        return Promise.resolve(args.channel && `${ args.channel }` === `${ state.newChannel }`)
      })
    this._triggerChannelChangedToList
      .getArgument('channel')
      .registerAutocompleteListener((query, args) => {
        const device = args.webosDevice
        return new Promise(async (resolve) => {
          const channels = await device.filteredChannelList(query)
          resolve(channels)
        })
      })

    this._triggerAppChanged = this.homey.flow.getDeviceTriggerCard('webos_app_changed')
    this._triggerAppChangedTo = this.homey.flow.getDeviceTriggerCard('webos_app_changed_to')
      .registerRunListener((args, state) => {
        return Promise.resolve(args.app && args.app.id === state.newApp)
      })
    this._triggerAppChangedTo
      .getArgument('app')
      .registerAutocompleteListener((query, args) => {
        const device = args.webosDevice
        return new Promise(async (resolve) => {
          const apps = await device.filteredAppList(query)
          resolve(apps)
        })
      })
    this._triggerSoundOutputChanged = this.homey.flow.getDeviceTriggerCard('webos_sound_output_changed')
    this._triggerSoundOutputChangedTo = this.homey.flow.getDeviceTriggerCard('webos_sound_output_changed_to')
      .registerRunListener((args, state) => {
        return Promise.resolve(args.output === state.newSoundOutput)
      })
  }

  triggerChannelChanged(device, tokens, state) {
    this._triggerChannelChanged
      .trigger(device, tokens, state)
      .catch(this.error)
    this._triggerChannelChangedToList
      .trigger(device, tokens, state)
      .catch(this.error)
    this._triggerChannelChangedToNumber
      .trigger(device, tokens, state)
      .catch(this.error)
  }

  triggerAppChanged(device, tokens, state) {
    this._triggerAppChanged
      .trigger(device, tokens, state)
      .catch(this.error)
    this._triggerAppChangedTo
      .trigger(device, tokens, state)
      .catch(this.error)
  }

  triggerSoundOutputChanged(device, tokens, state) {
    this._triggerSoundOutputChanged
      .trigger(device, tokens, state)
      .catch(this.error)
    this._triggerSoundOutputChangedTo
      .trigger(device, tokens, state)
      .catch(this.error)
  }

  triggerVolumeMuteChanged(device, tokens, state) {
    if (state.muted) {
      this._triggerVolumeMuted
        .trigger(device, tokens, state)
        .catch(this.error)
    } else {
      this._triggerVolumeUnmuted
        .trigger(device, tokens, state)
        .catch(this.error)
    }
  }

  initConditions() {
    this._conditionMuted = this.homey.flow.getConditionCard('webos_muted')
    this.conditionMuted()
    this._conditionVolumeEquals = this.homey.flow.getConditionCard('webos_volume_equals')
    this.conditionVolumeEquals()
    this._conditionVolumeSmaller = this.homey.flow.getConditionCard('webos_volume_smaller')
    this.conditionVolumeSmaller()
    this._conditionVolumeLarger = this.homey.flow.getConditionCard('webos_volume_larger')
    this.conditionVolumeLarger()
    this._conditionChannelNumber = this.homey.flow.getConditionCard('webos_channel_number')
    this.conditionChannelNumber()
    this._conditionChannelList = this.homey.flow.getConditionCard('webos_channel_list')
    this.conditionChannelList()
    this._conditionApp = this.homey.flow.getConditionCard('webos_app')
    this.conditionApp()
    this._conditionSoundOutput = this.homey.flow.getConditionCard('webos_sound_output')
    this.conditionSoundOutput()
  }

  initActions() {
    this._actionChangeChannelList = this.homey.flow.getActionCard('change_channel_list')
    this.actionChangeChannelList()
    this._actionChangeChannelNumber = this.homey.flow.getActionCard('change_channel_number')
    this.actionChangeChannelNumber()
    this._actionLaunchApp = this.homey.flow.getActionCard('launch_app')
    this.actionLaunchApp()
    this._actionSimulateButton = this.homey.flow.getActionCard('simulate_button')
    this.actionSimulateButton()
    this._actionSendToast = this.homey.flow.getActionCard('send_toast')
    this.actionSendToast()
    this._actionSendToastWithImage = this.homey.flow.getActionCard('send_toast_with_image')
    this.actionSendToastWithImage()
    this._actionChangeSoundOutput = this.homey.flow.getActionCard('change_sound_output')
    this.actionChangeSoundOutput()
    this._actionSwitchInput = this.homey.flow.getActionCard('switch_input')
    this.actionSwitchInput()
    this._actionSendAlert = this.homey.flow.getActionCard('send_alert')
    this.actionSendAlert()
  }

  conditionSoundOutput() {
    this._conditionSoundOutput
      .registerRunListener((args, state) => {
        const device = args.webosDevice
        const output = args.output
        return new Promise((resolve, reject) => {
          device._soundOutputCurrent().then((res) => {
            resolve(res.toLowerCase() === output.toLowerCase())
          }, reject)
        })
      })
  }

  conditionChannelNumber() {
    this._conditionChannelNumber
      .registerRunListener((args, state) => {
        const device = args.webosDevice
        const channel = args.channel
        return new Promise((resolve, reject) => {
          device._channelCurrent().then((res) => {
            resolve(`${ channel }` === res.channelNumber)
          }, (err) => {
            reject(err)
          })
        })
      })
  }

  conditionChannelList() {
    this._conditionChannelList
      .registerRunListener(async (args, state) => {
        const device = args.webosDevice
        const channel = args.channel
        return new Promise((resolve, reject) => {
          device._channelCurrent().then((res) => {
            resolve(channel.number === res.channelNumber)
          }, (err) => {
            reject(err)
          })
        })
      })
      .getArgument('channel')
      .registerAutocompleteListener((query, args) => {
        const device = args.webosDevice
        return new Promise(async (resolve) => {
          const apps = await device.filteredChannelList(query)
          resolve(apps)
        })
      })
  }

  conditionVolumeLarger() {
    this._conditionVolumeLarger
      .registerRunListener((args, state) => {
        const device = args.webosDevice
        const volume = args.volume
        const deviceVolume = device.getCapabilityValue(capabilities.volumeSet)
        return Promise.resolve(deviceVolume > volume)
      })
  }

  conditionVolumeSmaller() {
    this._conditionVolumeSmaller
      .registerRunListener((args, state) => {
        const device = args.webosDevice
        const volume = args.volume
        const deviceVolume = device.getCapabilityValue(capabilities.volumeSet)
        return Promise.resolve(deviceVolume < volume)
      })
  }

  conditionVolumeEquals() {
    this._conditionVolumeEquals
      .registerRunListener((args, state) => {
        const device = args.webosDevice
        const volume = args.volume
        const deviceVolume = device.getCapabilityValue(capabilities.volumeSet)
        return Promise.resolve(deviceVolume === volume)
      })
  }

  conditionMuted() {
    this._conditionMuted
      .registerRunListener((args, state) => {
        const device = args.webosDevice
        const muted = device.getCapabilityValue(capabilities.volumeMute)
        return Promise.resolve(muted)
      })
  }

  conditionApp() {
    this._conditionApp
      .registerRunListener(async (args, state) => {
        const device = args.webosDevice
        const app = args.app
        return new Promise((resolve, reject) => {
          device._appCurrent().then((res) => {
            resolve(app.id === res.appId)
          }, (err) => {
            reject(err)
          })
        })
      })
      .getArgument('app')
      .registerAutocompleteListener((query, args) => {
        const device = args.webosDevice
        return new Promise(async (resolve) => {
          const apps = await device.filteredAppList(query)
          resolve(apps)
        })
      })
  }

  actionChangeSoundOutput() {
    this._actionChangeSoundOutput
      .registerRunListener((args, state) => {
        const device = args.webosDevice
        const {output} = args
        return new Promise((resolve, reject) => {
          device._soundOutputSet(output).then(() => {
            resolve(true)
          }, reject)
        })
      })
  }

  actionSendToastWithImage() {
    this._actionSendToastWithImage
      .registerRunListener((args, state) => {
        const device = args.webosDevice
        const {
          message,
          droptoken,
        } = args
        let icon = ''
        return new Promise(async (resolve, reject) => {
          if (droptoken) {
            const imageStream = await droptoken.getStream()
            icon = await new Promise((resolve) => {
              imageStream.setEncoding('binary')
              const type = imageStream.contentType
              this.log('DRIVER TYPE', type)
              const prefix = `data:${ type };base64,`
              let body = ''

              imageStream.on('data', (chunk) => {
                body += chunk
              })

              imageStream.on('end', () => {
                const base64 = Buffer.from(body, 'binary').toString('base64')
                const data = prefix + base64
                return resolve(data)
              })
            })
          }

          device._toastSend(message, icon).then(() => {
            resolve(true)
          }, () => {
            resolve(true)
          })
        })
      })
  }

  actionSendToast() {
    this._actionSendToast
      .registerRunListener((args, state) => {
        const device = args.webosDevice
        const {
          message,
          iconData,
        } = args
        let icon = iconData
        return new Promise(async (resolve, reject) => {
          if (this._isUrl(iconData)) {
            icon = await this.encodeImage(iconData)
          }

          device._toastSend(message, icon).then(() => {
            resolve(true)
          }, (error) => {
            reject(error)
          })
        })
      })
  }

  actionSimulateButton() {
    this._actionSimulateButton
      .registerRunListener((args, state) => {
        const device = args.webosDevice
        return new Promise((resolve, reject) => {
          device._simulateButton(args.button).then(() => {
            resolve(true)
          }, (_error) => {
            reject(false)
          })
        })
      })
  }

  actionChangeChannelNumber() {
    this._actionChangeChannelNumber
      .registerRunListener((args, state) => {
        const device = args.webosDevice
        return new Promise((resolve, reject) => {
          device._channelSet(`${ args.channel }`).then(() => {
            resolve(true)
          }, () => resolve(true))
        })
      })
  }

  actionChangeChannelList() {
    this._actionChangeChannelList
      .registerRunListener((args, state) => {
        const device = args.webosDevice
        return new Promise((resolve, reject) => {
          device._channelSet(`${ args.channel.number }`).then(() => {
            resolve(true)
          }, () => resolve(true))
        })
      })
      .getArgument('channel')
      .registerAutocompleteListener((query, args) => {
        const device = args.webosDevice
        return new Promise(async (resolve) => {
          const channels = await device.filteredChannelList(query)
          resolve(channels)
        })
      })
  }

  actionLaunchApp() {
    this._actionLaunchApp
      .registerRunListener((args, state) => {
        const device = args.webosDevice
        return new Promise((resolve, reject) => {
          device._appLaunch(args.app.id).then(() => {
            resolve(true)
          }, (_error) => {
            resolve(false)
          })
        })
      })
      .getArgument('app')
      .registerAutocompleteListener((query, args) => {
        const device = args.webosDevice
        return new Promise(async (resolve) => {
          const apps = await device.filteredAppList(query)
          resolve(apps)
        })
      })
  }

  actionSwitchInput() {
    this._actionSwitchInput
      .registerRunListener((args, state) => {
        const device = args.webosDevice
        return new Promise((resolve, reject) => {
          device._switchInput(args.input.id).then(() => {
            resolve(true)
          }, (_error) => {
            reject(_error)
          })
        })
      })
      .getArgument('input')
      .registerAutocompleteListener((query, args) => {
        const device = args.webosDevice
        return new Promise(async (resolve) => {
          const apps = await device.filteredExternalInputList(query)
          resolve(apps)
        })
      })
  }

  actionSendAlert() {
    this._actionSendAlert
      .registerRunListener(async (args, state) => {
        const device = args.webosDevice
          return await device._alertSend(args)
      })
  }

  async _mapDiscoveryResults(result) {
    return new Promise(async (resolve, _reject) => {
      const info = await WebosPlusDriver._getInfo(result.headers.location).catch(this.error)
      const macAddress = await this.homey.arp.getMAC(result.address).catch(this.error)
      const device = {
        name: info && info.friendlyName ? info.friendlyName : result.address,
        data: {
          id: result.id.replace(/uuid:/g, ''),
        },
        settings: {
          macAddress,
          ipAddress: result.address,
        },
      }
      resolve(device)
    })
  }

  async onPairListDevices(data, callback) {
    const discoveryStrategy = this.getDiscoveryStrategy()
    const discoveryResults = discoveryStrategy.getDiscoveryResults()

    const devices = async () => {
      return Promise.all(Object.values(discoveryResults).map(result => this._mapDiscoveryResults(result)))
    }

    return await devices().catch()
  }

  static _getInfo(url) {
    return new Promise((resolve, reject) => {
      http.get(url, (response) => {
        // Continuously update stream with data
        let body = ''
        response.on('data', (d) => {
          body += d
        })
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
            'UDN',
          ]

          let result = {}
          tags.forEach((tag) => {
            result[tag] = this._getTextBetweenTags(tag, body)
          })

          resolve(result)
        })
        response.on('error', (err) => {
          reject(err)
        })
      })
    })
  }

  _isUrl(str) {
    const regexp = new RegExp(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/i)
    return regexp.test(str)
  }

  encodeImage(imageUrl) {
    return new Promise((resolve, reject) => {
      let request = https
      if (imageUrl.startsWith('https')) {
        request = https
      } else if (imageUrl.startsWith('http')) {
        request = http
      } else {
        request = https
        imageUrl = `https://${ imageUrl }`
      }

      request.get(imageUrl, (response) => {
        response.setEncoding('binary')
        const type = response.headers['content-type']
        const prefix = `data:${ type };base64,`
        let body = ''

        response.on('error', (error) => {
          reject(error)
        })

        response.on('data', (chunk) => {
          body += chunk
        })

        response.on('end', () => {
          const base64 = Buffer.from(body, 'binary').toString('base64')
          const data = prefix + base64
          return resolve(data)
        })
      })
    })
  }

  static _getTextBetweenTags(tag, string) {
    let re1 = new RegExp('<' + tag + '>(.*?)<\/' + tag + '>', 'g')
    let matches = string.match(re1)

    let re2 = new RegExp('<\/?' + tag + '>', 'g')
    if (matches) return matches[0].replace(re2, '')
    return null
  }

}

module.exports = WebosPlusDriver
