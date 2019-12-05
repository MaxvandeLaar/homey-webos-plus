'use strict';

const Homey = require('homey');

class WebosPlus extends Homey.App {

  onInit() {
    this.log('WebOS Plus is running...');

    // Actions
    this._actionLaunchApp = new Homey.FlowCardAction('launch_app');
    this._actionChangeVolume = new Homey.FlowCardAction('change_volume');
  }
}

module.exports = WebosPlus;
