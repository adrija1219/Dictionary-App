const themeToggle = document.getElementById('themeToggle');
const body = document.documentElement;
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultContainer = document.getElementById('resultContainer');
const voiceBtn = document.getElementById('voiceBtn');

// 1. Toggle Theme
themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    body.setAttribute('data-theme', newTheme);
});

// 2. Fetch Data from API
async function getDefinition(word) {
    if (!word) return;
    resultContainer.innerHTML = "<p class='placeholder-text'>Searching...</p>";
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (!response.ok) throw new Error("Word not found");
        const data = await response.json();
        renderResult(data[0]);
    } catch (error) {
        resultContainer.innerHTML = `<p style="color:red; text-align:center;">Word not found. Try another one!</p>`;
    }
}

// 3. Render Result to UI
function renderResult(data) {
    const word = data.word;
    const bookmarks = JSON.parse(localStorage.getItem('defineX_bookmarks')) || [];
    const isBookmarked = bookmarks.includes(word);
    const partOfSpeech = data.meanings[0].partOfSpeech;
    const definition = data.meanings[0].definitions[0].definition;
    const phonetic = data.phonetic || "";
    
    // FIND EXAMPLE: Loop through meanings to find the first definition that has an example
    let foundExample = "";
    for (let meaning of data.meanings) {
        for (let def of meaning.definitions) {
            if (def.example) {
                foundExample = def.example;
                break;
            }
        }
        if (foundExample) break;
    }
    

    // Audio Logic
    const audioSrc = data.phonetics.find(p => p.audio !== "")?.audio;

    resultContainer.innerHTML = `
        <div class="result-card">
            <div class="word-header" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2 style="font-size: 2rem; text-transform: capitalize;">${data.word}</h2>
                    <p class="phonetics" style="color: var(--accent); font-weight: bold;">${phonetic}</p>
                </div>
                ${audioSrc ? `<button class="audio-btn" onclick="new Audio('${audioSrc}').play()" style="background: var(--accent); color: white; border: none; padding: 10px 15px; border-radius: 50%; cursor: pointer;"><i class="fas fa-volume-up"></i></button>` : ''}
            </div>
            <p style="margin-top: 15px;"><strong>${partOfSpeech}</strong></p>
            <p style="margin: 10px 0; line-height: 1.6;">${definition}</p>
            
            ${foundExample ? 
                `<p style="color: gray; border-left: 3px solid var(--accent); padding-left: 10px; font-style: italic; margin-top: 15px;">
                    "${foundExample}"
                </p>` : 
                `<p style="color: gray; font-size: 0.9rem; margin-top: 15px;">(No example available for this word)</p>`
            }
        </div>
        <div class="result-card">
            <div class="word-header" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2 style="font-size: 2rem; text-transform: capitalize;">${word}</h2>
                    <p class="phonetics" style="color: var(--accent); font-weight: bold;">${data.phonetic || ""}</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="bookmark-btn" onclick="toggleBookmark('${word}')" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--accent);">
                        <i class="${isBookmarked ? 'fas' : 'far'} fa-bookmark"></i>
                    </button>
                    ${audioSrc ? `<button class="audio-btn" onclick="new Audio('${audioSrc}').play()" ...>` : ''}
                </div>
            </div>
            
        </div>
    `;
}
// Global Audio Player Function
function playAudio(url) {
    const audio = new Audio(url);
    audio.play();
}

// 4. Voice Search (Web Speech API)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();

    voiceBtn.addEventListener('click', () => {
        try {
            recognition.start();
            voiceBtn.style.color = "red";
            searchInput.placeholder = "Listening...";
        } catch (e) {
            console.log("Recognition already active");
        }
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        searchInput.value = transcript;
        getDefinition(transcript);
        voiceBtn.style.color = "inherit";
        searchInput.placeholder = "Search any word...";
    };

    recognition.onerror = () => {
        voiceBtn.style.color = "inherit";
        searchInput.placeholder = "Search any word...";
    };

    recognition.onend = () => {
        voiceBtn.style.color = "inherit";
    };
} else {
    voiceBtn.style.display = "none"; // Hide if browser doesn't support speech
}

// Event Listeners
searchBtn.addEventListener('click', () => getDefinition(searchInput.value));
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') getDefinition(searchInput.value);
});

// --- NEW SELECTORS FOR HISTORY ---
const menuItems = document.querySelectorAll('.menu-item');
const searchSection = document.querySelector('.search-section');
const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');

// --- 1. HISTORY MANAGEMENT LOGIC ---

// Save word to LocalStorage
function saveSearch(word) {
    if (!word) return;
    let history = JSON.parse(localStorage.getItem('defineX_history')) || [];
    
    // Remove duplicate if it exists (so it moves to the top)
    history = history.filter(item => item.word.toLowerCase() !== word.toLowerCase());
    
    // Add to the beginning of the array
    history.unshift({
        word: word,
        timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    });

    // Limit history to 20 items
    if (history.length > 20) history.pop();

    localStorage.setItem('defineX_history', JSON.stringify(history));
}

// Display history items in the UI
function displayHistory() {
    const history = JSON.parse(localStorage.getItem('defineX_history')) || [];
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<p class="placeholder-text">Your search history is empty.</p>';
        return;
    }

    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <span class="word">${item.word}</span>
            <span class="timestamp">${item.timestamp}</span>
        `;
        
        // Clicking a history item searches for it again
        historyItem.addEventListener('click', () => {
            searchInput.value = item.word;
            showSection('search');
            getDefinition(item.word);
        });
        
        historyList.appendChild(historyItem);
    });
}

// --- 2. NAVIGATION LOGIC ---

function showSection(target) {
    if (target === 'history') {
        searchSection.style.display = 'none';
        resultContainer.style.display = 'none';
        historySection.style.display = 'block';
    } else {
        searchSection.style.display = 'block';
        resultContainer.style.display = 'block';
        historySection.style.display = 'none';
    }
}

menuItems.forEach(item => {
    item.addEventListener('click', () => {
        // UI Active Class Toggle
        menuItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Toggle visibility based on menu text
        if (item.innerText.trim().includes('History')) {
            showSection('history');
            displayHistory();
        } else if (item.innerText.trim().includes('Search')) {
            showSection('search');
        }
    });
});

// Clear History Button
clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('defineX_history');
    displayHistory();
});


// --- 3. MODIFIED SEARCH LOGIC ---
// Update your existing getDefinition to include saveSearch(word)

async function getDefinition(word) {
    if (!word) return;
    resultContainer.innerHTML = "<p class='placeholder-text'>Searching...</p>";
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (!response.ok) throw new Error("Word not found");
        const data = await response.json();
        
        // SUCCESS: Save to history
        saveSearch(word); 
        
        renderResult(data[0]);
    } catch (error) {
        resultContainer.innerHTML = `<p style="color:red; text-align:center;">Word not found. Try another one!</p>`;
    }
}

// bookmark logic
const bookmarkSection = document.getElementById('bookmarkSection');
const bookmarkList = document.getElementById('bookmarkList');

// Update the showSection function to handle 'bookmarks'
function showSection(target) {
    searchSection.style.display = target === 'search' ? 'block' : 'none';
    resultContainer.style.display = target === 'search' ? 'block' : 'none';
    historySection.style.display = target === 'history' ? 'block' : 'none';
    bookmarkSection.style.display = target === 'bookmarks' ? 'block' : 'none';
}

// Update the Navigation Listener
menuItems.forEach(item => {
    item.addEventListener('click', () => {
        menuItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const text = item.innerText.trim();
        if (text.includes('History')) {
            showSection('history');
            displayHistory();
        } else if (text.includes('Bookmarks')) {
            showSection('bookmarks');
            displayBookmarks();
        } else {
            showSection('search');
        }
    });
});

function toggleBookmark(word) {
    let bookmarks = JSON.parse(localStorage.getItem('defineX_bookmarks')) || [];
    
    if (bookmarks.includes(word)) {
        bookmarks = bookmarks.filter(b => b !== word);
    } else {
        bookmarks.push(word);
    }
    
    localStorage.setItem('defineX_bookmarks', JSON.stringify(bookmarks));
    // Re-render the search result to update the icon color
    const currentWord = document.querySelector('.word-header h2').innerText.toLowerCase();
    if (currentWord === word.toLowerCase()) {
        const btn = document.querySelector('.bookmark-btn i');
        btn.classList.toggle('fas'); // Solid heart
        btn.classList.toggle('far'); // Outline heart
    }
}

function displayBookmarks() {
    const bookmarks = JSON.parse(localStorage.getItem('defineX_bookmarks')) || [];
    bookmarkList.innerHTML = '';

    if (bookmarks.length === 0) {
        bookmarkList.innerHTML = '<p class="placeholder-text">No bookmarks saved yet.</p>';
        return;
    }

    bookmarks.forEach(word => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <span class="word">${word}</span>
            <i class="fas fa-trash" style="color: #ff4757; cursor: pointer;"></i>
        `;
        
        // Click word to search
        item.querySelector('.word').onclick = () => {
            searchInput.value = word;
            showSection('search');
            getDefinition(word);
        };

        // Click trash to remove
        item.querySelector('.fa-trash').onclick = (e) => {
            e.stopPropagation();
            toggleBookmark(word);
            displayBookmarks();
        };

        bookmarkList.appendChild(item);
    });
}