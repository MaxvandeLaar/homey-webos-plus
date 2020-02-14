'use strict';

const Homey = require('homey');

class WebosPlus extends Homey.App {

  onInit() {
    this.log('WebOS Plus is running...');

    // Actions
    this._actionLaunchApp = new Homey.FlowCardAction('launch_app');
    this._actionChangeChannelList = new Homey.FlowCardAction('change_channel_list');
    this._actionSimulateButton = new Homey.FlowCardAction('simulate_button');
  }
}

module.exports = WebosPlus;
