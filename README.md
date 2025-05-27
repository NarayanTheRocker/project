# Naru - Your AI Personal Assistant

Naru is a Flask-based AI personal assistant designed to be a supportive, sarcastic, and helpful companion, like a big brother. It can provide weather updates, movie recommendations, engage in general conversation, and even offer fashion advice based on the current temperature. Naru communicates with a touch of Indian personality and humor, and can respond with voice in either male or female Indian English accents.

## Features

* **Conversational AI:** Powered by the Groq LLaMA 3 70b model for natural and engaging interactions.
* **Voice Interaction:**
    * **Text-to-Speech (TTS):** Responds with voice output using Microsoft Edge TTS, offering selectable male (`en-IN-PrabhatNeural`) or female (`en-IN-NeerjaNeural`) Indian English voices.
    * **Speech-to-Text (STT):** Accepts voice input, which is processed using Google Speech Recognition.
* **Weather Updates:** Fetches and provides current weather conditions, temperature (current, min/max), and chance of precipitation using the Open-Meteo API.
* **Movie Recommendations:** Suggests movies based on user queries using The Movie Database (TMDB) API.
* **Fashion Suggestions:** Offers clothing recommendations based on the current temperature.
* **Persistent Memory:** Remembers the conversation history (stored in `memory.json`) to maintain context.
* **Personalized Persona:** Naru has a distinct personality – a supportive, caring, sarcastic big brother who speaks with an Indian flair.
* **Web Interface:** Basic web UI (via `index.html`) for interaction (though the HTML content is not provided in the script, it's implied).
* **Contextual Awareness:** Uses current time and weather data to provide more relevant responses.

## Why These Technologies?

* **Flask:** A lightweight and flexible Python web framework, suitable for building the web server that handles requests and responses.
* **Groq:** Provides access to fast and powerful Large Language Models (LLMs) like LLaMA 3, which is the core of Naru's conversational abilities.
* **Requests:** A simple and elegant Python library for making HTTP requests to external APIs (Open-Meteo, TMDB).
* **SpeechRecognition:** A library for performing speech recognition, with support for various engines and APIs, including Google Speech Recognition.
* **Edge-TTS:** A Python interface for Microsoft Edge's online text-to-speech service, enabling high-quality voice generation.
* **Pydub:** Used for audio manipulation, specifically to convert WebM audio (common from web browsers) to WAV format for the SpeechRecognition library.
* **Asyncio:** Enables asynchronous programming, crucial for handling TTS generation without blocking the server, ensuring smoother user experience.
* **Dotenv:** Manages environment variables, allowing sensitive API keys to be stored securely outside the main codebase.
* **JSON:** Used for data interchange, particularly for storing conversation memory and parsing API responses.

## Project Structure

* `app.py`: The main Flask application file containing the core logic, API integrations, and route definitions.
* `memory.json`: Stores the conversation history between the user and Naru. Automatically created if it doesn't exist.
* `templates/index.html`: (Assumed) The HTML file for the user interface.
* `.env`: (User-created) Stores API keys for Groq and TMDB.

## Setup and Installation

1.  **Clone the Repository (if applicable) or download the files.**

2.  **Create a Python Virtual Environment (Recommended):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install Dependencies:**
    Create a `requirements.txt` file with the following content:
    ```txt
    flask
    requests
    groq
    SpeechRecognition
    edge-tts
    pydub
    python-dotenv
    # Add any other specific versions if needed, e.g., flask==2.1.0
    ```
    Then install them:
    ```bash
    pip install -r requirements.txt
    ```
    You might also need to install `ffmpeg` for `pydub` to work correctly with various audio formats.
    * **On Ubuntu/Debian:** `sudo apt-get install ffmpeg`
    * **On macOS (using Homebrew):** `brew install ffmpeg`
    * **On Windows:** Download ffmpeg binaries and add them to your system's PATH.

4.  **Create a `.env` file:**
    In the root directory of the project, create a file named `.env` and add your API keys:
    ```env
    GROQ_API_KEY="YOUR_GROQ_API_KEY"
    TMDB_API_KEY="YOUR_TMDB_API_KEY"
    ```
    * Replace `YOUR_GROQ_API_KEY` with your actual API key from [GroqCloud](https://console.groq.com/keys).
    * Replace `YOUR_TMDB_API_KEY` with your actual API key from [The Movie Database (TMDB)](https://www.themoviedb.org/settings/api).

5.  **Configure Latitude and Longitude (Optional):**
    In `app.py`, update the `LATITUDE` and `LONGITUDE` constants with your desired location for accurate weather information:
    ```python
    LATITUDE = 17.6868 # Replace with your actual latitude
    LONGITUDE = 83.2185 # Replace with your actual longitude
    ```

## Running the Application

1.  **Ensure your virtual environment is activated.**
2.  **Run the Flask app:**
    ```bash
    python app.py
    ```
3.  The application will start, and you should see output similar to:
    ```
    Starting Flask app...
    Ensure 'memory.json' exists (or will be created).
    Ensure .env file is present with API keys (GROQ_API_KEY, TMDB_API_KEY).
     * Serving Flask app 'app'
     * Debug mode: on
    WARNING: This is a development server. Do not use it in a production deployment.
    Use a production WSGI server instead.
     * Running on [http://127.0.0.1:5000](http://127.0.0.1:5000)  # Or possibly [http://0.0.0.0:5000](http://0.0.0.0:5000) for network access
    Press CTRL+C to quit
    ```
4.  **Open your web browser** and navigate to `http://127.0.0.1:5000` (or the address shown in your terminal).

## How It Works

1.  The user interacts with Naru through a web page (`index.html`). Input can be text or voice.
2.  If voice input is used, the browser records audio (likely in WebM format) and sends it to the `/voice_input` Flask endpoint.
3.  The `recognize_audio_data` function converts the audio to WAV, then uses `SpeechRecognition` (Google) to transcribe it to text.
4.  For text input, the message is sent directly to the `/chat` endpoint.
5.  Both endpoints gather context:
    * Current time.
    * Current weather data (fetched via `get_weather()`).
    * The assistant's character profile (`get_character_profile()`).
    * Conversation history (loaded via `load_memory()`).
6.  This context, along with the user's message, is formatted into a prompt and sent to the Groq API (`client.chat.completions.create`).
7.  Groq's LLM generates a text response based on the prompt and its training.
8.  The AI's text response is saved to the conversation history.
9.  The `generate_speech_data` function uses `edge-tts` to convert the AI's text response into speech (MP3 audio data), considering the user's preferred voice gender (male/female).
10. The Flask app streams this audio data back to the browser, along with the text response in a custom header (`X-Response-Text`), allowing the UI to play the audio and display the text.
11. Error handling is in place for API failures, TTS issues, and STT problems, attempting to provide a spoken error message if possible.

This assistant integrates various services to provide a rich, interactive, and personalized experience.
