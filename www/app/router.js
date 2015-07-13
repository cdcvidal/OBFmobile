define(['jquery', 'marionette', 'backbone', 'config'],
	function($, Marionette, Backbone, config){

	'use strict';
	return Marionette.AppRouter.extend({
		appRoutes: {
			'': 'home',
			'dashboard': 'dashboard',
			'dashboard/:tab': 'dashboardTab'
		},

	});
});
