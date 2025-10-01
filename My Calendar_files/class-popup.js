// Add click event listeners to class sessions
document.addEventListener('DOMContentLoaded', function() {
    // Function to handle class session clicks
    function setupClassClickEvents() {
        // Select all class session elements - adjust selector based on your actual class structure
        const classSessions = document.querySelectorAll('.thumbnailItem, .t1cal-day .itemWrapper, [class*="tutorial"], [class*="lecture"]');
        
        classSessions.forEach(session => {
            // Remove existing click listeners to avoid duplicates
            session.removeEventListener('click', handleClassClick);
            // Add click listener
            session.addEventListener('click', handleClassClick);
        });
    }

    // Handle class click event
    function handleClassClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Get class details from the clicked element
        const classElement = event.currentTarget;
        const classDetails = extractClassDetails(classElement);
        
        // Show popup with class details
        showClassPopup(classDetails);
    }

    // Extract class details from the element
    function extractClassDetails(element) {
        // Try to find class name, time, and other details
        // Adjust these selectors based on your actual HTML structure
        const classNameElement = element.querySelector('.editorField span, [title*="Tutorial"], [title*="Lecture"]');
        const timeElement = element.querySelector('.eventTime');
        
        const className = classNameElement ? 
            (classNameElement.textContent || classNameElement.getAttribute('title') || 'Unknown Class') : 
            'Unknown Class';
            
        const classTime = timeElement ? timeElement.textContent : 'Time not specified';
        
        // You can extract more details here based on your HTML structure
        return {
            name: className,
            time: classTime,
            // Add more properties as needed
            location: 'To be determined', // You might need to add this data to your HTML
            instructor: 'To be determined' // You might need to add this data to your HTML
        };
    }

    // Show popup with class details
    function showClassPopup(classDetails) {
        // Remove existing popup if any
        removeExistingPopup();
        
        // Create popup element
        const popup = document.createElement('div');
        popup.className = 'class-details-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <h3>Class Details</h3>
                    <span class="close-popup">&times;</span>
                </div>
                <div class="popup-body">
                    <div class="class-info">
                        <p><strong>Class:</strong> ${classDetails.name}</p>
                        <p><strong>Time:</strong> ${classDetails.time}</p>
                        <p><strong>Location:</strong> ${classDetails.location}</p>
                        <p><strong>Instructor:</strong> ${classDetails.instructor}</p>
                    </div>
                </div>
            </div>
            <div class="popup-overlay"></div>
        `;
        
        // Add to document
        document.body.appendChild(popup);
        
        // Add close functionality
        const closeBtn = popup.querySelector('.close-popup');
        const overlay = popup.querySelector('.popup-overlay');
        
        closeBtn.addEventListener('click', removeExistingPopup);
        overlay.addEventListener('click', removeExistingPopup);
        
        // Add escape key functionality
        document.addEventListener('keydown', handleEscapeKey);
    }

    // Remove existing popup
    function removeExistingPopup() {
        const existingPopup = document.querySelector('.class-details-popup');
        if (existingPopup) {
            existingPopup.remove();
            document.removeEventListener('keydown', handleEscapeKey);
        }
    }

    // Handle escape key
    function handleEscapeKey(event) {
        if (event.key === 'Escape') {
            removeExistingPopup();
        }
    }

    // Initialize click events
    setupClassClickEvents();
    
    // Since your calendar might be dynamically loaded, set up a mutation observer
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                setupClassClickEvents();
            }
        });
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});