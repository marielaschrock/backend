// --- Existing Countdown Timer Logic ---
const Days = document.getElementById('days');
const Hours = document.getElementById('hours');
const Minutes = document.getElementById('minutes');
const Seconds = document.getElementById('seconds');

// Set your target date for the countdown
const targetDate = new Date("November 17 2025 00:00:00").getTime();

function timer() {
    const currentDate = new Date().getTime();
    const distance = targetDate - currentDate;

    // Calculate time units
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Display the results in the elements
    if (Days) Days.innerHTML = days < 10 ? '0' + days : days;
    if (Hours) Hours.innerHTML = hours < 10 ? '0' + hours : hours;
    if (Minutes) Minutes.innerHTML = minutes < 10 ? '0' + minutes : minutes;
    if (Seconds) Seconds.innerHTML = seconds < 10 ? '0' + seconds : seconds;

    // If the countdown is over, display a message
    if (distance < 0) {
        clearInterval(x); // Stop the timer (assuming 'x' is your interval variable)
        if (Days) Days.innerHTML = "00";
        if (Hours) Hours.innerHTML = "00";
        if (Minutes) Minutes.innerHTML = "00";
        if (Seconds) Seconds.innerHTML = "00";
        const messageElement = document.getElementById('countdown-message');
        if (messageElement) {
            messageElement.innerHTML = "Baby Monckton is here!";
        }
    }
}

// Update the countdown every 1 second
const x = setInterval(timer, 1000);
// Initial call to display immediately
timer();


// --- New Poll Functionality Logic (Backend Integrated) ---
// This ensures poll logic only runs on polls.html where poll-form exists
if (document.getElementById('poll-form')) {
    // Socket.IO client connection
    const socket = io(window.location.origin); // Connects to the same host that served the page

    const pollForm = document.getElementById('poll-form');
    const globalNameInput = document.getElementById('global-voter-name');

    // Helper function to render poll results based on data from the backend
    const renderPoll = (pollData) => {
        const pollQuestionDiv = document.querySelector(`.poll-question[data-poll-name="${pollData.name}"]`);
        if (!pollQuestionDiv) {
            console.warn(`Poll question div not found for ${pollData.name}`);
            return;
        }

        let totalVotes = 0;
        for (const option in pollData.counts) {
            totalVotes += pollData.counts[option];
        }

        // Update vote counts and percentages for radio button polls
        if (pollData.name !== 'babyWeight' && pollData.name !== 'deliveryDateTime') {
            for (const option in pollData.counts) {
                const percentage = totalVotes > 0 ? ((pollData.counts[option] / totalVotes) * 100).toFixed(1) : 0;
                const pollBar = pollQuestionDiv.querySelector(`.poll-bar[data-option="${option}"]`);
                if (pollBar) {
                    pollBar.style.width = `${percentage}%`;
                }
                const pollLabel = pollQuestionDiv.querySelector(`.poll-label[data-option="${option}"]`);
                if (pollLabel) {
                    // Update the text content of the label to include both option and percentage
                    pollLabel.textContent = `${option}: ${percentage}%`;
                }
            }
        }

        // Update voter records
        const voterRecordsUl = pollQuestionDiv.querySelector('.voter-records ul');
        if (voterRecordsUl) {
            voterRecordsUl.innerHTML = ''; // Clear previous records
            if (pollData.voterRecords) {
                // Sort voter names alphabetically for consistent display
                const sortedVoterNames = Object.keys(pollData.voterRecords).sort();
                sortedVoterNames.forEach(voterName => {
                    const voterChoice = pollData.voterRecords[voterName];
                    const listItem = document.createElement('li');
                    listItem.textContent = `${voterName}: ${voterChoice}`;
                    voterRecordsUl.appendChild(listItem);
                });
                // Show voter records section if there are records
                const voterRecordsDiv = pollQuestionDiv.querySelector('.voter-records');
                if (voterRecordsDiv) {
                    voterRecordsDiv.style.display = sortedVoterNames.length > 0 ? 'block' : 'none';
                }
            }
        }

        // Check if the current user (based on globalNameInput) has voted
        const currentVoterName = globalNameInput ? globalNameInput.value.trim() : '';
        const submitButton = pollQuestionDiv.querySelector(`.polls-button[data-poll="${pollData.name}"]`);

        if (currentVoterName && pollData.voterRecords && pollData.voterRecords[currentVoterName]) {
            // User has voted: Disable inputs and button, show 'Bet Placed!'
            const inputs = pollQuestionDiv.querySelectorAll('input[type="radio"], input[type="text"], input[type="datetime-local"]');
            inputs.forEach(input => {
                input.disabled = true;
                if (input.type === 'radio' && input.value === pollData.voterRecords[currentVoterName]) {
                    input.checked = true; // Select their voted option
                }
            });
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Bet Placed!';
                submitButton.style.backgroundColor = '#333';
                submitButton.style.borderColor = '#666';
                submitButton.style.boxShadow = 'none';
            }
            // For text/datetime inputs, display the value they voted for
            const textInput = pollQuestionDiv.querySelector('input[type="text"]');
            if (textInput) textInput.value = pollData.voterRecords[currentVoterName] || '';
            const datetimeInput = pollQuestionDiv.querySelector('input[type="datetime-local"]');
            if (datetimeInput) datetimeInput.value = pollData.voterRecords[currentVoterName] || '';

        } else {
            // User has NOT voted: Enable inputs and button, clear text inputs
            const inputs = pollQuestionDiv.querySelectorAll('input[type="radio"], input[type="text"], input[type="datetime-local"]');
            inputs.forEach(input => {
                input.disabled = false;
                if (input.type === 'radio') {
                    input.checked = false; // Uncheck all radio buttons
                }
            });
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Place Bet';
                submitButton.style.backgroundColor = '#006400';
                submitButton.style.borderColor = '#FFD700';
                submitButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
            }
            // For text/datetime inputs, clear if user hasn't voted
            const textInput = pollQuestionDiv.querySelector('input[type="text"]');
            if (textInput) textInput.value = '';
            const datetimeInput = pollQuestionDiv.querySelector('input[type="datetime-local"]');
            if (datetimeInput) datetimeInput.value = '';
        }
    };


    // Load all polls from the backend on page load
    const loadAllPolls = async () => {
        try {
            const response = await fetch('/api/polls'); // Use relative path
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const polls = await response.json();
            polls.forEach(poll => renderPoll(poll));
        } catch (error) {
            console.error('Error loading polls:', error);
            // This section attempts to create polls if the backend doesn't return any,
            // useful for initial setup when the DB is empty.
            const pollNamesToInitialize = ['gender', 'strictParent', 'stinkier', 'funAuntie', 'color', 'babyWeight', 'deliveryDateTime'];
            for (const name of pollNamesToInitialize) {
                try {
                    await fetch('/api/polls', { // Use relative path
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name })
                    });
                    console.log(`Initialized poll: ${name}`);
                } catch (createError) {
                    // console.warn(`Poll ${name} might already exist or failed to create:`, createError);
                    // This is expected if polls already exist in DB
                }
            }
            // After attempting to create, try loading again to display them
            if (pollNamesToInitialize.length > 0) {
                 const responseAfterInit = await fetch('/api/polls');
                 if (responseAfterInit.ok) {
                    const pollsAfterInit = await responseAfterInit.json();
                    pollsAfterInit.forEach(poll => renderPoll(poll));
                 }
            }
        }
    };

    // Initial load of all polls when the page loads
    loadAllPolls();

    // Event listener for the global name input field
    // When the name changes, re-render all polls to update voting status (disable/enable buttons)
    globalNameInput.addEventListener('input', () => {
        document.querySelectorAll('.poll-question').forEach(pollDiv => {
            const pollName = pollDiv.dataset.pollName;
            // Fetch the specific poll to get the latest voter records for status check
            fetch(`/api/polls/${pollName}`) // Use relative path
                .then(response => response.json())
                .then(pollData => renderPoll(pollData))
                .catch(error => console.error(`Error re-rendering poll ${pollName}:`, error));
        });
    });

    // Event listener for form submission (voting)
    pollForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        const clickedButton = event.submitter;
        if (!clickedButton || !clickedButton.classList.contains('polls-button')) {
            return; // Only proceed if a poll button was clicked
        }

        const pollName = clickedButton.dataset.poll;
        if (!pollName) {
            console.error('Poll name not found for the submitted button.');
            return;
        }

        const voterName = globalNameInput ? globalNameInput.value.trim() : '';

        if (voterName === '') {
            alert('Please enter your name in the field above before placing any bet!');
            return;
        }

        const pollQuestionDiv = document.querySelector(`.poll-question[data-poll-name="${pollName}"]`);
        let option = null; // This will hold the selected option or input value

        // Determine the option based on poll type (radio, text, datetime)
        const pollInputText = pollQuestionDiv.querySelector('input[type="text"]');
        const pollInputDateTime = pollQuestionDiv.querySelector('input[type="datetime-local"]');

        if (pollName === 'babyWeight' && pollInputText) {
            option = pollInputText.value.trim();
        } else if (pollName === 'deliveryDateTime' && pollInputDateTime) {
            option = pollInputDateTime.value.trim();
        } else {
            const selectedOption = pollQuestionDiv.querySelector(`input[name="${pollName}"]:checked`);
            if (selectedOption) {
                option = selectedOption.value;
            }
        }

        if (option === null || option === '') {
            alert('Please select an option or enter your bet before placing it!');
            return;
        }

        try {
            const response = await fetch(`/api/polls/${pollName}/vote`, { // Use relative path
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ option, voterName })
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(errorData.message);
                // Reload poll data to ensure consistency after an error (e.g., already voted)
                fetch(`/api/polls/${pollName}`) // Use relative path
                    .then(res => res.json())
                    .then(data => renderPoll(data))
                    .catch(err => console.error('Error reloading poll after vote attempt:', err));
                return;
            }

            // The renderPoll function will be called by the socket.io listener when the backend
            // emits 'pollUpdate', ensuring all clients update simultaneously.
            // No need to call renderPoll directly here after a successful vote.

        } catch (error) {
            console.error('Error submitting vote:', error);
            alert('An error occurred while submitting your bet. Please try again.');
        }
    });

    // Listen for real-time poll updates from the backend via Socket.IO
    socket.on('pollUpdate', (updatedPoll) => {
        console.log('Received real-time update for poll:', updatedPoll.name);
        renderPoll(updatedPoll); // Re-render the specific poll that was updated
    });
}