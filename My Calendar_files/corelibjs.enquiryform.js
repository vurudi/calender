(function (undefined) {

    var T1 = window.T1 = window.T1 || {};
    var c2 = T1.C2 = T1.C2 || {};
    var utilities = c2.Utilities = c2.Utilities || {};
    var shell = c2.Shell = c2.Shell || {};
    var controls = shell.Controls = shell.Controls || {};

    if (!controls.Shared) controls.Shared = {};
    if (!controls.Shared.EnquiryForm) controls.Shared.EnquiryForm = new T1_C2_Shell_Controls_Shared_EnquiryForm();

    function T1_C2_Shell_Controls_Shared_EnquiryForm() {

        var _$configureNVLink = undefined;

        /*
        CONSTANTS
        */
        var ITEM_SERVER_ACTION = "ItemAction";
        var ActionType = {
            ShowFunction: 'ShowFunction',
            PowerTag: 'PowerTag',
            PerformRowAction: 'PerformRowAction',
            RowClientAction: 'RowClientAction',
            ServerAction: 'ServerAction',
            ClientAction: 'ClientAction'
        };

        // Assume state FunctionConfig values supported by enquiry
        var FunctionConfigProperties = {
            ForceAutoRetrieve : 'ForceAutoRetrieve'
        }

        var _formControlData = undefined;

        function T1_C2_Shell_Controls_Shared_EnquiryForm_Public() { }

        T1_C2_Shell_Controls_Shared_EnquiryForm_Public.prototype = {
            Initialise: Initialise,
            GetParameterValues: GetParameterValues,
            SetParameterValues: SetParameterValues,
            ResetParameterValues: ResetParameterValues,
            GoBackToSourcePage: GoBackToSourcePage,
            GetAssumeState: GetAssumeState,
            GetResumeState: GetResumeState,
            ResumeStateData: ResumeStateData,
            ConfigureFormState: ConfigureFormState,
            SaveResumeState: SaveResumeState,
            HandleTagOrShareItemAction: HandleTagOrShareItemAction,
            PerformItemAction: PerformItemAction,
            SetRowActionAssumeStateFor: SetRowActionAssumeStateFor,
            SetAssumeStateFor: SetAssumeStateFor,
            RelatedDataPortletElement: RelatedDataPortletElement,
            GetSearchValue: GetSearchValue,
            RefreshDataView: RefreshDataView,
            GetStatePersistentParameters: GetStatePersistentParameters,
            ClearEntitiesSelection: ClearEntitiesSelection,
            ExecuteRequest: ExecuteRequest,
            UpdateConfigureCustomNVLinkTitle: UpdateConfigureCustomNVLinkTitle,
            ReadFormSettingsCallback: ReadFormSettingsCallback
        };

        function Initialise(control) {
            var controlData = control.data('t1-control');
            _formControlData = controlData;
            controlData.Parameters = [];

            shell.SetEnableExtensiveDeviceInformationSubmission(controlData.IncludeExtensiveDeviceInformation);

            controls.ServerActionLink.SetExecuteRequestCallbackFunction(ServerActionLinkExecuteRequestCallback);
            controls.ServerActionLink.SetCustomControllerActionFunction(GetServerActionControllerAction);
            controls.ServerActionLink.RegisterServerActionLinkOverrideDetailsFunction(GetServerActionLinkOverrideDetails);
            controls.ServerActionLink.SetCustomRequestFunction('EnquiryForm', GetServerActionRequest);

            controls.LinkedTab.RegisterGetFormKeyFieldValuesFunction(function () { return controls.Form.GetFormData({KeyFieldsOnly: true}); });
            controls.LinkedTab.RegisterExecuteRequestFunction(function(options) { ExecuteRequest(control, options); });

            // copy the default parameters to Parameters (we want to keep the default values, just in case)
            controlData.Parameters = CopyParameters(controlData.DefaultParameters);

            control.on('WorkflowActivityComplete', function () { RefreshDataView(); });
        }

        function CopyParameters(source){
            var dest = [];
            $(source).each(function (idx, param) {
                var newItem = {};
                $.extend(newItem, param);
                dest.push(newItem);
            });
            return dest;
        }

        function ClearEntitiesSelection(control){
            var formData = control.data('t1-control');
            formData.EntitiesSelection = undefined;
        }

        function GetServerActionRequest($serverActionLink, request) {
            var controlData = utilities.GetControlData($serverActionLink);

            if (!utilities.IsNullOrEmpty(controlData.Parent)) {
                return controls.LinkedTab.GetServerActionLinkRequest(controlData.Parent, $serverActionLink, controlData.CustomData);

            } else {
                var section = $serverActionLink.closest('.editablePanel');
                if (section.length > 0) {
                    var sectionControlData = section.data('t1-control');
                    if (sectionControlData && sectionControlData.SectionName) {

                        request = request || {};
                        request.RequestData = request.RequestData || {};
                        if (!request.RequestData.SectionName) {
                            request.RequestData.SectionName = sectionControlData.SectionName;
                        }
                    }
                }
            }

            return {};
        }

        function GetServerActionLinkOverrideDetails($serverActionLink) {
            var $tabControl = controls.LinkedTab.GetTabControlFromControl($serverActionLink);

            if (utilities.IsNullOrEmpty($tabControl)) return;

            return {
                Parent: $tabControl,
                PerformClientValidation: true,
                CustomData: !utilities.IsNullOrEmpty($tabControl) ? controls.LinkedTab.GetServerActionLinkCustomData($tabControl, $serverActionLink) : {}
            };
        }

        function GetServerActionControllerAction($serverActionLink) {
            // if server action link is in details panel the action should be SectionAction. otherwise FormAction
            return $serverActionLink.closest('.editablePanel').length > 0 ? 'SectionAction' : 'FormAction';
        }

        function ExecuteRequest(control, options) {
            if (utilities.IsNull(options)) options = {};

            var request = options.Request || {};

            var controllerAction = options.ControllerAction || 'FormAction';

            if (utilities.IsNull(options.Blocking)) options.Blocking = true;
            if (utilities.IsNull(request.RequestData)) request.RequestData = {};

            // Add parameters as key fields to FormData
            var parameters = GetParameterValues($('.enquiryForm'), true);
            if (parameters) {
                if (!request.FormData) request.FormData = {Fields: []};
                for (var i = 0; i < parameters.length; i++) {
                    var parameter = parameters[i];
                    if (!parameter) continue;
                    request.FormData.Fields.push({FieldName: parameter.FieldName, Value: parameter.Value, SyncKey: parameter.SyncKey, IsKeyField: true})
                }
            }

            var callback = function (response)
            {
                response.MessagesHandled = true;

                if (!controls.Notification.HandleNotifications(response.Messages, undefined, options.AllowDuplicateNotifications)) {
                    if ($.isFunction(options.FailureCallback)) options.FailureCallback(response);
                    return false;
                }

                if (response.SyncData && controls.SyncLink.PerformRedirectFromSyncData(response.SyncData)) {
                    // Current page is being redirected
                    return false;
                }

                controls.Form.ReplaceDivs(response.ReplaceDivs, response.SelectedTabName, true);

                if ($.isFunction(options.SuccessCallback)) options.SuccessCallback(response);

                if (response.UpdateRdpActionsExMenu) {
                    controls.RelatedDataPortlet.UpdateMenuEx(RelatedDataPortletElement(), response.RdpActionsExMenuHtml);
                }

                return true;
            };

            var ajaxRequest = {
                type: 'POST',
                url: T1.Environment.Paths.Controller + controllerAction,
                data: JSON.stringify(request),
                contentType: 'application/json',
                dataType: 'json',
                blocking: options.Blocking,
                ShowLoader: options.Blocking,
                spinnerType: options.SpinnerType,
                spinnerMessage: options.SpinnerMessage,
                autoRetryTimeoutError: options.AutoRetryTimeoutError,
                enforceFocusOnOverlay: options.EnforceFocusOnOverlay,
                relatedControl: options.RelatedControl,
                clientData: options.ClientData,
                success: callback,
                error: $.isFunction(options.ErrorCallback) ? options.ErrorCallback : function () { controls.Overlay.Close(); return true; },
                isAddNewSection: options.IsAddNewSection
            };

            shell.Ajax(ajaxRequest);
        }

        // Custom NV Functions
        function UpdateConfigureCustomNVLinkTitle(formControl)
        {
            _$configureNVLink = $('#MyEnquiryConfigureNVLink');
            var labelText = _formControlData.Text.ConfigureNVForFunction.replace('{0}', formControl.data().t1Control.Label);
            controls.ServerActionLink.SetLabelText(_$configureNVLink, labelText);
        }

        /*
        Implements the logic for configuring the form state and returns whether the state is to be loaded or not.
        The formState parameter is passed as reference
        */
        function ConfigureFormState(control, formState, assumeState, resumeState) {
            var loadState = false;
            // check whether we have default parameters which need to be enforced (persistent sync keys etc)
            var formData = control.data('t1-control');
            // apply the FunctionConfig values from assumeState (if they exists)
            if(assumeState && assumeState.FunctionConfig){
                if(assumeState.FunctionConfig[FunctionConfigProperties.ForceAutoRetrieve]){
                    formData.AutoRetrieve = "Always";
                }
            }


            // if we need to display an external entities selection, ignore any assume/resume state and use Parameters from the EntitiesSelection object
            if (!Object.IsNull(formData.EntitiesSelection)){
                var entitiesSelection = formData.EntitiesSelection;
                // make sure we always read data
                formData.AutoRetrieve = "Always";
                formState.ViewId = undefined;
                SetParameterValues(control,  entitiesSelection.Parameters);
                var rdpControl = RelatedDataPortletElement();
                controls.Shared.RelatedDataPortlet.SetEntitiesSelection(rdpControl,  entitiesSelection.Entities);
            }else{
                var enforceDefaultParameters = [];
                for (var i= 0; i < formData.DefaultParameters.length; i++){
                    var defaultParameter = formData.DefaultParameters[i];
                    if (formData.ParametersOptions[defaultParameter.FieldName].EnforceDefaultValue){
                        enforceDefaultParameters.push(defaultParameter);
                    }
                }
                var mustEnforceDefaultParameters = enforceDefaultParameters.length > 0;

                loadState = assumeState.HasState || resumeState.HasState;
                // see what to do with the default view
                // if there is assume state, load that state (active tiles links or links from another function - assume state has state if has a search value or parameters defined)
                // if it's opened from workplace but doesn't have a proper assume state (nu parameters, sync fields, search text etc), load the default view if exists
                // if there is resume state, load it
                if (assumeState.HasState) {
                    mustEnforceDefaultParameters = false;
                    // if explicitely instructed, reset the default view
                    // if there is a resume state , ignore the default view as well
                    // also ignore default view if the assume state was set from workplace and has some search text (enterprise search case)
                    var hasSyncFields = false;
                    if (assumeState.SyncFieldMap) {
                        for (var p in assumeState.SyncFieldMap) {
                            hasSyncFields = true;
                            continue;
                        }
                    }
                    if ((!assumeState.UseDefaultView) || (resumeState.HasState) || (assumeState.OpenedFromWorkplace && ((assumeState.SearchValue && assumeState.SearchValue !== '') || (hasSyncFields)))) {
                        formState.ViewId = undefined;
                    }
                    // if there is a ViewId defined in the assumeState, ignore the default view
                    if (assumeState.ViewId !== undefined) {
                        // if the assume state has a viewId, override the default form view
                        formState.ViewId = assumeState.ViewId;
                    }
                    // if there is a RecentId in the assume state, load it regardless and ignore default view
                    if (assumeState.RecentId !== undefined) {
                        // pass the recent ID in case it comes from the recents list
                        formState.RecentId = assumeState.RecentId;
                        // also make sure to remove the default view ID - recentID should take always precedence
                        formState.ViewId = undefined;
                    }
                } else if (assumeState.OpenedFromWorkplace && formState.ViewId !== undefined) {
                    // it's opened from workplace and has a default view, do nothing, the default view is going to get loaded anyway
                    mustEnforceDefaultParameters = false;
                } else if (resumeState.HasState) {
                    // if we have a resume state, reset default view (it's page refresh)
                    formState.ViewId = undefined;
                }
                // if at this stage there still is a view to load, make sure to read data
                if (assumeState.UseDefaultView && formState.ViewId !== undefined) {
                    loadState = true;
                }

                formState.FormState = resumeState.FormState;
                if (formState.FormState) {
                    formState.FormState.RdpState.SearchValue = assumeState.SearchValue !== '' && assumeState.SearchValue !== undefined ? assumeState.SearchValue : resumeState.SearchValue;
                    // if we have also an assume state, remove the SelectedRecordSyncKeys entry from FormState.RdpState as they may refer to a different resultset
                    if(assumeState.HasState){
                        delete formState.FormState.RdpState.SelectedRecordSyncKeys;
                    }
                }
                // use the default criteria text ONLY if opened from workplace, there is no search value set in assume state and there isn't any default view to load
                formState.UseDefaultCriteriaText = assumeState.OpenedFromWorkplace && (assumeState.SearchValue === undefined || assumeState.SearchValue === '') && formState.ViewId === undefined && formState.RecentId === undefined;
                // none of the above matters if the user instructed to always use default criteria text
                formState.UseDefaultCriteriaText = formData.AlwaysUseDefaultCriteriaTextOnPageLoad || formState.UseDefaultCriteriaText;

                var finalParameters = assumeState.HasState && assumeState.Parameters !== undefined && assumeState.Parameters.length > 0 ? assumeState.Parameters : resumeState.Parameters;
                // if URLs are passed via URL (i.e. sk.<fieldName>) they are in assume state and should take precedence
                if(formData.UseSecureParameters && (!assumeState.UrlSyncKeys)){
                // get the secure parameters from assume/resume state and ignore anything else
                    var secureSyncData = assumeState.HasState && assumeState.SyncKeys !== undefined && assumeState.SyncKeys.length > 0 ? assumeState.SyncKeys : resumeState.SyncKeys;
                    if(!Object.IsNull(secureSyncData)){
                        finalParameters = secureSyncData;
                    }
                }

                SetParameterValues(control, finalParameters);

                // write the default parameters on to of anything which has already been set
                if (mustEnforceDefaultParameters)
                    SetParameterValues(control, enforceDefaultParameters);
                formState.Parameters = GetParameterValues(control);
            }


            return loadState;
        }

        /*
        Saves the enquiry form resume state
        */
        function SaveResumeState(control, rdpControl, options) {
            options = options || {};
            var controlData = control.data('t1-control');
            var resumeState = new ResumeStateData();

            controls.PageSync.Load();
            if (controls.PageSync.ContainsResumeState()) {
                $.extend(resumeState, controls.PageSync.GetResumeState());
            }

            var rdpState = controls.RelatedDataPortlet.GetState(rdpControl);

            // Always replace Search values.
            resumeState.SearchValue = options.SearchValue || rdpState.SearchValue;
            var currentParameters = options.ParameterValues || GetParameterValues(control);
            // remove the parameters which are not to be saved in the resume state
            var resumeStateParameters = [];
            if (controlData.ParametersOptions) {
                for (var crtIdx = 0; crtIdx < currentParameters.length; crtIdx++) {
                    if (controlData.ParametersOptions[currentParameters[crtIdx].FieldName] && controlData.ParametersOptions[currentParameters[crtIdx].FieldName].IsStatePersistent) {
                        resumeStateParameters.push(currentParameters[crtIdx]);
                    }
                }
            } else {
                // all parameters are to be saved in the resume state
                resumeStateParameters = currentParameters;
            }
            resumeState.Parameters = resumeStateParameters;
            resumeState.SyncKeys = resumeStateParameters; // to prepare phasing out the use of FieldMap, SyncFieldMap and Parameters

            resumeState.FormState = {
                RdpState: rdpState
            };

            // make sure to remove any previously saved assume state - however, save it for later
            // save the source context from assume state in resume state
            var assumeState = {};
            if (controls.PageSync.ContainsAssumeState()) {
                assumeState = controls.PageSync.GetAssumeState();
                resumeState.SourceContext = assumeState.SourceContext;
                if (controlData.SelectionMode) {
                    // save also the source window options
                    resumeState.SourceWindowOptions = assumeState.SourceWindowOptions;
                }
            }
            controls.PageSync.Remove();
            controls.PageSync.SetResumeState(resumeState);
            controls.PageSync.Save();
        }

        /*
        Returns the enquiry form parameters
        */
        function GetParameterValues(control, returnCopy) {
            var controlData = control.data('t1-control');
            if (returnCopy){
                return JSON.parse(JSON.stringify( controlData.Parameters ));
            } else{
                return controlData.Parameters;
            }
        }

        function GetStatePersistentParameters(control) {
            var controlData = control.data('t1-control');
            var pesistentParameters = [];
            for (var parameter in controlData.ParametersOptions) {
                if (controlData.ParametersOptions[parameter].IsStatePersistent)
                    pesistentParameters.push(parameter);
            }
            return pesistentParameters;
        }

        /**
         * Callback which initialises the enquiry form
         *
         * @function ReadFormSettingsCallback
         * @public
         * @param {jQuery} control: the enquiry form control
         * @param {object} readFormSettingsResponse - The ReadFormSettings response object.
         * @param {object} options - object describing execution options
         *
         * @returns {object} configuration object to be further used by callers
         *              {
         *                  RdpState: rdpState
         *              }
         */
        function ReadFormSettingsCallback(control, readFormSettingsResponse, options) {
            var readFormSettingsConfig = {
                Success: readFormSettingsResponse.Success
            };
            if (!readFormSettingsResponse.Success)
                return readFormSettingsConfig;
            if (readFormSettingsResponse.RedirectToFunctionUrl) {
                SetAssumeStateFor(readFormSettingsResponse.RedirectToFunction, {});
                T1.C2.Shell.Navigate(readFormSettingsResponse.RedirectToFunctionUrl, { OpenInNewTab: false });
                delete options.callback; //make sure we don't try to execute anything else
                return readFormSettingsConfig;
            }
            var readFormSettingsEvent = new $.Event('Form.ReadFormSettingsCallback');
            var readFormSettingsEventData = {
                Parameters: readFormSettingsResponse.Parameters
            };
            control.trigger(readFormSettingsEvent, readFormSettingsEventData);

            // Update the Contextual Key Labels
            if (readFormSettingsResponse.ContextualKeyLabels) controls.ContextualKeys.UpdateLabels(readFormSettingsResponse.ContextualKeyLabels);

            if (readFormSettingsResponse.ContextualPanelData) {
                controls.ContextualKeys.UpdatePanel(readFormSettingsResponse.ContextualPanelData.PanelHtml, { ReplaceContents: readFormSettingsResponse.ContextualPanelData.ReplacePanel });
            }

            // response.Parameters contain the correct parameters to be used from now on (user selected, parameters passed from source function for secondary function or saved view parameters)
            SetParameterValues(control, readFormSettingsResponse.Parameters, {SavePersistentKeys: options.SavePersistentKeys, EnforceOverride: true});
            controls.EnquiryForm.SetFormView(control, readFormSettingsResponse.CurrentView);

            var relatedDataPortletElement = RelatedDataPortletElement();
            var rdpState = undefined;
            if (readFormSettingsResponse.ViewDefinition) {
                rdpState = readFormSettingsResponse.ViewDefinition.RdpState;
                rdpState.IsViewDefinition = true;
                // we should use the view definition state ALWAYS in this case and do not reset the grid columns
                readFormSettingsResponse.ResetGridColumns = false; // this is used only on desktop
            } else {
                if (options.FormState) {
                    rdpState = options.FormState.RdpState;
                    rdpState.IsViewDefinition = false;
                    controls.Shared.RelatedDataPortlet.ChangeSettings(relatedDataPortletElement, {
                        IgnoreStateFilters: readFormSettingsResponse.IgnoreStateFilters
                    });
                }
            }
            readFormSettingsConfig.RdpState = rdpState;

            var parameterValues = GetParameterValues(control);
            controls.RelatedDataPortlet.InitComponents(relatedDataPortletElement,
                {
                    Parameters: parameterValues,
                    EnquiryFiltersHtml: readFormSettingsResponse.EnquiryFiltersHtml,
                    SelectionSummary: readFormSettingsResponse.SelectionSummary,
                    BulkActionsData: {
                        SelectionData: readFormSettingsResponse.BulkActionSelection,
                        ActionsMenuHtml: readFormSettingsResponse.BulkActionSelectionMenuHtml,
                        UpdateActionsMenu : true
                    },
                    State: rdpState // this is used only on desktop
                });

            if (readFormSettingsResponse.ReplacementLinksToFunctions) {
                OfferLinksToFunctions(readFormSettingsResponse.ReplacementLinksToFunctions);
            }

            controls.EnquiryForm.UpdateFormActions(control, readFormSettingsResponse);

            if (controls.Shared.RelatedDataPortlet.HasFileUploadControl(relatedDataPortletElement)){
                var fileUploadControl = relatedDataPortletElement.find('.fileUploadControl');
                options.UpdateFileControlActions = controls.Shared.FileUpload.UpdateFileUploadRdpActionEx(fileUploadControl);
            }

            // make sure to update the contextual panel values
            controls.ContextualKeys.UpdateContents(parameterValues);

            // Form title
            if (parameterValues) {
                // check if form title is being shown
                var formTitleVisible = $('#FormTitleContainer');
                if (formTitleVisible.length != 0) {
                    ReadFormTitle(parameterValues);
                }
            }

            return readFormSettingsConfig;
        }

        //TODO: refactor/remove this
        function OfferLinksToFunctions(replacementLinksToFunctions) {
            var offerLinksToFunctionsEvent = $.Event("OfferLinksToFunctions");
            offerLinksToFunctionsEvent.replacementLinksToFunctionsHtml = replacementLinksToFunctions;
            $('[data-t1-control-type*=Form]').trigger(offerLinksToFunctionsEvent);
        }

        /**
         * Reads and updates the form title
         *
         * @function ReadFormTitle
         * @public
         * @param {array} parameters - enquiry parameters
         */
        function ReadFormTitle(parameters) {
            var request = {
                Parameters: parameters
            };

            T1.C2.Shell.Ajax({
                type: 'POST',
                url: T1.Environment.Paths.Controller + 'GetFormTitle',
                data: JSON.stringify(request),
                contentType: 'application/json',
                dataType: 'json',
                ShowLoader: false,
                blocking: false,
                initialiseControls: true,
                success: function (result) {
                    controls.EnquiryForm.SetFormTitle(result);
                },
                error: function (error) {
                    T1.C2.Shell.Controls.Overlay.Close($('.form'));
                    return true;
                }
            });
        }

        /*
        Sets the parameter values regardless of the state persistent attribute
         - if the parameter does not exist in the EnquiryForm_Parameters it will add it to the list
         - parameterValues items may have the FieldName and/or the SyncKey values - check both of them if they match the enquiry form parameters
         */
        function SetParameterValues(control, parameterValues, options) {
            options = shell.EnsureValidObject(options);
            // make sure the arguments is a valid object (array)
            if (!$.isArray(parameterValues)) {
                return;
            }
            var controlData = control.data('t1-control');
            var paramExists = false;
            $(parameterValues).each(function (newParamIdx, newParam) {
                paramExists = false;
                $(controlData.Parameters).each(function (idx, param) {
                    if ((newParam.FieldName === param.FieldName) || ((newParam.SyncKey !== undefined) && (newParam.SyncKey !== '') && (newParam.SyncKey === param.SyncKey))) {
                        // set the value and hash if instructed to do so (as result of ReadFormSettingsCallback), if the value changed OR value is the same but hash doesn't exist
                        if(options.EnforceOverride || (param.Value !== newParam.Value) || (param.Value === newParam.Value && String.IsNullOrWhiteSpace(param.Hash))) {
                            param.Hash = newParam.Hash;
                            param.Value = newParam.Value;
                        }
                        paramExists = true;
                        return false;
                    }
                });
                if (!paramExists && newParam.Hash) {
                    controlData.Parameters.push(newParam);
                }
            });
            // make sure to update the contextual keys as well
            controls.ContextualKeys.UpdateContents(controlData.Parameters, {SavePersistentKeys: options.SavePersistentKeys});
            return false;
        }

        // set parameters values to default values
        function ResetParameterValues(control, options) {
            options = options || {};
            var controlData = control.data('t1-control');
            var resetParameters = [];
            // do not reset hidden parameters with default value blank - usually they are used to pass data from another function
            for (var idx = 0; idx < controlData.DefaultParameters.length; idx++){
                var defaultParam = controlData.DefaultParameters[idx];
                var paramOption = controlData.ParametersOptions[defaultParam.FieldName];
                if (paramOption && (!paramOption.CanBeReset || (!paramOption.IsVisible && String.IsNullOrWhiteSpace(defaultParam.Value)))){
                    continue;
                }
                resetParameters.push($.extend({}, defaultParam));
            }
            // make sure to update the contextual keys as well
            SetParameterValues(control, resetParameters);
            if (options.ReloadData) {
                controls.EnquiryForm.UpdateEnquiryForm(GetParameterValues(control));
            }
        }

        /*
        Navigates back to the source page (if exists)
        */
        function GoBackToSourcePage() {
            controls.PageSync.Load();
            // get the source context either from assume state either from resume state (if we have a resume state then there shouldn't be any assume state)
            // first look into assume state just in case the user hasn't performed any search and the resume state contains previous data
            var sourceContext = undefined;
            if (controls.PageSync.ContainsAssumeState()) {
                sourceContext = controls.PageSync.GetAssumeState().SourceContext;
            } else {
                if (controls.PageSync.ContainsResumeState()) {
                    sourceContext = controls.PageSync.GetResumeState().SourceContext;
                }
            }
            // restore the assume state for the source context
            if (sourceContext && sourceContext.AssumeState && sourceContext.FunctionName) {
                controls.PageSync.LoadFor(sourceContext.FunctionName, (sourceContext.Key !== undefined ? sourceContext.Key.Value : undefined));
                controls.PageSync.SetAssumeState(sourceContext.AssumeState);
                controls.PageSync.Save();
            }

            window.history.back();
        }

        function GetAssumeState(keepAssumeState) {
            var hasState = false;
            // See whether we've been assigned a state to assume.
            controls.PageSync.Load();
            if (!controls.PageSync.ContainsAssumeState()) {
                return {
                    UseDefaultView: false,
                    HasState: false
                };
            }

            var assumeState = controls.PageSync.GetAssumeState();
            if (!keepAssumeState) controls.PageSync.Remove();

            // put all the values which potentially could hold parameters values in a single array
            var newParameterValues = [];
            // if assume state contains parameters, overwrite the values
            if (assumeState.Parameters) {
                hasState = true;
                newParameterValues.push.apply(newParameterValues, assumeState.Parameters);
            }

            // SourceKeyFields is defined as array
            var paramRef = undefined;
            if (assumeState.SourceKeyFields != undefined) {
                for (var sourceFieldIdx = 0; sourceFieldIdx < assumeState.SourceKeyFields.length; sourceFieldIdx++) {
                    paramRef = SyncObjectExists(newParameterValues, assumeState.SourceKeyFields[sourceFieldIdx]);
                    if (paramRef == undefined) {
                    newParameterValues.push({
                        FieldName: assumeState.SourceKeyFields[sourceFieldIdx].FieldName,
                        SyncKey: assumeState.SourceKeyFields[sourceFieldIdx].SyncKey,
                        Value: assumeState.SourceKeyFields[sourceFieldIdx].Value,
                        Hash: assumeState.SourceKeyFields[sourceFieldIdx].Hash
                    });
                    } else {
                        paramRef.Value = assumeState.SourceKeyFields[sourceFieldIdx].Value;
                    }
                }
            }
            // FieldMap and SyncFieldMap are defined as objects
            //IMPORTANT: sometime products set the SyncKey value in the field name or vice-versa
            // make sure both are set - UpdateParameterValues will take care of matching
            for (var fieldName in assumeState.FieldMap) {
                paramRef = SyncObjectExists(newParameterValues, { FieldName: fieldName, SyncKey: fieldName });
                if (paramRef == undefined) {
                    newParameterValues.push({ FieldName: fieldName, SyncKey: fieldName, Value: assumeState.FieldMap[fieldName] });
                } else {
                    paramRef.Value = assumeState.FieldMap[fieldName];
                }
            }
            for (var syncKey in assumeState.SyncFieldMap) {
                paramRef = SyncObjectExists(newParameterValues, { FieldName: syncKey, SyncKey: syncKey });
                if (paramRef == undefined) {
                    newParameterValues.push({ FieldName: syncKey, SyncKey: syncKey, Value: assumeState.SyncFieldMap[syncKey] });
                } else {
                    paramRef.Value = assumeState.SyncFieldMap[syncKey];
                }
            }
            if (assumeState.SyncKeys) {
                for (var syncKeyObj of assumeState.SyncKeys) {
                    paramRef = SyncObjectExists(newParameterValues, syncKeyObj);
                    if (paramRef == undefined) {
                        newParameterValues.push($.extend({}, syncKeyObj));
                    } else {
                        paramRef.Value = syncKeyObj.Value;
                        paramRef.Hash = syncKeyObj.Hash;
                    }
                }
            }
            // set the parameter values
            if (newParameterValues.length > 0) {
                hasState = true;
            }

            if (assumeState.SearchValue) {
                if (assumeState.SearchValue == "__BLANK_SEARCH_VALUE__") {
                    assumeState.SearchValue = " ";
                }
                hasState = true;
            }

            if ((assumeState.RecentId != undefined) || (assumeState.ViewId != undefined))
                hasState = true;

            //Note: not always hasState is true - workplace links set the assume state but may not set any parameters and if there isn't any default view, we still need to
            // load the resume state
            var retVal = {};
            $.extend(true, retVal, assumeState);
            retVal.Parameters = newParameterValues;
            retVal.HasState = hasState;
                // ignore the default view only if specifically instructed to do so (if the form is loaded from the Workplace, the UseDefaultView will be set to true)
                // if UseDefaultView is undefined (link to function), we'll still use the default view if no searchValue is passed (for the time being this was decided)
            retVal.UseDefaultView = (assumeState.UseDefaultView == undefined || assumeState.UseDefaultView) && String.IsNullOrWhiteSpace(assumeState.SearchValue);

            return retVal;
        }

        function GetResumeState(control) {
            var resumeState;
            var controlData = control.data('t1-control');

            // Restore previous screen state if it exists.
            controls.PageSync.Load();
            if (!controlData.UseState || !controls.PageSync.ContainsResumeState()) {
                return {
                    HasState: false
                };
            }

            resumeState = new ResumeStateData();
            $.extend(resumeState, controls.PageSync.GetResumeState());

            var retVal = {};
            $.extend(true, retVal, resumeState);
            retVal.HasState = true;
            return retVal;
        }

        /*
        Checks whether the syncObject (FieldMap, SncFieldMap, SourceSyncField etc) already exists
        For this checks the Field name or SyncKey against the Parameters
        */
        function SyncObjectExists(parameters, syncObject) {
            var foundParameter = undefined;
            $(parameters).each(function(idx, param) {
                if ((syncObject.FieldName == param.FieldName) || ((syncObject.SyncKey == param.SyncKey) && ((param.SyncKey != undefined) && (param.SyncKey != '')))) {
                    foundParameter = param;
                    return false;
                }
            });
            return foundParameter;
        }

        function ResumeStateData() {
            function FormPanelState() {
                this.IsMaximised = false;
            }

            this.ParameterValues = [];
            this.FormPanel = new FormPanelState();
        }

        function HandleTagOrShareItemAction(eventData, actionData, requestData) {
            requestData.TabName = "";
            requestData.SelectAll = false;
            requestData.SearchValue = eventData.SearchValue;
            requestData.ItemsCount = 0;
            requestData.SelectedItems = [{
                SyncKeys: requestData.SyncKeys,
                HierarchyLevel: requestData.HierarchyLevel,
                Units: requestData.Units,
                InputValues: requestData.InputValues,
                Description: eventData.ItemDescription != undefined ? eventData.ItemDescription : ""
            }];

            if (actionData.ActionName === 'TAG_SELECTED') {
                var onTaggedCallback = function (tagItemResponse, tagItemRequest) {
                    if (eventData.Callback) {
                        var newItemData = {
                            UpdateUserDefinedTags: true,
                            UpdateUserDefinedTagsSet: tagItemResponse.TagSet
                        };
                        eventData.Callback(newItemData);
                    }
                };
                controls.TagSelector.Show(requestData, onTaggedCallback, { EditMode: false });
            }

            if (actionData.ActionName === 'SHARE_SELECTED') {
                var onSharedCallback = function (shareItemResponse, shareItemRequest) {
                    if (eventData.Callback) {
                        var newItemData = {
                            UpdateUserDefinedShare: true,
                            UpdateUserDefinedShareSet: shareItemResponse.Properties
                        };
                        eventData.Callback(newItemData);
                    }
                };
                controls.Flow.Share(requestData, onSharedCallback);
            }
        }

        function PerformItemAction(eventData) {
            var control = GetFormControl();
            var requestData = {};
            var actionData = eventData.RowAction || eventData.ItemAction;
            var syncKeys = eventData.SyncKeys;
            var units = eventData.Units == undefined || eventData.Units == '' ? 0 : eventData.Units;

            controls.Notification.Clear();
            switch (actionData.Action) {
                case ActionType.ShowFunction:
                case ActionType.PowerTag:

                    actionData.PageKey = new Date().format('yyyyMMddHHmmss');

                    SetRowActionAssumeStateFor(syncKeys, actionData);

                    SetReadToRecordState(actionData);

                    // give back control to the caller
                    if (eventData.Callback) {
                        eventData.Callback(undefined, actionData);
                    }
                    var suite = T1.Environment.Context.Suite.Name;
                    if (actionData.Suite && actionData.Suite.length > 0) {
                        suite = actionData.Suite;
                    }

                    var url = T1.Environment.Paths.RootEnvironmentUrl + 'Workplace/' + T1.Environment.Paths.RootController + '/RedirectToFunction?f=' + encodeURIComponent(actionData.FunctionName) + '&h=' + actionData.Hash + '&t=' + actionData.ExpiryTime;
                    url += '&suite=' + suite + '&pagekey=' + actionData.PageKey;

                    // if action data has also parameters set, add them to the URL
                    if (actionData.UrlParameters) {
                        for (var urlParam in actionData.UrlParameters) {
                            url = url + '&' + urlParam + '=' + encodeURIComponent(actionData.UrlParameters[urlParam]);
                        }
                    }
                    T1.C2.Shell.Navigate(url, { OpenInNewTab: actionData.OpenInNewTab, AddToBrowserHistory: actionData.AddToBrowserHistory });
                    break;
                case ActionType.PerformRowAction:
                    // TODO: no not do anything if there is no data to send to the server
                    requestData.SyncKeys = syncKeys;
                    requestData.ActionName = actionData.ActionName;
                    requestData.FormData = controls.Form.GetFormData({
                        MergeFormData: eventData.CustomPopupFormData,
                        KeyFieldsOnly: true
                    });
                    requestData.Parameters = eventData.Parameters || GetParameterValues(control);
                    requestData.SelectedFilters = eventData.SelectedFilters;
                    requestData.SectionName = eventData.SectionName;
                    requestData.Units = units;
                    requestData.InputValues = eventData.InputValues;
                    requestData.HierarchyLevel = eventData.HierarchyLevel;
                    if (controls.EnquiryForm) {
                        requestData.SourceKeyFields = controls.EnquiryForm.GetSourceKeyFieldsValues();
                    }
                    if (actionData.ActionName === 'TAG_SELECTED' || actionData.ActionName === 'SHARE_SELECTED') {
                        HandleTagOrShareItemAction(eventData, actionData, requestData);
                    } else {
                        T1.C2.Shell.Ajax({
                            type: 'POST',
                            url: T1.Environment.Paths.Controller + ITEM_SERVER_ACTION,
                            data: JSON.stringify(requestData),
                            contentType: 'application/json',
                            dataType: 'json',
                            ShowLoader: true,
                            autoRetryTimeoutError: false,
                            success: function (jsonData) {
                                if (jsonData.Success){
                                    if (jsonData.ReturnToSourcePage) {
                                        GoBackToSourcePage(control);
                                    }
                                    // update the parameters - if necessary
                                    if (jsonData.Parameters.length) {
                                        controls.EnquiryForm.SetParameterValues(jsonData.Parameters);
                                        // if there are parameters set, always save them in the resume state
                                        controls.EnquiryForm.SaveResumeState();
                                    }
                                    // check whether we need to update the form title
                                    if (jsonData.FormTitle) {
                                        var formTitleControl = $('.formTitleControl');
                                        if (formTitleControl.length > 0) {
                                            controls.EnquiryForm.SetFormTitle(jsonData);
                                        }
                                    }

                                    // If we are redirecting, generate a new PageKey here so we can access it in the callback if required.
                                    if (jsonData.RedirectToFunction) jsonData.RedirectPageKey = new Date().format('yyyyMMddHHmmss');

                                    // give back control to the caller
                                    if (eventData.Callback) {
                                        eventData.Callback(jsonData, actionData);
                                    }
                                   // raise the Event.Custom.AfterItemServerAction event
                                    var customEventData = {
                                        SyncKeys: requestData.SyncKeys,
                                        Parameters: requestData.Parameters,
                                        Fields: jsonData.Fields,
                                        Response: {
                                            SyncKeys: jsonData.SyncKeys || {},
                                            Parameters: jsonData.Parameters || {}
                                        }
                                    };
                                    var afterItemServerActionEvent = $.Event('Event.Custom.AfterItemServerAction');
                                    $('body').trigger(afterItemServerActionEvent, customEventData);

                                    if (jsonData.RedirectToFunction) {
                                        // redirect to the requested function
                                        var dataToSync = GetParameterValues(control);
                                        if (jsonData.Parameters.length)
                                            dataToSync = jsonData.Parameters;
                                        // translate the array to SyncFields object: <property:value>
                                        var syncFields = {};
                                        $(dataToSync).each(function (idx, elem) {
                                            syncFields[elem.SyncKey] = elem.Value;
                                        });
                                        var syncData = { SyncFields: syncFields };
                                        if (jsonData.SyncData) {
                                            // if I have jsonData.SyncData, add the jsonData.Parameters/form parameters to it as SyncFields
                                            if (!jsonData.SyncData.SyncFields) {
                                                jsonData.SyncData.SyncFields = {};
                                            }
                                            for (var field in syncFields) {
                                                // the SyncFields set by the product developer should have the top priority - if they are set, do not overwrite their values
                                                if (jsonData.SyncData.SyncFields[field] == undefined) {
                                                    jsonData.SyncData.SyncFields[field] = syncFields[field];
                                                }
                                            }
                                            syncData = jsonData.SyncData;
                                        }

                                        SetAssumeStateFor(jsonData.RedirectToFunction, syncData, undefined, jsonData.RedirectPageKey);
                                        T1.C2.Shell.Navigate((jsonData.RedirectToFunctionUrl.indexOf('?') > 0 ? jsonData.RedirectToFunctionUrl + '&' : jsonData.RedirectToFunctionUrl + '?') + 'pagekey=' + jsonData.RedirectPageKey, {
                                            OpenInNewTab: syncData.OpenInNewWindow,
                                            CurrentPageAction: syncData.CurrentPageAction,
                                            AddToBrowserHistory: syncData.AddToBrowserHistory,
                                            IsExternalUrl: syncData.IsExternalUrl });
                                    }
                                    else if (!Object.IsNull(jsonData.SyncData)) {
                                        // redirect to the requested URL
                                        controls.SyncLink.PerformRedirectFromSyncData(jsonData.SyncData);
                                    }
                                    else {
                                        if (!Object.IsNull(jsonData.BulkActionSelectionSummaryData))
                                            controls.Shared.RelatedDataPortlet.UpdateSelectionSummaryContents(eventData.RdpControl, jsonData.BulkActionSelectionSummaryData, true);

                                        // here the response messages have already been added to the notification panel
                                        if (!T1.IsPhone && jsonData.SelectionSummaryData)
                                            controls.Shared.RelatedDataPortlet.UpdateSelectionSummaryContents(eventData.RdpControl, jsonData.SelectionSummaryData, false);
                                    }
                                }
                                return true;
                            },
                            error: function (error) {
                                return true;
                            }
                        });
                    }
                    break;
                case ActionType.RowClientAction:
                    // raise the Event.CustomRowAction event
                    requestData.Control = eventData.RdpControl;
                    requestData.SyncKeys = syncKeys;
                    requestData.ActionName = actionData.ActionName;
                    requestData.Parameters = GetParameterValues(control);
                    requestData.Data = actionData.Parameters;
                    requestData.Units = units;
                    requestData.InputValues = eventData.InputValues;
                    requestData.HierarchyLevel = eventData.HierarchyLevel;

                    var customEvent = $.Event('Event.CustomRowAction');
                    $('body').trigger(customEvent, requestData);
                    break;
            }
        }

        // sets the assume state for the given function
        function SetAssumeStateFor(functionName, syncData, selectionData, pageKey) {
            syncData = syncData || {};
            var formControl = GetFormControl();
            var formData = formControl.data('t1-control');

            var assumeState;
            controls.PageSync.LoadFor(functionName, pageKey);
            assumeState = controls.PageSync.GetNewAssumeState();
            var parameters = GetParameterValues(formControl);
            assumeState.SourceKeyFields = parameters;
            assumeState.SourceWindowOptions = {
                Title: formData.Label
            };
            // make sure the wizard form and my maintenance will be able to read data
            //TODO: consider refactoring when all the forms will have a unified way of sync-ing data
            $(parameters).each(function (idx, elem) {
                assumeState.FieldMap[elem.FieldName] = elem.Value;
            });
            // add also to the field map any SyncFields defined by the product developer
            // Note: SyncFields are stored in SyncFieldsMap and the maintenance form relied on the sync key to map them to the fields
            // This is ok but since in SetRowActionAssumeStateFor we put the SyncFields in the FieldsMap we should do the same here
            // so the product developer uses the same API (they set SyncData on the server side)
            for (var propName in syncData.SyncFields) {
                assumeState.FieldMap[propName] = syncData.SyncFields[propName];
            };
            assumeState.SourceContext = T1.Environment.Context;
            assumeState.SourceContext.Url = window.location.href; // save the actual location containing all the URL parameters - needed on navigating back from enquiry selection mode
            assumeState.SourceContext.FunctionName = T1.Environment.Context.Function.OriginalName;

            //Note: one way products avoids the search value being passed was to set the syncData.SearchValue = " "
            assumeState.SearchValue = syncData.SearchValue ?
                                syncData.SearchValue // syncData.SearchValue takes precedence (it's set on menu item)
                                : formData.Properties && formData.Properties.DisableSendingSearchValueToTargetFunction ? '' : GetSearchValue();
            assumeState.Parameters = parameters;
            // if syncData has SyncKeys, they must be hashed. Parameters are always hashed (ReadFormSettings takes care of that regardless whether the current enquiry uses secure parameters or not)
            // here syncData.SyncKeys will take precedence over parameters
            assumeState.SyncKeys = c2.Shared.Shell.MergeSyncKeys(parameters, syncData.SyncKeys);
            assumeState.SelectionData = selectionData;

            assumeState.FunctionMode = syncData.MaintenanceMode;
            assumeState.LoadInSelectionMode = syncData.LoadInSelectionMode;
            assumeState.SelectedTab = syncData.SelectedTab;
            assumeState.SyncFieldMap = syncData.SyncFields;
            if(syncData.NavigationOptions){
                assumeState.FunctionConfig = syncData.NavigationOptions.TargetFunctionConfig;
            }

            controls.PageSync.SetAssumeState(assumeState);
            controls.PageSync.Save();
        }

        function GetSearchValue() {
            return controls.RelatedDataPortlet.GetSearchValue(RelatedDataPortletElement());
        }

        function RelatedDataPortletElement() {
            return $('[data-t1-control-type*=Form] #EnquiryRelatedDataPortlet').first();
        }

        function SetRowActionAssumeStateFor(syncKeys, actionData) {
            controls.PageSync.LoadFor(actionData.FunctionName, actionData.PageKey);
            // if actionData has parameters, write them to the field map
            var fieldMap = {};
            for (var param in actionData.Parameters) {
                fieldMap[param] = actionData.Parameters[param];
            }
            // set sync keys as parameters for the new function
            var syncFieldMap = {};
            $(syncKeys).each(function (index, elem) {
                // the parameters defined by the product developer should take precedence over the sync keys values - if they are defined, do not set the syncFieldMap
                if (fieldMap[elem.FieldName] == undefined && elem.Value)
                    syncFieldMap[elem.SyncKey] = elem.Value;
            });

            var formControl = GetFormControl();
            var formData = formControl.data('t1-control');
            var assumeState = controls.PageSync.GetNewAssumeState();
            assumeState.SourceWindowOptions = {
                Title: formData.Label
            };
            assumeState.FieldMap = fieldMap;
            assumeState.SyncFieldMap = syncFieldMap;
            // to prepare phasing out the use of FieldMap, SyncFieldMap and Parameters
            assumeState.SyncKeys = c2.Shared.Shell.MergeSyncKeys(syncKeys, actionData.SyncKeys);
            assumeState.FunctionMode = actionData.MaintenanceOpenMode;
            assumeState.LoadInSelectionMode = actionData.LoadInSelectionMode;
            assumeState.SelectedTab = actionData.SelectedTab;
            assumeState.SearchValue = actionData.SearchValue;
            // save the parameters also in case we have enquiry-to-enquiry navigation
            assumeState.Parameters = GetParameterValues(formControl);

            if(actionData.NavigationOptions){
                assumeState.FunctionConfig = actionData.NavigationOptions.TargetFunctionConfig;
            }

            assumeState.SourceContext = T1.Environment.Context;
            assumeState.SourceContext.Url = window.location.href; // save the actual location containing all the URL parameters - needed on navigating back from enquiry selection mode
            assumeState.SourceContext.FunctionName = T1.Environment.Context.Function.OriginalName;

            controls.PageSync.SetAssumeState(assumeState);
            controls.PageSync.Save();
        }

        function SetReadToRecordState(actionData){
            if (!actionData.NavigationOptions || String.IsNullOrWhiteSpace(actionData.NavigationOptions.SelectedSectionName)) return;

            var readToRecordOptions = { ReadToRecord: true, ReadToRecordOptions: actionData.NavigationOptions, TargetId: actionData.NavigationOptions.SelectedSectionName + "_RDP"};
            controls.Shared.RelatedDataPortlet.SetReadToRecordState(undefined, readToRecordOptions);
        }

        function GetFormControl(descendentSelector) {
            if (descendentSelector) {
                return $('[data-t1-control-type*=Form] ' + descendentSelector);
            }

            return $('[data-t1-control-type*=Form]');
        }

        // Control: Server Action Link
        function ServerActionLinkExecuteRequestCallback(result, controlData) {
            if (result.RedirectToExternalUrl && result.SyncData && result.RedirectToExternalUrl === result.SyncData.Url) {
                if (controls.SyncLink.PerformRedirectFromSyncData(result.SyncData)) {
                    return true;
                }

            } else if (result.RedirectToFunction || (result.SyncData && result.SyncData.FunctionName)) {
                // redirect to the requested function
                var formControl = GetFormControl();
                var dataToSync = GetParameterValues(formControl);
                // translate the array to SyncFields object: <property:value>
                var syncObject = {};
                $(dataToSync).each(function (idx, elem) {
                    syncObject[elem.SyncKey] = elem.Value;
                });

                if (result.SyncData && result.SyncData.FunctionName) {
                    result.SyncData.SyncFields = result.SyncData.SyncFields ? $.extend(syncObject, result.SyncData.SyncFields) : syncObject;
                    if (controls.SyncLink.PerformRedirectFromSyncData(result.SyncData)) {
                        return true;
                    }

                } else {
                    SetAssumeStateFor(result.RedirectToFunction, {
                        SyncFields: syncObject
                    });

                    T1.C2.Shell.Navigate(result.RedirectToFunctionUrl);
                    return true;
                }
            }

            if (result.RefreshDataView) {
                RefreshDataView();
            }
            else if (controlData && controlData.CustomData && shell.IsFunction(controlData.CustomData.SuccessCallback)) {
                controlData.CustomData.SuccessCallback();
            }

            if (result.RefreshDetailsPanel) {
                var detailsPanelControl = $('#DETAILS__');
                controls.Shared.DetailsPanel.LoadSection(detailsPanelControl);
            }
        }

        function RefreshDataView() {
            var rdpControl = RelatedDataPortletElement();
            controls.RelatedDataPortlet.RunNewQuery(rdpControl);
        }

        return new T1_C2_Shell_Controls_Shared_EnquiryForm_Public();
    }
}());

/// <reference path="~/Content/Scripts/DevIntellisense.js"/>
(function (undefined) {
    var t1 = window.T1 = window.T1 || {},
        c2 = t1.C2 = t1.C2 || {},
        utilities = c2.Utilities = c2.Utilities || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        form = controls.EnquiryForm = controls.EnquiryForm || new enquiryForm();

    shell.ControlInitialiser.AddControl("EnquiryForm", form.Initialise);
    function enquiryForm() {
        controls.RecordNavigator.Clear();

        var EnquiryForm_SourceKeyFields = [];// from server, to server
        // key fields set in the assume state by the source page - i.e. used in selection mode when
        // the enquiry page is opened from the maintenance page and the maintenance page needs to pass the keys of the selected item

        var serverAction = "ItemAction";
        var ViewType = "";
        var defaultFormSettingsName = 'DEFAULT';
        var naturalLanguageSearchControlSelector = ".naturalLanguageSearch";

        var ActionType = {
            ShowFunction: 'ShowFunction',
            PowerTag: 'PowerTag',
            PerformRowAction: 'PerformRowAction',
            RowClientAction: 'RowClientAction',
            ServerAction: 'ServerAction',
            ClientAction: 'ClientAction',
            ShowUrl: 'ShowUrl'
        };

        this.SetParameterValues = SetParameterValues;
        this.GetParameterValues = GetParameterValues;
        this.GetSourceKeyFieldsValues = GetSourceKeyFieldsValues;
        this.SetViewType = SetViewType;
        this.Initialise = Initialise;
        this.SetAssumeStateFor = SetAssumeStateFor;
        this.SetFormTitle = SetFormTitle;
        this.SaveResumeState = SaveResumeState;
        this.UpdateEnquiryForm = UpdateEnquiryForm;
        this.GetFunctionInformation = GetFunctionInformation;
        this.RefreshDataView = RefreshDataView;
        /*****************************************************************************/
        // each form supporting the saved views should implement this APIs
        this.GetFormState = GetFormState;
        this.GetFormTitle = GetFormTitle;
        this.SetFormView = SetFormView;
        this.UpdateFormActions = UpdateFormActions;

        /*
        API used by ViewSelector control.
        Each form has its own form state format - however, the associated controller implements the AddView method which 'knows' how to handle the state.
        */
        function GetFormState() {
            var rdpControl = RelatedDataPortletElement();
            var rdpState = controls.RelatedDataPortlet.GetState(rdpControl);
            var formState = {
                FormKeys: GetParameterValues(),
                RdpState: {
                    SearchValue: rdpState.SearchValue,
                    ActiveView: rdpState.ActiveView,
                    SelectedFilters: rdpState.SelectedFilters,
                    DisplayFields: rdpState.DisplayFields,
                    SortDirection: rdpState.SortDirection,
                    SortColumnId: rdpState.SortColumnId,
                    GroupFields: rdpState.GroupFields,
                    MultiSortFields: rdpState.MultiSortFields,
                    DetailsPanelOpened: rdpState.DetailsPanelOpened,
                    DataViewToRightPanelRatio: rdpState.DataViewToRightPanelRatio
                }
            };
            return formState;
        }

        function GetFormTitle() {
            var control = $('.enquiryForm');
            return control.data('t1-control').Label;
        }

        // Returns the current enquiry parameters
        function GetParameterValues(returnCopy) {
            var control = GetFormControl();
            return controls.Shared.EnquiryForm.GetParameterValues(control, returnCopy);
        }

        // sets the parameter values regardless of the state persistent attribute
        // - if the parameter does not exist in the EnquiryForm_Parameters it will add it to the list
        // - parameterValues items may have the FieldName and/or the SyncKey values - check both of them if they match the enquiry form parameters
        function SetParameterValues(parameterValues, options) {
            var control = GetFormControl();
            controls.Shared.EnquiryForm.SetParameterValues(control, parameterValues, options);
        }

        function GetSourceKeyFieldsValues() {
            return EnquiryForm_SourceKeyFields;
        }

        function SetViewType(newVal) {
            ViewType = newVal;
        }

        function ParametersDiffer(p1, p2) {
            if (p1.length != p2.length) {
                return true;
            }
            var p1dict = {};
            var p2dict = {};
            $(p1).each(function (ii, param) {
                p1dict[param.FieldName] = param;
            });
            $(p2).each(function (ii, param) {
                p2dict[param.FieldName] = param;
            });
            var differenceFound = false;
            $(p1dict).each(function (fieldName, param) {
                if (!p2dict[fieldName] || !p2dict[fieldName].Value === param.Value) {
                    differenceFound = true;
                    return false;
                }
            });
            return differenceFound;
        }

        function GetFormControl(descendentSelector) {
            if (descendentSelector) {
                return $('.enquiryForm ' + descendentSelector);
            }

            return $('.enquiryForm');
        }

        // Function Information Popup Section
        function GetFunctionInformation(){
            var contextualKeysData = controls.ContextualKeys.GetFunctionInformation ? controls.ContextualKeys.GetFunctionInformation() : [];

            // If ContextualKeys returns nothing, get data from the formControl
            if (contextualKeysData === undefined || contextualKeysData && !contextualKeysData.length) {
                contextualKeysData = [];
                var enquiryFormParameters = controls.EnquiryForm.GetParameterValues();
                jQuery.each(enquiryFormParameters, function(i, param) {
                    var description = param.FieldName.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2'); //Separates field name with a space to produce a description since none is available
                    contextualKeysData.push({
                        Description: description,
                        FieldName: param.FieldName,
                        SyncKey: param.SyncKey,
                        Value: param.Value
                    });
                });
            }

            return {
                Keys: contextualKeysData,
                Sections: []
            }
        }

        function RefreshDataView() {
            var rdpControl = RelatedDataPortletElement();
            controls.RelatedDataPortlet.RunNewQuery(rdpControl);
        }

        function GetDefaultReadConfig(parameterValues) {
            return {
                updatePortlet: undefined,
                Parameters: parameterValues,
                dbPageNumber: 1
            };
        }

        // Saves the state which will be resumed when the document is reloaded.
        // Expects a request object structured as follows:
        // {
        //     [SearchValue: <string>],
        //     [ParameterValues: <array>],
        //     [ReadConfig: <object>]
        // }
        // All properties are optional.
        function SaveResumeState(request) {
            var control = GetFormControl();
            var rdpControl = RelatedDataPortletElement();
            controls.Shared.EnquiryForm.SaveResumeState(control, rdpControl, request);
        }

        // The Enquiry will consist of: Search, Parameters, Filter, Toolbar, ReadOnlyGrid.
        function ReadFormSettings(formSettingsName, options) {
            var parameterValues = Object.IsNull(options.Parameters) ? GetParameterValues() : options.Parameters;
            var req = {
                LoadFromWorkplace: options.LoadFromWorkplace,
                ViewId: options.ViewId,
                RecentId: options.RecentId,
                FormSettingsName: formSettingsName,
                Parameters: parameterValues,
                StateFieldMap: [],
                ColumnSize: options.GridOptions.ColumnSize
            };
            // if there is a form state - from resume state, set the request filters
            if (options.FormState && options.FormState.RdpState)
                req.SelectedFilters = options.FormState.RdpState.SelectedFilters;
            // Note: the empty grid is to be displayed only if there isn't a resumed/assumed state
            // otherwise there is no point in displaying the empty grid only to be re-painted when reading grid data

            T1.C2.Shell.Ajax({
                type: 'POST',
                url: T1.Environment.Paths.Controller + 'ReadFormSettings',
                data: JSON.stringify(req),
                ShowLoader: true,
                contentType: 'application/json',
                dataType: 'json',
                initialiseControls: true,
                success: function (readFormSettingsResponse) {
                    // return immediately so the spinner is closed immediately
                    setTimeout(function () {
                        var retVal = ReadFormSettingsCallback(readFormSettingsResponse, options);
                        // if there is a callback, call it here once all the forms settings (filters, columns, etc) have been applied to RDP
                        if(retVal && options.callback)
                            options.callback();
                    }, 0);
                }
            }, $('#MainContainer'));
        };

        // callback function called once the ReadFormSettings returns
        function ReadFormSettingsCallback(readFormSettingsResponse, options) {
            var control = GetFormControl();
            var settings = controls.Shared.EnquiryForm.ReadFormSettingsCallback(control, readFormSettingsResponse, options);
            if (!readFormSettingsResponse.Success)
                return false;
            if (readFormSettingsResponse.Label) {
                var titleElement = $('header .bannerTitle h1');
                if (titleElement.length) {
                    titleElement.text(readFormSettingsResponse.Label);
                }
            }

            // update the RDP menu actions and actions ex asynchronously (if necessary)
            UpdateRdpMenu(options);
            UpdateRdpMenuEx(options);

            // Parameter fields are set to ReadOnly by default
            SetParameterFieldsReadOnly(true);
            // add the followRDPHdrState class to the contextual keys - if there is no title and no form actions
            UpdateContextualPanelFlags({
                FollowRDPHdrState: $('.enquiryForm').hasClass('noFormTitle') && $('.enquiryForm').hasClass('noFormActions')
            });
            var parameterValues = GetParameterValues();
            var rdpControl = RelatedDataPortletElement();
            // update RDP view options
            controls.Shared.RelatedDataPortlet.UpdateRdpViewOptions(rdpControl, readFormSettingsResponse.RdpViewOptions);

            if (readFormSettingsResponse.RdpSummaryPanelHtml) controls.Shared.RelatedDataPortlet.UpdateSummaryPanel(rdpControl, readFormSettingsResponse.RdpSummaryPanelHtml);

            // initialize the controls and views only if the mandatory parameters contain valid data
            if (controls.ContextualKeys.OpenIfEmptyMandatoryFields(true)) {
                controls.RelatedDataPortlet.Enable(rdpControl, false);
            } else {
                controls.RelatedDataPortlet.Enable(rdpControl, true);
                switch (ViewType.toUpperCase()) {
                case "GRID":
                    options.ReadDataOnCallback = controls.RelatedDataPortlet.InitDefault(rdpControl,
                        {
                            ResetGridColumns: readFormSettingsResponse.ResetGridColumns,
                            Columns: readFormSettingsResponse.Columns,
                            UpdateGridColumns: true,
                            Parameters: parameterValues,
                            EnableFilters: readFormSettingsResponse.EnableFilters,
                            GridColumnChooserHtml: readFormSettingsResponse.GridColumnChooserHtml,
                            State: settings.RdpState,
                            UseDefaultCriteriaText: options.UseDefaultCriteriaText,
                            ReadData: options.ReadDataOnCallback,
                            ClearNotifications: options.ClearNotifications
                        });
                    controls.RelatedDataPortlet.ShowInitial(rdpControl, options.ReadDataOnCallback);
                    break;
                case "HIERARCHY":
                    // initialise the hierarchical grid
                        // the hierarchical grid should not be aware of any details panels object
                    options.ReadDataOnCallback = controls.RelatedDataPortlet.InitDefault(rdpControl,
                        {
                            Columns: readFormSettingsResponse.Columns,
                            Parameters: parameterValues,
                            EnableFilters: readFormSettingsResponse.EnableFilters,
                            State: settings.RdpState,
                            UseDefaultCriteriaText: options.UseDefaultCriteriaText,
                            ReadData: options.ReadDataOnCallback,
                            ClearNotifications: options.ClearNotifications
                        });
                    break;
                }
                if (!options.ReadDataOnCallback) {
                    controls.RelatedDataPortlet.EnableNoSearchViewPanel(rdpControl, true);
                }
            }

            return true;
        }

        function UpdateFormActions(control, jsonData) {
            if (jsonData.UpdateFormActionsMenu) {
                var actionsMenuControl = $('#EnquiryActionsMenu');
                var mainActionBar = actionsMenuControl.closest('.mainActionBar');
                controls.ActionsMenu.UpdateContents(actionsMenuControl, jsonData.FormActionsMenuHtml);
                // re-assigns the actionsMenuControl - the old control has been removed from DOM
                actionsMenuControl = $('#EnquiryActionsMenu');
                BindFormActions(control);

                if (actionsMenuControl.hasClass('noActions')) {
                    // remove/hide the form actions menu
                    mainActionBar.hide();
                    control.removeClass('hasFormActions');
                } else {
                    mainActionBar.show();
                    control.addClass('hasFormActions');
                }
                var rdpControl = RelatedDataPortletElement();
                controls.RelatedDataPortlet.Resize(rdpControl);
            }
        }

        /*
        Performs an AJAX call and gives the product developer the chance to update the RDP menu (basically is used to update the counters if the SQL to getting those
        counters is expensive and cannot be executed in Configure when the menu is built)
        */
        function UpdateRdpMenu(options) {
            var parameterValues = GetParameterValues();
            var req = {
                LoadFromWorkplace: options.LoadFromWorkplace,
                Parameters: parameterValues
            };
            T1.C2.Shell.Ajax({
                type: 'POST',
                url: T1.Environment.Paths.Controller + 'UpdateRdpActionsMenu',
                data: JSON.stringify(req),
                ShowLoader: false,
                blocking: false,
                cache:false, // make sure Safari on Mac does not caches the POST request
                contentType: 'application/json',
                dataType: 'json',
                initialiseControls: true,
                success: UpdateRdpMenuCallback
            }, $('#MainContainer'));
        }

        function UpdateRdpMenuCallback(jsonData) {
            if (jsonData.UpdateMenu) {
                var rdpControl = RelatedDataPortletElement();
                controls.RelatedDataPortlet.UpdateMenu(rdpControl, jsonData.MenuHtml);
            }
        }

        /* Similar to UpdateRdpMenu, but for the actions ex */
        function UpdateRdpMenuEx(options) {
            var parameterValues = GetParameterValues();
            var req = {
                LoadFromWorkplace: options.LoadFromWorkplace,
                Parameters: parameterValues,
                UpdateFileControlActions: options.UpdateFileControlActions
            };
            T1.C2.Shell.Ajax({
                type: 'POST',
                url: T1.Environment.Paths.Controller + 'UpdateRdpActionsExMenu',
                data: JSON.stringify(req),
                ShowLoader: false,
                blocking: false,
                cache: false, // make sure Safari on Mac does not caches the POST request
                contentType: 'application/json',
                dataType: 'json',
                initialiseControls: true,
                success: UpdateRdpMenuExCallback
            }, $('#MainContainer'));
        }

        function UpdateRdpMenuExCallback(jsonData) {
            if (jsonData.UpdateMenu || jsonData.UpdateRdpActionsExMenu) {
                var rdpControl = RelatedDataPortletElement();
                controls.RelatedDataPortlet.UpdateMenuEx(rdpControl, jsonData.MenuHtml || jsonData.RdpActionsExMenuHtml);
            }
        }

        /* Sets the current view object */
        function SetFormView(control, viewObject) {
            // set the selected/candidate view in the view selector
            var formData = control.data('t1-control');
            if (formData.HasStarredViewsSupport && viewObject) {
                var rdpControl = RelatedDataPortletElement();
                controls.Shared.RelatedDataPortlet.SetSelectedView(rdpControl, viewObject);
            }
        }

        function SetFormTitle(formTitle) {
            var formTitleStatusChanged = false;
            var formTitleContainer = $('#FormTitleContainer');
            var formTitleVisible = formTitleContainer.is(':visible');
            if (formTitle && (formTitle.FormTitle || formTitle.FormTitleHtml)) {
                var formTitleData = formTitle.FormTitle;
                var formTitleHtml = formTitle.FormTitleHtml;
                formTitleStatusChanged = !formTitleVisible;
                $('.enquiryForm').removeClass('noFormTitle').addClass('hasFormTitle');
                formTitleContainer.show();
                var formTitleControl = formTitleContainer.find('.formTitleControl');
                if (formTitleHtml) {
                    formTitleControl.replaceWith(formTitleHtml);
                    shell.ControlInitialiser.InitialiseControls(formTitleContainer);
                } else if (formTitleData){
                    controls.FormTitleControl.Update(formTitleControl, formTitleData);
                }
            } else {
                formTitleStatusChanged = formTitleVisible;
                formTitleContainer.hide();
                $('.enquiryForm').removeClass('hasFormTitle').addClass('noFormTitle');
            }
            // add the followRDPHdrState class to the contextual keys - if there is no title and no form actions
            UpdateContextualPanelFlags({
                FollowRDPHdrState: $('.enquiryForm').hasClass('noFormTitle') && $('.enquiryForm').hasClass('noFormActions')
            });
            // resize the RDP
            if (formTitleStatusChanged) {
                var rdpControl = RelatedDataPortletElement();
                controls.RelatedDataPortlet.Resize(rdpControl);
            }
        }

        // Sets/removes the contextual panel followRDPHdrState class depending whether the title/form actions are displayed/hidden
        function UpdateContextualPanelFlags(options) {
            if (options.FollowRDPHdrState) {
                $('#ContextualKeysParent').addClass('followRDPHdrState');
                // if the RDP header is closed, hide it as well
                var rdpControl = RelatedDataPortletElement();
                if (!rdpControl.hasClass('headerBarVisible')) {
                    $('#ContextualKeysParent').hide();
                }
            } else {
                $('#ContextualKeysParent').removeClass('followRDPHdrState');
            }
        }

        function RelatedReadOnlyGridControl() {
            var gridControl = $('[data-t1-control-type*=Form] [data-t1-control-type="ReadOnlyGrid"]').first();
            if (gridControl.length == 0) {
                gridControl = $('#EnquiryRelatedDataPortlet .views').children('[data-t1-control-type="SuperGrid"]');
            }
            return gridControl ;
        }

        function NaturalLanguageSearchControl() {
            return $(naturalLanguageSearchControlSelector);
        }

        function RelatedDataPortletElement() {
            return controls.Shared.EnquiryForm.RelatedDataPortletElement();
        }


        function GetSearchValue() {
            return controls.Shared.EnquiryForm.GetSearchValue();
        }

        function SetParameterFieldsReadOnly(isReadonly) {
            $('#Parameters').children().each(function (index, element) {
                $(element).find('.editorField').children().each(function (index, element) {
                    if (isReadonly) {
                        T1.C2.Shell.Disable($(element));
                    } else {
                        T1.C2.Shell.Enable($(element));
                    }
                });
            });
        }

        function SetFormControlsReadOnly(formControls, isReadonly) {
            $(formControls).each(function (index, element) {
                if (isReadonly) {
                    T1.C2.Shell.Disable(element);
                } else {
                    T1.C2.Shell.Enable(element);
                }
            });
        }

        function SetFormAndNonSelectedTabsReadOnly(currentTabFieldControl, isReadOnly) {
            var tabbedControl = $(currentTabFieldControl).closest('div[data-t1-control]');

            // Define a set of form controls that to be set to ReadOnly
            var formControls = [];
            formControls.push($('#SearchButton'));
            var NLSActionsOkButton = $('#NLSActionsOkButton');
            if (NLSActionsOkButton.length) {
                formControls.push(NLSActionsOkButton);
            }
            var SearchValue_BuilderButtonDiv = $('#SearchValue_BuilderButtonDiv');
            if (SearchValue_BuilderButtonDiv.length) {
                formControls.push(SearchValue_BuilderButtonDiv);
            }

            SetFormControlsReadOnly(formControls, isReadOnly);
            controls.NaturalLanguageSearch.SetFormControlsReadonly(NaturalLanguageSearchControl(), isReadOnly);
            controls.Tabbed.SetNonSelectedTabsReadOnly(tabbedControl, isReadOnly);

            // Set Parameter fields to ReadOnly unless the "Edit" button is clicked
            if (controls.Tabbed.GetCurrentSelectedTabName() != "Parameters") {
                SetParameterFieldsReadOnly(true);
            }
        }

        function AddValidationErrorMessage(fieldControl, message) {
            var validationMessage = fieldControl.children('.validationMessage');

            if (!validationMessage.length) {
                validationMessage = $(document.createElement('span')).addClass('validationMessage').text(message);
                fieldControl.append(validationMessage).addClass('validationError');
            } else {
                validationMessage.text(message);
            }
        }

        function ClearValidationErrors(fieldControl) {
            fieldControl.removeClass('validationError').find('.validationMessage').remove();

            var parentControl = $(fieldControl).closest('.tabControl');

            // Enable other tabs and Search button if All the dates are valid and the current tab is not Parameters
            if (parentControl.find('.validationError').length <= 0 && controls.Tabbed.GetCurrentSelectedTabName() != "Parameters") {
                SetFormAndNonSelectedTabsReadOnly($(fieldControl).parent(), false);
            }
        }

        // Updates the enquiry form - this function is called when the parameters in the contextual panel have been changed
        function UpdateEnquiryForm(parameterValues, options) {
            options = options || {};
            var control = GetFormControl();
            var formData = control.data('t1-control');
            ReadFormSettings(defaultFormSettingsName,
                            {
                                ReadDataOnCallback: true,
                                GridOptions: {
                                    ColumnSize: formData.GridOptions.ColumnSize
                                },
                                Parameters: parameterValues,
                                UseDefaultCriteriaText: false,
                                callback: function () {
                                    MarkAsRecent();
                                },
                                ClearNotifications: options.ClearNotifications
                            }
                        );
        }

        //Instructs the view to save the current view as recent
        function MarkAsRecent() {
            // get the RDP state
            var rdpControl = RelatedDataPortletElement();
            var rdpState = controls.RelatedDataPortlet.GetState(rdpControl);
            var req = {
                Parameters: GetParameterValues(),
                RdpState: {
                    SearchValue: rdpState.SearchValue,
                    ActiveView: rdpState.ActiveView,
                    SelectedFilters: rdpState.SelectedFilters,
                    DisplayFields: rdpState.DisplayFields,
                    SortDirection: rdpState.SortDirection,
                    SortColumnId: rdpState.SortColumnId,
                    GroupFields: rdpState.GroupFields
                }
            };
            T1.C2.Shell.Ajax({
                type: 'POST',
                url: T1.Environment.Paths.Controller + 'MarkViewAsRecent',
                data: JSON.stringify(req),
                ShowLoader: false,
                contentType: 'application/json',
                dataType: 'json',
                initialiseControls: true,
                success: MarkAsRecent_Callback
            }, $('#MainContainer'));
        }

        function MarkAsRecent_Callback(viewData) {
            return;
            controls.Notification.AddNotification({
                Message: 'Marked as recent'
            });
        }

        function RunNewQuery(newSearch) {
            var parameterValues,
                config;

            // Check validation error before doing any server query
            if ($('.validationError').length > 0) return;

            controls.Notification.Clear();

            parameterValues = GetParameterValues();
            config = GetDefaultReadConfig(parameterValues);
            config.successCallback = function (callbackData) {
                // As results have been returned without error, the Contextual Keys panel can now be hidden
                controls.ContextualKeys.HideContextualKeys();
            };

            controls.EnquiryFilters.ClearQueue();
            var rdp = RelatedDataPortletElement();
            config.NewSearch = newSearch;
            controls.RelatedDataPortlet.RunNewQuery(rdp, config);
        };

        // sets the assume state for the given function
        function SetAssumeStateFor(functionName, syncData, selectionData, pageKey) {
            controls.Shared.EnquiryForm.SetAssumeStateFor(functionName, syncData, selectionData, pageKey);
        }

        function SetRowActionAssumeStateFor(syncKeys, actionData) {
            controls.Shared.EnquiryForm.SetRowActionAssumeStateFor(syncKeys, actionData);
        }

        /*
            Performs the action defined by the form actions menus or RDP menus.
        */
        function PerformFormAction(actionData, customPopupFormData, callbackOptions) {
            callbackOptions = shell.EnsureValidObject(callbackOptions);
            switch (actionData.ActionType) {
                case ActionType.ShowUrl:
                    T1.C2.Shell.Navigate(actionData.ActionName,
                        {
                            AddToBrowserHistory: actionData.AddToBrowserHistory,
                            OpenInNewTab: actionData.OpenInNewTab,
                            IsExternalUrl: actionData.IsExternalUrl
                        });
                    break;
                // get the function to navigate to
                case ActionType.ShowFunction:
                    if (String.IsNullOrWhiteSpace(actionData.PageKey)){
                        actionData.PageKey = new Date().format('yyyyMMddHHmmss');
                    }

                    var syncData = { SyncFields: {} };
                    if (!utilities.IsNull(customPopupFormData)){
                        var syncObject = {};
                        $(customPopupFormData.Fields).each(function (idx, elem) {
                            syncObject[!String.IsNullOrWhiteSpace(elem.FieldName) ? elem.FieldName : elem.SyncKey] = elem.Value;
                        });
                        syncData = { SyncFields: syncObject };
                    }
                    syncData = $.extend(true, syncData, actionData.SyncData);
                    var functionName = !String.IsNullOrWhiteSpace(actionData.FunctionName) ? actionData.FunctionName : syncData.FunctionName;
                    SetAssumeStateFor(functionName, syncData, undefined, actionData.PageKey);
                    var url = '';
                    var suite = T1.Environment.Context.Suite.Name;
                    if (actionData.SuiteName && actionData.SuiteName.length > 0) {
                        suite = actionData.SuiteName;
                    }
                    if (actionData.ControllerName == undefined || actionData.ControllerName == '') {
                        if(!String.IsNullOrWhiteSpace(syncData.Url)){
                            url = syncData.Url;
                        }else{
                            url = T1.Environment.Paths.RootEnvironmentUrl + 'Workplace/' + T1.Environment.Paths.RootController + '/RedirectToFunction?f=' + encodeURIComponent(functionName) + '&h=' + actionData.Hash + '&t=' + actionData.ExpiryTime + '&suite=' + suite;
                        }
                    } else {
                        url = T1.Environment.Paths.RootEnvironmentAreaUrl + actionData.ControllerName + (actionData.ControllerActionName == '' ? '' : '/' + actionData.ControllerActionName) + '?f=' + encodeURIComponent(actionData.FunctionName) + '&h=' + actionData.Hash + '&t=' + actionData.ExpiryTime + '&suite=' + suite;
                    }
                    url += '&pagekey=' + actionData.PageKey;
                    if (actionData.Parameters) {
                        for (var param in actionData.Parameters) {
                            url = url + '&' + param + '=' + encodeURIComponent(actionData.Parameters[param]);
                        };
                    }
                    T1.C2.Shell.Navigate(url, { OpenInNewTab: actionData.OpenInNewTab, AddToBrowserHistory: (actionData.SyncData || {}).AddToBrowserHistory });
                    break;
                case ActionType.ServerAction:
                    var requestParameters = GetParameterValues(true);
                    // if there are additional parameters, add them to the request
                    if (actionData.Parameters){
                        for(var paramName in actionData.Parameters){
                            requestParameters.push(
                                {
                                    FieldName: paramName,
                                    Value: actionData.Parameters[paramName]
                                })
                        }
                    }

                    var requestData = {
                        ActionName: actionData.ActionName,
                        FormData : customPopupFormData,
                        Parameters: requestParameters,
                        SearchValue: GetSearchValue(),
                        FormState: GetFormState()
                    };

                    T1.C2.Shell.Ajax({
                        type: 'POST',
                        url: T1.Environment.Paths.Controller + "FormAction",
                        data: JSON.stringify(requestData),
                        contentType: 'application/json',
                        dataType: 'json',
                        ShowLoader: true,
                        autoRetryTimeoutError: false,
                        success: function (jsonData) {
                            if (!jsonData.Success) {
                                if (shell.IsFunction(callbackOptions.FailureCallback))
                                    callbackOptions.FailureCallback(callbackOptions.Control, jsonData);
                                return false;
                            }

                            if(jsonData.RedirectToExternalUrl){
                                T1.C2.Shell.Navigate(jsonData.RedirectToExternalUrl, { AddToBrowserHistory: (jsonData.SyncData || {}).AddToBrowserHistory });
                            }else if (jsonData.RedirectToFunction) {
                                // redirect to the requested function
                                var dataToSync = GetParameterValues();
                                // translate the array to SyncFields object: <property:value>
                                var syncObject = {};
                                $(dataToSync).each(function (idx, elem) {
                                    syncObject[elem.SyncKey] = elem.Value;
                                });
                                if (jsonData.Parameters.length > 0) {
                                    $(jsonData.Parameters).each(function (idx, elem) {
                                        syncObject[elem.SyncKey] = elem.Value;
                                    });
                                }
                                var syncData = { SyncFields: syncObject };
                                if (jsonData.SyncData) {
                                    syncData = $.extend(true, syncData, jsonData.SyncData);
                                }
                                var pageKey = new Date().format('yyyyMMddHHmmss');
                                SetAssumeStateFor(jsonData.RedirectToFunction, syncData, undefined, pageKey);

                                var url = (jsonData.RedirectToFunctionUrl.indexOf('?') > 0 ? jsonData.RedirectToFunctionUrl + '&' : jsonData.RedirectToFunctionUrl + '?')  + 'pagekey=' + pageKey;

                                if (jsonData.SyncData && jsonData.SyncData.UrlParameters) {
                                    for (var param in jsonData.SyncData.UrlParameters) {
                                        url = url + '&' + param + '=' + encodeURIComponent(jsonData.SyncData.UrlParameters[param]);
                                    };
                                }

                                T1.C2.Shell.Navigate(url, { AddToBrowserHistory: syncData.AddToBrowserHistory });
                            }else if (!Object.IsNull(jsonData.SyncData)) {
                                // redirect to the requested URL
                                controls.SyncLink.PerformRedirectFromSyncData(jsonData.SyncData);
                            }
                            else if (jsonData.RefreshDataView) {
                                SetFormTitle(jsonData);
                                var rdpControl = RelatedDataPortletElement();
                                controls.RelatedDataPortlet.RunNewQuery(rdpControl);
                            }
                            var control = $('.enquiryForm');
                            UpdateFormActions(control, jsonData);
                            UpdateRdpMenuExCallback(jsonData);
                            if(shell.IsFunction(callbackOptions.SuccessCallback)){
                                callbackOptions.SuccessCallback(callbackOptions.Control, jsonData);
                            }

                            return true;
                        }
                    });
                    break;
                case ActionType.ClientAction:
                    // raise the Event.CustomRowAction event
                    var requestData = {
                        ActionName: actionData.ActionName,
                        Parameters : GetParameterValues(),
                        ActionParameters: actionData.Parameters
                    };

                    var customEvent = $.Event('Event.CustomFormAction');
                    $('body').trigger(customEvent, requestData);
                    break;
            }
        }

        /*
            Perform the item action regardless it's about a read-only grid, thumbnail, hierarchical list etc
            The event object has:
            - RowAction - object describing the action to be performed (i.e. type, function etc)
            - SyncKeys - array of sync keys for the actioned item
            - Callback - function to be called on server action
            - Query - object describing the query to be performed (not used here) - legacy property
        */
        function PerformRowAction(eventData) {
            var rdpTab = eventData.RdpControl ? eventData.RdpControl.closest('.mainTabControl') : null;
            if (rdpTab && rdpTab.length > 0) {
                controls.LinkedTab.PerformRelatedDataPortletRowAction(rdpTab.closest('.tabbedControl'), eventData);
            } else {
                controls.Shared.EnquiryForm.PerformItemAction(eventData);
            }
        }

        // Control: Sync Link
        function SyncLinkPreProcessing(controlData) {

            var preProcessingObject = {};

            if (controlData.PassKeyValues && !controlData.Parameters) controlData.Parameters = {};

            if (controlData.PassKeyValues) {
                var parameters = GetParameterValues();

                if (parameters && parameters.length > 0) {
                    for (var i = 0, len = parameters.length; i < len; ++i) {
                        controlData.Parameters[parameters[i].FieldName] = parameters[i].Value;
                    }
                }
            }

            if (controlData.LoadInSelectionMode) preProcessingObject.FormLabel = $('.enquiryForm').data('t1-control').Label;

            return preProcessingObject;
        }

        // Control: Server Action Link
        function ServerActionLinkExecuteRequest(request, callback, controllerAction) {
            request.Parameters = GetParameterValues();

            T1.C2.Shell.Ajax({
                type: 'POST',
                url: T1.Environment.Paths.Controller + controllerAction,
                data: JSON.stringify(request),
                contentType: 'application/json',
                dataType: 'json',
                ShowLoader: true,
                success: callback,
                autoRetryTimeoutError: false
            });
        }

        // Control: Address Lookup
        function AddressLookupFieldChanged(addressLookup, options) {
            if (Object.IsNull(options)) options = {};

            var parent = addressLookup.closest('#MainContainer, .popupContainer');

            if (parent.hasClass('popupContainer')) {
                options.Event = { IsManuallyTriggered: true };
                options.PopupContainer = parent;
                controls.Popup.PopupFieldChanged(addressLookup, options);
            }
        }

        // Control: Form
        function FormHasDataChanged() {
            var $bpaPromptTabControl = $('.bpaPromptTab.mainTabControl.tabControl');
            if ($bpaPromptTabControl.length === 1) {
                return controls.LinkedTab.HasDataChanged($bpaPromptTabControl);
            }

            return false;
        }

        function BindFormActions(control) {
            var formMenuControl = control.find('#EnquiryActionsMenu');
            if (shell.ElementExists(formMenuControl)) {
                controls.ActionsMenu.MenuClickedCallback(formMenuControl, function (actionData, customPopupFormData, callbackOptions) {
                    var newCallbackOptions = $.extend({}, callbackOptions);
                    newCallbackOptions.Control = formMenuControl;
                    PerformFormAction(actionData, customPopupFormData, callbackOptions);
                });
            };
        }

        function ResizeFitScreenHeight() {
            var container = $('#MainContainer > .contentContainer');
            container.height(Math.floor(shell.GetWindowHeight() - $('#MainContainer > footer').outerHeight() - container.offset().top - parseInt(container.css('border-bottom-width')) - parseInt(container.css('border-top-width'))));
        }

        function Initialise(control) {
            controls.Shared.EnquiryForm.Initialise(control);

            RegisterGlobalEvents();
            ResizeFitScreenHeight();
            var formData = control.data('t1-control');

            controls.AddressLookup.RegisterFieldChangedFunction(AddressLookupFieldChanged);
            controls.ServerActionLink.SetExecuteRequestFunction(ServerActionLinkExecuteRequest);
            controls.SyncLink.RegisterSyncLinkPreProcessingFunction(SyncLinkPreProcessing);
            controls.Form.RegisterHasDataChangedFunction(FormHasDataChanged);

            BindFormActions(control);

            formData.Form = controls.EnquiryForm;
            var formState = {};
            form.SetViewType(formData.ViewType);
            if (formData.View) {
                // if there is a ViewId (default view)
                formState.ViewId = formData.View.ViewId;
            }
            // regardless of default form view, check whether we need to load a view from the assume state (this should override any default form view)
            var assumeState = controls.Shared.EnquiryForm.GetAssumeState(true);
            var resumeState = controls.Shared.EnquiryForm.GetResumeState(control);

            if (formData.EntitiesSelection){
                assumeState = resumeState = {HasState:false};
            }
            if (assumeState.HasState) {
                EnquiryForm_SourceKeyFields = assumeState.SourceKeyFields;
            }
            if (formData.SelectionMode && (assumeState.HasState || resumeState.SourceWindowOptions)) {
                // replace the form heading
                var title = (assumeState.SourceWindowOptions || resumeState.SourceWindowOptions || {}).Title || '';
                controls.Form.UpdateHeaderContext(title, function () {
                    controls.Shared.EnquiryForm.GoBackToSourcePage();
                });
            }

            var loadState = controls.Shared.EnquiryForm.ConfigureFormState(control, formState, assumeState, resumeState);

            // instruct the RDP to notify the form when view changed (i.e. search criteria changed, order etc)
            var rdpObject = RelatedDataPortletElement();
            controls.RelatedDataPortlet.SetNotifyFormOnViewChange(rdpObject);

            if (!assumeState.OpenedFromWorkplace || assumeState.SearchValue != undefined || formState.ViewId != undefined || formState.RecentId != undefined) {
                // ignore the AutoOpenAdvancedSearch if not opened from workplace, if there is a search string in the assume state or if there is a default view/recent id
                controls.Shared.RelatedDataPortlet.ChangeSettings(rdpObject, {
                    AutoOpenAdvancedSearch: false
                });
            }
            var useDefaultCriteriaText = formState.UseDefaultCriteriaText;
            // if there is a search value specified in assume state AND there is no resume state, make sure to use the search value from assume state AND ignore the default search value from RDP
            if (assumeState.SearchValue != undefined && assumeState.SearchValue != '' && resumeState.HasState == false) {
                useDefaultCriteriaText = false;
                controls.RelatedDataPortlet.SetSearchValue(rdpObject, formData.Properties && formData.Properties.DisableSendingSearchValueToTargetFunction ? '' : assumeState.SearchValue);
            }

            var runSearchOnCallback = formData.AutoRetrieve == "Always" ||
                (formData.AutoRetrieve == "IfStateExists" && loadState);

            if (formState.FormState && formState.FormState.RdpState) {
                controls.RelatedDataPortlet.SetInitialDataViewAndDetailsPanelRatio(rdpObject, formState.FormState.RdpState);
            }
            ReadFormSettings(defaultFormSettingsName,
                {
                    LoadFromWorkplace: assumeState.OpenedFromWorkplace,
                    ReadDataOnCallback: runSearchOnCallback,
                    ViewId: formState.ViewId,
                    RecentId: formState.RecentId,
                    FormState: formState.FormState,
                    UseDefaultCriteriaText: useDefaultCriteriaText,
                    GridOptions: {
                        ColumnSize: formData.GridOptions.ColumnSize
                    }
                }
            );

            UpdateConfigureCustomNVLinkTitle(control);

            $(document.body).removeClass('screenLoading');
        };

        function ViewCriteriaChanged() {
            // notify the view selector that the criteria for the selected view has changed
            var viewSelectorControl = $('.viewSelectorControl');
            if (viewSelectorControl.length > 0) {
                controls.ViewSelector.SelectedViewCriteriaChanged(viewSelectorControl);
            }
        }

        //Saves the enquiry as a simple report
        function SaveEnquiryAsReportPopup() {
            var request = {};
            // display the simple report configuration popup (i.e. name, export type etc)
            var callback = function (result) {
                if (result.PanelHtml && result.PanelHtml.length > 0) {
                    controls.Popup.Show({
                        Type: 'Maintenance',
                        PopupTitle: result.PopupTitle,
                        PopupContent: result.PanelHtml,
                        ShowCloseButton: true,
                        OriginalRequest: request,
                        PopupData: result.PopupData,
                        OkFunction: function (popupPanel, popupData) {
                            // Use a Timeout so the popup is closed before the server action occurs.
                            SaveEnquiryAsReport(popupData);
                            return true;
                        }
                    });
                }
            };


            T1.C2.Shell.Ajax({
                type: 'POST',
                url: T1.Environment.Paths.Controller + "ShowSaveAsSimpleReportPopup",
                data: JSON.stringify(request),
                contentType: 'application/json',
                dataType: 'json',
                ShowLoader: true,
                success: callback
            });
        }

        function SaveEnquiryAsReport(reportData) {
            var rdpControl = RelatedDataPortletElement();
            var rdpState = controls.RelatedDataPortlet.GetState(rdpControl);
            var requestData = {
                ReportData: reportData.Fields,
                    Parameters: GetParameterValues(),
                RdpDefinition: rdpState
            };

            T1.C2.Shell.Ajax({
                type: 'POST',
                url: T1.Environment.Paths.Controller + "SaveAsSimpleReport",
                data: JSON.stringify(requestData),
                contentType: 'application/json',
                dataType: 'json',
                ShowLoader: true,
                success: function (jsonData) {
                    if (jsonData.Success) {
                        // refresh the RDP view to display the newly created report
                        if (jsonData.SyncData.OpenInNewWindow && !jsonData.SyncData.CurrentPageAction) {
                            controls.RelatedDataPortlet.RunNewQuery(rdpControl);
                        }

                        SetAssumeStateFor(jsonData.RedirectToFunction, jsonData.SyncData);
                        var url = jsonData.RedirectToFunctionUrl;
                        if (jsonData.SyncData && jsonData.SyncData.UrlParameters) {
                            for (var param in jsonData.SyncData.UrlParameters) {
                                url = url + '&' + param + '=' + encodeURIComponent(jsonData.SyncData.UrlParameters[param]);
                            };
                        }
                        T1.C2.Shell.Navigate(url, { OpenInNewTab: jsonData.SyncData.OpenInNewWindow, CurrentPageAction: jsonData.SyncData.CurrentPageAction});
                    }
                }
            });
        }

        function RegisterGlobalEvents() {
            $(document).on('change', '[data-t1-control-type=PickDate]', function (event) {
                // for iPad you can only have valid date - on iPad 2 it seems the date is returned in YYYY-MM-DD and when trying to parseExact with DD-MMM-YYYY it simply stops working
                if (t1.IsTablet)
                    return;
                var currentControl = $(this);
                var currentInput = currentControl.find('input');
                var currentValue = currentInput.val();

                if (!currentValue) {
                    ClearValidationErrors(currentControl);
                    return;
                }

                var reducedValue = currentValue.replace(/(\.|\/|\-)/g, '/');
                // if the user has entered any date part as zeros attempt no further parsing
                if (reducedValue.match("^0+$|^00\/|^0\/|\/00\/|\/0\/")) {
                    currentControl.addClass('validationError');
                    return;
                }

                var currentMask = currentInput.data('t1-output-mask');
                var parsedDate = Date.parseExact(currentValue, currentMask);

                // if the input value doesn't match the current mask, try to reduce the current mask
                if (!parsedDate) {
                    var reducedMask = currentMask.replace(/y+/, 'y')
                        .replace(/M+/, 'M')
                        .replace(/d+/, 'd')
                        .replace(/H+/, 'H')
                        .replace(/m+/, 'm')
                        .replace(/s+/, 's')
                        .replace(/(\.|\/|\-)/g, '/');

                    parsedDate = Date.parseExact(reducedValue, reducedMask);
                }

                if (!parsedDate) {
                    parsedDate = Date.parse(currentValue);
                }

                if (parsedDate) {
                    currentInput.val(parsedDate.toString(currentMask));
                    ClearValidationErrors(currentControl);

                } else {

                    // Disable other tabs and Search button if the date is not valid
                    SetFormAndNonSelectedTabsReadOnly($(currentControl).parent(), true);

                    var controlData = $('[data-t1-control-type*=Form]').data('t1-control');
                    var errorMessage = controlData.ErrorMessages.WrongType;
                    AddValidationErrorMessage(currentControl, errorMessage);
                }
            });

            // This request may come from the related data portlet when the active view changed
            $(document).on('Form.RefreshActiveView', '[data-t1-control-type*=Form]', function (event) {
                // Note: here we don't have the new search. It's just that the active view needs to be refreshed but the search has already been executed in the previous view
                RunNewQuery(false);
            });

            // return to the source page - if exists - usually called in the case of Apply-type button from summary selection control
            $(document).on('Form.GoBackToSourcePage', '[data-t1-control-type*=Form]', function (event) {
                controls.Shared.EnquiryForm.GoBackToSourcePage();
            });

            $(document).on('RelatedDataPortlet.StateChanged', '.enquiryForm', function (event, eventData) {
                SaveResumeState(eventData.Data);
            });

            $(document).on('RelatedDataPortlet.BeforeRowAction', '.relatedDataPortlet', function (event, callback) {
                // no action at this time.
                if (callback) {
                    callback();
                }
                event.stopPropagation();
            });

            // Event raised by the related data portlet view object (grid or thumbnail view)
            $(document).on('Form.PerformRowAction', '[data-t1-control-type*=Form]', function (event, eventData) {
                PerformRowAction(eventData);
                event.stopPropagation();
            });

            // Event raised by the related data portlet selection object
            $(document).on('Form.UpdateFormTitle', '[data-t1-control-type*=Form]', function (event, eventData) {
                SetFormTitle(eventData);
                event.stopPropagation();
            });

            // Event raised by the related data portlet view object to save the assume state - triggered when the user right-click on an row action link
            $(document).on('RelatedDataPortlet.SaveRowActionAssumeState', '.relatedDataPortlet', function (event, callback) {
                var actionData = event.RowAction;
                var syncKeys = event.SyncKeys;
                SetRowActionAssumeStateFor(syncKeys, actionData);
            });

            /*
            Event raised by RDP or any other contained control to perform the form action
            */
            $(document).on('Form.PerformFormAction', '.enquiryForm', function (event, eventData) {
                if (eventData.Control && eventData.Control.closest('.mainTabControl').length > 0) {
                    var $tabControl = controls.LinkedTab.GetTabControlFromControl(eventData.Control);
                    controls.LinkedTab.PerformRelatedDataPortletFormAction($tabControl, eventData.ActionData, eventData.CallbackOptions);
                } else {
                    var callbackOptions = $.extend({}, eventData.CallbackOptions);
                    callbackOptions.Control = eventData.Control; // set the control if we have it
                    PerformFormAction(eventData.ActionData, eventData.CustomPopupFormData, callbackOptions);
                }
            });

            $(document).on('NaturalLanguageSearch.ReleaseValidationReadonlyLocks', 'html', function (event) {
                ClearValidationErrors(NaturalLanguageSearchControl());
            });

            $(document).on('Form.ActivateView', 'body', function (event, eventData) {
                var formControl = $('.enquiryForm');
                var formData = formControl.data('t1-control');
                ReadFormSettings(defaultFormSettingsName,
                    {
                        ReadDataOnCallback: true,
                        ViewId: eventData.ViewId,
                        GridOptions: {
                            ColumnSize: formData.GridOptions.ColumnSize
                        },
                        UseDefaultCriteriaText: false,
                        SavePersistentKeys: true,
                        callback: function() {
                            MarkAsRecent();
                        }
                    });

                UpdateConfigureCustomNVLinkTitle(formControl);
            });

            $(document).on('Form.ViewCriteriaChanged', '.enquiryForm', function (event, eventData) {
                // see if the event.target is an enquiry form - we don't want to handle the events triggered in the details panel (details panel also has a form container)
                if (!$(event.target).hasClass('enquiryForm'))
                    return;
                ViewCriteriaChanged();
            });

            $(document).on(T1.Click, ".closeSelectionWindow", function (event) {
                // navigate back to the source window
                controls.Shared.EnquiryForm.GoBackToSourcePage();
            });

            $(document).on('OkClicked', '#ContextualPanelsContainer', function (event, eventData) {
                ViewCriteriaChanged();

                // Covers the scenario when enquiry has contextual keys but not all parameters are part of the contextual keys panel
                // (i.e. hidden parameters with default values).

                let paramValues = GetParameterValues();
                let contextualKeysFields = event.FormData;
                shell.MergeArrays(contextualKeysFields, paramValues, {Key: 'FieldName'});
                UpdateEnquiryForm(contextualKeysFields, event.Options);
            });

            $(document).on('Form.MarkAsRecent', '.enquiryForm', function (event) {
                MarkAsRecent();
            });

            $(document).on('Enquiry.SaveAsReport', '.enquiryForm', function (event) {
                SaveEnquiryAsReportPopup();
            });

            $(document).on('OfferLinksToFunctions', '.enquiryForm', function (event) {
                if (String.IsNullOrWhiteSpace(event.replacementLinksToFunctionsHtml)) return;

                $('#GlobalHeader').find('.linksToFunctionsContainer').html(event.replacementLinksToFunctionsHtml);
            });

            // Control: Flow Event Handlers
            $(document).on('Flow.Action', T1.IsPhone ? '#FlowLoader' : '#flow', function (event)
            {
                if (event.Action !== 'Loaded') return;
                if (!T1.Settings.Simplified) {

                    var configNVLink = $('#MyEnquiryConfigureNVLink');
                    if (!utilities.IsNullOrEmpty(configNVLink)) controls.Flow.AddControl(configNVLink, 'Settings');
                }
            });

            $(window).on(T1.WindowResize, ResizeFitScreenHeight);
        }

        function UpdateConfigureCustomNVLinkTitle(formControl)
        {
            controls.Shared.EnquiryForm.UpdateConfigureCustomNVLinkTitle(formControl);
        }

    }; // end of function enquiryForm()
} // end of function (undefined)
() // and now we call the just defined anonymous function
);

