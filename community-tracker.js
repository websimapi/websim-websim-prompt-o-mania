import { promptIdeas } from './prompt-ideas.js';

class CommunityTracker {
  constructor(room) {
    this.room = room;
    this.promptsCollection = this.room.collection('prompts');
    this.metadataCollection = this.room.collection('prompt_metadata');
    this.promptCount = 0;
    this.promptTarget = 1000;
    this.promptStats = {
      modelUsage: {},
      popularKeywords: {},
      userActivity: {}
    };
    this.activeCountEl = document.getElementById('active-count');
    this.progressBar = document.getElementById('progress-bar');
    this.promptListContainer = document.getElementById('prompt-list-container');
    
    // Initialize
    this.loadPrompts();
    this.setupListeners();
  }
  
  async loadPrompts() {
    // Get all persisted prompts
    const prompts = this.promptsCollection.getList();
    this.promptCount = prompts.length;
    this.updateProgressBar();
    
    // Process prompts for metadata
    this.analyzePrompts(prompts);
    
    // Display the most recent prompts
    this.renderPromptList(prompts.slice(0, 20));
    
    // If no prompts exist initially, add some sample ones
    if (prompts.length === 0) {
      this.addRandomPrompts(15);
    }
  }
  
  setupListeners() {
    // Listen for new prompts
    this.promptsCollection.subscribe((prompts) => {
      this.promptCount = prompts.length;
      this.updateProgressBar();
      this.analyzePrompts(prompts);
      this.renderPromptList(prompts.slice(0, 20));
    });
    
    // Listen for metadata updates
    this.metadataCollection.subscribe((metadata) => {
      // Update any UI elements that display metadata
      if (metadata.length > 0) {
        this.updateTrends(metadata);
      }
    });
  }
  
  analyzePrompts(prompts) {
    // Reset stats
    this.promptStats = {
      modelUsage: {},
      popularKeywords: {},
      userActivity: {}
    };
    
    // Analyze each prompt
    prompts.forEach(prompt => {
      // Track model usage
      if (!this.promptStats.modelUsage[prompt.model]) {
        this.promptStats.modelUsage[prompt.model] = 0;
      }
      this.promptStats.modelUsage[prompt.model]++;
      
      // Track user activity
      if (!this.promptStats.userActivity[prompt.username]) {
        this.promptStats.userActivity[prompt.username] = {
          count: 0,
          premium: 0,
          free: 0
        };
      }
      this.promptStats.userActivity[prompt.username].count++;
      if (prompt.isPremium) {
        this.promptStats.userActivity[prompt.username].premium++;
      } else {
        this.promptStats.userActivity[prompt.username].free++;
      }
      
      // Extract keywords and track popularity
      const keywords = this.extractKeywords(prompt.description);
      keywords.forEach(keyword => {
        if (!this.promptStats.popularKeywords[keyword]) {
          this.promptStats.popularKeywords[keyword] = 0;
        }
        this.promptStats.popularKeywords[keyword]++;
      });
    });
    
    // Store metadata for persistence
    this.saveMetadata();
  }
  
  extractKeywords(description) {
    // Simple keyword extraction - split by spaces and filter out common words
    const commonWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'that', 'this', 'it', 'of'];
    const words = description.toLowerCase().split(/\s+/);
    
    return words
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .map(word => word.replace(/[^a-z0-9]/g, ''));
  }
  
  async saveMetadata() {
    try {
      // Check if we already have a metadata record
      const existingMetadata = this.metadataCollection.filter({ type: 'stats' }).getList();
      
      if (existingMetadata.length > 0) {
        // Update existing record
        await this.metadataCollection.update(existingMetadata[0].id, {
          stats: this.promptStats,
          lastUpdated: new Date().toISOString(),
          count: this.promptCount
        });
      } else {
        // Create new record
        await this.metadataCollection.create({
          type: 'stats',
          stats: this.promptStats,
          lastUpdated: new Date().toISOString(),
          count: this.promptCount
        });
      }
    } catch (error) {
      console.error('Error saving metadata:', error);
    }
  }
  
  updateProgressBar() {
    this.activeCountEl.textContent = this.promptCount;
    const percentage = Math.min((this.promptCount / this.promptTarget) * 100, 100);
    this.progressBar.style.width = `${percentage}%`;
  }
  
  renderPromptList(prompts) {
    this.promptListContainer.innerHTML = '';
    
    // Sort prompts by creation time (newest first)
    const sortedPrompts = [...prompts].sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    sortedPrompts.slice(0, 20).forEach(prompt => {
      const promptEntry = document.createElement('div');
      promptEntry.className = 'prompt-entry';
      
      const promptDesc = document.createElement('div');
      promptDesc.className = 'prompt-desc';
      promptDesc.innerHTML = `<strong>${prompt.username}</strong>: ${prompt.description}`;
      
      const modelBadge = document.createElement('span');
      modelBadge.className = `model-badge ${prompt.isPremium ? 'premium' : 'free'}`;
      modelBadge.textContent = prompt.model;
      
      promptEntry.appendChild(promptDesc);
      promptEntry.appendChild(modelBadge);
      
      this.promptListContainer.appendChild(promptEntry);

      // Create an LLM token animation for new prompts
      if (new Date(prompt.created_at) > new Date(Date.now() - 5000)) {
        this.createLLMTokenAnimation();
      }
    });
  }
  
  updateTrends(metadata) {
    // Get the first metadata record (assuming it's the stats one)
    const statsRecord = metadata.find(record => record.type === 'stats');
    if (statsRecord && statsRecord.stats) {
      // Update the UI with top keywords
      const keywordsList = Object.entries(statsRecord.stats.popularKeywords || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
        
      const trendsContainer = document.getElementById('trends-container');
      if (trendsContainer) {
        let trendsHTML = '<div class="trends-title">Popular Keywords</div><div class="trend-keywords">';
        
        keywordsList.forEach(([keyword, count]) => {
          trendsHTML += `<span class="keyword-tag">${keyword} (${count})</span>`;
        });
        
        trendsHTML += '</div>';
        trendsContainer.innerHTML = trendsHTML;
      }
    }
  }
  
  createLLMTokenAnimation() {
    const tokenContainer = document.getElementById('llm-token-container');
    if (!tokenContainer) return;
    
    const token = document.createElement('div');
    token.className = 'llm-token';
    
    const tokenImg = document.createElement('img');
    tokenImg.src = '/VariantDark1.png';
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
  
  // Advanced prompt search by metadata
  async searchPrompts(query, filters = {}) {
    const allPrompts = this.promptsCollection.getList();
    
    // Filter by search query
    let results = allPrompts.filter(prompt => {
      const matchesQuery = query ? 
        prompt.description.toLowerCase().includes(query.toLowerCase()) : 
        true;
        
      // Apply filters
      const matchesModel = filters.model ? 
        prompt.model === filters.model : 
        true;
        
      const matchesPremium = filters.isPremium !== undefined ? 
        prompt.isPremium === filters.isPremium : 
        true;
        
      const matchesUser = filters.username ? 
        prompt.username === filters.username : 
        true;
        
      return matchesQuery && matchesModel && matchesPremium && matchesUser;
    });
    
    // Sort by relevance or time
    if (filters.sortBy === 'relevance' && query) {
      results.sort((a, b) => {
        // Simple relevance scoring based on how many times the query appears
        const countA = (a.description.toLowerCase().match(new RegExp(query.toLowerCase(), 'g')) || []).length;
        const countB = (b.description.toLowerCase().match(new RegExp(query.toLowerCase(), 'g')) || []).length;
        return countB - countA;
      });
    } else {
      // Default sort by time
      results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    return results;
  }
  
  // Generate a sample prompt similar to existing ones
  generateSimilarPrompt(keyword) {
    // Get all prompts containing the keyword
    const relatedPrompts = this.promptsCollection.getList()
      .filter(prompt => prompt.description.toLowerCase().includes(keyword.toLowerCase()));
    
    if (relatedPrompts.length > 0) {
      // Pick a random related prompt as a template
      const templatePrompt = relatedPrompts[Math.floor(Math.random() * relatedPrompts.length)];
      
      // Find similar prompts in our prompt ideas
      const similarIdeas = promptIdeas.filter(idea => 
        idea.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (similarIdeas.length > 0) {
        return similarIdeas[Math.floor(Math.random() * similarIdeas.length)];
      } else {
        // If no similar ideas, return a modified version of the template
        return this.modifyPrompt(templatePrompt.description);
      }
    }
    
    // Fallback to a random prompt idea
    return promptIdeas[Math.floor(Math.random() * promptIdeas.length)];
  }
  
  modifyPrompt(promptText) {
    // Simple prompt modification by replacing some words
    const subjects = ['app', 'game', 'tool', 'website', 'dashboard', 'visualizer'];
    const adjectives = ['interactive', 'responsive', 'modern', 'minimalist', 'colorful', 'sleek'];
    const themes = ['space', 'ocean', 'forest', 'cyberpunk', 'retro', 'futuristic'];
    
    let modified = promptText;
    
    // Replace a subject if present
    subjects.forEach(subject => {
      if (promptText.includes(subject)) {
        const newSubject = subjects[Math.floor(Math.random() * subjects.length)];
        if (newSubject !== subject) {
          modified = modified.replace(subject, newSubject);
        }
      }
    });
    
    // Add an adjective if not present
    const hasAdjective = adjectives.some(adj => promptText.includes(adj));
    if (!hasAdjective) {
      const newAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const words = modified.split(' ');
      words.splice(2, 0, newAdj);
      modified = words.join(' ');
    }
    
    // Add a theme if not present
    const hasTheme = themes.some(theme => promptText.includes(theme));
    if (!hasTheme) {
      const newTheme = themes[Math.floor(Math.random() * themes.length)];
      modified += ` with a ${newTheme} theme`;
    }
    
    return modified;
  }
  
  addPromptToTracker(promptData) {
    // Create the prompt in the database
    this.promptsCollection.create({
      description: promptData.description,
      model: promptData.model,
      isPremium: promptData.isPremium,
      username: promptData.username,
      created_at: new Date().toISOString(),
      keywords: this.extractKeywords(promptData.description)
    });
    
    // No need to update UI here as it will happen via subscription
  }
  
  // Generate random community prompts
  addRandomPrompts(count) {
    for (let i = 0; i < count; i++) {
      const isPremium = Math.random() > 0.6;
      const modelNames = isPremium ? ['Sonnet 3.7', 'Sonnet 3.5', 'o3-mini overthinking'] 
                                 : ['Gemini Flash 2.0', 'Gemini Flash 2.0 Thinking', 'Haiku 3.5', 'DeepSeek R1', 'R1 Lite'];
      const randomModel = modelNames[Math.floor(Math.random() * modelNames.length)];
      
      this.addPromptToTracker({
        description: promptIdeas[Math.floor(Math.random() * promptIdeas.length)],
        model: randomModel,
        isPremium: isPremium,
        username: `user${Math.floor(Math.random() * 999)}`
      });
    }
  }
}

export default CommunityTracker;