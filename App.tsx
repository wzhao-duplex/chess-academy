import React, { useState, useCallback } from 'react';
import { Chess, Square as ChessSquare } from 'chess.js';
import { Chessboard as ReactChessboard } from 'react-chessboard';
import { 
  Trophy, 
  RotateCcw, 
  History, 
  User, 
  Zap,
  Info,
  ChevronLeft,
  BrainCircuit
} from 'lucide-react';
import { getCoachAdvice } from './services/geminiService';
import { CoachAdvice, PieceType } from './types';

// Bypass type clashing between react-chessboard and React 19
const Chessboard = ReactChessboard as any;

const App: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [advice, setAdvice] = useState<CoachAdvice | null>(null);
  const [isCoachThinking, setIsCoachThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [captured, setCaptured] = useState<{ w: PieceType[], b: PieceType[] }>({ w: [], b: [] });
  
  // Interaction state for click-to-move (Perfect for iPhone)
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});

  const updateUIState = useCallback((currentGame: Chess) => {
    setMoveHistory(currentGame.history());
    
    const currentBoard = currentGame.board().flat().filter(p => p !== null);
    const countPieces = (color: 'w' | 'b') => {
      const counts: Record<PieceType, number> = { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 };
      currentBoard.forEach(p => {
        if (p && p.color === color) counts[p.type]++;
      });
      return counts;
    };

    const whiteCounts = countPieces('w');
    const blackCounts = countPieces('b');

    const getCaptured = (counts: Record<PieceType, number>) => {
      const caps: PieceType[] = [];
      const standard: Record<PieceType, number> = { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 };
      (Object.keys(standard) as PieceType[]).forEach(type => {
        const diff = standard[type] - counts[type];
        for (let i = 0; i < diff; i++) caps.push(type);
      });
      return caps;
    };

    setCaptured({
      w: getCaptured(whiteCounts),
      b: getCaptured(blackCounts)
    });
  }, []);

  const makeMove = useCallback((moveData: { from: string; to: string; promotion?: string }) => {
    const gameCopy = new Chess(game.fen());
    try {
      const result = gameCopy.move(moveData);
      if (result) {
        setGame(gameCopy);
        updateUIState(gameCopy);
        
        // Handle Coach Advice
        setIsCoachThinking(true);
        getCoachAdvice(gameCopy.fen(), result.san, gameCopy.turn())
          .then(setAdvice)
          .catch(console.error)
          .finally(() => setIsCoachThinking(false));

        // Reset click-to-move markers
        setMoveFrom(null);
        setOptionSquares({});
        return true;
      }
    } catch (e) {
      // Invalid move
    }
    return false;
  }, [game, updateUIState]);

  // Drag and Drop support
  const onDrop = (source: string, target: string) => {
    return makeMove({ from: source, to: target, promotion: 'q' });
  };

  // Click-to-Move support (Essential for mobile)
  const onSquareClick = (square: string) => {
    // 1. Try to move if we already have a selection
    if (moveFrom) {
      const success = makeMove({ from: moveFrom, to: square, promotion: 'q' });
      if (success) return;
    }

    // 2. Otherwise, try to select the piece at this square
    const piece = game.get(square as ChessSquare);
    if (piece && piece.color === game.turn()) {
      setMoveFrom(square);
      
      // Highlight valid options
      const moves = game.moves({ square: square as ChessSquare, verbose: true });
      const newSquares: Record<string, any> = {};
      moves.forEach((m) => {
        newSquares[m.to] = {
          background: game.get(m.to as ChessSquare) 
            ? "radial-gradient(circle, rgba(0,0,0,.2) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 20%, transparent 20%)",
          borderRadius: "50%",
        };
      });
      newSquares[square] = { background: "rgba(255, 255, 0, 0.4)" };
      setOptionSquares(newSquares);
    } else {
      // Clicked empty or enemy without a prior selection - clear everything
      setMoveFrom(null);
      setOptionSquares({});
    }
  };

  const reset = () => {
    const newGame = new Chess();
    setGame(newGame);
    setAdvice(null);
    setMoveHistory([]);
    setCaptured({ w: [], b: [] });
    setMoveFrom(null);
    setOptionSquares({});
  };

  const undo = () => {
    const gameCopy = new Chess(game.fen());
    gameCopy.undo();
    setGame(gameCopy);
    updateUIState(gameCopy);
    setMoveFrom(null);
    setOptionSquares({});
  };

  const pieceIcons: Record<PieceType, string> = {
    p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚'
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-sky-50 p-4 md:p-8">
      <header className="w-full max-w-5xl flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
            <Trophy className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Chess Academy</h1>
            <p className="text-blue-600 text-sm font-semibold italic">Learning by playing!</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="p-3 bg-white rounded-xl shadow-sm border border-blue-100 hover:bg-gray-50 active:scale-95 transition-transform">
            <RotateCcw className="w-5 h-5 text-gray-600" />
          </button>
          <button onClick={undo} className="p-3 bg-white rounded-xl shadow-sm border border-blue-100 hover:bg-gray-50 active:scale-95 transition-transform">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Game Board Section */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white p-4 sm:p-6 rounded-[2rem] shadow-2xl border border-blue-100 relative">
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 text-xs">AI</div>
                <div className="flex gap-0.5 text-xl leading-none">
                  {captured.w.map((p, i) => <span key={i} className="text-gray-300">{pieceIcons[p]}</span>)}
                </div>
              </div>
              <div className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${game.turn() === 'b' ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                {game.turn() === 'b' ? 'Black to Move' : 'Waiting...'}
              </div>
            </div>

            <div className="w-full aspect-square max-w-[500px] mx-auto rounded-xl overflow-hidden shadow-inner border-4 border-blue-600">
              <Chessboard 
                id="academyBoard"
                position={game.fen()} 
                onPieceDrop={onDrop}
                onSquareClick={onSquareClick}
                customSquareStyles={optionSquares}
                customDarkSquareStyle={{ backgroundColor: '#3b82f6' }}
                customLightSquareStyle={{ backgroundColor: '#f3f4f6' }}
                animationDuration={200}
              />
            </div>

            <div className="flex justify-between items-center mt-4 px-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-white text-xs">YOU</div>
                <div className="flex gap-0.5 text-xl leading-none">
                  {captured.b.map((p, i) => <span key={i} className="text-blue-600">{pieceIcons[p]}</span>)}
                </div>
              </div>
              <div className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${game.turn() === 'w' ? 'bg-blue-600 text-white animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                {game.turn() === 'w' ? 'Your Move!' : 'Opponent Thinking'}
              </div>
            </div>
          </div>
        </div>

        {/* Coach and Move History */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <section className="bg-white rounded-[2rem] shadow-xl overflow-hidden flex flex-col border border-blue-100 min-h-[400px]">
            <div className="bg-blue-600 p-5 flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg"><BrainCircuit className="text-white w-6 h-6" /></div>
              <h2 className="text-white font-bold text-lg">AI Coach</h2>
              {isCoachThinking && (
                <div className="ml-auto flex gap-1">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              )}
            </div>

            <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[450px] scroll-hide">
              {advice ? (
                <>
                  <div className="bg-blue-50 p-5 rounded-2xl border-l-4 border-blue-500 shadow-sm">
                    <p className="text-blue-900 leading-relaxed font-medium text-lg italic">"{advice.explanation}"</p>
                  </div>
                  {advice.suggestedMove && (
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-4">
                      <div className="bg-emerald-500 p-2 rounded-lg shadow-sm"><Zap className="text-white w-5 h-5" /></div>
                      <div>
                        <p className="text-emerald-800 text-[10px] font-black uppercase tracking-wider">Coach Suggests</p>
                        <p className="text-emerald-900 font-bold text-xl">{advice.suggestedMove}</p>
                      </div>
                    </div>
                  )}
                  {advice.funFact && (
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
                      <div className="bg-amber-400 p-1.5 rounded-md mt-1"><Info className="text-amber-900 w-4 h-4" /></div>
                      <p className="text-amber-900 text-sm leading-snug">{advice.funFact}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-20 gap-4 opacity-40">
                  <BrainCircuit className="w-16 h-16 text-blue-300" />
                  <p className="font-bold text-blue-400">Make your first move!</p>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-[2rem] shadow-lg p-6 border border-blue-50">
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <History className="w-3 h-3" /> Move Journal
            </h3>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto scroll-hide">
              {moveHistory.length > 0 ? (
                moveHistory.map((m, i) => (
                  <span key={i} className={`px-3 py-1 rounded-lg text-xs font-bold ${i % 2 === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {Math.floor(i/2) + 1}. {m}
                  </span>
                ))
              ) : (
                <p className="text-gray-300 text-xs italic">Start playing to see moves here...</p>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-8 text-blue-200 text-[10px] font-black uppercase tracking-[0.3em] text-center pb-8">
        Built for future grandmasters
      </footer>
    </div>
  );
};

export default App;