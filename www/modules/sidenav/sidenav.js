'use strict';

var Backbone = require('backbone'),
    Marionette = require('backbone.marionette'),
    header = require('../header/header'),
    User = require('../models/user'),
    $ = require('jQuery');

var View = Marionette.LayoutView.extend({
    template: require('./sidenav.html'),
    className: 'sidenav',
    events: {
        'click': 'hide'
    },

    initialize: function() {
        var self = this;

        self.listenTo(header.getInstance(), 'btn:menu:click', self.toggleShow);
    },

    serializeData: function() {
        var user = User.model.getInstance();

        return {
            linkregister: (user.get('externId') ? '#registration/' + user.get('externId') : '#registration')
        };
    },

    onRender: function(options) {
        var self = this;

        //self.$el.i18n();
    },

    toggleShow: function() {
        $('body').toggleClass('show-sidenav');
    },

    show: function() {
        $('body').addClass('show-sidenav');
    },

    hide: function() {
        console.log('ok');
        $('body').removeClass('show-sidenav');
    }
});

var instance = null;

module.exports = {
    getInstance: function() {
        if (!instance)
            instance = new View();
        return instance;
    }
};