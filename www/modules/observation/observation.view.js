'use strict';

var Backbone = require('backbone'),
  Marionette = require('backbone.marionette'),
  $ = require('jquery'),
  _ = require('lodash'),
  ObsModel = require('../observation/observation.model'),
  User = require('../profile/user.model'),
  Departement = require('../main/departement.model'),
  Mission = require('../mission/mission.model'),
  Session = require('../main/session.model'),
  config = require('../main/config'),
  Slideshow = require('./observation_slideshow.view.js'),
  bootstrap = require('bootstrap'),
  Dialog = require('bootstrap-dialog'),
  Main = require('../main/main.view'),
  i18n = require('i18next-client'),
  Login = require('../profile/login.view'),
  Utilities = require('../main/utilities'),
  Profile = require('../profile/profile.view'),
  openFB = require('../main/openfb'),
  Router = require('../routing/router'),
  AutompleteCity = require('../localize/city_autocomplete.view');

var idToTransmit = null;

var Layout = Marionette.LayoutView.extend({
  header: {
    titleKey: 'observation',
    buttons: {
      left: ['back']
    }
  },
  template: require('./observation.tpl.html'),
  className: 'page observation ns-full-height',
  events: {
    'submit form.infos': 'onFormSubmit',
    'click .photo .img': 'onPhotoClick',
    'change .updateDept-js': 'updateField',
    'change .updateMission-js': 'updateField',
    //'submit form#form-picture': 'uploadPhoto',
    'click .capture-photo-js': 'capturePhoto'
  },

  initialize: function() {
    var user = this.user = User.getCurrent();
    this.observationModel = this.model;
    this.listenTo(this.observationModel, 'change:photos', this.render, this);
    this.listenTo(this.observationModel, 'change:departement', this.render, this);
    this.listenTo(this.observationModel, 'change:shared', this.render, this);

    var mainView = Main.getInstance();
    this.listenTo(user, 'change:nbComputedObs', function(model, nbComputed) {
      if (!nbComputed)
        return false;
      mainView.addDialog({
        cssClass: 'theme-primary with-bg-forest user-score',
        badgeClassNames: 'badge-circle bg-wood border-brown text-white',
        badge: nbComputed + '<div class="text-xs text-bottom">' + i18n.t('mission.label', {
          count: nbComputed
        }) + '</div>',
        title: i18n.t('dialogs.obsShared.title'),
        message: i18n.t('dialogs.obsShared.message'),
        button: i18n.t('dialogs.obsShared.button')
      });
    });

    this.listenTo(user, 'change:level', function(model, level) {
      if (!level)
        return false;
      mainView.addDialog({
        cssClass: 'theme-primary with-bg-forest user-score user-level-' + level,
        badgeClassNames: 'badge-circle bg-wood border-brown text-white',
        title: i18n.t('dialogs.level.title'),
        message: i18n.t('dialogs.level.message.level_' + level),
        button: i18n.t('dialogs.level.button')
      });
    });

    this.listenTo(user, 'change:palm', function(model, palm) {
      if (!palm)
        return false;
      var palmName = user.get('palmName');
      var nbComputed = user.get('nbComputedObs');
      mainView.addDialog({
        cssClass: 'theme-primary with-bg-forest user-score user-palm-' + palmName,
        badgeClassNames: 'badge-circle bg-wood border-brown text-white',
        badge: nbComputed + '<div class="text-xs text-bottom">' + i18n.t('mission.label', {
          count: nbComputed
        }) + '</div>',
        title: i18n.t('dialogs.palm.title'),
        message: i18n.t('dialogs.palm.message.' + palmName),
        button: i18n.t('dialogs.palm.button')
      });
    });

    this.session = Session.model.getInstance();

    if (user.get('departementIds').length) {
      this.observationModel.set({
        departementId: user.get('departementIds')[0]
      }).save();
    } else if (user.get('city'))
      this.observationModel.set({
        departementId: user.get('city').dpt
      }).save();
  },

  serializeData: function() {
    var observation = this.observationModel.toJSON();

    return {
      observation: observation,
      // departement: Departement.collection.getInstance(),
      // missions: mission.collection.getInstance()
    };
  },

  onRender: function() {
    console.log('onRender');
    this.$el.attr('data-cid', this.cid);

    var isSaved = (this.observationModel.get('missionId') && this.observationModel.get('departementId'));
    if (!isSaved)
      this.setFormStatus('unsaved');
    else {
      this.setFormStatus('saved');
    }

    var formSchema = {
      missionId: {
        type: 'Select',
        options: Mission.collection.getInstance(),
        editorAttrs: {
          placeholder: 'Missions',
          selectedvalue: this.observationModel.get('missionId'),
          disabled: this.observationModel.get('shared') ? true : false
        },
        validators: ['required']
      },
      departementId: {
        type: 'Select',
        options: Departement.collection.getInstance(),
        editorAttrs: {
          placeholder: 'Départements',
          selectedvalue: this.observationModel.get('departementId'),
          disabled: this.observationModel.get('shared') ? true : false
        },
        validators: ['required']
      },
    };
    var observation = this.observationModel.toJSON();

    this.formObs = new Backbone.Form({
      model: this.observationModel,
      template: require('./form_observation.tpl.html'),
      schema: formSchema,
      /*data: {
        mission: mission.collection.getInstance(),
        dept: Departement.collection.getInstance()
      },*/
      templateData: {
        observation: observation,
        mission: Mission.collection.getInstance(),
        departement: Departement.collection.getInstance()
      }
    }).render();
    this.$el.append(this.formObs.$el);
    this.$progressBar = this.$el.find('.progress-bar');
    
    Backbone.Form.validators.errMessages.required = i18n.t('validation.errors.required');

    if (idToTransmit == this.observationModel.get('id')) {
      Dialog.alert(i18n.t('pages.observation.dialogs.login_complete'));
      idToTransmit = null;
    }

    /*if (this.observationModel.get('shared') > 0) {
      this.$el.addClass('read-only');
      this.$el.find(':input:not(:submit)').prop('disabled', true);
    }*/

    this.formObs.$el.find('select').selectPlaceholder();

    /*if (this.observationModel.get('mission')) {
      this.$el.find('select#mission').val(this.observationModel.get('mission').id).attr('selected', true);
    } else {
      this.$el.find('select').selectPlaceholder();
    }

    if (this.observationModel.get('departement')) {
      this.$el.find('select#dept').val(this.observationModel.get('deptId')).attr('selected', true);
    } else {
      this.$el.find('select').selectPlaceholder();
    }*/
  },

  onDomRefresh: function(options) {
    // var user = User.getCurrent();
    if (this.user.get('city')) {
      this.observationModel.set({
        departementId: this.user.get('city').dpt
      }).save();
      this.observationModel.get('departement');
    }

    //this.$el.find('select').selectPlaceholder();
    /*var user = User.getCurrent();
    console.log('onDomRefresh');

    if (user.get('departements').length) {
      this.observationModel.set({
        departement: user.get('departements')[0]
      }).save();
    } else if (user.get('city'))
      this.observationModel.set({
        departement: user.get('city').dpt
      }).save();*/

    /*if (this.observationModel.get('mission')) {
      this.$el.find('select#mission').val(this.observationModel.get('mission').id).attr('selected', true);
    } else {
      this.$el.find('select').selectPlaceholder();
    }

    if (this.observationModel.get('departement')) {
      this.$el.find('select#dept').val(this.observationModel.get('deptId')).attr('selected', true);
    } else {
      this.$el.find('select').selectPlaceholder();
    }*/
  },

  onPhotoClick: function() {
    var self = this;

    var $body = $('body');
    var slideshow = new(Slideshow.getClass())({
      model: self.model
    });
    $body.append(slideshow.$el);
    slideshow.render();
  },

  /*onMissionChange: function(e) {
      var self = this;
      var missionId = $(e.currentTarget).val();

      self.observationModel.set('mission', _.find(mission.collection.getInstance(), {id: missionId}));
  },*/

  updateField: function(e) {
    var self = this;
    self.setFormStatus('unsaved');
  },

  setFormStatus: function(status) {
    var self = this;

    if (status == 'unsaved')
      self.$el.alterClass('form-status-*', 'form-status-unsaved');
    else {
      var shared = self.observationModel.get('shared') || 0;
      self.$el.alterClass('form-status-*', 'form-status-shared-' + shared);
    }
  },

  /*uploadPhoto: function(e) {
      var self = this;
      e.preventDefault();

      var $form = $(e.currentTarget);
      var formdata = (window.FormData) ? new FormData($form[0]) : null;
      var data = (formdata !== null) ? formdata : $form.serialize();

      $.ajax({
          url: config.apiUrl + '/file-upload',
          type: 'post',
          contentType: false, // obligatoire pour de l'upload
          processData: false, // obligatoire pour de l'upload
          dataType: 'json', // selon le retour attendu
          data: data,
          success: function(response) {
              //TODO url into config
              self.addPhoto(config.coreUrl + '/sites/default/files/' + response.data[0].label, response.data[0].id);
          }
      });
  },*/

  onFail: function(message) {
    console.log(message);
  },

  capturePhoto: function() {
    // Take picture using device camera and retrieve image as a local path
    navigator.camera.getPicture(
      _.bind(this.onCapturePhotoSuccess, this),
      _.bind(this.onFail, this), {
        /* jshint ignore:start */
        quality: 75,
        targetWidth: 1000,
        targetHeight: 1000,
        destinationType: Camera.DestinationType.FILE_URI,
        correctOrientation: true,
        sourceType: Camera.PictureSourceType.CAMERA,
        /* jshint ignore:end */
      }
    );
  },

  onCapturePhotoSuccess: function(imageURI) {
    var self = this;

    if (window.cordova) {
      //TODO put tag projet in config
      var tagprojet = 'noe-obf';
      var copiedFile = function(fileEntry) {
        self.addPhoto(fileEntry.nativeURL);
      };
      var gotFileEntry = function(fileEntry) {
        var gotFileSystem = function(fileSystem) {
          fileSystem.root.getDirectory(tagprojet, {
            create: true,
            exclusive: false
          }, function(dossier) {
            fileEntry.moveTo(dossier, (new Date()).getTime() + '_' + tagprojet + '.jpg', copiedFile, self.onFail);
          }, self.onFail);
        };
        /* jshint ignore:start */
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFileSystem, self.onFail);
        /* jshint ignore:end */
      };
      window.resolveLocalFileSystemURI(imageURI, gotFileEntry, self.onFail);
    }
  },

  addPhoto: function(fe) {
    var newValue = {
      'url': fe || '',
      'externUrl': ''
    };
    this.observationModel.get('photos')
      .push(newValue);
    this.observationModel.save();
    this.observationModel.trigger('change:photos', this.observationModel);
  },

  onFormSubmit: function(e) {
    e.preventDefault();

    var errors = this.formObs.validate();
    if (errors)
      return false;

    if (this.$el.hasClass('form-status-unsaved')) {
      this.saveObs();
    } else if ( navigator.onLine ) {
      if (this.$el.hasClass('form-status-shared-0'))
        this.sendObs();
      else if (this.$el.hasClass('form-status-shared-1'))
        this.shareObs();
    } else {
      Dialog.alert(i18n.t('pages.observation.dialogs.need_login_offline'));
    }
  },

  checkGeolocation: function() {
    var self = this;
    var dfd = $.Deferred();
    var geoStatus = this.observationModel.get('hasGeolocation');
    if(geoStatus === 'has coords'){
      dfd.resolve();
    } else if(geoStatus === 'has city'){
      var currentDialog = Dialog.confirm({
        title: 'Validation de la géolocalisation',
        message: 'Cette observation a été prise à ' + self.user.get('city').value + ' ?',
        btnCancelLabel: 'Non',
        btnOKLabel: 'Oui',
        closable: true, // <-- Default value is false
        callback: function(result) {
          if (result) {
            dfd.resolve();
            self.onDomRefresh();
          } else {
            self.user.set('city', null).save();
            self.saveObs();
            dfd.reject();
          }
        }
      });
    } else if(!geoStatus){
      var automplete = new AutompleteCity();
      automplete.render();

      var dialog = Dialog.show({
        cssClass: 'fs-dialog',
        title: 'Votre position',
        message: automplete.$el
      });

      this.user.once('change:city', function() {
        console.log('onUserChange city');
        dialog.close();
        self.onDomRefresh();
        dfd.resolve();
      });
    }

    return dfd.promise();
  },

  saveObs: function() {
    var self = this;

    this.checkGeolocation().then(
      function() {
        var formValues = self.formObs.getValue();
        var missionId = _.parseInt(formValues.missionId);
        var mission = Mission.collection.getInstance().get(missionId);
        self.observationModel.set({
          missionId: missionId,
          cd_nom: mission.get('taxon').cd_nom,
          departementId: formValues.departementId
        }).save();
        self.setFormStatus('saved');
      },
      function() {
        return false;
      }
    );
  },

  onSendError: function() {
    this.$el.removeClass('sending block-ui');
    this.$el.find('form').removeClass('loading');
  },


  // Save in server time_forest : update user with new time (field_time_forest)


  sendObs: function(e) {
    var self = this;

    console.log(this.observationModel.get('missionId'));

    if (self.$el.hasClass('sending') || self.observationModel.get('shared') == 1)
      return false;

    self.$el.addClass('sending block-ui');
    this.$el.find('form').addClass('loading');

    //clear data photos
    var clearPhoto = function(args) {
      var photos = [];
      args.forEach(function(item, key) {
        photos[key] = item.externId;
      });
      return photos.join();
    };
    // var user = User.getCurrent();
    //data expected by the server
    var data = {
      type: 'observation',
      title: 'mission_' + self.observationModel.get('missionId') + '_' + self.observationModel.get('date') + '_' + this.user.get('externId'),
      field_observation_timestamp: {
        und: [{
          value: self.observationModel.get('date')
        }]
      },
      field_observation_code_dept: {
        und: [{
          value: self.observationModel.get('departementId')
        }]
      },
      field_observation_id_mission: {
        und: [{
          value: self.observationModel.get('missionId')
        }]
      },
      field_cd_nom: {
        und: self.observationModel.get('cd_nom')
      },
      field_lat_long: {
        und: [{
          value: _.get(self.observationModel.get('coords'), 'latitude', 0) + '/' + _.get(self.observationModel.get('coords'), 'longitude', 0)
        }]
      },
      field_code_commune: {
        und: [{
          value: _.get(this.user.get('city'), 'code', '')
        }]
      }
    };
    console.log(data);
    var query = {
      url: config.apiUrl + '/node.json',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      error: function(error) {
        self.onSendError();
        var dfd;
        if (error.responseJSON[0] === 'Access denied for user anonymous') {
          Dialog.confirm({
            message: i18n.t('pages.observation.dialogs.need_login'),
            callback: function(result) {
              if (result) {
                self.session.afterLoggedAction = {
                  name: 'showObsAndTransmit',
                  options: {
                    id: self.observationModel.get('id')
                  }
                };
                self.session.set('needLogin', true);
                Router.getInstance().startOutOfHistory();
                if (self.user.isAnonymous())
                  Router.getInstance().navigate('user-selector', {
                    trigger: true
                  });
                else
                  Router.getInstance().navigate('login/' + self.user.get('id'), {
                    trigger: true
                  });
              }
            }
          });
          //session.redirectAfterLogin = '#observation/'+self.observationModel.get('id')+'?action=transmit';
          /*var message = i18n.t('pages.observation.dialogs.need_login');
          if (user.get('firstname') || user.get('lastname') || user.get('email'))
              message = i18n.t('pages.observation.dialogs.need_complete_registration');
          dfd = Login.openDialog({
            message: message
          });*/
        } else {
          Dialog.alert({
            closable: true,
            message: error.responseJSON
          });
        }
        /*dfd.then(function() {
          Dialog.alert(i18n.t('pages.observation.dialogs.need_complete'));
        });*/
      },
      success: function(response) {
        self.observationModel.set({
          'externId': response.nid
          //'shared': 1
        }).save().done(function() {
          self.session.updateUser().done(function(response){
            self.uploadPhotos();
          });
        });
      }
    };

    self.session.getCredentials(query, true).then(function() {
      $.ajax(query);
    });
  },

  uploadPhotos: function() {
    var self = this;
    // var user = User.getCurrent();

    if ( !window.cordova )
      self.onShared();
    else {
      var photos = this.observationModel.get('photos');
      var dfds = [];
      photos.forEach(function(photo) {
        var dfd = self.uploadPhoto(photo);
        dfds.push(dfd);
      });

      var isStarted = false;
      var hasError = false;
      _.forEach(dfds, function(dfd) {
        dfd.fail(function(error) {
          if ( !hasError && error && error == 'error' ) {
            hasError = true;
            self.onSendError();
            Dialog.alert({
              closable: true,
              message: i18n.t('dialogs.errorRetry')
            });
            _.forEach(dfds, function(_dfd) {
              if ( _dfd != dfd )
                _dfd.reject();
            });
          }
        });
        dfd.progress(function(data) {
          if ( !isStarted && data == 'progress' ) {
            isStarted = true;
            self.onUploadPhotosStart(dfds);
          }
        });
      });

      this.listenToOnce(Router.getInstance(), 'route', function(name, args){
        _.forEach(dfds, function(dfd) {
          if ( dfd.jqxhr )
            dfd.jqxhr.abort();
          else
            dfd.reject();
        });
      });

      $.when.apply($, dfds).done(function(response) {
        self.stopListening(Router.getInstance());
        self.onShared();
      });
    }
  },

  onUploadPhotosStart: function(dfds) {
    var self = this;
    console.log('onPhotosStart');
    this.$el.find('form').addClass('progressing');
    _.forEach(dfds, function(dfd) {
      dfd.progress(function(data) {
        if ( data == 'progress' ) {
          var loaded = 0;
          var total = 0;
          _.forEach(dfds, function(dfd) {
            loaded += (dfd.bytesLoaded || 0);
            total += dfd.bytesTotal;
          });
          self.onUploadPhotosProgress(loaded, total);
        }
      });
    });
  },

  onUploadPhotosProgress: function(loaded, total) {
    var ratio = Math.min(1, (loaded/total) );
    console.log('onUploadPhotosProgress', ratio, this.$progressBar.length);
    this.$progressBar.css({
      width: Math.round(ratio*100)+'%'
    });
    if ( ratio >= 1 )
      this.$progressBar.addClass('progress-bar-striped active');
  },

  onShared: function() {
    var self = this;
    this.$el.find('form').removeClass('loading');
    this.$el.find('form').removeClass('progressing');

    this.$progressBar.removeClass('progress-bar-striped active');

    this.observationModel.set({
      'shared': 1
    }).save();
    this.user.computeScore();
    this.setFormStatus('shared');

    setTimeout(function() {
      self.$el.removeClass('sending block-ui');
      Router.getInstance().navigate('dashboard/observations', {trigger: true});
    }, 500);
  },

  uploadPhoto: function(photo) {
    var self = this;
    var dfd = $.Deferred();
    dfd.bytesTotal = 0;

    /* jshint ignore:start */
    window.resolveLocalFileSystemURL(photo.url, function(fe) {
      fe.file(function(file) {
        dfd.bytesTotal = file.size;
        var reader = new FileReader();
        reader.onloadend = function(e) {
          if ( dfd.state() == 'rejected' )
            return false;
          var data = new Uint8Array(e.target.result);
          var imgBlob = new Blob([data], {
            type: 'image/jpeg'
          });
          var fd = new FormData();
          fd.append('files[obfmobile]', imgBlob, file.name);
          fd.append('field_name', 'field_observation_image');
          var query = {
            url: encodeURI(config.apiUrl + '/obf_node/' + self.observationModel.get('externId') + '/attach_file'),
            type: 'post',
            contentType: false, // obligatoire pour de l'upload
            processData: false, // obligatoire pour de l'upload
            dataType: 'json',
            data: fd,
            xhr: function() {
              var xhr = new window.XMLHttpRequest();
              xhr.upload.addEventListener('progress', function(e) {
                console.log('progressEvent', e);
                dfd.bytesLoaded = e.loaded;
                dfd.notify('progress');
              }, false);

              return xhr;
            },
            success: function(response) {
              photo.externUrl = response[0];
              dfd.resolve();
            },
            error: function(error) {
              console.log(error);
              dfd.reject('error');
              /*Dialog.alert({
                closable: true,
                message: error.responseJSON
              });*/
            }
          };
          self.session.getCredentials(query).then(function() {
            if ( dfd.state() != 'rejected' )
              dfd.jqxhr = $.ajax(query);
          });
        };
        reader.readAsArrayBuffer(file);
      }, self.onFail);

    }, self.onFail);
    /* jshint ignore:end */
    return dfd;
  },

  shareObs: function() {
    var self = this;
    var mission = self.model.get('mission');
    this.$el.find('form').addClass('loading');
    openFB.init({
      appId: '545622275606103',
      tokenStore: window.localStorage
    });
    openFB.api({
      method: 'POST',
      path: '/me/feed',
      params: {
        message: "J'ai accomplie une mission !",
        link: mission.get('taxon').url,
        name: mission.get('title'),
        picture: _.get(self.model.get('photos'), '[0].externUrl', ''),
        caption: 'En Forêt avec Noé',
        description: mission.get('taxon').characteristic
      },
      success: function() {
        self.$el.find('form').removeClass('loading');
        Dialog.alert('Partage réussi');
      },
      error: function(error) {
        if (error.code == 190) {
          Dialog.show({
            title: 'Connexion',
            message: 'Vous devez être connecter à Facebook pour partager votre obs',
            buttons: [{
              label: 'Annuler',
              action: function(dialog) {
                dialog.close();
                self.$el.find('form').removeClass('loading');
              }
            }, {
              label: 'Me connecter',
              action: function(dialog) {
                dialog.close();
                openFB.login(function(response) {
                  if (response.status === 'connected') {
                    self.shareObs();
                  } else {
                    alert('Facebook login failed: ' + response.error);
                    self.$el.find('form').removeClass('loading');
                  }
                }, {
                  scope: 'publish_actions'
                });
              }
            }]
          });
        }
      }
    });
  },

});

module.exports = {
  idToTransmit: idToTransmit,
  Page: Layout
};