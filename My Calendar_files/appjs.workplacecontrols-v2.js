
(function (undefined) {

    /*
    * Private Members
    */

    var t1 = window.T1 = window.T1 || {},
        c2 = t1.C2 = t1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicWorkplaceDS = controls.WorkplaceDS = controls.WorkplaceDS || new T1_C2_Shell_Controls_WorkplaceDS();

    shell.SessionStorage = shell.SessionStorage || sessionStorage; // fallback if CoreLib is earlier than 2105

    var workplaceDataStore = {};
    var cacheTimeout = 1.5 * 60 * 60 * 1000; /* 1.5 hours */
    var sessionStorageKey = 'wp-session-data';

    var currentRequestInProgress = false;

    function GetLocalSessionData(callback) {
        var wpData = shell.SessionStorage.getItem(sessionStorageKey);
        if (wpData) {
            return callback(JSON.parse(wpData));
        }
        // try reading it from the IndexedDB
        if(shell.LargeDataStorage){
            var largeStorage = shell.LargeDataStorage(shell.LargeDataStoreObjects.Workplace);
            largeStorage.getItem(sessionStorageKey, function(data){
                callback(data || {});
            });
        }
    }

    function SetLocalSessionData(newData) {
        try {
            var dataString = JSON.stringify(newData);
            var bResult = shell.SessionStorage.setItem(sessionStorageKey, dataString);
            if(!bResult){
                // try writing it to the IndexedDB
                if(shell.LargeDataStorage) {
                    var largeStorage = shell.LargeDataStorage(shell.LargeDataStoreObjects.Workplace);
                    largeStorage.setItem(sessionStorageKey, newData);
                }
            }
        }
        catch (e) {
            /* For any error (generally browser Quota exceeded error when data is too big),
            ** ignore storing into sessionStorage - instead of client side caching continue using server side cache */
        }
    }

    function GetDataFromServer(callback) {
        if (workplaceDataStore.HasData) {
            //workplaceDataStore = GetLocalSessionData();
            return callback(workplaceDataStore);
        }

        if (currentRequestInProgress) {
            setTimeout(function () {
                return GetDataFromServer(callback);
            }, 200);
            return;
        }

        currentRequestInProgress = true;

        var getWorkplaceData = function(cachedData){
            var reqData = {
                CachedAt: cachedData.CachedAt, // || null,
                ClearCache: cachedData.ClearCache //|| (new Date() - (workplaceDataStore.CachedAt || new Date()) >= cacheTimeout)
            };

            var announcementTexts = $('#FrontOfficeForm').data('t1-control');
            if(announcementTexts !== undefined) {
                var loadingMessage = $('<span class="ariaText"></span>').text(announcementTexts.Labels.StartAnnouncement);
                $('.pageSpinner').append(loadingMessage).focus();
            }

            T1.C2.Shell.Ajax({
                ShowLoader: false,
                blocking: false,
                url: T1.Environment.Paths.RootEnvironmentUrl + 'Workplace/FrontOffice/GetWorkplaceData',
                //url: T1.Environment.Paths.RootEnvironmentUrl + 'Workplace/FrontOffice/GetWorkplaceDataX',
                data: JSON.stringify(reqData),
                success: function (response) {
                    currentRequestInProgress = false;
                    if (!response.UseCache) {
                        var wpData = response.Data;
                        wpData.HasData = true;
                        wpData.CachedAt = response.CachedAt;
                        wpData.OldCachedAt = response.OldCachedAt;

                        setTimeout(function () {
                            SetLocalSessionData(wpData);
                        }, 0);

                        workplaceDataStore = wpData;
                    }
                    else{
                        workplaceDataStore = cachedData;
                    }
                    callback();
                },
                error: function () {
                    currentRequestInProgress = false;
                    // Unhandled Exception.
                }
            });
        }
        GetLocalSessionData(getWorkplaceData);
    }

    function GetEntireDataStore(callback) {
        if (!workplaceDataStore.HasData) {
            return GetDataFromServer(function () {
                GetEntireDataStore(callback);
            });
        }
        if (callback) {
            return callback(workplaceDataStore);
        }

        return workplaceDataStore;
    }

    function GetDataByWorkplaceId(workplaceId, cloned) {
        cloned = cloned === undefined ? true : cloned;
        if (!workplaceDataStore.HasData) {
            return GetDataFromServer(function () {
                GetDataByWorkplaceId(workplaceId);
            });
        }
        var ds = workplaceDataStore.Workplaces || [];

        for (var i = 0; i < ds.length; i++) {
            if (ds[i].Id == workplaceId) {
                return cloned ? $.extend({}, ds[i], {ScrollIndex: i}) : ds[i];
            }
        }
        return ds[0];
    }

    function GetDataByWorkplaceIndex(index, cloned) {
        cloned = cloned === undefined ? true : cloned;
        if (!workplaceDataStore.HasData) {
            return GetDataFromServer(function () {
                GetDataByWorkplaceIndex(index);
            });
        }
        var ds = workplaceDataStore.Workplaces || [];

        if (!ds[index]) { return {}; }

        return cloned ? $.extend({}, ds[index], { ScrollIndex: index }) : ds[index];
    }

    function GetFunctionData(roleId, functionName, suite) {
        var wpdata = GetDataByWorkplaceId(roleId);
        for( var i = 0; i < wpdata.Functions.length; i++){
            var f = wpdata.Functions[i];
            var f_name = f.FunctionName || '';
            // Enterprise search: Consider merged function if searching for a per suite function
            var mergedFuncName = f_name.indexOf('$TB.MERGED.FUNC.') === 0 ? f_name.replace('$TB.MERGED.FUNC.','') : '_na';
            if((f_name === functionName && suite && f.Suite === suite)
                || mergedFuncName === functionName) {
                return f;
            }
        }
    }

    function ClearCache() {
        workplaceDataStore.ClearCache = true;
        SetLocalSessionData(workplaceDataStore);
    }

    function Update(workplaceData){
       for(var i = 0; i< workplaceDataStore.Workplaces.length; i++){
           if(workplaceDataStore.Workplaces[i].Id === workplaceData.Id){
               workplaceDataStore.Workplaces[i] = workplaceData;
               break;
           }
       }
       SetLocalSessionData(workplaceDataStore);
    }

    /**************************************************************************
    * Library: T1.CoreLib.Client.Controls.WorkplaceDS
    */
    function T1_C2_Shell_Controls_WorkplaceDS() {
        /// <summary>
        /// Initialises a new instance of the WorkplaceDS control
        /// </summary>


        function T1_C2_Shell_Controls_WorkplaceDS_Public() {

        }


        T1_C2_Shell_Controls_WorkplaceDS_Public.prototype = {
            GetDataStore: GetEntireDataStore,
            GetDataById: GetDataByWorkplaceId,
            GetDataByIndex: GetDataByWorkplaceIndex,
            GetFunctionData: GetFunctionData,
            ClearCache: ClearCache,
            Update:Update
        };


        // return a new instance of the public object
        return new T1_C2_Shell_Controls_WorkplaceDS_Public();
    }

} ());



/// <reference path="~/Content/Scripts/DevIntellisense.js"/>

(function (undefined) {


    var t1 = window.T1 = window.T1 || {},
        c2 = t1.C2 = t1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        sharedControls = shell.Shared = shell.Shared || {},
        publicFunctionSearch = sharedControls.FunctionSearch = sharedControls.FunctionSearch || new T1_C2_Shell_Shared_FunctionSearch();


    /**************************************************************************
     * Library: T1.CoreLib.Client.Controls.FunctionSearch
     */
    function T1_C2_Shell_Shared_FunctionSearch() {
        /// <summary>
        /// Initialises a new instance of the functionSearch control
        /// </summary>

        /*
        * Private Members
        */

        var functionSearchData;
        var WorkplaceLabels;

        /*
        * Public API
        */

        function T1_C2_Shell_Shared_FunctionSearch_Public() {
            /// <summary>
            /// Constructor for the librarys public API
            /// </summary>
        }

        T1_C2_Shell_Shared_FunctionSearch_Public.prototype = {

            FindMatches: FindMatches,

            GetData: GetData,

            GetWorkplaceLabels: GetWorkplaceLabels,

            GetFunctionSearchLabels: GetFunctionSearchLabels,

            GetNoResultsTemplate: GetNoResultsTemplate,

            LoadData: LoadData,

            FindFunction: FindFunction,

            CreateFunctionItem: CreateFunctionItem,

            PopulateItems: PopulateItems,

            HighLightText: HighLightText,

            SaveAssumeState: SaveAssumeState,

            RemoveStoredData: RemoveLocalStorageData
        };



        /*
        * Private Functions
        */

        function GetTemplate(selector){

            return $('header .templates .' + selector).clone(true);
        }

        function GetNoResultsTemplate() {
           return GetTemplate('noResultsContent');
        }

        function GetItemTemplate(){

            var itemTemplate = GetTemplate('itemTemplate');
            return itemTemplate[0].outerHTML;
        }


        function GetItemContainerTemplate(){
            return GetTemplate('itemContainerTemplate').children();
        }

        function GetItemContentTemplate(){
            return GetTemplate('itemContentTemplate').children();
        }


        //magnifyGlass icon for items having 'enq' class
        function GetEnquirySearchTemplate(tooltipText){
            if(!tooltipText)
                tooltipText = '';

            var enqSearchTemplate = GetTemplate("enqSearchV2");

            return enqSearchTemplate[0].outerHTML.replace('##TOOLTIPTEXT##','Search ' + tooltipText);
        }

        function FindMatches(value, items) {
            // The items are sorted based on the position search string is found in the item, then in alphabetical order.

            var foundItems = {};
            var foundItemsIndexes = [];
            var foundItemsArray = [];

            var indexAsString, i , j = 0;

            //Alter options to change the accuracy and amount of results
            var options = {
                key: 'AltSearchText',
                limit: 50,
                threshold: -1000
            };

            //https://github.com/farzher/fuzzysort
            var results = fuzzysort.go(value, items, options);

            for(j = 0; j < results.length; j++){
                foundItemsArray.push(results[j].obj);
            }

            // Remove duplicate entries (function link and workplace role items)
            for (i = 0; i < foundItemsArray.length - 1; i++) {
                var thisItem = foundItemsArray[i];
                for (j = i + 1; j < foundItemsArray.length; j++) {
                    var thatItem = foundItemsArray[j];

                    if ((thisItem.Link && (thisItem.Link === thatItem.Link)) /* function link */
                        || (!thisItem.Link && thisItem.WorkplaceId && (thisItem.WorkplaceId === thatItem.WorkplaceId))) { /* workplace role item */
                        foundItemsArray.splice(j, 1);
                    }
                }
            }

            return foundItemsArray;
        }

        function FindFunction(funcName) {
            for (var i = 0; i < functionSearchData.length; i++) {
                var item = functionSearchData[i];
                var f = item.FunctionName;
                /* Merge functions have prefix so check in the end */
                if (f && f.indexOf(funcName, f.length - funcName.length) !== -1) {
                    return item;
                }
            }

            return {};
        }

        function GetPageSync() {
            return shell.Controls.PageSync;
        }

        function GetData(callBack) {

            if (!functionSearchData) {
                return LoadData(callBack);
            }

            if (callBack) {
                callBack(functionSearchData);
            }

            return functionSearchData;
        }

        function GetWorkplaceLabels(){
            var $workplace = $(shell.Hash('WpContentContainer'));
            var controlData = $workplace.data('t1-control');
            //controlData.Labels should contain all the required labels
            if(!controlData)
                return;
            return controlData.Labels;
        }

        function GetFunctionSearchLabels(){
            var $globalHeader = $(shell.Hash('GlobalHeader'));
            var controlData = $globalHeader.data('t1-control');
            //controlData.Labels should contain all the required labels
            if(!controlData || !controlData.Labels)
                return;
            return controlData.Labels;
        }

        function CreateFunctionItem(item, srchValue){
            srchValue = srchValue || "";

            var isDisabled = item.CssClass.indexOf('disabled') >= 0;
            var isRole = item.IsRole;
            var notLink = isRole || item.Link === '' || t1.IsPhone || isDisabled;

            /* Link creation */
            var link = $(notLink ? "<div>" : "<a>")
                .attr({ 'title': item.LabelText, 'role': 'listitem', 'tabindex': '0', 'class': 'drkCol1 entSearchItem' })
                .append(GetItemContentTemplate())
                .data('t1-control', item)
                .addClass(item.CssClass);


            /* Link icon */
            if (!isRole && item.ImageUrl) {
                LoadIcon(link, item.ImageUrl);
            }

            if (isDisabled) {
                link.attr('aria-disabled', true);
            }

            /* Label text */
            link.children('.itemLabel').html(publicFunctionSearch.HighLightText(item.LabelText, srchValue));

            /* HREF url */
            if (!notLink) {
                link.attr('href', item.Link ? item.Link : '');
            }

            /* Wporkplace role text */
            if (item.WorkplaceTitle) {
                var roleTitle = $(GetTemplate('roleTitleTemplate')).appendTo(link);
                var htmlText = $('<span/>').text(item.WorkplaceTitle);
                roleTitle.children('.title').html(htmlText);
                roleTitle.children('.glyph').addClass((item.WorkplaceIcon || 'e050').toLowerCase());
            }

            /* if Role item link*/
            if (isRole) {
                link.addClass('role').find('.iconContainer > span').addClass('icon16 glyph').addClass((item.ImageUrl || 'e050').toLowerCase());
                link.addClass('mainBGCol3 uppercase');
                if (!T1.IsPhone && item.RoleBehaviour){
                    $("<span>")
                        .addClass("block")
                        .append($("<span>").addClass("roleBehaviour").text(item.RoleBehaviour))
                        .insertBefore(link.children('.itemLabel'));
                }
            } else {
                link.addClass('mainBGCol4 funcLink');
            }
            return link;
        }

        function PopulateItems(items, suggestionPane, rawSrchValue) {
            var srchValue = shell.EscapeSpecialCharsHTML(rawSrchValue);

            if (!suggestionPane.children('.funcs').length) {
                suggestionPane.append(GetNoResultsTemplate());
                suggestionPane.append(GetItemContainerTemplate());
            }

            suggestionPane.toggleClass('noResults', items.length === 0);

            var functions = [];
            var roles = [];
            WorkplaceLabels = GetFunctionSearchLabels();

            var sanitizeSearchItem = function(dataItem) {
                return {
                    ... dataItem,
                    LabelText: shell.EscapeSpecialCharsHTML(dataItem.LabelText),
                    AltSearchText: shell.EscapeSpecialCharsHTML(dataItem.AltSearchText)
                };
            };

            $(items).each(function (index, rawDataItem) {
                var dataItem = sanitizeSearchItem(rawDataItem);
                var isDisabled = dataItem.CssClass.indexOf('disabled') >= 0;
                var notLink = dataItem.WorkplaceId || dataItem.Link === '' || t1.IsPhone || isDisabled;

                /* item creation */
                var searchItem = $(GetItemTemplate())
                    .data('t1-control', dataItem);

                var link = searchItem.find('a').addClass(dataItem.CssClass).removeClass('sum');

                /* Enquiry search button (search within function) */
                if(link.hasClass('enq') && !isDisabled){
                    var tooltip_value = searchItem.data('t1-control').AltSearchText;
                    searchItem.find("a").after(GetEnquirySearchTemplate(tooltip_value));
                }

                if(!notLink) {
                    link.attr('href', dataItem.Link ? dataItem.Link : '');
                }

                //Note: we should set the unsanitised data in the title. Otherwise, tooltip may display something like 'Property &#38; Rating'
                // the attr API makes sure the string passed here is safe. I.e. if Labeltext is '' /><script>alert('a');</script> then the tooltip will display just that
                link.attr({ 'title': rawDataItem.LabelText, 'role': 'listitem', 'tabindex': '0' });

                /* Link icon */
                if (!dataItem.WorkplaceId && dataItem.ImageUrl) {
                    LoadIcon(link, dataItem.ImageUrl);
                }

                if (isDisabled) {
                    link.addClass('disabled opac05').attr('aria-disabled', true);
                }

                /* Label text */
                link.find('.itemLabel').html(publicFunctionSearch.HighLightText(dataItem.LabelText, srchValue));

                /* t1 help */
                searchItem.find('.t1Help').data('t1-control', dataItem);

                /* Alternate text */
                if (dataItem.AltSearchText && dataItem.LabelText != dataItem.AltSearchText) {
                    link.find('.altLabel').html(publicFunctionSearch.HighLightText(dataItem.AltSearchText, srchValue));
                }

                /* Wporkplace role text */
                if (dataItem.WorkplaceTitle) {
                    searchItem.find('.roleTitle .title').text(dataItem.WorkplaceTitle);
                }

                /* if Role dataItem link*/
                if (dataItem.WorkplaceId) {
                    searchItem.addClass('role').find('.iconContainer > span').addClass('icon16 glyph').addClass((dataItem.ImageUrl || 'e050').toLowerCase());
                    link.addClass('uppercase');
                    roles.push(searchItem);
                } else {
                    functions.push(searchItem.addClass('funcLink'));
                    link.parent().find('.goToRole').text('Go to ' + dataItem.WorkplaceTitle);
                }
            });

            if (roles.length && functions.length) {
                roles[0].addClass('first');
            }
            suggestionPane.children('.funcs').empty().append(functions);
            suggestionPane.children('.roles').empty().append(roles);
        }

        function LoadIcon(link, iconUrl) {
            var image = new Image();
            image.src = iconUrl;
            image.onload = function(){
                var css = T1.IE == 8 ? '' : { 'background-image': 'url("' + iconUrl + '")' };
                link.find('.iconContainer > span').css(css);
            };
        }

        function AddSearchItemFromRole (w){
            var funcAddItem = function(altText){
                functionSearchData.push({
                    LabelText: w.LabelText,
                    AltSearchText: altText,
                    WorkplaceId: w.Id,
                    ImageUrl: w.IconGlyph,
                    RoleBehaviour: w.RoleBehaviour,
                    CssClass: 'role'
                });
            };
            /* Add role for Labeltext */
            funcAddItem(w.LabelText);

            /* Add copy of role item for each alt text */
            if(w.AltSearchText) {
                $(w.AltSearchText.split(";;")).each(function (index, altText) {
                    if (altText) {
                       funcAddItem(altText);
                    }
                });
            }
        }


        function GetFunctionMetadata(metaData)
        {
            var metaItems = [];
            if (metaData)
            {
                $(metaData.split(';;'))
                    .each(function(index, mdItem){
                        var mdDetails = mdItem.split('::');
                        if(mdDetails.length > 0){
                            var o = {Item1: mdDetails[0], Item2 : mdDetails[1], Item3: mdDetails[2] || ""};
                            metaItems.push(o);
                        }
                    });
            }
            return metaItems;
        }

        var ___funcNames = {};
        function ItemExists(key){
            if(___funcNames[key]) return true;
            ___funcNames[key] = true;
            return false;
        }

        function AddSearchItemFromFunction (f, w){
            var funcName =  f.FunctionName || '';

            if(funcName.startsWith('$TB.MERGED.FUNC.') || ItemExists(funcName + w.Id + f.Suite)) return;

            funcName = funcName.startsWith("$SRCHONLY.") ? funcName.replace("$SRCHONLY.", "") : funcName;

            var item = {
                FunctionName: funcName,
                LabelText : f.LabelText,
                AltSearchText: f.LabelText,
                Suite: f.Suite,
                WorkplaceIdForRole: w.Id,
                ImageUrl : f.ImageUrl,
                WorkplaceTitle: w.LabelText + ' - ' + f.Suite,
                WorkplaceIcon: w.IconGlyph || '',
                Link: f.Link || '',
                CssClass: f.CssClass + (f.IsEnabled ? '' : ' disabled')
            };

            functionSearchData.push(item);


            if(f.AltSearchText && item.Link){

                var tabbedFunctions = GetFunctionMetadata(f.TabbedFuncs);
                var sections = GetFunctionMetadata(f.SectionNames);

                $(f.AltSearchText.split(";;")).each(function(index, altTextItem){

                    if(tabbedFunctions.length){
                        var tabFunc = tabbedFunctions.filter(function(o){ return (o.Item1 || '').toLowerCase() === altTextItem.toLowerCase() ;})[0];
                        if(tabFunc && tabFunc.Item2){
                            var tItem = $.extend({}, item);
                            tItem.FunctionName = tabFunc.Item2;
                            tItem.Link = tabFunc.Item3;
                            tItem.AltSearchText = altTextItem.trim();
                            functionSearchData.push(tItem);
                            return;
                        }

                    }
                    if(sections.length){
                        var section = sections.filter(function(o){ return (o.Item1 || '').toLowerCase() === altTextItem.toLowerCase() ;})[0];
                        if(section && section.Item2){
                            var secItem = $.extend({}, item);
                            secItem.Link = secItem.Link ? secItem.Link + "&SelectedTab=" + section.Item2 : '';
                            secItem.AltSearchText = altTextItem.trim();
                            functionSearchData.push(secItem);
                            return;
                        }

                    }

                    var altItem = $.extend({}, item);
                    altItem.AltSearchText = altTextItem.trim();

                    functionSearchData.push(altItem);
                });

            }
        }

        function LoadData(callBack) {
            controls.WorkplaceDS.GetDataStore(function (wpdata) {
                functionSearchData = [];

                ___funcNames = {};

                for(var i = 0; i < wpdata.Workplaces.length; i++){
                    var w = wpdata.Workplaces[i];
                    AddSearchItemFromRole(w);
                    for(var x = 0; x < w.Functions.length; x++){
                        var f = w.Functions[x];
                        if((f.Children||[]).length){
                            for(var c = 0; c < f.Children.length; c++) {
                                var cf = f.Children[c];
                                AddSearchItemFromFunction(cf, w);
                            }
                        }
                        else {
                            AddSearchItemFromFunction(f, w);
                        }
                    }
                }

                if (callBack) callBack(functionSearchData);

                ___funcNames = undefined;
            });
        }

        function RemoveLocalStorageData() {
            try {
                var i;
                for (i = 0; i < localStorage.length; i++) {
                    if (localStorage.key(i).indexOf('/FunctionSearch/') > 0) {
                        localStorage.removeItem(localStorage.key(i));
                    }
                }

                for (i = 0; i < sessionStorage.length; i++) {
                    if (sessionStorage.key(i).indexOf('/FunctionSearch/') > 0) {
                        sessionStorage.removeItem(sessionStorage.key(i));
                    }
                }

                sessionStorage.removeItem('wp-session-data');
                sessionStorage.removeItem('t1-usernav-data');
            }
            catch (ex){

            }
        }

        function HighLightText(htmlText, searchKey) {
            searchKey = searchKey.toLowerCase();

            // make sure the LabelText is sanitised against XSS
            // .text() and .html() will return the sanitised text.
            htmlText = $('<span/>').text(htmlText).text();
            htmlText = shell.HighlightKeyword(htmlText, {HighlightSearchKeyword:true, SearchKeyword:searchKey, HighLightClass: "hDrkCol"})

            return htmlText;
        }

        /*
        Saves the assume state for the target function
        */
        function SaveAssumeState(controlData) {

            GetPageSync().LoadFor(controlData.FunctionName, controlData.PageKey);
            var assumeState = {};
            //Note:  currently the controlData doesn't have any information to be stored in the assume state but if it will have, here is the place to save it
            if (GetPageSync().ContainsAssumeState()) {
                assumeState = GetPageSync().GetAssumeState();
            } else {
                assumeState = GetPageSync().GetNewAssumeState();
            }
            assumeState.UseDefaultView = true; // use the default view in target function if supported
            assumeState.OpenedFromWorkplace = true;
            //if (controlData.SearchValue !== undefined) assumeState.SearchValue = controlData.SearchValue;
            if (controlData.SearchValue)
                assumeState.SearchValue = controlData.SearchValue;
            else
                assumeState.SearchValue = "";

            GetPageSync().SetAssumeState(assumeState);
            GetPageSync().Save();
            if (shell.Controls.T1University) shell.Controls.T1University.SetFunctionName(controlData.FunctionName);
        }

        // return a new instance of the public object
        return new T1_C2_Shell_Shared_FunctionSearch_Public();
    }

} ());


/// <reference path="~/Scripts/DevIntellisense.js"/>

(function(undefined) {


    /*
    * Private Members
    */

    var t1 = window.T1 = window.T1 || {},
        c2 = t1.C2 = t1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        sharedControls = shell.Shared || {},
        sharedFunctionSearch = sharedControls.FunctionSearch || {},
        publicFunctionSearch = controls.FunctionSearch = sharedFunctionSearch;


    shell.SessionStorage = shell.SessionStorage || sessionStorage; // fallback if CoreLib is earlier than 2105

    shell.ControlInitialiser.AddControl('FunctionSearch', publicFunctionSearch.Initialise);


    /* Public Functions */

    publicFunctionSearch.Initialise = function (control) {
        if (!$('#GlobalHeader .bannerLeft').is(':visible')) {
            return;
        }

        //load workplace labels into private variable
        WorkplaceLabels = publicFunctionSearch.GetFunctionSearchLabels();

        LoadControl(control);

        if (!publicFunctionSearch.EventsBound) {
            EventsBinding();
            publicFunctionSearch.EventsBound = true;
        }
    };

    publicFunctionSearch.RepositionSearchBar = RepositionSearchBar;


    /*
    * Private Variables
    */


    var Selectors = {
        FunctionSearchId: '#FunctionSearch',
        FunctionSuggestionPane: '.suggestionPane'
    };


    var enquirySearchData;

    var suggestionItems;

    /*
    //OLD Solution - moved into the function
    var enterpriseSearchTemplate =
        ['<div id="FunctionSearch" class="functionSearch initialisableControl" data-t1-control="[]" data-t1-control-type="FunctionSearch">',
            '<input tabindex= "0" type= "text" placeholder= "Enterprise Search" class="initialisableControl" data-t1-control-type="Placeholder" />',
            '<span class="icon24 glyph f044 hDrkCol"></span>' +
            '<div class="suggestionPane mainBCol1"></div>',
            '</div>'];
     */

    var $searchControl;

    var WorkplaceLabels;

    /*
    * Private Functions
    */

    /*
    //OLD Solution - text is now coming from WorkplaceLabels
    function GetEnterpriseSearchText(){
        var $workplace = $(shell.Hash('WpContentContainer'));
        var controlData = $workplace.data('t1-control');
        //controlData.Labels should contain all the required labels
        return controlData.Labels.EnterpriseSearch.Placeholder;
    }
     */

    function PopulateSuggestionPane(autoSuggestControl, items, srchValue) {
        var suggestionPane = autoSuggestControl.children('.suggestionPane');

        autoSuggestControl.removeClass('shown');
        suggestionPane.removeClass('shown').addClass('empty');

        if (items == null) {
            return;
        }

        publicFunctionSearch.PopulateItems(items, suggestionPane, srchValue);

        if (items.length) {
            suggestionItems = suggestionPane.children('.funcs,.roles').children();
            var firstItem = suggestionItems.first().addClass('selected mainBGCol5');
            if(!t1.Touch) firstItem.focus();
        }

        var paneHeight = $(window).height() * 3 / 4;

        suggestionPane.css({ 'max-height': paneHeight });

        suggestionPane.children('.funcs').css({ 'max-height': paneHeight * 2 / 3 });
        suggestionPane.children('.roles').css({ 'max-height': paneHeight / 3 });

        autoSuggestControl.addClass('shown');

        if (controls.iFrame) {
            controls.iFrame.OverlayFix(suggestionPane);
        }
        suggestionPane.removeClass('empty');
    }

    var waitingOnServerData, lastSearch;
    function ShowSuggestions(autoSuggestControl) {

        // if (autoSuggestControl.hasClass('enqInput')) {
        //     return;
        // }

        if (waitingOnServerData) {
            return;
        }
        waitingOnServerData = true;

        publicFunctionSearch.GetData(function (data) {

            waitingOnServerData = false;
            var autoSuggestInput = autoSuggestControl.children('input');


            if (lastSearch && lastSearch == autoSuggestInput.val()) {
                autoSuggestControl.addClass('shown');
                return;
            }

            lastSearch = autoSuggestInput.val();

            if (autoSuggestInput.val().length > 1 && data) {
                PopulateSuggestionPane(autoSuggestControl, publicFunctionSearch.FindMatches(autoSuggestInput.val(), data), autoSuggestInput.val());
            } else {
                PopulateSuggestionPane(autoSuggestControl, null);
            }
        });
    }

    function HideSuggestions(autoSuggestControl, tabKeyPressed) {
        autoSuggestControl.removeClass('active').removeClass('shown');
        $(document.body).removeClass('searchActive')

        /* if tab key pressed dont blur the input */
        if (!tabKeyPressed) {
            autoSuggestControl.children('input').blur();
        }
        BindWindowOnClickHandler(false);
    }

    function ArrowPressed(autoSuggestControl, key) {
        var suggestionPane = autoSuggestControl.children('.suggestionPane'),
            suggestions = suggestionPane.children().children();

        var currentItem = suggestions.filter('.selected'),
            selectItem;

        if (suggestions.length) {
            if (key.Down) {
                selectItem = suggestionItems.eq(suggestionItems.index(currentItem) + 1).length ? suggestionItems.eq(suggestionItems.index(currentItem) + 1) : suggestionItems.first();

            } else if (key.Up) {
                selectItem = suggestionItems.eq(suggestionItems.index(currentItem) - 1).length ? suggestionItems.eq(suggestionItems.index(currentItem) - 1) : suggestionItems.last();
            }
            else if (key.PageDown) {
                selectItem = suggestions.filter('.role').first();
            }
            else if (key.PageUp) {
                selectItem = suggestions.filter('.funcLink').first();
            }
        }

        if (selectItem) {
            currentItem.removeClass('selected mainBGCol5');
            selectItem.addClass('selected mainBGCol5');
            if(!t1.Touch) selectItem.focus();
        }
    }

    function LoadControl() {
        if (!T1.Settings.Portal || !T1.Settings.Portal.HideEnterpriseSearch) {
            var header = $('#GlobalHeader');
            //$searchControl = $(enterpriseSearchTemplate.join("").replace('Enterprise Search', GetEnterpriseSearchText()));
            $searchControl = $(GetEnterpriseSearchTemplate());
            if (header.closest('.wp-v2').length) {
                header.children('.bottomBar').append($searchControl);
            } else {
                header.find('.bannerMiddle').append($searchControl.addClass('compact'));
            }
        }

        publicFunctionSearch.GetData();
    }

    /* TEMPLATES */

    function GetEnterpriseSearchTemplate(){
        return '' +
            '<div id="FunctionSearch" class="functionSearch initialisableControl" data-t1-control="[]" data-t1-control-type="FunctionSearch">' +
                '<input tabindex= "0" type= "text" placeholder= "'+ WorkplaceLabels.EnterpriseSearch.Placeholder +'" class="initialisableControl" data-t1-control-type="Placeholder" />' +
                '<span class="icon24 glyph f044 hDrkCol"></span>' +
                '<div class="suggestionPane mainBCol1"></div>'+
            '</div>';
    }


    //will be replaced with itemContainer when '.enqSearchV2' icon is clicked
    function GetEnquiryContainerTemplate(){
        return ''+
            '<div class="itemEnqContainer flexGrow1 psddingTB10 paddingLR10">' +
                '<span class="itemLabel block marginB5"></span>' +
                '<input class="itemEnquiryText drkCol1" type="text"/>'+
            '</div>';
    }

    //will be replaced with '.optionMenu' (ellipsis '...') when '.enqSearchV2' icon is clicked
    function GetEnquiryActionTemplate(){
        return ''+
            '<div class="enqAction marginL10">' +
                '<div class="ddButton hvr-radial-out dark cBlock borderRadius100pc center padding5" role="button">' +
                    '<span class="glyph icon24 e021"></span>' +
                '</div>' +
            '</div>' ;
    }

    function SetSelectedItem(link){

        //de-select all links
        $.each($('.entSearchItem'),function(){
            var _link = $(this);
            _link.removeClass('selected');
            _link.removeClass('mainBGCol5');
            _link.find('.enqSearchIcon').removeClass('primary').addClass('dark');
        });

        //make this link selected
        link.parent().addClass('selected').addClass('mainBGCol5');
        link.siblings('.enqSearchV2').find('.enqSearchIcon').removeClass('dark').addClass('primary');
    }

    function EnquirySearchEnable(link) {

        //cancel all previous searches
        EnquirySearchDisableAll();

        //make this link selected
        SetSelectedItem(link);

        //data is stored in the parent element
        enquirySearchData = link.parent().data('t1-control');

        //replace itemContainer with itemEnqContainer to allow search
        link.find('.itemContainer').addClass('hidden').after(GetEnquiryContainerTemplate());
        link.find('.itemEnqContainer .itemLabel').text(WorkplaceLabels.EnterpriseSearch.Search + ' ' + enquirySearchData.AltSearchText);
        link.find('.itemEnqContainer input').focus();

        //replace menuOptions (ellipsis)
        link.parent().find('.optionMenu').addClass('hidden').after(GetEnquiryActionTemplate());

        //replace search icon
        link.parent().find('.enqSearchV2').addClass('cancelEnqSearch');
        link.parent().find('.enqSearchV2 .enqSearchIcon').removeClass('f044').addClass('e003').attr('aria-label',WorkplaceLabels.EnterpriseSearch.CancelSearchFunction);

        //if click on the link, will have no action (we are in 'enquiry search' mode)
        link.addClass('enqInput');
    }

    function EnquirySearchDisable(link) {

        link.find('.itemContainer').removeClass('hidden');
        link.find('.itemEnqContainer').remove();

        link.parent().find('.optionMenu').removeClass('hidden');
        link.parent().find('.enqAction').remove();

        link.parent().find('.enqSearchV2').removeClass('cancelEnqSearch');
        link.parent().find('.enqSearchV2 .enqSearchIcon').removeClass('e003').addClass('f044').attr('aria-label',WorkplaceLabels.EnterpriseSearch.Search + ' ' + enquirySearchData.AltSearchText);

        link.removeClass('enqInput');
    }

    function EnquirySearchDisableAll(){

        //cancel all previous searches
        $('.entSearchItem').each(function(){
            var this_id = this.id;

            if($(this).find('a').hasClass('enqInput'))
            {
                var _link = $(this).find('a');
                EnquirySearchDisable(_link);
            }
        });
    }

    /****************** Event Handlers *****************************/

    function OnClickSearchResults(data) {
        /* If the link is a workplace role then go to the Workplace */
        if (data && data.WorkplaceId) {
            if (controls.WorkplaceHome) {
                (controls.WorkplaceHome).SelectRoleFromFunctionSearch(data.WorkplaceId);
            } else {
                shell.SessionStorage.setItem('FunctionSearchSelectedRole', data.WorkplaceId);
                location.href = $('#GoToWorkplace').attr('href');
            }
        }
    }

    function HandleOnClickOutsideSearch(event) {
        if (!t1.Touch && $(document.activeElement).closest(Selectors.FunctionSearchId).length) {
            return;
        }

        var target = $(event.srcElement || event.target);

        if (!target.closest(Selectors.FunctionSearchId).length) {
            var searchControl = $(Selectors.FunctionSearchId);
            HideSuggestions(searchControl);
        }
    }

    function BindWindowOnClickHandler(isAttach) {
        if (publicFunctionSearch.__hasClickEvent === isAttach){
            return;
        }

        publicFunctionSearch.__hasClickEvent = isAttach;

        if (isAttach) {
            $(document.body).on(t1.Click, HandleOnClickOutsideSearch);
        }else{
            $(document.body).off(t1.Click, HandleOnClickOutsideSearch);
        }
    }

    function RepositionSearchBar(){
        if($('body').hasClass('scrolled') && !$searchControl.hasClass('compact')){
            if ($('body').hasClass('phone')) {
                $searchControl.insertAfter('.bannerMiddle').addClass('compact');
            } else {
                $searchControl.appendTo($('#GlobalHeader .bannerMiddle'));
                setTimeout(function () {
                    $searchControl.addClass('compact');
                }, 100);
            }
        }

        if(!$('body').hasClass('scrolled') && $searchControl && $searchControl.hasClass('compact')){
            $searchControl.removeClass('compact').appendTo('#GlobalHeader > .bottomBar');
        }
    }


    /*
    * Events
    */

    function EventsBinding() {


        $(document).on('focus', Selectors.FunctionSearchId, function (event) {

            var functionSearch = $(this).closest(Selectors.FunctionSearchId);
            functionSearch.addClass('active');
            $(document.body).addClass('searchActive')

            if (!functionSearch.hasClass('shown')) {
                ShowSuggestions(functionSearch);
            }
            BindWindowOnClickHandler(true);
        });


        $(document).on('keydown', Selectors.FunctionSearchId, function (event) {
            var key = t1.Key || {};
            var functionSearch = $(this), selectedLink;


            if (key.Enter) {

                selectedLink = $(".suggestionPane .funcs").children('.selected');

                if (selectedLink.length) {

                    var focusedElement = document.activeElement;

                    if($(focusedElement).hasClass('enqSearchV2')){
                        //focus is on 'enquiry Search' icon, so enable the 'enquiry search'
                        $(focusedElement).trigger(t1.Click);
                    }
                    //else if($(focusedElement).hasClass('optionMenu')){
                    //    //focus is on 'option menu' (ellipsis) icon, so enable the 'option menu'
                    //    $(focusedElement).children('.ddButton').trigger(t1.Click);
                    //    $(focusedElement).children('.menu').children().first().focus();
                    //}
                    else if($(focusedElement).hasClass('itemEnquiryText')){
                        //focus is on 'enquiry input text', so action the enquiry
                        EnquirySearchAction(selectedLink.find('a'));
                    }
                    else{
                        //trigger the link click action
                        selectedLink.children('a').trigger(t1.Click);
                        HideSuggestions(functionSearch);
                        event.preventDefault();
                        return false;
                    }
                }
            }
            else if (key.Tab) {

            }
            else if (key.Back) {
                input = functionSearch.children('input');

                if (input.val() == '' && functionSearch.hasClass('enqInput')) {
                    EnquirySearchDisble(functionSearch);
                }
            }
            else if(key.Esc){
                event.preventDefault();
                EnquirySearchDisableAll();
                HideSuggestions(functionSearch, false);
            }
            else if (key.Up || key.Down || key.PageUp || key.PageDown) {
                event.preventDefault();
                ArrowPressed(functionSearch, key);
            }
        });


        $(document).on('keyup', Selectors.FunctionSearchId, function(event) {

            var functionSearch = $(this);
            ShowSuggestions(functionSearch);

            var _key = t1.Key || {};

            //when tabbed on link (select item when tabbed)
            if(_key.Tab && $(document.activeElement).parent().hasClass('entSearchItem') ){

                SetSelectedItem($(document.activeElement));
            }

            //when tabbed on enquirySearch icon
            if(_key.Tab && $(document.activeElement).hasClass('enqSearchV2') ){

                $(document.activeElement).find('.enqSearchIcon').removeClass('dark').addClass('primary');
            }

            //if no text for function search, action arrow to be disabled color, otherwise primary color
            if($(document.activeElement).hasClass('itemEnquiryText')){
                var actionIcon      = $('.enqAction .ddButton .glyph');
                var enquiryInput    = $('.itemEnquiryText');

                if(enquiryInput && enquiryInput.val().length > 0)
                    actionIcon.addClass('primary');
                else
                    actionIcon.removeClass('primary');
            }

        });

        $(document).on('sck_FocusSearch', function(event) {
            event.preventDefault();
            $('#FunctionSearch').children('input').focus();
        });

        //
        // Handles click on search result links
        //
        $(document).on(T1.FastClick, Selectors.FunctionSearchId + ' .entSearchItem > a', function (event) {
            var link = $(this);
            var item = link.parent();

            // save current function's role for later use
            var itemData = item.data('t1-control');
            var roleData = controls.WorkplaceDS.GetDataById(itemData.WorkplaceIdForRole);
            if (typeof T1.C2.Shared.Shell.SetWorkplaceStartingRole === 'function'){
                T1.C2.Shared.Shell.SetWorkplaceStartingRole(
                    {
                        WorkplaceIdForRole: itemData.WorkplaceIdForRole,
                        RoleData: roleData,
                        FunctionName: itemData.FunctionName,
                        LabelText: itemData.LabelText
                    });
            }

            event.preventDefault();

            //if in 'Enquiry Search' mode, disable click on link
            if($(event.target).closest('a').hasClass('enqInput'))
                return;

            // Ensure link is navigated to across all browsers (iPad only fires when text item within A tag clicked)
            var linkData = item.data('t1-control');
            if (linkData.Link) {

                if (linkData.FunctionName && !linkData.PageKey) {
                    linkData.PageKey = new Date().format('yyyyMMddHHmmss');
                    linkData.Link += '&pagekey=' + linkData.PageKey;
                }

                // save the assume state for the target function
                publicFunctionSearch.SaveAssumeState(linkData);

                // Prevent default behaviour to ensure link isn't requested twice
                window.location.href = linkData.Link;
            } else {
                OnClickSearchResults(linkData);
                HideSuggestions(link.closest(Selectors.FunctionSearchId));
            }
        });

        $(document).on(T1.FastClick, Selectors.FunctionSearchId + ' .entSearchItem > .enqSearchV2 ', function (event) {
            /* Enquiry Search Button pressed */
            var link = $(this).prev();
            var item = link.parent();

            if($(this).hasClass('cancelEnqSearch'))
                EnquirySearchDisable(link);
            else
                EnquirySearchEnable(link);
        });

        $(document).on(T1.FastClick, Selectors.FunctionSearchId + ' .entSearchItem > .enqAction ', function (event) {
            /* Enquiry Action Button pressed */
            var link = $(this).parent().children('a');
            EnquirySearchAction(link);
        });

        function EnquirySearchAction(link){

            enquirySearchData.SearchValue = $(link).find('.itemEnqContainer input').val();

            if(!enquirySearchData.SearchValue || enquirySearchData.SearchValue.length === 0) return;

            if (enquirySearchData.Link && enquirySearchData.FunctionName && !enquirySearchData.PageKey) {
                enquirySearchData.PageKey = new Date().format('yyyyMMddHHmmss');
                enquirySearchData.Link += '&pagekey=' + enquirySearchData.PageKey;
            }

            // save the assume state for the target function
            publicFunctionSearch.SaveAssumeState(enquirySearchData);

            //show rotation icon
            $('.enqAction .ddButton .glyph').removeClass('e021').addClass('e296').addClass('loading');

            window.location.href = enquirySearchData.Link;
        }

        var ddMenu;
        $(document).on(t1.FastClick, '.optionMenu > .ddButton', function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            var ddBtn = $(this);
            if(ddMenu && ddMenu.length && ddMenu.is('.shown')){
                ddMenu.removeClass('shown');
                $('body').removeClass('hasOptionMenu');
                ddMenu = undefined;
                return;
            }
            ddMenu = ddBtn.siblings('.menu').addClass('shown');

            // if in enterprise search make position static
            if(ddMenu.closest('.functionSearch').length) {
                ddMenu.css(ddBtn.offset());
            }

            $('body').addClass('hasOptionMenu')
                .trigger('OptionMenuShown', event);

        });

        $(document).on(t1.FastClick, '.optionMenu .menu .item:not(.disabled)', function (event) {
            var body = $('body').trigger('OptionMenuItemClicked', event);

            $(ddMenu).removeClass('shown').removeAttr('style');
            body.removeClass('hasOptionMenu');
        });

        $(document).on(t1.FastClick, 'body.hasOptionMenu', function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            var target = $(event.target);
            if(target.closest('.optionMenu').length){
                return;
            }
            $(ddMenu).removeClass('shown');
            $('body').removeClass('hasOptionMenu');
        });

    }
}());


/// <reference path="~/Content/Scripts/Start.js"/>

(function (undefined) {

    /*
    * Private Members
    */

    var t1 = window.T1 = window.T1 || {},
        c2 = t1.C2 = t1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls || {},
        publicHeader = controls.GlobalHeader = controls.GlobalHeader || new T1_C2_Shell_Controls_GlobalHeader();


    /**************************************************************************
    *
    */
    function T1_C2_Shell_Controls_GlobalHeader() {
        /// <summary>
        /// Initialises a new instance of the  control
        /// </summary>

        var InWorkplace = true;
        var breadcrumbSeparator = "";

        function T1_C2_Shell_Controls_GlobalHeader_Public() {
            /// <summary>
            /// Constructor for the librarys public API
            /// </summary>
        }

        function AddWorkplaceButtonLabels() {
            // $('#GoToWorkplace').empty()
            //     .append('<span class="icon16 shellFG glyph e041"></span>' +
            //     '<span class="buttonLabel shellFG">Home</span>');
            //
            // $('#ShowFlow').empty()
            //     .append(
            //     '<span class="icon16 glyph e547 shellFG"></span>' +
            //     '<span class="buttonLabel shellFG">Menu</span>' +
            //     '<span class="notificationCount" style="display: none"></span>'
            //     );
        }

        function Initialise() {

            AddWorkplaceButtonLabels();

            var tmp_separator = $('header .templates .separator');
            if(shell.ElementExists(tmp_separator))
                breadcrumbSeparator = tmp_separator.clone(true)[0].outerHTML;

            if ($('#GlobalHeader > .simple').length) {
                return;
            }

            InWorkplace = $(shell.Hash('GlobalHeader')).parent().hasClass('wp-v2');

            if(!InWorkplace){
                PreparePageTitle();
                //for all patterns header is collapsed, so add required class
                $(document.body).addClass('collapsedHeader');
            }


            /* Enterprise search control initialisation */

            if (controls.FunctionSearch) {
                controls.FunctionSearch.Initialise();
                if(!InWorkplace)
                {
                    LoadPageTitleRoleDropdown();
                }
            }

            /* Global user navigation */

            if (controls.UserNavigation) {
                controls.UserNavigation.Initialise();
            }

            //Show environment color in global header
            ShowEnvironmentColor();

            RegisterGlobalEvents();
        }


        T1_C2_Shell_Controls_GlobalHeader_Public.prototype = {
            Initialise: Initialise
        };

        function RegisterGlobalEvents(){
            //Apply Tooltip handler
            $(document).on('mouseenter focus','.showTooltip', HandleEventTooltip).on('mouseleave click','.showTooltip', shell.HideTooltip);

            $(document).on(T1.FastClick, '#PageTitle .roleLabel', function(event){

                var startingRole = GetStartingRole();
                var rd = startingRole.RoleData;
                if(!rd || rd.Id !== startingRole.WorkplaceIdForRole)
                    return;

                controls.PageSync.LoadFor("Workplace");
                var assumeState = {};
                if (controls.PageSync.ContainsAssumeState()) {
                    assumeState = controls.PageSync.GetAssumeState();
                } else {
                    assumeState = controls.PageSync.GetNewAssumeState();
                }
                assumeState = $.extend({}, assumeState, {CurrentWorkplace: rd.Id});

                controls.PageSync.SetAssumeState(assumeState);
                controls.PageSync.Save();
                window.location = T1.Environment.Paths.RootEnvironmentUrl + 'Workplace';

            });

            $(document).on('mouseover',  '#PageTitle .roleLabel', HandleOnHoverMenu );
            $(document).on('mouseleave', '#PageTitle .roleLabel', HandleHideHoverMenu);
            $(document).on('mouseenter', '#PageTitle .roleHoverMenuPanel', function(){ $(this).addClass('shown').addClass('onHover');});
            $(document).on('mouseleave', '#PageTitle .roleHoverMenuPanel', function(){ $(this).removeClass('shown');});

            $(document).on(T1.FastClick, '#GlobalHeader .accessibilityModeContainer .accessibilityMode', function(event){
                shell.SetToAccessibilityMode(true);
            });
        }

        function ShowEnvironmentColor(){

            if(!$("#GlobalHeader").hasClass("showEnvColour"))
                return false;

            var pageLogo = $("#PageTitle .logo");
            var envColor = $('header .templates .envColor').clone(true);
            var envId = T1.Environment.EnvironmentId;
            envColor.attr('aria-label',envId);
            envColor.find('.envName').text(envId);
            pageLogo.after(envColor);
        }

        function PreparePageTitle(){
            var pageTitle = $('#PageTitle');
            pageTitle.addClass('flex').parent().addClass('center');
            pageTitle.find('h1').before(GetRoleHoverMenuTemplate()).before($(breadcrumbSeparator));
            pageTitle.find('.logo').after($(breadcrumbSeparator));
        }

        function GetRoleHoverMenuTemplate(){
            return $('header .templates .roleHoverMenu').clone(true);
        }

        function GetStartingRole(){

            var startingRole;
            if (typeof T1.C2.Shared.Shell.GetWorkplaceStartingRole === 'function'){
                startingRole = T1.C2.Shared.Shell.GetWorkplaceStartingRole();
            }else{
                // App using an old version of corelib so fall back to old way of getting role data
                shell.Shared.FunctionSearch.GetData(function(allfuncSearchData){
                    startingRole = allfuncSearchData.filter(function (_f) {
                        return _f.FunctionName === f && _f.Suite === s && _f.WorkplaceIdForRole !== '__HOME';
                    })[0];
                });
            }

            return startingRole;
        }

        function LoadPageTitleRoleDropdown() {
            var f = T1.Environment.Context.Function.Name;
            var s = T1.Environment.Context.Suite.Name;
            var startingRole = GetStartingRole();
            var previousFunctionLabel = startingRole.LabelText;
            var pageTitle = $('#PageTitle');

            if (Object.IsNull(startingRole) || String.IsNullOrWhiteSpace(startingRole.WorkplaceIdForRole)) {
                //hide role-Menu as there is no role to show
                pageTitle.find('.roleHoverMenu').css('display','none');
                pageTitle.find('.roleHoverMenu').prev().css('display','none');

                return;
            }

            //hide page title while constructing breadcrumbs
            pageTitle.addClass('loading');

            //if this function is primary, then replace the page title with this primary function title
            //if this function is secondary (category = SEC), then leave page title as is, just add primary function to breadcrumbs
            var callback = function(largeData , pageTitle){
                var wpData = largeData;
                var found = false;

                $.each(wpData.Workplaces, function(){

                    var _f = this.Functions.find(x => x.FunctionName === f || x.FunctionName === "$TB.MERGED.FUNC." + f);
                    if(_f){
                        found = true;
                        return false;
                    }
                });

                //after search is done, page title can be visible
                pageTitle.removeClass('loading');

                if(found){
                    //is NOT secondary function, so update starting-role function
                    var title = pageTitle.find('.title').text();

                    T1.C2.Shared.Shell.SetWorkplaceStartingRole(
                        {
                            WorkplaceIdForRole: startingRole.WorkplaceIdForRole,
                            RoleData: startingRole.RoleData,
                            FunctionName: f,
                            LabelText: title
                        });

                    //on tablet, construct dropDown for the breadcrumbs
                    if(shell.IsTablet())
                        CreateBreadcrumbsDropdown(pageTitle);
                }
                else{
                    //This is secondary function, so extend the breadcrumbs

                    if(previousFunctionLabel.length > 0){
                        //on tablet, construct dropDown for the breadcrumbs
                        if(shell.IsTablet())
                            CreateBreadcrumbsDropdown(pageTitle, previousFunctionLabel);
                        else
                            roleLabel.after('<h1 class="shellFG">' + previousFunctionLabel + '</h1>').after($(breadcrumbSeparator));
                    }

                }
            }

            controls.WorkplaceDS.GetDataStore( function(data){
                callback(data || {}, pageTitle);
            });

            //get role data
            var rd = startingRole.RoleData;
            if(!rd || rd.Id !== startingRole.WorkplaceIdForRole)
                return;

            var roleLabel = pageTitle.find('.roleLabel');
            pageTitle.find('.icon12').removeClass('hidden');
            roleLabel.text(rd.LabelText);

            var parentContainer = pageTitle.find('.roleHoverMenuPanel');
            var tabHandleContainer = parentContainer.children('.tabHandles');
            var tabContentContainer = parentContainer.children('.tabContents');

            $(rd.Functions).each(function(index, f){
                var isFolder = (f.Children || []).length > 0;
                var groupId = "_" + (isFolder ? f.Id : (f.Group || '').toLowerCase());
                var groupLabel = !isFolder ? ((f.Group || '').toLowerCase() === 'major' ? 'Functions' : f.Group) : f.LabelText;

                var groupPanel = tabContentContainer.children('.' + groupId);
                if(!groupPanel.length){
                    groupPanel = $('<div>').addClass(groupId).toggleClass('hidden', index > 0).appendTo(tabContentContainer);
                    $('<div>').addClass('tabHandle mainBCol1').toggleClass('pointer', index > 0).data('t1-tab', groupId)
                        .text(groupLabel)
                        .appendTo(tabHandleContainer)
                        .click(function(){
                            var $this = $(this).toggleClass('pointer');
                            $this.siblings().addClass('pointer');
                            var tabid = $this.data('t1-tab');
                            tabContentContainer.find('.' + tabid).removeClass('hidden').siblings().addClass('hidden');
                        });
                }
                if(isFolder){
                    $(f.Children).each(function (index, cf){
                        groupPanel.append(shell.Shared.FunctionSearch.CreateFunctionItem(cf));
                    });
                }else{
                    groupPanel.append(shell.Shared.FunctionSearch.CreateFunctionItem(f));
                }
            });
        }

        function CreateBreadcrumbsDropdown(pageTitle, previousFunctionLabel){

            var dropDownItems = [];
            //get Role-Menu to be moved under dropDown control
            var roleHoverMenu = pageTitle.find(".roleHoverMenu");
            dropDownItems.push({ItemType: 'Element' , ElementBody: roleHoverMenu[0] , Enabled: true , IsVisible: true});

            //if primary function label is provided, create additional item for it in dropDown control
            if(previousFunctionLabel){
                dropDownItems.push({ItemType: 'Leaf' , LabelText: previousFunctionLabel , Enabled: false , IsVisible: true});
            }
            var dropdownControl = controls.DropDownControl.BuildControl(
                dropDownItems,
                null,
                null,
                { Classes: 'breadcrumbsDropdown'});

            //add dropdown control after first separator in breadcrumbs
            pageTitle.find('.separator')[0].after(dropdownControl[0]);
        }

        var  __hvrListView = $(), __hvrTimer, __hvrOutTimer;
        function HandleOnHoverMenu(e){
            $(e.target).addClass('onHover');
            clearTimeout(__hvrTimer);
            __hvrTimer = setTimeout(function(){
                __hvrListView = $('#PageTitle').find('.roleHoverMenuPanel');
                //show panel only if mouse still over the label
                if($(e.target).hasClass('onHover')){
                    __hvrListView.addClass('shown');
                }
            }, 700);
        }

        function HandleHideHoverMenu(e){
            //give some time if user wants to move mouse on the drop-down menu
            setTimeout(function(){ HideHoverMenu(e); } , 500);
        }

        function HideHoverMenu(e){
            clearTimeout(__hvrOutTimer);
            clearTimeout(__hvrTimer);
            var target = $(e.target);
            if(__hvrListView.length && !__hvrListView.hasClass('onHover')) {
                __hvrListView.removeClass('shown');
                __hvrListView.removeClass('onHover');
            }

            __hvrOutTimer = setTimeout(function (){
                if(!__hvrListView.hasClass('.shown')){
                    $(e.target).removeClass('onHover');
                    __hvrListView = $();
                }
            } , 300);
        }

        if (T1.Environment.Context.User.IsLoggedOn) {
            $(document).ready(function () {
                Initialise();
            });
        }

        function HandleEventTooltip(e) {
            if(T1.Features.HideHintText || T1.Touch) { return; }
            shell.ShowTooltip($(this));
        }


        // return a new instance of the public object
        return new T1_C2_Shell_Controls_GlobalHeader_Public();
    }

} ());



(function (undefined) {

    var t1 = window.T1 = window.T1 || {},
        c2 = t1.C2 = t1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicUserNav = controls.UserNavigation = controls.UserNavigation || T1_C2_Shell_Controls_UserNavigation();


    function T1_C2_Shell_Controls_UserNavigation() {
        /// <summary>
        /// Initialises a new instance of the WorkplaceControlsLoader
        /// </summary>

        /*
        * Public API
        */

        function T1_C2_Shell_Controls_UserNavigation_Public() {
            /// <summary>
            /// Constructor for the librarys public API
            /// </summary>
        }

        T1_C2_Shell_Controls_UserNavigation_Public.prototype = {
            Initialise: Initialise
        };

        /*
        * Private Members
        */



        /*
        * Private Functions
        */


        function Initialise() {

            if (publicUserNav.EventsBound) {
                return;
            }

            publicUserNav.EventsBound = true;

            var userNavControl = $('#GlobalHeader #UserNavigation');

            /* check if already exists */

            if (!userNavControl.length || userNavControl.children().length) {
                return;
            }

            /* Get the control layout and data */
            var req = {
                ControlName: "UserNavigation"
            };

            var funcSuccess = function (response) {
                if (response && response.Html) {
                    userNavControl.html(response.Html);

                    if (userNavControl.hasClass('notAvailable')) {
                        userNavControl.find('.dropdownPanel').remove();
                    }

                    // Resize the drop down panel so that we don't cut off any buttons on certain devices e.g Iphone
                    if (t1.IsPhone){
                        var dropDownControl = userNavControl.find('.dropdownControl');
                        if (dropDownControl.length === 0) return;

                        var resizeCallback = function(isVisible){
                            if(!isVisible) return;

                            var dropDownPanel = dropDownControl.find('.dropdownPanel');
                            if (dropDownPanel.length === 0) return;

                            var windowHeight = $(window).height();
                            var footerHeight = c2.Shell.GetFooterHeight();
                            var panelTop = dropDownPanel.position().top;

                            var availableHeight = windowHeight - footerHeight - panelTop;
                            var styles = { "max-height": availableHeight, "overflow-y": "scroll"};

                            dropDownPanel.css(styles);
                        };

                        controls.DropDownControl.DropDownClickedCallback(dropDownControl, resizeCallback);
                    }
                }
            };

            //var cacheData = window.sessionStorage.getItem('t1-usernav-data');

            //if (cacheData) return funcSuccess(JSON.parse(cacheData));

            shell.Ajax({
                url: T1.Environment.Paths.RootEnvironmentUrl + 'Workplace/Controls/GetData',
                data: JSON.stringify(req),
                blocking: false,
                success: function (resp) {
                    //window.sessionStorage.setItem('t1-usernav-data', JSON.stringify(resp));
                    funcSuccess(resp);
                }
            });
        }

        // return a new instance of the public object
        return new T1_C2_Shell_Controls_UserNavigation_Public();
    }
}());

(function (undefined) {

    /*
    * Private Members
    */

    var t1 = window.T1 = window.T1 || {},
        c2 = t1.C2 = t1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        shared = c2.Shared = c2.Shared || {},
        controls = shell.Controls = shell.Controls || {},
        publicFlow = controls.Flow = controls.Flow || new T1_C2_Shell_Controls_Flow();

    shell.SessionStorage = shell.SessionStorage || sessionStorage; // fallback if CoreLib is earlier than 2105

    shell.ControlInitialiser.AddControl('Flow', publicFlow.Initialise);

    var classInProgress = 'inProgress',
        searchTimeOut,
        animationInProgress = false,
        checkSharedNotificationTimer = 60000;

    var hasThemeDemo;

    var regionSettingsCacheKey = "t1-regional-settings";
    var cultureCacheKey = "t1-culture";
    /**************************************************************************
    * Library: T1.CoreLib.Client.Controls.Flow
    */

    function T1_C2_Shell_Controls_Flow() {
        /// <summary>
        /// Initialises a new instance of the functionSearch control
        /// </summary>


        /*
        * Public API
        */

        function T1_C2_Shell_Controls_Flow_Public() {
            /// <summary>
            /// Constructor for the librarys public API
            /// </summary>
        }


        T1_C2_Shell_Controls_Flow_Public.prototype = {
            Initialise: function (control) {
                control.addClass('initialised');
            },
            IsActive: function () {
                return publicFlow.Enabled;
            },
            ShowHide: AnimateShowHideFlow,

            GetPageReloadCheck: GetPageReloadCheck,

            SetPageReloadCheck: SetPageReloadCheck,

            Load: LoadContent,

            Share: Share,

            AddControl: AddControl,

            AddOptionLink: AddOptionLink,
        };

        /*
        * Private Members
        */

        var myPublicApi;
        var directShare = false;
        var shareCallback = undefined;


        /*
        * Private Functions
        */

        /*
        * Shared between Phone and Desktop. Consider (Phone/Page.jsfor desktop) before changing following two functions.
        */
        // Sets a flag for Page to perform force refresh
        function SetPageReloadCheck(cacheName) {
            if (controls.PageSync) {
                controls.PageSync.LoadFor(cacheName || "FormReload");
                var assumeState = controls.PageSync.GetAssumeState();
                assumeState.PageReload = true;
                controls.PageSync.SetAssumeState(assumeState);
                controls.PageSync.Save();
            }
        }

        // Note: Consider phone version as well.
        function GetPageReloadCheck(cacheName) {
            if (controls.PageSync) {
                controls.PageSync.LoadFor(cacheName || "FormReload");
                var assumeState = controls.PageSync.GetAssumeState();
                if (assumeState.PageReload) {
                    controls.PageSync.ClearAssumeState();
                    controls.PageSync.Save();
                    return true;
                }
            }
            return false;
        }

        /******************************************************************************************
        *********************************  HELPERS ************************************************
        *****************************************************************************************/

        var templateContainer;
        var thisflowControl = $();

        function GetFlowControl(control) {
            if (thisflowControl.length) {
                return thisflowControl;
            }

            if (control) {
                thisflowControl = $(control).closest('#flow');
            } else {
                thisflowControl = $('#flow');
            }
            return thisflowControl;
        }

        function GetTemplate(className) {
            templateContainer = templateContainer || $('#FlowTemplates');

            return templateContainer.find(className).clone();
        }

        function FlowAjaxRequest(options) {
            if (Object.IsNull(options.QueueOnPausedAjax)) options.QueueOnPausedAjax = true;

            if(options.Data) options.Data.ResponsiveLayout = true;

            return T1.C2.Shell.Ajax({
                url: T1.Environment.Paths.RootEnvironmentUrl + 'Workplace/Flow/' + options.FunctionName,
                data: JSON.stringify(options.Data),
                blocking: false,
                ShowLoader: false,
                activeUserCheck: true,
                success: options.SuccessCallback,
                complete: options.CompleteCallback,
                initialiseControls: options.InitControls,
                importScripts: options.InitControls,
                ignoreErrors: true,
                queueOnPausedAjax: options.QueueOnPausedAjax
            }, GetFlowControl());
        }

        function LoadContent(control, callBack) {
            if (!control) {
                control = GetFlowControl();
            }

            var includeLayout = !control.hasClass('loaded');

            // Request data
            var reqData = {
                IncludeLayout: includeLayout,
                initialiseControls: includeLayout,
                SharedMarkAsRead: markAsReadSharedNotifications
            };

            // Call back after ajax request
            var callbackAfterLoad = function (response) {
                if (!response) { return; }
                CreateFlowLayout(control, response);
                ResizeFitFlowWindow();
                CreateRecentsViews(response.Recents);
                CreateSharedViews(response.Shared, response.TotalShared);
                AddToNotificationView(response.Notifications);
                if (callBack) callBack();
            };

            FlowAjaxRequest({ FunctionName: 'FlowContent', Data: reqData, SuccessCallback: callbackAfterLoad, InitControls: includeLayout });
        }

        function Share(requestData, callBack, itemId, itemLabel) {

            directShare = true;
            shareCallback = callBack;

            // show flow
            AnimateShowHideFlow(null, function() {
                // show sharing tab
                $('.flowTabHandle.tabSharing').trigger(t1.FastClick);

                // show sharing
                ShowShareFunctionPanel($('#ShareCurrentFunction'), requestData, itemId, itemLabel);

            });

        }

        function AddControl(control, menu) {

            var flowControl = GetFlowControl();
            var wrapper = flowControl.closest('.flowWrapper');

            $('#Pan' + menu + ' > .fieldsContainer').append(control.on(T1.Click, function () { HideFlow(wrapper, flowControl); }));
        }

        function AddOptionLink(optionLinkData, menuName){
            if(!optionLinkData || !menuName){ return; }

            optionLinkData = optionLinkData || { Text: '', Link: '', Icon: '', CssClass : ''};

            if(!optionLinkData.Text) { return; }

            var link = Create('a')
                .append(Create('span', "glyph icon16 marginR10 " + optionLinkData.Icon).prop('aria-hidden', true))
                .addClass(' functionLink ' + optionLinkData.CssClass)
                .append(Create("span", "optionItemLabel").text(optionLinkData.Text))
                .prop(optionLinkData.Link !== '' ? {'href': optionLinkData.Link, target: '_blank', "tabindex": 0} : {});

            if(optionLinkData.Data) {
                link.attr("data-t1-control", JSON.stringify(optionLinkData.Data));
            }

            $('#Pan' + menuName + ' > .fieldsContainer').append(link);
        }

        function CreateFlowLayout(flowControl, response) {

            if (!response.LayoutContent) {
                return;
            }

            var hasLoadedBefore = flowControl.hasClass('loaded');

            /* This event is handled in Userdetails.jsto hide user profile links if the user has not access. */
            if (!hasLoadedBefore && !response.IsAllowedUserProfiles) {
                $('body').trigger($.Event('UpdateUserProfileLinks'));
            }

            /* This event is handled in Userdetails.jsto hide the edit profile link if the user does not have access */
            if (!hasLoadedBefore && !response.IsAllowedToEditProfile) {
                $('body').trigger($.Event('UpdateUserProfileEditLink'));
            }



            if (!hasLoadedBefore) {
                flowControl[0].innerHTML = response.LayoutContent;
                flowControl.addClass('loaded');
                if (!shell.ControlInitialiser.ImportScripts) {
                    var elemsToInsert = flowControl.find('script,link');
                    elemsToInsert.each(function () {
                        $('head').append(this.outerHTML);
                        $(this).remove();
                    });
                }

                //
                // Do after load initialisation stuff
                //

                $('#FlowContent').css('display', '');

                // Hide display mode options if current app doesnt support it
                if (!t1.DisplayMode) {
                    $('#PanSettings').find('.displayMode').remove();
                }

                if (t1.IsTablet || !t1.Events.ShowShortcutList) {
                    $('#PanSettings').find('.viewShortcuts').remove();
                }

                DisplayRoleType();
                SetHintTextOption();

                AddT1UniversityLinks();
                createPriorityMessagePanel();
                flowControl.trigger($.Event('Flow.Action', { Action: 'Loaded' }));
            }
        }

        function Create(tagName, classNames, id) {
            return $(document.createElement(tagName)).addClass(classNames).prop('id', id);
        }

        function AddT1UniversityLinks() {
            controls.T1University.AddFlowLinks($('#FlowContainer > .flowTabHandlesContainer'));

            controls.T1University.GetRelease(function (releaseData) {
                /* Release code placeholder bottom flow menu env id section */
                $('#EnvAppReleaseCode').text((releaseData || {}).ReleaseCode || '');
            });
            createPriorityMessagePanel();

        }

        function ShowFlow(control) {

            // This is for ignoreWidescreen mode
            control.parent().toggleClass('fixedWidth', !$('#GlobalHeader').hasClass('maxScreen'));

            var funcDropFlowMenu = function () {
                control.show();

                if (t1.IE < 10) {
                    control.animate({ 'top': 0 });
                } else {
                    control.css('top', 0);
                }

                setTimeout(function () {
                    // Clear input text
                    $('#SearchRecents').val('');

                    animationInProgress = false;
                    publicFlow.Enabled = true;

                }, 300);

                control.parent().addClass('loaded');
                $('#CloseFlow').focus();
            };

            if (control.hasClass('loaded')) {
                setTimeout(function () {
                    funcDropFlowMenu();
                    funcDropFlowMenu = undefined;
                }, 50);
            }

            setTimeout(function () {
                LoadContent(control, funcDropFlowMenu);
            }, 300);
        }

        function HideFlow(wrapper, control) {
            setTimeout(GotoFlowHome, 300);

            if (t1.IE < 10) {
                control.animate({ 'right': -control.width()  }, 500);
            } else {
                control.css('right', -control.width());
            }

            //if (directShare) {
            //    CancelShareFunction(true);
            //    directShare = false;
            //    shareCallback = undefined;
            //}

            wrapper.addClass('in');
            setTimeout(function () {
                wrapper.removeClass('in active');
                animationInProgress = false;
                publicFlow.Enabled = false;
            }, 500);
        }

        function AnimateShowHideFlow(event, callBack) {
            if (animationInProgress) {
                return;
            }

            if (hasThemeDemo) {
                RemoveThemeDemo();
            }

            if (event && event.preventDefault)
                event.preventDefault();

            var control = GetFlowControl();
            var wrapper = control.closest('.flowWrapper');
            var height = getWindowHeight() - 10;

            animationInProgress = true;

            control.css({ right: 0 });
            wrapper.addClass('active');

            if (!publicFlow.Enabled) {
                setTimeout(function () {
                    ShowFlow(control);
                    if (typeof callBack === 'function') {
                        callBack();
                    }
                }, 50);

            } else {
                HideFlow(wrapper, control);
            }
        }

        function GotoFlowSection(selectors) {
            selectors = selectors || [];
            var funcTimer = function() {
                if (selectors.length) {
                    setTimeout(function () {
                        $(selectors[0]).trigger(t1.FastClick);
                        selectors.splice(0, 1);
                        funcTimer();
                    }, 500);
                }
            };
            AnimateShowHideFlow(null, function () {
                funcTimer(selectors);
            });
        }

        function ResizeFitFlowWindow() {

            var flowControl = GetFlowControl();
            var windowHeight = getWindowHeight();
            var containerHeight = windowHeight - 200;
            var tabContent;

            flowControl.height(windowHeight);

            tabContent = $('#tabsRecents');
            if (tabContent.length) {
                tabContent.children('.flowTabsContainer').height(containerHeight);
            }

            tabContent = $('#tabsShare');
            if (tabContent.length) {
                tabContent.children('.flowTabsContainer').height(containerHeight - 40);
            }

            tabContent = $('#PanThemes');
            if (tabContent.length) {
                tabContent.children('.fieldsContainer').height(windowHeight - 40);
            }
        }

        function Search(input, searchFunction, onBlur) {
            var timer = 500;
            clearTimeout(searchTimeOut);

            searchTimeOut = setTimeout(
                function () {
                    searchFunction(input);
                    if (!onBlur) {
                        input.focus();
                    }
                    clearTimeout(searchTimeOut);
                },
                timer
            );
        }

        function getWindowHeight() {
            return (shell.GetWindowHeight) ? shell.GetWindowHeight() : $(window).height(); // Handle backwards compatibility
        }

        function GetCookie (cookieName) {
            return shell.GetCookie(cookieName);
        }

        function SetCookie (name, value, expire) {
            shell.SetCookie(name, value, expire);
        }

        /******************************************************************************************
        *********************************  RECENTS ************************************************
        *****************************************************************************************/


        function CreateRecentsView(dataItems, container) {
            container.empty();

            var tmpCategory = GetTemplate('.recentsTemp').addClass('recentsItemCategory').removeClass('initialised').addClass('initialisableControl');
            var tmpItem = GetTemplate('.recentsItem');
            var itemsFound = false;
            for (var type in dataItems) {
                if (!dataItems.hasOwnProperty(type)) {
                    break;
                }

                if (!dataItems[type].length) { continue; }
                itemsFound = true;

                var panelId = shell.RemoveSpecialChar(type),
                    categoryItem = tmpCategory.clone().attr('id', panelId).data('t1-control-id', panelId);
                var content = categoryItem.find('.fieldsContainer');

                // Heading
                categoryItem.find('h1').text(type).addClass('');

                // Items list
                for (var i = 0; i < dataItems[type].length; i++) {
                    var itemData = dataItems[type][i];

                    var recentItem = tmpItem.clone().addClass(itemData.Type);

                    var recentTypeElement = recentItem.children('.recentType');
                    if (container.selector === "#ByDate")
                        recentTypeElement.text(itemData.Type).attr('title', itemData.Type);
                    else
                        recentTypeElement.remove();

                    var timeStampElement = recentItem.children('.timeStamp');
                    (type == 'Today' || type == 'Yesterday')
                        ? timeStampElement.text(itemData.Time)
                        : timeStampElement.text(itemData.FormattedDateTime);

                    var syncdata = {
                        FunctionName: itemData.FunctionName,
                        SyncKeys: itemData.SyncKeys,
                        ViewId: itemData.ViewId,
                        RecentId: itemData.RecentId
                    };

                    recentItem.children('a').addClass('padding5').attr('href', itemData.Link).text(itemData.LabelText).attr('title', itemData.LabelText).data(syncdata);
                    content.append(recentItem);
                }

                container.append(categoryItem);
            }

            if (!itemsFound) {
                CreateNoResultsFound(container);
            }
        }

        function CreateRecentsViews(data) {
            if (!data) {
                return;
            }

            var dataByDate = [],
                dataByType = [];

            for (var i = 0; i < data.length; i++) {
                var dataItem = data[i];
                dataByDate[dataItem.Day] = dataByDate[dataItem.Day] || [];
                dataByDate[dataItem.Day].push(dataItem);

                dataByType[dataItem.Type] = dataByType[dataItem.Type] || [];
                dataByType[dataItem.Type].push(dataItem);
            }
            CreateRecentsView(dataByDate, $('#ByDate'));
            CreateRecentsView(dataByType, $('#ByType'));
        }

        function SaveAssumeState(syncData) {

            if (!syncData || !syncData.FunctionName) {
                return;
            }
            var syncItems = syncData.SyncKeys;

            // set sync keys as parameters for the new function
            var syncFieldMap = {};
            // search all sync key fields
            var viewId = undefined, selectedTab='';
            for (var prop in syncItems) {
                if (syncItems.hasOwnProperty(prop)) {
                    var syncItem = syncItems[prop];
                    if (syncItem.SyncKey != undefined && syncItem.SyncKey != '') {
                        if (syncItem.SyncKey === 'VIEW') {
                            viewId = syncItem.Value;
                        }
                        if (syncItem.SyncKey.toLowerCase() === 'selectedtab'){
                            selectedTab = syncItem.Value;
                        }
                        syncFieldMap[syncItem.SyncKey] = syncItem.Value;
                    }
                }
            }

            var assumeState;
            controls.PageSync.Clear();
            controls.PageSync.LoadFor(syncData.FunctionName);
            assumeState = controls.PageSync.GetNewAssumeState();
            assumeState.SyncFieldMap = syncFieldMap;
            assumeState.SyncKeys = syncData.SyncKeys;
            assumeState.ViewId = viewId;
            assumeState.RecentId = syncData.RecentId;
            assumeState.SelectedTab = syncData.SelectedTab || selectedTab;
            controls.PageSync.SetAssumeState(assumeState);
            controls.PageSync.Save();
        }

        function ShowSpinner(input) {
            var spinner = input.next();

            if (!spinner.hasClass('lightSpinner')) {
                spinner = $('<span/>').addClass('lightSpinner icon16');
                input.after(spinner);
            }

            return spinner.css({ "visibility": "visible" });
        }

        function SearchRecents(input, callBack) {

            var searchKey = input.val();
            var spinner;

            // Callback
            var doAfterSearch = function (response) {
                if (response) {
                    CreateRecentsViews(response);
                }
                if (spinner) spinner.css({ "visibility": "" });
            };

            // Ajax call
            FlowAjaxRequest({ FunctionName: 'SearchRecents', Data: searchKey, SuccessCallback: doAfterSearch });

            // Show Spinner
            spinner = ShowSpinner(input);
        }

        /******************************************************************************************
        *********************************  SHARED VIEWS ******************************************
        *****************************************************************************************/

        function CreateNoResultsFound(container) {
            container.append(
                Create('div', 'margin10 noResults').text('No results found.')
            );
        }

        //
        // Create Shared content views
        //

        function CreateSharedViews(data, totalShared) {

            if (!data) {
                return;
            }

            var titlePanel = $('#ItemsSharedWithMe');
            var viewLink = titlePanel.find('.showSharedWithMe');
            if (totalShared > 0) {
                if (!originalLinkTitle) {
                    originalLinkTitle = viewLink.text();
                }
                //viewLink.text(originalLinkTitle.replace(')', ' ' + totalShared.toString() + ')'));
            } else if (originalLinkTitle) {
                viewLink.text(originalLinkTitle);
            }

            AddToSharedView(data);
        }

        /**
         * Adds items to the shared menu.
         *
         * @function AddToSharedView
         * @public
         * @param {Array} items - The shared items to display in the menu.
         * @param {boolean} isNew - If true, items will be added to the top of the menu.
         * * */
        function AddToSharedView(items, isNew) {
            var container = $('#SharedItemsContent');

            if (!isNew){
                // We have read all recent shares so redraw the entire shared menu.
                // This prevents out of sequence items from push / polling before the flow menu was opened.
                container.empty();
            }

            var f = document.createDocumentFragment();

            for (var i = 0; i < items.length; i ++) {
                var id = items[i].Id;
                if(id && !container.find('#' + id).length) {
                    f.appendChild(createShareItemAlert(items[i])[0]);
                }
            }

            container.prepend($(f));
        }

        /******************************************************************************************
        *********************************  SHARE FUNCTION *****************************************
        *****************************************************************************************/
        var funcGetNoUserMessage = function(isNotifyType) {
            var $flow = $(shell.Hash('FlowContainer'));
            var controlData = $flow.data('t1-control');

            return isNotifyType ? controlData.Labels.Notifications.SendToNoOne : controlData.Labels.Sharing.SharedWithNoOne;
        };

        var originalTitle = undefined;
        var originalLinkTitle = undefined;

        function CreateUserSearch(isNotifyType) {
            var searchUsers = $('#FlowTemplates').children('.flowUserSearch').clone();

            var selectedUsersPanel = Create('div', 'selectedUsers empty').text(funcGetNoUserMessage(isNotifyType));
            searchUsers.append(selectedUsersPanel);
            return searchUsers;
        }

        function ShowShareFunctionPanel(buttonOrLabel, selectionData, itemId, itemLabel) {

            var tabContent = buttonOrLabel.closest('.flowTabControl');
            var panel = tabContent.children('.flowShareContent');
            var isShareable = buttonOrLabel.closest('.shareable').length > 0;
            var isNotifyType = panel.is('#PanNotify');
            var fieldsContainer = panel.addClass('selected').children('.fieldsContainer');

            if (!panel.hasClass('ready')) {
                fieldsContainer.prepend(CreateUserSearch(isNotifyType));
                panel.addClass('ready');
                EnableShareButton(panel, false);
            }

            var requestData = {};
            addFormDataIfWeCan(requestData);

            var btnSaveShare = panel.find('.btnSaveShare').removeClass('useNewShare');
            var beenHere = false;

            /* Prepare text for NOTIFY or SHARE*/
            var searchInput = panel.find('.flowUserSearchInput');
            var funcReplaceText = function(text, notifyTxt, shareTxt) {
                var $flow = $(shell.Hash('FlowContainer'));
                var controlData = $flow.data('t1-control');

                return isNotifyType ? controlData.Labels.Notifications.SearchUserPlaceholder : controlData.Labels.Sharing.SearchUserPlaceholder;
            };

            searchInput.attr('placeholder', funcReplaceText(searchInput.attr('placeholder'), 'send to', 'share with'));

            var populateShareableItems = function (funcResponse) {

                // make sure we only do this once as if the call succeeds, it will be done twice
                if (beenHere) return;
                beenHere = true;
                if (funcResponse) btnSaveShare.addClass('useNewShare');

                // remove any existing items and add items we are trying to share
                fieldsContainer.find('.sharedItemsContainer').remove();

                var sharedItemsPanel = undefined;
                var item = undefined;

                var $flow = $(shell.Hash('FlowContainer'));
                var controlData = $flow.data('t1-control');

                originalTitle = isNotifyType ? controlData.Labels.Notifications.NewMessageTitle : controlData.Labels.Sharing.NewMessageTitle;

                var sharedTitle = panel.find('.flowSectionHeader > h1');
                sharedTitle.text(originalTitle);

                if (isShareable && funcResponse && funcResponse.CurrentFunction != '') {
                    // include option to share current function details
                    sharedItemsPanel = $(document.createElement('div')).addClass('sharedItemsContainer');
                    item = GetTemplate('.shareItemTemplate');
                    T1.C2.Shell.Controls.Checkbox.SetFieldData(item, {Value: true});

                    if (btnSaveShare.hasClass('useNewShare') && funcResponse.CurrentFunction !== '') {
                        T1.C2.Shell.Controls.Checkbox.SetLabelText(item, funcResponse.CurrentFunction);
                        var headerText = 'Share ' + funcResponse.EntityLabel;
                        sharedTitle.text(headerText);
                        sharedTitle.data('initlabel', headerText);
                    } else {
                        T1.C2.Shell.Controls.Checkbox.SetLabelText(item, 'Share current function');
                    }

                    item.data('shareCurrent', true);
                    sharedItemsPanel.prepend(item);
                    fieldsContainer.prepend(sharedItemsPanel);
                }

                if (itemId || selectionData) {

                    var updateShareItems = function (response) {

                        if (response.Success) {
                            if (!sharedItemsPanel) {
                                sharedItemsPanel = $(document.createElement('div')).addClass('sharedItemsContainer');
                                fieldsContainer.prepend(sharedItemsPanel);
                            }

                            for (var i = response.Items.length - 1; i >= 0; i--) {
                                item = GetTemplate('.shareItemTemplate');
                                T1.C2.Shell.Controls.Checkbox.SetFieldData(item, {Value: true});
                                T1.C2.Shell.Controls.Checkbox.SetLabelText(item, response.Items[i].Description);

                                item.data('sharedItem', response.Items[i]);
                                sharedItemsPanel.prepend(item);
                            }

                            // update heading with number of items to share
                            if (response.Items.length > 0) {
                                if (!itemLabel || itemLabel.length == 0)
                                    itemLabel = "item";
                                var itemLabelPlural = "items";
                                if (response.ItemLabel && response.ItemLabel !== '') itemLabel = response.ItemLabel;
                                if (response.ItemLabelPlural && response.ItemLabelPlural !== '') itemLabelPlural = response.ItemLabelPlural;

                                headerText = 'Share X ' + (response.Items.length > 1 ? itemLabelPlural : itemLabel);
                                sharedTitle.data('label', 'Share X ' + itemLabel);
                                sharedTitle.data('plurallabel', 'Share X ' + itemLabelPlural);
                                sharedTitle.text(headerText.replace('X', response.Items.length.toString()));
                            }
                        }

                        AnimateSharePanel(panel.prev(), -panel.width());
                    };

                    if (itemId && !selectionData)
                        selectionData = { ItemId: itemId, ItemLabel: itemLabel };

                    T1.C2.Shell.Ajax({
                        url: T1.Environment.Context.Controller.Path + 'UpdateSharedItemsData',
                        data: JSON.stringify(selectionData),
                        success: updateShareItems
                    });
                } else {
                    AnimateSharePanel(panel.prev(), -panel.width());
                }
            };

            if (isNotifyType) {
                populateShareableItems();
            } else {
                // get current function details if we can
                T1.C2.Shell.Ajax({
                    url: T1.Environment.Context.Controller.Path + 'GetCurrentFunctionDescription',
                    data: JSON.stringify(requestData),
                    ignoreErrors: true,
                    success: populateShareableItems,
                    complete: populateShareableItems     // run method even on error as this may fail if app corelib not yet updated
                });
            }
        }

        function addFormDataIfWeCan(requestData) {

            var formData = controls.Form.GetFormControl();
            if (formData) {
                requestData.FormData = controls.Form.GetFormData();
            }
        }

        function SaveShareFunction(button) {

            var sharePanel = button.closest('.flowShareContent');
            var commentInput = sharePanel.find('.txtAddComments .flowTextBoxControlInput');
            var subjectInput = sharePanel.find('.txtAddSubject .flowTextBoxControlInput');

            // Get selected users
            var selectedUsersPanel = sharePanel.find('.selectedUsers');
            if (!selectedUsersPanel.length) {
                return false;
            }

            var users = [];
            selectedUsersPanel.children().each(function () {
                var username = $(this).children('.id').text();
                if (username) {
                    users.push(username);
                }
            });

            if (!users.length) {
                return false;
            }

            var doAfterSave = function (response) {
                if (response.Success) {
                    if (shareCallback) shareCallback(response);
                    CancelShareFunction(sharePanel);
                    ShowStatusMessage('Message sent');
                }
            };

            var reqData = {
                TabName:'',
                ShareComment: commentInput.val(),
                ShareSubject: subjectInput.val(),
                UsersToShareWith: users,
                HighPriority: sharePanel.find('.shareHighPriority > .flowCheckBox').hasClass('checked'),
                SharedItems: []
            };

            var sharedItemsContainer = sharePanel.find('.sharedItemsContainer');
            sharedItemsContainer.find('.checkBoxControl.checked').each(function () {
                var shareItemElement = $(this).closest('.shareItemTemplate');
                var shareCurrent = shareItemElement.data('shareCurrent');
                if (shareCurrent) {
                    reqData.ShareCurrent = true;
                } else {
                    var shareData = shareItemElement.data('sharedItem');
                    reqData.SharedItems.push(shareData);
                }
            });

            addFormDataIfWeCan(reqData);

            if (sharePanel.find('.btnSaveShare').hasClass('useNewShare')) {
                T1.C2.Shell.Ajax({
                    url: T1.Environment.Context.Controller.Path + 'ShareSelectedItems',
                    data: JSON.stringify(reqData),
                    success: doAfterSave
                });

            } else {
                // we are just sharing a message so call that action on our flow controller
                FlowAjaxRequest({ FunctionName: 'ShareMessage', Data: reqData, SuccessCallback: doAfterSave, InitControls: false });
            }
        }

        function CancelShareFunction(panel, flowClosing) {

            panel.find('.flowhUserSearch').val('');
            panel.find('.selectedUsers').text(funcGetNoUserMessage(panel.closest('#PanNotify').length)).addClass('empty');
            panel.find('input, textarea').val('');
            panel.find('.shareHighPriority > .flowCheckBox').removeClass('checked');
            EnableShareButton(panel, false);
            AnimateSharePanel(panel.prev(), 0, function() {
                panel.toggleClass('selected');
            });

            if (originalTitle) {
                var sharedTitle = panel.find('.flowSectionHeader > h1');
                sharedTitle.text(originalTitle);
                originalTitle = undefined;
            }

            if (originalLinkTitle) {
                var viewLink = $('#ItemsSharedWithMe').find('.showSharedWithMe');
                viewLink.text(originalLinkTitle);
                originalLinkTitle = undefined;
            }

            // close entire flow if we are not being closed already
            //if (!flowClosing) {
            //    AnimateShowHideFlow();
            //}
        }

        function AnimateSharePanel(panel, marginLeft, callBack) {
            panel.animate({ 'margin-left': marginLeft }, 500, callBack);
        }

        function EnableShareButton(panel, enable) {
            var btn = panel.find('.btnSaveShare');
            btn.prop('disabled', !enable);
        }

        function AddToSelectedUser(usersPicker, data) {
            var selectedUsersPanel = usersPicker.closest('.flowUserSearch').children('.selectedUsers');
            var classUserName = shell.RemoveSpecialChar(data.Value);

            if (!selectedUsersPanel.hasClass('empty')) {
                // Check already exists
                var foundUser = selectedUsersPanel
                    .children('.' + classUserName)
                    .filter(function () {
                        return ($(this).children('.id').text() === data.Value);
                    });

                if (foundUser.length) {
                    Highlight(foundUser);
                    return;
                }
            }
            else {
                EnableShareButton(usersPicker.closest('.flowShareContent'), true);
                selectedUsersPanel.empty().removeClass('empty');
            }

            // Create User Div
            var userDiv = $('<div/>').addClass('user itemLink hasNewAni hBCol').addClass(classUserName);
            var span = $('<span/>');

            userDiv.append(span.clone().addClass('name').text(data.Description));
            userDiv.append(span.clone().addClass('id').text(data.Value));
            userDiv.data('t1-control', data);

            $('<button/>').addClass('delete').append(span.clone().addClass('icon16')).appendTo(userDiv);

            selectedUsersPanel.append(userDiv);
            Highlight(userDiv);
        }

        function Highlight(element) {
            element.addClass('newAdded');
            setTimeout(function () {
                element.removeClass('newAdded');
            }, 1000);
        }

        function RedirectToSharedFunction(link) {
            SaveAssumeState(link.data());
        }

        //
        // User Search functions
        //
        var retrievingSuggestions = false;
        var keyDownValue = '';
        var allowBlur = true;

        function AcceptUserSearchSuggestion(flowUserSearchInput) {

            var suggestionPane = flowUserSearchInput.siblings('.flowUserSearchSuggestionPane');
            if (!suggestionPane || !suggestionPane.hasClass('shown')) return false;

            var selected = suggestionPane.children('.selected');

            if (selected.length > 0) {
                var controlData = selected.data('t1-control');

                UserSearchValueSelected(flowUserSearchInput, { Value: controlData.Key, Description: controlData.Description });
            }

            ClearUserSearchSuggestionPane(flowUserSearchInput);
        }

        function PopulateUserSearchSuggestionPane(textBoxControlInput, items, item) {

            var suggestionPane = textBoxControlInput.siblings('.flowUserSearchSuggestionPane');
            var editorField = textBoxControlInput.parent();

            if (items && items.length > 0) {

                var itemLinkTemplate = Create('span','flowItemLink linkCol mainBBCol3').prop('tabindex', '0');

                var scrollItem = undefined;

                suggestionPane.css({ 'left': textBoxControlInput.position().left });

                suggestionPane.empty();

                for (var i = 0; i < items.length; i++) {
                    var itemLink = itemLinkTemplate.clone();

                    itemLink.data('t1-control', items[i]);

                    itemLink.text(items[i].Description);
                    if (item && (!scrollItem || scrollItem.length === 0) && item.Value === items[i].Key) {
                        scrollItem = itemLink;
                        if (item.Select) itemLink.addClass('selected');
                    }

                    suggestionPane.append(itemLink);
                }

                suggestionPane.css('visibility', 'hidden').addClass('shown');

                if (suggestionPane[0].scrollHeight > suggestionPane[0].clientHeight) {
                    var top = 0;
                    if (scrollItem && scrollItem.length > 0) {
                        top = scrollItem[0].offsetTop - scrollItem.outerHeight(true) * 2;
                        if (top < 0) top = 0;
                    }
                    suggestionPane.scrollTop(top);
                }

                suggestionPane.css('visibility', 'visible');
                editorField.addClass('activeSuggest');

                $('body').one(t1.FastClick, function (e) {
                    if (!$(e.target).closest('.flowUserSearch').length) {
                        editorField.removeClass('activeSuggest');
                        suggestionPane.removeClass('shown').removeAttr('style').empty();
                    }
                });
            } else {
                editorField.removeClass('activeSuggest');
                suggestionPane.removeClass('shown').removeAttr('style').empty();
            }
        }

        function RetrieveAndPopulateUserSearchSuggestionPane(flowUserSearchInput) {

            var currentSearchValue = flowUserSearchInput.val().toLowerCase();

            var callback = function (items) {

                if (shell.OuterControl(flowUserSearchInput).find('input, button, [tabindex][tabindex!="-1"]').length > 0) {
                    if (items && items.length > 0) {
                        var selectedItem = items[0];
                        PopulateUserSearchSuggestionPane(flowUserSearchInput, items, selectedItem ? { Value: selectedItem.Key, Select: true} : undefined);
                    } else {
                        ClearUserSearchSuggestionPane(flowUserSearchInput);
                    }
                } else {
                    var storedValues = flowUserSearchInput.data('t1-values');

                    if (items && items.length > 0) {
                        storedValues.Value = items[0].Key;
                        flowUserSearchInput.val(items[0].Description);

                        UserSearchValueSelected(flowUserSearchInput, { Value: items[0].Key, Description: items[0].Description });
                    } else {
                        storedValues.Value = '';
                        flowUserSearchInput.val('');
                    }
                }
            };

            RetrieveSuggestionData(flowUserSearchInput, currentSearchValue, callback);
        }

        function RetrieveSuggestionData(flowUserSearchInput, value, successCallback) {
            var flowUserSearchControl = shell.OuterControl(flowUserSearchInput);
            var controlData = flowUserSearchControl.data('t1-control');

            var request = {
                FieldName: flowUserSearchInput.prop('id'),
                SearchAllValue: value,
                GetDescriptionOnly: false,
                PickObject: controlData.PickObject,
                PickKey: controlData.PickKey,
                SyncKey: controlData.SyncKey,
                ResultSize: controlData.MaxRows
            };

            retrievingSuggestions = true;
            FlowAjaxRequest({ FunctionName: 'FlowSearchUsers', Data: request, SuccessCallback: successCallback });
        }

        function ClearUserSearchSuggestionPane(textBoxControlInput) {
            PopulateUserSearchSuggestionPane(textBoxControlInput, undefined);
        }

        function UserSearchArrowPressed(flowUserSearchInput) {

            var suggestionPane = flowUserSearchInput.siblings('.flowUserSearchSuggestionPane');
            var suggestions = suggestionPane.children('.flowItemLink');

            if (suggestions.length <= 0) return;

            var selectedItem = suggestionPane.children('.selected');
            var itemToSelected;

            if (t1.Key.Down) {
                itemToSelected = selectedItem.length === 0 ? suggestions.first() : selectedItem.next();

                if (selectedItem.length > 0 && itemToSelected.length > 0) {
                    selectedItem.removeClass('selected mainBGCol3 mainBCol2');
                } else if (selectedItem.length > 0) {
                    itemToSelected = selectedItem;
                }

                // seeing as though we have a y scrollbar we need to readjust the scroll when we press the down key
                if (suggestions.index(itemToSelected) === 0) {
                    suggestionPane.scrollTop(0);
                } else if (itemToSelected.position().top + itemToSelected.outerHeight(true) > suggestionPane.height()) {
                    suggestionPane.scrollTop(suggestionPane.scrollTop() + itemToSelected.outerHeight(true));
                }

                itemToSelected.addClass('selected mainBGCol3 mainBCol2');
            } else if (t1.Key.Up) {
                itemToSelected = selectedItem.length === 0 ? suggestions.last() : selectedItem.prev();

                if (selectedItem.length > 0 && itemToSelected.length > 0) {
                    selectedItem.removeClass('selected mainBGCol3 mainBCol2');
                } else if (selectedItem.length > 0) {
                    itemToSelected = selectedItem;
                }

                // seeing as though we have a y scrollbar we need to readjust the scroll when we pres the up key
                if (suggestions.index(itemToSelected) === suggestions.length - 1) {
                    suggestionPane.scrollTop(itemToSelected.position().top);
                } else if (itemToSelected.position().top < 0) {
                    suggestionPane.scrollTop(suggestionPane.scrollTop() - itemToSelected.outerHeight(true));
                }

                itemToSelected.addClass('selected mainBGCol3 mainBCol2');
            }
        }

        function UserSearchValueSelected(flowUserSearchInput, fieldData) {

            if (fieldData.Description) {
                AddToSelectedUser(flowUserSearchInput, fieldData);
                flowUserSearchInput.val('').data('t1-values').Value = '';
                flowUserSearchInput.focus();
            }
        }

        /******************************************************************************************
        *********************************  Notifications *****************************************
        *****************************************************************************************/
        var sharedNotifications = {
            Items: [],
            Pointer: 0,
            CurrentIndex: 0,
            RemoveCurrent : function() {
                if (this.Items.length > this.CurrentIndex) {
                    this.Items.splice(this.CurrentIndex, 1);
                }
            }
        },
            markAsReadSharedNotifications = [], markAllRead;

        function ResetNotifications(items) {
            sharedNotifications.Items = items || [];
            sharedNotifications.Pointer = 0;

            markAsReadSharedNotifications = [];
        }

        function MarkNotificationsAsRead(singleItem) {
            // Mark all or given notification(s) as Read
            if (singleItem) {
                markAsReadSharedNotifications.push({ Id: singleItem.Id, SuiteName: singleItem.SuiteName });
            } else {
                markAllRead = sharedNotifications.Items.length > 0;
            }

            CheckForFlowNotifications();
        }


        function UpdateNotificationCount() {
            var notificationHolder = $('#ShowFlow').find('.notificationCount');

            var sharedTabHandle = $('#FlowNotificationsTabHandle'),
                sharedNotificationHolder = sharedTabHandle.find('.notificationCount');
            if (!sharedNotificationHolder.length) {
                sharedNotificationHolder = notificationHolder.clone().appendTo(sharedTabHandle.children('.glyph'));
            }

            var count = sharedNotifications.Items.length - sharedNotifications.Pointer;
            if (count <= 0) {
                notificationHolder.text('').hide();
                sharedNotificationHolder.text('').hide();
            } else {
                notificationHolder.text(count).show();
                sharedNotificationHolder.text(count).show();
                AddNewSharedItemsToViews(sharedNotifications.Items);
                showPriorityMessage();
            }

        }

        function createPriorityMessagePanel() {

            var msgPanel = $('#PriMsgPanel');
            if (!msgPanel.hasClass('loaded')) {
                msgPanel.appendTo($(".flowWrapper>.fixedWidth")).addClass('loaded shellBG shellFG');
            }

            msgPanel.find('.pMsgClose').click(function () {
                ClosePriorityMessage(msgPanel);
            });
        }

        function showPriorityMessage() {

            var msgPanel = $('#PriMsgPanel');

            // find first high priority message if we have one
            var messageItem = undefined;
            var messageCount = 0;
            for (var i = 0; i < sharedNotifications.Items.length; i++) {
                if (!messageItem && sharedNotifications.Items[i].HighPriority === true) {
                    messageItem = sharedNotifications.Items[i];
                    sharedNotifications.CurrentIndex = i;
                } else {
                    messageCount++;
                }
            }
            msgPanel.toggleClass('shown', messageItem !== undefined);

            if (!messageItem) return;

            /* Check for already displaying current message item */
            var currMsgData = msgPanel.data('priorityItem');
            if (currMsgData && currMsgData.Id == messageItem.Id) { return; }

            var alertItem = createShareItemAlert(messageItem, { CanDismiss: true });

            msgPanel.find('.pMsgContent').empty().append(alertItem);
            msgPanel.data('priorityItem', messageItem);
            msgPanel.find('.pMsgTitle').text(messageItem.SharedDate);

            if (messageCount > 0) {
                msgPanel.find('.pMsgFooter').show();
                msgPanel.find('.count').text(messageCount);
            } else {
                msgPanel.find('.pMsgFooter').hide();
            }
        }

        function ClosePriorityMessage(msgPanel) {
            if (!msgPanel.length) return;
            MarkNotificationsAsRead(msgPanel.data('priorityItem'));
            msgPanel.removeClass('shown');
        }

        function DismissPriorityMsgItem(btn) {
            var item = btn.closest('.sharedGroup');
            var id = item.attr('id');
            var ids = [id];

            var doAfterRemoval = function (response) {
                if (response.Success) {
                    DismissItem(item, function() {
                        item.remove();
                        sharedNotifications.RemoveCurrent();
                        showPriorityMessage();
                        UpdateNotificationCount();
                        $('#PanNotifications #'+ id).remove();
                    });
                }
            };
            DismissNotificationItemAjax(ids, doAfterRemoval);
        }

        function DismissNotificationItemAjax(ids, doAfterRemoval) {
            FlowAjaxRequest({ FunctionName: 'SendShareItemsToTrash', Data: ids, SuccessCallback: doAfterRemoval, InitControls: false });
        }

        function DismissItem(item, callBack) {
            item.addClass('dismissed');
            setTimeout(function () {
                if(callBack) callBack();
            }, 500);
        }

        function DismissNotificationItem(btn) {
            var pan, items;

            var wrapper = $('#PanNotifications .notificationItems');

            if (btn.hasClass('all')) {
                pan = btn.closest('.dayPan');
                if (!pan.length) {
                    pan = wrapper.find('.dayPan');
                }
                items = pan.find('.sharedGroup');
            } else {
                items = pan = btn.closest('.sharedGroup');
            }

            var ids = [];

            items.each(function () {
                ids.push($(this).attr('id'));
            });

            var doAfterRemoval = function (response) {
                if (response.Success) {
                    DismissItem(items, function() {
                        items.remove();
                        pan.remove();
                        wrapper.toggleClass('empty', wrapper.find('.sharedGroup').length == 0);
                    });
                }
            };

            DismissNotificationItemAjax(ids, doAfterRemoval);
        }

        function createShareItemAlert(dataItem, options) {
            options = options || {};
            var tmpShareGroup = GetTemplate('.sharedGroup');
            var tmpItem = GetTemplate('.sharedGroupItem');
            var tmpDisabledItem = GetTemplate('.sharedGroupItem.disabled');

            var thisGroup = tmpShareGroup.clone().addClass(dataItem.HighPriority ? 'highPriority' : '').attr('id', dataItem.Id);
            if (!dataItem.HighPriority) {
                thisGroup.find('.shareAlert').addClass('hidden');
            }

            // Top line
            var top = thisGroup.find('.sharedGroupTop');
            top.children('.dateTime').text(dataItem.DateString);
            if (options.CanDismiss) {
                top.append(GetDismissButton());
            }

            // Heading
            var header = thisGroup.find('.sharedGroupHeader');
            header.children('h1').text(dataItem.Subject);

            // Content
            var content = thisGroup.find('.sharedGroupContent');
            content.find('.sharedGroupComment > .commentText').text(dataItem.Comment);

            if (controls.UserDetails && dataItem.SharedByIdHash) {
                var userDetails = thisGroup.find('.sharedGroupUser');
                var controlData = {
                    UserId: dataItem.SharedById,
                    UserIdHash: dataItem.SharedByIdHash,
                    ImageClassNames: 'sharedGroupUserIcon'
                };
                controls.UserDetails.Insert(controlData, userDetails);
            }

            // only show 'from' details if not shared by ourself
            if (T1.Environment.Context.User.Name === dataItem.SharedById) {
                content.find('.sharedBy').addClass('hidden');
            } else {
                var userName = thisGroup.find('.sharedByUserId');
                // bother displaying the user details only if we have a hash (hash will be checked against userId on the sever)
                if (controls.UserDetails && dataItem.SharedByIdHash) {
                    var controlData2 = {
                        UserId: dataItem.SharedById,
                        UserIdHash: dataItem.SharedByIdHash,
                        NameClassNames: 'sharedByUserId',
                        DisplayType: 'UserName'
                    };
                    controls.UserDetails.Insert(controlData2, userName);
                } else {
                    userName.text(dataItem.SharedBy);
                }
            }

            var shareItems = content.find('.sharedGroupItemWrapper');
            for (var j = 0; j < dataItem.SharedItems.length; j++) {

                var sharedItem = dataItem.SharedItems[j];
                var thisItem = sharedItem.NoLongerValid ? tmpDisabledItem.clone() : tmpItem.clone();
//                var thisItem = tmpItem.clone();
                var thisIcon = thisItem.find('.sharedItemIcon');

                if (sharedItem.IconPath && sharedItem.IconPath !== '') {
                    thisIcon.addClass(sharedItem.IconPath);
                }

                var thisIcon2 = thisItem.find('.sharedItemIcon2');
                if (sharedItem.SecondaryIconPath && sharedItem.SecondaryIconPath !== '') {
                    thisIcon2.addClass(sharedItem.SecondaryIconPath);
                    if (sharedItem.SecondaryLink && sharedItem.SecondaryLink !== '') {
                        thisIcon2.data('linkUrl', sharedItem.SecondaryLink);
                    }
                }

                if (sharedItem.NoLongerValid) {
                    thisItem.find('.label').text(sharedItem.LinkText);
                }else{
                    var syncdata = {
                        FunctionName: sharedItem.FunctionName,
                        SyncKeys: sharedItem.SyncKeys,
                    };
                    var link = thisItem.find('a');
                    link.attr('href', sharedItem.Link).data(syncdata);
                    link.children('.label').text(sharedItem.LinkText);
                }

                shareItems.append(thisItem.get(0));
            }

            return thisGroup;
        }

        var flowTimeOut;
        function CheckForFlowNotifications() {
            clearInterval(flowTimeOut);

            /* Check for simplified workplace. if so no notification should be pulled. */
            if (t1.Settings.Simplified) {
                return;
            }

            /** iPad performance fix - don't run this function if dragging on progress */
            if (t1.Ipad && controls.Workplace && controls.Workplace.Drag) {
                flowTimeOut = setTimeout(checkSharedNotificationTimer, 1000);
            }

            var flowControl = GetFlowControl(),
                doLoadContent = !flowControl.hasClass('loaded');

            var reqData = {
                IncludeLayout: doLoadContent,
                SharedMarkAsRead: markAsReadSharedNotifications,
                MarkAllAsRead: markAllRead
            };

            markAllRead = false;

            var callbackAfter = function (response) {
                if (response) {
                    ResetNotifications(response.Shared);
                    CreateFlowLayout(flowControl, response);
                    UpdateNotificationCount();
                }
                flowTimeOut = setTimeout(CheckForFlowNotifications, checkSharedNotificationTimer);
            };

            FlowAjaxRequest({ FunctionName: 'GetSharedNotification', Data: reqData, SuccessCallback: callbackAfter, InitControls: doLoadContent });
        }

        function GetDismissButton(isAll, allLabel) {
            allLabel = allLabel || '';

            var $flow = $(shell.Hash('FlowContainer'));
            var controlData = $flow.data('t1-control');

            var label = isAll && allLabel === 'all' ? controlData.Labels.Notifications.DismissAll : controlData.Labels.Notifications.Dismiss;

            return Create('div', 'dismiss floatRight inlineBlock opac05').toggleClass('all', isAll === true)
                .append(
                    isAll ? Create('span', 'uppercase marginR5').text(label) : Create('span', 'glyph icon16 e003')
                );
        }

        function AddToNotificationView(items, isNewItem) {
            items = items || [];

            var wrapper = $('#PanNotifications .notificationItems').toggleClass('empty', !items.length);
            var container = wrapper.children('.fieldsContainer');

            if ( !items.length || !wrapper.length) {
                return;
            }

            if (!container.prev().children('.dismiss').length) {
                container.prev().append(GetDismissButton(true, 'all'));
            }

            container.height(shell.GetWindowHeight() - container.offset().top);

            var funcGetPanel = function (d, isToday) {
                var dayId = d + 'Notifications';
                var pn = $(shell.Hash(dayId));
                if (pn.length) {
                    return pn;
                }
                var p = Create('div', 'dayPan paddingLR10 paddingB10', dayId)
                    .append(
                        Create('div', 'header padding5 marginB10')
                            .append(
                                Create('span', 'uppercase opac07 paddingTB5').text(d),
                                GetDismissButton(true)
                            ),
                        Create('div','content')
                    );
                isToday ? container.prepend(p) : container.append(p);
                return p;
            };

            for (var i = 0; i < items.length; i++) {
                var msgItem = items[i];
                if (!container.find('#' + msgItem.Id).length) {

                    var day = msgItem.DateString.toLowerCase();
                    var isToday = false;

                    if(day.indexOf('day') >= 0) {
                        day = day
                    }
                    else if( day.indexOf(':') > 0) {
                        var $flow = $(shell.Hash('FlowContainer'));
                        var controlData = $flow.data('t1-control');
                        day = controlData.Labels.Common.Today;
                        isToday = true;
                    }
                    else {
                        var $flow = $(shell.Hash('FlowContainer'));
                        var controlData = $flow.data('t1-control');
                        day = controlData.Labels.Common.Older;
                    }

                    var pan = funcGetPanel(day, isToday);
                    var alertItem = createShareItemAlert(msgItem, { CanDismiss: true }).toggleClass('unread', isNewItem || false);
                    if (isNewItem) {
                        pan.children('.content').prepend(alertItem);
                    } else {
                        pan.children('.content').append(alertItem);
                    }
                }
            }
        }

        function AddNewSharedItemsToViews(items) {

            /* Notifications view */
            AddToNotificationView(items, true);

            /* Shared view */
            var sharedItems = [];
            for (var i = 0; i < items.length; i++) {
                if (items[i].SharedItems.length) {
                    sharedItems.push(items[i]);
                }
            }
            if (sharedItems.length) {
                AddToSharedView(sharedItems, true);
            }
        }

        /******************************************************************************************
        *********************************  SETTINGS ************************************************
        *****************************************************************************************/
        var regionalSettingsCache = { Response: null, IsWorkplace : false };
        var cultureCache = { Response: null, IsWorkplace : false };


        function GetRegionalSettingsAjax(callBack) {
            regionalSettingsCache.Response = JSON.parse(shell.LocalStorage.getItem(regionSettingsCacheKey));
            if (regionalSettingsCache.Response) {
                callBack(regionalSettingsCache.Response);
            } else {
                FlowAjaxRequest({
                    FunctionName: 'GetRegionalPreferences',
                    Data: null,
                    SuccessCallback: function(resp) {
                        shell.LocalStorage.setItem(regionSettingsCacheKey, JSON.stringify(resp));
                        regionalSettingsCache.Response = resp;
                        callBack(resp);
                    }
                });
            }
        }

        function GetCulturesAjax(callBack) {
            cultureCache.Response = JSON.parse(shell.LocalStorage.getItem(cultureCacheKey));
            if (cultureCache.Response) {
                callBack(cultureCache.Response);
            } else {
                FlowAjaxRequest({
                    FunctionName: 'GetCultures',
                    Data: null,
                    SuccessCallback: function(resp) {
                        shell.LocalStorage.setItem(cultureCacheKey, JSON.stringify(resp));
                        cultureCache.Response = resp;
                        callBack(resp);
                    }
                });
            }
        }

        function BindEventsFlowCulture() {

            DelegateEvent('.lnkCltSettings', t1.FastClick, function() {
                var pan = $(this).closest('.flowPanel');
                AnimateSharePanel(pan, -pan.width());
            });

            DelegateEvent('#BtnCultureCancel', t1.FastClick, function() {
                var pan = $(this).closest('.flowPanel').prev();
                AnimateSharePanel(pan, 0);
            });

            DelegateEvent('#BtnCultureSave', t1.FastClick, function() {
                SaveCulture($(this).closest('.flowPanel'));
            });

            DelegateEvent('#PanCulture .flowDropDown a', T1.FastClick, function(e) {
                var a = $(e.target);
                var val = a.data('value');
                var dd = a.closest('.flowDropDown');
                EnableCultureSaveButton(dd.data('value') !== val);
                SetFlowDropdownValue(dd, a.data('value'), a.text());
            });
        }

        function ServerSetCulturePreference(cultureValue, callback) {
            FlowAjaxRequest({ FunctionName: 'SaveCulture', Data: { Culture: cultureValue }, SuccessCallback: callback });
        }

        function UpdateFlowCulture(cultureData) {
            var panSettings = $("#PanCulture");
            var flowDd = $("#DdCltList");
            if (flowDd.length) {
                panSettings.find(".lnkCltSettings .reg span").text(cultureData.Text);
                SetFlowDropdownValue($("#DdCltList"), cultureData.Value);

            }
            if (cultureCache.Response) {
                // if the flow menu is not rendered yet then set regiona data in the cache for later use
                cultureCache.Response.SelectedCulture = { Text: cultureData.Text, Value: cultureData.Value };
                shell.LocalStorage.setItem(cultureCacheKey, JSON.stringify(cultureCache.Response));
            }
        }

        function PrepareFlowCulture() {
            var tabContent = $('#FlowCulture');

            if (tabContent.hasClass('hasCulture')) {
                return;
            }
            tabContent.addClass('hasCulture');

            var callBack = function(resp) {
                    var panel = tabContent.find('.panCltFields').addClass('padding20');
                    var ddClt = CreateDropdown(resp.Cultures, 'DdCltList', true).appendTo(panel);
                    SetFlowDropdownValue(ddClt, resp.SelectedCulture.Value);
                    EnableCultureSaveButton();
                BindEventsFlowCulture();
            };

            GetCulturesAjax(callBack);
        }

        function EnableCultureSaveButton(enable) {
            $('#BtnCltSettingsSave').prop('disabled', !enable);
        }

        function SaveCulture(panel) {

            var culture = panel.find('#DdCltList').data();

            // Update the selected region in the Local Storage first
            cultureCache.Response.SelectedCulture = { Text: culture.text, Value: culture.value };
            shell.LocalStorage.setItem(cultureCacheKey, JSON.stringify(cultureCache.Response));

            var func = function(resp) {
                if (resp) {
                    var link = panel.prev().find('.lnkCltSettings');
                    var cultureText = culture.text || 'en';
                    link.find('.reg span').text(cultureText);
                    EnableCultureSaveButton(false);
                    AnimateSharePanel(panel.prev(), 0);
                    ShowStatusMessage('Language updated!');
                    if (shell.Shared.FunctionSearch) shell.Shared.FunctionSearch.RemoveStoredData();
                    //reload the page
                    window.location.reload();
                }
            };

            ServerSetCulturePreference(culture.value, func);
        }


        function LoadCurrentRegion() {
            /* Simplified workplace check */
            if (t1.Settings.Simplified) {
                return;
            }
            regionalSettingsCache.IsWorkplace = window.location.href.toLowerCase().indexOf('/workplace') > 0;

            var callBack = function (resp) {
                var selRegion = resp.SelectedRegion || {};
                var items = resp.Regions || [{Text:"All regions", Value:""}];
                var ddRegion =
                    Create('li').append(
                        Create('div','regions dropdownControl marginLR5 chooser initialisableControl', 'ddHdrRegList')
                            .prop('title', 'Regional preference').data('t1-control-type', 'DropDownControl').append(
                                Create('button', 'handle buttonOnHover').prop('type', 'button').append(
                                    Create('span', 'icon16 glyph e081 shellFG')
                                ),

                                Create('div', 'dropdownPanel allowHorizontalPositioning').append(
                                    Create('div').append(
                                        Create('div', 'mainBGCol5 padding10').css('margin', '-1px').text('Regional preference'),
                                        Create('ul')
                                    )
                                )
                        )
                    );

                var dd = $(ddRegion).appendTo($('#GlobalHeader .bannerRight > ul'));

                for (var i = 0; i < items.length; i++) {
                    var isCurrentReg = items[i].Value === selRegion.Value;
                    var lnkItem = resp.Enabled ? $('<a/>') : $('<label/>');

                    lnkItem.text(items[i].Text).data({ value: items[i].Value, text: items[i].Text }).addClass(items[i].Value);
                    var li = $('<li></li>').addClass('dropdownPanelListItem').append(lnkItem);
                    if (isCurrentReg || items.length === 1) {
                        li.addClass('selected');
                    }
                    dd.find('ul').append(li);
                }

                BindEventsWorkplaceRegionalSettings();
            };

            GetRegionalSettingsAjax(callBack);
        }
        // This function is called when flow menu regional settings is changed
        function UpdateHeaderRegion(regionData) {
            var dd = $("#ddHdrRegList");
            if (dd.length) {
                dd.find('.dropdownPanelListItem').removeClass('selected');
                dd.find((regionData.value ? ("a." + regionData.value) : "a:first")).parent().addClass('selected');
            }
        }
        // This function is called when global header regional settings is changed
        function UpdateFlowRegion(regionData) {
            var panSettings = $("#PanSettings");
            var flowDd = $("#DdRegList");
            if (flowDd.length) {
                panSettings.find(".lnkRegSettings .reg span").text(regionData.text);
                SetFlowDropdownValue($("#DdRegList"), regionData.value);
            }
            else if (regionalSettingsCache.Response) {
                // if the flow menu is not rendered yet then set regiona data in the cache for later use
                regionalSettingsCache.Response.SelectedRegion = { Text: regionData.text, Value: regionData.value };
                shell.LocalStorage.setItem(regionSettingsCacheKey, JSON.stringify(regionalSettingsCache.Response));
            }
        }

        function HandleHeaderRegionDdClick(e) {
            var liItem = $(this);

            if (!liItem.hasClass('selected')) {
                var link = liItem.find('a');
                if (link.length) {
                    var data = link.data();
                    ServerSetRegionalPreference(data.value,
                        function(resp) {
                            if (resp && regionalSettingsCache.IsWorkplace) {
                                shell.LocalStorage.removeItem(regionSettingsCacheKey);
                                window.location.reload(true);
                            } else {
                                liItem.addClass('selected').siblings().removeClass('selected');
                                UpdateFlowRegion(data);
                            }
                        });

                }
            }
            liItem.parents('.droppedDown').toggleClass('droppedDown');
        }

        function PrepareFlowRegionalSettings() {
            var tabContent = $('#FlowSettings');

            if (tabContent.hasClass('hasRegion')) {
                return;
            }
            tabContent.addClass('hasRegion');

            var callBack = function(resp) {

                var canChangeRegions = resp.Regions && resp.Enabled;

                var $flow = $(shell.Hash('FlowContainer'));
                var controlData = $flow.data('t1-control');

                var link = $('#flow .lnkRegSettings').append(
                    (canChangeRegions ? Create('span', 'icon16 glyph e061 next') : ''),
                    Create('div', 'reg marginL20 paddingL20 opac07').append(
                        controlData.Labels.Settings.Region + ': ',
                        Create('span', 'margilL5')
                    )
                );
                link.find('.reg span').text(resp.SelectedRegion.Text);

                if (canChangeRegions) {
                    var panel = tabContent.find('.panRegFields').addClass('padding20');
                    var ddReg = CreateDropdown(resp.Regions, 'DdRegList', true).appendTo(panel);
                    SetFlowDropdownValue(ddReg, resp.SelectedRegion.Value);
                    EnableRegionalSettingsButton();
                    BindEventsFlowRegionalSettings();
                }
           };

            GetRegionalSettingsAjax(callBack);
        }

        function EnableRegionalSettingsButton(enable) {
            $('#BtnRegSettingsSave').prop('disabled', !enable);
        }

        function SaveRegionalSettings(panel) {

            var region = panel.find('#DdRegList').data();

            // Update the selected region in the Local Storage first
            regionalSettingsCache.Response.SelectedRegion = { Text: region.text, Value: region.value };
            shell.LocalStorage.setItem(regionSettingsCacheKey, JSON.stringify(regionalSettingsCache.Response));

            var func = function(resp) {
                if (resp) {
                    var link = panel.prev().find('.lnkRegSettings');
                    var regText = region.text || 'All';
                    link.find('.reg span').text(regText);
                    EnableRegionalSettingsButton(false);
                    AnimateSharePanel(panel.prev(), 0);
                    ShowStatusMessage('Regions updated!');
                    if (shell.Shared.FunctionSearch) shell.Shared.FunctionSearch.RemoveStoredData();
                    if (regionalSettingsCache.IsWorkplace) {
                        window.location.reload();
                    } else {
                        UpdateHeaderRegion(region);
                    }
                }
            };

            ServerSetRegionalPreference(region.value, func);
        }

        function ServerSetRegionalPreference(regionValue, callback) {
            FlowAjaxRequest({ FunctionName: 'SetRegionalPreference', Data: { Region: regionValue }, SuccessCallback: callback });

        }


        /**
         * *** Display Role type in workplace role bar
         */
        function ToggleDisplayRoleType() {
            var dispRoleType = shell.SessionStorage.getItem("wp-disp-role-type") !== "true";
            shell.SessionStorage.setItem("wp-disp-role-type", dispRoleType);
            SetDisplayRoleType(dispRoleType);
        }

        function DisplayRoleType() {
            SetDisplayRoleType(shell.SessionStorage.getItem("wp-disp-role-type") === "true");
        }

        function SetDisplayRoleType(dispRoleType) {
            $('body').toggleClass('dispRoleType', dispRoleType)
                .toggleClass('dblRoleBar', $('body').hasClass('discoveryOn') || dispRoleType);

            var $flow = $(shell.Hash('FlowContainer'));
            var controlData = $flow.data('t1-control');
            var text = dispRoleType ? controlData.Labels.Settings.HideRoleTypes : controlData.Labels.Settings.ShowRoleTypes;

            $('#PanSettings .lnkDispRoleType').find('.lbl').text(text);
        }

        DelegateEvent('a.lnkDispRoleType', t1.FastClick, ToggleDisplayRoleType);

        /**
         * *** Hint text option
         */

        function SetHintTextOption() {
            var $flow = $(shell.Hash('FlowContainer'));
            var controlData = $flow.data('t1-control');
            var text = T1.Features.HideHintText ? controlData.Labels.Settings.ShowHints : controlData.Labels.Settings.HideHints;
            $('#PanSettings .lnkHideHintText').find('.lbl').text(text);
        }

        function ToggleHintTextOption() {
            var hideHintText = T1.Features.HideHintText = !T1.Features.HideHintText;
            SetHintTextOption();
            SetCookie("HideHintText", hideHintText);
            if (hideHintText) {
                $('[title]').prop('title', '');
            }
        }

        /******************************************************************************************
        *********************************  FLOW TABS ************************************************
        *****************************************************************************************/

        function HandleFlowTabClick(event) {

            var targetElement = $(event.target),
            tabHandle = targetElement.closest('.flowTabHandle');

            if (tabHandle.hasClass('noContent')) {
                return;
            }

            event.preventDefault();

            // Tab handle selection change
            var tabHandleConatiner = tabHandle.closest('.flowTabHandlesContainer');
            tabHandleConatiner.find('.selected').removeClass('selected');
            tabHandle.addClass('selected');

            // Tab content selection
            var tabContentToShow = $('#' + tabHandle.data('t1-control-id'));
            var currentTabContent = tabContentToShow.siblings('.selected');

            if (!tabHandle.closest('.flowTabbedControl').hasClass('flowMenu')) {
                /*
                * This is for all general tab containers.
                */
                var firstTab = tabContentToShow.parent().children().first();
                var prevTabCount = tabHandle.index();
                var width = tabContentToShow.outerWidth(true);

                if (t1.IE < 10) {
                    firstTab.animate({ 'margin-left': '-' + (prevTabCount * width) + 'px' }, 500);
                } else {
                    firstTab.css('margin-left', '-' + (prevTabCount * width) + 'px');
                }
                tabContentToShow.addClass('selected');
                setTimeout(function () {
                    currentTabContent.removeClass('selected');
                }, 500);

                return;
            }

            // FLOW MENU tab container selction
            $('#FlowContent').addClass('selected');
            $('#FlowHome').removeClass('selected');

            // remove inprogress animation
            tabContentToShow.removeClass('selected').addClass('toBe');
            if (t1.IE < 10) {
                currentTabContent.removeClass('selected');
                tabContentToShow
                    .removeClass('toBe').css({ visibility: 'visible', backgroundColor: '' })
                    .animate({ left: 0 }, 500, function () {
                        tabContentToShow.addClass('selected').css({ backgroundColor: '' });
                        currentTabContent.css({ visibility: '', left: '' });
                    });
            } else {
                setTimeout(function () {
                    currentTabContent.removeClass('selected');
                    tabContentToShow.removeClass('toBe').addClass('selected');
                }, 400);
            }

            var tabCtrlId = tabHandle.data('t1-control-id');

            if (tabCtrlId === 'FlowNotifications') {
                MarkNotificationsAsRead();
            }

            if (tabCtrlId === 'FlowSettings') {
                PrepareFlowRegionalSettings();
            }

            if (tabCtrlId === 'FlowCulture') {
                PrepareFlowCulture();
            }

           /*
           * Theme loading..
           */
            if (tabHandle.data('t1-control-id') === 'FlowThemes' && !tabHandle.hasClass('loaded')) {
                var thmContainer = $('#PanThemes > .fieldsContainer');
                tabHandle.addClass('loaded');

                thmContainer.children().each(function () {
                    var link = $(this);
                    var themeName = link.text().trim();
                    PrepareThemeLink(link);
                    link.find('.thname').text(themeName);
                });

                thmContainer.animate({scrollTop: thmContainer.children('.selected').offset().top - 50 }, 300);
            }

            if (tabHandle.data('t1-control-id') === 'FlowStarred') {
                $('#PanFlowStarred > .fieldsContainer').addClass("spinner32").show();
                FlowAjaxRequest({ FunctionName: "GetStarred", Data: null, SuccessCallback: CreateStarred });
            }
        }

        function SetFlowDropdownValue(dd, value) {
            if (!dd.length) {
                return;
            }
            var selData = {text:'', value:''};
            var ddItems = dd.children('.flowDropDownPanel').children();
            if (value) {
                ddItems.each(function() {
                    if ($(this).data().value == value) {
                        selData = $(this).data();
                        return;
                    }
                });
            }
            else {
                selData = ddItems.first().data();
            }

            dd.find('.handle .label').text(selData.text);
            dd.data('value', selData.value).data('text', selData.text);
            dd.removeClass('droppedDown');
        }

        function Create(tag, classNames, id) {
            return $(document.createElement(tag)).prop({'class':classNames, id:id});
        }

        function CreateDropdown(items, id, isBlockElement) {

            var dd = $(id ? '#' + id : '');

            if(!dd.length) {
                dd = Create('div', 'flowDropDown marginB10 ' + (isBlockElement ? 'block' : 'inlineBlock'), id)
                    .append(
                        Create('div', 'handle ' + (isBlockElement ? 'padding10' : 'padding5')).prop('tabindex', '0')
                            .append(
                                Create('span', 'label').text('Select'),
                                Create('span', 'glyph icon16 e045 marginL5')
                            ),
                        Create('div', 'flowDropDownPanel mainBGCol5')
                    );
            }

            var ddItemsPanel = dd.children('.flowDropDownPanel').empty();

            for (var i = 0; i < items.length; i++) {
                var itm = Create('a', items[i].Value).text(items[i].Text).data({ value: items[i].Value, text: items[i].Text });
                ddItemsPanel.append(itm);
            }
            SetFlowDropdownValue(dd);
            return dd;
        }

        function CreateStarredFilter() {
            return Create('div', 'starredFilter marginL20 marginB5 inlineBlock').append(
                Create('input', 'shellFG').prop('placeholder', 'Search starred')
            ).on('keyup', function (e) {
                EventStarredFilter($(e.target).val());
            });
        }

        function CreateStarred(data) {
            data = data || {};
            var starredItems = data.Starred || [];
            var enquiryLink = data.Link;
            var label = data.ViewAllLabel || 'VIEW ALL';
            var flowContainer = $('#PanFlowStarred > .fieldsContainer');

            var starredList = flowContainer.children('#StarredList').empty();

            if(!starredList.length){
                flowContainer.removeClass('spinner32');
                starredList = Create('div','','StarredList');
                flowContainer
                    .append(CreateStarredFilter())
                    .append(Create('a','enqLinkStarred marginR20 padding5 marginT5 floatRight').text(label).prop('href', enquiryLink))
                    .append(starredList);

                starredList.height(shell.GetWindowHeight() - starredList.offset().top);
            }

            var funcCreateItem = function (itemdata) {
                var starredItem =
                    Create('a', 'starredItem block padding10').prop('href',itemdata.Link)
                        .append(
                            Create('div', 'details inlineBlock marginL20')
                                .append(Create('div', 'type opac05 uppercase').text(itemdata.Type))
                                .append(Create('div', 'fname').text(itemdata.Name))
                        );
                starredItem.data({ FunctionName: itemdata.FunctionName, SyncKeys: itemdata.SyncKeys });
                return starredItem;
            };

            var ddListTypes = [];
            var addTypeToList = function (v, t) {
                for (var j = 0; j < ddListTypes.length; j++) {
                    if (ddListTypes[j].Value.toLowerCase() === v.toLowerCase()) {
                        return;
                    }
                }
                ddListTypes.push({
                    Value: v,
                    Text: (t || v)
                });
            };

            addTypeToList('Alltypes', 'All types');

            for (var i = 0; i < starredItems.length; i++) {
                starredList.append(funcCreateItem(starredItems[i]));

                addTypeToList(starredItems[i].Type);
            }

            flowContainer.toggleClass('empty', starredItems.length === 0);

            if (!starredItems.length) {
                var $flow = $(shell.Hash('FlowContainer'));
                var controlData = $flow.data('t1-control');
                starredList.append(Create('div', 'left opac07 margin10').text(controlData.Labels.Starred.None));
            } else{
                starredList.before(CreateDropdown(ddListTypes, 'ddStarredFilter'));
            }
        }

        function EventStarredFilter(searchTxt, isType) {

            var starredContainer = $('#StarredList');
            var allItems = starredContainer.children();

            searchTxt = searchTxt.toLowerCase();

            var hasMatch = false;

            allItems.each(function () {
                var item = $(this);

                if (isType) {
                    var type = item.find(".type");
                    item.toggleClass('hidetype', !(searchTxt === 'alltypes' || type.text().toLowerCase().indexOf(searchTxt) >= 0));
                } else {
                    item.toggleClass('filtered', item.text().toLowerCase().indexOf(searchTxt) < 0);
        }

                hasMatch = hasMatch || !(item.hasClass('hidetype') || item.hasClass('filtered'));
            });

            starredContainer.toggleClass('noMatch', !hasMatch);
        }

        function GetThemeTemplate() {
            return Create('div', 'wrapper')
                .append(
                    Create('span','bg bgImg loading'),
                    Create('span','fg'),
                    Create('div', 'cMarginR5 colPalette'),
                    Create('div','marginTB10 marginL20')
                        .append(Create('span', 'thname'))
                        .append(Create('span','e066 glyph icon20 colWhite ticked'))
                );
        }

        function PrepareThemeLink(link) {
            link.empty().attr('tabindex','0');
            link.append(GetThemeTemplate());

            var colPalette = link.find('.colPalette');
            var col = Create('span', 'icon18');
            colPalette.append(col.clone().addClass('col1 showTooltip').attr('aria-label','Theme colour'));
            colPalette.append(col.clone().addClass('col3 showTooltip').attr('aria-label','Header and footer colour'));
            colPalette.append(col.clone().addClass('col9 showTooltip').attr('aria-label','Primary action colour'));

            var bgImg = link.find('.bg'),
                bgUrl = bgImg.css('background-image');
            if (bgUrl) {
                var src = bgUrl.replace(/(^url\()|(\)$|[\"\'])/g, '')
                    .replace('background.jpg', 'background-banner.jpg')
                    .replace('&thumb=true','');

                var func = function() {
                    bgImg.css('background-image', 'url(' + this.src +')').removeClass('loading');
                    $(this).remove();
                };

                Create('img').attr('src', src)
                    .on('load', func)
                    .on('error', func);
            }
        }



        /// This function calls the pattern form control which will retrieve the contextual keys, sections and any other pattern specific information
        function ShowFunctionInformation() {
            var formControl = controls.Form.GetFormControl();
            var formType = formControl.data('t1-control-type');
            if (formType) {
                // remove 'Form' from form types - it's not relevant as we want to get the actual pattern form object
                formType = formType.replace('Form ', '');
                var formInterface = controls[formType];
                if(formInterface.GetFunctionInformation){
                    var functionInformationData = formInterface.GetFunctionInformation();
                    var functionInformation = GetTemplate('.functionInformation');
                    functionInformation.data('functionInformation', functionInformationData);
                    var htmlSyncKeySection = $('<tbody>');

                    // Add sync keys to popup
                    if (functionInformationData.Keys) {
                        for (var key = 0; key < functionInformationData.Keys.length; key++) {
                            var tr = $('<tr>');
                            var syncKeyInformation = functionInformationData.Keys[key];
                            tr.append($('<td>').text(syncKeyInformation.Description))
                                .append($('<td>').text(syncKeyInformation.FieldName))
                                .append($('<td>').text(syncKeyInformation.SyncKey));
                            htmlSyncKeySection.append(tr);
                        }
                    }

                    // Add sections to popup
                    var htmlSectionsSection = $('<tbody>');
                    if (functionInformationData.Sections) {
                        for (var section = 0; section < functionInformationData.Sections.length; section++) {
                            var tr = $('<tr>');
                            var sectionInformation = functionInformationData.Sections[section];
                            tr.append($('<td>').text(sectionInformation.SectionTitle))
                                .append($('<td>').text(sectionInformation.SectionName));
                            htmlSectionsSection.append(tr);
                        }
                    }

                    functionInformation.find('.syncKeys').append(htmlSyncKeySection);
                    functionInformation.find('.sectionsAdvancedInformation').append(htmlSectionsSection);

                    // Add copy sync keys button if visiting from personal workflow
                    var context = (T1.Environment || {}).Context || {};
                    var userContext = context.User || {};
                    var pathsContext = (T1.Environment || {}).Paths || {};
                    var storageKey = 'ProcessDiagram' + pathsContext.RootEnvironmentUrl + userContext.DefaultSuiteUserId;
                    var jsonString = shell.LocalStorage.getItem(storageKey);
                    var jsonData = !String.IsNullOrWhiteSpace(jsonString) ? JSON.parse(jsonString) : {};
                    var functionJsonData = jsonData[T1.Environment.Context.Function.Name];
                    if (!jQuery.isEmptyObject(jsonData) && !jQuery.isEmptyObject(functionJsonData) && functionJsonData.FromProcessDiagram) {
                        functionInformation.find('#syncKeysHelper').append('<button id="ContextualKeysCopytoStorageButton"><span class="buttonLabel">Copy Sync Keys</span></button>');
                    }

                    controls.Popup.Show({
                        Type:'Ok',
                        PopupTitle:'Function Information',
                        PopupContent: functionInformation,
                        RenderContent: true,
                        ShowCloseButton: true
                    })
                }
            }
        }

        function GotoFlowHome(event) {
            $('#FlowContent').removeClass('selected');
            $('#FlowContainer').children('.flowTabHandlesContainer').children('.selected').removeClass('selected');
        }

        function ApplyTheme(link) {
            hasThemeDemo = true;

            link.addClass('current');

            var themeName = link.data('t1-control').ActionMessage;

            var coreCssLink = $('head > #TryCoreTheme');
            var flowCssLink = $('head > #TryFlowTheme');

            if (coreCssLink.length) {
                coreCssLink = coreCssLink.get(0);
                flowCssLink = flowCssLink.get(0);
            } else {
                coreCssLink = document.createElement('link');
                coreCssLink.id = 'TryCoreTheme';
                coreCssLink.rel = 'stylesheet';
                coreCssLink.type = 'text/css';
                coreCssLink.media = 'all';
                $('head').append(coreCssLink);

                flowCssLink = document.createElement('link');
                flowCssLink.id = 'TryFlowTheme';
                flowCssLink.rel = 'stylesheet';
                flowCssLink.type = 'text/css';
                flowCssLink.media = 'all';
                $('head').append(flowCssLink);
            }

            var cacheVersion = +new Date();

            coreCssLink.href = t1.Environment.Paths.RootEnvironmentUrl + 'Workplace/v-' + cacheVersion + '/t/' + themeName + '/Colours/NA?v=' + cacheVersion;
            flowCssLink.href = t1.Environment.Paths.RootEnvironmentUrl + 'Workplace/v-' + cacheVersion + '/t/' + themeName + '/Colours/NA/Flow?v=' + cacheVersion;
        }


        function RemoveThemeDemo() {
            // var coreCssLink = $('head > #TryCoreTheme');
            // var flowCssLink = $('head > #TryFlowTheme');
            //
            // coreCssLink.remove();
            // flowCssLink.remove();
        }

        function ShowStatusMessage(msg) {
            var msgId = 'FlowStatusMsg';
            var msgBox = $('#' + msgId);

            if (!msgBox.length) {
                msgBox =
                Create('div', '', msgId).append(
                    Create('span', 'icon16 glyph e186'),
                    Create('span', 'msg margin5')
                ).appendTo($('#flow'));
            }

            msgBox.children('.msg').text(msg);
            msgBox.css('margin-left', -(msgBox.width() / 2) ).addClass('show');
            setTimeout(function() {
                msgBox.removeClass('show');
            }, 2000);
        }

        /****************************************************************************************
        *************************************** Events ******************************************
        ******************************************************************************************/

        function DelegateEvent(selectors, on, functionToTrigger) {
            $(document).on(on, selectors, functionToTrigger);
        }

        DelegateEvent('#FlowHome', t1.FastClick, function(event) {
            if ($(this).parent().hasClass('selected')) {
                return GotoFlowHome(event);
            }
            AnimateShowHideFlow(event);
        });

        DelegateEvent('#CloseFlow', t1.FastClick, function (event) { AnimateShowHideFlow(event); });

        DelegateEvent('#ShowFlow', t1.FastClick, function (event) { AnimateShowHideFlow(event); });

        /********************** Share events *****************************************
        *****************************************************************************/

        if (!t1.IsTablet) {
            DelegateEvent('.search .inputClearButton', t1.Click, function (event) {

                var input = $(this).prev().children('input');
                Search(input, SearchRecents);
            });
        }

        DelegateEvent('#SearchRecents', 'change', function (event) {
            var input = $(this);
            Search(input, SearchRecents, true);
            event.stopImmediatePropagation();
        });


        // Bind event to share button click
        DelegateEvent('.btnSharePanel', t1.FastClick, function () {
            ShowShareFunctionPanel($(this));
        });

        /********************** Regional Settings events **********************
        ************************************************************************/

        function BindEventsWorkplaceRegionalSettings() {
            DelegateEvent('#ddHdrRegList .dropdownPanelListItem', t1.FastClick, HandleHeaderRegionDdClick);
        }

        function BindEventsFlowRegionalSettings() {

            DelegateEvent('.lnkRegSettings', t1.FastClick, function() {
                var pan = $(this).closest('.flowPanel');
                AnimateSharePanel(pan, -pan.width());
            });

            DelegateEvent('#BtnRegSettingsCancel', t1.FastClick, function() {
                var pan = $(this).closest('.flowPanel').prev();
                AnimateSharePanel(pan, 0);
            });

            DelegateEvent('#BtnRegSettingsSave', t1.FastClick, function() {
                SaveRegionalSettings($(this).closest('.flowPanel'));
            });

            DelegateEvent('#PanRegionalSettings .flowDropDown a', T1.FastClick, function(e) {
                var a = $(e.target);
                var val = a.data('value');
                var dd = a.closest('.flowDropDown');
                EnableRegionalSettingsButton(dd.data('value') !== val);
                SetFlowDropdownValue(dd, a.data('value'), a.text());
            });
        }

        //
        // Cancel Share button click
        //
        DelegateEvent('.btnCancelShare', t1.FastClick, function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            CancelShareFunction( $(this).closest('.flowShareContent'), false);
        });

        //
        // Save Share button click
        //
        DelegateEvent('.btnSaveShare', t1.FastClick, function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            SaveShareFunction($(this));
        });



        DelegateEvent('.sharedItemIcon2', t1.FastClick, function (event) {

            var link = $(this);
            if (link.closest('.sharedGroupItem').hasClass('disabled')) return;

            event.preventDefault();
            window.location = link.data('linkUrl');
        });

        /********************** Theme events *****************************************
        ***********************              ****************************************/

        DelegateEvent('.themeLink', t1.FastClick, function (event) {

            event.preventDefault();

            var target = $(event.target);
            var link = target.closest('a');

            var themeName = link.data('t1-control').ActionMessage;

            //if (target.closest('.applyTheme').length) {
                var callbackAfter = function () {
                    hasThemeDemo = false;
                    SetPageReloadCheck('Workplace');
                    link.parent().children('.selected').removeClass('selected');
                    link.addClass('selected');
                    /* Hide flow menu */
                    //AnimateShowHideFlow(event);
                    link.parent().children('.current').removeClass('current');
                    ApplyTheme(link);
                };

                FlowAjaxRequest({ FunctionName: 'SetTheme', Data: themeName, SuccessCallback: callbackAfter });
            //}


        });


        /********************** Recents events *****************************************
        ***********************              ****************************************/

        DelegateEvent('#SearchRecents', 'keyup', function (event) {
            var input = $(this);
            event.preventDefault();
            Search(input, SearchRecents);
            event.stopImmediatePropagation();
        });

        $(document).on('mousedown touchstart keyup', '.recentsItem a, .sharedGroupItem a, a.starredItem', function (event) {
            var link = $(this);
            var _key = t1.Key || {};

            if(event.type === 'keyup'){

                //highlight the links when tab on it
                if(_key.Tab){
                    var activeEl = $(document.activeElement);
                    var tagName = document.activeElement.tagName;
                    //remove previously focused link
                    activeEl.closest('.flowTabsContainer').find('.fieldsContainer .focus').removeClass('focus');

                    //if this is a link, focus on it
                    if(tagName === 'A')
                        activeEl.addClass('focus');
                }
                else if(_key.Code === 13){
                    //save assume state only if user press ENTER on the link
                    SaveAssumeState(link.data());
                }
            }
            else{
                SaveAssumeState(link.data());
            }

        });

        // 'click' is used here intentionally. On iPad event.preventDefault doesnt prevent link to trigger default behaviour
        // Note: if it turns out that click is not working either, then should use parent slector of the link
        $(document).on('click', '.recentsItem a, .sharedGroupItem a', function (event) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            var link = $(this);
            if (link.closest('#PriMsgPanel')) {
                ClosePriorityMessage($('#PriMsgPanel'));
            }
            document.location = link.attr('href');
        });

        /*================================ Search Users ==================================*/

        $(document).on('change', '#PanShareCurrentFunction input', function (event) {
            if (!event.isManuallyTriggered) {
                return;
            }

            var input = $(this),
                textBox = input.closest('.textBoxControl');

            var data = controls.Textbox.GetFieldData(textBox);
            if (data.Description) {
                AddToSelectedUser(input, data);
                input.val('').focus();
                controls.Textbox.SetFieldData(textBox, {});
            }
            event.stopImmediatePropagation();
        });

        DelegateEvent('.selectedUsers .delete', t1.FastClick, function () {
            var user = $(this).closest('.user');
            var panel = user.parent();
            user.remove();
            if (!panel.children().length) {
                panel.text(funcGetNoUserMessage(panel.closest('#PanNotify'))).addClass('empty');
                EnableShareButton(panel.closest('.flowShareContent'), false);
            }
        });

        DelegateEvent('.resetWorkplace', t1.FastClick, function (event) {
            var link = $(this);
            var popupTitle = link.text().trim();
            event.preventDefault();
            var options = {
                Parent: $('body'),
                Type: 'OkCancel',
                PopupTitle: popupTitle,
                PopupContent: link.data('t1-control') ? link.data('t1-control').ActionMessage : popupTitle,
                OkFunction: function () {
                    window.location = link.attr('href');
                }
            };
            controls.Popup.Show(options);
        });

        DelegateEvent('.viewShortcuts', t1.FastClick, function (event) {
            if (t1.Events.ShowShortcutList) {
                t1.Events.ShowShortcutList();
            }
        });

        DelegateEvent('.flowMenu .functionInformation', t1.FastClick, function (event) {
            ShowFunctionInformation();
        });


        DelegateEvent('.flowUserSearchInput', 'keydown', function (event) {

            var flowUserSearchInput = $(this);
            keyDownValue = flowUserSearchInput.val();

            var editorField = flowUserSearchInput.closest('.editorField');

            if (editorField && editorField.hasClass('activeSuggest')) {
                if (t1.Key.Enter) {
                    event.preventDefault();
                    AcceptUserSearchSuggestion(flowUserSearchInput);
                    $('#AddComments').focus();
                }
                else if (t1.Key.Tab) {
                    ClearUserSearchSuggestionPane(flowUserSearchInput);
                    event.preventDefault();
                    $('#AddComments').focus();
                }
                else if (t1.Key.Esc) {
                    ClearUserSearchSuggestionPane(flowUserSearchInput);
                }
                else if (t1.Key.Up || t1.Key.Down) {
                    UserSearchArrowPressed(flowUserSearchInput);
                }
            }

        });

        DelegateEvent('.flowUserSearchInput', 'keyup', function (event) {

            clearTimeout(searchTimeOut);

            var flowUserSearchInput = $(this);
            var value = flowUserSearchInput.val();

            flowUserSearchInput.data('t1-values').Value = '';

            searchTimeOut = setTimeout(function () {
                clearTimeout(searchTimeOut);
                if (t1.Key.Enter || keyDownValue !== value) RetrieveAndPopulateUserSearchSuggestionPane(flowUserSearchInput);
            }, 300);
        });

        DelegateEvent('.flowItemLink', T1.FastClick, function (event) {
            event.preventDefault();

            var item = $(this);
            item.siblings('.flowItemLink.selected').removeClass('selected mainBGCol3 mainBCol2');
            item.addClass('selected mainBGCol3 mainBCol2');

            AcceptUserSearchSuggestion(item.closest('.flowUserSearchSuggestionPane').siblings('.flowUserSearchInput'));

            return false;
        });

        DelegateEvent('.flowUserSearchInput', 'blur', function (event) {

            var flowUserSearchInput = $(this);

            if (!allowBlur) return;

            // Hide the Suggestion Pane if it's visible.
            if (flowUserSearchInput.parent().hasClass('activeSuggest')) ClearUserSearchSuggestionPane(flowUserSearchInput);
        });

        DelegateEvent('#flow .search input', 'focus', function (event) {
            $(this).parent().addClass('active');
        });

        DelegateEvent('#flow .search input', 'blur', function (event) {
            $(this).parent().removeClass('active');
        });


        DelegateEvent('.flowBlurContainer', 'focusin', function (event) {
            allowBlur = false;
        });

        DelegateEvent('.flowBlurContainer', 'focusout', function (event) {

            var blurredControl = $(event.target || event.srcElement);
            var blurredEditorField = blurredControl.closest('.editorField');
            var blurredFlowUserSearchInput = blurredEditorField.length > 0 ? blurredEditorField.children('.flowUserSearchInput') : undefined;
            var focusedControl = $(event.relatedTarget || event.toElement || t1.RelatedTarget || document.activeElement);
            var focusedEditorField = focusedControl.closest('.editorField');

            if (blurredEditorField.length > 0 && focusedEditorField.length > 0 && blurredEditorField[0] === focusedEditorField[0]) {
                // The Blurred Control and the Focused Control have the same parent so don't fire the blur event.

            } else {
                allowBlur = true;

                // Fire the blur event on the input control.
                //if (blurredFlowUserSearchInput) blurredFlowUserSearchInput.blur();
            }
        });

        /*================================ Common ==================================*/
        // This variable is already defined in events.js- this is only for version compatibility
        if (!t1.RelatedTarget) {
            DelegateEvent('html', 'mousedown', function (event) {
                t1.RelatedTarget = event.target || event.srcElement;
            });
        }

        DelegateEvent('html', 'keydown', function (event) {
            if (!publicFlow.Enabled || !t1.Key) {
                return;
            }

            var targetEl = $(document.activeElement);

            if (t1.Key.Enter) {
                if (!targetEl.is('button, a')) {
                    targetEl.click();
                }
            }

            if (t1.Key.Tab) {
                if (!targetEl.closest('#flow').length) {
                    $('#CloseFlow').focus();
                }
            }

            var themesPan = $('#FlowThemes');
            if (themesPan.hasClass('selected')) {
                event.preventDefault();
                var next;
                var current = themesPan.find('#PanThemes > .fieldsContainer > .current');
                if (t1.Key.Down) {
                    next = current.next().length ? current.next() : current.parent().children().first();
                }
                if (t1.Key.Up) {
                    next = current.prev().length ? current.prev() : current.parent().children().last();
                }

                if (next) {
                    current.removeClass('current');
                    DemoTheme(next);
                    next.focus();
                }
            }

            // allowBlur - NOT to close flow menu when in a input/suggestion pane and ESC pressed
            if (t1.Key && t1.Key.Esc && allowBlur) {
                AnimateShowHideFlow(event);
            }
        });

        DelegateEvent('.flowWrapper', t1.FastClick, function (event) {

            var target = $(event.target);

            if (target.is('.flowWrapper, .fixedWidth')) {
                AnimateShowHideFlow(event);
            }
        });

        DelegateEvent('.pMsgMore', t1.FastClick, function (event) {

            var element = $(event.target).closest('a');

            if (!element.length) {
                return;
            }
            element.closest('#PriMsgPanel').removeClass('shown');
            MarkNotificationsAsRead();
        });

        DelegateEvent('.pMsgDismiss', t1.FastClick, function ()
        {
            $(this).closest('#PriMsgPanel').removeClass('shown');
            MarkNotificationsAsRead();
        });

        DelegateEvent('.shareItemTemplate', t1.FastClick, function (event) {

            // we need to use the setTimeout so the 'checked' class is added or removed before we see how many are still checked
            setTimeout(function () {
                var sharePanel = $('.sharedItemsContainer');
                var numItemsChecked = 0;
                sharePanel.find('.checkBoxControl.checked').each(function () {
                    numItemsChecked += 1;
                });

                var label = 'Share message';
                var header = $('#PanShareCurrentFunction > .flowSectionHeader > h1');
                if (numItemsChecked > 1) {
                    label = header.data('plurallabel').replace('X', numItemsChecked.toString());
                } else if (numItemsChecked > 0) {
                    if (header.data('initlabel')) {
                        label = header.data('initlabel');
                    } else {
                        label = header.data('label').replace('X', numItemsChecked.toString());
                    }
                }
                header.text(label);
            }, 0);
        });

        DelegateEvent('.flowTabHandle', t1.FastClick, HandleFlowTabClick);

        DelegateEvent('.flowPanel.isCollapsible > .expandable', T1.Click, function (event) {
            event.preventDefault();

            var expandableObject = $(this);
            var transitionName = shell.HasCssFeature('transition');

            var panel = expandableObject.parent();
            if (!panel.hasClass('isCollapsible')) return;

            var header = panel.children('.expandable');

            var slideContainer, transitionEnd;

            if (expandableObject.is('.collapsed')) {

                if (!header.hasClass('collapsed')) return;

                slideContainer = panel.children('.fieldsContainer');

                transitionEnd = function () {
                    header.removeClass('collapsed');
                    slideContainer.removeAttr('style');
                };

                if (transitionName && transitionName.length > 0) {
                    var padding = slideContainer.css('padding-bottom');
                    slideContainer.css({ 'max-height': '0', 'overflow': 'hidden', 'padding': '0' });
                    slideContainer.removeClass('hidden').css(transitionName, '200ms').one("webkitTransitionEnd msTransitionEnd transitionend", transitionEnd);
                    setTimeout(function () { slideContainer.css({ 'max-height': slideContainer[0].scrollHeight + 'px', 'padding-bottom': padding }); }, 0);
                } else {
                    slideContainer.removeClass('hidden');
                    transitionEnd();
                }

            } else {

                if (header.hasClass('collapsed')) return;

                slideContainer = panel.children('.fieldsContainer');

                transitionEnd = function () {
                    header.addClass('collapsed');
                    slideContainer.addClass('hidden').removeAttr('style');
                };

                if (transitionName && transitionName.length > 0) {
                    slideContainer.css({ 'max-height': slideContainer[0].scrollHeight, 'overflow': 'hidden' });
                    slideContainer.css(transitionName, '200ms').one("webkitTransitionEnd msTransitionEnd transitionend", transitionEnd);
                    setTimeout(function () { slideContainer.css({ 'max-height': '0px', 'padding': '0' }); }, 0);
                } else {
                    transitionEnd();
                }
            }

            if (event.which == 1) expandableObject.blur();
        });

        var flowDd;
        DelegateEvent('.flowDropDown', t1.FastClick, function (e) {
            var dd = $(this);
            var target = $(e.target);
            if (target.closest('.handle').length) {
                setTimeout(function() {
                    flowDd = dd;
                },10);
                dd.toggleClass('droppedDown');
            }
        });

        DelegateEvent('#FlowStarred .flowDropDown a', T1.FastClick, function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();

            var a = $(e.target);
            var val = a.data('value');
            var dd = a.closest('.flowDropDown');

            if (dd.closest('#FlowStarred').length) {
                EventStarredFilter(val, true);
            }
            SetFlowDropdownValue(dd, a.data('value'), a.text());
        });



        DelegateEvent('html', 'click', function (event) {
            if (flowDd && !$(event.target).closest('.flowDropDown').is(flowDd)) {
                flowDd.removeClass('droppedDown');
                flowDd = undefined;
            }
        });

        DelegateEvent('a.displayMode:not(.disabled)', t1.FastClick, function (event) {
            var thisLink = $(this);
            var toAccessibilityMode = thisLink.hasClass('standard') ? '' : 'Easy';
            shell.SetToAccessibilityMode(toAccessibilityMode);
        });

        DelegateEvent('a.lnkHideHintText', t1.FastClick, ToggleHintTextOption);

        DelegateEvent('.dismiss', t1.FastClick, function (event) {
            var btn = $(this);
            if (btn.closest('#PriMsgPanel').length) {
                DismissPriorityMsgItem(btn);
            } else {
                DismissNotificationItem(btn);
            }
        });

        DelegateEvent('.flowCheckBox', t1.FastClick, function (e) {
            var control = $(this).toggleClass('checked');
            var checked = control.hasClass('checked');
            control.find('input').val(checked);
            e.preventDefault();
        });

        DelegateEvent('#ContextualKeysCopytoStorageButton', t1.Click, function (e) {
            var context = (T1.Environment || {}).Context || {};
            var userContext = context.User || {};
            var pathsContext = (T1.Environment || {}).Paths || {};
            var syncKeysStorageKey = 'ProcessDiagram' + pathsContext.RootEnvironmentUrl + userContext.DefaultSuiteUserId;

            var jsonString = shell.LocalStorage.getItem(syncKeysStorageKey);
            var jsonData = !String.IsNullOrWhiteSpace(jsonString) ? JSON.parse(jsonString) : {};

            var $functionInformation = $(this).closest('.functionInformation');
            var functionInformationData = $functionInformation.data('functionInformation');
            jsonData[T1.Environment.Context.Function.OriginalName] = {'FormDataFields': functionInformationData.Keys};

            shell.LocalStorage.setItem(syncKeysStorageKey, JSON.stringify(jsonData));

            return false;
        });

        function PageReloadCheck() {
            // Accessibility mode check on page load
            // If the page is from cache, compare cookie and page mode, and reload if not matches
            var displayMode = GetCookie("DisplayMode") || 'Standard';

            if (displayMode != t1.DisplayMode) {
                location.reload();
                document.body.remove();
                return;
            }
        }

        $(window).on(T1.WindowResize, function (event) {
            if (publicFlow.IsActive()) {
                ResizeFitFlowWindow();
            }
        });

        $(document).ready(function () {
            var flowMenuButton = $('#ShowFlow');
            if (!flowMenuButton.is(':visible')){
                return;
            }

            PageReloadCheck();
            LoadCurrentRegion();
            //LoadCultures();
        });

        $(window).on('load', function () {
            if ($('#ShowFlow').is(':visible')) {
                flowTimeOut = setTimeout(CheckForFlowNotifications, 1000);
            }
            if (c2.PushGate) {
                c2.PushGate.SubscribePushHandler(c2.PushGate.NewPushConnectionType, function (data) {
                    // push has had to new its WebSocket.  Maybe we missed something.  Poll immediately.
                    clearInterval(flowTimeOut);
                    flowTimeOut = setTimeout(CheckForFlowNotifications, 50);
                });
                c2.PushGate.SubscribePushHandler(c2.PushGate.PushUpTestType, function (data) {
                    if (data && data.state && data.state == c2.PushGate.STATES.Succeeded) {
                        // push is working, blow out the fallback poll period
                        checkSharedNotificationTimer = 300000;
                    } else {
                        // push is broken.  back to polling.
                        checkSharedNotificationTimer = 60000;
                    }
                });
                c2.PushGate.SubscribePushHandler("SharedService", function (data) {
                    if (data && data.notificationExists) {
                        clearInterval(flowTimeOut);
                        flowTimeOut = setTimeout(CheckForFlowNotifications, 50);
                    }
                });
            }
        });

        $(document).on('sck_ShowFunctionInformationPopup', function(event) {
            event.preventDefault();
            ShowFunctionInformation();
        });

        // return a new instance of the public object
        myPublicApi = new T1_C2_Shell_Controls_Flow_Public();
        return myPublicApi;
    }
} ());

(function (undefined) {

    var t1 = window.T1 = window.T1 || {},
        c2 = t1.C2 = t1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {},
        publicT1University = controls.T1University = controls.T1University || T1_C2_Shell_Controls_T1University();

    shell.SessionStorage = shell.SessionStorage || sessionStorage; // fallback if CoreLib is earlier than 2105

    shell.ControlInitialiser.AddControl('T1University', publicT1University.Initialise);

    function T1_C2_Shell_Controls_T1University() {

        /*
       * Private Members
       */

        var _ajaxGetReleaseInProgress = false;
        var _cacheKeyHelpPopupOptions = 'PopupOptions';

        var HelpLinkType = {
            ExternalHelp: "ExternalHelpLink",
            T1University: "T1UniversityLink"
        };


        /*
        *------------------------------------------------------------------
        *----------------------  EasDataStore  ----------------------------
        *------------------------------------------------------------------
        *-------------------EAS App Store data requests  ------------------
        *------------------------------------------------------------------
        **/
        var EasDataStore = (function () {

            /* Import JSON data so that can be used in public mode */
            var EasImportedUpdatesData = {};

            var easDataReqUrl = 'FrontOffice/GetEasSignature';

            var _caches = {
                EasConfigData: {},
                ReleaseData: {},
                FunctionUpdatesData: "",
                FunctionUpdatesDataPrevRelease:""
            };

            var constHelpFunctions = {
                Workplace: "$WORKPLACE",
                "C2.RELEASE.NOTES": "$WORKPLACE",
                "$C2.RELEASE.NOTES": "$WORKPLACE"
            };


            function SetFunctionNameForHelp(f) {

                if (f && f.indexOf('.$') > 1) {
                    /* Merged function split it up */
                    f = '$' + f.split('.$')[1];
                }
                SetDataToCache(_cacheKeyHelpPopupOptions, {FunctionName: f});
            }

            function GetFunctionName() {

                /* if valid function name is in the context then look for session storage to check base function */
                var contextFunc = t1.Environment.Context.Function.Name;
                var cachedFunc = contextFunc
                    ? (GetDataFromCache(_cacheKeyHelpPopupOptions) || {}).FunctionName
                    : contextFunc;

                /* Check for predefined mapped functions */
                if(constHelpFunctions[contextFunc] || constHelpFunctions[cachedFunc]){
                    return constHelpFunctions[contextFunc] || constHelpFunctions[cachedFunc];
                }

                return cachedFunc || constHelpFunctions.Workplace;
            }

            function GetDataFromCache(url) {
                var t1unistorage = shell.SessionStorage.getItem('t1-uni-data');
                if (!t1unistorage) {
                    return;
                }
                t1unistorage = JSON.parse(t1unistorage);
                return t1unistorage[url];
            }

            function SetDataToCache(url, data) {
                var t1unistorage = JSON.parse(shell.SessionStorage.getItem('t1-uni-data') || "{}");
                t1unistorage[url] = data;
                shell.SessionStorage.setItem('t1-uni-data', JSON.stringify(t1unistorage));
            }

            function UpdateEasConfigData(configData) {
                _caches.EasConfigData = configData || _caches.EasConfigData;
                SetDataToCache(easDataReqUrl, _caches.EasConfigData);
            }

            var tryGetRelease = false;
            var _t1UniversityAjaxTimeout;
            function T1UniversityAjax(url, callBack, options) {
                options = options || {};
                // Check if release data available to make EAS calls
                if (!url || (_caches.ReleaseData || {}).ReleaseCode === undefined && !options.GetReleaseFromEas) {
                    var _thisCallback = function(){
                        T1UniversityAjax(url, callBack, options);
                    };

                    if(_ajaxGetReleaseInProgress){
                        clearTimeout(_ajaxGetReleaseInProgress);
                        _t1UniversityAjaxTimeout = setTimeout(_thisCallback, 100);
                        return;
                    }
                    if (url && !tryGetRelease) {
                        tryGetRelease = true;
                        return GetRelease(_thisCallback);
                    }
                    return callBack ? callBack() : false;
                }

                var dataCache = GetDataFromCache(url);
                if (dataCache !== undefined) {
                    return callBack(dataCache);
                }

                options = options || {};

                var ignoreErrors = options.IgnoreErrors === undefined ? true : options.IgnoreErrors;

                var parent = options.Parent || $(document.body);

                if (t1.IE && window.XDomainRequest !== undefined) {
                    var xdr = new window.XDomainRequest();
                    xdr.open("GET", url);
                    xdr.onload = function () {
                        var json = JSON.parse(xdr.responseText);
                        callBack(json);
                    },
                        xdr.onerror = callBack;
                    xdr.send();
                } else {
                    $.support.cors = true;

                    T1.C2.Shell.Ajax({
                        ShowLoader: options.ShowLoader || false,
                        blocking: options.ShowLoader || false,
                        type: 'GET',
                        url: url,
                        includeUUID: false,
                        cache: true,
                        success: function (response) {
                            SetDataToCache(url, response);
                            if (callBack) {
                                callBack(response);
                            }
                        },
                        error: function (ex) {
                            SetDataToCache(url, {});
                            callBack();
                        },
                        ignoreErrors: ignoreErrors
                    }, parent);
                }
            }

            function GetEasConfigData(callBack) {

                if (_caches.EasConfigData.HasData) {
                    if (callBack) callBack(_caches.EasConfigData);
                    return;
                }

                _caches.EasConfigData = {};

                var successFunc = function(response) {
                    if (response) {
                        _caches.EasConfigData = response;
                    }
                    _caches.EasConfigData.HasData = true;
                    SetDataToCache(easDataReqUrl, response);

                    if (callBack) callBack(_caches.EasConfigData);
                };

                var errFunc = function() {
                    if (callBack) callBack();
                };

                var easDataCache = GetDataFromCache(easDataReqUrl);
                if (easDataCache) {
                    return successFunc(easDataCache);
                }

                WorkplaceAjaxRequest({
                    url: easDataReqUrl,
                    success: successFunc,
                    error: errFunc
                });
            }

            function GetUrl(action, params, apiVersion) {
                var easurl = _caches.EasConfigData.EASServiceUrl;
                var relCode = _caches.EasConfigData.ReleaseCode || _caches.ReleaseData.ReleaseCode;

                if (!easurl) {
                    return;
                }

                easurl = easurl.match(/\/$/) ? easurl : easurl + '/'; /* append / at the end if not thee */
                apiVersion = apiVersion || '';
                /* On prem:
                 * https://apps.technologyonecorp.com/T1/CiAnywhere/Web/EAS/EnterpriseStore/WorkplaceContentService/GetHelpOnPrem/Workplace?appReleaseCode=1805
                 * Cloud:
                 * https://apps.technologyonecorp.com/T1/CiAnywhere/Web/EAS/EnterpriseStore/WorkplaceContentService/GetHelp/SAAS
                 * */
                var actionPath = action
                    + (
                        _caches.EasConfigData.OnPrem
                        ? ('OnPrem' + apiVersion + '/Workplace?appReleaseCode=' + relCode)
                        : (apiVersion + '/' + relCode + '?Mode=SaaS&') /* Mode=SaaS param reference: CCP-18122 */
                    );

                return easurl + actionPath  + (params || '');
            }

            function GetUrlWithCustomerCode(url) {
                url = url.indexOf('?') > 0 ? url + '&' : url + '?';
                return url
                    + 'customerCode=' + (_caches.EasConfigData.CustomerCode || '')
                    + '&signature=' + (_caches.EasConfigData.Signature || '')
                    + (!_caches.EasConfigData.OnPrem ? '&Mode=SaaS': '');
            }

            function GetHelp(appCode, callBack, options) {

                var action = 'GetHelp';

                var params = appCode ? ('&appCode=' + appCode) : '';
                var url = GetUrl(action, params);

                T1UniversityAjax(url, callBack, options);
            }

            var _getReleaseTimeout;
            function GetRelease(callBack) {
                /* This function is called in multiple times and places simultaneously
                 * so check and wait if already going any request */
                if (_ajaxGetReleaseInProgress) {
                    clearTimeout(_getReleaseTimeout);
                    _getReleaseTimeout = setTimeout(function() {
                        GetRelease(callBack);
                    }, 500);
                    return;
                }
                _ajaxGetReleaseInProgress = true;

                var action = 'FrontOffice/GetEasRelease';

                var func = function (data) {
                    data = data || {};
                    if (data.ReleaseCode) {
                        _caches.EasConfigData.ReleaseData = data;
                        SetDataToCache(easDataReqUrl, _caches.EasConfigData);
                    }
                    else{
                        /* Workplace app server call failed - try direct call to EAS */
                        if (!data.FromEas) {
                            return T1UniversityAjax(GetUrl('GetRelease'), function (resp) {
                                resp = resp || {};
                                resp.FromEas = true;
                                func(resp);
                            }, {GetReleaseFromEas: true});
                        }
                    }

                    _ajaxGetReleaseInProgress = false;

                    _caches.ReleaseData = data;
                    if (callBack) callBack(_caches.ReleaseData);
                };

                if (!_caches.ReleaseData.ReleaseCode && _caches.EasConfigData.ReleaseData) {
                    _caches.ReleaseData = $.extend({}, _caches.EasConfigData.ReleaseData);
                }
                if (_caches.ReleaseData.ReleaseCode) {
                    _ajaxGetReleaseInProgress = false;
                    return callBack ? callBack(_caches.ReleaseData) : _caches.ReleaseData;
                }

                /* Supports public website mode */
                if (EasImportedUpdatesData.ReleaseData){
                    return func(EasImportedUpdatesData.ReleaseData);
                }

                WorkplaceAjaxRequest({
                    url: action,
                    success: func,
                    error: func
                });
            }

            function GetFunctionalGroup(groupName, callBack) {
                var action = 'GetFunctionalGroup';

                var params = groupName ? ('&functionalGroup=' + groupName) : '';

                if (EasImportedUpdatesData.FunctionalGroups){
                    return callBack(EasImportedUpdatesData);
                }

                T1UniversityAjax(GetUrl(action, params), callBack);
            }

            function GetFunctionUpdates(param, callback, parent) {

                var funcFindFuncUpdates = function (f, func) {
                    /* check for optional params */
                    if (typeof f == "function" && !func) {
                        func = f;
                        f = null;
                    }
                    if (func) {
                        func(f ? _caches.FunctionUpdatesData[f] : _caches.FunctionUpdatesData);
                    }
                };

                if (_caches.FunctionUpdatesData) {
                    funcFindFuncUpdates(param, callback);
                } else {
                    var action = 'GetFunctionUpdates';
                    var url = GetUrl(action);

                    var funcCallback = function (respData) {
                        _caches.FunctionUpdatesData = {};
                        var data = (respData || {}).Functions || [];
                        for (var i = 0; i < data.length; i++) {
                            _caches.FunctionUpdatesData[data[i].FunctionCode] = data[i];
                        }
                        funcFindFuncUpdates(param, callback);
                    };

                    /* Public view mode */
                    if (EasImportedUpdatesData.Functions){
                        return funcCallback(EasImportedUpdatesData);
                    }

                    T1UniversityAjax(url, funcCallback, {ShowLoader:true, Parent: parent});
                }
            }

            function GetAllFunctionsUpdates(options,callback){

                var options = options || {};

                if(options.PreviousRelease){

                    //get function updates for previous release
                    var currReleaseCode = _caches.ReleaseData.ReleaseCode;
                    var prevReleaseCode = T1.C2.Shell.GetPreviousReleaseCode(currReleaseCode);

                    if (_caches.FunctionUpdatesDataPrevRelease) {
                        callback(_caches.FunctionUpdatesDataPrevRelease , prevReleaseCode);
                    } else {
                        var action = 'GetFunctionUpdates';
                        var url = GetUrl(action);
                        var currReleaseVersion = T1.C2.Shell.TransformReleaseCodeToReleaseVersion(currReleaseCode);
                        var prevReleaseVersion = T1.C2.Shell.TransformReleaseCodeToReleaseVersion(prevReleaseCode);

                        //update URL to get previous release data
                        if(!url || url.indexOf(currReleaseVersion) === -1)
                            return;

                        url = url.replace(currReleaseVersion , prevReleaseVersion);

                        var funcCallback = function (respData) {
                            _caches.FunctionUpdatesDataPrevRelease = {};
                            var data = (respData || {}).Functions || [];
                            for (var i = 0; i < data.length; i++) {
                                _caches.FunctionUpdatesDataPrevRelease[data[i].FunctionCode] = data[i];
                            }

                            callback(_caches.FunctionUpdatesDataPrevRelease , prevReleaseCode);
                        };

                        T1UniversityAjax(url, funcCallback, {ShowLoader:true});
                    }
                }
                else{
                    //get cached function updates for current release
                    callback( _caches.FunctionUpdatesData , _caches.ReleaseData.ReleaseCode);
                }
            }

            function GetFunctionTopics(funcName, callBack, parent) {
                var action = 'GetFunctionTopics';

                var params = funcName ? ('&functionCode=' + funcName) : '';

                T1UniversityAjax(GetUrl(action, params, _caches.ReleaseData.ApiVersion), callBack, {ShowLoader:true, Parent:parent});
            }

            function GetSearchTopics(searchTerm, callBack, parent) {
                var action = 'GetFunctionTopics';

                var params = searchTerm ? ('&SearchTerm=' + searchTerm) : '';

                T1UniversityAjax(GetUrl(action, params, _caches.ReleaseData.ApiVersion), callBack, {ShowLoader:true, Parent:parent});
            }

            /**
             * @function ResolveCachedEasConfigDataWithRetry
             * @private
             * @description
             *  Attempt to resolve {@link _caches.EasConfigData}, retrying for a maximum of {@link maxRetry} attempts with a delay backoff.
             * @param {Number} [nAttempts=0]
             * @param {Number} [maxRetry=3]
             * @returns {Promise<never>|Promise<{HasData}>}
             */
            function ResolveCachedEasConfigDataWithRetry(nAttempts = 0, maxRetry = 3) {
                if(_caches.EasConfigData.HasData) {
                    return Promise.resolve(_caches.EasConfigData);
                }

                if(nAttempts > maxRetry) {
                    return Promise.reject();
                }

                GetEasConfigData();

                return shell.PromiseRetryBackoff(nAttempts)
                    .then(function() { return ResolveCachedEasConfigDataWithRetry(nAttempts + 1) })
            }

            function GetT1UniversityUrl(callback) {

                if (T1.Settings.Simplified) return;

                var f = function (data) {
                    if (callback) callback(data.T1UniversityUrl, data.ExtUrlSettings || {});
                };

                if(_caches.EasConfigData.HasData && !String.IsNullOrWhiteSpace(_caches.EasConfigData.T1UniversityUrl)) {
                    return f(_caches.EasConfigData);
                }

                ResolveCachedEasConfigDataWithRetry()
                    .then(function(resolvedData) {

                        if (resolvedData.T1UniversityUrl !== undefined) {
                            f(resolvedData);
                            return;
                        }

                        GetHelp(null, function (data) {
                            resolvedData.T1UniversityUrl = (data && data.T1UniversityUrl)
                                ? GetUrlWithCustomerCode(data.T1UniversityUrl)
                                : '';

                            SetDataToCache(easDataReqUrl, resolvedData);

                            f(resolvedData);
                        });

                    });
            }

            function GetNewT1UniversityUrl(callback) {
                if (T1.Settings.Simplified) return;

                ResolveCachedEasConfigDataWithRetry()
                    .then(function(data) {
                        if (callback && data.NewT1University && data.NewT1University.NewT1UniversityUrl !== undefined) {
                            callback(data.NewT1University, data.ExtUrlSettings || {});
                        }
                    })
            }

            function ImportEasData(data) {
                /* Validate data */
                data = data || {};
                data.FunctionalGroups = data.FunctionalGroups;
                data.Functions = data.Functions;

                EasImportedUpdatesData = data;
            }


            return {
                Config: function () {
                    return _caches.EasConfigData;
                },
                UpdateConfig: UpdateEasConfigData,

                ImportEasData:ImportEasData,

                GetEasConfigData: GetEasConfigData,
                GetFunctionalGroup: GetFunctionalGroup,
                GetFunctionUpdates: GetFunctionUpdates,
                GetAllFunctionsUpdates : GetAllFunctionsUpdates,
                GetFunctionTopics: GetFunctionTopics,
                GetHelp: GetHelp,
                GetUrlWithCustomerCode: GetUrlWithCustomerCode,
                GetRelease: GetRelease,
                GetSearchTopics: GetSearchTopics,
                GetT1UniversityUrl: GetT1UniversityUrl,
                GetNewT1UniversityUrl: GetNewT1UniversityUrl,
                SetDataToCache:SetDataToCache,
                GetDataFromCache: GetDataFromCache,
                SetFunctionNameForHelp: SetFunctionNameForHelp,
                GetFunctionName:GetFunctionName
            }

        })();



        /*
       *------------------------------------------------------------------
       *-----------------------    HelperBuilders  -----------------------
       *------------------------------------------------------------------
       *------------------- Helper functions for popup builders ----------
       *------------------------------------------------------------------
       **/

        var HelperBuilders = (function () {

            function AppStoreNotReachable() {
                return Create('div').addClass('notAvailableContent')
                    .append(Create('div').addClass('hDrkCol').text(
                        'The Enterprise App store is currently unreachable. Please test your network connections or contact your System Administrator.'
                    ));
            }

            function GetBackgroundUrl(path) {
                return T1.Environment.Paths.ImageContent.slice(0, -1) + path;
            }

            function GetAppCodeFromUrl() {
                var rootArea = t1.Environment.Paths.RootEnvironmentAreaUrl || '';
                var rootEnv = t1.Environment.Paths.RootEnvironmentUrl || '';
                return rootArea.replace(rootEnv, '').replace('/', '');
            }

            function GetVideoIframe(url, vdoConatiner, isTopicsVideo) {
                if (!url) {
                    return '';
                }

                var props = GetVideoContainerSize(vdoConatiner, isTopicsVideo);

                url = GetUpdatedIframeUrlWithWidthHeight(url, props.width, props.height);

                return $('<iframe webkitallowfullscreen mozallowfullscreen allowfullscreen/>').prop('src', url).prop(props);
            }

            function GetVideoContainerSize(vdoContainer, isTopicsVideo ) {
                var w = 300, h = 0;

                if (vdoContainer.length) {
                    w = vdoContainer.width() - 5;
                    h = vdoContainer.height() - 5;
                }

                if (isTopicsVideo) {
                    w = Math.round(w * 4 / 5);
                }

                if (w > h && !isTopicsVideo) {
                    h = Math.min(w / 1.78, h);
                    w = h * 1.78;
                } else {
                    h = w / 1.78;
                }
                return { width: Math.floor(w), height:Math.floor(h) };
            }

            function GetUpdatedIframeUrlWithWidthHeight(url, width, height) {
                var offset = t1.IE ? 10 : 0; /* On internet explorer scroll bar appears -  keep the iframe content video smaller than the iframe */

                url = url || '';
                width = (width - offset) || 0;
                height = (height - offset) || 0;

                url = url.toLowerCase() + (url.indexOf('?') ? '&' : '?');

                if (url.indexOf('width=') > 0) {
                    url = url.replace(/(width=).*?(&)/, '$1' + width + '$2').replace(/(height=).*?(&)/, '$1' + height + '$2');
                } else {
                    url = url + 'width=' + width + '&height=' + height;
                }
                return url;
            }

            return {
                AppStoreNotReachable: AppStoreNotReachable,
                GetAppCodeFromUrl: GetAppCodeFromUrl,
                GetBackgroundUrl: GetBackgroundUrl,
                GetVideoIframe: GetVideoIframe,
                GetVideoContainerSize:GetVideoContainerSize,
                GetUpdatedIframeUrlWithWidthHeight:GetUpdatedIframeUrlWithWidthHeight
            }
        })();


        /*
       *------------------------------------------------------------------
       *--------------    PopupBuildersWorkplacePopups  ------------------
       *------------------------------------------------------------------
       *-------------- Workplace release popup, welcome splash popup------
       *------------------------------------------------------------------
       **/

        var PopupBuildersWorkplacePopups = (function () {

            var ReleasePopupLinkItemSelectors = {
                Popup: "#T1uniPopup",
                WorkplaceUpdates: '.relPopupLnkDiscoverWorkplace',
                DiscoverNew: '.relPopupLnkDiscoverNew',
                ReleaseSummary: '.relPopupLnkRelSummary',
                T1UniLink: '.relPopupLnkT1Uni:not(.disabled)',
                T1UniLinkDisabled: '.relPopupLnkT1Uni.disabled',
                ReleaseNotesLink: '.relPopupLnkRelNotes'
            };


            var eventsBound = false;

            function AddDiscoverLink() {
                if (t1.Settings.Simplified || !EasDataStore.Config().AllowDiscoverRelease) {
                    return;
                }

                var callBack = function (data) {
                    data.DiscoveryTag = data.DiscoveryTag || EasDataStore.Config().DefaultReleaseLabel;

                    $('#btnWpRelPopup').text(data.DiscoveryTag).data('t1-control', data);

                    BindReleasePopupEvents();
                };

                EasDataStore.GetRelease(callBack);
            }

            function AddFlowT1UniversityExternalUrlLinks() {
                EasDataStore.GetT1UniversityUrl(function(t1UniUrl, extUrlSettings) {

                    var isDisabled = extUrlSettings.HideT1Uni || t1UniUrl === '';
                    var t1UniLink = $('#flow .lnkT1University').toggleClass('disabled', isDisabled);

                    if(!isDisabled) {
                        t1UniLink.addClass('onClickLogT1Analytics').attr('href', t1UniUrl)
                            .data('t1-control', {
                                ActionLocation: "Global Options",
                                Type: HelpLinkType.T1University
                            });
                    }

                    BindFlowWelcomeVideoSettingEvent();
                });

                //New T1Uni
                EasDataStore.GetNewT1UniversityUrl(function(newT1Uni, extUrlSettings) {
                    var isDisabled = extUrlSettings.HideT1Uni || String.IsNullOrWhiteSpace(newT1Uni.NewT1UniversityUrl);
                    var t1UniLink = $('#flow .lnkNewT1University').toggleClass('disabled', isDisabled);

                    if(!isDisabled) {
                        t1UniLink.addClass('onClickLogT1Analytics').attr('href', newT1Uni.NewT1UniversityUrl)
                            .data('t1-control', {
                                ActionLocation: "Global Options",
                                Type: HelpLinkType.T1University
                            });
                    }

                    BindFlowWelcomeVideoSettingEvent();
                });
            }

            /** Workplace Welcome VIDEO */

            function HasWelcomeVideo() {
                return EasDataStore.Config().HasData
                    && EasDataStore.Config().ShowWelcomeVideo;
            }

            function ShowWelcomeVideo() {

                // check session data cache if already the video has been viewed
                if (!HasWelcomeVideo()
                    && EasDataStore.GetDataFromCache('ViewedWelcomeVideo')) {
                    return;
                }

                var popupWrapper = $('#VideosPopupWrapper');

                if (!popupWrapper.length) {
                    return GetHelpPopupTemplates(ShowWelcomeVideo);
                }

                var popup = $('#VideosPopup');
                var header = $('#VideosPopupHeader');
                var content = $('#VideosContent');

                popupWrapper.show();

                // Mobile view
                var isMobileView = T1.IsPhone;
                if (isMobileView) {
                    popup.addClass('phone');
                }

                var callBack = function (data) {

                    if (!data || (!HasWelcomeVideo())) {
                        popupWrapper.hide();
                        return;
                    }

                    EasDataStore.SetDataToCache('ViewedWelcomeVideo', true);

                    popup.addClass('startup');
                    header.text('Welcome to CiA');

                    var frame = HelperBuilders.GetVideoIframe(data.WelcomeSplashT1PlayerHtml, content);
                    content.empty().append(frame);

                    var link = popupWrapper.find('.t1UniLinkWrap a');
                    if (data.T1UniversityUrl && !EasDataStore.Config().ExtUrlSettings.HideT1Uni) {
                        link.attr('href', EasDataStore.GetUrlWithCustomerCode(data.T1UniversityUrl));
                    }else {
                        link.addClass('disabled');
                    }

                    if (!popup.hasClass('loaded')) {
                        var cssBg = '';
                        if (data.WelcomeSplashImageUrl) {
                            cssBg = 'linear-gradient(rgba(127, 200, 243, 0.2), rgba(145, 205, 240, 0.6)), url(\'' +
                                HelperBuilders.GetBackgroundUrl(data.WelcomeSplashImageUrl) + '\')';
                        }
                        popup.addClass('loaded').css('background-image', cssBg);
                    }
                    popupWrapper.addClass('shown');
                };

                /* show welcome video checkbox */
                var chkWelcomeVideo = popup.find('#ChkShowWelcomeVideo').toggleClass('shellFG', !t1.IsPhone).toggleClass('hidden', !EasDataStore.Config().AllowHideWelcomeVideo);
                BindWorkplaceSplashEvents(chkWelcomeVideo);

                EasDataStore.GetHelp('Workplace', callBack);
                $(document.body).addClass('hasVdoPopup');
            }

            function ShowWelcomeVideoV2() {
                var popupWrapper = $('.welcomeSplashWrapper');

                if (!popupWrapper.length) {
                    return GetHelpPopupTemplates(ShowWelcomeVideoV2);
                }

                var popup = popupWrapper.find('.welcomeSplash');
                var header = popup.find('.title');
                var content = popup.find('.videosContent');

                popupWrapper.show();

                var callBack = function (data) {

                    if (!data) {
                        popupWrapper.hide();
                        return;
                    }

                    EasDataStore.SetDataToCache('ViewedWelcomeVideo', true);

                    popup.addClass('startup');
                    header.text('Welcome to CiA');

                    var frame = HelperBuilders.GetVideoIframe(data.WelcomeSplashT1PlayerHtml, content);
                    content.empty().append(frame).css({height:'auto', width:'auto'});

                    var link = popupWrapper.find('.t1UniversityLink');
                    if (data.T1UniversityUrl && !EasDataStore.Config().ExtUrlSettings.HideT1Uni) {
                        link.attr('href', EasDataStore.GetUrlWithCustomerCode(data.T1UniversityUrl));
                    }else {
                        link.addClass('disabled');
                    }

                    popupWrapper.addClass('shown');
                };

                BindWorkplaceSplashEvents();

                EasDataStore.GetHelp('Workplace', callBack);
                $(document.body).addClass('hasVdoPopup');
            }


            function SaveStartupScreenDisplayOption(isDisplay) {
                WorkplaceAjaxRequest({
                    url: 'FrontOffice/SetSplashScreenDisplayValue',
                    data: isDisplay,
                    success: function (response) {
                        if (response) {

                            EasDataStore.Config().ShowWelcomeVideo = isDisplay;
                            EasDataStore.UpdateConfig();

                            // Save success.. update other field (In flow)
                            var wcLink = $('#PanSettings').find('.startupScreen');

                            lnkContent = wcLink.children('.lnkContent, .lbl');

                            var $flow = $(shell.Hash('FlowContainer'));
                            var controlData = $flow ?  $flow.data('t1-control') : {};

                            if (isDisplay) {
                                wcLink.removeClass('show').addClass('hide');
                                lnkContent.text(controlData.Labels.Settings.HideWelcome);

                            } else {
                                wcLink.removeClass('hide').addClass('show');
                                lnkContent.text(controlData.Labels.Settings.ShowWelcome);
                            }

                            wcLink.addClass('clicked');
                            setTimeout(function () {
                                wcLink.removeClass('clicked');
                            }, 300);
                        } else {
                            // Failed.. rollback
                            UpdateWelcomeVideoValue(isDisplay);
                        }
                    }
                });
            }

            function UpdateWelcomeVideoValue(value) {
                var checkBox = $('#ChkShowWelcomeVideo');
                checkBox.find('.glyph').toggleClass('e140', value).toggleClass('e145', !value);
                checkBox.toggleClass('checked', value).attr('aria-checked', value);
            }

            /* Sets highlight value to FALSE - so next visit dont highlight the link */

            function SetDiscoveryLinkHighlight(callback) {
                /* check if already set previously */
                if (!EasDataStore.Config().DiscoveryHighlight) {
                    return callback(true);
                }
                WorkplaceAjaxRequest({
                    url: 'FrontOffice/SetDiscoveryHighlightValue',
                    success: function(success) {
                        callback(success);
                    }
                });
            }

            /* Sets highlight value to FALSE - so next time dont highlight */

            function SetT1UniLinkHighlight(callback) {
                if (!EasDataStore.Config().T1UniLinkHighlight) {
                    return callback(true);
                }

                WorkplaceAjaxRequest({
                    url: 'FrontOffice/SetT1UniLinkHighlightValue',
                    success: function (success) {
                        callback(success);
                    }
                });
            }

            function LoadImage(container, imgUrl) {
                if (!imgUrl){
                    return;
                }
                imgUrl = HelperBuilders.GetBackgroundUrl(imgUrl);

                var image = new Image();
                image.src = imgUrl;
                image.onload = function(){
                    var css = { 'background-image': 'url("' + imgUrl + '")' };
                    container.css(css);
                };
            }

            function GetWorkplaceReleasePopupDesktop(data) {

                var discoHeader = Create('div', 'discoHeader shellBG shellFG');

                LoadImage(discoHeader, data.DiscoverImageUrl);

                var linksContainer = Create('div', 'discoFooter');

                var options = {
                    Parent: $('body'),
                    Class: 'whatsNew',
                    Type: controls.Popup.PopupTypes.Custom,
                    PerformAnimation: true,
                    AnimateOnClose: true,
                    AnimationOption: controls.Popup.AnimationOptions.SlideFromBottom,
                    HeaderContent: discoHeader,
                    ShowCloseButton: true,
                    CloseButtonClasses: 'mainBCol5Hvr',
                    RenderContent: false,
                    FooterContent: linksContainer
                };
                var popupContainer = controls.Popup.Show(options);

                var resizeFunction = function() {
                    discoHeader.css('height', Math.min( popupContainer.children().width() / 2.5, $(window).height() * 2 / 3 ) );
                };

                // Perform the initial resize.
                resizeFunction();

                popupContainer.on('Popup.Resized', resizeFunction);

                return linksContainer.closest('.popup');
            }

            function GetWorkplaceReleasePopupPhone(data) {
                var $body = $(document.body);
                var popup = $('#WpRelPopupPhone').appendTo($body);
                popup.find('.relCode').text(data.ReleaseCode);
                popup.addClass('shown').focus();
                $body.addClass('hasPopup');
                return popup;
            }

            function ShowWorkplaceReleasePopup(event) {

                var linkWpDiscoPopup = $(this);

                var popup = $(ReleasePopupLinkItemSelectors.Popup);

                if (popup.length){
                    CreateReleasePopup(linkWpDiscoPopup);
                }
                else {
                    if(linkWpDiscoPopup.hasClass('loading')) {
                        return;
                    }
                    linkWpDiscoPopup.addClass('loading');
                    GetHelpPopupTemplates(function () {
                        CreateReleasePopup(linkWpDiscoPopup);
                        linkWpDiscoPopup.removeClass('loading');
                    });
                }
            }

            function CreateReleasePopup(linkWpDiscoPopup) {

                var data = linkWpDiscoPopup.data('t1-control');

                var popup = GetWorkplaceReleasePopupDesktop(data);

                popup.parent().addClass('t1UniRelPopupWrapper');

                if (!data.ReleaseCode) {
                    popup.append(HelperBuilders.AppStoreNotReachable()).addClass('notAvailable');
                    return;
                }

                var linksContainer = popup.find('.discoFooter');

                if (linksContainer.children().length){
                    return;
                }

                /* Link - show Workplace updates */
                linksContainer.append(GetPopupItemTemplate(ReleasePopupLinkItemSelectors.WorkplaceUpdates));

                /* Link - Browse updates in Discover view */
                if ((t1.Settings.IsCloudMode || t1.Settings.IsDevMode) && EasDataStore.Config().AllowBrowseRelease) {
                    linksContainer.append(GetPopupItemTemplate(ReleasePopupLinkItemSelectors.DiscoverNew));
                }

                /* Link - Marketing summary  */
                var lnkMarketingRelSummary = GetPopupItemTemplate(ReleasePopupLinkItemSelectors.ReleaseSummary)
                    .appendTo(linksContainer)
                    .prop('href', data.MarketingUrl);

                /* Link - TechOne university  */
                var extUrlSettings = EasDataStore.Config().ExtUrlSettings || {};
                var lnkT1Uni = GetPopupItemTemplate(extUrlSettings.HideT1Uni
                        ? ReleasePopupLinkItemSelectors.T1UniLinkDisabled
                        : ReleasePopupLinkItemSelectors.T1UniLink).appendTo(linksContainer);

                var lnkNewT1Uni = GetPopupItemTemplate(extUrlSettings.HideT1Uni
                    ? ReleasePopupLinkItemSelectors.T1UniLinkDisabled
                    : ReleasePopupLinkItemSelectors.NewT1UniLink).appendTo(linksContainer);

                if (!extUrlSettings.HideT1Uni) {
                    EasDataStore.GetT1UniversityUrl(function (url) {
                        if (url) {
                            lnkT1Uni.prop('href', url);
                        } else {
                            lnkT1Uni.addClass('disabled');
                        }
                    });

                    EasDataStore.GetNewT1UniversityUrl(function (newT1Uni) {
                        if (!String.IsNullOrWhiteSpace(newT1Uni.NewT1UniversityUrl)) {
                            lnkNewT1Uni.prop('href', newT1Uni.NewT1UniversityUrl);
                        } else {
                            lnkNewT1Uni.addClass('disabled');
                        }
                    });
                }

                /* Link - Release notes link */
                var releaseNoteLinkWrapper = GetPopupItemTemplate(ReleasePopupLinkItemSelectors.ReleaseNotesLink);
                var releaseNoteLink = releaseNoteLinkWrapper.find('.relNoteLink');
                if (releaseNoteLink.length > 0) {
                    var linkData = releaseNoteLinkWrapper.data('t1-control') || {};

                    /**
                     * If cloud mode then linkData.FunctionUrl will be not empty
                     * Else lookup in CSP data for SaaSReleaseNotesUrl
                     * or as a fallback, try download url */
                    var relNotesLinkUrl = linkData.FunctionUrl || (data.SaaSReleaseNotesUrl ? EasDataStore.GetUrlWithCustomerCode(data.SaaSReleaseNotesUrl) : '') || linkData Url;

                    /* Link - Release notes link */
                    if (relNotesLinkUrl) {
                        relNotesLink = releaseNoteLinkWrapper.appendTo(linksContainer.parent());
                        relNotesLink.find('a').attr('href', relNotesLinkUrl);
                    }
                }

                if (!t1.IsPhone) {
                    /* set display width */
                    var links = linksContainer.find('a');
                    links.css("max-width", Math.round(80 / linksContainer.find('a').length) + '%');

                    /* display height width styling */
                    popup.css('margin-top', Math.floor(($(window).height() - popup.height()) / 3));
                }
            }

            function ClosePopup() {
                $('#T1UniHelpWrapper')
                    .removeClass('shown updates help')
                    .find('iframe').remove();

                $('body').removeClass('hasPopup');
            }

            function BindFlowWelcomeVideoSettingEvent() {
                if (EasDataStore.Config().AllowHideWelcomeVideo) {
                    $(document).on(t1.FastClick, '#PanSettings .startupScreen', function (event) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        SaveStartupScreenDisplayOption($(this).hasClass('show'));
                    });
                }
            }

            function LogT1UniversityAnalytics(logRequest) {

                if (EasDataStore.Config().IsStaticPage){
                    return;
                }

                var options = {
                    url: 'HELP/LogHelpAnalytics',
                    type: 'POST',
                    data: logRequest
                };

                WorkplaceAjaxRequest(options)
            }

            function HideWorkplaceSplash() {
                var wrapper = $('.welcomeSplashWrapper').removeClass('shown');

                $(window).off(t1.WindowResize, ResizeWorkplaceSplash);
                $(document).off('keyup', HandleWorkplaceSplashKeyPress);
                $(document.body).removeClass('hasVdoPopup');

                setTimeout(function () { wrapper.remove() }, 500);
            }

            function HandleWorkplaceSplashKeyPress() {
                if (t1.Key.Esc) {
                    HideWorkplaceSplash();
                }
            }

            function ResizeWorkplaceSplash() {
                var vdoContainer = $('.videosContent');
                var vdo = vdoContainer.find('iframe');
                var prop = HelperBuilders.GetVideoContainerSize(vdoContainer);
                vdo.attr('src', HelperBuilders.GetUpdatedIframeUrlWithWidthHeight(vdo.attr('src'), prop.width, prop.height)).attr(prop);
            }

            function BindWorkplaceSplashEvents() {
                $(window).on(t1.WindowResize, ResizeWorkplaceSplash);
                $(document)
                    .one(t1.FastClick, '.welcomeSplash button.close', HideWorkplaceSplash)
                    .on('keyup', HandleWorkplaceSplashKeyPress);
            }

            function BindReleasePopupEvents() {

                if (eventsBound){ return; }
                eventsBound = true;

                if (t1.IsPhone) {
                    $(document).on(t1.FastClick, '#btnClsWpRelPopup', function (event) {
                        $(this).closest('#WpRelPopupPhone').removeClass('shown').closest('body').removeClass('hasPopup');
                    });
                }

                $(document).on(T1.FastClick, '.discoFooter a', function (event) {
                    var link = $(this);

                    if (link.hasClass('disabled')) {
                        return;
                    }

                    if ((t1.IsPhone || shell.IsTouch()) && link.attr('href')) {
                        event.preventDefault();
                        window.open(link.attr('href'), '_blank');
                    }

                    if (t1.IsPhone) {
                        $('#WpRelPopupPhone').removeClass('shown').closest('body').removeClass('hasPopup');
                    } else {
                        controls.Popup.Close(controls.Popup.LastPopup());
                    }

                    if (link.is(ReleasePopupLinkItemSelectors.WorkplaceUpdates)) {
                        SetDiscoveryLinkHighlight(function (success) {
                            EasDataStore.Config().DiscoveryHighlight = !success;
                            EasDataStore.UpdateConfig();
                            $('#btnWpRelPopup').toggleClass('hDrkBGCol', EasDataStore.Config().DiscoveryHighlight);
                        });
                    }
                });

                $(document).on(t1.FastClick, '#btnWpRelPopup', ShowWorkplaceReleasePopup);

                $(document).on(t1.FastClick, ReleasePopupLinkItemSelectors.WorkplaceUpdates, function (event) {
                    var isDiscoveryOn = $(document.body).hasClass('discoveryOn');

                    sessionStorage.setItem('DiscoveryMode', !isDiscoveryOn);

                    if (window.location.href.toLowerCase().indexOf('/workplace') < 0) {
                        window.location = T1.Environment.Paths.RootEnvironmentUrl;
                    } else {
                        $(document.body).toggleClass('discoveryOn');
                        var wpControl = (controls.WorkplaceHome || controls.Workplace); /* desktop or phone version*/
                        if (wpControl) wpControl.DiscoverWorkplace();
                    }

                });

                $(document).on('T1University.OpenSearchWindow', function (event, eventData) {
                    //Event fired when clicking on a T1Uni Process diagram shape/node

                    var searchData = eventData.SearchData;

                    if(!searchData) {return;}

                    var f = searchData.FunctionName;
                    var searchTerm = searchData.SearchTerm;

                    var logRequest = {
                        FunctionName: f,
                        ActionLocation: 'Process diagram shape',
                        ActionCode: 'HELP',
                        ActionDescription: 'User clicked the help button',
                        App: '',
                        FunctionDescription: ''
                    };

                    LogT1UniversityAnalytics(logRequest);

                    var popupOptions = {
                        FunctionName: f,
                        FocusDiscover: false,
                        IsDiscoverRelease : false,
                        UserCount: 0,
                        SuiteId: '',
                        SearchTerm: searchTerm,
                        Title:'Search Results',
                        ShowHelp: true,
                        NewWindow: true
                    };

                    /* Adding popup option data to the session storage to be picked by the new window */
                    EasDataStore.SetDataToCache(_cacheKeyHelpPopupOptions, popupOptions);

                    var wwidth = $(window).width();
                    var wheight = $(window).height();
                    var pw = Math.max(wwidth * 2 / 3, 800);
                    var ph = Math.max(wheight * 4 / 5, 500);

                    if (popupOptions.NewWindow) {
                        /* A new window is to be open and that window will run this control's Initialise() function and load page content as per popup options set in cache */
                        window.open(T1.Environment.Paths.RootEnvironmentUrl + 'Workplace/Help', popupOptions.FunctionName,
                            "left=200, top=150, width=" + pw + ", height=" + ph + ", directories = 0, titlebar = 0, toolbar=yes, location = 0, status = 0, menubar = 0, resizable=yes");
                    }
                });

                /* Close popup */
                $(document).on(T1.FastClick, '#T1UniHelpWrapper .popupClose', function (event) {
                    ClosePopup();
                });

                $(window).on('keyup', function (e) {
                    if (t1.Key.Esc && $('body').hasClass('hasPopup')) {
                        ClosePopup();
                    }
                });

            }

            return{
                AddDiscoverLink : AddDiscoverLink,
                HasWelcomeVideo: HasWelcomeVideo,
                ShowWelcomeVideo: function (version) {
                    if(version){
                        return ShowWelcomeVideoV2();
                    }
                    ShowWelcomeVideo();
                },
                DismissBannerSplash:function(){
                    SaveStartupScreenDisplayOption(false);
                },
                AddFlowT1UniversityExternalUrlLinks: AddFlowT1UniversityExternalUrlLinks,
                BindReleasePopupEvents:BindReleasePopupEvents
            }
        })();


        /*
         *------------------------------------------------------------------
         *-----------------    PopupBuildersHelpPopup     ------------------
         *------------------------------------------------------------------
         *-------------- Help, Updates and Search popups   -----------------
         *------------------------------------------------------------------
         **/

        var PopupBuildersHelpPopup = (function () {

            var HelpPopupSelectros =  {

                Popup: "#T1uniPopup",
                PopupContent: ".content",
                TabDiscover: ".tab.discover",
                TabsTitle: ".tabsTitle",
                TabSectionTitle: ".tabSecTitle",
                ContentDiscover: ".tabContent.disco",
                ContentDiscoverUpdatesItem: ".update",
                TabHelp: ".tab.hTopic",
                ContentHelp: ".tabContent.hTopic",
                ContentT1UniPathwayWrap: ".t1uniPathwayWrap",
                ContentT1UniPathwayLink: ".t1uniPathwayLink",
                ContentExternalLink: ".t1uniExtLink",
                UserCount: ".userCount",
                NotFound : '.notFound',
                VideoTranscript: '.vdoTranScriptWrapper',
                CollapsibleSection: '.flowPanel'
            };

            var _lastSearchTerm = [];
            var _tabIdCounter = 1;
            var eventsBound = false;

            function NoContentFound(container) {
                var notFound = GetPopupItemTemplate(HelpPopupSelectros.NotFound).appendTo(container);
                EasDataStore.GetT1UniversityUrl(function (url) {
                    if (url) {
                        notFound.find('a').attr('href', url);
                    } else {
                        notFound.find('.t1unilnk').remove();
                    }
                });
            }

            function CreateGlobalHeaderContextHelpButton() {
            }

            /**
            ** This is obsolete - see BuildHelpTopicsV2
            **/
            function BuildHelpTopics(data, popup, popupOptions) {

                var tabsContainer = popup.find('.leftContainer > .tabs');
                var tabContentContainer = popup.find('.rightContainer');

                if (data && data.Functions) {
                    var funcData = data.Functions[0] || {};
                    funcData = funcData.Videos || [];

                    var pathways = [];

                    // organise learning pathway
                    for (var x = 0; x < funcData.length; x++) {
                        var fd = funcData[x];
                        if (!$.grep(pathways, function (itm) { return itm.Name === fd.LearningPathway; }).length) {
                            pathways.push({Id: "path" + pathways.length, Name:fd.LearningPathway});
                        }
                    }


                    for (var i = 0; i < funcData.length; i++) {
                        var thisFunData = funcData[i];

                        // Topic Section - Learning Pathway
                        var pathway = $.grep(pathways, function (itm) { return itm.Name === thisFunData.LearningPathway; });
                        pathway = pathway.length ? pathway[0] : {};
                        var pathwayElem = tabsContainer.find('.' + pathway.Id);
                        if (!pathwayElem.length){
                            pathwayElem = GetPopupItemTemplate(HelpPopupSelectros.TabSectionTitle).text(pathway.Name).addClass(pathway.Id).addClass('topicsHead').appendTo(tabsContainer);
                        }

                        /* Help topic tab handle item */
                        var tabId = 'tab' + _tabIdCounter++;
                        var tabHandle = GetPopupItemTemplate(HelpPopupSelectros.TabHelp).attr('id', tabId );

                        tabHandle.find('.title').text(thisFunData.VideoTitle);
                        tabHandle.find('.description').text(thisFunData.Duration || '')
                            .toggleClass('marginR5', !thisFunData.Duration);

                        pathwayElem.length ? pathwayElem.after(tabHandle) : tabsContainer.append(tabHandle);

                        /* Help topic tab content */
                        var tabContent = GetPopupItemTemplate(HelpPopupSelectros.ContentHelp).addClass(tabId);

                        tabContent.find('.title').text(thisFunData.VideoTitle);
                        var content = tabContent.find('.content').append(Create('p').append(thisFunData.SubProcess));

                        tabContentContainer.append(tabContent);

                        if (thisFunData.EmbedHtml) {
                            content
                                .append(CreateHelpTopicVideoTranscript(thisFunData.TranscriptUrl))
                                .append(CreateHelpTopicVideo(thisFunData, content));
                        }

                        /* Tab content section bottom Pathway link to T1 University */
                        var t1UniLinkWrap = CreateHelpTopicPathwayLink({Link : thisFunData.LearningPathwayUrl, Title: thisFunData.LearningPathway}).appendTo(tabContent);

                        content.css('bottom', t1UniLinkWrap.height() + 10);
                    }

                    /* Select content */
                    if (!popupOptions.FocusDiscover || !tabsContainer.children('.discover').length) {
                        tabsContainer.closest('.content').find('.selected').removeClass('selected hDrkCol');
                        var selectedTab = tabsContainer.children('.hTopic').first().addClass('selected hDrkCol hBGCol');
                        var tbContent = tabContentContainer.children('.' + selectedTab.attr('id')).addClass('selected');
                        LoadTopicVideo(tbContent);
                    }

                    if (t1.IsPhone) {
                        tabsContainer.children('.tab').removeClass('hDrkColHvr');
                    }
                } else {
                    HelperBuilders.NoContentFound(tabsContainer, "");
                }
            }

            function CreateHelpTopicVideo(topicData) {
                var vdoIframeContainer = Create('div','vdo').data('t1-video', topicData.EmbedHtml);

                return vdoIframeContainer;
            }

            function LoadTopicVideo(tab) {
                var vdo = tab.find('.vdo:not(.loaded)');
                if (vdo.length){
                    var embed = vdo.addClass('loaded').data('t1-video');
                    if (embed) {
                        vdo.append(HelperBuilders.GetVideoIframe(embed, tab, true));
                    }
                    else{
                        vdo.append(
                            Create('div', 'notAvailable inlineBlock marginT20')
                                .append(Create('span', 'icon48 glyph e415 opac05'))
                                .append(Create('span','block marginT20').text('Video coming soon'))
                        );
                        /* collapse content if there are other sections */
                        var vdoSection = vdo.closest('section');
                        if(vdoSection.next().length){
                            vdoSection.children('.fieldsContainer').addClass('hidden').prev().addClass('collapsed');
                        }
                    }
                }
            }

            function CreateHelpTopicVideoTranscript(transcriptUrl) {
                if (!transcriptUrl) {
                    return $();
                }
                var vdoTranscript =  GetPopupItemTemplate(HelpPopupSelectros.VideoTranscript);
                vdoTranscript.find('a').prop('href', transcriptUrl);
                return vdoTranscript;
            }

            function CreateHelpTopicVideoInformation(topicData) {
                if (!topicData.InformationContent){
                    return;
                }

                var container = Create('div', 'paddingT20 paddingLR20 marginL20 vdoInfo');
                Create('header', 'margin10')
                    .append(Create('span').addClass('icon16 glyph e479 marginR5 inlineBlock'))
                    .append( Create('span').text(topicData.InformationTitle))
                    .appendTo(container);
                container.append(topicData.InformationContent);

                return container;
            }

            function CreateHelpTopicRelatedTopics(topicData) {
                var relatedTopics = topicData.RelatedTopics || [];
                var list = Create('ul').addClass('margin10');

                for (var i = 0; i < relatedTopics.length; i++){
                    Create('li')
                        .append(
                            Create('a').addClass('relatedTopic').text(relatedTopics[i].TopicTitle).data('t1-control', relatedTopics[i])
                        ).appendTo(list);
                }

                return list;
            }

            function CreateHelpTopicPathwayLink(topicData) {
                var t1UniLinkWrap = GetPopupItemTemplate(HelpPopupSelectros.ContentT1UniPathwayWrap);
                var extUrlSettings = EasDataStore.Config().ExtUrlSettings || {};

                if (!extUrlSettings.Enabled || !extUrlSettings.HideT1Uni) {
                    var t1UniLink = GetPopupItemTemplate(HelpPopupSelectros.ContentT1UniPathwayLink).appendTo(t1UniLinkWrap);
                    t1UniLink.find('.appname').text(topicData.Title);
                    t1UniLink.find('a').attr('href', EasDataStore.GetUrlWithCustomerCode(topicData.Link));
                }

                if (extUrlSettings.Enabled && extUrlSettings.Url) {
                    var extLink = GetPopupItemTemplate(HelpPopupSelectros.ContentExternalLink).appendTo(t1UniLinkWrap);
                    extLink.find('a').attr('href', extUrlSettings.Url).text(extUrlSettings.UrlLabel);
                }

                return t1UniLinkWrap;
            }

            function BuildHelpTopicsV2(data, searchContent, popupOptions) {

                var tabsContainer = searchContent.find('.leftContainer > .tabs');
                var tabContentContainer = searchContent.children('.rightContainer');

                var pathwaysData = (data || {}).LearningPathways || [];

                if (pathwaysData.length){

                    for (var i = 0; i < pathwaysData.length; i++) {

                        var pathway = pathwaysData[i];

                        // Learning pathway section - title
                        GetPopupItemTemplate(HelpPopupSelectros.TabSectionTitle).text(pathway.Title).addClass('topicsHead').appendTo(tabsContainer);

                        for (var x = 0; x < (pathway.Topics || []).length; x++) {
                            var topicData = pathway.Topics[x];

                            /*************** TAB HANDLE **********/

                            var tabId = 'tab' + _tabIdCounter++;
                            var tabHandle = GetPopupItemTemplate(HelpPopupSelectros.TabHelp).attr('id', tabId);

                            tabHandle.find('.title').text(topicData.TopicTitle);
                            tabHandle.find('.description').text(topicData.Duration || '')
                                .toggleClass('marginR5', !topicData.Duration);

                            if (!topicData.Duration) {
                                tabHandle.find('.play').hide();
                            }

                            tabHandle.find('.status').text(topicData.TopicStatus);

                            tabsContainer.append(tabHandle);

                            /**********  TAB CONTENT *************/

                            var tabContent = GetPopupItemTemplate(HelpPopupSelectros.ContentHelp).addClass(tabId);

                            var tabData = {
                                FunctionDescription: popupOptions.Title,
                                FunctionName:popupOptions.FunctionName,
                                Pathway: pathway.Title,
                                Topic: topicData.TopicTitle,
                                Purpose: topicData.Purpose
                            };

                            tabContent.attr('data-t1-control', JSON.stringify(tabData));

                            tabContent.find('.title').text(topicData.TopicTitle);
                            var content = tabContent.find('.content').append(Create('p').append(topicData.Purpose));

                            tabContentContainer.append(tabContent);

                            /*
                            * Desmonstrated video
                            */
                            if(topicData.MediaType === 'VIDEO') {
                                var sectionVdo = GetPopupItemTemplate(HelpPopupSelectros.CollapsibleSection).appendTo(content);
                                sectionVdo.find('h4').text("Demonstration video");
                                sectionVdo.find('.fieldsContainer')
                                    .append(CreateHelpTopicVideoTranscript(topicData.TranscriptUrl))
                                    .append(CreateHelpTopicVideo(topicData, content))
                                    .append(CreateHelpTopicVideoInformation(topicData));
                            }

                            if(topicData.MediaType === 'PAGE') {
                                var sectionPage = GetPopupItemTemplate(HelpPopupSelectros.CollapsibleSection).appendTo(content);
                                sectionPage.find('h4').text("Page");
                                sectionPage.find('.fieldsContainer')
                                    .append(
                                        Create('a', 't1UniPageLink inlineBlock cInlineBlock bgColBlue colWhite hvr-radial-out light')
                                            .prop({'href': EasDataStore.GetUrlWithCustomerCode(topicData.TopicUrl), target: 'new'})
                                            .append(
                                                Create('span','icon20 e231 glyph'),
                                                Create('span', 'mediumText marginL10 paddingL5').text('Go to page')
                                            )
                                    );
                            }

                            /*
                            * Quick steps
                            */

                            if (topicData.QuickStepsContent) {
                                var sectionQs = GetPopupItemTemplate(HelpPopupSelectros.CollapsibleSection).appendTo(content);
                                sectionQs.find('h4').text(topicData.QuickStepsTitle);
                                sectionQs.find('.fieldsContainer').addClass('marginL20')
                                    .append(topicData.QuickStepsContent);
                            }

                            /*
                            * Related topics
                            */
                            topicData.RelatedTopics = topicData.RelatedTopics || [];
                            if (topicData.RelatedTopics.length) {
                                var sectionRt = GetPopupItemTemplate(HelpPopupSelectros.CollapsibleSection).appendTo(content);
                                sectionRt.find('h4').text("Related Topics");
                                sectionRt.find('.fieldsContainer').addClass('marginL20')
                                    .append(CreateHelpTopicRelatedTopics(topicData));
                            }

                            /* Tab content section bottom Pathway link to T1 University */
                            var t1UniLinkWrap = CreateHelpTopicPathwayLink({Title: pathway.Title, Link: topicData.TopicUrl}).appendTo(tabContent);

                            content.css('bottom', t1UniLinkWrap.height() + 10);
                        }
                    }

                    /* Select content */
                    if (!popupOptions.FocusDiscover || !tabsContainer.children('.discover').length) {
                        searchContent.find('.selected').removeClass('selected hDrkCol');
                        var selectedTab = tabsContainer.children('.hTopic').first().addClass('selected hDrkCol hBGCol');
                        var tbContent = tabContentContainer.children('.' + selectedTab.attr('id')).addClass('selected');
                        LoadTopicVideo(tbContent);
                    }

                    if (t1.IsPhone) {
                        tabsContainer.children('.tab').removeClass('hDrkColHvr');
                    }
                } else {
                    /* There might be discover updates data there so check for emptyness */
                    NoContentFound( tabContentContainer.children().length ? tabsContainer : tabContentContainer);
                }
            }

            function BuildUniPopupHelpContent(popup, options) {
                var helpContent = popup.find('.helpContent');

                EasDataStore.GetFunctionTopics(options.FunctionName,
                    function(topicsData) {
                        helpContent.addClass('loaded');

                        if ((!topicsData || $.isEmptyObject(topicsData))) {
                            var tabContentContainer = helpContent.find('.rightContainer');
                            if (tabContentContainer.children().length)
                            {
                                var tabHandleContainer = helpContent.find('.leftContainer > .tabs');
                                return NoContentFound(tabHandleContainer);
                            }
                            helpContent.addClass('noContent');
                            return NoContentFound(tabContentContainer);
                        }

                        if (EasDataStore.Config().ReleaseData.ApiVersion === "V2"){
                            return BuildHelpTopicsV2(topicsData, helpContent, options);
                        }

                        return BuildHelpTopics(topicsData, helpContent, options);
                    },
                    helpContent);
            }

            function BuildUniPopupSearchContainer(popup, searchTerm) {
                var id = 'SearchContent' + _lastSearchTerm.length;
                var searchContainer = GetPopupItemTemplate(HelpPopupSelectros.PopupContent).addClass('searchContent slideRight')
                    .attr('id', 'SearchContent' + _lastSearchTerm.length)
                    .appendTo(popup);

                _lastSearchTerm.push({Id : id});

                if (searchTerm) {
                    PrepareInputAndSearchHelp(searchTerm);
                }
            }

            function SearchHelp(popup, options) {
                var lastSearch = _lastSearchTerm[_lastSearchTerm.length - 1] || {};
                var searchContainer = $('#' + lastSearch.Id);

                searchContainer.removeClass('slideRight')
                    .prevAll().addClass('slideLeft');
                searchContainer.nextAll().addClass('slideRight');

                if (options.SearchTerm === lastSearch.SearchTerm){
                    return;
                }

                lastSearch.SearchTerm = options.SearchTerm;

                BuildUniPopupSearchContent(searchContainer, options || {});
            }

            function ExitSearchHelp() {
                var lastSearch = _lastSearchTerm[_lastSearchTerm.length - 1];
                var prevSearch = _lastSearchTerm[_lastSearchTerm.length - 2];

                if (!lastSearch) { return; }

                var lastSearchContent = $('#' + lastSearch.Id);
                var searchInput = $('.discoSearch > input');

                lastSearchContent.addClass('slideRight')
                    .on('transitionend webkitTransitionEnd oTransitionEnd', function () {
                        lastSearchContent.off();
                        if (prevSearch) {
                            searchInput.val(prevSearch ? prevSearch.SearchTerm : '');
                            _lastSearchTerm.pop();
                            lastSearchContent.remove();
                        }else{
                            lastSearchContent.prevAll().removeClass('slideLeft');
                            searchInput.parent().removeClass('active');
                        }
                    });

                lastSearchContent.prev().removeClass('slideLeft');

            }

            function PrepareInputAndSearchHelp(searchTerm, txtBox, doNotTriggerSearch) {
                txtBox =  txtBox || $('.discoSearch input');
                txtBox.parent().toggleClass('active notEmpty', searchTerm !== '');
                txtBox.val(searchTerm).focus();

                if (!doNotTriggerSearch){
                    SearchHelp(txtBox.closest('.t1uniPopup'), { SearchTerm : searchTerm });
                }
            }

            function BuildUniPopupSearchContent(searchContent, options) {

                options.SearchTerm = options.SearchTerm || '';

                var leftContainer = searchContent.find('.leftContainer > .tabs').empty();
                var rightContainer = searchContent.find('.rightContainer').empty();

                var callbackSearchTopics =  function(topicsData) {
                    searchContent.addClass('loaded');

                    if (!topicsData || $.isEmptyObject(topicsData)) {
                        NoContentFound(rightContainer);
                    }
                    else{
                        BuildHelpTopicsV2(topicsData, searchContent.removeClass('noContent'), options);
                    }

                    var tabsTitle = 'Topics';
                    if (!options.IsRelatedTopic) {
                        var count = leftContainer.children('.tab').length;
                        tabsTitle =  count + ' Search Result' + ( count > 1 ? 's' : '');
                    }
                    leftContainer.prepend(GetPopupItemTemplate(HelpPopupSelectros.TabsTitle).text(tabsTitle));
                };

                if (EasDataStore.Config().ReleaseData.ApiVersion && options.SearchTerm){
                    EasDataStore.GetSearchTopics(options.SearchTerm, callbackSearchTopics, searchContent);
                }   else{
                    callbackSearchTopics();
                }
            }

            function ShowPopup(options) {

                var popup = $(HelpPopupSelectros.Popup).appendTo($('#T1UniHelpWrapper'));

                if (!popup.length){
                    return GetHelpPopupTemplates(function () {
                        ShowPopup(options);
                    });
                } else {
                    popup.children('.content').remove();
                }

                /* Help + Discover updates */

                popup.removeClass('help updates');
                if (options.FunctionName) {
                    var helpContent = GetPopupItemTemplate(HelpPopupSelectros.PopupContent).addClass('helpContent').appendTo(popup);
                    var tabsContainer = helpContent.find('.leftContainer > .tabs');

                    tabsContainer.before(GetPopupItemTemplate(HelpPopupSelectros.TabsTitle).text(options.Title));

                    /* Discover stuff */
                    BuildUniPopupFunctionUpdates(popup, options);
                }


                /* Enable search */

                if (options.EnableSearch) {
                    BuildUniPopupSearchContainer(popup, options.SearchTerm);
                }
                popup.toggleClass('hasSearch', options.EnableSearch === true);

                /* Popup new window or modal check */

                if (!options.NewWindow) {
                    setTimeout(function () {
                        $('body').addClass('hasPopup');
                        popup.parent().addClass('shown');
                        popup.focus();
                    }, 100);
                }
                else {
                    document.title = 'Help' + (options.Title ? ' - ' + options.Title : '') + ' :: TechnologyOne University';
                }
            }


            /*------------------------------------------------------------------------------------------
             *-------------------------------DISCOVER UPDATES ------------------------------------------
             * -----------------------------------------------------------------------------------------*/

            function BuildUniPopupFunctionUpdates(popup, options) {

                var header = popup.find('.wnHeader');
                var helpContent = popup.find('.helpContent');
                var tabsContainer = helpContent.find('.leftContainer > .tabs');

                /* Prepare Users count section */
                if (options.IsDiscoverRelease && EasDataStore.Config().ShowUserCount) {
                    if (!header.find('.userCount').length) {
                        GetPopupItemTemplate(HelpPopupSelectros.UserCount)
                            .appendTo(header);
                    }
                }

                EasDataStore.GetFunctionUpdates(options.FunctionName,
                    function(funcData) {
                        helpContent.addClass('loaded');

                        funcData = (funcData || {}).Updates || [];

                        var noUpdatesData = {
                                Title : 'There are no updates in this release',
                                Description: ''
                            };

                        /* tab handle */
                        var tabCategory = GetPopupItemTemplate(HelpPopupSelectros.TabSectionTitle).text('Discover').prependTo(tabsContainer);
                        var tabHandle =  GetPopupItemTemplate(HelpPopupSelectros.TabDiscover).attr('id', 'tdisco')
                            .toggleClass('hDrkCol selected hBGCol', !t1.IsPhone && (options.IsDiscoverRelease || options.FocusDiscover));

                        tabCategory.after(tabHandle);

                        /* tab contents */
                        var container = GetPopupItemTemplate(HelpPopupSelectros.ContentDiscover).addClass('tdisco');
                        var updatesContent = container.find('.content');

                        /* coming soon content - shown in the bottom of the content  */
                        var hasUpdatesContent, hasComingSoonContent;
                        var comingSoonContent = Create('div').append(
                                container.find('.title').clone().addClass('marginT20 paddingT20 borderT1 hLPointerCol').text('Coming soon in future release') /* Coming soon title */
                            );

                        var funcCreateUpdate = function (thisData) {
                            var thisUpdate = GetPopupItemTemplate(HelpPopupSelectros.ContentDiscoverUpdatesItem);
                            thisUpdate.find('h2').text(thisData.Title);
                            thisUpdate.find('p').html(thisData.Description);
                            return thisUpdate;
                        };

                        for (var i = 0; i < funcData.length; i++) {
                            var update = funcCreateUpdate(funcData[i]);
                            if ((funcData[i].UpdateType || '').toString().toLowerCase() === 'coming soon'){
                                hasComingSoonContent = true;
                                comingSoonContent.append(update);
                            } else {
                                hasUpdatesContent = true;
                                updatesContent.append(update);
                            }
                        }

                        if (!hasUpdatesContent){
                            updatesContent.append(funcCreateUpdate(noUpdatesData));
                        }

                        if (hasComingSoonContent){
                            updatesContent.append(comingSoonContent.children());
                        }

                        container.prependTo(helpContent.find('.rightContainer'));

                        popup.find('.release').text(EasDataStore.Config().ReleaseData.ReleaseCode);

                        var tabData = {
                            FunctionDescription: options.Title,
                            FunctionName:options.FunctionName,
                            Pathway: options.Title,
                            Topic: container.find('.title').text()
                        };

                        container.attr('data-t1-control', JSON.stringify(tabData));


                        /** update user count in header **/
                        /* if clicked on a tile */
                        if (options.IsDiscoverRelease && EasDataStore.Config().ShowUserCount) {

                            var funcUpdateCount = function(count) {
                                header.find('.userCount .count').text(count);
                            };

                            if (options.UserCount !== undefined) {
                                funcUpdateCount(options.UserCount);
                            } else {
                                GetUserCountForFunctions([{ FunctionName: options.FunctionName, SuiteId: options.SuiteId }],
                                    function(data) {
                                        funcUpdateCount((data || [])[options.FunctionName] || 0);
                                    });
                            }
                        }

                        if (options.ShowHelp) {
                            BuildUniPopupHelpContent(popup, options);
                        }
                    },
                    helpContent);
            }

            function T1UniPopupTabClicked() {

                var tab = $(this);
                if (t1.IsPhone || tab.closest('.leftContainer').width() == $(window).width()) {
                    return T1UniPopupTabClickedPhone(tab);
                }

                if (tab.hasClass('selected')) {
                    return;
                }

                tab.addClass('selected hDrkColHvr hDrkCol hBGCol')
                    .siblings('.selected').removeClass('selected hDrkCol hBGCol');

                var tabContentContainer = tab.closest('.leftContainer').next('.rightContainer');
                var thisTabContent = tabContentContainer.children('.' + tab.attr('id')).addClass('selected');

                thisTabContent.siblings().removeClass('selected');
                tabContentContainer.parent().toggleClass('viewHelp', tab.hasClass('hTopic'));

                var controlData = thisTabContent.data('t1-control');

                var logRequest = {
                    FunctionName: controlData.FunctionName,
                    FunctionDescription: controlData.FunctionDescription,
                    ActionCode: 'TOPICTAB',
                    ActionDescription: 'User clicked a related topic tab.',
                    ActionLocation: 'Help',
                    LearningPathway: controlData.Pathway,
                    Topic: controlData.Topic
                };

                LogT1UniversityAnalytics(logRequest);

                LoadTopicVideo(thisTabContent);
            }


            function T1UniPopupTabClickedPhone(tab) {
                tab.addClass('selected')
                    .siblings().removeClass('selected');

                var tabContentContainer = tab.closest('.leftContainer').next('.rightContainer');
                var thisTabContent = tabContentContainer.children('.' + tab.attr('id')).addClass('selected');

                thisTabContent.siblings().removeClass('selected');
                tabContentContainer.parent().addClass('contentView');


                LoadTopicVideo(thisTabContent);
            }

            function T1UniPopupPhoneBackToTabClicked() {
                $(this).closest('.contentView').removeClass('contentView');
            }

            function BindT1UniHelpPopupEvents() {

                if (eventsBound){ return; }
                eventsBound = true;

                $(document).on('focus', '#T1uniPopup .discoSearch input', function () {
                    var input = $(this);
                    input.parent().addClass('active');
                });

                $(document).on('blur', '#T1uniPopup .discoSearch input', function () {
                    var input = $(this);
                    input.parent().removeClass('active');
                });

                $(document).on('keypress', '#T1uniPopup .discoSearch input', function () {
                    var txtBox = $(this);
                    PrepareInputAndSearchHelp(txtBox.val(), txtBox, !t1.Key.Enter);
                });

                $(document).on(T1.FastClick, '.discoSearch .searchBtn', function () {
                    var txtBox = $(this).siblings('input');
                    PrepareInputAndSearchHelp(txtBox.val(), txtBox);
                });

                $(document).on(T1.FastClick, '.discoSearch .searchClrBtn', function () {
                    var txtBox = $(this).siblings('input').val('');
                    PrepareInputAndSearchHelp(txtBox.val(), txtBox);
                });

                $(document).on(T1.FastClick, '#T1uniPopup .helpBackBtn', function () {
                    ExitSearchHelp();
                });

                $(document).on(t1.FastClick, '#T1uniPopup .tab', T1UniPopupTabClicked);

                $(document).on(t1.FastClick, '#T1uniPopup .backBtn', T1UniPopupPhoneBackToTabClicked);

                $(document).on(t1.FastClick, 'a.relatedTopic', function (e) {
                    var $this = $(this);
                    var topicData = $this.data('t1-control') || {};

                    /* If this topic is in parent popup help - then use next search panel */
                    if($(this).closest('.helpContent').length){
                        PrepareInputAndSearchHelp(topicData.SearchTerm);
                    }
                    else{
                        /* Create a new search panel then slide in */
                        BuildUniPopupSearchContainer( $(this).closest('.t1uniPopup'), topicData.SearchTerm);
                    }
                });

                // $(document).on(T1.FastClick, '#T1UniHelpWrapper .popupClose', function (event) {
                //     window.close();
                // });

                $(document).on(t1.FastClick, '.vdoTranScriptWrapper', function (event) {
                   var link = $(this);
                   var control = link.closest('.tabContent');
                   var controlData = control.data('t1-control');

                   var logRequest = {
                        FunctionName: controlData.FunctionName,
                        FunctionDescription: controlData.FunctionDescription,
                        ActionCode: 'TRANSCRIPT',
                        ActionDescription: 'User clicked the Read Transcript Link',
                        ActionLocation: 'Help',
                        LearningPathway: controlData.Pathway,
                        Topic: controlData.Topic
                    };

                    LogT1UniversityAnalytics(logRequest);
                });

                $(document).on('click', '.onClickLogT1Analytics', function (event) {

                    var control = $(this);
                    var controlData = control.data('t1-control');

                    var logRequest = {
                        FunctionName: '$WORKPLACE',
                        FunctionDescription: 'Workplace',
                        ActionLocation: controlData.Location,
                        ActionCode: 'T1ULINK',
                        ActionDescription: 'User clicked the TechnologyOne University link',
                        App: 'Workplace'
                    };

                    switch (controlData.LinkType){
                        case HelpLinkType.ExternalHelp:
                            logRequest.ActionDescription = "User clicked external help link";
                            break;
                        case HelpLinkType.T1University:
                            logRequest.ActionDescription = "User clicked T1 University link";
                            break;
                    }


                    LogT1UniversityAnalytics(logRequest);
                });


                $(document).on(t1.FastClick, '.tile .item.t1Help, .t1Help:not(.disabled), .tile .header .status, .tile.disco, .entSearchItem .t1Help', function (e) {
                    /*
                    * There are 4 ways user can reach here - by clicking :
                    * 1. help icon on tile
                    * 2. help icon on header
                    * 3. tile status on enabled discovery mode on workplace
                    * 4. tile on discover new screen
                    * */

                    var target = $(e.target);
                    var tile = target.closest('.tile');

                    /* check for enterprise search */
                    if(!tile.length){
                        tile = target.closest('.entSearchItem');
                    }

                    var clickedHelpInHeader = !tile.length && target.closest('#GlobalHeader').length > 0;
                    var functionData = tile.length ? tile.data('t1-control') : {};

                    var f = functionData.MergeFuncName || functionData.FunctionName || EasDataStore.GetFunctionName();

                    /* if clicked on header help icon then we need to find function data to show popup */
                    if (clickedHelpInHeader && controls.FunctionSearch){
                        functionData = controls.FunctionSearch.FindFunction(f);
                    }

                    var logRequest = {
                        FunctionName: f,
                        ActionLocation: clickedHelpInHeader ? (f === '$WORKPLACE' ? 'WORKPLACE' : 'FUNCTION') : 'TILE',
                        ActionCode: 'HELP',
                        ActionDescription: 'User clicked the help button',
                        App: f === '$WORKPLACE' ? 'Workplace' : functionData.AppName || '',
                        FunctionDescription: f === '$WORKPLACE' ? 'Workplace' : functionData.LabelText
                    };

                    LogT1UniversityAnalytics(logRequest);

                    var isDiscoverRelease = tile.hasClass('disco');
                    var onDiscoverMode = target.closest('.status').length > 0 || isDiscoverRelease;

                    var popupOptions = {
                        FunctionName: f,
                        FocusDiscover: onDiscoverMode,
                        IsDiscoverRelease : isDiscoverRelease,
                        UserCount: clickedHelpInHeader ? undefined : tile.data('t1-users'),
                        SuiteId: functionData.SuiteId || functionData.Suite,
                        Title: functionData.LabelText || ( f === '$WORKPLACE' ? 'Workplace' : 'Topics'),
                        ShowHelp: !EasDataStore.Config().IsStaticPage,
                        NewWindow: !EasDataStore.Config().IsStaticPage
                    };

                    /* Adding popup option data to the session storage to be picked by the new window */
                    EasDataStore.SetDataToCache(_cacheKeyHelpPopupOptions, popupOptions);

                    var wwidth = $(window).width();
                    var wheight = $(window).height();
                    var pw = Math.max(wwidth * 2 / 3, 800);
                    var ph = Math.max(wheight * 4 / 5, 500);

                    if (popupOptions.NewWindow) {
                        /* A new window is to be open and that window will run this control's Initialise() function and load page content as per popup options set in cache */
                        window.open(T1.Environment.Paths.RootEnvironmentUrl + 'Workplace/Help', popupOptions.FunctionName,
                            "left=200, top=150, width=" + pw + ", height=" + ph + ", directories = 0, titlebar = 0, toolbar=yes, location = 0, status = 0, menubar = 0, resizable=yes");
                    }else{
                        /* This is intended for discover screen */
                        ShowPopup(popupOptions);
                    }

                });
            }

            function LogT1UniversityAnalytics(logRequest) {

                if (EasDataStore.Config().IsStaticPage){
                    return;
                }

                var options = {
                    url: 'HELP/LogHelpAnalytics',
                    type: 'POST',
                    data: logRequest
                };

                WorkplaceAjaxRequest(options)
            }

            return {
                Initialise: function(options){
                    options = options || {};
                    if (options.AddHelpButton){
                        /* Add help button top header right corner after user navigation */
                        CreateGlobalHeaderContextHelpButton();
                    }
                    BindT1UniHelpPopupEvents();
                },
                ShowPopup: ShowPopup,
                BindT1UniHelpPopupEvents:BindT1UniHelpPopupEvents,
                PrepareInputAndSearchHelp:PrepareInputAndSearchHelp
            }
        })();


        /*---------------------------------------------------------
        *                Global helper functions
        * ---------------------------------------------------------*/


        function GetPopupItemTemplate(selector) {
            return $('#T1UniPopupTemplates > ' + selector).clone(true);
        }

        function GetHelpPopupTemplates(callback) {
            WorkplaceAjaxRequest({
                url: 'Help/HelpContentTemplates',
                dataType: 'html',
                type: 'GET',
                success: function (respHtml) {
                    $(document.body).append(respHtml);
                    if (callback){
                        callback();
                    }
                }
            });
        }

        function WorkplaceAjaxRequest(options) {
            T1.C2.Shell.Ajax({
                url: T1.Environment.Paths.RootEnvironmentUrl + 'Workplace/' + options.url,
                data: JSON.stringify(options.data),
                type: options.type,
                dataType: options.dataType,
                blocking: false,
                ShowLoader: false,
                success: function (response) {
                    if(options.success) options.success(response);
                },
                error:function(ex) {
                    if (options.error) options.error();
                },
                ignoreErrors: !options.error,
                timeout: 5000
            });
        }


        function GetUserCountForTiles(tiles, extCallBack) {

            if (!EasDataStore.Config().ShowUserCount) {
                return;
            }

            var tileIds = {};
            var funcItems = [];
            var f, s, tile;

            tiles.each(function () {
                tile = $(this);
                var data = tile.data('t1-control') || {};
                f = data.FunctionName;
                s = data.Suite;
                tileIds[f] = tile.attr('id');

                funcItems.push({ FunctionName: f, SuiteId: s });
            });

            var callBackFunc = function (data) {
                if (!data) {
                    return;
                }

                for (var i = 0; i < funcItems.length; i++) {
                    f = funcItems[i].FunctionName;
                    var id = tileIds[f];
                    var count = data[f] || 0;

                    tile = $('#' + id);
                    if (tile.length) {
                        tile.addClass('hasUserCount').find('.userCount .count').text(count);
                        tile.data('t1-users', count);
                    }
                }

                if (extCallBack) extCallBack();
            };

            GetUserCountForFunctions(funcItems, callBackFunc);
        }

        function GetUserCountForFunctions(funcNames, callBackFunc) {
            WorkplaceAjaxRequest({
                url: 'DiscoverNew/GetUserCounts',
                data: funcNames,
                success: callBackFunc
            });
        }

        function InitilaiseForHeaderFooter() {
            if (isInitialised){
                /* This is a popup window - already initialised through Initilise() */
                return;
            }

            /* Workplace and all apps initialisation */

            if (T1.Environment.Context.User.IsLoggedOn && !T1.Settings.Simplified
                && ($('#GlobalHeader').is(":visible") || t1.IsPhone))
            {
                EasDataStore.GetEasConfigData(function () {
                    PopupBuildersWorkplacePopups.AddDiscoverLink();
                    PopupBuildersHelpPopup.Initialise({ AddHelpButton: true });
                    setTimeout(function () {
                        $(document).trigger($.Event('OnT1UniversityOpen'));
                        $(document.body).addClass('t1UniOpen');
                    }, 100);
                });
            }

            /* Discover release screen initialisation */

            var control = $('#T1UniHelpWrapper');
            if (control.length) {
                var easConfig = control.data('t1-control') || {};

                if (easConfig.ReleaseData) {
                    /* This is in Public mode */
                    easConfig = $.extend(easConfig, {
                        ReleaseData: JSON.parse(easConfig.ReleaseData),
                        EnableDiscover: true
                    });
                    EasDataStore.UpdateConfig(easConfig);
                } else {
                    EasDataStore.GetEasConfigData();
        }

                PopupBuildersWorkplacePopups.BindReleasePopupEvents();
                PopupBuildersHelpPopup.BindT1UniHelpPopupEvents();
            }
        }

        function Create(tag, className){
            return $(document.createElement(tag)).addClass(className);
        }

        /*
        * Global Event Handlers
        */

        $(document).ready(InitilaiseForHeaderFooter);

        var isInitialised = false;

        function Initialise(control) {

            isInitialised = true;
            var viewOptions = control.data('t1-control') || {};

            var localStorageCacheOptions = EasDataStore.GetDataFromCache(_cacheKeyHelpPopupOptions) || {};
            viewOptions = $.extend(viewOptions, localStorageCacheOptions);
            viewOptions = $.extend(viewOptions, {
                FunctionName: viewOptions.FunctionName || '$WORKPLACE',
                SearchTerm: viewOptions.SearchTerm || viewOptions.RelatedTopic,
                EnableSearch: true,
                EnableDiscover: true,
                EnableHelp: true,
                IsRelatedTopic: viewOptions.RelatedTopic !== '',
                NewWindow: true
            });

            EasDataStore.GetEasConfigData(function () {
                EasDataStore.GetRelease(function () {
                    PopupBuildersHelpPopup.Initialise();
                    PopupBuildersHelpPopup.ShowPopup(viewOptions);
                });
            });
            $(document.body).addClass('t1UniHelpWindow');
        }


        /*
        * Public API
        */

        function T1_C2_Shell_Controls_T1University_Public() {
            /// <summary>
            /// Constructor for the librarys public API
            /// </summary>
        }

        T1_C2_Shell_Controls_T1University_Public.prototype = {

            Initialise: Initialise,

            AddDiscoverLink: PopupBuildersWorkplacePopups.AddDiscoverLink,

            AddFlowLinks: PopupBuildersWorkplacePopups.AddFlowT1UniversityExternalUrlLinks,

            GetRelease: EasDataStore.GetRelease,

            GetFunctionalGroup: EasDataStore.GetFunctionalGroup,

            GetFunctionUpdates: EasDataStore.GetFunctionUpdates,

            GetAllFunctionsUpdates : EasDataStore.GetAllFunctionsUpdates,

            GetT1UniversityUrl: EasDataStore.GetT1UniversityUrl,

            GetNewT1UniversityUrl: EasDataStore.GetNewT1UniversityUrl,

            GetFunctionUserCount: GetUserCountForTiles,

            ImportDiscoverUpdatesData: EasDataStore.ImportEasData,

            Splash: PopupBuildersWorkplacePopups.ShowWelcomeVideo,

            HasSplashBanner: PopupBuildersWorkplacePopups.HasWelcomeVideo,

            DismissSplash: PopupBuildersWorkplacePopups.DismissBannerSplash,

            SetFunctionName: EasDataStore.SetFunctionNameForHelp
        };

        // return a new instance of the public object
        return new T1_C2_Shell_Controls_T1University_Public();
    }
} ());

// https://github.com/farzher/fuzzysort v2.0.4
/*
  SublimeText-like Fuzzy Search

  fuzzysort.single('fs', 'Fuzzy Search') // {score: -16}
  fuzzysort.single('test', 'test') // {score: 0}
  fuzzysort.single('doesnt exist', 'target') // null

  fuzzysort.go('mr', [{file:'Monitor.cpp'}, {file:'MeshRenderer.cpp'}], {key:'file'})
  // [{score:-18, obj:{file:'MeshRenderer.cpp'}}, {score:-6009, obj:{file:'Monitor.cpp'}}]

  fuzzysort.go('mr', ['Monitor.cpp', 'MeshRenderer.cpp'])
  // [{score: -18, target: "MeshRenderer.cpp"}, {score: -6009, target: "Monitor.cpp"}]

  fuzzysort.highlight(fuzzysort.single('fs', 'Fuzzy Search'), '<b>', '</b>')
  // <b>F</b>uzzy <b>S</b>earch
*/

// UMD (Universal Module Definition) for fuzzysort
;((root, UMD) => {
  if(typeof define === 'function' && define.amd) define([], UMD)
  else if(typeof module === 'object' && module.exports) module.exports = UMD()
  else root['fuzzysort'] = UMD()
})(this, _ => {
  'use strict'

  var single = (search, target) => {                                                                                                                                                                                                                        if(search=='farzher')return{target:"farzher was here (^-^*)/",score:0,_indexes:[0]}
    if(!search || !target) return NULL

    var preparedSearch = getPreparedSearch(search)
    if(!isObj(target)) target = getPrepared(target)

    var searchBitflags = preparedSearch.bitflags
    if((searchBitflags & target._bitflags) !== searchBitflags) return NULL

    return algorithm(preparedSearch, target)
  }


  var go = (search, targets, options) => {                                                                                                                                                                                                                  if(search=='farzher')return[{target:"farzher was here (^-^*)/",score:0,_indexes:[0],obj:targets?targets[0]:NULL}]
    if(!search) return options&&options.all ? all(search, targets, options) : noResults

    var preparedSearch = getPreparedSearch(search)
    var searchBitflags = preparedSearch.bitflags
    var containsSpace  = preparedSearch.containsSpace

    var threshold = options&&options.threshold || INT_MIN
    var limit     = options&&options['limit']  || INT_MAX // for some reason only limit breaks when minified

    var resultsLen = 0; var limitedCount = 0
    var targetsLen = targets.length

    // This code is copy/pasted 3 times for performance reasons [options.keys, options.key, no keys]

    // options.key
    if(options && options.key) {
      var key = options.key
      for(var i = 0; i < targetsLen; ++i) { var obj = targets[i]
        var target = getValue(obj, key)
        if(!target) continue
        if(!isObj(target)) target = getPrepared(target)

        if((searchBitflags & target._bitflags) !== searchBitflags) continue
        var result = algorithm(preparedSearch, target)
        if(result === NULL) continue
        if(result.score < threshold) continue

        // have to clone result so duplicate targets from different obj can each reference the correct obj
        result = {target:result.target, _targetLower:'', _targetLowerCodes:NULL, _nextBeginningIndexes:NULL, _bitflags:0, score:result.score, _indexes:result._indexes, obj:obj} // hidden

        if(resultsLen < limit) { q.add(result); ++resultsLen }
        else {
          ++limitedCount
          if(result.score > q.peek().score) q.replaceTop(result)
        }
      }

    // options.keys
    } else if(options && options.keys) {
      var scoreFn = options['scoreFn'] || defaultScoreFn
      var keys = options.keys
      var keysLen = keys.length
      for(var i = 0; i < targetsLen; ++i) { var obj = targets[i]
        var objResults = new Array(keysLen)
        for (var keyI = 0; keyI < keysLen; ++keyI) {
          var key = keys[keyI]
          var target = getValue(obj, key)
          if(!target) { objResults[keyI] = NULL; continue }
          if(!isObj(target)) target = getPrepared(target)

          if((searchBitflags & target._bitflags) !== searchBitflags) objResults[keyI] = NULL
          else objResults[keyI] = algorithm(preparedSearch, target)
        }
        objResults.obj = obj // before scoreFn so scoreFn can use it
        var score = scoreFn(objResults)
        if(score === NULL) continue
        if(score < threshold) continue
        objResults.score = score
        if(resultsLen < limit) { q.add(objResults); ++resultsLen }
        else {
          ++limitedCount
          if(score > q.peek().score) q.replaceTop(objResults)
        }
      }

    // no keys
    } else {
      for(var i = 0; i < targetsLen; ++i) { var target = targets[i]
        if(!target) continue
        if(!isObj(target)) target = getPrepared(target)

        if((searchBitflags & target._bitflags) !== searchBitflags) continue
        var result = algorithm(preparedSearch, target)
        if(result === NULL) continue
        if(result.score < threshold) continue
        if(resultsLen < limit) { q.add(result); ++resultsLen }
        else {
          ++limitedCount
          if(result.score > q.peek().score) q.replaceTop(result)
        }
      }
    }

    if(resultsLen === 0) return noResults
    var results = new Array(resultsLen)
    for(var i = resultsLen - 1; i >= 0; --i) results[i] = q.poll()
    results.total = resultsLen + limitedCount
    return results
  }


  var highlight = (result, hOpen, hClose) => {
    if(typeof hOpen === 'function') return highlightCallback(result, hOpen)
    if(result === NULL) return NULL
    if(hOpen === undefined) hOpen = '<b>'
    if(hClose === undefined) hClose = '</b>'
    var highlighted = ''
    var matchesIndex = 0
    var opened = false
    var target = result.target
    var targetLen = target.length
    var indexes = result._indexes
    indexes = indexes.slice(0, indexes.len).sort((a,b)=>a-b)
    for(var i = 0; i < targetLen; ++i) { var char = target[i]
      if(indexes[matchesIndex] === i) {
        ++matchesIndex
        if(!opened) { opened = true
          highlighted += hOpen
        }

        if(matchesIndex === indexes.length) {
          highlighted += char + hClose + target.substr(i+1)
          break
        }
      } else {
        if(opened) { opened = false
          highlighted += hClose
        }
      }
      highlighted += char
    }

    return highlighted
  }
  var highlightCallback = (result, cb) => {
    if(result === NULL) return NULL
    var target = result.target
    var targetLen = target.length
    var indexes = result._indexes
    indexes = indexes.slice(0, indexes.len).sort((a,b)=>a-b)
    var highlighted = ''
    var matchI = 0
    var indexesI = 0
    var opened = false
    var result = []
    for(var i = 0; i < targetLen; ++i) { var char = target[i]
      if(indexes[indexesI] === i) {
        ++indexesI
        if(!opened) { opened = true
          result.push(highlighted); highlighted = ''
        }

        if(indexesI === indexes.length) {
          highlighted += char
          result.push(cb(highlighted, matchI++)); highlighted = ''
          result.push(target.substr(i+1))
          break
        }
      } else {
        if(opened) { opened = false
          result.push(cb(highlighted, matchI++)); highlighted = ''
        }
      }
      highlighted += char
    }
    return result
  }


  var indexes = result => result._indexes.slice(0, result._indexes.len).sort((a,b)=>a-b)


  var prepare = (target) => {
    if(typeof target !== 'string') target = ''
    var info = prepareLowerInfo(target)
    return {'target':target, _targetLower:info._lower, _targetLowerCodes:info.lowerCodes, _nextBeginningIndexes:NULL, _bitflags:info.bitflags, 'score':NULL, _indexes:[0], 'obj':NULL} // hidden
  }


  // Below this point is only internal code
  // Below this point is only internal code
  // Below this point is only internal code
  // Below this point is only internal code


  var prepareSearch = (search) => {
    if(typeof search !== 'string') search = ''
    search = search.trim()
    var info = prepareLowerInfo(search)

    var spaceSearches = []
    if(info.containsSpace) {
      var searches = search.split(/\s+/)
      searches = [...new Set(searches)] // distinct
      for(var i=0; i<searches.length; i++) {
        if(searches[i] === '') continue
        var _info = prepareLowerInfo(searches[i])
        spaceSearches.push({lowerCodes:_info.lowerCodes, _lower:searches[i].toLowerCase(), containsSpace:false})
      }
    }

    return {lowerCodes: info.lowerCodes, bitflags: info.bitflags, containsSpace: info.containsSpace, _lower: info._lower, spaceSearches: spaceSearches}
  }



  var getPrepared = (target) => {
    if(target.length > 999) return prepare(target) // don't cache huge targets
    var targetPrepared = preparedCache.get(target)
    if(targetPrepared !== undefined) return targetPrepared
    targetPrepared = prepare(target)
    preparedCache.set(target, targetPrepared)
    return targetPrepared
  }
  var getPreparedSearch = (search) => {
    if(search.length > 999) return prepareSearch(search) // don't cache huge searches
    var searchPrepared = preparedSearchCache.get(search)
    if(searchPrepared !== undefined) return searchPrepared
    searchPrepared = prepareSearch(search)
    preparedSearchCache.set(search, searchPrepared)
    return searchPrepared
  }


  var all = (search, targets, options) => {
    var results = []; results.total = targets.length

    var limit = options && options.limit || INT_MAX

    if(options && options.key) {
      for(var i=0;i<targets.length;i++) { var obj = targets[i]
        var target = getValue(obj, options.key)
        if(!target) continue
        if(!isObj(target)) target = getPrepared(target)
        target.score = INT_MIN
        target._indexes.len = 0
        var result = target
        result = {target:result.target, _targetLower:'', _targetLowerCodes:NULL, _nextBeginningIndexes:NULL, _bitflags:0, score:target.score, _indexes:NULL, obj:obj} // hidden
        results.push(result); if(results.length >= limit) return results
      }
    } else if(options && options.keys) {
      for(var i=0;i<targets.length;i++) { var obj = targets[i]
        var objResults = new Array(options.keys.length)
        for (var keyI = options.keys.length - 1; keyI >= 0; --keyI) {
          var target = getValue(obj, options.keys[keyI])
          if(!target) { objResults[keyI] = NULL; continue }
          if(!isObj(target)) target = getPrepared(target)
          target.score = INT_MIN
          target._indexes.len = 0
          objResults[keyI] = target
        }
        objResults.obj = obj
        objResults.score = INT_MIN
        results.push(objResults); if(results.length >= limit) return results
      }
    } else {
      for(var i=0;i<targets.length;i++) { var target = targets[i]
        if(!target) continue
        if(!isObj(target)) target = getPrepared(target)
        target.score = INT_MIN
        target._indexes.len = 0
        results.push(target); if(results.length >= limit) return results
      }
    }

    return results
  }


  var algorithm = (preparedSearch, prepared, allowSpaces=false) => {
    if(allowSpaces===false && preparedSearch.containsSpace) return algorithmSpaces(preparedSearch, prepared)

    var searchLower = preparedSearch._lower
    var searchLowerCodes = preparedSearch.lowerCodes
    var searchLowerCode = searchLowerCodes[0]
    var targetLowerCodes = prepared._targetLowerCodes
    var searchLen = searchLowerCodes.length
    var targetLen = targetLowerCodes.length
    var searchI = 0 // where we at
    var targetI = 0 // where you at
    var matchesSimpleLen = 0

    // very basic fuzzy match; to remove non-matching targets ASAP!
    // walk through target. find sequential matches.
    // if all chars aren't found then exit
    for(;;) {
      var isMatch = searchLowerCode === targetLowerCodes[targetI]
      if(isMatch) {
        matchesSimple[matchesSimpleLen++] = targetI
        ++searchI; if(searchI === searchLen) break
        searchLowerCode = searchLowerCodes[searchI]
      }
      ++targetI; if(targetI >= targetLen) return NULL // Failed to find searchI
    }

    var searchI = 0
    var successStrict = false
    var matchesStrictLen = 0

    var nextBeginningIndexes = prepared._nextBeginningIndexes
    if(nextBeginningIndexes === NULL) nextBeginningIndexes = prepared._nextBeginningIndexes = prepareNextBeginningIndexes(prepared.target)
    var firstPossibleI = targetI = matchesSimple[0]===0 ? 0 : nextBeginningIndexes[matchesSimple[0]-1]

    // Our target string successfully matched all characters in sequence!
    // Let's try a more advanced and strict test to improve the score
    // only count it as a match if it's consecutive or a beginning character!
    var backtrackCount = 0
    if(targetI !== targetLen) for(;;) {
      if(targetI >= targetLen) {
        // We failed to find a good spot for this search char, go back to the previous search char and force it forward
        if(searchI <= 0) break // We failed to push chars forward for a better match

        ++backtrackCount; if(backtrackCount > 200) break // exponential backtracking is taking too long, just give up and return a bad match

        --searchI
        var lastMatch = matchesStrict[--matchesStrictLen]
        targetI = nextBeginningIndexes[lastMatch]

      } else {
        var isMatch = searchLowerCodes[searchI] === targetLowerCodes[targetI]
        if(isMatch) {
          matchesStrict[matchesStrictLen++] = targetI
          ++searchI; if(searchI === searchLen) { successStrict = true; break }
          ++targetI
        } else {
          targetI = nextBeginningIndexes[targetI]
        }
      }
    }

    // check if it's a substring match
    var substringIndex = prepared._targetLower.indexOf(searchLower, matchesSimple[0]) // perf: this is slow
    var isSubstring = ~substringIndex
    if(isSubstring && !successStrict) { // rewrite the indexes from basic to the substring
      for(var i=0; i<matchesSimpleLen; ++i) matchesSimple[i] = substringIndex+i
    }
    var isSubstringBeginning = false
    if(isSubstring) {
      isSubstringBeginning = prepared._nextBeginningIndexes[substringIndex-1] === substringIndex
    }

    { // tally up the score & keep track of matches for highlighting later
      if(successStrict) { var matchesBest = matchesStrict; var matchesBestLen = matchesStrictLen }
      else { var matchesBest = matchesSimple; var matchesBestLen = matchesSimpleLen }

      var score = 0

      var extraMatchGroupCount = 0
      for(var i = 1; i < searchLen; ++i) {
        if(matchesBest[i] - matchesBest[i-1] !== 1) {score -= matchesBest[i]; ++extraMatchGroupCount}
      }
      var unmatchedDistance = matchesBest[searchLen-1] - matchesBest[0] - (searchLen-1)

      score -= (12+unmatchedDistance) * extraMatchGroupCount // penality for more groups

      if(matchesBest[0] !== 0) score -= matchesBest[0]*matchesBest[0]*.2 // penality for not starting near the beginning

      if(!successStrict) {
        score *= 1000
      } else {
        // successStrict on a target with too many beginning indexes loses points for being a bad target
        var uniqueBeginningIndexes = 1
        for(var i = nextBeginningIndexes[0]; i < targetLen; i=nextBeginningIndexes[i]) ++uniqueBeginningIndexes

        if(uniqueBeginningIndexes > 24) score *= (uniqueBeginningIndexes-24)*10 // quite arbitrary numbers here ...
      }

      if(isSubstring)          score /= 1+searchLen*searchLen*1 // bonus for being a full substring
      if(isSubstringBeginning) score /= 1+searchLen*searchLen*1 // bonus for substring starting on a beginningIndex

      score -= targetLen - searchLen // penality for longer targets
      prepared.score = score

      for(var i = 0; i < matchesBestLen; ++i) prepared._indexes[i] = matchesBest[i]
      prepared._indexes.len = matchesBestLen

      return prepared
    }
  }
  var algorithmSpaces = (preparedSearch, target) => {
    var seen_indexes = new Set()
    var score = 0
    var result = NULL

    var first_seen_index_last_search = 0
    var searches = preparedSearch.spaceSearches
    for(var i=0; i<searches.length; ++i) {
      var search = searches[i]

      result = algorithm(search, target)
      if(result === NULL) return NULL

      score += result.score

      // dock points based on order otherwise "c man" returns Manifest.cpp instead of CheatManager.h
      if(result._indexes[0] < first_seen_index_last_search) {
        score -= first_seen_index_last_search - result._indexes[0]
      }
      first_seen_index_last_search = result._indexes[0]

      for(var j=0; j<result._indexes.len; ++j) seen_indexes.add(result._indexes[j])
    }

    // allows a search with spaces that's an exact substring to score well
    var allowSpacesResult = algorithm(preparedSearch, target, /*allowSpaces=*/true)
    if(allowSpacesResult !== NULL && allowSpacesResult.score > score) {
      return allowSpacesResult
    }

    result.score = score

    var i = 0
    for (let index of seen_indexes) result._indexes[i++] = index
    result._indexes.len = i

    return result
  }


  var prepareLowerInfo = (str) => {
    var strLen = str.length
    var lower = str.toLowerCase()
    var lowerCodes = [] // new Array(strLen)    sparse array is too slow
    var bitflags = 0
    var containsSpace = false // space isn't stored in bitflags because of how searching with a space works

    for(var i = 0; i < strLen; ++i) {
      var lowerCode = lowerCodes[i] = lower.charCodeAt(i)

      if(lowerCode === 32) {
        containsSpace = true
        continue // it's important that we don't set any bitflags for space
      }

      var bit = lowerCode>=97&&lowerCode<=122 ? lowerCode-97 // alphabet
              : lowerCode>=48&&lowerCode<=57  ? 26           // numbers
                                                             // 3 bits available
              : lowerCode<=127                ? 30           // other ascii
              :                                 31           // other utf8
      bitflags |= 1<<bit
    }

    return {lowerCodes:lowerCodes, bitflags:bitflags, containsSpace:containsSpace, _lower:lower}
  }
  var prepareBeginningIndexes = (target) => {
    var targetLen = target.length
    var beginningIndexes = []; var beginningIndexesLen = 0
    var wasUpper = false
    var wasAlphanum = false
    for(var i = 0; i < targetLen; ++i) {
      var targetCode = target.charCodeAt(i)
      var isUpper = targetCode>=65&&targetCode<=90
      var isAlphanum = isUpper || targetCode>=97&&targetCode<=122 || targetCode>=48&&targetCode<=57
      var isBeginning = isUpper && !wasUpper || !wasAlphanum || !isAlphanum
      wasUpper = isUpper
      wasAlphanum = isAlphanum
      if(isBeginning) beginningIndexes[beginningIndexesLen++] = i
    }
    return beginningIndexes
  }
  var prepareNextBeginningIndexes = (target) => {
    var targetLen = target.length
    var beginningIndexes = prepareBeginningIndexes(target)
    var nextBeginningIndexes = [] // new Array(targetLen)     sparse array is too slow
    var lastIsBeginning = beginningIndexes[0]
    var lastIsBeginningI = 0
    for(var i = 0; i < targetLen; ++i) {
      if(lastIsBeginning > i) {
        nextBeginningIndexes[i] = lastIsBeginning
      } else {
        lastIsBeginning = beginningIndexes[++lastIsBeginningI]
        nextBeginningIndexes[i] = lastIsBeginning===undefined ? targetLen : lastIsBeginning
      }
    }
    return nextBeginningIndexes
  }


  var cleanup = () => { preparedCache.clear(); preparedSearchCache.clear(); matchesSimple = []; matchesStrict = [] }

  var preparedCache       = new Map()
  var preparedSearchCache = new Map()
  var matchesSimple = []; var matchesStrict = []


  // for use with keys. just returns the maximum score
  var defaultScoreFn = (a) => {
    var max = INT_MIN
    var len = a.length
    for (var i = 0; i < len; ++i) {
      var result = a[i]; if(result === NULL) continue
      var score = result.score
      if(score > max) max = score
    }
    if(max === INT_MIN) return NULL
    return max
  }

  // prop = 'key'              2.5ms optimized for this case, seems to be about as fast as direct obj[prop]
  // prop = 'key1.key2'        10ms
  // prop = ['key1', 'key2']   27ms
  var getValue = (obj, prop) => {
    var tmp = obj[prop]; if(tmp !== undefined) return tmp
    var segs = prop
    if(!Array.isArray(prop)) segs = prop.split('.')
    var len = segs.length
    var i = -1
    while (obj && (++i < len)) obj = obj[segs[i]]
    return obj
  }

  var isObj = (x) => { return typeof x === 'object' } // faster as a function
  // var INT_MAX = 9007199254740991; var INT_MIN = -INT_MAX
  var INT_MAX = Infinity; var INT_MIN = -INT_MAX
  var noResults = []; noResults.total = 0
  var NULL = null


  // Hacked version of https://github.com/lemire/FastPriorityQueue.js
  var fastpriorityqueue=r=>{var e=[],o=0,a={},v=r=>{for(var a=0,v=e[a],c=1;c<o;){var s=c+1;a=c,s<o&&e[s].score<e[c].score&&(a=s),e[a-1>>1]=e[a],c=1+(a<<1)}for(var f=a-1>>1;a>0&&v.score<e[f].score;f=(a=f)-1>>1)e[a]=e[f];e[a]=v};return a.add=(r=>{var a=o;e[o++]=r;for(var v=a-1>>1;a>0&&r.score<e[v].score;v=(a=v)-1>>1)e[a]=e[v];e[a]=r}),a.poll=(r=>{if(0!==o){var a=e[0];return e[0]=e[--o],v(),a}}),a.peek=(r=>{if(0!==o)return e[0]}),a.replaceTop=(r=>{e[0]=r,v()}),a}
  var q = fastpriorityqueue() // reuse this


  // fuzzysort is written this way for minification. all names are mangeled unless quoted
  return {'single':single, 'go':go, 'highlight':highlight, 'prepare':prepare, 'indexes':indexes, 'cleanup':cleanup}
}) // UMD

// TODO: (feature) frecency
// TODO: (perf) use different sorting algo depending on the # of results?
// TODO: (perf) preparedCache is a memory leak
// TODO: (like sublime) backslash === forwardslash
// TODO: (perf) prepareSearch seems slow

