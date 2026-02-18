import React, { useState, useEffect, useRef } from 'react';
import axios from 'react-markdown';
import { Search, Plus, FileText, MessageSquare, Code, Sparkles, Folder, Copy, Check, Send, Trash2, X, Zap } from 'lucide-react';
import config from './config';

const API_URL = config.API_URL;

function App() {
  const [categories, setCategories] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [promptContent, setPromptContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('browse');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ category: '', name: '', content: '' });
  const [userRequest, setUserRequest] = useState('');
  const [generatedResult, setGeneratedResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { loadPrompts(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/prompts`);
      setCategories(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadPrompt = async (cat, name) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/prompts/${cat}/${name}`);
      setSelectedPrompt(res.data);
      setPromptContent(res.data.content);
      setActiveTab('view');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    try {
      const res = await axios.post(`${API_URL}/api/search`, { query: searchQuery });
      setSearchResults(res.data.results);
    } catch (err) { console.error(err); }
  };

  const createPrompt = async () => {
    if (!newPrompt.category || !newPrompt.name || !newPrompt.content) return;
    try {
      await axios.post(`${API_URL}/api/prompts`, newPrompt);
      setIsCreating(false);
      setNewPrompt({ category: '', name: '', content: '' });
      loadPrompts();
    } catch (err) { alert('Erro: ' + err.message); }
  };

  const deletePrompt = async () => {
    if (!selectedPrompt || !window.confirm('Deletar este prompt?')) return;
    try {
      const [cat, name] = selectedPrompt.id.split('/');
      await axios.delete(`${API_URL}/api/prompts/${cat}/${name}`);
      setSelectedPrompt(null);
      loadPrompts();
    } catch (err) { alert('Erro: ' + err.message); }
  };

  const generate = async () => {
    if (!userRequest.trim()) return;
    setIsGenerating(true);
    try {
      const res = await axios.post(`${API_URL}/api/generate`, {
        promptId: selectedPrompt?.id, userRequest
      });
      setGeneratedResult(res.data.response);
    } catch (err) { setGeneratedResult('Erro: ' + err.message); }
    finally { setIsGenerating(false); }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const newMsgs = [...chatMessages, { role: 'user', content: chatInput }];
    setChatMessages(newMsgs);
    setChatInput('');
    setIsChatting(true);
    try {
      const res = await axios.post(`${API_URL}/api/chat`, {
        messages: newMsgs, promptId: selectedPrompt?.id
      });
      setChatMessages([...newMsgs, { role: 'assistant', content: res.data.response }]);
    } catch (err) {
      setChatMessages([...newMsgs, { role: 'assistant', content: 'Erro: ' + err.message }]);
    }
    setIsChatting(false);
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <Sparkles className="logo-icon" />
            <div>
              <h1>Prompt System Pro</h1>
              <span>Powered by Groq</span>
            </div>
          </div>
          <nav className="nav">
            <button className={activeTab === 'browse' ? 'active' : ''} onClick={() => setActiveTab('browse')}><Folder size={18}/>Navegar</button>
            <button className={activeTab === 'view' ? 'active' : ''} onClick={() => selectedPrompt && setActiveTab('view')} disabled={!selectedPrompt}><FileText size={18}/>Ver</button>
            <button className={activeTab === 'generate' ? 'active' : ''} onClick={() => setActiveTab('generate')}><Code size={18}/>Gerar</button>
            <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')}><MessageSquare size={18}/>Chat</button>
          </nav>
        </div>
      </header>

      <div className="container">
        <aside className="sidebar">
          <div className="search-box">
            <Search size={18} />
            <input type="text" placeholder="Buscar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSearch()} />
            {searchQuery && <button onClick={() => { setSearchQuery(''); setSearchResults([]); }}><X size={16}/></button>}
          </div>

          {searchResults.length > 0 ? (
            <div className="search-results">
              <h3>Resultados ({searchResults.length})</h3>
              {searchResults.map(r => (
                <button key={r.id} onClick={() => { loadPrompt(r.category, r.name); setSearchResults([]); setSearchQuery(''); }}>
                  <FileText size={16}/><div><strong>{r.name}</strong><small>{r.category}</small></div>
                </button>
              ))}
            </div>
          ) : (
            <div className="categories">
              <div className="sidebar-header">
                <h3>Categorias</h3>
                <button onClick={() => setIsCreating(true)}><Plus size={18}/></button>
              </div>
              {categories.map(cat => (
                <div key={cat.name} className="category">
                  <h4>{cat.name}<span>{cat.count}</span></h4>
                  <div className="prompt-list">
                    {cat.prompts.map(p => (
                      <button key={p.id} className={selectedPrompt?.id === p.id ? 'active' : ''} onClick={() => loadPrompt(cat.name, p.name)}>{p.name}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        <main className="main">
          {activeTab === 'browse' && !selectedPrompt && (
            <div className="welcome">
              <Sparkles size={64} />
              <h2>Prompt System Pro</h2>
              <p>Selecione um prompt para começar</p>
            </div>
          )}

          {activeTab === 'view' && selectedPrompt && (
            <div className="prompt-view">
              <div className="prompt-header">
                <h2>{selectedPrompt.id}</h2>
                <div className="actions">
                  <button onClick={() => copy(promptContent)}>{copied ? <><Check size={18}/>Copiado</> : <><Copy size={18}/>Copiar</>}</button>
                  <button className="danger" onClick={deletePrompt}><Trash2 size={18}/></button>
                </div>
              </div>
              <div className="content"><ReactMarkdown>{promptContent}</ReactMarkdown></div>
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="generate">
              <h2><Code size={24}/>Gerar Código</h2>
              {selectedPrompt && <div className="context">Usando: {selectedPrompt.id}<button onClick={() => setSelectedPrompt(null)}><X size={14}/></button></div>}
              <textarea value={userRequest} onChange={e => setUserRequest(e.target.value)} placeholder="Descreva o que quer criar..." rows={5}/>
              <button className="btn-generate" onClick={generate} disabled={isGenerating}>{isGenerating ? <><div className="spinner"/>Gerando...</> : <><Zap size={20}/>Gerar</>}</button>
              {generatedResult && <div className="result"><div className="result-header"><h3>Resultado</h3><button onClick={() => copy(generatedResult)}><Copy size={16}/></button></div><pre>{generatedResult}</pre></div>}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="chat">
              <div className="chat-header"><h2><MessageSquare size={24}/>Chat</h2>{selectedPrompt && <span>Contexto: {selectedPrompt.id}</span>}<button onClick={() => setChatMessages([])}>Limpar</button></div>
              <div className="chat-messages">
                {chatMessages.length === 0 && <div className="empty"><MessageSquare size={48}/><p>Comece uma conversa</p></div>}
                {chatMessages.map((m, i) => <div key={i} className={`message ${m.role}`}><div className="header">{m.role === 'user' ? 'Você' : 'Assistente'}</div><div className="body"><ReactMarkdown>{m.content}</ReactMarkdown></div></div>)}
                {isChatting && <div className="typing"><span/><span/><span/></div>}
                <div ref={chatEndRef}/>
              </div>
              <div className="chat-input">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendChat()} placeholder="Digite..." disabled={isChatting}/>
                <button onClick={sendChat} disabled={isChatting || !chatInput.trim()}><Send size={20}/></button>
              </div>
            </div>
          )}
        </main>
      </div>

      {isCreating && (
        <div className="modal" onClick={() => setIsCreating(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3><Plus size={20}/>Novo Prompt</h3>
            <select value={newPrompt.category} onChange={e => setNewPrompt({...newPrompt, category: e.target.value})}>
              <option value="">Categoria...</option>
              {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              <option value="novo">+ Nova</option>
            </select>
            {newPrompt.category === 'novo' && <input placeholder="Nova categoria" onChange={e => setNewPrompt({...newPrompt, category: e.target.value})}/>}
            <input placeholder="Nome do prompt" value={newPrompt.name} onChange={e => setNewPrompt({...newPrompt, name: e.target.value})}/>
            <textarea placeholder="Conteúdo markdown..." rows={10} value={newPrompt.content} onChange={e => setNewPrompt({...newPrompt, content: e.target.value})}/>
            <div className="actions"><button onClick={() => setIsCreating(false)}>Cancelar</button><button className="primary" onClick={createPrompt}>Salvar</button></div>
          </div>
        </div>
      )}

      {loading && <div className="loading"><div className="spinner large"/></div>}
    </div>
  );
}

export default App;
