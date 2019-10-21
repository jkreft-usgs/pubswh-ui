import $ from 'jquery';
import _ from 'underscore';

import AffiliationModel from '../../../../scripts/manager/models/AffiliationModel';
import AlertView from '../../../../scripts/manager/views/AlertView';
import BaseView from '../../../../scripts/manager/views/BaseView';
import CostCenterCollection from '../../../../scripts/manager/models/CostCenterCollection';
import ManageAffiliationView from '../../../../scripts/manager/views/ManageAffiliationView';
import OutsideAffiliationLookupCollection from '../../../../scripts/manager/models/OutsideAffiliationLookupCollection';


describe('views/ManageAffiliationView', function() {
    let testView;
    let $testDiv;
    let testModel;
    let fetchModelDeferred;
    let saveModelDeferred;
    let deleteModelDeferred;
    let testRouter;

    let costCenterFetchActiveDeferred, costCenterFetchInactiveDeferred;
    let outsideAffiliationActiveDeferred, outsideAffiliationInactiveDeferred;

    beforeEach(function() {
        $('body').append('<div id="test-div"></div>');
        $testDiv = $('#test-div');

        spyOn(BaseView.prototype, 'initialize').and.callThrough();
        spyOn(BaseView.prototype, 'render').and.callThrough();

        costCenterFetchActiveDeferred = $.Deferred();
        costCenterFetchInactiveDeferred = $.Deferred();

        outsideAffiliationActiveDeferred = $.Deferred();
        outsideAffiliationInactiveDeferred = $.Deferred();

        testModel = new AffiliationModel();
        fetchModelDeferred = $.Deferred();
        saveModelDeferred = $.Deferred();
        deleteModelDeferred = $.Deferred();
        spyOn(testModel, 'fetch').and.returnValue(fetchModelDeferred.promise());
        spyOn(testModel, 'save').and.returnValue(saveModelDeferred.promise());
        spyOn(testModel, 'destroy').and.returnValue(deleteModelDeferred.promise());

        testRouter = jasmine.createSpyObj('testRouterSpy', ['navigate']);

        spyOn(AlertView.prototype, 'setElement');
        spyOn(AlertView.prototype, 'showSuccessAlert');
        spyOn(AlertView.prototype, 'showDangerAlert');
        spyOn(AlertView.prototype, 'closeAlert');
        spyOn(AlertView.prototype, 'remove');
        spyOn(CostCenterCollection.prototype, 'fetch').and.callFake(function(options) {
            if (options.data.active === true) {
                return costCenterFetchActiveDeferred;
            } else {
                return costCenterFetchInactiveDeferred;
            }
        });
        spyOn(OutsideAffiliationLookupCollection.prototype, 'fetch').and.callFake(function(options) {
            if (options.data.active === true) {
                return outsideAffiliationActiveDeferred;
            } else {
                return outsideAffiliationInactiveDeferred;
            }
        });

        testView = new ManageAffiliationView({
            el : $testDiv,
            model : testModel,
            router : testRouter
        });
    });

    afterEach(function() {
        if (testView) {
            testView.remove();
        }
        $testDiv.remove();
    });

    it('Expects that the alertView has been created', function() {
        expect(AlertView.prototype.setElement).toHaveBeenCalled();
    });

    it('Expects active and inactive cost centers to fetched', function() {
        expect(CostCenterCollection.prototype.fetch.calls.count()).toBe(2);
        const activeCostCenters = _.find(CostCenterCollection.prototype.fetch.calls.allArgs(), function(arg) {
            return arg[0].data.active === true;
        });
        expect(activeCostCenters).toBeDefined();
        const inactiveCostCenters = _.find(CostCenterCollection.prototype.fetch.calls.allArgs(), function(arg) {
            return arg[0].data.active === false;
        });
        expect(inactiveCostCenters).toBeDefined();
    });

    it('Expects active and inactive outside affiliates to be fetched', function() {
        expect(OutsideAffiliationLookupCollection.prototype.fetch.calls.count()).toBe(2);
        const activeAffiliates = _.find(OutsideAffiliationLookupCollection.prototype.fetch.calls.allArgs(), function(arg) {
            return arg[0].data.active === true;
        });
        expect(activeAffiliates).toBeDefined();
        const inactiveAffiliates = _.find(OutsideAffiliationLookupCollection.prototype.fetch.calls.allArgs(), function(arg) {
            return arg[0].data.active === false;
        });
        expect(inactiveAffiliates).toBeDefined();
    });

    describe('Tests for render', function() {

        beforeEach(function() {
            spyOn($.fn, 'select2').and.callThrough();
            testView.activeCostCenters.set([{id : 23, text : 'Cost Center 1'}, {id : 24, text : 'Cost Center 2'}]);
            testView.activeOutsideAffiliates.set([{id : 41, text : 'Super Secret Police'}, {id : 42, text : 'Fellowship of Strangers'}]);
        });

        it('Expects a drop with affiliation types is populated', function() {
            testView.render();
            const select2Calls = $.fn.select2.calls.count();
            expect(select2Calls).toBe(1);
        });

        it('Expects a select2 dropdown called with expected data', function() {
            let affiliationTypeSelect;
            testView.render();
            affiliationTypeSelect = $('.edit-affiliation-type-input');
            expect(affiliationTypeSelect.select2).toHaveBeenCalledWith({}, {theme : 'bootstrap', allowClear: true});
            const selectOptions = $('#edit-affiliation-type-input option');
            expect(selectOptions.length).toEqual(3);
            expect(selectOptions[1].outerHTML).toEqual('<option value="1">Cost Center</option>');
            expect(selectOptions[2].outerHTML).toEqual('<option value="2">Outside Affiliation</option>');
        });

        it('Expects that the affiliationIsCostCenter is set to null initially', function() {
            testView.render();
            expect(testView.affiliationIsCostCenter).toBe(null);
        });

        describe('Test for DOM event handlers', function() {

            beforeEach(function() {
                testView.render();
            });

            it('Expects that if an affiliation type is selected, the affiliation edit select will be enabled', function() {
                $testDiv.find('#edit-affiliation-type-input').val('1').trigger('select2:select');
                expect($testDiv.find('#edit-affiliation-input').is(':disabled')).toBe(false);
            });

            it('Expects that affiliationIsCostCenter is true if a user selects the cost center type', function() {
                $testDiv.find('#edit-affiliation-type-input').val('1').trigger('select2:select');
                expect(testView.affiliationIsCostCenter).toBe(true);
            });

            it('Expects that affiliationIsCostCenter is false if a user selects the outside affiliation type', function() {
                $testDiv.find('#edit-affiliation-type-input').val('2').trigger('select2:select');
                expect(testView.affiliationIsCostCenter).toBe(false);
            });

            it('Expects the affiliation selector and create button are shown if a cost center is selected', function() {
                $testDiv.find('#edit-affiliation-type-input').val('1').trigger('select2:select');
                const $containerCreateEdit = $testDiv.find('.select-create-or-edit-container');
                expect($containerCreateEdit.is(':visible')).toBe(true);
            });

            it('Expects the affiliation selector and create buttn are shown if an outside affiliate is selected', function() {
                $testDiv.find('#edit-affiliation-type-input').val('2').trigger('select2:select');
                const $containerCreateEdit = $testDiv.find('.select-create-or-edit-container');
                expect($containerCreateEdit.is(':visible')).toBe(true);
            });

            it('Expects the cost center values are read if the cost center type is selected', function() {
                $testDiv.find('#edit-affiliation-type-input').val('1').trigger('select2:select');
                expect(CostCenterCollection.prototype.fetch).toHaveBeenCalled();
            });
        });

        describe('Tests for creating a new affiliation', function() {
            let $saveBtn;
            let $deleteBtn;

            beforeEach(function() {
                testView.render();
                $testDiv.find('.create-btn').trigger('click');
                $saveBtn = $testDiv.find('.save-btn');
                $deleteBtn = $testDiv.find('.delete-btn');
            });

            it('Expects that the delete button is disabled', function() {
                expect($deleteBtn.is(':disabled')).toEqual(true);
            });

            it('Expects that fields are initially blank', function() {
                expect($testDiv.find('#affiliation-input').val()).toEqual('');
                expect($testDiv.find('#affiliation-active-input').is(':checked')).toBe(false);
            });

            it('Expects that a successful save updates the route', function() {
                $saveBtn.trigger('click');
                testModel.set('id', 78391);
                saveModelDeferred.resolve();

                expect(AlertView.prototype.showSuccessAlert).toHaveBeenCalled();
                expect(testRouter.navigate).toHaveBeenCalledWith('affiliation/78391');
            });
        });

        describe('Tests for editing an affiliation', function() {
            let $saveBtn;
            let $cancelBtn;
            let $newAffiliationBtn;
            let $deleteBtn;
            let $deleteOkBtn;

            beforeEach(function() {
                testModel.set({
                    text : 'Super Secret Police',
                    id : 41,
                    active : true
                });
                testView.render();
                $testDiv.find('edit-affiliation-input').val('41').trigger('select2:select');
                $saveBtn = $testDiv.find('.save-btn');
                $cancelBtn = $testDiv.find('.cancel-btn');
                $newAffiliationBtn = $testDiv.find('.create-new-btn');
                $deleteBtn = $testDiv.find('.delete-btn');
                $deleteOkBtn = $testDiv.find('.delete-ok-btn');
            });

            it('Expects that the delete button is enabled', function() {
                expect($deleteBtn.is(':disabled')).toBe(false);
            });

            it('Expects that the affiliation and active checkboxes reflect the model', function() {
                expect($testDiv.find('#affiliation-input').val()).toEqual('Super Secret Police');
                expect($testDiv.find('#affiliation-active-input').is(':checked')).toEqual(true);
            });

            it('Expects the model to be updated if a value changes', function() {
                $testDiv.find('#affiliation-input').val('Super Secret Police 10th Div').trigger('change');
                $testDiv.find('#affiliation-active-input').prop('checked', false).trigger('change');
                expect(testModel.get('text')).toEqual('Super Secret Police 10th Div');
                expect(testModel.get('active')).toBe(false);
            });

            it('Expects that saving does calls the model save method', function() {
                $saveBtn.trigger('click');
                expect(testModel.save).toHaveBeenCalled();
            });

            it('Expects that clicking the cancel button re-fetches the model', function() {
                $cancelBtn.trigger('click');
                expect(testModel.fetch).toHaveBeenCalled();
            });

            it('Expects that clicking the delete OK button calls the model destroy method', function() {
                $deleteOkBtn.trigger('click');
                expect(testModel.destroy).toHaveBeenCalled();
            });

            it('Expects that the clicking on the edit new affiliation button navigates back to the root affiliation page', function() {
                $newAffiliationBtn.trigger('click');
                expect(testRouter.navigate).toHaveBeenCalled();
                expect(testRouter.navigate.calls.argsFor(0)[0]).toEqual('affiliation');
            });
        });
    });
});
