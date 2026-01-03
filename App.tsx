
import React, { useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { 
  Trophy, 
  RotateCcw, 
  MessageCircle, 
  History, 
  User, 
  Zap,
  Info,
  ChevronLeft,
  BrainCircuit
} from 'lucide-react';
import { getCoachAdvice } from './services/geminiService';
import { CoachAdvice, PieceType } from './types';

const App: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [advice, setAdvice] = useState<CoachAdvice | null>(null);
  const [isCoachThinking, setIsCoachThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [captured, setCaptured] = useState<{ w: PieceType[], b: PieceType[] }>({ w: [], b: [] });

  const updateGameState = useCallback((currentGame: Chess) => {
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

  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });

      if (move === null) return false;

      const newGame = new Chess(game.fen());
      setGame(newGame);
      updateGameState(newGame);
      askCoach(newGame.fen(), move.san, newGame.turn());
      return true;
    } catch (e) {
      return false;
    }
  };

  const askCoach = async (fen: string, lastMove: string, turn: string) => {
    setIsCoachThinking(true);
    const newAdvice = await getCoachAdvice(fen, lastMove, turn);
    setAdvice(newAdvice);
    setIsCoachThinking(false);
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setAdvice(null);
    setMoveHistory([]);
    setCaptured({ w: [], b: [] });
  };

  const undoMove = () => {
    game.undo();
    const newGame = new Chess(game.fen());
    setGame(newGame);
    updateGameState(newGame);
    setAdvice(null);
  };

  const pieceIcons: Record<PieceType, string> = {
    p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚'
  };

  // Safe cast for production build stability
  const ChessboardComponent = Chessboard as any;

  return (
    <div className="min-h-screen flex flex-col items-center bg-blue-50 p-4 md:p-8">
      <header className="w-full max-w-6xl flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
            <Trophy className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Chess Academy</h1>
            <p className="text-blue-600 text-sm font-medium">Your learning journey begins here!</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={resetGame}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">New Game</span>
          </button>
          <button 
            onClick={undoMove}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Undo</span>
          </button>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-blue-100 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-4 px-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="text-gray-500 w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-gray-700">Opponent (Black)</span>
                  <div className="flex gap-1 text-lg leading-none mt-1">
                    {captured.w.map((p, i) => (
                      <span key={i} className="text-gray-400 opacity-60">{pieceIcons[p]}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className={`px-4 py-1 rounded-full text-sm font-bold ${game.turn() === 'b' ? 'bg-black text-white animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                Thinking...
              </div>
            </div>

            <div className="w-full aspect-square max-w-[500px] shadow-2xl rounded-lg overflow-hidden border-4 border-blue-600">
              <ChessboardComponent 
                id="main-chessboard"
                position={game.fen()} 
                onPieceDrop={(source: string, target: string) => onDrop(source, target)}
                customDarkSquareStyle={{ backgroundColor: '#3b82f6' }}
                customLightSquareStyle={{ backgroundColor: '#f3f4f6' }}
                animationDuration={300}
                boardOrientation="white"
              />
            </div>

            <div className="w-full flex justify-between items-center mt-4 px-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-400">
                  <User className="text-blue-600 w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-gray-700">You (White)</span>
                  <div className="flex gap-1 text-lg leading-none mt-1">
                    {captured.b.map((p, i) => (
                      <span key={i} className="text-blue-600 opacity-80">{pieceIcons[p]}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className={`px-4 py-1 rounded-full text-sm font-bold ${game.turn() === 'w' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
                {game.turn() === 'w' ? "Your Turn!" : "Wait..."}
              </div>
            </div>
          </div>
          
          {(game.isCheckmate() || game.isDraw()) && (
            <div className="bg-yellow-400 p-4 rounded-2xl flex items-center gap-4 animate-bounce shadow-lg">
              <Trophy className="text-yellow-900 w-8 h-8" />
              <div>
                <h3 className="font-bold text-yellow-900 text-lg">
                  {game.isCheckmate() ? (game.turn() === 'w' ? "Black Wins!" : "White Wins!") : "It's a Draw!"}
                </h3>
                <p className="text-yellow-800 text-sm">Amazing game! Ready for another round?</p>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <section className="bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col border border-blue-100 flex-grow min-h-[400px]">
            <div className="bg-blue-600 p-4 flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl">
                <BrainCircuit className="text-blue-600 w-6 h-6" />
              </div>
              <h2 className="text-white font-bold text-lg">AI Chess Coach</h2>
              {isCoachThinking && (
                <div className="ml-auto flex gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-150"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-300"></div>
                </div>
              )}
            </div>

            <div className="p-6 flex flex-col gap-6 scroll-hide overflow-y-auto max-h-[600px]">
              {advice ? (
                <>
                  <div className="bg-blue-50 p-4 rounded-2xl border-l-4 border-blue-400">
                    <p className="text-gray-700 leading-relaxed italic">
                      "{advice.explanation}"
                    </p>
                  </div>

                  {advice.suggestedMove && (
                    <div className="flex items-center gap-4 bg-green-50 p-4 rounded-2xl border border-green-200">
                      <div className="bg-green-500 p-2 rounded-lg">
                        <Zap className="text-white w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-green-800 text-xs font-bold uppercase tracking-wider">Coach Suggestion</p>
                        <p className="text-green-900 font-bold text-lg">Try moving {advice.suggestedMove}!</p>
                      </div>
                    </div>
                  )}

                  {advice.funFact && (
                    <div className="flex items-start gap-4 bg-yellow-50 p-4 rounded-2xl">
                      <div className="bg-yellow-400 p-2 rounded-lg mt-1">
                        <Info className="text-yellow-900 w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-yellow-900 text-xs font-bold uppercase tracking-wider">Did you know?</p>
                        <p className="text-yellow-800 text-sm">{advice.funFact}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 items-center text-xs font-bold text-gray-400 uppercase tracking-widest mt-auto pt-4 border-t border-gray-100">
                    <MessageCircle className="w-4 h-4" />
                    Coach is observing...
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                    <BrainCircuit className="text-blue-400 w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-gray-400 font-bold text-lg">Make a move!</h3>
                    <p className="text-gray-400 text-sm">I'll give you tips as you play.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="text-gray-500 w-5 h-5" />
                <h3 className="font-bold text-gray-700">Move History</h3>
              </div>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-bold">
                {Math.ceil(moveHistory.length / 2)} Rounds
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto scroll-hide">
              {moveHistory.length > 0 ? (
                moveHistory.map((m, i) => (
                  <span 
                    key={i} 
                    className={`px-3 py-1 rounded-lg text-sm font-medium border ${i % 2 === 0 ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-gray-50 border-gray-100 text-gray-600'}`}
                  >
                    {Math.floor(i/2) + 1}. {m}
                  </span>
                ))
              ) : (
                <p className="text-gray-400 text-sm italic">No moves yet. Good luck!</p>
              )}
            </div>
          </section>

          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                <Info className="w-5 h-5" /> Quick Rule
              </h4>
              <p className="text-blue-100 text-sm">
                Control the center of the board (the four middle squares) to make your pieces stronger!
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Trophy className="w-32 h-32" />
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 text-gray-400 text-sm pb-8 text-center">
        <p>Built with ❤️ for young grandmasters</p>
      </footer>
    </div>
  );
};

export default App;
