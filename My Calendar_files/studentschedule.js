(function ($document) {

    var T1 = window.T1 = window.T1 || {},
        c2 = T1.C2 = T1.C2 || {},
        shell = c2.Shell = c2.Shell || {},
        controls = shell.Controls = shell.Controls || {};

    $document.delegate('#EnquiryRelatedDataPortlet_CalendarView_Week', 'RelatedDataPortlet.DataLoadedFirstTime', function (e) {
        overrideNotification();
    });

    $document.delegate('#EnquiryRelatedDataPortlet_CalendarView_Week', 'RelatedDataPortlet.DataLoaded', function (e) {
        overrideNotification();
    });

    $(document).ajaxComplete(function (event, request, settings) {
        overrideNotification();
    });

    // This will override the default 'X events not rendered' message in CalendarViewer.js
    function overrideNotification() {
        var control = $('.notification.initialised'),
            notifications = getNotifications(control);
        var isChangeMessage = false;
        if (notifications.length > 0) {
            $(notifications).each(function (index, element) {

                if (element.Message.indexOf('events not rendered') !== -1) {
                    var numEventsNotRendered = element.Message.match(/\d+/),
                        message = ' calendar event is outside the displayed timeframe and cannot be displayed.';
                    if (numEventsNotRendered > 1) {
                        message = ' calendar events are outside the displayed timeframe and cannot be displayed.';
                    }
                    element.Message = numEventsNotRendered + message;
                    isChangeMessage = true;
                }
            });

            if(isChangeMessage){
                controls.Notification.Clear();
                $(notifications).each(function (index, element) {
                    controls.Shared.Notification.AddNotificationItem(control, element, false, undefined);
                });
                controls.Shared.Notification.Show(control);
                control.css('top', 5);
            }
        }
    }

    function getNotifications(_notificationPanel) {
        if (!_notificationPanel.length) {
            return [];
        }
        var notifications = [];
        _notificationPanel.find('.notificationItem').each(function (index, item) {
            var notificationData = $(item).data('t1-control');
            if (notificationData) {
                notifications.push(notificationData);
            }
        });

        return notifications;
    }
    
}($(document)));    
