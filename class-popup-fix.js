// class-popup-fix.js - Override for broken class detail popups
(function() {
    'use strict';
    
    console.log('Loading Class Popup Fix...');
    
    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initClassPopupFix);
    } else {
        setTimeout(initClassPopupFix, 1000);
    }
    
    function initClassPopupFix() {
        console.log('Initializing Class Popup Fix...');
        
        // Create our custom popup
        createCustomPopup();
        
        // Add click handlers to class elements
        attachClassClickHandlers();
        
        // Monitor for new class elements (if calendar updates)
        observeCalendarChanges();
        
        console.log('Class Popup Fix initialized successfully');
    }
    
    function createCustomPopup() {
        // Remove existing popup if any
        const existingPopup = document.getElementById('customClassPopup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        // Create popup container
        const popup = document.createElement('div');
        popup.id = 'customClassPopup';
        popup.style.cssText = `
            position: fixed;
            top: 120px;
            right: 20px;
            width: 380px;
            background: white;
            border: 2px solid #1F497D;
            border-radius: 8px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: 'Segoe UI', Arial, sans-serif;
            display: none;
            max-height: 75vh;
            overflow-y: auto;
            animation: popupFadeIn 0.3s ease-out;
        `;
        
        popup.innerHTML = `
            <div style="background: linear-gradient(135deg, #1F497D, #2c5fa3); color: white; padding: 16px; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 600;">📚 Class Details</h3>
                <button id="closeCustomPopup" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 18px; cursor: pointer; padding: 0; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">×</button>
            </div>
            <div id="customPopupContent" style="padding: 20px;">
                <div style="text-align: center; color: #666; padding: 40px 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">📅</div>
                    <div style="font-size: 14px;">Click on any class in your timetable to see details</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Add close functionality
        document.getElementById('closeCustomPopup').addEventListener('click', function() {
            popup.style.display = 'none';
        });
        
        // Close when clicking outside
        document.addEventListener('click', function(event) {
            if (!popup.contains(event.target) && !event.target.closest('.thumbnailItem') && !event.target.closest('.t1cal-day')) {
                popup.style.display = 'none';
            }
        });
        
        // Add CSS animations
        addPopupStyles();
    }
    
    function addPopupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes popupFadeIn {
                from { 
                    opacity: 0; 
                    transform: translateY(-20px) scale(0.95); 
                }
                to { 
                    opacity: 1; 
                    transform: translateY(0) scale(1); 
                }
            }
            
            @keyframes slideInRight {
                from { 
                    opacity: 0; 
                    transform: translateX(30px); 
                }
                to { 
                    opacity: 1; 
                    transform: translateX(0); 
                }
            }
            
            .class-clickable {
                cursor: pointer !important;
                transition: all 0.2s ease !important;
            }
            
            .class-clickable:hover {
                opacity: 0.9 !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    function attachClassClickHandlers() {
        // Target all class elements in the calendar
        const selectors = [
            '.thumbnailItem',
            '.t1cal-day div[class*="thumbnail"]',
            '[data-t1-control-type="CalendarViewer"] .thumbnailItem',
            '.calendarViewer .thumbnailItem'
        ];
        
        let classElements = [];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            classElements = classElements.concat(Array.from(elements));
        });
        
        console.log(`Found ${classElements.length} class elements`);
        
        classElements.forEach((element, index) => {
            // Mark as processed
            element.setAttribute('data-popup-fix', 'true');
            element.classList.add('class-clickable');
            
            // Remove any existing click handlers and add ours
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
            
            newElement.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                
                console.log('Class clicked:', this);
                showClassDetailsPopup(this);
            });
        });
        
        // If no elements found, try again after a delay (calendar might load slowly)
        if (classElements.length === 0) {
            setTimeout(attachClassClickHandlers, 2000);
        }
    }
    
    function observeCalendarChanges() {
        // Watch for changes in the calendar container
        const calendarContainer = document.querySelector('.calendarViewer, .t1CalView, [data-t1-control-type="CalendarViewer"]');
        
        if (calendarContainer) {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.addedNodes.length > 0) {
                        setTimeout(attachClassClickHandlers, 100);
                    }
                });
            });
            
            observer.observe(calendarContainer, {
                childList: true,
                subtree: true
            });
        }
    }
    
    function showClassDetailsPopup(element) {
        const classInfo = extractClassInfoFromElement(element);
        const popup = document.getElementById('customClassPopup');
        const content = document.getElementById('customPopupContent');
        
        content.innerHTML = generatePopupHTML(classInfo);
        popup.style.display = 'block';
        
        // Add highlight effect
        element.style.boxShadow = '0 0 0 3px #1F497D';
        setTimeout(() => {
            element.style.boxShadow = '';
        }, 2000);
    }
    
    function extractClassInfoFromElement(element) {
        const text = element.textContent || '';
        const timeElement = element.querySelector('.eventTime');
        const timeText = timeElement ? timeElement.textContent.trim() : 'Time not available';
        
        // Extract course information
        let courseInfo = extractCourseInfo(text);
        
        // Get date from calendar position
        const dayElement = element.closest('[data-t1-day-number]');
        const dayNumber = dayElement ? dayElement.getAttribute('data-t1-day-number') : '0';
        const dateInfo = getDateInfo(dayNumber);
        
        // Check for conflicts
        const hasConflict = checkForScheduleConflict(dateInfo.day, timeText);
        
        return {
            ...courseInfo,
            ...dateInfo,
            time: timeText,
            duration: calculateDurationFromTime(timeText),
            hasConflict: hasConflict
        };
    }
    
    function extractCourseInfo(text) {
        const courses = {
            'ACCG2065': {
                name: 'Blockchain for Business',
                tutorialLocation: '6 Eastern Rd 308 Tutorial Rm 06EAR',
                lectureLocation: '29 Wallys Wlk T1 Theatre 29WW'
            },
            'MGMT1005': {
                name: 'Introduction to Global Business', 
                tutorialLocation: '11 Wallys Wlk 160 Tutorial Rm 11WW',
                lectureLocation: '11 Wallys Wlk 160 Tutorial Rm 11WW'
            },
            'ECON1020': {
                name: 'Economics and Business Strategy',
                tutorialLocation: '25 Wally\'s Walk, Bldg A Room 208 25WW',
                lectureLocation: 'Online Teaching ONLIN'
            },
            'ACST1001': {
                name: 'Finance Fundamentals',
                tutorialLocation: '6 Eastern Rd 308 Tutorial Rm 06EAR', 
                lectureLocation: '27 Wallys Wlk Lotus Theatre 27WW'
            }
        };
        
        for (const [code, info] of Object.entries(courses)) {
            if (text.includes(code)) {
                const isLecture = text.includes('Lecture');
                return {
                    courseCode: code,
                    courseName: info.name,
                    classType: isLecture ? 'Lecture' : 'Tutorial',
                    location: isLecture ? info.lectureLocation : info.tutorialLocation,
                    delivery: (code === 'ECON1020' && isLecture) ? 'Online' : 'In-person',
                    week: 'Week 8'
                };
            }
        }
        
        return {
            courseCode: 'UNKNOWN',
            courseName: 'Unknown Course',
            classType: 'Class',
            location: 'Location not available',
            delivery: 'In-person',
            week: 'Week 8'
        };
    }
    
    function getDateInfo(dayNumber) {
        const dateMap = {
            '1': { day: 'Monday', date: '15 September 2025' },
            '2': { day: 'Tuesday', date: '16 September 2025' },
            '3': { day: 'Wednesday', date: '17 September 2025' },
            '4': { day: 'Thursday', date: '18 September 2025' },
            '5': { day: 'Friday', date: '19 September 2025' },
            '6': { day: 'Saturday', date: '20 September 2025' },
            '0': { day: 'Sunday', date: '21 September 2025' }
        };
        
        return dateMap[dayNumber] || { day: 'Unknown', date: 'Date not available' };
    }
    
    function calculateDurationFromTime(timeText) {
        // Simple duration calculation from time string like "11:00am - 1:00pm"
        const match = timeText.match(/(\d+):(\d+)(am|pm)\s*-\s*(\d+):(\d+)(am|pm)/i);
        if (match) {
            return '2 hours'; // Simplified - you could add proper calculation
        }
        return 'Duration not specified';
    }
    
    function checkForScheduleConflict(day, time) {
        // Check for the known Thursday conflict
        return day === 'Thursday' && time.includes('11:00');
    }
    
    function generatePopupHTML(info) {
        const conflictWarning = info.hasConflict ? `
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px; margin: 15px 0; display: flex; align-items: center;">
                <span style="font-size: 16px; margin-right: 8px;">⚠️</span>
                <div>
                    <strong style="color: #856404;">Schedule Conflict</strong>
                    <div style="font-size: 12px; color: #856404; margin-top: 4px;">
                        This class overlaps with another scheduled class
                    </div>
                </div>
            </div>
        ` : '';
        
        const deliveryIcon = info.delivery === 'Online' ? '🌐' : '🏫';
        
        return `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <div style="background: #e3f2fd; border-radius: 6px; padding: 8px 12px; margin-right: 10px;">
                        <span style="font-weight: bold; color: #1F497D; font-size: 12px;">${info.courseCode}</span>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 4px 0; color: #1F497D; font-size: 16px;">${info.courseName}</h4>
                        <div style="font-size: 12px; color: #666;">
                            ${info.classType} • ${deliveryIcon} ${info.delivery}
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="background: #f8f9fa; border-radius: 6px; padding: 15px; margin-bottom: 15px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                    <div>
                        <strong>📅 Date:</strong><br>
                        ${info.day}<br>
                        <span style="color: #666;">${info.date}</span>
                    </div>
                    <div>
                        <strong>⏰ Time:</strong><br>
                        ${info.time}<br>
                        <span style="color: #666;">${info.duration}</span>
                    </div>
                    <div>
                        <strong>📍 Location:</strong><br>
                        ${info.location}
                    </div>
                    <div>
                        <strong>📚 Week:</strong><br>
                        ${info.week}
                    </div>
                </div>
            </div>
            
            ${conflictWarning}
            
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="document.getElementById('customClassPopup').style.display='none'" 
                        style="background: #1F497D; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: background 0.2s;">
                    Close Details
                </button>
            </div>
        `;
    }
    
    // Make available globally for debugging
    window.classPopupFix = {
        version: '1.0',
        refresh: attachClassClickHandlers,
        showDebug: function() {
            console.log('Class Popup Fix Debug Info:');
            console.log('Popup element:', document.getElementById('customClassPopup'));
            console.log('Class elements found:', document.querySelectorAll('.class-clickable').length);
        }
    };
    
})();