define(['marionette','config','i18n'], function( Marionette,config) {

	var Translater = Marionette.Object.extend({

		initialize: function(options) {
			this.url = 'app/locales/__lng__/__ns__.json';
		},

		start: function() {
			var self = this;
			i18n.init({ 
				resGetPath: this.url, 
				getAsync : false, 
				lng : config.language || 'fr' //navigator.language || navigator.userLanguagenavigator.language || navigator.userLanguage
			}, function(t) {
			    self.triggerMethod('ready');
			});
		},

		getValueFromKey: function(key) {
			return $.t(key);
		}
	});

	var translater = new Translater();

	return {
		getTranslater: function (options) { return translater; }
	};

});
