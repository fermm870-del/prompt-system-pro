const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Groq = require('groq-sdk');
const fs = require('fs-extra');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const PROMPTS_DIR = path.join(__dirname, 'prompts');

// ============================================
// API ROUTES
// ============================================

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Prompt System Pro' });
});

app.get('/api/prompts', async (req, res) => {
  try {
    const categories = [];
    
    // Verifica se pasta existe
    if (!await fs.pathExists(PROMPTS_DIR)) {
      return res.json([]);
    }
    
    const items = await fs.readdir(PROMPTS_DIR);
    
    for (const item of items) {
      const itemPath = path.join(PROMPTS_DIR, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory()) {
        const files = await fs.readdir(itemPath);
        const prompts = files
          .filter(f => f.endsWith('.md'))
          .map(f => ({
            id: `${item}/${f.replace('.md', '')}`,
            name: f.replace('.md', ''),
            category: item
          }));
        
        if (prompts.length > 0) {
          categories.push({
            name: item,
            count: prompts.length,
            prompts
          });
        }
      }
    }
    
    res.json(categories);
  } catch (error) {
    console.error('Error loading prompts:', error);
    res.json([]); // Retorna vazio se der erro
  }
});

app.get('/api/prompts/:category/:name', async (req, res) => {
  try {
    const { category, name } = req.params;
    const filePath = path.join(PROMPTS_DIR, category, `${name}.md`);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ id: `${category}/${name}`, category, name, content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/prompts', async (req, res) => {
  try {
    const { category, name, content } = req.body;
    if (!category || !name || !content) {
      return res.status(400).json({ error: 'Incomplete data' });
    }
    
    const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 50);
    const catPath = path.join(PROMPTS_DIR, category);
    await fs.ensureDir(catPath);
    
    const filePath = path.join(catPath, `${safeName}.md`);
    await fs.writeFile(filePath, content);
    
    res.json({ success: true, id: `${category}/${safeName}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/prompts/:category/:name', async (req, res) => {
  try {
    const { category, name } = req.params;
    const filePath = path.join(PROMPTS_DIR, category, `${name}.md`);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    await fs.remove(filePath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    const results = [];
    
    if (!await fs.pathExists(PROMPTS_DIR)) {
      return res.json({ query, count: 0, results: [] });
    }
    
    const categories = await fs.readdir(PROMPTS_DIR);
    
    for (const cat of categories) {
      const catPath = path.join(PROMPTS_DIR, cat);
      const stat = await fs.stat(catPath);
      
      if (stat.isDirectory()) {
        const files = await fs.readdir(catPath);
        for (const file of files.filter(f => f.endsWith('.md'))) {
          const content = await fs.readFile(path.join(catPath, file), 'utf-8');
          const searchText = `${cat} ${file} ${content}`.toLowerCase();
          
          if (searchText.includes(query.toLowerCase())) {
            results.push({
              id: `${cat}/${file.replace('.md', '')}`,
              category: cat,
              name: file.replace('.md', ''),
              preview: content.substring(0, 150) + '...'
            });
          }
        }
      }
    }
    
    res.json({ query, count: results.length, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate', async (req, res) => {
  try {
    const { promptId, userRequest, model = 'llama-3.3-70b-versatile' } = req.body;
    
    if (!userRequest) {
      return res.status(400).json({ error: 'userRequest required' });
    }
    
    let systemPrompt = 'Voce e um assistente de programacao especialista.';
    
    if (promptId) {
      const [category, name] = promptId.split('/');
      const filePath = path.join(PROMPTS_DIR, category, `${name}.md`);
      if (await fs.pathExists(filePath)) {
        systemPrompt = await fs.readFile(filePath, 'utf-8');
      }
    }
    
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userRequest }
      ],
      model,
      temperature: 0.7,
      max_tokens: 4096
    });
    
    res.json({
      success: true,
      response: completion.choices[0]?.message?.content,
      model,
      promptUsed: promptId || 'default'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], promptId } = req.body;
    const chatMessages = [...messages];
    
    if (promptId) {
      const [category, name] = promptId.split('/');
      const filePath = path.join(PROMPTS_DIR, category, `${name}.md`);
      if (await fs.pathExists(filePath)) {
        chatMessages.unshift({
          role: 'system',
          content: await fs.readFile(filePath, 'utf-8')
        });
      }
    }
    
    const completion = await groq.chat.completions.create({
      messages: chatMessages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4096
    });
    
    res.json({ response: completion.choices[0]?.message?.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SERVIR FRONTEND
// ============================================

const publicPath = path.join(__dirname, 'public');

if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      res.sendFile(path.join(publicPath, 'index.html'));
    }
  });
}

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`📁 Prompts: ${PROMPTS_DIR}`);
});
