document.addEventListener('DOMContentLoaded', () => {
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const inputModeSelect = document.getElementById('input-mode');
    const voiceGenderSelect = document.getElementById('voice-gender');
    const statusDiv = document.getElementById('status');
    const audioPlayer = document.getElementById('audio-player');
    const recordButton = document.getElementById('record-button');
    const introSection = document.getElementById('intro-section');
    const startChatButton = document.getElementById('start-chat-button');
    const inputArea = document.querySelector('.input-area');
    const closedCaptions = document.getElementById('closed-captions');
    const clearChatButton = document.getElementById('clear-chat-button'); // Added clear chat button

    let isInitialLoad = true;
    let mediaRecorder;
    let audioChunks = [];

    // Check if intro has been seen
    const introSeen = localStorage.getItem('introSeen');

    if (introSeen) {
        introSection.style.display = 'none';
        chatHistory.style.display = 'block';
        inputArea.style.display = 'flex';
        // Load chat history on page load
        const storedHistory = localStorage.getItem('chatHistory');
        if (storedHistory) {
            const history = JSON.parse(storedHistory);
            history.forEach(message => {
                addMessage(message.content, message.sender);
            });
        }
    } else {
        // Show intro
        introSection.style.display = 'block';
        chatHistory.style.display = 'none';
        inputArea.style.display = 'none';
    }

    function saveChatHistory() {
        let messages = Array.from(chatHistory.querySelectorAll('.message')).map(messageDiv => {
            return {
                content: messageDiv.textContent,
                sender: messageDiv.classList.contains('user-message') ? 'user' : 'assistant',
                timestamp: Date.now()
            };
        });

        try {
            localStorage.setItem('chatHistory', JSON.stringify(messages));
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.error('Local storage quota exceeded! Clearing older messages.');
                alert('Local storage is full. Clearing older messages.');
                clearOldMessages();
                saveChatHistory();
            } else {
                console.error('Error storing data:', error);
            }
        }
    }

    function clearOldMessages() {
        let messages = JSON.parse(localStorage.getItem('chatHistory')) || [];

        messages.sort((a, b) => a.timestamp - b.timestamp);

        while (messages.length > 0) {
            messages.shift();
            try {
                localStorage.setItem('chatHistory', JSON.stringify(messages));
                return;
            } catch (innerError) {
                console.error("still full, clearing more messages");
            }
        }

        chatHistory.innerHTML = "";
        localStorage.setItem('chatHistory', JSON.stringify([]));

    }

    // --- Start Chat Button ---
    startChatButton.addEventListener('click', () => {
        introSection.style.display = 'none';
        chatHistory.style.display = 'block';
        inputArea.style.display = 'flex';
        addMessage("Or bhai kesa h kya chal rha h?", 'assistant');
        statusDiv.textContent = 'Ready';
        localStorage.setItem('introSeen', 'true');
        clearChatButton.style.display = 'block'; // Show the button when chat starts
    });

    function addMessage(text, sender) {
        console.log(`Attempting to add message: "${text}" from sender: ${sender}`); // <-- ADD THIS
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'assistant-message');
        messageDiv.textContent = text;
    
        // Check if chatHistory exists before appending
        if (chatHistory) {
             console.log('Appending to chatHistory:', chatHistory); // <-- ADD THIS
             chatHistory.appendChild(messageDiv);
             chatHistory.scrollTo({ top: chatHistory.scrollHeight, behavior: 'smooth' });
             saveChatHistory(); // Consider if errors here could mask the display issue
        } else {
             console.error('Error: chatHistory element not found!'); // <-- ADD THIS
        }
    
        if (sender === 'assistant') {
            // Any logic specific to assistant messages
        }
    
        if (isInitialLoad && sender === 'assistant') {
            isInitialLoad = false;
        }
    }

    // --- UI Mode Switching ---
    inputModeSelect.addEventListener('change', () => {
        toggleInputMode(inputModeSelect.value);
    });

    function toggleInputMode(mode) {
        if (mode === 'voice') {
            userInput.style.display = 'none';
            sendButton.style.display = 'none';
            recordButton.style.display = 'flex';
            statusDiv.textContent = 'Voice mode. Click mic to record.';
            console.log("Switched to Voice Mode");
        } else {
            userInput.style.display = 'block';
            sendButton.style.display = 'flex';
            recordButton.style.display = 'none';
            statusDiv.textContent = 'Text mode. Type your message.';
            console.log("Switched to Text Mode");
            stopRecording();
        }
    }

    toggleInputMode(inputModeSelect.value);

    // --- Sending Text Messages ---
    async function sendTextMessage(event) {
        if (event) {
            event.preventDefault();
        }
        const text = userInput.value.trim();
        if (!text) return;
        console.log('User input captured:', text);
        addMessage(text, 'user');
        userInput.value = '';
        statusDiv.textContent = 'Bhai is thinking...';

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: text,
                    input_mode: 'text',
                    voice_gender: voiceGenderSelect.value,
                }),
            });
            handleResponse(response);
        } catch (error) {
            console.error('Error sending message:', error);
            addMessage(`Network Error: ${error.message}. Check the console.`, 'assistant');
            statusDiv.textContent = 'Error';
        }
    }

    async function handleResponse(response) {
        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {}
            throw new Error(errorMsg);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("audio/mpeg")) {
            statusDiv.textContent = 'Processing audio...';
            const responseTextHeader = response.headers.get('X-Response-Text');
            let displayText = responseTextHeader ? decodeURIComponent(responseTextHeader) : '';
            addMessage(displayText, 'assistant');
            const audioBlob = await response.blob();
            playAudio(audioBlob);
        } else if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            addMessage(data.response_text || data.error || "Received JSON, but no text found.", 'assistant');
            statusDiv.textContent = 'Ready';
        } else {
            const textResponse = await response.text();
            addMessage(`Received unexpected response: ${textResponse}`, 'assistant');
            statusDiv.textContent = 'Ready';
        }
    }

    function playAudio(audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayer.src = audioUrl;
        statusDiv.textContent = 'Playing audio...';
        audioPlayer.play().catch(e => {
            console.error("Error attempting to play audio:", e);
            statusDiv.textContent = 'Error playing audio.';
            URL.revokeObjectURL(audioUrl);
        });
        audioPlayer.onended = () => {
            statusDiv.textContent = 'Ready';
            URL.revokeObjectURL(audioUrl);
        };
        audioPlayer.onerror = (e) => {
            console.error("Audio playback error:", e);
            statusDiv.textContent = 'Error playing audio.';
            URL.revokeObjectURL(audioUrl);
        };
    }

    sendButton.addEventListener('click', sendTextMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendTextMessage(event);
        }
    });

    recordButton.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            stopRecording();
        } else {
            startRecording();
        }
    });

 async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = []; // Reset chunks

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                recordButton.classList.remove('recording');
                recordButton.innerHTML = '<i class="fa-solid fa-microphone"></i>'; // Reset icon
                statusDiv.textContent = 'Processing voice...';

                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // Use webm or opus typically
                audioChunks = []; // Clear for next time

                // --- Send the recorded audio ---
                const formData = new FormData();
                formData.append('audio_data', audioBlob, 'voice_input.webm'); // Filename is helpful
                formData.append('voice_gender', voiceGenderSelect.value);

                try {
                    const response = await fetch('/voice_input', { // Send to the dedicated voice endpoint
                        method: 'POST',
                        body: formData
                    });
                    handleResponse(response); // Use the same handler
                } catch (error) {
                     console.error('Error sending voice input:', error);
                     addMessage(`Network Error during voice sending: ${error.message}.`, 'assistant');
                     statusDiv.textContent = 'Error';
                } finally {
                     // Clean up the stream tracks
                     stream.getTracks().forEach(track => track.stop());
                }
            };

            mediaRecorder.start();
            recordButton.classList.add('recording'); // Add visual indicator
            recordButton.innerHTML = '<i class="fa-solid fa-stop"></i>'; // Change icon to stop
            statusDiv.textContent = 'Recording... Click Stop or wait.';

             // Optional: Automatically stop after a timeout
             // setTimeout(stopRecording, 10000); // Stop after 10 seconds

        } catch (err) {
            console.error("Error accessing microphone:", err);
            statusDiv.textContent = 'Microphone access denied or error.';
            addMessage(`Error: Could not access microphone. ${err.message}`, 'assistant');
            recordButton.classList.remove('recording'); // Ensure class is removed
            recordButton.innerHTML = '<i class="fa-solid fa-microphone"></i>';
        }
    }

    function stopRecording() {
         if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop(); // This will trigger the 'onstop' event handler
            // The rest is handled in 'onstop'
        }
         // Ensure stream tracks are stopped even if recorder wasn't active but button state was weird
        // This requires the stream variable to be accessible, might need refactoring if not.
    }


    // --- Initial Assistant Message ---
    addMessage("Or bhai kesa h kya chal rha h?", 'assistant');
    statusDiv.textContent = 'Ready';


    // Clear Chat Functionality
    clearChatButton.addEventListener('click', () => {
        localStorage.removeItem('chatHistory');
        chatHistory.innerHTML = '';
        introSection.style.display = 'block';
        chatHistory.style.display = 'none';
        inputArea.style.display = 'none';
        localStorage.removeItem('introSeen');
        clearChatButton.style.display = 'none'; // Hide the button when intro is shown
    });


    if (!localStorage.getItem('introSeen')) {
        clearChatButton.style.display = 'none';
    } else {
        clearChatButton.style.display = 'block';
    }
});