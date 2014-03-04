/**
 This controller supports actions on the site header

 @class HeaderController
 @extends Discourse.Controller
 @namespace Discourse
 @module Discourse
 **/
Discourse.HeaderController = Discourse.Controller.extend({
    topic: null,
    showExtraInfo: null,
    categoryBinding: 'topicList.category',
    canCreateCategory: false,
    canCreateTopic: false,
    needs: ['composer', 'modal', 'listTopics'],

    categories: function() {
        return Discourse.Category.list();
    }.property(),

    showFavoriteButton: function() {
        return Discourse.User.current() && !this.get('topic.isPrivateMessage');
    }.property('topic.isPrivateMessage'),

    mobileDevice: function() {
        return Discourse.Mobile.isMobileDevice;
    }.property(),

    mobileView: function() {
        return Discourse.Mobile.mobileView;
    }.property(),

    showMobileToggle: function() {
        return Discourse.SiteSettings.enable_mobile_theme;
    }.property(),

    actions: {
        toggleStar: function() {
            var topic = this.get('topic');
            if (topic) topic.toggleStar();
            return false;
        },

        toggleMobileView: function() {
            Discourse.Mobile.toggleMobileView();
        },
        createTopic: function() {
            this.get('controllers.composer').open({
                categoryId: this.get('category.id'),
                action: Discourse.Composer.CREATE_TOPIC,
                draft: this.get('draft'),
                draftKey: this.get('draft_key'),
                draftSequence: this.get('draft_sequence')
            });
        }
    },

    availableNavItems: function() {
        var loggedOn = !!Discourse.User.current();

        return Discourse.SiteSettings.top_menu.split("|").map(function(i) {
            return Discourse.NavItem.fromText(i, {
                loggedOn: loggedOn
            });
        }).filter(function(i) {
            return i !== null;
        });
    }.property(),

    createTopicText: function() {
        if (this.get('category.name')) {
            return I18n.t("topic.create_in", {
                categoryName: this.get('category.name')
            });
        } else {
            return I18n.t("topic.create");
        }
    }.property('category.name'),

    /**
     Refresh our current topic list

     @method refresh
     **/
    refresh: function() {
        var listTopicsController = this.get('controllers.listTopics');
        listTopicsController.set('model.loaded', false);
        this.load(this.get('filterMode')).then(function (topicList) {
            listTopicsController.set('model', topicList);
        });
    },

    /**
     Load a list based on a filter

     @method load
     @param {String} filterMode the filter we want to load
     @returns {Ember.Deferred} the promise that will resolve to the list of items.
     **/
    load: function(filterMode) {
        var listController = this;
        this.set('loading', true);

        var trackingState = Discourse.TopicTrackingState.current();

        if (filterMode === 'categories') {
            return Discourse.CategoryList.list(filterMode).then(function(items) {
                listController.setProperties({
                    loading: false,
                    filterMode: filterMode,
                    categoryMode: true,
                    draft: items.draft,
                    draft_key: items.draft_key,
                    draft_sequence: items.draft_sequence
                });
                if(trackingState) {
                    trackingState.sync(items, filterMode);
                    trackingState.trackIncoming(filterMode);
                }
                return items;
            });
        }

        var current = (this.get('availableNavItems').filter(function(f) { return f.name === filterMode; }))[0];
        if (!current) {
            current = Discourse.NavItem.create({ name: filterMode });
        }

        return Discourse.TopicList.list(current).then(function(items) {
            listController.setProperties({
                loading: false,
                filterMode: filterMode,
                draft: items.draft,
                draft_key: items.draft_key,
                draft_sequence: items.draft_sequence
            });
            if(trackingState) {
                trackingState.sync(items, filterMode);
                trackingState.trackIncoming(filterMode);
            }
            return items;
        });
    },

    // Put in the appropriate page title based on our view
    updateTitle: function() {
        if (this.get('filterMode') === 'categories') {
            return Discourse.set('title', I18n.t('categories_list'));
        } else {
            if (this.present('category')) {
                return Discourse.set('title', this.get('category.name').capitalize() + " " + I18n.t('topic.list'));
            } else {
                return Discourse.set('title', I18n.t('topic.list'));
            }
        }
    }.observes('filterMode', 'category'),

    canEditCategory: function() {
        if( this.present('category') ) {
            var u = Discourse.User.current();
            return u && u.staff;
        } else {
            return false;
        }
    }.property('category')
});

Discourse.HeaderController.reopenClass({
    filters: ['latest', 'hot', 'favorited', 'read', 'unread', 'new', 'posted']
});
