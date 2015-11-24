/* jslint browser: true */

define([
	'underscore',
	'jquery-ui',
	'handlebars',
	'views/BaseView',
	'views/ContributorRowView',
	'hbs!hb_templates/contributorTab'
], function(_, jqueryUi, Handlebars, BaseView, ContributorRowView, hb_template) {
	"use strict";

	var view = BaseView.extend({

		events : {
			'click .add-btn' : 'addNewRow'
		},

		template : hb_template,

		/*
		 * @constructs
		 * @param {Object} options
		 *     @prop {Backbone.collection} collection
		 *     @prop {Object} contributorType
		 *     @prop {String} el - jquery selector where the view will be rendered.
		 */
		initialize : function(options) {

			BaseView.prototype.initialize.apply(this, arguments);
			this.contributorType = options.contributorType;
			this.renderDeferred = $.Deferred();

			this.rowViews = this.collection.map(function(model, index) {
				return  new ContributorRowView({
					el : '.grid',
					model : model,
					collection : self.collection
				});
			});

			this.listenTo(this.collection, 'add', this.addRow);
			this.listenTo(this.collection, 'remove', this.removeRow);
			this.listenTo(this.collection, 'update', this.updateRowOrder);
		},

		render : function() {
			var self = this;
			BaseView.prototype.render.apply(this, arguments);
			this.$('.grid').sortable({
				stop : function(event, ui) {
					ui.item.find('.contributor-row-container').trigger('updateOrder', ui.item.index());
				}
			});
			this.rowViews = _.chain(this.rowViews)
					.sortBy(function(view) {
						return view.model.get('rank');
					})
					.each(function(view) {
						self.renderViewRow(view);
					})
					.value();
			this.renderDeferred.resolve();
		},

		renderViewRow : function(rowView) {
			var $grid = this.$('.grid');
			var divText = '<div class="contributor-row-div"></div>';

			$grid.append(divText);
			rowView.setElement($grid.find('.contributor-row-div:last-child')).render();
		},

		addNewRow : function() {
			var newModel = new this.collection.model({
				contributorType : this.contributorType,
				rank : this.rowViews.length + 1
			});

			this.collection.add(newModel);
		},

		/*
		 * collection event handlers
		 */
		addRow : function(model) {
			var self = this;
			var newView = new ContributorRowView({
				model: model,
				el: '.grid',
				collection : this.collection
			});

			this.rowViews.push(newView);

			if (this.renderDeferred.state() === 'resolved') {
				this.renderViewRow(newView);
			}
		},

		removeRow : function(model) {
			var viewToRemove = _.findWhere(this.rowViews, {model : model});

			if (viewToRemove) {
				viewToRemove.remove();
				this.rowViews = _.reject(this.rowViews, function(view) {
					return view === viewToRemove;
				});
			}
		},

		updateRowOrder : function() {
			var $grid = this.$('.grid');

			this.rowViews = _.chain(this.rowViews)
					// Sort row views and them move them by successively appending them to the grid.
					.sortBy(function(view) {
						return view.model.attributes.rank
					})
					.each(function(view) {
						view.$el.appendTo($grid)
					})
					.value();
		},

		remove : function() {
			_.each(this.rows, function(row) {
				row.view.remove();
			});

			BaseView.prototype.remove.apply(this, arguments);
			return this;
		}
	});

	return view;
});
