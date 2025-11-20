import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, RoundData, Player, PlayerRoundResult, ResultType } from './types';
import { generateRound, evaluateGuess, THEME_CATEGORIES } from './services/geminiService';
import { Button } from './components/Button';
import { Loader2, AlertCircle, CheckCircle2, XCircle, BrainCircuit, Trophy, Settings, Plus, Trash2, Users, Play } from 'lucide-react';

export default function App() {
  // Game Configuration State
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: 'Jugador 1', score: 0 },
    { id: '2', name: 'Jugador 2', score: 0 }
  ]);
  const [enabledThemes, setEnabledThemes] = useState<string[]>(Object.keys(THEME_CATEGORIES));
  const [showOptions, setShowOptions] = useState(false);

  // Round State
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentGuesses, setCurrentGuesses] = useState<{id: string, guess: string}[]>([]);
  const [userInput, setUserInput] = useState('');
  const [roundResults, setRoundResults] = useState<PlayerRoundResult[]>([]);
  
  // Input ref to focus automatically
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Setup Logic ---

  const addPlayer = () => {
    if (players.length < 8) {
      setPlayers([...players, { id: Math.random().toString(36).substr(2, 9), name: `Jugador ${players.length + 1}`, score: 0 }]);
    }
  };

  const removePlayer = (id: string) => {
    if (players.length > 1) {
      setPlayers(players.filter(p => p.id !== id));
    }
  };

  const updatePlayerName = (id: string, name: string) => {
    setPlayers(players.map(p => p.id === id ? { ...p, name } : p));
  };

  const toggleTheme = (category: string) => {
    setEnabledThemes(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  // --- Game Loop Logic ---

  const startGame = () => {
    if (enabledThemes.length === 0) {
      alert("Selecciona al menos una categoría en las opciones.");
      return;
    }
    setGameState(GameState.LOADING);
    startRound();
  };

  const startRound = useCallback(async () => {
    setGameState(GameState.LOADING);
    setCurrentPlayerIndex(0);
    setCurrentGuesses([]);
    setUserInput('');
    setRoundResults([]);
    
    try {
      const data = await generateRound(enabledThemes);
      setRoundData(data);
      setGameState(GameState.PLAYING);
    } catch (e) {
      console.error(e);
      setGameState(GameState.ERROR);
    }
  }, [enabledThemes]);

  const handlePlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const currentPlayer = players[currentPlayerIndex];
    const newGuesses = [...currentGuesses, { id: currentPlayer.id, guess: userInput.trim() }];
    setCurrentGuesses(newGuesses);
    setUserInput('');

    if (currentPlayerIndex < players.length - 1) {
      // Next player's turn
      setCurrentPlayerIndex(prev => prev + 1);
    } else {
      // All players have guessed
      evaluateRound(newGuesses);
    }
  };

  const evaluateRound = async (guesses: {id: string, guess: string}[]) => {
    setGameState(GameState.EVALUATING);
    if (!roundData) return;

    try {
      // Evaluate all guesses in parallel
      const promises = guesses.map(async (item) => {
        const evalResult = await evaluateGuess(roundData.category, roundData.forbiddenWord, item.guess);
        
        let points = 0;
        if (evalResult.isValid && !evalResult.isForbidden) {
            points = 1;
        }

        return {
            playerId: item.id,
            guess: item.guess,
            evaluation: evalResult,
            pointsEarned: points
        } as PlayerRoundResult;
      });

      const results = await Promise.all(promises);

      // Update scores
      setPlayers(currentPlayers => currentPlayers.map(p => {
        const result = results.find(r => r.playerId === p.id);
        return result ? { ...p, score: p.score + result.pointsEarned } : p;
      }));

      setRoundResults(results);
      setGameState(GameState.ROUND_SUMMARY);

    } catch (err) {
        console.error(err);
        setGameState(GameState.ERROR);
    }
  };

  // Auto focus input when playing
  useEffect(() => {
    if (gameState === GameState.PLAYING && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [gameState, currentPlayerIndex]);


  // --- Render Helpers ---

  const renderStartScreen = () => (
    <div className="animate-fade-in space-y-12 py-10 flex flex-col items-center">
      <div className="space-y-6">
        <h1 className="text-7xl md:text-9xl font-bold tracking-tighter text-white drop-shadow-2xl leading-[0.9]">
          LA PALABRA<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-800">NEGRA</span>
        </h1>
        <p className="text-zinc-300 text-xl md:text-2xl max-w-xl mx-auto">
          Un juego multijugador de astucia y vocabulario.
        </p>
      </div>

      <div className="w-full max-w-md space-y-6 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-zinc-300 font-bold uppercase tracking-widest flex items-center gap-2">
                <Users className="w-5 h-5" /> Jugadores
            </h3>
            {players.length < 8 && (
                 <button onClick={addPlayer} className="text-red-500 hover:text-red-400 transition-colors">
                    <Plus className="w-6 h-6" />
                 </button>
            )}
        </div>
        <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 scrollbar-thin">
            {players.map((player, idx) => (
                <div key={player.id} className="flex items-center gap-3">
                    <span className="text-zinc-500 font-mono w-6 text-right">{idx + 1}.</span>
                    <input 
                        type="text" 
                        value={player.name}
                        onChange={(e) => updatePlayerName(player.id, e.target.value)}
                        className="bg-zinc-800/50 border border-zinc-700 rounded px-3 py-2 text-white flex-1 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                    {players.length > 1 && (
                        <button onClick={() => removePlayer(player.id)} className="text-zinc-600 hover:text-red-500">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 w-full max-w-md">
          <Button onClick={startGame} className="flex-1 shadow-2xl">
            <Play className="w-5 h-5 mr-2 inline" /> EMPEZAR
          </Button>
          <Button onClick={() => setShowOptions(true)} variant="secondary" className="flex-0 px-6">
            <Settings className="w-6 h-6" />
          </Button>
      </div>
    </div>
  );

  const renderOptions = () => (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl p-8 shadow-2xl space-y-8 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white">Categorías</h2>
                <button onClick={() => setShowOptions(false)} className="text-zinc-400 hover:text-white">
                    <XCircle className="w-8 h-8" />
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2">
                {Object.keys(THEME_CATEGORIES).map(category => (
                    <label key={category} className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${enabledThemes.includes(category) ? 'bg-red-900/20 border-red-500/50 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                        <input 
                            type="checkbox" 
                            checked={enabledThemes.includes(category)}
                            onChange={() => toggleTheme(category)}
                            className="hidden"
                        />
                        <div className={`w-6 h-6 rounded border mr-4 flex items-center justify-center ${enabledThemes.includes(category) ? 'bg-red-500 border-red-500' : 'border-zinc-600'}`}>
                            {enabledThemes.includes(category) && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <span className="font-medium text-lg">{category}</span>
                    </label>
                ))}
            </div>

            <div className="pt-4 border-t border-zinc-800 flex justify-end">
                <Button onClick={() => setShowOptions(false)} variant="primary" className="w-full md:w-auto">
                    Guardar Cambios
                </Button>
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative selection:bg-red-900 selection:text-white">
      
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black"></div>
        <div className="absolute -top-40 -right-40 w-[40rem] h-[40rem] bg-red-900/20 rounded-full blur-[100px] bg-drift"></div>
        <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-blue-900/10 rounded-full blur-[100px] bg-drift" style={{ animationDelay: '5s' }}></div>
      </div>

      {/* Options Modal */}
      {showOptions && renderOptions()}

      {/* Header / Scoreboard Mini */}
      {gameState !== GameState.START && gameState !== GameState.SETUP && (
        <div className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-start pointer-events-none">
             <button onClick={() => setGameState(GameState.START)} className="pointer-events-auto text-zinc-600 hover:text-white transition-colors font-bold tracking-tighter text-xl">
                LA PALABRA <span className="text-red-600">NEGRA</span>
            </button>

            <div className="flex flex-col items-end space-y-2 pointer-events-auto">
                {players.map(p => (
                    <div key={p.id} className={`flex items-center space-x-3 px-4 py-1 rounded-full border backdrop-blur-md transition-all ${p.score > 0 ? 'bg-zinc-900/80 border-zinc-700' : 'bg-transparent border-transparent opacity-50'}`}>
                        <span className="text-sm font-medium text-zinc-300">{p.name}</span>
                        <div className="flex items-center text-yellow-500 gap-1">
                             <span className="font-bold tabular-nums">{p.score}</span>
                             <Trophy className="w-3 h-3" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="w-full max-w-5xl z-10 flex flex-col items-center text-center" aria-live="polite">
        
        {gameState === GameState.START && renderStartScreen()}

        {/* --- LOADING --- */}
        {gameState === GameState.LOADING && (
          <div className="flex flex-col items-center space-y-8 animate-pulse">
            <BrainCircuit className="w-24 h-24 text-red-600 animate-spin-slow" />
            <p className="text-zinc-400 text-2xl tracking-[0.3em] font-light">PREPARANDO RONDA...</p>
          </div>
        )}

        {/* --- PLAYING (INPUT) --- */}
        {gameState === GameState.PLAYING && roundData && (
          <div className="w-full space-y-12 animate-fade-in-up">
            <div className="space-y-4">
              <p className="text-red-500 font-bold uppercase tracking-[0.25em] text-lg">
                Turno de <span className="text-white">{players[currentPlayerIndex].name}</span>
              </p>
              <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight drop-shadow-lg max-w-4xl mx-auto">
                {roundData.category}
              </h2>
            </div>

            <form onSubmit={handlePlayerSubmit} className="w-full relative group max-w-3xl mx-auto">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={`Respuesta de ${players[currentPlayerIndex].name}...`}
                className="w-full bg-transparent border-b-[6px] border-zinc-800 text-center text-5xl md:text-6xl py-6 text-white placeholder-zinc-700 focus:outline-none focus:border-red-600 transition-colors duration-300 input-glow rounded-none"
                autoComplete="off"
              />
            </form>
            
            <div className="flex justify-center gap-4">
               <p className="text-zinc-500 text-sm uppercase tracking-widest">
                  Jugador {currentPlayerIndex + 1} de {players.length}
               </p>
            </div>
             <Button onClick={handlePlayerSubmit} disabled={!userInput} className="w-full md:w-auto min-w-[200px]">
                {currentPlayerIndex < players.length - 1 ? 'Siguiente Jugador' : 'Finalizar Ronda'}
            </Button>
          </div>
        )}

        {/* --- EVALUATING --- */}
        {gameState === GameState.EVALUATING && (
             <div className="flex flex-col items-center space-y-8">
                <Loader2 className="w-20 h-20 text-red-500 animate-spin" />
                <p className="text-zinc-300 text-xl">La IA está juzgando vuestras respuestas...</p>
             </div>
        )}

        {/* --- ROUND SUMMARY --- */}
        {gameState === GameState.ROUND_SUMMARY && roundData && (
          <div className="w-full max-w-4xl space-y-10 animate-scale-in">
            
            <div className="text-center space-y-2">
                <p className="text-red-400 uppercase tracking-widest font-bold">Palabra Negra</p>
                <h2 className="text-5xl md:text-7xl font-bold text-white">{roundData.forbiddenWord}</h2>
            </div>

            <div className="grid gap-4">
                {roundResults.map((result) => {
                    const player = players.find(p => p.id === result.playerId);
                    const isSuccess = result.evaluation.isValid && !result.evaluation.isForbidden;
                    const isForbidden = result.evaluation.isForbidden;
                    
                    return (
                        <div key={result.playerId} className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-sm">
                             <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isSuccess ? 'bg-green-900/50 text-green-400' : isForbidden ? 'bg-red-900/50 text-red-500' : 'bg-yellow-900/50 text-yellow-500'}`}>
                                    {isSuccess ? <CheckCircle2 /> : isForbidden ? <XCircle /> : <AlertCircle />}
                                </div>
                                <div>
                                    <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">{player?.name}</p>
                                    <p className="text-2xl text-white font-medium">"{result.guess}"</p>
                                </div>
                             </div>
                             
                             <div className="flex flex-col items-center md:items-end text-center md:text-right">
                                 <p className={`font-bold text-lg ${isSuccess ? 'text-green-400' : isForbidden ? 'text-red-400' : 'text-yellow-400'}`}>
                                     {isSuccess ? '+1 Punto' : isForbidden ? 'PALABRA NEGRA' : 'Inválido'}
                                 </p>
                                 <p className="text-zinc-500 text-sm max-w-[200px] leading-tight mt-1">{result.evaluation.reason}</p>
                             </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-center pt-6">
                 <Button onClick={startRound} className="w-full md:w-auto px-12">
                    Siguiente Ronda
                </Button>
            </div>

          </div>
        )}

        {/* --- ERROR --- */}
        {gameState === GameState.ERROR && (
            <div className="text-center space-y-6 p-8 bg-zinc-900 rounded-2xl border border-red-900/30">
                <AlertCircle className="w-20 h-20 text-red-500 mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">Error de conexión</h3>
                  <p className="text-zinc-400 text-lg">La IA no pudo responder. Inténtalo de nuevo.</p>
                </div>
                <Button onClick={startRound} variant="secondary">Reintentar</Button>
            </div>
        )}

      </main>

      {/* Footer */}
      <footer className="absolute bottom-6 text-zinc-600 text-sm uppercase tracking-[0.3em] pointer-events-none mix-blend-plus-lighter">
        Powered by Gemini 2.5
      </footer>
      
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        .animate-spin-slow { animation: spin 4s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-fade-in { animation: fadeIn 1.2s ease-out; }
        .animate-fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-scale-in { animation: scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
