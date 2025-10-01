(function (undefined) {
    var t1 = window.T1 = window.T1 || {},
        c2 = t1.C2 = t1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicCheckBoxGroup = controls.CheckBoxGroup = controls.CheckBoxGroup || T1_C2_Shell_Controls_CheckBoxGroup();

    shell.ControlInitialiser.AddControl('CheckBoxGroup', publicCheckBoxGroup.Initialise);

    function T1_C2_Shell_Controls_CheckBoxGroup() {

        function T1_C2_Shell_Controls_CheckBoxGroup_Public() { }
        T1_C2_Shell_Controls_CheckBoxGroup_Public.prototype = {
            Initialise: Initialise,
            ResizeLinkedPanels: ResizeLinkedPanels
        };

        function Initialise(control) {
            control.addClass('initialised');
        }

        function ResizeLinkedPanels(context) {
            context.find('.checkboxGroup .checkBoxGroupItemLinkedPanel').each(function () {
                var control = $(this);
                control.css({
                    'height': control.find('.fieldsContainer').outerHeight(true) + "px"
                });
            });
        }

        $(document).delegate('.checkboxGroup .checkBoxControl .checkBoxControlInput', 'change', function (e) {
            e.stopImmediatePropagation();

            var $linkedPanel = $(this).closest('.checkBoxGroupItem').find('.dataEntryPanelSubPanel');
            if ($(this).parent().parent().hasClass('checked')) {
                $linkedPanel.css({
                    'height': $linkedPanel.find('.fieldsContainer').outerHeight(true) + "px"
                });
            } else {
                $linkedPanel.css({
                    'height': '0'
                });
            }
        });

        return new T1_C2_Shell_Controls_CheckBoxGroup_Public();
    }
} ());
(function (undefined) {

    var T1 = window.T1 = window.T1 || {},
        c2 = T1.C2 = T1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicDataEntryForm = controls.DataEntryForm = controls.DataEntryForm || new T1_C2_Shell_Controls_DataEntryForm();

    //This control can't be called DataEntryForm because ContexualKey controls looks 
    shell.ControlInitialiser.AddControl('DataEntryMyMaintenanceWrapper', publicDataEntryForm.Initialise);

    function T1_C2_Shell_Controls_DataEntryForm() {
        
        function DataEntrySectionSave(saveButtonClicked) {
            var selectedRowData = $.extend({},$('#EditModeDataEntrySearchPanel').find('.thumbnailItem.highlighted').data('t1-control'));
            if (selectedRowData) {
                controls.LinkedTab.RegisterCustomSectionActionRequestFunction('LinkedTab', function(action, request){
                    if(selectedRowData.SyncKeys){
                        var syncKeysObject = controls.Shared.FormUtils.ConvertRowSyncKeysToFormDataSyncFields(selectedRowData.SyncKeys);
                        var syncKeysArray = [];
                        for(var prop in syncKeysObject){
                            if(syncKeysObject.hasOwnProperty(prop)){
                                syncKeysArray.push({
                                    FieldName: '_common_' + prop,
                                    Value: syncKeysObject[prop]
                                });
                            }
                        }
                        controls.Form.MergeFormDataFields(syncKeysArray, request.FormData.Fields, true);
                    }
                })
/*                
                saveButtonClicked.data('dataEntrySaveSyncData', {
                    SyncFields: controls.Shared.FormUtils.ConvertRowSyncKeysToFormDataSyncFields(selectedRowData.SyncKeys)
                });
 */
            }
            saveButtonClicked.addClass('dataEntrySectionSavePerformed');

            saveButtonClicked.trigger(T1.FastClick);
        }

        function getFeatureDetector() {

            var supportsUpload = (
                function () {
                    var input = document.createElement('input');
                    input.type = 'file';
                    return !input.disabled;
                })();

            var supportsCssTransitions = (
                function () {
                    var element = document.createElement('div');
                    var style = element.style;
                    var name = 'transition';
                    if (typeof style[name] == 'string') { return true; }

                    // Check for vendor specific version
                    var vendorPrefixes = ['webkit', 'ms', 'moz'];
                    for (var i = 0; i < vendorPrefixes.length; i++) {
                        if (typeof style["-" + vendorPrefixes[i] + "-" + name] == 'string') {
                            return true;
                        }
                    }
                    return false;
                })();

            var supportsFileReader = window.FileReader;
            var supportsDragDrop = (window.ondrop !== undefined) && supportsUpload && supportsFileReader && !T1.IsTablet; // full list needed to exclude ie9 (which supports d&d but not for files)

            return {
                supportsFileReader: supportsFileReader,
                supportsUpload: supportsUpload,
                supportsDragDrop: supportsDragDrop,
                supportsCssTransitions: supportsCssTransitions
            };
        }

        function uploadAFile($fileUploadInput, uploadCompleteFunction) {

            function validateUploadFiles(files, callback) {
                var request = { Items: [] };

                for (var i = 0, len = files.length; i < len; ++i)
                    request.Items.push({ FileName: files[i].name });

                var ajaxRequest = {
                    cache: false,
                    ShowLoader: true,
                    type: 'POST',
                    url: T1.Environment.Paths.Controller + 'ValidateAttachmentFile',
                    contentType: 'application/json',
                    dataType: 'json',
                    data: JSON.stringify(request),
                    success: callback
                };

                // Perform the Ajax call.
                shell.Ajax(ajaxRequest);
            }

            controls.Notification.Clear();

            var $fileSelectorControl = $fileUploadInput.closest('.fileSelector');

            $fileSelectorControl.data('validationFunction', validateUploadFiles);
            $fileSelectorControl.one('FileValidationSuccessful', function (e) {
                var control = $(e.target),
                    controlData = control.data('t1-control'),
                    selectedFile = controls.FileSelector.GetSelected(control),
                    uploadFilesList = [],
                    file = selectedFile.files[selectedFile.files.length - 1];

                uploadFilesList.push({
                    FileName: file.name,
                    FileIdentifier: file.name,
                    OriginalFile: file,
                    ServerFolderCode: controlData.Properties.FileServerFolderCode,
                    ServerFolderChildDir: ''
                });

                var uploadObject = {
                    FileCategory: "File",
                    ServerFolderUploadUrl: controlData.Properties.FileUploadUrl,
                    SupportsFileReader: getFeatureDetector().supportsFileReader,
                    OverwriteExistingFiles: true,
                    UploadCompleteFunction: function (responseItem, item) {
                        controls.DurationSpinner.Stop($('.durationSpinner'));
                        uploadCompleteFunction(responseItem, item);
                    }
                };

                controls.DurationSpinner.Start($('.durationSpinner'));
                shell.GetUploader().uploadFiles(uploadFilesList, uploadObject);
            });
        }

        function T1_C2_Shell_Controls_DataEntryForm_Public() { }
        T1_C2_Shell_Controls_DataEntryForm_Public.prototype = {
            Initialise: Initialise,
            PerformStandardSectionAction: PerformStandardSectionAction
        };

        function Initialise(control) {
            control.addClass('initialised');

            setTimeout(function () {
                controls.ServerActionLink.SetCustomPopupRequestFunction(GetServerActionCustomPopupRequest);
            }, 500);
        }

        function GetServerActionCustomPopupRequest(serverActionLink) {
            var request = {};

            var tabControl = controls.LinkedTab.GetTabControlFromControl(serverActionLink);
            if (tabControl.length > 0) {
                request.FormData = controls.Form.GetFormData({ Context: tabControl });

                var sectionName = controls.LinkedTab.GetTabNameFromTabControl(tabControl);
                if (sectionName.indexOf('|') != -1) {// -1: not found
                    sectionName = sectionName.replace(new RegExp("Tab_", 'g'), "");
                }
                request.RequestData = { SectionName: sectionName };
            } else {
                request.FormData = controls.Form.GetFormData({ KeyFieldsOnly: true });
            }

            return request;
        }

        var $editModeSearchPanelToRemember = null;

        $(document).delegate('#DataEntryForm #MyMaintenanceForm', 'Section.Action', function (e) {
            // This is when the rdp item is selected to show the details
            if (e.Action == "Edit" || e.Action == "SectionFieldChanged") {
                var $currentTab = controls.Shared.FormUtils.GetCurrentTab();
                
                if (e.Action == "SectionFieldChanged" && $editModeSearchPanelToRemember) {
                    T1.C2.Shell.Controls.Shared.FormUtils.GetCurrentTab().find('#EditModeDataEntrySearchPanel').replaceWith($editModeSearchPanelToRemember);
                    $editModeSearchPanelToRemember = null;
                }

                $currentTab.find('.formActionButton, .sectionActionButton').bind(T1.FastClick, function (evt) {
                    var $saveButtonClicked = $(this);
                    var controlData = $saveButtonClicked.data('t1-control') || {};
                    
                    // Determine Action
                    var action = $saveButtonClicked.attr('value') || $saveButtonClicked.val() || controlData.ActionName || '';

                    if (action == "Save" 
                        && $saveButtonClicked.closest('.tabControl').find('> .editablePanel').hasClass('dataEntrySectionSaveRequired')
                        && !$saveButtonClicked.hasClass('dataEntrySectionSavePerformed')) {
                        evt.stopImmediatePropagation();
                        evt.preventDefault();
                        DataEntrySectionSave($saveButtonClicked);
                    }
                    if ($saveButtonClicked.hasClass('dataEntrySectionSavePerformed')) {
                        $saveButtonClicked.removeClass('dataEntrySectionSavePerformed');
                    }
                });

                $currentTab.find('.formControl').bind('change', function (e) {
                    var $editModeSearchPanel = T1.C2.Shell.Controls.Shared.FormUtils.GetCurrentTab().find('#EditModeDataEntrySearchPanel');
                    if ($editModeSearchPanel.length > 0 && $editModeSearchPanel.is(':visible')) {
                        // To keep the current state of the course search result
                        $editModeSearchPanelToRemember = $editModeSearchPanel.clone(true);
                    }
                });
            }
        });

        $(document).delegate('.dataEntryFormActionButton', T1.FastClick, function (event) {
            event.stopImmediatePropagation();
            event.preventDefault();

            var button = $(this),
                action = button.attr('value');

            if (!action || action.length === 0) action = button.val();

            if (!action || action.length === 0) return;

            switch (action) {
            case 'DataEntryFormAction':
                DataEntryFormAction(action, button);
                break;
            default:
                break;
            }
        });

        function DataEntryFormAction(action, button) {

            var promptCallback = function () {
                // Clear notifications
                controls.Notification.Clear();
                var $currentTab = controls.Shared.FormUtils.GetCurrentTab();

                // Build request
                var request = {
                    TabName: controls.Shared.FormUtils.GetCurrentTabName(),
                    FormData: controls.Form.GetFormData({ Context: $currentTab }),
                    ActionName: button.attr("t1-custom-action"),
                    CustomActionType: action
                };

                // Set any sync data from the button into the FormData.Fields
                if (button.attr('data-t1-control') != undefined) {
                    var controlData = JSON.parse(button.attr('data-t1-control'));
                    if (controlData.Parameters) {
                        for (var key in controlData.Parameters) {
                            request.FormData.Fields.push({ FieldName: "DataEntryFormSectionAction" + key, Value: controlData.Parameters[key] });
                        }
                    }
                }

                // Fetch response using SectionAction
                var callback = function (result) {
                    PerformStandardSectionAction(result.FormData, 'EditSection');
                };
                
                controls.Shared.MyMaintenanceForm.ExecuteRequest(request, callback, 'DataEntryFormSectionAction');
            };

            controls.Form.ProceedCheck(promptCallback);
        }

        function PerformStandardSectionAction(formDataToSend, sectionActionTypeName, sectionName) {

            // Clear notifications
            controls.Notification.Clear();

            // Build request
            var readRequest = {
                FormData: formDataToSend,
                TabName: sectionName ? sectionName : controls.Shared.FormUtils.GetCurrentTabName(),
                ActionName: sectionActionTypeName,
                RequestData: {
                    IsSectionActionFromDataEntryForm: true
                }
            };
            
            controls.Shared.MyMaintenanceForm.ExecuteRequest(readRequest, null, 'SectionAction');
        }

        $(document).delegate('.enhancedPreviewSectionTopActions .defaultAction', T1.FastClick, function (e) {
            var defaultActionLabel = $(this).attr('title').trim();
            $(this).parent().find('.dropdownPanel li a').each(function () {
                if ($(this).html().indexOf(defaultActionLabel) != -1) {
                    $(this).trigger(T1.FastClick);
                    return false;
                }
            });
        });

        $(document).delegate('.enhancedPreviewSectionTopActions .dropdownPanelListItem .dropdownItem', T1.FastClick, function (e) {
            e.stopImmediatePropagation();
            e.preventDefault();

            var $clicked = $(this),
                buttonData = $clicked.data('t1-control');

            if (!$clicked.hasClass('dataEntryFormFileUploaderButton')) {
                var request = {
                    TabName: controls.Shared.FormUtils.GetCurrentTabName(),
                    ActionName: buttonData.ActionName,
                    FormData: controls.Form.GetFormData({ KeyFieldsOnly: true })
                };
                var callback = function (result) {
                    if (result Url && result Url != "") {
                        window.open(result Url, "_blank");
                    } else {
                        PerformStandardSectionAction(request.FormData, 'ReadSection');
                    }
                };
                controls.Shared.MyMaintenanceForm.ExecuteRequest(request, callback, 'EnhancedPreviewSectionTopAction');
            }
            else{
                var $fileUploadButton = controls.Shared.FormUtils.GetCurrentTab().find('.dataEntryFormFileUploaderButton');
                if ($fileUploadButton.length > 0) {
                    var $fileUploadInput = $('.dataEntryFormFileUploader .fileInput');
                    $fileUploadInput.trigger('click');
                }
            }
        });

        $(document).delegate('.menuActionItemLink.dataEntryPanelActionButton', T1.FastClick, function (e) {
            e.stopImmediatePropagation();
            e.preventDefault();

            var $popupLauncherButton = $(this),
                $button = $popupLauncherButton.hasClass('defaultAction') ? $(this).siblings('.dropdownPanel').find('li:first-child a') : $(this),
                buttonData = $button.data('t1-control');

            if ($button.closest('.dropdownControl').length > 0) {
                controls.DropDownControl.Hide($button.closest('.dropdownControl'));
            }

            var popupCallerContext = new controls.Shared.DataEntryPopup.DataEntryPopupCallerContext(controls.Shared.DataEntryPopup.DataEntryPopupCallerType.DataEntryPanelTopAction, buttonData.ActionName);
            popupCallerContext.DataEntryPanelTopActionButtonContext.DataEntryPanelCategoryName = $(this).closest('.dataEntryPanel').attr('id');
            popupCallerContext.DataEntryPanelTopActionButtonContext.DataEntryPanelFormData = controls.Form.GetFormData({ Context: $(this).closest('.dataEntryPanel') });
            controls.DataEntryPopup.GetDataEntryPopupContent(popupCallerContext, false, $popupLauncherButton);
        });

        /* Desktop Only Feature */
        $(document).delegate('.enhancedPreviewSectionTopActions .dropdownControl', 'DropDownPanelDisplayed', function (e) {
            function fixPDFzIndexIssueForIE($topActionDropdownPanel) {
                var $divToFix = $topActionDropdownPanel.find('ul');

                if ($divToFix.parent('.outer').length == 0) {
                    $divToFix.wrap("<div class='outer'></div>");

                    var $wrapper = $divToFix.parent('.outer');

                    $wrapper.append("<iframe src='about:blank' class='cover'>");
                    $wrapper.find(".cover").css({
                        'overflow': 'hidden',
                        'position': 'absolute',
                        'border': 'none',
                        'left': 0,
                        'top': 0,
                        'z-index': -1
                    });
                    $wrapper.find(".cover").width($topActionDropdownPanel.width());
                    $wrapper.find(".cover").height($topActionDropdownPanel.height());
                }

                $topActionDropdownPanel.addClass('ieStyling');
            }
            
            fixPDFzIndexIssueForIE($(this).find('.dropdownPanel'));
            var $fileUploadButton = controls.Shared.FormUtils.GetCurrentTab().find('.dataEntryFormFileUploaderButton');
            if ($fileUploadButton.length > 0) {
                var $fileUploadInput = $('.dataEntryFormFileUploader .fileInput');
                
				$fileUploadInput.unbind('change');
                $fileUploadInput.bind('change',
                    function () {
                        var $fileUploadInput = $(this);

                        uploadAFile($fileUploadInput,
                            function (responseItem, item) {
                                if (controls.Notification.HandleNotifications(responseItem.Messages)) {

                                    if (responseItem.UploadedDocuments &&
                                        responseItem.UploadedDocuments.length > 0) {

                                        var request = {
                                            TabName: controls.Shared.FormUtils.GetCurrentTabName(),
                                            FormData: controls.Form.GetFormData({ KeyFieldsOnly: true }),
                                            RequestData: {
                                                UploadedFileName: responseItem.UploadedDocuments[0].FileName
                                            }
                                        };
                                        controls.Shared.MyMaintenanceForm.ExecuteRequest(request,
                                            function (updateResult) {
                                                if (controls.Notification
                                                    .HandleNotifications(updateResult.Messages)) {
                                                    PerformStandardSectionAction(request.FormData, 'ReadSection');
                                                }
                                            },
                                            'UpdateCorrespondenceFile');
                                    }
                                }
                            });
                    });
            }
        });

        return new T1_C2_Shell_Controls_DataEntryForm_Public();
    }
}());

/// <reference path="~/Content/Scripts/DevIntellisense.js"/>

(function (undefined) {
    var t1 = window.T1 = window.T1 || {},
        c2 = t1.C2 = t1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {};
    if (controls.Shared == undefined) controls.Shared = {};
    controls.Shared.DataEntryPanel = controls.Shared.DataEntryPanel || new T1_C2_Shell_Controls_Shared_DataEntryPanel();

    function T1_C2_Shell_Controls_Shared_DataEntryPanel() {

        function CreateActionRequest($panel, actionContext) {
            var $editablePanel = controls.LinkedTab.GetTabControlFromControl($panel).children('.editablePanel');

            actionContext.Parameters = {};

            if ($panel.data('t1-control').Parameters) {
                $.extend(actionContext.Parameters, $panel.data('t1-control').Parameters);
            }

            var $currentTab = controls.LinkedTab.GetTabControlFromControl($panel),
                formData = controls.Form.GetFormData({ KeyFieldsOnly: true }),
                sectionData = controls.Form.GetFormData({ Context: $currentTab });

            controls.Shared.FormUtils.MergeFormDataFields(sectionData, formData, false);
            formData.Attachments = sectionData.Attachments;
            formData.Maps = sectionData.Maps;
            formData.Tables = sectionData.Tables;

            var request = {
                TabName: controls.LinkedTab.GetTabNameFromControl($panel),
                FormData: formData,
                PanelCategoryName: $panel.attr('Id'),
                ActionContext: actionContext,
                RequestData: { OpenedInEditMode: $editablePanel.hasClass('openedInEditMode'), InAddMode: $editablePanel.hasClass('inAddMode') }
            };

            if ($currentTab.hasClass('isChildSection')) {
                request.RequestData.PanelData = controls.Form.GetControlDataFromControl($editablePanel, false).PanelData;
            }

            return request;
        }

        function FocusFirstEditableElement(dataEntryPanelId) {

            var $dataEntryPanel = $(shell.Hash(dataEntryPanelId)),
                isCombinedCategoryPanel = $dataEntryPanel.hasClass('combinedCategoriesDataEntryPanel'),
                controlToFocus = null;

            if (isCombinedCategoryPanel) {
                controlToFocus = $dataEntryPanel.find('.dataEntryPanelSubPanel.CombinedCategoryPanelFirstChild').last().find('.formControl:not(.readonly)').first();
            } else {
                controlToFocus = $dataEntryPanel.find('.dataEntryPanelSubPanel').last().find('.formControl:not(.readonly)').first();
            }

            setTimeout(function () { controlToFocus.focus(); }, 0);
        }

        function T1_C2_Shell_Controls_Shared_DataEntryPanel_Public() { }

        /// Interface declarations
        T1_C2_Shell_Controls_Shared_DataEntryPanel_Public.prototype = {
            CreateActionRequest: CreateActionRequest,
            FocusFirstEditableElement: FocusFirstEditableElement
        };

        return new T1_C2_Shell_Controls_Shared_DataEntryPanel_Public();
    }
}());

(function (undefined) {

    var T1 = window.T1 = window.T1 || {},
        c2 = T1.C2 = T1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicDataEntryPanel = controls.DataEntryPanel = controls.DataEntryPanel || new T1_C2_Shell_Controls_DataEntryPanel();

    shell.ControlInitialiser.AddControl('DataEntryPanel', publicDataEntryPanel.Initialise);

    function T1_C2_Shell_Controls_DataEntryPanel() {
        
        function T1_C2_Shell_Controls_DataEntryPanel_Public() { }

        T1_C2_Shell_Controls_DataEntryPanel_Public.prototype = {
            Initialise: Initialise
        };
        
        function Initialise(control) {
            control.addClass('initialised');
            
            controls.Panel.Initialise(control);
        }

        $(document).delegate('.dataEntryPanel .dataEntryPanelActionButton, .dataEntryPanelSubPanelActionButton', T1.FastClick, function (e) {
            var $button = $(this).hasClass('defaultAction') ? $(this).siblings('.dropdownPanel').find('li:first-child a') : $(this),
                buttonData = $button.data('t1-control'),
                $dataEntryPanel = $(this).closest('.dataEntryPanel'),
                dataEntryPanelId = $(this).closest('.dataEntryPanel').attr('id'),
                $dataEntryPanelSubPanel = $(this).closest('.dataEntryPanelSubPanel');

            var actionType;
            if (buttonData.SmActionContext) {
                actionType = buttonData.SmActionContext.Type;
                e.stopImmediatePropagation();
                e.preventDefault();
            } else {
                return;
            }

            if ($button.closest('.dropdownControl').length > 0) {
                controls.DropDownControl.Hide($button.closest('.dropdownControl'));
            }

            if (controls.Form.HasFormDataChanged() && buttonData.SmActionContext.ShowUserConfirmPopup) {
                controls.Form.OkCancelPrompt('Confirm Action', buttonData.SmActionContext.UserConfirmPopupMessage, PerformDataEntryPanelAction);
            } else {
                PerformDataEntryPanelAction($button);
            }

            function PerformDataEntryPanelAction($buttonClicked) {

                var hasFormDataChanged = controls.Form.HasFormDataChanged();
                var actionName = "DataEntryPanelAction",
                    $dataEntryPanel = $buttonClicked.closest('.dataEntryPanel');
                
                if (actionType == 'PopupLauncher') {
                    var popupCallerContext = new controls.Shared.DataEntryPopup.DataEntryPopupCallerContext(controls.Shared.DataEntryPopup.DataEntryPopupCallerType.DataEntryPanelTopAction, buttonData.SmActionContext.PopupLauncher.ActionName);
                    popupCallerContext.DataEntryPanelTopActionButtonContext.DataEntryPanelCategoryName = $dataEntryPanel.attr('id');
                    popupCallerContext.DataEntryPanelTopActionButtonContext.DataEntryPanelFormData = controls.Form.GetFormData({ Context: $dataEntryPanel });
                    controls.DataEntryPopup.GetDataEntryPopupContent(popupCallerContext, buttonData.SmActionContext.PopupLauncher.OkButtonRequired, $buttonClicked);
                }
                else if (actionType == 'Add' || actionType == 'Custom') {
                    ExecuteRequest(controls.Shared.DataEntryPanel.CreateActionRequest($dataEntryPanel, buttonData.SmActionContext),
                        function(result) {
                            if (!controls.Shared.FormUtils.CheckNotificationsForErrors(result.Messages)) {
                                controls.Form.SetFormDataChanged(hasFormDataChanged);
                                controls.LinkedTab.LoadTabChildControlsAndSetupTab(controls.Shared.FormUtils.GetCurrentTab());
                                controls.Shared.DataEntryPanel.FocusFirstEditableElement(dataEntryPanelId);
                            }
                        },
                        "DataEntryPanelAction");
                }
                else if (actionType == 'Delete') {
                    var confirmPopupData = $button.data('t1-confirmpopup'),
                        request = controls.Shared.DataEntryPanel.CreateActionRequest($dataEntryPanelSubPanel, buttonData.SmActionContext);

                    if (confirmPopupData.ShowUserConfirmPopup) {
                        controls.Form.OkCancelPrompt('Confirm Action', confirmPopupData.UserConfirmPopupMessage, function () {
                            ExecuteRequest(request,
                                function(result) {
                                    if (!controls.Shared.FormUtils.CheckNotificationsForErrors(result.Messages)) {
                                        controls.Form.SetFormDataChanged(hasFormDataChanged);
                                        controls.LinkedTab.LoadTabChildControlsAndSetupTab(controls.Shared.FormUtils
                                            .GetCurrentTab());
                                        controls.Shared.DataEntryPanel.FocusFirstEditableElement(dataEntryPanelId);
                                    }
                                },
                                "DataEntryPanelAction");
                        });
                    } else {
                        ExecuteRequest(request,
                            function(result) {
                                if (!controls.Shared.FormUtils.CheckNotificationsForErrors(result.Messages)) {
                                    controls.Form.SetFormDataChanged(hasFormDataChanged);
                                    controls.LinkedTab.LoadTabChildControlsAndSetupTab(
                                        controls.Shared.FormUtils.GetCurrentTab());
                                    controls.Shared.DataEntryPanel.FocusFirstEditableElement(dataEntryPanelId);
                                }
                            },
                            "DataEntryPanelAction");
                    }
                }
                else if (actionType == 'Revealer') {

                    //Reveal the data entry panel fields and perform a server action
                    var $currentSection = controls.Shared.FormUtils.GetCurrentTab();
                    ExecuteRequest(
                        controls.Shared.DataEntryPanel.CreateActionRequest($dataEntryPanel, buttonData.SmActionContext),
                        function (result) {
                            if (!controls.Shared.FormUtils.CheckNotificationsForErrors(result.Messages)) {
                                controls.Form.SetFormDataChanged(hasFormDataChanged);

                                // Update the fields that were revealed by this button
                                if (result.FormData.SyncData && result.FormData.SyncData.SyncFields) {
                                    for (var syncFieldName in result.FormData.SyncData.SyncFields) {
                                        var $field = $currentSection.find('input[id$=' + syncFieldName + ']');
                                        if ($field.length > 0) {
                                            $field.val(result.FormData.SyncData.SyncFields[syncFieldName]);
                                        }
                                    }
                                }

                                // Send the form data to the form to do any action with it
                                // At the moment, the FormData's fields are used as analyser criteria to refresh the student pathway ssp list after creating a new student pathway
                                // and the SyncData's fields are used to populate some fields on the pathway detail panel
                                $('body').trigger($.Event('DataEntryPanel.RevealerActionEnd', {
                                    Result: result,
                                    BottomActionPane: $button.closest('.bottomActionPane')
                                }));
                                controls.LinkedTab.LoadTabChildControlsAndSetupTab(controls.Shared.FormUtils.GetCurrentTab());
                            }
                        },
                        "DataEntryPanelAction");
                }
                else if (actionType == 'ShowFunction') {
                    var syncData = buttonData.SmActionContext.ShowFunction.SyncData;
                    if (syncData) {
                        controls.Shared.FormUtils.SetAssumeStateFor(syncData);
                        if (syncData.Url) {
                            window.location = syncData.Url;
                        } else {
                            controls.Shared.FormUtils.ShowFunction(syncData.FunctionName, syncData.Hash, syncData.ExpiryTime);
                        }
                    }
                }
                else if (actionType == 'FurtherInformation') {
                    var syncData = buttonData.SmActionContext.FurtherInformation.SyncData;
                    if (syncData && syncData.Url) {

                        controls.Shared.FormUtils.SetAssumeStateFor(syncData);

                        // If sync data has parameters set, add them to the URL
                        if (syncData.UrlParameters) {
                            for (var urlParam in syncData.UrlParameters) {
                                syncData.Url += '&sk.' + urlParam + '=' + encodeURIComponent(syncData.UrlParameters[urlParam]);
                            }
                        }

                        T1.C2.Shell.Navigate(syncData.Url, {OpenInNewTab: syncData.OpenInNewWindow});
                    } else {
                        ExecuteRequest(
                            controls.Shared.DataEntryPanel.CreateActionRequest($dataEntryPanel, buttonData.SmActionContext),
                            function(result) {
                                if (!controls.Shared.FormUtils.CheckNotificationsForErrors(result.Messages)) {
                                    controls.Form.SetFormDataChanged(hasFormDataChanged);
                                    controls.LinkedTab.LoadTabChildControlsAndSetupTab(
                                        controls.Shared.FormUtils.GetCurrentTab());
                                }
                            },
                            "DataEntryPanelAction");
                    }
                }
            }
        });
        
        function ExecuteRequest(request, callback, actionName) {
            
            var type, controlTypes;
            controlTypes = $('#MainContainer .form.contentContainer').data('t1-control-type').split(' ');
            for (var i = 0, len = controlTypes.length; i < len; ++i) {
                if (controlTypes[i] != 'Form')
                {
                    type = controlTypes[i];
                    break;
                }
            }
            
            switch (type) {
                case 'MyWizardForm':
                    controls.Shared.MyWizardForm.ExecuteRequest(request, callback, actionName);                    
                    break;
                case 'MyMaintenanceForm':
                    controls.Shared.MyMaintenanceForm.ExecuteRequest(request, callback, actionName);
                    break;
                default:
                    break;                
            }
        }
        
        return new T1_C2_Shell_Controls_DataEntryPanel_Public();
    }
}());

(function (undefined) {

    var T1 = window.T1 = window.T1 || {},
        c2 = T1.C2 = T1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicDataEntryPanelSubPanel = controls.DataEntryPanelSubPanel = controls.DataEntryPanelSubPanel || new T1_C2_Shell_Controls_DataEntryPanelSubPanel();

    shell.ControlInitialiser.AddControl('DataEntryPanelSubPanel', publicDataEntryPanelSubPanel.Initialise);

    function T1_C2_Shell_Controls_DataEntryPanelSubPanel() {

        function T1_C2_Shell_Controls_DataEntryPanelSubPanel_Public() { }

        T1_C2_Shell_Controls_DataEntryPanelSubPanel_Public.prototype = {
            Initialise: Initialise
        };
        function Initialise(control) {
            control.addClass('initialised');

            controls.Panel.Initialise(control);
            
            //Update width of the TextBox controls that don't match their container
            var textBoxes = control.find('.textBoxControl:visible');
            for (var i = 0, numTextBoxes = textBoxes.length; i < numTextBoxes; ++i) {
                var textBox = textBoxes.eq(i);
                var textBoxLabel = textBox.children(".tbcEditorLabel").eq(0);
                
                if (textBox.width() === textBoxLabel.width()) continue;
                controls.Textbox.Resize(textBox, textBox.width());

                //TextBox.Resize doesn't resize it's label unfortunately 
                textBoxLabel.width(textBox.width())
            }
        }
        return new T1_C2_Shell_Controls_DataEntryPanelSubPanel_Public();
    }
} ());

/// <reference path="~/Content/Scripts/DevIntellisense.js"/>

(function (undefined) {
    var t1 = window.T1 = window.T1 || {},
        c2 = t1.C2 = t1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {};
    if (controls.Shared == undefined) controls.Shared = {};
    controls.Shared.DataEntryPopup = controls.Shared.DataEntryPopup || new T1_C2_Shell_Controls_Shared_DataEntryPopup();

    function T1_C2_Shell_Controls_Shared_DataEntryPopup() {

        var dataEntryPopupCallerType = {
            DataEntryPanelTopAction: 1,
            ThumbnailRowAction: 2
        };

        function T1_C2_Shell_Controls_Shared_DataEntryPopup_Public() { }

        /// Interface declarations
        T1_C2_Shell_Controls_Shared_DataEntryPopup_Public.prototype = {
            DataEntryPopupCallerContext: PopupCallerContext,
            DataEntryPopupCallerType: dataEntryPopupCallerType
        };

        function PopupCallerContext(popupCallerType, actionName) {
            var thisClass = this;
            
            if (popupCallerType === dataEntryPopupCallerType.DataEntryPanelTopAction) {
                thisClass.DataEntryPanelTopActionButtonContext = {
                    DataEntryPanelCategoryName: "",
                    DataEntryPanelFormData: {}
                };
            } else if (popupCallerType === dataEntryPopupCallerType.ThumbnailRowAction) {
                thisClass.ThumbnailRowActionContext = {
                    AnalyserName: "",
                    SyncKeys: []
                };
            }
            thisClass.PopupCallerType = popupCallerType;

            //if this is linked to the DataEntryPanel's top action, actionName should have a value
            if (actionName) {
                thisClass.ActionName = actionName;
            }
        }

        return new T1_C2_Shell_Controls_Shared_DataEntryPopup_Public();
    }
}());

(function (undefined) {

    var T1 = window.T1 = window.T1 || {},
        c2 = T1.C2 = T1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicDataEntryPopup = controls.DataEntryPopup = controls.DataEntryPopup || new T1_C2_Shell_Controls_DataEntryPopup();

    shell.ControlInitialiser.AddControl('DataEntryPopup', publicDataEntryPopup.Initialise);

    function T1_C2_Shell_Controls_DataEntryPopup() {

        var refreshCurrentSection = false,
            popupTabName = "";

        function T1_C2_Shell_Controls_DataEntryPopup_Public() { }
        T1_C2_Shell_Controls_DataEntryPopup_Public.prototype = {
            GetDataEntryPopupContent: GetDataEntryPopupContent
        };

        function HandlePopupListItemAction($clicked, currentTabName, callerContext) {
            var currentTabControl = $(controls.LinkedTab.GetTabControlFromTabName(currentTabName.split('|')[currentTabName.split('|').length - 1])),
                itemSelectionRequest = {
                TabName: currentTabName,
                FormData: controls.Form.GetFormData({ KeyFieldsOnly: true }),
                TabData: controls.Form.GetFormData({ Context: currentTabControl }),
                PopupCallerContext: callerContext
            };

            var sectionFormData = controls.Form.GetFormData({ Context: currentTabControl });

            if (callerContext.PopupCallerType == controls.Shared.DataEntryPopup.DataEntryPopupCallerType.ThumbnailRowAction) {
                controls.Shared.FormUtils.IncludeSyncKeysInFormData(callerContext.ThumbnailRowActionContext.SyncKeys, itemSelectionRequest.FormData);
            }
            else if (callerContext.PopupCallerType == controls.Shared.DataEntryPopup.DataEntryPopupCallerType.DataEntryPanelTopAction) {
                controls.Shared.FormUtils.MergeFormDataFields(sectionFormData, itemSelectionRequest.FormData);
            }
            controls.Shared.FormUtils.IncludeSyncKeysInFormData($clicked.closest('.thumbnailItem').data('t1-control').SyncKeys, itemSelectionRequest.FormData);

            controls.Shared.MyMaintenanceForm.ExecuteRequest(itemSelectionRequest, function (result) {
                refreshCurrentSection = result.RefreshCurrentSection;

                if ($('.notification').length == 0 || $('.notification').css('display') == 'none') {
                    controls.Popup.Close($clicked.closest('.popupContainer'), function () {
                        if (result.RefreshCurrentSection) {
                            controls.DataEntryForm.PerformStandardSectionAction(sectionFormData, "EditSection", currentTabName);
                        } else {
                            controls.LinkedTab.LoadTabChildControlsAndSetupTab(currentTabControl);
                        }
                    });
                } else {
                    if (!controls.Shared.FormUtils.CheckNotificationsForErrors(result.Messages)) {
                        controls.Notification.AddNotification({ NotificationType: 'saved', Message: 'Successfully saved.' });
                    }
                }
            }, 'DataEntryPopupListItemAction');
        }

        $(document).delegate(".popup .popupClose,.popup .cancel", "mousedown", function (e) {
            var $notificationHeader = $(this).hasClass('cancel') ? $(this).closest('.popup').find('.notificationHeader') : $(this).siblings('.notificationHeader'),
                $notificationPanel = $('.notification');

            var shouldRefreshCurrentSection = (($notificationHeader.length > 0 && $notificationHeader.css('display') != 'none' && !$notificationHeader.hasClass('error'))
                || ($notificationPanel.length > 0 && $notificationPanel.css('display') != 'none' && !$notificationPanel.hasClass('error')));

            if (shouldRefreshCurrentSection && refreshCurrentSection) {
                controls.Popup.Close($(this).closest('.popupContainer'), function () {
                    var currentTabControl = $(controls.LinkedTab.GetTabControlFromTabName(popupTabName.split('|')[popupTabName.split('|').length - 1])),
                        sectionFormData = controls.Form.GetFormData({ Context: currentTabControl });
                    
                    controls.DataEntryForm.PerformStandardSectionAction(sectionFormData, "EditSection", popupTabName);
                });
            }
        });

        function HandlePopupOkAction(currentTabName, callerContext) {
            var $currentTab = $(controls.LinkedTab.GetTabControlFromTabName(currentTabName.split('|')[currentTabName.split('|').length - 1])),
                $popupContent = $('#DataEntryPopupContent'),
                currentTabFormData = controls.Form.GetFormData({ Context: $currentTab }),
                popupFormData = controls.Form.GetFormData({ Context: $popupContent });

            // Validate controls.
            if (controls.Form.ValidateFormControls($popupContent, ".formControl:not(.checkBoxGroupItemLinkedPanelField)")) {
                var $linkedPanelsToBeValidated = $.grep($popupContent.find('.checkBoxControl'), function (control, index) {
                    return $(control).hasClass('checked');
                });
                if ($linkedPanelsToBeValidated.length > 0) {
                    var validated = false;
                    $.each($linkedPanelsToBeValidated, function () {
                        var $linkedPanel = $(this).closest('.checkBoxGroupItem').find('.checkBoxGroupItemLinkedPanel'),
                            linkedPanelFieldsSelector = ".formControl.checkBoxGroupItemLinkedPanelField";

                        validated = controls.Form.ValidateFormControls($linkedPanel, linkedPanelFieldsSelector);
                    });
                    if (!validated) {
                        controls.CheckBoxGroup.ResizeLinkedPanels($popupContent);
                        return;
                    }
                }
            } else {
                return;
            }

            controls.Shared.FormUtils.MergeFormDataFields(popupFormData, currentTabFormData);

            var itemSelectionRequest = {
                TabName: currentTabName,
                FormData: currentTabFormData,
                PopupCallerContext: callerContext
            },
            hasFormDataChanged = controls.Form.HasFormDataChanged();

            controls.Shared.MyMaintenanceForm.ExecuteRequest(itemSelectionRequest, function (result) {
                controls.Popup.Close($('#DataEntryPopupContent').closest('.popupContainer'), function () {
                    if (result.RefreshCurrentSection) {
                        controls.DataEntryForm.PerformStandardSectionAction(controls.Form.GetFormData({ Context: $currentTab }), "EditSection", currentTabName);
                    } else {
                        controls.LinkedTab.SetDataChanged($currentTab, hasFormDataChanged);
                    }
                });
            }, 'DataEntryPopupOkAction');
        }

        function GetDataEntryPopupContent(callerContext, okButtonRequired, $popupLauncherButton) {
            
            var $dataEntryPopupContent = $('<div id="DataEntryPopupContent"></div>'),
                currentTabName = controls.LinkedTab.GetTabNameFromControl($popupLauncherButton, true),
                tabControl = $popupLauncherButton.closest('.tabControl');

            $dataEntryPopupContent.data('t1-popup-caller-context', callerContext);
            $dataEntryPopupContent.data('t1-launcher-tab-name', currentTabName);

            var request = {
                TabName: currentTabName,
                FormData: controls.Form.GetFormData({ Context: tabControl }),
                PopupCallerContext: callerContext
            };

            if (callerContext.PopupCallerType == controls.Shared.DataEntryPopup.DataEntryPopupCallerType.ThumbnailRowAction) {
                controls.Shared.FormUtils.IncludeSyncKeysInFormData(callerContext.ThumbnailRowActionContext.SyncKeys, request.FormData);
            }

            //Event handler for the list item action
            $dataEntryPopupContent.delegate('.defaultAction', T1.FastClick, function (e) {
                e.stopImmediatePropagation();
                e.preventDefault();

                HandlePopupListItemAction($(this), currentTabName, callerContext);
            });

            controls.Shared.MyMaintenanceForm.ExecuteRequest(request, function (result) {
                $dataEntryPopupContent.html(result.PanelHtml);
                popupTabName = currentTabName;
                
                var popupOptions = {
                    Type: okButtonRequired ? 'okcancel' : 'cancel',
                    Parent: $('body'),
                    PopupTitle : result.PopupTitle,
                    PopupContent: $dataEntryPopupContent,
                    CancelLabel : result.CancelLabel
                };

                if (okButtonRequired) {
                    popupOptions.OkFunction = function () {
                        HandlePopupOkAction(currentTabName, callerContext);
                        return false;
                    };
                }
                
                var popup = controls.Popup.Show(popupOptions);
                popup.find('> .popup > .content > section').css({
                    'overflow-y': 'auto',
                    'overflow-x': 'hidden'
                });
                setTimeout(function () {

                    var $popup = $dataEntryPopupContent.closest('.popup'),
                        $notificationHeader = '<div class="notificationHeader right" style="display: none"><div class="marginLR5"><button type="button" class="notificationHeaderButton handle"><span class="buttonLabel"></span></button></div></div>';

                    if ($popup) {
                        $popup.find('> header').append($notificationHeader);
                    }

                    var $copyAddressFromPanel = $popup.find('#CopyAddressFromItem');
                    if ($copyAddressFromPanel.length > 0) {
                        $copyAddressFromPanel.append('<div id="CalendarWidgetContainer"></div>');
                    }

                    if (result.PopupData) {
                        controls.Form.SetFormData($dataEntryPopupContent, undefined, result.PopupData, '.formControl');
                    }
                }, 50);
            }, 'DataEntryPopupContent', {
                FailureCallback: function (){
                    $dataEntryPopupContent.closest('.popupContainer').find('h3.title').html('Failed to load the contents');
                }
            });
        }
        return new T1_C2_Shell_Controls_DataEntryPopup_Public();
    }
}());

(function (undefined) {

    var T1 = window.T1 = window.T1 || {},
        c2 = T1.C2 = T1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicDataEntrySearch = controls.DataEntrySearch = controls.DataEntrySearch || new T1_C2_Shell_Controls_DataEntrySearch();

    shell.ControlInitialiser.AddControl('DataEntrySearch', publicDataEntrySearch.Initialise);

    function T1_C2_Shell_Controls_DataEntrySearch() {

        var heightToRevealAdvancedSearchHeaderRow = 0,
            currentSearchFieldBeingUsed = undefined,
            currentSearchPart = undefined;
        
        function T1_C2_Shell_Controls_DataEntrySearch_Public() { }

        T1_C2_Shell_Controls_DataEntrySearch_Public.prototype = {
            Initialise: Initialise,
            PerformDataEntrySearch: PerformDataEntrySearch,
            InitialiseAdvancedSearchPanel: InitialiseAdvancedSearchPanel
        };

        function InitialiseAdvancedSearchPanel(context) {
            var $advancedSearchFields = context.find('.advancedSearchFieldsRow .editorField input, .advancedSearchFieldsRow .editorField select');
            $advancedSearchFields.focusin(function () {
                $(this).attr('data-t1-previous-value', $(this).val());
            });
            $advancedSearchFields.focusout(function (evt) {
                evt.stopImmediatePropagation();
                var currentInput = $(this);
                if (currentInput.attr('data-t1-previous-value') != currentInput.val()) {
                    PerformAdvancedSearch(currentInput);
                }
            });

            if (context.data('t1-control').ShowSearchCriteriaPanelByDefault) {
                heightToRevealAdvancedSearchTable = context.find('.advancedSearchPanel').height();
            } else {
                context.find('.advancedSearchPanel').height(heightToRevealAdvancedSearchHeaderRow);
                heightToRevealAdvancedSearchTable = heightToRevealAdvancedSearchHeaderRow;
            }
        }

        function arrayObjectIndexOf(array, searchTerm, property) {
            for (var i = 0, len = array.length; i < len; i++) {
                if (array[i][property] === searchTerm) return i;
            }
            return -1;
        }

        function RegisterEventHandlers(control) {
            control.find('.clearAdvancedSearchFieldsButton').on(T1.FastClick, function () {
                var $clicked = $(this),
                    $advancedSearchFieldControlContainers = $clicked.closest('.advancedSearchPanel').find('.controlContainer'),
                    predefinedCriteriaFields = control.find('.searchPart .thumbnailViewControl').data('t1-control').PredefinedCriteriaFields;

                for (var i = 0, numAdvancedSearchFields = $advancedSearchFieldControlContainers.length; i < numAdvancedSearchFields; ++i) {
                    var $controlContainer = $($advancedSearchFieldControlContainers[i]),
                        columnName = $controlContainer.data('t1-control-id');

                    var index = arrayObjectIndexOf(predefinedCriteriaFields, columnName, 'FieldName');
                    if (index > -1) {
                        predefinedCriteriaFields.splice(index, 1);
                    }

                    if ($controlContainer.hasClass('comboBoxControl')) {
                        $controlContainer.find('select option').removeAttr('selected');
                        $controlContainer.find('select option:first-child').attr('selected', 'selected');
                    } else {
                        controls.Textbox.SetFieldData($controlContainer.find('input'), {});
                    }
                }

                PerformDataEntrySearch($clicked.closest('.searchPart'));
            });
        }

        function Initialise(control) {
            control.addClass('initialised');

            control.find('.noSearchView').show();
            InitialiseAdvancedSearchPanel(control);

            // when this control is displayed on the platform popup
            ResizeForPopup(control);

            RegisterEventHandlers(control);
        }

        $(window).resize(function (e) {
            var $popup = $('.popup');
            if ($popup.length > 0) {
                var $dataEntrySearch = $popup.find('#DataEntrySearch');
                if ($dataEntrySearch.length > 0) {
                    ResizeForPopup($dataEntrySearch);
                }
            }
        });

        function ResizeForPopup(control) {
            // when this control is displayed on the platform popup
            var $platformPopup = control.closest('.popup');
            if ($platformPopup.length > 0) {
                control.css('cssText', 'height:' + Math.round(($(window).height() - $platformPopup.offset().top) * 0.6) + 'px !important');
                var $popupContent = control.closest('.content');
                var $advancedSearchPanelHeight = ($popupContent.find('.advancedSearchPanel').length === 0) ? 0 : $popupContent.find('.advancedSearchPanel').outerHeight(true);
                control.find('.thumbnailViewContainer').height($popupContent.height() - $popupContent.find('.searchPanel').outerHeight(true) - $advancedSearchPanelHeight);

                if ($popupContent.find('.enhancedThumbnailViewer').hasClass('performSearchWhenLoaded')) {
                    setTimeout(function () {
                        $popupContent.find('#SearchButton').trigger(T1.FastClick);
                    }, 300);
                }
            }
        }

        function resetSelectedRow($selectedRow) {
            if($selectedRow.length > 0){
                $selectedRow.removeClass('highlighted');

                var $previousThumbnailItemActionClicked = $selectedRow.find('.defaultAction.selected');
                if ($previousThumbnailItemActionClicked.length > 0){
                    $previousThumbnailItemActionClicked.removeClass('selected');

                    var $label = $previousThumbnailItemActionClicked.find('.buttonLabel'),
                        originalLabel = $label.data('t1-original-label');

                    if (originalLabel) {
                        $label.text(originalLabel);
                        $label.removeAttr('data-t1-original-label');
                    }
                }
            }
        }
        
        $(document).delegate('#DataEntrySearchSimpleSearchPart .thumbnailItem, #DataEntrySearchSimpleSearchPart .defaultAction', T1.FastClick, function (e) {
            e.stopImmediatePropagation();
            e.preventDefault();

            // Clear notifications
            controls.Notification.Clear();

            //check if the section is in read-only or edit mode
            var $thumbnailItemActionClicked = $(this);
            
            $thumbnailItemActionClicked = $thumbnailItemActionClicked.hasClass('defaultAction') ? $(this) : $(this).find('.defaultAction');

            var $thumbnailItem = $thumbnailItemActionClicked.closest('.thumbnailItem'), 
                $thumbnailViewControl = $thumbnailItemActionClicked.closest('.thumbnailViewControl'),
                thumbnailViewerData = $thumbnailViewControl.data('t1-control');
            
            resetSelectedRow($thumbnailViewControl.find('.thumbnailItem.highlighted'));
            
            if (thumbnailViewerData.AlternateRowActionLabel) {
                $thumbnailItem.addClass('highlighted');
                
                var $buttonLabel = $thumbnailItemActionClicked.find('.buttonLabel');
                $buttonLabel.data('t1-original-label', $thumbnailItemActionClicked.find('.buttonLabel').text());
                $buttonLabel.text(thumbnailViewerData.AlternateRowActionLabel);

                $thumbnailItemActionClicked.addClass('selected');
            }
        });

        $(document).delegate('.naturalLanguageSearch', 'EnterKeyDown', function (e) {
            if ($(this).closest('#EditModeDataEntrySearchPanel').length > 0) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        });

        $(document).delegate('#DataEntrySearchSimpleSearchPart #SearchKeywordValue', 'keydown', function (e) {
            if (e.keyCode == 9 && e.shiftKey) {
                e.preventDefault();

                var $searchPart = $(this).closest('.searchPart'),
                    $advancedSearchPanel = $searchPart.find('.advancedSearchPanel'),
                    $firstRow = $searchPart.find('.thumbnailViewContainer .thumbnailItem:first');
                
                if ($firstRow.length > 0){
                    $firstRow.trigger(T1.FastClick);
                }else if ($advancedSearchPanel.hasClass('visible')){
                    $advancedSearchPanel.find('.advancedSearchRowSearchFieldColumn').last().find('.editorField').children().focus();
                }else{
                    $searchPart.find('.searchKeywordValue').focus();
                }
            }
        });

        $(document).delegate('#DataEntrySearchSimpleSearchPart .advancedSearchRowSearchFieldColumn', 'keydown', function (e) {
            if (e.keyCode == 9) { // tab key

                var $currentColumn = $(this);

                if (e.shiftKey) {
                    var $prevColumn = $currentColumn.prev('.advancedSearchRowSearchFieldColumn');
                    if ($prevColumn.length == 0) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        $currentColumn.closest('.searchPart').find('.showHideSearchBuilder').focus();
                    }
                } else {
                    var $nextColumn = $currentColumn.next('.advancedSearchRowSearchFieldColumn');
                    if ($nextColumn.length == 0) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        var $firstRow = $currentColumn.closest('.searchPart').find('.thumbnailViewContainer .thumbnailItem:first');
                        if ($firstRow.length > 0) {
                            $firstRow.trigger(T1.FastClick);
                        }
                    }
                }
            }
        });

        $(document).delegate('#DataEntrySearchSimpleSearchPart .showHideSearchBuilder', 'keydown', function (e) {
            if (e.keyCode == 9) {//Tab
                if (!e.shiftKey) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    var $searchPart = $(this).closest('.searchPart');
                    var $advancedSearchPanel = $searchPart.find('.advancedSearchPanel'),
                        $searchResultTable = $advancedSearchPanel.siblings('.searchResultTable');

                    if ($advancedSearchPanel.hasClass('visible')) {
                        var $firstCriterionField = $searchPart.find('.advancedSearchRowSearchFieldColumn:first').find('input');
                        if ($firstCriterionField.length == 0) {
                            $firstCriterionField = $searchPart.find('.advancedSearchRowSearchFieldColumn:first').find('select');
                        }
                        $firstCriterionField.focus();
                    } else {
                        var $firstRow = $searchResultTable.find('.thumbnailViewContainer .thumbnailItem:first');
                        if ($firstRow.length > 0) {
                            $firstRow.trigger(T1.FastClick);
                        }
                    }
                }
            }
        });

        $(document).delegate('#DataEntrySearch .inputClearButton', T1.FastClick, function () {
            resetSelectedRow($(this).closest('.searchPart').find('.thumbnailItem.highlighted'));
        });

        $(document).delegate('#DataEntrySearchSimpleSearchPart #SearchButton', T1.FastClick, function (event) {
            PerformDataEntrySearch($(this).closest('.searchPart'));
        });

        function GetCriteriaFromAdvancedSearchPanel(panel, panelFormDataFields) {
            var criteria = [];
            panel.find('.advancedSearchRowSearchFieldColumn').each(function () {
                var criterionColumn = $(this);
                var fieldId = criterionColumn.data('t1-criteria-field-id');

                for (var i in panelFormDataFields) {
                    if (panelFormDataFields[i].FieldName == fieldId) {
                        var fieldValue = panelFormDataFields[i].Value;
                        var fieldCriteriaOperator = criterionColumn.data('t1-criteria-operator');
                        criteria.push(controls.Shared.FormUtils.CreateAnalyserCriteria(fieldId, fieldValue, fieldCriteriaOperator));
                    }
                }
            });
            return criteria;
        }

        function PerformDataEntrySearch($dataEntrySearchControlSearchPart, callback, shouldNavigateToListAfterSave) {

            currentSearchPart = $dataEntrySearchControlSearchPart;

            // Clear notifications
            if (shouldNavigateToListAfterSave == undefined || !shouldNavigateToListAfterSave) {
                controls.Notification.Clear();
            }

            var $searchKeywordField = $dataEntrySearchControlSearchPart.find('.naturalLanguageSearchInputWrapper #SearchKeywordValue'),
                $thumbnailViewer = $dataEntrySearchControlSearchPart.find('.thumbnailViewControl'),
                $advancedSearchPanel = $dataEntrySearchControlSearchPart.find('.advancedSearchPanel'),
                advancedSearchPanelFormData = controls.Form.GetFormData({ Context: $advancedSearchPanel, EnsureKeyFields: false }),
                keyFieldsFormData = controls.Form.GetFormData({ KeyFieldsOnly: true }),
                displayFields = T1.C2.Shell.Controls.Shared.FormUtils.GetFieldIdsFromFormData(advancedSearchPanelFormData),
                extraCriteriaFields = GetCriteriaFromAdvancedSearchPanel($advancedSearchPanel, advancedSearchPanelFormData.Fields);

            var internalCallback = function (result) {
                if(result.TotalRecordCount == 0)
                    $dataEntrySearchControlSearchPart.find('.noResultsView').show();
                else
                    $dataEntrySearchControlSearchPart.find('.noResultsView').hide();
                if (currentSearchFieldBeingUsed) {
                    currentSearchFieldBeingUsed.focus();
                }
                var $searchResultTextHolder = currentSearchPart.find('.searchPanel .rowNumberText');

                if (typeof result.Items != "undefined" && typeof result.TotalRecordCount != "undefined") {
                    $searchResultTextHolder.css({
                        'visibility': 'visible'
                    });

                    if (result.TotalRecordCount > 0) {
                        $searchResultTextHolder.html(result.TotalRecordCount + (result.TotalRecordCount == 1 ? ' record' : ' records'));
                    } else {
                        $searchResultTextHolder.html('No records found.');
                    }
                }

                // show the record number
                if (callback) callback();
            };
            var thumbnailItemType;
            var $popup = $('#DataEntryPopupContent');
            if ($popup.length == 0) $popup = $('.popup'); // Platform popup
            if ($popup.length > 0) {
                //popup
                thumbnailItemType = controls.Shared.EnhancedThumbnailViewer.ThumbnailTypes.EditModeSearchRowActionPopup;
                $thumbnailViewer = $popup.find('.thumbnailViewControl');
            } else {
                thumbnailItemType = controls.Shared.EnhancedThumbnailViewer.ThumbnailTypes.EditModeSearchResult;
            }

            var tabName = '';
            if ($popup.length > 0) {
                if ($popup.data('t1-launcher-tab-name')) {
                    // This is our custom popup
                    tabName = $popup.data('t1-launcher-tab-name');
                } else {
                    // Corelib's popup
                    var popupControlData = $popup.parent().data('t1-control');

                    // See if the platform popup is being launched from a maintenance section
                    if ($('.form').hasClass('myMaintenance')
                        && popupControlData.SourceControl
                        && popupControlData.SourceControl.length > 0
                        && popupControlData.SourceControl.closest('.sectionBase').length > 0) {
                        tabName = controls.LinkedTab.GetTabNameFromControl(popupControlData.SourceControl, true);
                    }
                }
            }

            tabName = tabName === '' && $('#TabsContainer').length > 0 ? controls.Shared.FormUtils.GetCurrentTabName() : tabName;
            $dataEntrySearchControlSearchPart.find('.noSearchView').hide();
            $dataEntrySearchControlSearchPart.find('.noResultsView').hide();
            controls.Shared.EnhancedThumbnailViewer.RequestThumbnailData(
                tabName,
                $thumbnailViewer,
                $searchKeywordField.length > 0 ? $searchKeywordField.val().trim() : "",
                displayFields,
                extraCriteriaFields,
                keyFieldsFormData,
                internalCallback,
                thumbnailItemType,
                $thumbnailViewer.data('t1-control').OverrideRowAction,
                $thumbnailViewer.data('t1-control').AnalyserItemServiceName);
        }

        function PerformAdvancedSearch(currentInput) {
            var searchPart = currentInput.closest('.searchPart');
            var callback = function () {
                if (!searchPart.find('.showHideSearchBuilder').hasClass('selected')) {
                    searchPart.find('.advancedSearchPanel').height(heightToRevealAdvancedSearchHeaderRow);
                    $('.naturalLanguageSearchInputWrapper textarea').focus();
                }
            };
            PerformDataEntrySearch(searchPart, callback);
        }

        //Toggle the advanced search area
        $(document).delegate('#DataEntrySearchSimpleSearchPart .showHideSearchBuilder', T1.FastClick, function (e) {
            e.stopImmediatePropagation();
            var $selectedButton = $(this),
                $searchPart = $selectedButton.closest('.searchPart'),
                $advancedSearchPanel = $searchPart.find('.advancedSearchPanel'),
                $thumbnailContainer = $searchPart.find('.searchResultTable .thumbnailViewContainer'),
                currentThumbnailViewerHeight = $thumbnailContainer.height(),
                $popupContent = $selectedButton.closest('.content');

            //Disable the scrollbar during the animation
            $popupContent.css({ 'overflow-y': 'hidden' });

            var isRevealed = $selectedButton.hasClass('selected');
            if (isRevealed) {
                $selectedButton.removeClass('selected');
                $advancedSearchPanel.removeClass('visible');
                $thumbnailContainer.height(currentThumbnailViewerHeight + heightToRevealAdvancedSearchTable);
                $advancedSearchPanel.height(0);
            } else {
                $advancedSearchPanel.height('auto');
                heightToRevealAdvancedSearchTable = $advancedSearchPanel.height();
                $advancedSearchPanel.height(0).animate({ height: heightToRevealAdvancedSearchTable }, 0);
                $selectedButton.addClass('selected');
                $advancedSearchPanel.addClass('visible');
            }

            if (!isRevealed && currentThumbnailViewerHeight > 0) {
                $thumbnailContainer.height(currentThumbnailViewerHeight - heightToRevealAdvancedSearchTable);
            }
            
            $popupContent.css({ 'overflow-y': 'auto' });
        });

        $(document).delegate('#DataEntrySearch .naturalLanguageSearch textarea, #DataEntrySearchSimpleSearchPart .advancedSearchTableSearchFieldsRow .formControl', 'keydown', function (e) {
            if (e.keyCode == 13) {//Enter
                e.stopImmediatePropagation();
                $(this).closest('.searchPart').find('#SearchButton').trigger(T1.FastClick);
            }
        });

        function ShouldNavigateToListAfterSave() {
            // The first condition is for the section that stays after a save(i.e. LinkedSection) and the 2nd one is for the data entry search section
            return ($.grep(controls.Shared.FormUtils.GetCurrentTab().find('.topActionPane:visible').eq(0).find('.formActionButton'), function () {
                return $(this).hasClass('linkedTabBackNavigationButton');
            }).length > 0) || $('#EditModeDataEntrySearchPanel').length == 0;
        }

        $(document).delegate('#DataEntryForm #MyMaintenanceForm', 'Form.Action', function (e) {
            ResetDataEntrySearch(e, ShouldNavigateToListAfterSave());
        });

        $(document).delegate('#DataEntryForm #MyMaintenanceForm', 'Section.Action', function (e) {
            ResetDataEntrySearch(e, ShouldNavigateToListAfterSave());
        });

        function ResetDataEntrySearch(e, shouldNavigateToListAfterSave) {
            var $currentTab = controls.Shared.FormUtils.GetCurrentTab(),
                $dataEntrySearch = $currentTab.find('#DataEntrySearch'),
                $searchPart = $dataEntrySearch.find('.searchPart');

            if ($dataEntrySearch.length > 0) {
                if ($searchPart.length > 0 && $dataEntrySearch.data('t1-control').PerformSearchAfterSectionLoad) {
                    PerformDataEntrySearch($searchPart, undefined, shouldNavigateToListAfterSave);
                }
            }
        }
        return new T1_C2_Shell_Controls_DataEntrySearch_Public();
    }
}());

(function (undefined) {

    var T1 = window.T1 = window.T1 || {},
        c2 = T1.C2 = T1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicEnhancedRelatedDataPortletSection = controls.EnhancedRelatedDataPortletSection = controls.EnhancedRelatedDataPortletSection || new T1_C2_Shell_Controls_EnhancedRelatedDataPortletSection();

    shell.ControlInitialiser.AddControl('EnhancedRelatedDataPortletSection', publicEnhancedRelatedDataPortletSection.Initialise);

    function T1_C2_Shell_Controls_EnhancedRelatedDataPortletSection() {

        function T1_C2_Shell_Controls_EnhancedRelatedDataPortletSection_Public() { }

        T1_C2_Shell_Controls_EnhancedRelatedDataPortletSection_Public.prototype = {
            Initialise: Initialise
        };

        function Initialise(control) {
            control.addClass('initialised');
        }

        /*
        The eventData data object has the following properties:
        - ActionName - as specified in the controller
        - SyncKeys - array of objects {SyncKey,Value}
        - HierarchyLevel - the hierarchycal level if the actioned item was within a hierarchical view
        - Data - array of <key, value> set as Parameters to the clientRowAction item 
        */
        $(document).delegate('body', 'Event.CustomRowAction', function (event, eventData) {
            switch (eventData.ActionName) {
                case "CustomRowActionForWorkflow":
                    controls.WorkflowActivityButton.ActivityButtonClicked(undefined, { Parameters: eventData.Data }, eventData.FormData);
                    break;
            }
        });

        $(document).ready(function () {

            // Workflow Activity Button Event Handlers
            if ($('[data-t1-control-type*="Form"]').hasClass('enquiryForm')) {
                $(document).delegate('[data-t1-control-type*="Form"]', 'WorkflowActivityComplete', function () {
                    $('#SearchButton').click();
                });
            }
            
            // Add Save Capability on the Super Grid Data Entry
            $(document).delegate('body', 'Form.DataReadSuccessfully', function () {
                clearDataChangeForSuperGrid();
            });

            function clearDataChangeForSuperGrid() {
                // stop the save button from showing the unsaved changes popup
                var button = $("button.GridEntrySaveButton");
                button.click(function () {
                    control = $(this).closest('.relatedDataPortletSection');
                    if (control != null && control.hasClass("dataChanged")) {
                        control.removeClass("dataChanged");
                    }
                });
            }

        });

        return new T1_C2_Shell_Controls_EnhancedRelatedDataPortletSection_Public();
    }
} ());

/// <reference path="~/Content/Scripts/DevIntellisense.js"/>

(function (undefined) {
    var t1 = window.T1 = window.T1 || {},
        c2 = t1.C2 = t1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {};
    if (controls.Shared == undefined) controls.Shared = {};
    controls.Shared.EnhancedThumbnailViewer = controls.Shared.EnhancedThumbnailViewer || new T1_C2_Shell_Controls_Shared_EnhancedThumbnailViewer();

    function T1_C2_Shell_Controls_Shared_EnhancedThumbnailViewer() {

        var ThumbnailTypes = {
            EditModeSearchResult: 0,
            EditModeSearchRowActionPopup: 1
        };
        
        function getCriterionIndex(criteriaFields, fieldId) {
            if (criteriaFields && fieldId != "") {
                var numCriteria = criteriaFields.length;
                for (var i = 0; i < numCriteria; ++i) {
                    if (criteriaFields[i].FieldName == fieldId) {
                        return i;
                    }
                }
            }
            return -1;
        }
        
        function T1_C2_Shell_Controls_Shared_EnhancedThumbnailViewer_Public() { }

        /// Interface declarations
        T1_C2_Shell_Controls_Shared_EnhancedThumbnailViewer_Public.prototype = {
            RequestThumbnailData: RequestThumbnailData,
            ThumbnailTypes: ThumbnailTypes
        };

        function RequestThumbnailData(tabName, $thumbnailViewer, searchValue, displayFields, extraAnalyserCriteria, formData, callback, thumbnailType, overrideRowAction, analyserItemServiceName) {

            var predefinedCriteriaFields = $thumbnailViewer.data('t1-control').PredefinedCriteriaFields,
                criteriaFields = predefinedCriteriaFields ? predefinedCriteriaFields.slice() : [];

            if (extraAnalyserCriteria && extraAnalyserCriteria.length > 0) {
                var numExtraAnalyserCriteria = extraAnalyserCriteria.length;
                for (var i = 0; i < numExtraAnalyserCriteria; ++i) {
                    var index = getCriterionIndex(criteriaFields, extraAnalyserCriteria[i].FieldName);
                    if (index != -1) {
                        //replace
                        if (extraAnalyserCriteria[i].Value1 == "" || extraAnalyserCriteria[i].Value1 == "0") {
                            criteriaFields.splice(index, 1);
                        } else {
                            criteriaFields[index] = extraAnalyserCriteria[i];
                        }
                    } else {
                        //Add a new one
                        if (extraAnalyserCriteria[i].Value1 != "" && extraAnalyserCriteria[i].Value1 != "0") {
                            criteriaFields.push(extraAnalyserCriteria[i]);
                        }
                    }
                }
            }

            var thumbnailViewerData = $thumbnailViewer.data('t1-control');
            thumbnailViewerData.Request = thumbnailViewerData.Request || {};

            var request = {
                CriteriaFields: criteriaFields,
                DisplayFields: [],
                SearchValue: searchValue, //Criteria are only used to perform the search
                FormData: formData,
                TabName: tabName,
                RequestData: {
                    AnalyserItemServiceName: analyserItemServiceName,
                    ThumbnailType: thumbnailType,
                    OverrideRowAction: overrideRowAction,
                    FormType: controls.Shared.FormUtils.GetFormType()
                }
            };

            controls.ThumbnailViewer.Refresh($thumbnailViewer, request, true, {
                successCallback: function (result) {
                    if (callback) callback(result);
                },
                resizeThumbnailViewer: false
            });
        }

        return new T1_C2_Shell_Controls_Shared_EnhancedThumbnailViewer_Public();
    }
}());

/// <reference path="~/Content/Scripts/DevIntellisense.js"/>

(function (undefined) {
    var t1 = window.T1 = window.T1 || {},
        c2 = t1.C2 = t1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {};
    if (controls.Shared == undefined) controls.Shared = {};
    controls.Shared.FormUtils = controls.Shared.FormUtils || new T1_C2_Shell_Controls_Shared_FormUtils();

    var utilities = c2.Utilities = c2.Utilities || {};

    function T1_C2_Shell_Controls_Shared_FormUtils() {

        // This should be the same as the CriteriaOperations in CriteriaOperators.cs in CoreLib.Compatibility.AnalyserItems
        var CriteriaOperators =
            {
                Unknown: 0,
                Equals: 1,
                LessThan: 2,
                GreaterThan: 3,
                LessThanEquals: 4,
                GreaterThanEquals: 5,
                NotEquals: 6,
                Like: 7,
                NotLike: 8,
                Soundex: 9,
                OneOf: 10,
                NotOneOf: 11,
                Between: 12,
                NotBetween: 13,
                Empty: 14,
                NotEmpty: 15,
                Contains: 16,
                NotContains: 17,
                EndsWith: 18,
                NotEndsWith: 19
            };
        
        function indexOfFormDataField(formData, fieldName) {
            var numFields = formData.Fields.length;
            for (var i = 0; i < numFields; ++i) {
                if (formData.Fields[i].FieldName == fieldName) return i;
            }
            return -1;
        }
        
        function T1_C2_Shell_Controls_Shared_FormUtils_Public() { }

        /// Interface declarations
        T1_C2_Shell_Controls_Shared_FormUtils_Public.prototype = {
            CheckNotificationsForErrors: CheckNotificationsForErrors,
            ConvertRowSyncKeysToFormDataSyncFields: ConvertRowSyncKeysToFormDataSyncFields,
            CreateAnalyserCriteria: CreateAnalyserCriteria,
            AnalyserCriteriaOperators: CriteriaOperators,
            GetCurrentTab: GetCurrentTab,
            GetCurrentTabName: GetCurrentTabName,
            GetFieldIdsFromFormData: GetFieldIdsFromFormData,
            GetFormType: GetFormType,
            IncludeSyncKeysInFormData: IncludeSyncKeysInFormData,
            MergeFormDataFields: MergeFormDataFields,
            SetAssumeStateFor: SetAssumeStateFor,
            ShowFunction: ShowFunction,
            ReplaceDivs: ReplaceDivs,
            ExecuteRequest: ExecuteRequest
        };

        function CheckNotificationsForErrors(notifications) {
            if (!notifications || notifications.length === 0) return false;
            for (var i = 0, len = notifications.length; i < len; ++i) {

                if (notifications[i].NotificationType.toString().toLowerCase() + "" == '2' || notifications[i].NotificationType.toString().toLowerCase() + "" == 'error') {
                    return true;
                }
            }
            return false;
        }

        function ConvertRowSyncKeysToFormDataSyncFields(syncKeys) {
            var syncFields = {};
            var numSyncKeys = syncKeys.length;
            for (var i = 0; i < numSyncKeys; ++i) {
                var syncKeyFieldName = syncKeys[i].SyncKey.split('.')[1];
                syncFields[syncKeyFieldName] = syncKeys[i].Value;
            }
            return syncFields;
        }

        function CreateAnalyserCriteria(fieldName, fieldValue, criteriaOperator) {
            return {
                FieldName: fieldName,
                Operator: criteriaOperator,
                Value1: fieldValue
            };
        }

        function GetCurrentTab() {
            return controls.LinkedTab.GetDisplayedTabControl($('#TabsContainer'));
        }
        
        function GetCurrentTabName() {
            return controls.LinkedTab.GetSelectedTabName($('#TabsContainer'));
        }

        function GetFieldIdsFromFormData(formData) {
            var fieldIds = [],
                numFields = formData.Fields.length;
            for (var i = 0; i < numFields; ++i) {
                fieldIds.push({
                    FieldName: formData.Fields[i].FieldName
                });
            }
            return fieldIds;
        }

        function GetFormType() {
            return $('[data-t1-control-type*="Form"]').data('t1-control-type').replace('Form ', '');
        }
        
        function IncludeSyncKeysInFormData(syncKeys, formData) {
            var numSyncKeys = syncKeys.length;
            for (var i = 0; i < numSyncKeys; ++i) {
                var syncKey = syncKeys[i],
                    fieldNameWithoutPrefix = syncKey.SyncKey.split('.')[1],
                    syncKeyFieldName = "SyncKey_" + fieldNameWithoutPrefix,
                    formDataFieldIndex = indexOfFormDataField(formData, syncKeyFieldName);

                if (formDataFieldIndex == -1) {
                    formData.Fields.push({
                        FieldName: syncKeyFieldName,
                        Value: syncKey.Value
                    });
                } else {
                    formData.Fields[formDataFieldIndex].Value = syncKey.Value;
                }
            }
        }

        function MergeFormDataFields(from, to, overwriteAlreadyExistingField) {
            if (from && to) {
                var numFromFields = from.Fields.length;
                if (numFromFields > 0) {
                    for (var i = 0; i < numFromFields; i++) {
                        var fromField = from.Fields[i],
                            formDataFieldIndex = indexOfFormDataField(to, fromField.FieldName);

                        if (formDataFieldIndex == -1) {
                            to.Fields.push(fromField);
                        } else {
                            if (overwriteAlreadyExistingField) {
                                to.Fields[formDataFieldIndex].Value = fromField.Value;
                            }
                        }
                    }
                }
            }
        }

        function SetAssumeStateFor(syncData) {
            controls.PageSync.LoadFor(syncData.FunctionName);

            // if actionData has parameters, write them to the field map
            var fieldMap = {};
            for (var syncFieldName in syncData.SyncFields) {
                fieldMap[syncFieldName] = syncData.SyncFields[syncFieldName];
            }

            if (syncData.Parameters) {
                for (var paramName in syncData.Parameters) {
                    if (!fieldMap.hasOwnProperty[paramName]) {
                        fieldMap[paramName] = syncData.Parameters[paramName];
                    }
                }
            }

            var assumeState = controls.PageSync.GetNewAssumeState();
            assumeState.FieldMap = fieldMap;

            assumeState.SourceContext = T1.Environment.Context;
            assumeState.SourceContext.Url = window.location.href;

            assumeState.FunctionMode = syncData.MaintenanceMode;
            assumeState.SelectedTab = syncData.SelectedTab;
            assumeState.SearchValue = syncData.SearchValue;

            controls.PageSync.SetAssumeState(assumeState);
            controls.PageSync.Save();
        }

        function ShowFunction(functionName, hash, expiryTime) {
            var url = T1.Environment.Paths.RootEnvironmentUrl + 'Workplace/' + T1.Environment.Paths.RootController + '/RedirectToFunction?f=' + encodeURIComponent(functionName) + '&h=' + hash + '&t=' + expiryTime;
            url = url + '&suite=' + T1.Environment.Context.Suite.Name;
            document.location = url;
        }

        function ReplaceDivs(response, controllerAction, options) {

            var hasReplaceDivItems = !utilities.IsNull(response) && !utilities.IsNull(response.ReplaceDivs) && !utilities.IsNullOrEmpty(response.ReplaceDivs.Items);
            if (!hasReplaceDivItems) return;

            replaceDivTriggeredByThis = true;

            if (controls.MaintenanceForm) {
                controls.MaintenanceForm.ReplaceDivsSelectTab(response, response.SelectedTabName, controllerAction, options.RequestNumber);
            }
        }

        function ExecuteRequest(request, successCallback, ajaxActionOverride, showLoader, callbackBeforeReplaceDiv) {

            var options = {};

            if (request.TabName) {
                var tabNames = request.TabName.split('|');
                var currentTabName = tabNames[tabNames.length - 1];
                var currentRequestNumber = $('#' + currentTabName).data('Rendered-Request-Number');
                options.RequestNumber = ++currentRequestNumber;
            }

            // Clear notifications
            controls.Notification.Clear();

            // Store the scroll position of the editable panel so we can restore it in the callback if the panel is being replace.
            var $tabsContainer = $('#TabsContainer');
            var scrollPosition = 0
                , $scrollablePanel = null;

            if ($tabsContainer.length > 0) {
                $scrollablePanel = GetCurrentTab().children('.editablePanel.scrollContent').children('.content');
                scrollPosition = $scrollablePanel.scrollTop();
            }

            if (!ajaxActionOverride) ajaxActionOverride = "SectionAction";

            var callback = function (result) {
                // Shell.Ajax has a default handler to display messages, we want to handle them in our form so this will prevent it from processing twice.
                result.MessagesHandled = true;

                // Hide the Overlay.
                controls.Overlay.Close();

                // Handle the Messages and return if there were any Errors in them.
                if (!controls.Notification.HandleNotifications(result.Messages)) {
                    if (successCallback) {
                        successCallback(result);
                    }
                    return false;
                }

                // Close the Contextual Keys Panel
                if (!T1.IsPhone) controls.ContextualKeys.HideContextualKeys();

                if (callbackBeforeReplaceDiv) callbackBeforeReplaceDiv();

                ReplaceDivs(result, ajaxActionOverride, options);

                // Restore the scroll position of the editable panel
                if ($tabsContainer.length > 0) {
                    $scrollablePanel.scrollTop(scrollPosition);
                }

                if (successCallback) {
                    successCallback(result);
                }
                return true;
            };

            T1.C2.Shell.Ajax({
                type: 'POST',
                url: T1.Environment.Paths.Controller + ajaxActionOverride,
                data: JSON.stringify(request),
                contentType: 'application/json',
                dataType: 'json',
                ShowLoader: showLoader,
                success: callback
            });
        }

        return new T1_C2_Shell_Controls_Shared_FormUtils_Public();
    }
}());

(function (undefined) {

    var T1 = window.T1 = window.T1 || {},
        c2 = T1.C2 = T1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicFurtherInformation = controls.FurtherInformation = controls.FurtherInformation || new T1_C2_Shell_Controls_FurtherInformation();

    shell.ControlInitialiser.AddControl('FurtherInformation', publicFurtherInformation.Initialise);

    function T1_C2_Shell_Controls_FurtherInformation() {

        function T1_C2_Shell_Controls_FurtherInformation_Public() { }

        T1_C2_Shell_Controls_FurtherInformation_Public.prototype = {
            Initialise: Initialise
        };

        function Initialise(control) {
            control.addClass('initialised');

            if (!publicFurtherInformation.GlobalEventsBound) {
                publicFurtherInformation.GlobalEventsBound = true;
                $(document).delegate('.furtherInformation .expandoText', T1.FastClick, function (e) {
                    e.preventDefault();

                    var $furtherInformationPanel = $(this).closest('.furtherInformation');

                    var furtherInformationPanelHeightBeforeAction = $furtherInformationPanel.outerHeight(true);

                    if ($furtherInformationPanel.hasClass('collapsed')) {
                        $furtherInformationPanel.removeClass('collapsed');
                    } else {
                        $furtherInformationPanel.addClass('collapsed');
                    }

                    var furtherInformationPanelHeightAfterAction = $furtherInformationPanel.outerHeight(true);

                    var $rdp = $furtherInformationPanel.closest('.relatedDataPortletSection').find('.relatedDataPortlet');
                    if ($rdp.length > 0) {
                        var newRdpHeight = 0,
                            informationPanelHeightDifference = 0;

                        var currentRdpHeight = $rdp.outerHeight(true);
                        if ($furtherInformationPanel.hasClass('collapsed')) {
                            informationPanelHeightDifference = furtherInformationPanelHeightBeforeAction - furtherInformationPanelHeightAfterAction;
                            newRdpHeight = currentRdpHeight + informationPanelHeightDifference;
                        } else {
                            informationPanelHeightDifference = furtherInformationPanelHeightAfterAction - furtherInformationPanelHeightBeforeAction
                            newRdpHeight = currentRdpHeight - informationPanelHeightDifference;
                        }

                        T1.C2.Shell.Controls.RelatedDataPortlet.Resize($rdp, newRdpHeight);
                    }
                });
            }
        }
        
        return new T1_C2_Shell_Controls_FurtherInformation_Public();
    }
}());

(function (undefined) {

    var T1 = window.T1 = window.T1 || {},
        c2 = T1.C2 = T1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicIdentificationPanel = controls.IdentificationPanel = controls.IdentificationPanel || new T1_C2_Shell_Controls_IdentificationPanel();

    shell.ControlInitialiser.AddControl('IdentificationPanel', publicIdentificationPanel.Initialise);

    function T1_C2_Shell_Controls_IdentificationPanel() {



        function T1_C2_Shell_Controls_IdentificationPanel_Public() { }
        T1_C2_Shell_Controls_IdentificationPanel_Public.prototype = {
            Initialise: Initialise
        };

        function Initialise(control) {
            control.addClass('initialised');
        }

        return new T1_C2_Shell_Controls_IdentificationPanel_Public();
    }
} ());

(function (undefined) {

    var T1 = window.T1 = window.T1 || {},
        c2 = T1.C2 = T1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicQuickEnquiryPopupForm = controls.QuickEnquiryPopupForm = controls.QuickEnquiryPopupForm || new T1_C2_Shell_Controls_QuickEnquiryPopupForm();

    shell.ControlInitialiser.AddControl('QuickEnquiryPopupForm', publicQuickEnquiryPopupForm.Initialise);

    function T1_C2_Shell_Controls_QuickEnquiryPopupForm() {
        
        var autoRetrievalTimeout = undefined,
            clickedCreateNewWhenSearchShouldBeDoneFirst = false,
            createNewValidationMessage = '',
            $currentFocusedField = undefined,
            _bodyObj = undefined;

        function ExecuteRequest(request, successCallback, mvcActionName) {
            T1.C2.Shell.Ajax({
                type: 'POST',
                url: T1.Environment.Paths.Controller + mvcActionName,
                data: JSON.stringify(request),
                contentType: 'application/json',
                dataType: 'json',
                ShowLoader: true,
                success: successCallback,
                beforeSend: function() {
                    var searchResultContainerPanel = $('#QuickEnquiryPopup').find('.searchResultContainer');
                    if (searchResultContainerPanel) {
                        controls.DurationSpinner.ShowHideOverlay(searchResultContainerPanel, true, undefined, true);
                    }
                }
            });
        }

        function SetRowActionAssumeStateFor(syncKeys, actionData) {
            if (!actionData) return;

            controls.PageSync.LoadFor(actionData.FunctionName);
            // if actionData has parameters, write them to the field map
            var fieldMap = {};
            for (var param in actionData.Parameters) {
                fieldMap[param] = actionData.Parameters[param];
            }
            // set sync keys as parameters for the new function
            var syncFieldMap = {};
            if(syncKeys){
                $(syncKeys).each(function (index, elem) {
                    // the parameters defined by the product developer should take precedence over the sync keys values - if they are defined, do not set the syncFieldMap
                    if (fieldMap[elem.FieldName] == undefined)
                        syncFieldMap[elem.SyncKey] = elem.Value;
                });
            }

            var assumeState = controls.PageSync.GetNewAssumeState();
            assumeState.FieldMap = fieldMap;
            assumeState.SyncFieldMap = syncFieldMap;
            assumeState.FunctionMode = actionData.MaintenanceOpenMode;
            assumeState.SelectedTab = actionData.SelectedTab;
            assumeState.SearchValue = actionData.SearchValue;
            if(actionData.NavigationOptions){
                assumeState.FunctionConfig = actionData.NavigationOptions.TargetFunctionConfig;
            }
            // save the parameters also in case we have enquiry-to-enquiry navigation
            //assumeState.Parameters = GetParameterValues();
            assumeState.UseDefaultView = true;
            controls.PageSync.SetAssumeState(assumeState);
            controls.PageSync.Save();
        }

        function ShouldPerformSearch(oldFormDataFields, newFormDataFields) {
            var oldFormDataFieldsLength = oldFormDataFields.length;

            if (oldFormDataFieldsLength == 0) {
                //do the new fields hold any keyed criteria?
                var newFormDataFieldsLength = newFormDataFields.length;
                for (var idx = 0; idx < newFormDataFieldsLength; ++idx) {
                    if (newFormDataFields[idx].Value != '' && newFormDataFields[idx].Value != '0') return true;
                }
                return false;
            }
            for (var i = 0; i < oldFormDataFieldsLength; ++i) {
                var oldField = oldFormDataFields[i];
                var newField = $.grep(newFormDataFields, function (newFormDataField, i) {
                    return newFormDataField.FieldName == oldField.FieldName;
                })[0];

                if ((newField.Value != '') && (newField.Value != oldField.Value)) return true;
            }
            return false;
        }

        function convertFormDataFieldsToAnalyserCriteria(formData) {
            var formDataFields = formData.Fields,
                numFormDataFields = formDataFields.length,
                criteriaFields = [];

            for (var i = 0; i < numFormDataFields; i++) {
                if (formDataFields[i].Value !== "" && formDataFields[i].Value !== "0") {
                    criteriaFields.push(controls.Shared.FormUtils.CreateAnalyserCriteria(formDataFields[i].FieldName, formDataFields[i].Value, controls.Shared.FormUtils.AnalyserCriteriaOperators.Equals));
                }
            }
            return criteriaFields;
        }

        function PerformSearchWithCurrentCriteria(callback, forceSearch) {
            $('#QuickEnquiryPopup').find('.noResultMessage').hide();

            var popupFormData = T1.C2.Shell.Controls.Form.GetFormData({ Context: $('#QuickEnquiryPopup') }),
                displayFields = [],
                criteriaFields = convertFormDataFieldsToAnalyserCriteria(popupFormData);
            RequestThumbnailData(displayFields, criteriaFields, popupFormData, callback, forceSearch);
            controls.Overlay.Close();
            var durationSpinner = $('#QuickEnquiryPopup').closest('.durationSpinner .initialised');
            if (durationSpinner) {
                controls.DurationSpinner.Stop(durationSpinner, undefined, true);
            }
        }

        function CreateFunctionUrlFromRowActionData(rowActionData) {
            return T1.Environment.Paths.RootEnvironmentUrl +
                'Workplace/' + T1.Environment.Paths.RootController +
                '/RedirectToFunction?f=' + encodeURIComponent(rowActionData.FunctionName) +
                '&h=' + rowActionData.Hash +
                '&t=' + rowActionData.ExpiryTime +
                '&suite=' + T1.Environment.Context.Suite.Name;
        }

        //displayFields should include all criteriaFields
        function RequestThumbnailData(displayFields, criteriaFields, formData, callback, forceSearch) {
            controls.Notification.Clear();
            var $popup = $('#QuickEnquiryPopup'),
                $hintTextInSearchResult = $popup.find('.hintTextInSearchResult'),
                $thumbnailViewer = $popup.find('.thumbnailViewControl'),
                thumbnailViewerControlData = $thumbnailViewer.data('t1-control');

            var oldFormDataFields = $popup.data('t1-prev-form-data-fields');
            var newFormDataFields = controls.Form.GetFormData({ Context: $popup }).Fields;
            $popup.data('t1-prev-form-data-fields', newFormDataFields);

            if (ShouldPerformSearch(oldFormDataFields, newFormDataFields) || forceSearch) {
                $popup.find('.searchResult').show();
                $hintTextInSearchResult.hide();

                if (criteriaFields.length > 0) {
                    if (typeof thumbnailViewerControlData.RequestData == "undefined") {
                        thumbnailViewerControlData.RequestData = {};
                    }
                    //This value is used in PubSetParametersAndCriteria() of DataEntryBaseController.cs
                    //to distinguish whether the ValueObjectToBeMergedToSaveRequestItem is a unique field search or a multi-fields search
                    thumbnailViewerControlData.RequestData.UniqueValueSearch = true;
                } else {
                    if (typeof thumbnailViewerControlData.RequestData != "undefined") {
                        thumbnailViewerControlData.RequestData = {};
                    }
                }
                // Cancel current request to create new request
                $.ajaxQ.abortCurrent();

                controls.ThumbnailViewer.Refresh($thumbnailViewer, {
                    CriteriaFields: criteriaFields,
                    DisplayFields: displayFields,
                    SearchValue: "", //Criterias are only used to perform the search
                    FormData: formData
                }, true, {
                    resizeThumbnailViewer: false,
                    successCallback: function (result) {
                        if (clickedCreateNewWhenSearchShouldBeDoneFirst) {
                            clickedCreateNewWhenSearchShouldBeDoneFirst = false;
                            if (result.Items.length == 0) {
                                $('#QuickEnquiryPopup .createNewButton').trigger(T1.FastClick);
                            } else {
                                // Display a message
                                controls.Notification.AddNotifications([{
                                    Message: createNewValidationMessage,
                                    NotificationType: 'Information'
                                }]);
                            }
                        } else {
                            if (callback) {
                                callback();
                            }
                        }
                    }
                });

                if ($currentFocusedField != undefined) {
                    $currentFocusedField.focus();
                }
                
                var searchResultContainerPanel = $popup.find('.searchResultContainer');
                if (searchResultContainerPanel) {
                    controls.DurationSpinner.ShowHideOverlay(searchResultContainerPanel, true, undefined, true);
                }
            }
        }

        function UpdateSearchResult(jsonData) {
            var $popup = $('#QuickEnquiryPopup'),
                $searchResultCount = $popup.find(' .searchResultCount'),
                $searchResultTotalCount = $popup.find('.totalCount');

            var searchResultContainerPanel = $popup.find('.searchResultContainer');
            if (searchResultContainerPanel) {
                controls.DurationSpinner.ShowHideOverlay(searchResultContainerPanel, false);
            }

            if (jsonData.TotalRecordCount > 0) {
                $searchResultCount.css({ 'display': 'inline-block' });
                var $countBeingShown = $($searchResultCount).find('.countBeingShown');
                setTimeout(function () {
                    var $tagToApplyAnimation = (parseInt($searchResultTotalCount.html()) == jsonData.TotalRecordCount) ? $countBeingShown : $searchResultCount;
                    $searchResultTotalCount.html(jsonData.TotalRecordCount);
                    $countBeingShown.html($popup.find('.thumbnailViewContainer .thumbnailItem').length);
                    $tagToApplyAnimation.addClass('updated').bind('transitionend', function () {
                        $tagToApplyAnimation.unbind('transitionend');
                        $tagToApplyAnimation.removeClass('updated');
                    });
                }, 100);
            } else {
                $searchResultCount.hide();
            }
        }		

        function HandleFormFieldChangeFocusout() {
            if($currentFocusedField.parents('div').hasClass('noAutoSearchField')){
                var $popup = $('#QuickEnquiryPopup'),
                    newFormDataFields = controls.Form.GetFormData({ Context: $popup }).Fields;
                // Update the form data if it is not an auto-search field
                $popup.data('t1-prev-form-data-fields', newFormDataFields);
            }
            else{
                setTimeout(function () {
                    PerformSearchWithCurrentCriteria(function () {
                        $currentFocusedField.focus();
                    }, false);
                }, 150);
            }
        }

        function T1_C2_Shell_Controls_QuickEnquiryPopupForm_Public() { }

        T1_C2_Shell_Controls_QuickEnquiryPopupForm_Public.prototype = {
            Initialise: Initialise
        };

        function Initialise(control) {
            control.addClass('initialised');

            var $quickEnquiryPopup = control.find('#QuickEnquiryPopup'),
                $allFields = $quickEnquiryPopup.find('.formControl'),
                $dummyRdp = $quickEnquiryPopup.find('.relatedDataPortlet');

            _bodyObj = $('body');
            
            $quickEnquiryPopup.data('t1-prev-form-data-fields', []);
            createNewValidationMessage = $('#QuickEnquiryPopupForm').data('t1-create-new-information-message');

            // Handle the dropdown (change event is triggered by Textbox.js)
            $allFields.bind('change', function (event) {
                HandleFormFieldChangeFocusout();
            });

            $allFields.focusin(function () {
                $currentFocusedField = $(this);
            });

            // Handle normal textboxes
            $allFields.focusout(function () {
                HandleFormFieldChangeFocusout();
            });

            if ($quickEnquiryPopup.length > 0) {
                var $dummyElement = $('<div>');
                $dummyRdp.data('t1-control', {
                    ActiveView: 0,
                    ViewsPanel: $dummyElement,
                    NoSearchViewPanel: $quickEnquiryPopup.find('.noSearchView'),
                    NoResultsViewPanel: $quickEnquiryPopup.find('.noResultsView'),
                    ItemsCount: 0,
                    Views: [{
                        ViewObject: {}
                    }],
                    ActionBar: $('<div class="actionBar"><div class="resultsInfoText"><div class="resultsRange"></div><div class="resultsAction"></div></div></div>')
                });
                controls.RelatedDataPortlet.EnableNoSearchViewPanel($dummyRdp, true);
            }

            // Make the search dropdown orange
            $quickEnquiryPopup.find('.dropdownControl').find('.defaultAction, .handle').addClass('primary');

            if (control.data('t1-control').InsertFieldSeperatorBefore) {
                var $fieldsSeperator = $('<div class="fieldsSeperator">Or</div>');
                $fieldsSeperator.insertBefore($('#' + control.data('t1-control').InsertFieldSeperatorBefore).closest('.controlContainer'));
            }

            if (control.data('t1-control').AutoRetrievalTimeout) {
                ActivateAutoRetrieval(control.data('t1-control').AutoRetrievalTimeout);
            }

            control.find('.categoryPanels').scroll(function (e) {
                var $scrollPanel = $(this),
                    $fieldsSection = $scrollPanel.closest('.fieldsSection');

                var isScrollBarAtTheBottom = $scrollPanel[0].scrollHeight - $scrollPanel.scrollTop() == $scrollPanel.height();
                if (isScrollBarAtTheBottom) {
                    $fieldsSection.find('.bottomShadow').hide();
                } else {
                    $fieldsSection.find('.bottomShadow').show();
                }

                var isScrollBarAtTheTop = $scrollPanel.scrollTop() > 0;
                if (isScrollBarAtTheTop) {
                    $fieldsSection.find('.topShadow').show();
                } else {
                    $fieldsSection.find('.topShadow').hide();
                }
            });

            UpdateFieldsSectionScrollbar($quickEnquiryPopup);

            // Auto Size all TextBox Controls (including ones on the Repeating Panel Item Template) to the size of their Parent.
            var textBoxes = $quickEnquiryPopup.find('.fieldsSection').find('.textBoxControlInput');
            for (var i = 0, numTextBoxes = textBoxes.length; i < numTextBoxes; ++i) {
                controls.Textbox.AutoSizeToParent(textBoxes.eq(i));
            }

            _bodyObj.removeClass('screenLoading');
        }

        function UpdateFieldsSectionScrollbar($quickEnquiryPopup) {
            var $fieldsSection = $quickEnquiryPopup.find('.fieldsSection'),
                $categoryPanel = $fieldsSection.find('.categoryPanels');

            $fieldsSection.find('.topShadow').hide();
            $fieldsSection.find('.bottomShadow').hide();

            if ($categoryPanel.length > 0) {
                if ($categoryPanel[0].scrollHeight > $categoryPanel.height()) {
                    if ($categoryPanel.scrollTop() > 0) {
                        $fieldsSection.find('.topShadow').show();
                        $fieldsSection.find('.bottomShadow').hide();
                    } else {
                        $fieldsSection.find('.topShadow').hide();
                        $fieldsSection.find('.bottomShadow').show();
                    }
                }
            }
        }

        function ActivateAutoRetrieval(autoRetrievalTimeoutToSet) {
            $(document).delegate('#QuickEnquiryPopup input', 'keyup', function () {

                if (autoRetrievalTimeout != undefined) {
                    clearTimeout(autoRetrievalTimeout);
                }

                autoRetrievalTimeout = setTimeout(function () {
                    PerformSearchWithCurrentCriteria(function () {
                        $currentFocusedField.focus();
                        if ($currentFocusedField.hasClass("autoSelectValueAfterSearch")) {
                            $currentFocusedField.select();
                        }

                        // If barcode field, and only one result returned select its primary action
                        if ($currentFocusedField.attr("id").indexOf("IdCardBarcodeNumber") > -1) {
                            var $thumbnailViewer = $('#QuickEnquiryPopup').find('.thumbnailViewControl');
                            if ($thumbnailViewer.data('t1-control').TotalRecordCount === 1) {
                                $thumbnailViewer.find(".defaultAction").trigger(T1.FastClick);
                            }
                        }
                    }, false);
                    return true;
                }, autoRetrievalTimeoutToSet);
            });
        }

        function ClearContent() {
            var $popup = $('#QuickEnquiryPopup');
            $popup.find('.thumbnailItemsContainer').html('');
            $popup.find('.dataEntryPanel .editorField select,.dataEntryPanel .editorField input').each(function () {
                var $inputTag = $(this);
                if ($inputTag.data('t1-values-value')) {
                    $inputTag.data('t1-values-value', '');
                    $inputTag.val('');
                }
            });
            $popup.find('.searchResultCount').removeAttr('style');
            $popup.data('t1-prev-form-data-fields', "");

            controls.RelatedDataPortlet.EnableNoSearchViewPanel($popup.find('.relatedDataPortlet'), true);
        }

        // AjaxQ jQuery Plugin
        // Copyright (c) 2012 Foliotek Inc.
        // MIT License
        // https://github.com/Foliotek/ajaxq
        $.ajaxQ = (function () {
            var id = 0, q = [];

            $(document).ajaxSend(function(e, jqx, setings) {
                var $quickEnquiryPopup = $('#QuickEnquiryPopup');
                if ($quickEnquiryPopup.length > 0 && setings.url.indexOf('ReadMoreThumbnailData') !== -1) {
                    jqx._id = id++;
                    q.push(jqx);
                }
            });

            $(document).ajaxComplete(function(e, jqx, setings) {
                var $quickEnquiryPopup = $('#QuickEnquiryPopup');
                if ($quickEnquiryPopup.length > 0 && setings.url.indexOf('ReadMoreThumbnailData') !== -1) {
                    for (var i = q.length - 1; i >= 0; i--) {
                        if (q[i]._id == jqx._id) {
                            q.splice(i, 1);
                        }
                    }
                }
            });

            return {
                abortCurrent: function() {
                    $.each(q,
                        function(i, jqx) {
                            if (jqx.readyState !== 4) {
                                jqx.abort();
                            }
                        });
                    var searchResultContainerPanel = $('#QuickEnquiryPopup').find('.searchResultContainer');
                    if (searchResultContainerPanel) {
                        controls.DurationSpinner.ShowHideOverlay(searchResultContainerPanel, false);
                    }
                }
            };
        })();

        $(window).resize(function () {
            var $quickEnquiryPopup = $('#QuickEnquiryPopup');
            if ($quickEnquiryPopup.length > 0) {

                UpdateFieldsSectionScrollbar($quickEnquiryPopup);
            }
        });

        $(document).delegate('body', 'ThumbnailViewer.RetrievedMoreData', function (event) {
            var $quickEnquiryPopup = $('#QuickEnquiryPopup');
            if ($quickEnquiryPopup.length > 0) {
                if (event.Data.Items.length == 0) {
                    $quickEnquiryPopup.find('.noResultMessage').show();
                    $quickEnquiryPopup.find('.thumbnailViewControl').hide();
                } else {
                    $quickEnquiryPopup.find('.noResultMessage').hide();
                    $quickEnquiryPopup.find('.thumbnailViewControl').show();
                }

                UpdateSearchResult(event.Data);
            }
        });

        $(document).delegate('#QuickEnquiryPopup [data-t1-control-id="QuickEnquirySearchButton"], #QuickEnquiryPopup .popupMultiFieldsActions .quickEnquirySearchButton', T1.FastClick, function () {
            PerformSearchWithCurrentCriteria(undefined, true);
        });

        $(document).delegate('#QuickEnquiryPopup .thumbnailItem .dropdownPanel li a', T1.FastClick, function () {
            var $thumbnailItemData = $(this).closest('.thumbnailItem').data('t1-control'),
                rowActionData = $(this).parent().data('t1-control');
            SetRowActionAssumeStateFor($thumbnailItemData.SyncKeys, rowActionData);

            document.location = CreateFunctionUrlFromRowActionData(rowActionData);
        });

        $(document).delegate('#QuickEnquiryPopup .createNewButton', T1.FastClick, function () {
            controls.Notification.Clear();

            var oldFormDataFields = $('#QuickEnquiryPopup').data('t1-prev-form-data-fields');
            var newFormDataFields = controls.Form.GetFormData({ Context: $('#QuickEnquiryPopup') }).Fields;
            if (ShouldPerformSearch(oldFormDataFields, newFormDataFields) && oldFormDataFields.length > 0) {
                clickedCreateNewWhenSearchShouldBeDoneFirst = true;
            } else {
                var request = {
                    FormData: T1.C2.Shell.Controls.Form.GetFormData({ Context: $('#QuickEnquiryPopup') })
                };
                ExecuteRequest(request, function (result) {

                    var $quickEnquiryPopup = $('#QuickEnquiryPopup');                    

                    // Handle the Messages and return if there were any Errors in them.
                    if (!controls.Notification.HandleNotifications(result.Messages)) {
                        controls.DurationSpinner.ShowHideOverlay($('#QuickEnquiryPopup').find('.searchResultContainer'), false);                        
                        $quickEnquiryPopup.find('.createNewButton').removeAttr('disabled');
                        return;
                    }

                    //Get the row action info from the thumbnail item
                    var thumbnailViewerData = $quickEnquiryPopup.find('.thumbnailViewControl').data('t1-control');
                    
                    var actionData = thumbnailViewerData.ItemActionMenu 
                    && thumbnailViewerData.ItemActionMenu.length === 1 
                        ? thumbnailViewerData.ItemActionMenu[0] : {};
                    
                    var syncKeys = [];
                    var numFields = result.FormData.Fields.length;
                    for (var i = 0; i < numFields; i++) {
                        var field = result.FormData.Fields[i];
                        syncKeys.push({
                            FieldName: field.FieldName,
                            SyncKey: field.SyncKey,
                            Value: field.Value
                        });
                    }
                    SetRowActionAssumeStateFor(syncKeys, actionData);
                    document.location = CreateFunctionUrlFromRowActionData(actionData);

                }, "DoPopupSave");

                $(this).attr('disabled', true);
            }
        });

        $(document).on(T1.FastClick, '[data-t1-control-id="QuickEnquirySolutionEnabledButton"]', function () {
            var clickedLink = $(this);
            controls.SyncLink.PerformClick(clickedLink);
        });
        
        $(document).delegate('[data-t1-control-id="QuickEnquiryClearButton"]', T1.FastClick, function () {
            ClearContent();
        });

        $(document).delegate('#QuickEnquiryPopup button.quickEnquiryClearButton', T1.FastClick, function () {
            ClearContent();
        });

        $(document).delegate('#QuickEnquiryPopup input', 'keydown', function (e) {
            var inputHasValue = false,
                code = e.keyCode || e.which;

            // if the code is a "tab" key, prevent the default in order to keep the focus as is
            if ($(this).hasClass('autoSelectValueAfterSearch') && !e.shiftKey && code == 9) {
                e.preventDefault();
            }

            $('#QuickEnquiryPopup').find('input').each(function () {
                if ($(this).val() != "") {
                    inputHasValue = true;
                    return false;
                }
            });
            if (inputHasValue && e.keyCode == 13) { //enter
                // The following controls trigger "change" event through textbox.jsand that is handled in the change event handler in PreRender()
                if (!$(this).hasClass('picklist') && !$(this).hasClass('time') && !$(this).hasClass('datetime')) {
                    PerformSearchWithCurrentCriteria(function () {
                        $currentFocusedField.focus();
                    }, true);
                }
            }
        });

        $(document).delegate('#QuickEnquiryPopup .textBoxControlInput', 'DataTypeContextDisplayed', function (e) {
            if (e.TextBoxControlInput.length == 0) return;

            // Stop the form event from running;
            e.stopPropagation();

            var container = $('#QuickEnquiryPopup');

            controls.Textbox.AutoFitContextDialog(e.TextBoxControlInput, {
                ContextDialog: e.ContextDialog,
                CanResize: e.CanResize,
                Container: container,
                SetHeight: false
            });
        });

        return new T1_C2_Shell_Controls_QuickEnquiryPopupForm_Public();
    }
}());

(function (undefined) {

    var T1 = window.T1 = window.T1 || {},
        c2 = T1.C2 = T1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicQuickReport = controls.QuickReport = controls.QuickReport || new T1_C2_Shell_Controls_QuickReport();

    shell.ControlInitialiser.AddControl('QuickReport', publicQuickReport.Initialise);

    function T1_C2_Shell_Controls_QuickReport() {

        function T1_C2_Shell_Controls_QuickReport_Public() { }

        T1_C2_Shell_Controls_QuickReport_Public.prototype = {
            Initialise: Initialise
        };

        function Initialise(control) {
            control.addClass('initialised');

            control.find('.quickReportGroupItem .collapseButton').on(T1.FastClick, function () {
                var $clicked = $(this),
                    $messageContainer = $clicked.closest('.quickReportGroupItemMessageContainer');

                if ($messageContainer.hasClass('expanded')) {
                    $messageContainer.removeClass('expanded');
                } else {
                    $messageContainer.addClass('expanded');
                }
            });

            control.find('.quickReportGroupHeading .headingActions > *').on(T1.FastClick, function () {
                var $clicked = $(this),
                    $group = $clicked.closest('.quickReportGroup'),
                    $groupItemMessageContainers = $group.find('.quickReportGroupItemMessageContainer');

                if ($clicked.hasClass('collapseAllButton')) {
                    $groupItemMessageContainers.each(function () {
                        var $messageContainer = $(this);
                        if ($messageContainer.hasClass('expanded')) {
                            $messageContainer.removeClass('expanded');
                        }
                    });
                } else if ($clicked.hasClass('expandAllButton')) {
                    $groupItemMessageContainers.each(function () {
                        var $messageContainer = $(this);
                        if (!$messageContainer.hasClass('expanded')) {
                            $messageContainer.addClass('expanded');
                        }
                    });
                }
            });
            
            control.find('.quickReportActionDropDown').each(function(){
                registerMessageActionButtonHandler($(this));
            })

            control.find('.subHeadingItem').each(function (i, e) {
                var text = $(e).text();
                $(e).text('');
                $(e).html(text);
            });
        }
        
        function registerMessageActionButtonHandler($quickReportActionDropdownControl) {

            var controlData = $quickReportActionDropdownControl.data('t1-control')

            if (controlData && controlData.dropDownItemClickedCallback === undefined) {
                controls.DropDownControl.DropDownItemClickedCallback($quickReportActionDropdownControl, function ($listItemClicked) {

                    var $action, actionData;
                    if (T1.IsPhone) {
                        actionData = $listItemClicked.data('t1-control');
                    } else {
                        $action = $listItemClicked.find('.dataLink.plannerGroupInnerViewMessageActionButton');
                        actionData = $action.data('t1-control');
                    }

                    if (actionData.SyncData && actionData.SyncData.FunctionName) {
                        controls.Shared.FormUtils.SetAssumeStateFor(actionData.SyncData);
                        controls.Shared.FormUtils.ShowFunction(actionData.SyncData.FunctionName, actionData.SyncData.Hash, actionData.SyncData.ExpiryTime);
                    }
                });
            }
        }

        return new T1_C2_Shell_Controls_QuickReport_Public();
    }
}());

(function (undefined) {

    var T1 = window.T1 = window.T1 || {},
        c2 = T1.C2 = T1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicStudentHierarchyViewer = controls.StudentHierarchyViewer = controls.StudentHierarchyViewer || new T1_C2_Shell_Controls_StudentHierarchyViewer();

    shell.ControlInitialiser.AddControl('StudentHierarchyViewer', publicStudentHierarchyViewer.Initialise);

    // It's assumed that this control is used for the maintenance pattern.
    // If this control needs to be used for other patterns, update the NodeAction and Refresh Ajax handlers to trigger an event with necessary data
    // and then forms should use the event to do things required for them.
    function T1_C2_Shell_Controls_StudentHierarchyViewer() {

        /* The format of selectedNodeContext should be as below
        {
        ListDepth: 0,
        NodeSequence : 0
        }
        */
        var selectedNodeContext = null;

        var mousePosition = {
            X: 0,
            Y: 0
        };

        function getMousePosition(ev) {
            if (ev.pageX || ev.pageY) {
                return {X: ev.pageX, Y: ev.pageY};
            }
            return {
                X: ev.clientX + document.body.scrollLeft - document.body.clientLeft,
                Y: ev.clientY + document.body.scrollTop - document.body.clientTop
            };
        }

        function DragStart(event, $node) {
            // Return if the dragger is already being used
            if (publicStudentHierarchyViewer.Drag) return;

            $node.removeClass('hovered');
            $node.closest('.studentHierarchyViewer').addClass('draggerActivated');

            mousePosition = getMousePosition(event);

            // Make a copy of the item being dragged
            var $placeHolderNode = $node.clone(true).addClass('placeHolderNode');

            $node.addClass('originalNodeBeingDragged');

            publicStudentHierarchyViewer.Drag = {
                Parent: $node.parent(),
                PlaceHolderNode: $placeHolderNode,
                Original: {
                    Node: $node,
                    Width: $node.width(),
                    Height: $node.height(),
                    X: $node.offset().left,
                    Y: $node.offset().top
                }
            };

            var $nodeUnderMouseCursor = $(document.elementFromPoint(mousePosition.X, mousePosition.Y)).closest('.node');

            var movedUp = publicStudentHierarchyViewer.Drag.Original.Y > mousePosition.Y;
            if (movedUp) {
                $placeHolderNode.insertBefore($nodeUnderMouseCursor);
            } else {
                $placeHolderNode.insertAfter($nodeUnderMouseCursor);
            }
        }

        function DragHandle(event) {

            var $nodeUnderDragger = $(document.elementFromPoint(event.pageX, event.pageY)).closest('.node');
            if ($nodeUnderDragger.length == 0 || $nodeUnderDragger.hasClass('placeHolderNode')) return;

            var drag = publicStudentHierarchyViewer.Drag,
                placeHolderNode = drag.PlaceHolderNode,
                oldMousePosition = mousePosition,
                newMousePosition = mousePosition = getMousePosition(event);

            if ($nodeUnderDragger.hasClass('originalNodeBeingDragged')) {
                drag.Original.Node.addClass('indicateTheSameLocationForDrop');
                placeHolderNode.hide();
            } else {
                drag.Original.Node.removeClass('indicateTheSameLocationForDrop');
                placeHolderNode.show();
                var draggerMovedUp = newMousePosition.Y < oldMousePosition.Y;
                if (draggerMovedUp) {
                    if (publicStudentHierarchyViewer.Drag.Original.Node.get(0) == $nodeUnderDragger.prev().get(0)) {
                        drag.Original.Node.addClass('indicateTheSameLocationForDrop');
                        placeHolderNode.hide();
                    } else {
                        placeHolderNode.detach().insertBefore($nodeUnderDragger);
                    }

                } else {
                    if (publicStudentHierarchyViewer.Drag.Original.Node.get(0) == $nodeUnderDragger.next().get(0)) {
                        drag.Original.Node.addClass('indicateTheSameLocationForDrop');
                        placeHolderNode.hide();
                    } else {
                        placeHolderNode.detach().insertAfter($nodeUnderDragger);
                    }
                }
            }
        }

        function ResetNewSequence(control) {
            if (control.hasClass('orderedList')) {
                control.find('ul').each(function () {
                    var $list = $(this),
                        $listItems = $list.find('> li.node'),
                        numListItems = $listItems.length;

                    for (var i = 1; i <= numListItems; ++i) {
                        var $listItem = $($listItems[i - 1]);
                        $listItem.find('.genericHierarchyNodeText').text(i);
                        $listItem.find('input[id$="NewSequence"]').val(i);
                    }
                });
            }
        }

        function RestoreSelectedNode() {
            if (selectedNodeContext != null) {
                $('.studentHierarchyViewer')
                    .find('ul[data-t1-list-depth="' + selectedNodeContext.ListDepth + '"]')
                    .find('> .node[data-t1-node-sequence="' + selectedNodeContext.NodeSequence + '"]')
                    .addClass('highlight');
            }
        }

        function showCheckboxForSelectableNodes(control) {
            control.find('.node.hasSelectionButton').addClass('selectionEnabled');
        }

        function registerSelectableNodeEventHandlers(control) {

            // Apply selection limit count
            applySelectionLimitCount(control, 0);

            // Restrict the clickable area to .node > .contents. Previously, this binds to just .node.
            control.find('.node > .contents, .node > .selectionModeIcon').bind(T1.FastClick, function (e) {
                if (!$(this).closest('.studentHierarchyViewer').hasClass('canViewActionInSelectionMode')) {
                    e.stopImmediatePropagation();
                }

                if ($(this).closest('.node').hasClass('selectionDisabled')) {
                    return;
                }

                // This prevents the parent event when the view button is clicked
                if ($(this).closest('#SelectUnitsSection').length > 0
                    && ($(e.target).is("button")
                        || $(e.target).is("span.buttonLabel"))) {
                    return;
                }

                var $clicked = $(this),
                    // Find the first .node ancestor of the clicked item
                    $node = $clicked.closest('.node'),
                    // Find the parent .node ancestor of the current .node
                    $parentNode = $node.parent().closest('.node');

                if ($node.hasClass('nodeDisabled')) {
                    return;
                }

                // Handle the Node and Child underneath
                if ($node.hasClass('hasSelectionButton')) {
                    $node.toggleClass('selected');
                    raiseCustomSelectNodeEvent(control, $node);
                }

                $node.find('.node').each(function () {
                    var $childNode = $(this);

                    if (!$childNode.hasClass('hasSelectionButton')) {
                        return;
                    }

                    if ($node.hasClass('selected') && !$childNode.hasClass('selected')) {
                        $childNode.addClass('selected');
                        raiseCustomSelectNodeEvent(control, $childNode);
                    }

                    if (!$node.hasClass('selected') && $childNode.hasClass('selected')) {
                        $childNode.removeClass('selected');
                        raiseCustomSelectNodeEvent(control, $childNode);
                    }
                });

                // If all children nodes are all selected or all unselected, update the parent node correspondingly
                updateParentNodeCheckBox(control, $parentNode);

                var $studentHierarchyViewer = $node.closest('.studentHierarchyViewer');
                var selectedItemsCount = $studentHierarchyViewer.find('.node.selected').length;

                $studentHierarchyViewer.find('.toolbar .confirmMode .selectedItemsCount').text(selectedItemsCount);

                // Apply selection limit count
                applySelectionLimitCount(control, selectedItemsCount);
            });
        }

        function applySelectionLimitCount(control, selectedItemsCount) {
            let studentHierarchyViewer = control.closest('#HierarchyViewerWrapper');
            let studentHierarchyViewerData = studentHierarchyViewer && studentHierarchyViewer.data('t1-control');
            // If number of selected has been reached the item selection limit count, disable the rest of unselected items
            if (studentHierarchyViewerData.ItemSelectionLimitCount && studentHierarchyViewerData.ItemSelectionLimitCount > 0) {
                if (selectedItemsCount >= studentHierarchyViewerData.ItemSelectionLimitCount) {
                    // Add custom class to disable unselected items
                    studentHierarchyViewer.find('.node').each(function () {
                        let $node = $(this);
                        if ($node.hasClass('hasSelectionButton') && !$node.hasClass('selected')) {
                            $node.addClass('nodeDisabled selectionLimited');
                            if ($node.hasClass('hasChildren')) {
                                $node.find('.node').each(function () {
                                    let $childNode = $(this);
                                    if (!$childNode.hasClass('selected')) {
                                        $childNode.addClass('nodeDisabled selectionLimited');
                                    }
                                });
                            }
                        }
                    });
                } else {
                    // Remove custom class to make unselected items available again
                    studentHierarchyViewer.find('.selectionLimited').each(function () {
                        $(this).removeClass('selectionLimited nodeDisabled');
                    });

                    let remainingCount = studentHierarchyViewerData.ItemSelectionLimitCount - selectedItemsCount;
                    // Add custom class to disable unselected items
                    studentHierarchyViewer.find('.node.hasSelectionButton.hasChildren').each(function () {
                        let $node = $(this);
                        if (!$node.hasClass('selected')) {
                            if (remainingCount - $node.find('.node.hasSelectionButton').not('.selected').length - 1 < 0) {

                                // Disable Course select all
                                $node.addClass('nodeDisabled selectionLimited');

                                // Prevent all item are selected
                                if ($node.find('.node.selected').length + 1 === $node.find('.node.hasSelectionButton').length) {
                                    $node.find('.node.hasSelectionButton').each(function () {
                                        if (!$(this).hasClass('selected')) {
                                            $(this).addClass('nodeDisabled selectionLimited');
                                        }
                                    });
                                }
                            }
                        }
                    });
                }
            }
        }

        function updateParentNodeCheckBox(control, $node) {
            if (!$node.hasClass('hasSelectionButton')) return;

            // If all children nodes are all selected or all unselected, update the current node correspondingly
            var allNodesSelected = true;
            var atLeastOneNodeUnselected = false;
            $node.find('.node').each(function () {
                if ($(this).hasClass('hasSelectionButton')) {
                    if ($(this).hasClass('selected')) {
                        allNodesUnselected = false;
                    } else {
                        atLeastOneNodeUnselected = true;
                    }
                }
            });
            if (allNodesSelected && !$node.hasClass('selected')) {
                $node.addClass('selected');
                raiseCustomSelectNodeEvent(control, $node);
            }
            if (atLeastOneNodeUnselected && $node.hasClass('selected')) {
                $node.removeClass('selected');
                raiseCustomSelectNodeEvent(control, $node);
            }

            // Traverse up 1 level to update all parent nodes
            var $parentNode = $node.parent().closest('.node');
            if ($parentNode && $parentNode.hasClass('hasSelectionButton')) {
                updateParentNodeCheckBox(control, $parentNode);
            }
        }

        function raiseCustomSelectNodeEvent(control, $node) {
            // Raise a custom event
            var customSelectEvent = $.Event("StudentHierarchyViewer.SelectNode", {
                Node: $node
            });
            control.trigger(customSelectEvent);
        }

        function T1_C2_Shell_Controls_StudentHierarchyViewer_Public() {
        }

        T1_C2_Shell_Controls_StudentHierarchyViewer_Public.prototype = {
            Initialise: Initialise
        };

        function RegisterNodeEventHandlers(control) {
            var $node = control.find('.node'),
                $nodeContents = control.find('.node > .contents');

            $node.find('.expandButtonForContents').bind(T1.FastClick, function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();

                var $node = $(this).closest('.node');
                if ($node.hasClass('collapsed')) {
                    $node.removeClass('collapsed');
                } else {
                    $node.addClass('collapsed');
                }

                var expandableObject = $node.find('> .fakeExpandButton');
                if (expandableObject.is('.collapsed')) {
                    T1.C2.Shell.Controls.Panel.Show(expandableObject.parent());
                } else {
                    T1.C2.Shell.Controls.Panel.Close(expandableObject.parent());
                }
            });

            $node.find('.externalLinkAction').bind(T1.FastClick, function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();

                var $clicked = $(this),
                    data = $clicked.hasClass('defaultAction')
                        ? $clicked.parent().find('.externalLinkAction:not(.defaultAction)').data('t1-control')
                        : $clicked.data('t1-control');

                window.open(data.Parameters['ExternalUrl']);
            });

            $node.find('.studentHierarchyNodeServerAction').bind(T1.FastClick, function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();

                var $clicked = $(this);

                // If the server action link has been set to use the platform's custom popup, use it and bail out
                if ($clicked.hasClass('serverActionLink') && $clicked.data('t1-control').ShowCustomPanelPopup) {
                    controls.ServerActionLink.PerformClick($clicked);
                    return;
                }

                // Our custom handler start...
                if ($clicked.hasClass('defaultAction')) {
                    $clicked = $clicked.siblings('.dropdownPanel').find('.dropdownPanelListItem:first-child > a');
                }

                var data = $clicked.data('t1-control'),
                    parameters = data.Parameters,
                    $selectedNode = $clicked.closest('.studentHierarchyViewer').find('.node.highlight');

                var performNodeAction = function () {
                    var keyFields = controls.Form.GetFormData({KeyFieldsOnly: true});
                    var request = {
                        FormData: keyFields,
                        TabName: controls.LinkedTab.GetTabNameFromControl($clicked),
                        ActionName: data.ActionName,
                        RequestData: {
                            StudentHierarchyNodeServerAction: true
                        }
                    };

                    if (parameters) {
                        for (var parameterName in parameters) {
                            request.FormData.Fields.push({
                                FieldName: parameterName,
                                Value: parameters[parameterName]
                            });
                        }
                    }

                    selectedNodeContext = {
                        ListDepth: $selectedNode.closest('ul').data('t1-list-depth'),
                        NodeSequence: $selectedNode.data('t1-node-sequence')
                    };

                    controls.Shared.MyMaintenanceForm.ExecuteRequest(request, function (result) {
                        var currentTabName = controls.Shared.FormUtils.GetCurrentTabName(),
                            currentTabNameComponents = currentTabName.split('|'),
                            currentOpenSectionName = currentTabNameComponents[currentTabNameComponents.length - 1],
                            $currentOpenSection = $("#" + currentOpenSectionName);

                        if ($currentOpenSection.hasClass('relatedDataPortletSection')) {
                            $currentOpenSection.find('#SearchButton').trigger(T1.FastClick);
                        }
                        RestoreSelectedNode();
                    }, "StudentHierarchyViewerNodeAction");
                };

                if (data.ShowUserConfirmPopup) {
                    controls.Form.OkCancelPrompt('Confirm Action', data.UserConfirmPopupMessage, performNodeAction);
                } else {
                    performNodeAction();
                }
            });

            $node.find('.details').bind(T1.FastClick, function (e) {
                // In the SelectUnitsSection there is a view content button for the Unit, so don't trigger the view action when the content is clicked
                // Another action is Unit will be ticked/unticked when the content is clicked.
                if ($(this).closest('#SelectUnitsSection').length > 0) return;

                $(this).closest('.node').find('> .contents > .actions .defaultAction').trigger(T1.FastClick);
            });

            $nodeContents.mouseover(function (e) {
                e.stopImmediatePropagation();
                e.preventDefault();
                if ($(this).closest('.studentHierarchyViewer').hasClass('draggerActivated')) return;

                var $node = $(this).closest('.node');
                if ($node.hasClass('hasActions')) {
                    $node.addClass('hovered');
                }
            });

            $nodeContents.mouseout(function (e) {
                e.stopImmediatePropagation();
                e.preventDefault();

                if ($(this).closest('.studentHierarchyViewer').hasClass('draggerActivated')) return;

                var $node = $(this).closest('.node');
                if ($node.hasClass('hasActions')) {
                    $node.removeClass('hovered');
                }
            });

            $nodeContents.find('.showCustomPanelPopupAction').bind(T1.FastClick, function (event, eventData) {
                // Prevent default action which triggers the first row action event
                event.stopImmediatePropagation();
                event.preventDefault();

                // Clear notifications
                controls.Notification.Clear();

                // Build request
                // We're not sending form data as it contains hierarchy view structure data which is large in size
                var $nodeControl = $(this).closest('.node');
                var controlData = $nodeControl.data('t1-control');
                var textLineControlData = $(this).data('t1-control');
                var suite = T1.Environment.Context.Suite.Name;

                // controls.Shared.FormUtils.GetCurrentTabName() doesn't work correctly when the calendar view or linked section is opened
                // Find the closest tabControl instead
                var currentTabName = $(this).closest('.tabControl').attr('id');
                var request = {
                    ActionName: textLineControlData.ShowCustomPanelPopupActionName,
                    TabName: currentTabName,
                    SectionName: currentTabName
                };

                var nodeSourceFields = controlData.NodeSourceFields;
                if (nodeSourceFields.length > 0) {
                    var syncKeys = [];
                    for (var i in nodeSourceFields) {
                        var field = nodeSourceFields[i];
                        var fieldExisted = $.grep(syncKeys, function (field) {
                            field.SyncKey == field.SyncKey
                        });

                        if (fieldExisted.length == 0) {
                            syncKeys.push({
                                FieldName: field.FieldName,
                                SyncKey: field.SyncKey,
                                Value: field.Value
                            })
                        }
                    }
                    request.SyncKeys = syncKeys;
                }

                // Callback to display the popup
                var callback = function (result) {
                    if (result.PanelHtml && result.PanelHtml.length > 0) {
                        controls.Popup.Show({
                            Type: 'Maintenance',
                            PopupTitle: result.PopupTitle,
                            PopupContent: result.PanelHtml,
                            SourceControl: $nodeControl,
                            OriginalRequest: request,
                            FixedSize: true,
                            Suite: suite,
                            PopupData: result.PopupData,
                            FixedSize: result.FixedSize,
                            Buttons: result.Buttons,
                            OkFunction: function () {
                                $nodeControl.removeClass('highlight');
                                return true;
                            },
                            CancelFunction: function () {
                                $nodeControl.removeClass('highlight');
                                return true;
                            }
                        });
                    }
                };

                // Create the Ajax Request.
                var ajaxRequest = {
                    cache: false,
                    ShowLoader: true,
                    type: 'POST',
                    url: T1.Environment.Paths.Controller + 'ShowCustomPopup',
                    contentType: 'application/json',
                    dataType: 'json',
                    suite: suite,
                    data: JSON.stringify(request),
                    relatedControl: $nodeControl,
                    beforeSend: function () {
                        $nodeControl.addClass('highlight');
                    },
                    success: callback,
                    error: function () {
                        $nodeControl.removeClass('highlight');
                    }
                };

                // Perform the Ajax call.
                shell.Ajax(ajaxRequest);
            })

            if (control.hasClass("selection")) {
                registerSelectableNodeEventHandlers(control);
                showCheckboxForSelectableNodes(control);
            }

            /**
             * scroll the StudentClassRegistration to the first activity
             * based on the activity that has not made any selections
             */
            $nodeContents.find('.courseTotalClassSelectionNotMadeCount').bind(T1.FastClick, function (e) {
                // Get the first node that contain class name "count".
                let $firstNodeCount = $nodeContents.find('.count').first();

                // Get the element of $firstNodeCount.
                let $firstNodeCountElem = $firstNodeCount[0];

                // Get the Tab_StudentClassRegistrationSection just so I don't end up using the wrong scrolling container
                let $studentClassRegistrationSection = $("#Tab_StudentClassRegistrationSection");

                // Get the scrolling container within the Student Class Registration Section
                let $scrollingContainer = $studentClassRegistrationSection.find('.content.scrollingContainer');

                // Scroll to the first activity that contain selection not made
                $scrollingContainer[0].scrollTo({
                    top: $firstNodeCountElem.parentElement.parentElement.offsetTop,
                    behavior: 'smooth'
                });
            })
        }

        function RegisterToolbarEventHandlers(control) {

            // Used to refresh the hierarchy viewer only
            control.find('.toolbar .normalMode .studentHierarchyViewerToolbarAction').bind(T1.FastClick, function (e) {
                e.stopImmediatePropagation();

                var $actionActivated = $(this),
                    $toolbarInnerSlider = $actionActivated.closest('.slider'),
                    $toolbar = $toolbarInnerSlider.closest('.toolbar'),
                    $confirmModePart = $toolbar.find('.confirmMode'),
                    $okAction = $toolbar.find('ok'),
                    $studentHierarchyViewer = $toolbar.closest('.studentHierarchyViewer'),
                    selectedItemsCount = $studentHierarchyViewer.find('.node.selected').length;

                $actionActivated.addClass('activated');
                $okAction.data('t1-control').ActionName = $actionActivated.data('t1-control').ActionName;

                $confirmModePart.find('.selectedItemsCount').text(selectedItemsCount);
                $confirmModePart.find('.selectedItemsCountMessage').text($actionActivated.data('t1-control').SelectedItemsCountMessage);

                var request = {
                    TabName: controls.LinkedTab.GetTabNameFromControl($studentHierarchyViewer),
                    FormData: controls.Form.GetFormData({KeyFieldsOnly: true})
                };

                controls.Shared.MyMaintenanceForm.ExecuteRequest(request, function (result) {
                    $toolbar.addClass('showConfirmMode');

                    // Refresh the viewer
                    $studentHierarchyViewer.find('> ul').replaceWith($(result.StudentHierarchyViewerHtml).find('> ul'));
                    $studentHierarchyViewer.addClass('selection');

                    T1.C2.Shell.ControlInitialiser.InitialiseControls($studentHierarchyViewer);
                }, "StudentHierarchyViewerRefreshAction", true);
            });

            control.find('.toolbar .confirmMode .studentHierarchyViewerToolbarAction').bind(T1.FastClick, function (e) {
                var $clicked = $(this),
                    $toolbarInnerSlider = $clicked.closest('.slider'),
                    $toolbar = $toolbarInnerSlider.closest('.toolbar'),
                    toolbarData = $toolbar.data('t1-control');

                if ($clicked.hasClass('ok')) {
                    if (!$clicked.hasClass('allowNoSelectedItem') && $toolbar.closest('.studentHierarchyViewer').find('.node.selected').length == 0) {
                        e.stopPropagation();

                        controls.Popup.Show({
                            Type: 'ok',
                            PopupTitle: toolbarData.MessageWhenNoItemSelectedForAction,
                            PopupContent: 'Please select an item first.',
                            SourceControl: $clicked.closest('.studentHierarchyViewer'),
                            OkFunction: function (popupData) {
                                return true;
                            }
                        });
                    } else {
                        //This button is the platform's ServerActionLink that handles the user click event and refreshes the section after the successful action
                    }

                } else {
                    e.stopImmediatePropagation();
                    $toolbar.removeClass('showConfirmMode');
                    controls.LinkedTab.GetTabHandleFromTabControl(controls.Shared.FormUtils.GetCurrentTab()).trigger(T1.FastClick);
                }
            });
        }

        function bindOnce() {

            controls.ServerActionLink.SetCustomPopupRequestFunction(function (control) {
                if (control.closest('.formActions').length > 0) return;

                var request = {
                    SectionName: T1.C2.Shell.Controls.Shared.FormUtils.GetCurrentTabName().split('_')[1]
                };

                if (control.hasClass('studentHierarchyViewerNodeAction')) {
                    // Node action
                    request.FormData = ConvertNodeActionParametersToFormData(control);
                } else {
                    // Toolbar confirm action
                    request.FormData = T1.C2.Shell.Controls.Form.GetFormData({Context: T1.C2.Shell.Controls.Shared.FormUtils.GetCurrentTab()});
                    request.SelectionData = {
                        SelectedItems: []
                    };

                    var selectedItemsToBeInjected = request.SelectionData.SelectedItems;

                    var $selectedNodes = control.closest('.studentHierarchyViewer').find('.node.hasSelectionButton.selected');
                    for (var i = 0, numSelectedItems = $selectedNodes.length; i < numSelectedItems; ++i) {
                        var $selectedNode = $($selectedNodes[i]),
                            selectedNodeSourceFields = $selectedNode.data('t1-control').NodeSourceFields;

                        var syncKeys = [];
                        for (var j = 0, numSourceFields = selectedNodeSourceFields.length; j < numSourceFields; ++j) {
                            var nodeSourceField = selectedNodeSourceFields[j];
                            syncKeys.push({
                                FieldName: nodeSourceField.FieldName,
                                SyncKey: nodeSourceField.SyncKey,
                                Value: nodeSourceField.Value
                            });
                        }

                        selectedItemsToBeInjected.push({
                            SyncKeys: syncKeys
                        });
                    }
                }

                return request;

            });

            function ConvertNodeActionParametersToFormData($serverActionLink) {
                var actionData = $serverActionLink.data('t1-control');

                var formData = controls.Form.GetFormData({KeyFieldsOnly: true});

                if (actionData && actionData.Parameters) {
                    for (var fieldName in actionData.Parameters) {
                        if (fieldName === "LinkedSectionAction") continue;
                        formData.Fields.push({
                            FieldName: fieldName,
                            Value: actionData.Parameters[fieldName]
                        });
                    }
                }

                return formData;
            }

            function GetSelectedItemsForToolbarConfirmAction($studentHierarchyViewer) {
                var selectedItemsToBeInjected = [];

                var $selectedNodes = $studentHierarchyViewer.find('.node.hasSelectionButton.selected');
                for (var i = 0, numSelectedItems = $selectedNodes.length; i < numSelectedItems; ++i) {
                    var $selectedNode = $($selectedNodes[i]),
                        selectedNodeSourceFields = $selectedNode.data('t1-control').NodeSourceFields;

                    var syncKeys = [];
                    for (var j = 0, numSourceFields = selectedNodeSourceFields.length; j < numSourceFields; ++j) {
                        var nodeSourceField = selectedNodeSourceFields[j];
                        syncKeys.push({
                            FieldName: nodeSourceField.FieldName,
                            SyncKey: nodeSourceField.SyncKey,
                            Value: nodeSourceField.Value
                        });
                    }

                    selectedItemsToBeInjected.push({
                        SyncKeys: syncKeys
                    });
                }

                return selectedItemsToBeInjected;
            }

            controls.ServerActionLink.SetCustomRequestFunction('StudentHierarchyViewer', function ($serverActionLink, request) {

                var $studentHierarchyViewer = $serverActionLink.closest('.studentHierarchyViewer');
                if ($studentHierarchyViewer.length !== 0) {

                    request.FormData = ConvertNodeActionParametersToFormData($serverActionLink);

                    if (!request.SelectionData) {
                        request.SelectionData = {
                            SelectedItems: []
                        };
                    }

                    request.SelectionData.SelectedItems = GetSelectedItemsForToolbarConfirmAction($studentHierarchyViewer);

                    if ($('#MyMaintenanceForm').length) {
                        $('#MyMaintenanceForm').data('t1-control').SelectionData = request.SelectionData;
                    }

                    if ($('#MyWizardForm').length) {
                        $('#MyWizardForm').data('t1-control').SelectionData = request.SelectionData;

                        // SelectionData doesn't exist in MyWizardBaseController SectionAction's request
                        // For now, push the data from SelectionData into FormData
                        var transformedSelectedItems = [];
                        for (var i = 0, numSelectedItems = request.SelectionData.SelectedItems.length; i < numSelectedItems; ++i) {
                            var selectedItem = request.SelectionData.SelectedItems[i];

                            for (var j = 0, numSyncKeyFields = selectedItem.SyncKeys.length; j < numSyncKeyFields; ++j) {
                                var syncKeyField = selectedItem.SyncKeys[j];
                                if (!syncKeyField.SyncKey) continue;

                                // Find the existing syncKey
                                var existingSyncKeyIndex = transformedSelectedItems.findIndex(a => a.FieldName === 'SelectedItems_' + syncKeyField.FieldName);

                                if (existingSyncKeyIndex >= 0) {
                                    transformedSelectedItems[existingSyncKeyIndex].Value = transformedSelectedItems[existingSyncKeyIndex].Value + '|' + syncKeyField.Value
                                } else {
                                    transformedSelectedItems.push({
                                        FieldName: 'SelectedItems_' + syncKeyField.FieldName,
                                        Value: syncKeyField.Value
                                    });
                                }
                            }
                        }
                        for (var i = 0, numTransformedSelectedItems = transformedSelectedItems.length; i < numTransformedSelectedItems; ++i) {
                            request.FormData.Fields.push({
                                FieldName: transformedSelectedItems[i].FieldName,
                                Value: transformedSelectedItems[i].Value
                            });
                        }
                    }
                }

                return request;
            });

            $(document).delegate('#MyMaintenanceForm', "Form.Action Section.Action", function (e) {
                if (e.Action == "Edit") {
                    var $studentHierarchyViewer = $('.studentHierarchyViewer');
                    if ($studentHierarchyViewer.hasClass('editMode')) {
                        $studentHierarchyViewer.find('.node').addClass('draggable');
                    } else {
                        $studentHierarchyViewer.find('.node').removeClass('draggable');
                    }
                }
            });

            $(document).delegate('#MyWizardForm', "Form.Action Section.Action", function (e) {
                if (e.Action == "Edit") {
                    var $studentHierarchyViewer = $('.studentHierarchyViewer');
                    if ($studentHierarchyViewer.hasClass('editMode')) {
                        $studentHierarchyViewer.find('.node').addClass('draggable');
                    } else {
                        $studentHierarchyViewer.find('.node').removeClass('draggable');
                    }
                }
            });

            $(document).delegate('.studentHierarchyViewer .node .actions .defaultAction', T1.FastClick, function (e) {
                var $clicked = $(this),
                    $selectedNode = $clicked.closest('.node'),
                    $topLevelList = $selectedNode.closest('ul[data-t1-list-depth="0"]');

                $topLevelList.find('.node.highlight').removeClass('highlight');
                $selectedNode.addClass('highlight');

                selectedNodeContext = {
                    ListDepth: $selectedNode.closest('ul').data('t1-list-depth'),
                    NodeSequence: $selectedNode.data('t1-node-sequence')
                };

                var $studentHierarchyViewer = $('.studentHierarchyViewer');
                var event = $.Event('StudentHierarchyViewer.NodeClicked');
                var eventData = {
                    $NodeActionClicked: $clicked.siblings('.dropdownPanel').find('.dropdownPanelListItem:first-child a'),
                    $NodeControlData: $selectedNode.data('t1-control')
                };
                $studentHierarchyViewer.trigger(event, eventData);
            });

            $(document).delegate('body', 'Event.Custom.AfterItemServerAction', function (e) {
                if (selectedNodeContext != null) {
                    RestoreSelectedNode();
                }
            });

            // LinkedTab.Closed is a custom event we raise from LinkedTab.jsso update the following when CCP-6563 is done
            // UPDATE: changed to LinkedTab.LinkedTabChanged and check if Direction is -1 which indicates the linked tab has been closed
            $(document).delegate('.linkedTabbedControl', 'LinkedTab.LinkedTabChanged', function (e) {
                if (e.Direction === -1) {
                    $('.studentHierarchyViewer .node.highlight').removeClass('highlight');
                    selectedNodeContext = null;
                }
            });
        }

        function Initialise(control) {
            ResetNewSequence(control);

            RegisterNodeEventHandlers(control);

            RegisterToolbarEventHandlers(control);

            control.find('.node .handle').addClass('primary');

            $(document).on('dragStart', function (event) {
                var $clickedNode = $(event.target).closest('.node');
                if ($clickedNode.length > 0) {
                    $clickedNode.closest('.content').css({
                        'overflow-y': 'hidden'
                    });
                    DragStart(event, $clickedNode);
                } else {
                    event.stopPropagation();
                }
            });

            $(document).on('drag', function (event) {
                var $movingNode = $(event.target).closest('.node');
                DragHandle(event, $movingNode);
            });

            $(document).on('dragEnd', function (event) {
                if (!publicStudentHierarchyViewer.Drag) return;

                event.preventDefault();

                var $placeHolderNode = $('.placeHolderNode'), // The place holder node
                    $originalNode = publicStudentHierarchyViewer.Drag.Original.Node;

                if ($originalNode.hasClass('indicateTheSameLocationForDrop')) {
                    $placeHolderNode.remove();

                    $originalNode.removeClass('originalNodeBeingDragged indicateTheSameLocationForDrop');
                    $originalNode.closest('.studentHierarchyViewer').removeClass('draggerActivated');
                } else {
                    // The target location is different from the original one
                    $originalNode.remove();

                    setTimeout(function () {
                        $placeHolderNode.removeClass('placeHolderNode');
                        $placeHolderNode.closest('.studentHierarchyViewer').removeClass('draggerActivated');
                        $placeHolderNode.closest('.content').css({
                            'overflow-y': 'auto'
                        });
                        $placeHolderNode.removeAttr('style');
                        publicStudentHierarchyViewer.Drag = null;

                        ResetNewSequence($placeHolderNode.closest('.studentHierarchyViewer'));

                        //Update the sequence
                    }, 10);
                }

                publicStudentHierarchyViewer.Drag = null;
            });

            controls.LinkedTab.RegisterCustomSectionActionRequestFunction("StudentHierarchyViewer", function (action, request) {
                if (action == "ReadSection" && request.FormData && request.FormData.Fields) {
                    var sourceFieldMap = controls.Form.CreateLookupObjectFromArray(request.FormData.Fields, 'FieldName');

                    for (var propertyName in request.RequestData) {
                        if (propertyName == "LinkedSectionAction") continue;

                        // Check if field exists on the source.
                        if (sourceFieldMap.hasOwnProperty(propertyName)) continue;

                        var fieldValue = request.RequestData[propertyName];
                        request.FormData.Fields.push({
                            FieldName: propertyName,
                            Value: fieldValue,
                            IsKeyField: true
                        });
                    }
                }
            });

            if (!publicStudentHierarchyViewer.GlobalEventsBound) {
                bindOnce();
                publicStudentHierarchyViewer.GlobalEventsBound = true;
            }
        }

        return new T1_C2_Shell_Controls_StudentHierarchyViewer_Public();
    }
}());

/***
* SuperGrid extension to allow manual locking/unlocking of cells.
* Contains T1 Grid Formatters.
*/
(function () {

    var t1 = window.T1 = window.T1 || {},
        c2 = t1.C2 = t1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        gridControls = controls.GridControls = controls.GridControls || {},
        manualRowLockingMetadataCallback = gridControls.ManualRowLockingMetadataCallback = gridControls.ManualRowLockingMetadataCallback || ManualRowLockingMetadataCallback;

    function ManualRowLockingMetadataCallback(rowIndex, metaData, rowData) {
        if (metaData.isDataRow && !metaData.isNewRow &&
            rowData['IsLockedRow'] != null) {
            // applies to the whole row, not individual cells
            if (rowData['IsLockedRow'].toLowerCase() == "true") {
                if (metaData.cssClasses.indexOf('isLockedRow') < 0)
                    metaData.cssClasses += " isLockedRow";
            } else if (metaData.cssClasses.indexOf('isLockedRow') >= 0)
                metaData.cssClasses = metaData.cssClasses.replace(" isLockedRow", "");
        }
    }

    $(document).delegate('[data-t1-control-type*="SuperGrid"]', 'Grid.BeforeCellEdit', function (event) {
        // look in the data to see if the row should be locked (and the column doesn't override the row lock) - if so, cancel the edit for this cell
        if (event.columnDef.cssClass.indexOf("overrideLockedColumn") > 0)
            return; //allow the edit

        if (event.columnDef.associatedColumn == "GridActionsColumn") {
            event.data = { cancelEdit: true };
        }
        if (event.rowData && ((event.rowData["IsLockedRow"] && event.rowData["IsLockedRow"].toLowerCase() == "true")))
            event.data = { cancelEdit: true };
    });

})();
(function (undefined) {

    var T1 = window.T1 = window.T1 || {},
        c2 = T1.C2 = T1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicTabletUtils = controls.TabletUtils = controls.TabletUtils || new T1_C2_Shell_Controls_TabletUtils();

    shell.ControlInitialiser.AddControl('TabletUtils', publicTabletUtils.Initialise);

    function T1_C2_Shell_Controls_TabletUtils() {



        function T1_C2_Shell_Controls_TabletUtils_Public() { }
        T1_C2_Shell_Controls_TabletUtils_Public.prototype = {
            isiOS7InLandscape: isiOS7InLandscape
        };

        function isiOS7InLandscape() {
            var $window = $(window);
            return $('body').hasClass('ios7') && $window.height() < $window.width();
        }
        return new T1_C2_Shell_Controls_TabletUtils_Public();
    }
} ());

    

(function (undefined) {

    var T1 = window.T1 = window.T1 || {},
        c2 = T1.C2 = T1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicTextboxWithAnalyserSuggest = controls.TextboxWithAnalyserSuggest = controls.TextboxWithAnalyserSuggest || new T1_C2_Shell_Controls_TextboxWithAnalyserSuggest();

    shell.ControlInitialiser.AddControl('TextboxWithAnalyserSuggest', publicTextboxWithAnalyserSuggest.Initialise);

    function T1_C2_Shell_Controls_TextboxWithAnalyserSuggest() {

        function T1_C2_Shell_Controls_TextboxWithAnalyserSuggest_Public() { }

        T1_C2_Shell_Controls_TextboxWithAnalyserSuggest_Public.prototype = {
            Initialise: Initialise,
            GetFieldData: GetFieldData
        };

        function Initialise(control) {
            control.addClass('initialised');
        }

        function GetFieldData(control) {
            return {
                FieldName: shell.GetControlIdWithoutPrefix(control),
                Value: control.find('input').val()
            };
        }

        return new T1_C2_Shell_Controls_TextboxWithAnalyserSuggest_Public();
    }
} ());

(function (undefined) {

    var T1 = window.T1 = window.T1 || {},
        c2 = T1.C2 = T1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicTextBoxWithCheckBox = controls.TextBoxWithCheckBox = controls.TextBoxWithCheckBox || new T1_C2_Shell_Controls_TextBoxWithCheckBox();

    shell.ControlInitialiser.AddControl('TextboxWithCheckbox', publicTextBoxWithCheckBox.Initialise);

    function T1_C2_Shell_Controls_TextBoxWithCheckBox() {

        function T1_C2_Shell_Controls_TextBoxWithCheckBox_Public() { }

        T1_C2_Shell_Controls_TextBoxWithCheckBox_Public.prototype = {
            Initialise: Initialise
        };
        function Initialise(control) {
            var checkbox = control.find('.checkBoxContainer input');
            checkbox.prop('checked', checkbox.data('t1-checkbox-value') == "True");
        }
        $(document).delegate('.textboxWithCheckbox .checkBoxControlInput', 'change', function () {
            var $checkBoxChanged = $(this),
                $allCheckBoxesWithinSameArea = $checkBoxChanged.closest('.dataEntryPanelSubPanel').find('.textboxWithCheckbox .checkBoxControl');
            $allCheckBoxesWithinSameArea.removeClass('checked');
            $checkBoxChanged.closest('.checkBoxControl').addClass('checked');
        });

        return new T1_C2_Shell_Controls_TextBoxWithCheckBox_Public();
    }
} ());

(function (undefined) {

    var T1 = window.T1 = window.T1 || {},
        c2 = T1.C2 = T1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicWarningInformation = controls.WarningInformation = controls.WarningInformation || new T1_C2_Shell_Controls_WarningInformation();

    shell.ControlInitialiser.AddControl('WarningInformation', publicWarningInformation.Initialise);

    function T1_C2_Shell_Controls_WarningInformation() {

        function T1_C2_Shell_Controls_WarningInformation_Public() { }

        T1_C2_Shell_Controls_WarningInformation_Public.prototype = {
            Initialise: Initialise
        };

        function Initialise(control) {
            control.addClass('initialised');

            if (!publicWarningInformation.GlobalEventsBound) {
                publicWarningInformation.GlobalEventsBound = true;
                $(document).delegate('.WarningInformation .expandoText', T1.FastClick, function (e) {
                    e.preventDefault();

                    var $WarningInformationPanel = $(this).closest('.WarningInformation');

                    var WarningInformationPanelHeightBeforeAction = $WarningInformationPanel.outerHeight(true);

                    if ($WarningInformationPanel.hasClass('collapsed')) {
                        $WarningInformationPanel.removeClass('collapsed');
                    } else {
                        $WarningInformationPanel.addClass('collapsed');
                    }

                    var WarningInformationPanelHeightAfterAction = $WarningInformationPanel.outerHeight(true);

                    var $rdp = $WarningInformationPanel.closest('.relatedDataPortletSection').find('.relatedDataPortlet');
                    if ($rdp.length > 0) {
                        var newRdpHeight = 0,
                            informationPanelHeightDifference = 0;

                        var currentRdpHeight = $rdp.outerHeight(true);
                        if ($WarningInformationPanel.hasClass('collapsed')) {
                            informationPanelHeightDifference = WarningInformationPanelHeightBeforeAction - WarningInformationPanelHeightAfterAction;
                            newRdpHeight = currentRdpHeight + informationPanelHeightDifference;
                        } else {
                            informationPanelHeightDifference = WarningInformationPanelHeightAfterAction - WarningInformationPanelHeightBeforeAction
                            newRdpHeight = currentRdpHeight - informationPanelHeightDifference;
                        }

                        T1.C2.Shell.Controls.RelatedDataPortlet.Resize($rdp, newRdpHeight);
                    }
                });
            }
        }

        return new T1_C2_Shell_Controls_WarningInformation_Public();
    }
}());

