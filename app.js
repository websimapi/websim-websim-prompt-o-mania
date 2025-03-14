import { dictionaryData } from './dictionary-data.js';
import { promptIdeas } from './prompt-ideas.js';

// Initialize WebSocket connection
const room = new WebsimSocket();
let clientId = room.party.client.id;
let username = room.party.client.username;

// Set creator username
window.onload = async function() {
  try {
    const createdBy = await window.websim.getCreatedBy();
    document.getElementById('creator-username').textContent = createdBy.username;
  } catch (error) {
    console.error('Error getting creator:', error);
  }
};

// Random Prompt Ideas Generator
const promptContainer = document.getElementById('prompt-container');
const generatePromptBtn = document.getElementById('generate-prompt');

function getRandomPrompt() {
  const randomIndex = Math.floor(Math.random() * promptIdeas.length);
  return promptIdeas[randomIndex];
}

promptContainer.textContent = getRandomPrompt();

generatePromptBtn.addEventListener('click', () => {
  promptContainer.textContent = getRandomPrompt();
  createLLMToken();
});

// LLM Tokens Animation
function createLLMToken() {
  const tokenContainer = document.getElementById('llm-token-container');
  const token = document.createElement('div');
  token.className = 'llm-token';
  
  const tokenImg = document.createElement('img');
  tokenImg.src = '/a/40a02e43-58ba-4c2e-ac5b-613243f9bb03';
  tokenImg.alt = 'WebSim LLM Token';
  
  token.appendChild(tokenImg);
  
  // Random position
  token.style.left = `${Math.random() * 100}%`;
  
  tokenContainer.appendChild(token);
  
  // Remove token after animation completes
  setTimeout(() => {
    token.remove();
  }, 3000);
}

// Community Prompt Tracker
let promptCount = 0;
const promptTarget = 1000;
const activeCountEl = document.getElementById('active-count');
const progressBar = document.getElementById('progress-bar');
const promptListContainer = document.getElementById('prompt-list-container');

// Simulate initial prompts
function addRandomPrompts(count) {
  for (let i = 0; i < count; i++) {
    const isPremium = Math.random() > 0.6;
    const modelNames = isPremium ? ['Sonnet 3.7', 'Sonnet 3.5', 'o3-mini overthinking'] 
                                 : ['Gemini Flash 2.0', 'Gemini Flash 2.0 Thinking', 'Haiku 3.5', 'DeepSeek R1', 'R1 Lite'];
    const randomModel = modelNames[Math.floor(Math.random() * modelNames.length)];
    
    addPromptToTracker({
      description: getRandomPrompt(),
      model: randomModel,
      isPremium: isPremium,
      username: `user${Math.floor(Math.random() * 999)}`
    });
  }
}

function addPromptToTracker(promptData) {
  promptCount++;
  updateProgressBar();
  
  const promptEntry = document.createElement('div');
  promptEntry.className = 'prompt-entry';
  
  const promptDesc = document.createElement('div');
  promptDesc.className = 'prompt-desc';
  promptDesc.innerHTML = `<strong>${promptData.username}</strong>: ${promptData.description}`;
  
  const modelBadge = document.createElement('span');
  modelBadge.className = `model-badge ${promptData.isPremium ? 'premium' : 'free'}`;
  modelBadge.textContent = promptData.model;
  
  promptEntry.appendChild(promptDesc);
  promptEntry.appendChild(modelBadge);
  
  promptListContainer.insertBefore(promptEntry, promptListContainer.firstChild);
  
  // Trim list if getting too long
  if (promptListContainer.children.length > 30) {
    promptListContainer.removeChild(promptListContainer.lastChild);
  }

  // Add to database for persistence
  room.collection('prompts').create({
    description: promptData.description,
    model: promptData.model,
    isPremium: promptData.isPremium,
    username: room.party.client.username || 'Anonymous'
  });
}

function updateProgressBar() {
  activeCountEl.textContent = promptCount;
  const percentage = Math.min((promptCount / promptTarget) * 100, 100);
  progressBar.style.width = `${percentage}%`;
}

// Initialize with some random prompts
addRandomPrompts(15);

// New Prompt Form
const newPromptForm = document.getElementById('new-prompt-form');
newPromptForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const description = document.getElementById('prompt-description').value;
  const modelSelect = document.getElementById('model-select');
  const selectedModel = modelSelect.options[modelSelect.selectedIndex].text;
  const isPremium = modelSelect.options[modelSelect.selectedIndex].parentNode.label === 'Premium';
  
  addPromptToTracker({
    description: description,
    model: selectedModel,
    isPremium: isPremium,
    username: room.party.client.username || 'Anonymous'
  });
  
  room.party.updatePresence({
    lastPrompt: description
  });
  
  createLLMToken();
  
  newPromptForm.reset();
});

// Dictionary Search and Display
const dictionarySearch = document.getElementById('dictionary-search');
const dictionaryEntries = document.getElementById('dictionary-entries');
const dictionaryPagination = document.getElementById('dictionary-pagination');
const entriesPerPage = 5;
let currentPage = 1;

function renderDictionary(searchTerm = '') {
  const filteredEntries = dictionaryData.filter(entry => 
    entry.term.toLowerCase().includes(searchTerm.toLowerCase()) || 
    entry.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const pageCount = Math.ceil(filteredEntries.length / entriesPerPage);
  
  // Adjust current page if out of bounds after filtering
  if (currentPage > pageCount) {
    currentPage = Math.max(1, pageCount);
  }
  
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const pageEntries = filteredEntries.slice(startIndex, endIndex);
  
  dictionaryEntries.innerHTML = '';
  
  if (pageEntries.length === 0) {
    dictionaryEntries.innerHTML = '<div class="dictionary-entry">No matching entries found.</div>';
    dictionaryPagination.innerHTML = '';
    return;
  }
  
  pageEntries.forEach(entry => {
    const entryElement = document.createElement('div');
    entryElement.className = 'dictionary-entry';
    
    entryElement.innerHTML = `
      <h3>${entry.term}</h3>
      <div class="definition">${entry.definition}</div>
      <div class="example">Example: ${entry.example}</div>
    `;
    
    dictionaryEntries.appendChild(entryElement);
  });
  
  // Render pagination
  dictionaryPagination.innerHTML = '';
  
  if (pageCount > 1) {
    for (let i = 1; i <= pageCount; i++) {
      const button = document.createElement('button');
      button.className = `pagination-button ${i === currentPage ? 'active' : ''}`;
      button.textContent = i;
      button.addEventListener('click', () => {
        currentPage = i;
        renderDictionary(searchTerm);
      });
      
      dictionaryPagination.appendChild(button);
    }
  }
}

dictionarySearch.addEventListener('input', (e) => {
  renderDictionary(e.target.value);
});

// Initialize dictionary display
renderDictionary();

// Leaderboard
const leaderboardList = document.getElementById('leaderboard-list');

function updateLeaderboard() {
  // Clear existing entries
  leaderboardList.innerHTML = '';
  
  // Get all prompts from database
  const promptsMap = new Map();
  
  room.collection('prompts').getList().forEach(prompt => {
    const username = prompt.username;
    
    if (!promptsMap.has(username)) {
      promptsMap.set(username, {
        count: 0,
        premium: 0,
        free: 0
      });
    }
    
    const userData = promptsMap.get(username);
    userData.count++;
    if (prompt.isPremium) {
      userData.premium++;
    } else {
      userData.free++;
    }
  });
  
  // Convert to array and sort
  const leaderboardData = [...promptsMap.entries()]
    .map(([username, data]) => ({
      username,
      count: data.count,
      premium: data.premium,
      free: data.free,
      score: data.premium * 3 + data.free
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  
  // Add to leaderboard
  leaderboardData.forEach(entry => {
    const entryElement = document.createElement('div');
    entryElement.className = 'leaderboard-entry';
    
    entryElement.innerHTML = `
      <span>${entry.username}</span>
      <span>${entry.count}</span>
      <span>${entry.premium * 3 + entry.free}</span>
    `;
    
    leaderboardList.appendChild(entryElement);
  });
}

// User Presence
const presenceContainer = document.getElementById('presence-container');

function updateUserPresence() {
  presenceContainer.innerHTML = '';
  
  for (const clientId in room.party.presence) {
    const userPresence = room.party.presence[clientId];
    const peerInfo = room.party.peers[clientId];
    
    if (!peerInfo) continue;
    
    const userElement = document.createElement('div');
    userElement.className = 'user-presence';
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = peerInfo.username.charAt(0).toUpperCase();
    
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    
    userInfo.innerHTML = `
      <div><strong>${peerInfo.username}</strong></div>
      ${userPresence.lastPrompt ? `<div>Last prompt: ${userPresence.lastPrompt}</div>` : ''}
    `;
    
    userElement.appendChild(avatar);
    userElement.appendChild(userInfo);
    
    presenceContainer.appendChild(userElement);
  }
}

// LLM Chat
const llmChatContainer = document.getElementById('llm-chat-container');
const llmChatHeader = document.getElementById('llm-chat-header');
const llmToggle = document.getElementById('toggle-llm-chat');
const llmMessages = document.getElementById('llm-messages');
const llmForm = document.getElementById('llm-form');
const llmInput = document.getElementById('llm-input');
let llmChatOpen = true;
let conversationHistory = [];

llmChatHeader.addEventListener('click', (e) => {
  if (e.target === llmToggle) return; // Don't trigger if clicking toggle button
  
  llmChatOpen = !llmChatOpen;
  llmChatContainer.style.height = llmChatOpen ? 'auto' : '40px';
  llmToggle.textContent = llmChatOpen ? '↕️' : '↔️';
});

llmToggle.addEventListener('click', () => {
  llmChatOpen = !llmChatOpen;
  llmChatContainer.style.height = llmChatOpen ? 'auto' : '40px';
  llmToggle.textContent = llmChatOpen ? '↕️' : '↔️';
});

function addMessage(content, isUser = false) {
  const messageEl = document.createElement('div');
  messageEl.className = `message ${isUser ? 'user' : 'bot'}`;
  messageEl.textContent = content;
  
  llmMessages.appendChild(messageEl);
  llmMessages.scrollTop = llmMessages.scrollHeight;
  
  createLLMToken();
}

llmForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const userMessage = llmInput.value.trim();
  if (!userMessage) return;
  
  addMessage(userMessage, true);
  llmInput.value = '';
  
  // Add to conversation history
  const newMessage = {
    role: "user",
    content: userMessage,
  };
  conversationHistory.push(newMessage);
  conversationHistory = conversationHistory.slice(-10);
  
  try {
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant specialized in explaining WebSim features and helping users create better prompts. You are enthusiastic about WebSim and always encourage users to try creating with it. Keep responses brief and focused on WebSim features. You are the Sonnet 3.7 model."
        },
        ...conversationHistory,
      ],
    });

    const response = completion.content;
    addMessage(response);
    
    // Add the response to the conversation history
    conversationHistory.push(completion);
  } catch (error) {
    console.error('Error with LLM chat:', error);
    addMessage("Sorry, I couldn't process your request. Please try again later.");
  }
});

// Add a welcome message
addMessage("👋 Hi there! I'm Sonnet 3.7, your WebSim assistant. Ask me anything about creating with WebSim!");

// Subscribe to real-time updates
room.party.subscribePresence(updateUserPresence);
room.collection('prompts').subscribe(() => {
  updateLeaderboard();
});

// Initialize with presence
room.party.updatePresence({
  active: true,
  lastSeen: new Date().toISOString()
});

// Socket message handling
room.onmessage = (event) => {
  const data = event.data;
  if (data.type === "connected") {
    console.log(`Client ${data.clientId} connected`);
  } else if (data.type === "disconnected") {
    console.log(`Client ${data.clientId} disconnected`);
  }
};

// Set up periodic actions
setInterval(() => {
  // Randomly add a new prompt every 10-20 seconds
  if (Math.random() < 0.3) {
    const isPremium = Math.random() > 0.6;
    const modelNames = isPremium ? ['Sonnet 3.7', 'Sonnet 3.5', 'o3-mini overthinking'] 
                               : ['Gemini Flash 2.0', 'Gemini Flash 2.0 Thinking', 'Haiku 3.5', 'DeepSeek R1', 'R1 Lite'];
    const randomModel = modelNames[Math.floor(Math.random() * modelNames.length)];
    
    addPromptToTracker({
      description: getRandomPrompt(),
      model: randomModel,
      isPremium: isPremium,
      username: `user${Math.floor(Math.random() * 999)}`
    });
  }
}, 10000);

