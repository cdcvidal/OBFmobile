/**

Model Taxon

**/
define(['jquery', 'underscore', 'backbone','config'],
    function($, _ , Backbone, config){

    'use strict';

    return Backbone.Model.extend({
        defaults: {
            NOE_ID: '' ,
            INPN_ID: '' ,
            vernacularName: '',
            scientificName: '',
            description: '',
            urlWeb: '',
            photos: [],
            criteres: [],
        },

        //url: config.coreUrl,
    });
});