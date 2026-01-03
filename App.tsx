import React, { useState, useCallback } from 'react';
import { Chess, Square as ChessSquare } from 'chess.js';
import { Chessboard as ReactChessboard } from 'react-chessboard';
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

/**
 * Casting Chessboard to any to bypass compatibility issues between 
 * react-chessboard types and React 19 'IntrinsicAttributes' during build.
 */
const Chessboard = ReactChessboard as any;

const App: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [advice, setAdvice] = useState<CoachAdvice | null>(null);
  const [isCoachThinking, setIsCoachThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [captured, setCaptured] = useState<{ w: PieceType[], b: PieceType[] }>({ w: [], b: [] });
  
  // State for interaction logic (highlights and click-to-move)
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});

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

  const askCoach = async (fen: string, lastMove: string, turn: string) => {
    setIsCoachThinking(true);
    const newAdvice = await getCoachAdvice(fen, lastMove, turn);
    setAdvice(newAdvice);
    setIsCoachThinking(false);
  };

  const makeAMove = useCallback((moveData: { from: string; to: string; promotion?: string }) => {
    try {
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(moveData);
      
      if (result) {
        setGame(gameCopy);
        updateGameState(gameCopy);
        askCoach(gameCopy.fen(), result.san, gameCopy.turn());
        // Clear interaction state after successful move
        setMoveFrom(null);
        setOptionSquares({});
        return true;
      }
    } catch (e) {
      console.warn("Invalid move attempted", e);
    }
    return false;
  }, [game, updateGameState]);

  // Handle traditional drag and drop
  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    return makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });
  };

  // Logic to show valid move dots when a square is tapped/clicked
  const showMoveOptions = useCallback((square: string) => {
    const moves = game.moves({
      square: square as ChessSquare,
      verbose: true,
    });
    
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, any> = {};
    moves.forEach((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to as ChessSquare) && game.get(move.to as ChessSquare)?.color !== game.get(square as ChessSquare)?.color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 20%, transparent 20%)",
        borderRadius: "50%",
      };
    });
    
    // Highlight the selected square
    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    };
    
    setOptionSquares(newSquares);
    return true;
  }, [game]);

  // Handle square clicks for "Click-to-Move" (best for learning/mobile)
  const onSquareClick = (square: string) => {
    if (!moveFrom) {
      const hasOptions = showMoveOptions(square);
      if (hasOptions) setMoveFrom(square);
      return;
    }

    const moveSucceeded = makeAMove({
      from: moveFrom,
      to: square,
      promotion: "q",
    });

    // If click didn't result in a move, check if the clicked square is another piece we can select
    if (!moveSucceeded) {
      const hasOptions = showMoveOptions(square);
      if (hasOptions) setMoveFrom(square);
      else {
        setMoveFrom(null);
        setOptionSquares({});
      }
    }
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setAdvice(null);
    setMoveHistory([]);
    setCaptured({ w: [], b: [] });
    setMoveFrom(null);
    setOptionSquares({});
  };

  const undoMove = () => {
    const gameCopy = new Chess(game.fen());
    gameCopy.undo();
    setGame(gameCopy);
    updateGameState(gameCopy);
    setAdvice(null);
    setMoveFrom(null);
    setOptionSquares({});
  };

  const pieceIcons: Record<PieceType, string> = {
    p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚'
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-blue-50 p-4 md:p-8">
      <header className="w-full max-w-6xl flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
            <Trophy className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Chess Academy</h1>
            <p className="text-blue-600 text-sm font-medium">Learn and Play!</p>
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
                  <div className="flex gap-1 text-2xl leading-none mt-1">
                    {captured.w.map((p, i) => (
                      <span key={i} className="text-gray-300">{pieceIcons[p]}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className={`px-4 py-1 rounded-full text-sm font-bold ${game.turn() === 'b' ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                {game.turn() === 'b' ? "Black's Turn" : "Wait..."}
              </div>
            </div>

            <div className="w-full aspect-square max-w-[500px] shadow-2xl rounded-lg overflow-hidden border-4 border-blue-600 bg-white">
              <Chessboard 
                id="learningBoard"
                position={game.fen()} 
                onPieceDrop={onDrop}
                onSquareClick={onSquareClick}
                customSquareStyles={optionSquares}
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
                  <div className="flex gap-1 text-2xl leading-none mt-1">
                    {captured.b.map((p, i) => (
                      <span key={i} className="text-blue-600">{pieceIcons[p]}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className={`px-4 py-1 rounded-full text-sm font-bold ${game.turn() === 'w' ? 'bg-blue-600 text-white shadow-lg animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                {game.turn() === 'w' ? "Your Turn!" : "Thinking..."}
              </div>
            </div>
          </div>
          
          {(game.isCheckmate() || game.isDraw()) && (
            <div className="bg-yellow-400 p-4 rounded-2xl flex items-center gap-4 animate-bounce shadow-lg">
              <Trophy className="text-yellow-900 w-8 h-8" />
              <div>
                <h3 className="font-bold text-yellow-900 text-lg">
                  {game.isCheckmate() ? (game.turn() === 'w' ? "Game Over! Black Won" : "Checkmate! You Won!") : "It's a Draw!"}
                </h3>
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
              <h2 className="text-white font-bold text-lg">AI Coach</h2>
              {isCoachThinking && (
                <div className="ml-auto flex gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              )}
            </div>

            <div className="p-6 flex flex-col gap-6 scroll-hide overflow-y-auto max-h-[600px]">
              {advice ? (
                <>
                  <div className="bg-blue-50 p-4 rounded-2xl border-l-4 border-blue-400">
                    <p className="text-gray-700 leading-relaxed italic text-lg">
                      "{advice.explanation}"
                    </p>
                  </div>

                  {advice.suggestedMove && (
                    <div className="flex items-center gap-4 bg-green-50 p-4 rounded-2xl border border-green-200">
                      <div className="bg-green-500 p-2 rounded-lg">
                        <Zap className="text-white w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-green-800 text-xs font-bold uppercase">Try this</p>
                        <p className="text-green-900 font-bold text-xl">{advice.suggestedMove}</p>
                      </div>
                    </div>
                  )}

                  {advice.funFact && (
                    <div className="flex items-start gap-4 bg-yellow-50 p-4 rounded-2xl">
                      <div className="bg-yellow-400 p-2 rounded-lg mt-1">
                        <Info className="text-yellow-900 w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-yellow-900 text-xs font-bold uppercase">Chess Fact</p>
                        <p className="text-yellow-800 text-sm">{advice.funFact}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                    <BrainCircuit className="text-blue-400 w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-gray-400 font-bold text-lg">Make your move!</h3>
                    <p className="text-gray-400 text-sm">I'll help you win!</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="text-gray-500 w-5 h-5" />
                <h3 className="font-bold text-gray-700">Moves</h3>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto scroll-hide">
              {moveHistory.length > 0 ? (
                moveHistory.map((m, i) => (
                  <span 
                    key={i} 
                    className={`px-3 py-1 rounded-lg text-sm font-medium border ${i % 2 === 0 ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}
                  >
                    {Math.floor(i/2) + 1}. {m}
                  </span>
                ))
              ) : (
                <p className="text-gray-400 text-sm italic">Move a piece to start!</p>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-12 text-gray-400 text-sm pb-8 text-center">
        <p>Your child is the next Grandmaster! 🏆</p>
      </footer>
    </div>
  );
};

export default App;