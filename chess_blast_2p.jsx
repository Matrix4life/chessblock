import { useState, useEffect, useCallback, useRef } from "react";

// ─── BLOCK BLAST STYLE SHAPES ────────────────────────────────────────────
const PIECE_TEMPLATES = {
  // Single blocks
  single: { cells: [[0,0]], label: "●", name: "Single" },
  
  // 2-block pieces
  double_h: { cells: [[0,0],[1,0]], label: "■■", name: "Double" },
  double_v: { cells: [[0,0],[0,1]], label: "■■", name: "Double" },
  
  // 3-block pieces - lines
  triple_h: { cells: [[0,0],[1,0],[2,0]], label: "■■■", name: "Triple" },
  triple_v: { cells: [[0,0],[0,1],[0,2]], label: "■■■", name: "Triple" },
  
  // 3-block L shapes
  L_1: { cells: [[0,0],[0,1],[1,1]], label: "L", name: "L-Block" },
  L_2: { cells: [[0,0],[1,0],[0,1]], label: "L", name: "L-Block" },
  L_3: { cells: [[1,0],[0,1],[1,1]], label: "L", name: "L-Block" },
  L_4: { cells: [[0,0],[1,0],[1,1]], label: "L", name: "L-Block" },
  
  // 4-block pieces - lines
  quad_h: { cells: [[0,0],[1,0],[2,0],[3,0]], label: "■■■■", name: "Line" },
  quad_v: { cells: [[0,0],[0,1],[0,2],[0,3]], label: "■■■■", name: "Line" },
  
  // 4-block squares
  square: { cells: [[0,0],[1,0],[0,1],[1,1]], label: "■", name: "Square" },
  
  // 4-block T shapes
  T_1: { cells: [[0,0],[1,0],[2,0],[1,1]], label: "T", name: "T-Block" },
  T_2: { cells: [[1,0],[0,1],[1,1],[1,2]], label: "T", name: "T-Block" },
  T_3: { cells: [[1,0],[0,1],[1,1],[2,1]], label: "T", name: "T-Block" },
  T_4: { cells: [[0,0],[0,1],[1,1],[0,2]], label: "T", name: "T-Block" },
  
  // 4-block Z shapes
  Z_1: { cells: [[0,0],[1,0],[1,1],[2,1]], label: "Z", name: "Z-Block" },
  Z_2: { cells: [[1,0],[0,1],[1,1],[0,2]], label: "Z", name: "Z-Block" },
  S_1: { cells: [[1,0],[2,0],[0,1],[1,1]], label: "S", name: "S-Block" },
  S_2: { cells: [[0,0],[0,1],[1,1],[1,2]], label: "S", name: "S-Block" },
  
  // 4-block L shapes
  L4_1: { cells: [[0,0],[0,1],[0,2],[1,2]], label: "L", name: "L-Block" },
  L4_2: { cells: [[0,0],[1,0],[2,0],[2,1]], label: "L", name: "L-Block" },
  L4_3: { cells: [[0,0],[1,0],[0,1],[0,2]], label: "L", name: "L-Block" },
  L4_4: { cells: [[0,0],[0,1],[1,1],[2,1]], label: "L", name: "L-Block" },
  L4_5: { cells: [[1,0],[1,1],[0,2],[1,2]], label: "L", name: "L-Block" },
  L4_6: { cells: [[0,0],[1,0],[2,0],[0,1]], label: "L", name: "L-Block" },
  L4_7: { cells: [[0,0],[0,1],[1,1],[1,2]], label: "L", name: "L-Block" },
  L4_8: { cells: [[2,0],[0,1],[1,1],[2,1]], label: "L", name: "L-Block" },
  
  // 5-block pieces
  plus: { cells: [[1,0],[0,1],[1,1],[2,1],[1,2]], label: "+", name: "Plus" },
  cross_h: { cells: [[0,0],[1,0],[2,0],[1,1],[1,2]], label: "+", name: "Cross" },
  penta_v: { cells: [[0,0],[0,1],[0,2],[0,3],[0,4]], label: "■", name: "Long" },
  penta_h: { cells: [[0,0],[1,0],[2,0],[3,0],[4,0]], label: "■", name: "Long" },
  
  U_shape: { cells: [[0,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2]], label: "U", name: "U-Block" },
  big_L: { cells: [[0,0],[1,0],[2,0],[0,1],[0,2]], label: "L", name: "Big-L" },
};

const PIECE_KEYS = Object.keys(PIECE_TEMPLATES);
const BOARD_SIZE = 10;

const PLAYERS = {
  white: { name: "White", color: "#e8dcc8", darkColor: "#c4b48e" },
  black: { name: "Black", color: "#3a3220", darkColor: "#2a2218" },
};

function getRandomPiece() {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  return { ...PIECE_TEMPLATES[key], id: Date.now() + Math.random() };
}

function generateTray() {
  return [getRandomPiece(), getRandomPiece(), getRandomPiece()];
}

function canPlace(board, piece, originCol, originRow, player) {
  for (const [dc, dr] of piece.cells) {
    const c = originCol + dc;
    const r = originRow + dr;
    if (c < 0 || c >= BOARD_SIZE || r < 0 || r >= BOARD_SIZE) return false;
    // Can place on empty cells OR on opponent's cells (capture)
    const opponent = player === "white" ? "black" : "white";
    if (board[r][c] !== null && board[r][c] !== opponent) return false;
  }
  return true;
}

function canPlaceAnywhere(board, piece, player) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (canPlace(board, piece, c, r, player)) return true;
    }
  }
  return false;
}

function placePiece(board, piece, originCol, originRow, player) {
  const newBoard = board.map(row => [...row]);
  const opponent = player === "white" ? "black" : "white";
  let capturedCount = 0;
  
  for (const [dc, dr] of piece.cells) {
    const r = originRow + dr;
    const c = originCol + dc;
    if (newBoard[r][c] === opponent) {
      capturedCount++;
    }
    newBoard[r][c] = player;
  }
  
  return { newBoard, capturedCount };
}

function computeClears(board, player) {
  const rows = new Set();
  const cols = new Set();
  
  // Check rows - must be filled with current player's pieces
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (board[r].every(cell => cell === player)) rows.add(r);
  }
  
  // Check columns
  for (let c = 0; c < BOARD_SIZE; c++) {
    let allPlayer = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[r][c] !== player) { allPlayer = false; break; }
    }
    if (allPlayer) cols.add(c);
  }
  
  // Check diagonals
  let diag1 = true, diag2 = true;
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i][i] !== player) diag1 = false;
    if (board[i][BOARD_SIZE - 1 - i] !== player) diag2 = false;
  }
  
  return { rows, cols, diag1, diag2 };
}

function applyClears(board, clears) {
  const newBoard = board.map(row => [...row]);
  const cleared = new Set();
  
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      let shouldClear = false;
      if (clears.rows.has(r)) shouldClear = true;
      if (clears.cols.has(c)) shouldClear = true;
      if (clears.diag1 && r === c) shouldClear = true;
      if (clears.diag2 && r === BOARD_SIZE - 1 - c) shouldClear = true;
      
      if (shouldClear && newBoard[r][c] !== null) {
        cleared.add(`${r}-${c}`);
        newBoard[r][c] = null;
      }
    }
  }
  
  return { newBoard, cleared };
}

function countClearedCells(clears) {
  const cells = new Set();
  for (let r of clears.rows) for (let c = 0; c < BOARD_SIZE; c++) cells.add(`${r}-${c}`);
  for (let c of clears.cols) for (let r = 0; r < BOARD_SIZE; r++) cells.add(`${r}-${c}`);
  if (clears.diag1) for (let i = 0; i < BOARD_SIZE; i++) cells.add(`${i}-${i}`);
  if (clears.diag2) for (let i = 0; i < BOARD_SIZE; i++) cells.add(`${i}-${(BOARD_SIZE-1-i)}`);
  return cells.size;
}

function scoreForClears(clears, piece) {
  const numLines = clears.rows.size + clears.cols.size + (clears.diag1 ? 1 : 0) + (clears.diag2 ? 1 : 0);
  const cellsCleared = countClearedCells(clears);
  const placementPts = piece.cells.length * 5;
  const lineBonus = [0, 100, 300, 600, 1200];
  return placementPts + (lineBonus[Math.min(numLines, 4)] || 1200) + cellsCleared * 10;
}

function canPlaceAnywhere(board, piece) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (canPlace(board, piece, c, r)) return true;
    }
  }
  return false;
}

function emptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function countTerritory(board) {
  let white = 0, black = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === "white") white++;
      if (board[r][c] === "black") black++;
    }
  }
  return { white, black };
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────
function PiecePreview({ piece, onClick, selected, disabled, playerColor }) {
  if (!piece) return <div style={styles.emptySlot} />;
  
  const maxC = Math.max(...piece.cells.map(c => c[0])) + 1;
  const maxR = Math.max(...piece.cells.map(c => c[1])) + 1;
  const grid = Array.from({ length: maxR }, () => Array(maxC).fill(false));
  piece.cells.forEach(([c, r]) => { grid[r][c] = true; });

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        ...styles.pieceSlot,
        border: selected ? `3px solid ${playerColor}` : "2px solid #3a3220",
        boxShadow: selected ? `0 0 20px ${playerColor}aa, inset 0 1px 2px rgba(255,255,255,0.1)` : "inset 0 1px 2px rgba(255,255,255,0.05)",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        background: selected ? "#2a2218" : "#1e1a14",
        transform: selected ? "scale(1.05)" : "scale(1)",
        transition: "all 0.2s ease",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${maxC}, 28px)`, gridTemplateRows: `repeat(${maxR}, 28px)`, gap: 3 }}>
        {grid.map((row, r) =>
          row.map((filled, c) => (
            <div key={`${r}-${c}`} style={{
              width: 28, height: 28, borderRadius: 6,
              background: filled 
                ? `linear-gradient(135deg, ${playerColor} 0%, ${playerColor}cc 100%)`
                : "transparent",
              boxShadow: filled 
                ? `inset 0 2px 4px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(255,255,255,0.2), 0 2px 6px ${playerColor}55` 
                : "none",
              border: filled ? "1px solid rgba(255,255,255,0.25)" : "none",
            }} />
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#1a1610",
    fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
    color: "#e8dcc8",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px 10px",
    position: "relative",
    overflow: "hidden",
  },
  bgPattern: {
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
    backgroundImage: `radial-gradient(circle at 20% 50%, rgba(90,60,20,0.15) 0%, transparent 50%),
                       radial-gradient(circle at 80% 20%, rgba(60,40,80,0.1) 0%, transparent 50%)`,
  },
  header: {
    position: "relative", zIndex: 1,
    textAlign: "center", marginBottom: 16,
  },
  title: {
    fontSize: 34, fontWeight: 400, letterSpacing: 6, textTransform: "uppercase",
    color: "#d4a84b", textShadow: "0 2px 8px rgba(212,168,75,0.3)",
    margin: 0,
  },
  subtitle: {
    fontSize: 11, letterSpacing: 3, color: "#6b5f4a", textTransform: "uppercase", margin: "4px 0 0",
  },
  turnBanner: {
    position: "relative", zIndex: 1,
    padding: "10px 28px",
    borderRadius: 6,
    border: "1px solid #3a3220",
    marginBottom: 12,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
    transition: "all 0.3s ease",
  },
  scoreBar: {
    position: "relative", zIndex: 1,
    display: "flex", gap: 40, marginBottom: 14, alignItems: "center",
  },
  playerScore: {
    textAlign: "center",
  },
  playerName: {
    fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 3,
  },
  scoreValue: {
    fontSize: 24, fontWeight: 300,
  },
  territoryBar: {
    width: 200, height: 20, borderRadius: 4, overflow: "hidden",
    border: "1px solid #3a3220",
    background: "#1a1610",
    display: "flex",
  },
  boardOuter: {
    position: "relative", zIndex: 1,
    background: "#2a2218",
    borderRadius: 8,
    padding: 16,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
    border: "1px solid #3a3220",
  },
  boardGrid: {
    display: "grid",
    gridTemplateColumns: `repeat(${BOARD_SIZE}, 58px)`,
    gridTemplateRows: `repeat(${BOARD_SIZE}, 58px)`,
  },
  trayContainer: {
    position: "relative", zIndex: 1,
    display: "flex", gap: 12, marginTop: 20, justifyContent: "center",
  },
  pieceSlot: {
    background: "#1e1a14",
    borderRadius: 8,
    padding: 12,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    minWidth: 110, minHeight: 100,
    transition: "all 0.2s ease",
  },
  emptySlot: {
    minWidth: 110, minHeight: 100,
    borderRadius: 8,
    border: "2px dashed #3a3220",
    background: "#1a1610",
  },
  instruction: {
    position: "relative", zIndex: 1,
    fontSize: 11, color: "#6b5f4a", letterSpacing: 2, textTransform: "uppercase",
    marginTop: 12, textAlign: "center",
  },
  overlay: {
    position: "fixed", inset: 0, zIndex: 100,
    background: "rgba(0,0,0,0.8)",
    display: "flex", alignItems: "center", justifyContent: "center",
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "#2a2218",
    border: "1px solid #4a4030",
    borderRadius: 12,
    padding: "36px 44px",
    textAlign: "center",
    boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
    maxWidth: 400,
    width: "90%",
  },
  modalTitle: {
    fontSize: 26, color: "#d4a84b", letterSpacing: 4, textTransform: "uppercase", marginBottom: 16, fontWeight: 300,
  },
  modalBtn: {
    marginTop: 20, padding: "10px 32px",
    background: "transparent", border: "1px solid #d4a84b", color: "#d4a84b",
    borderRadius: 4, fontSize: 12, letterSpacing: 3, textTransform: "uppercase",
    cursor: "pointer", fontFamily: "inherit",
    transition: "all 0.2s",
  },
  passBtn: {
    padding: "8px 24px",
    background: "transparent", 
    border: "1px solid #8a7e6a", 
    color: "#8a7e6a",
    borderRadius: 4, 
    fontSize: 11, 
    letterSpacing: 2, 
    textTransform: "uppercase",
    cursor: "pointer", 
    fontFamily: "inherit",
    transition: "all 0.2s",
    marginTop: 12,
  },
};

export default function ChessBlast2P() {
  const [board, setBoard] = useState(emptyBoard());
  const [whiteTray, setWhiteTray] = useState(generateTray);
  const [blackTray, setBlackTray] = useState(generateTray);
  const [currentPlayer, setCurrentPlayer] = useState("white");
  const [selected, setSelected] = useState(null);
  const [whiteScore, setWhiteScore] = useState(0);
  const [blackScore, setBlackScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [highlightCells, setHighlightCells] = useState(null);
  const [clearingCells, setClearingCells] = useState(null);
  const [showModeSelect, setShowModeSelect] = useState(true);
  const [gameMode, setGameMode] = useState(null); // 'pvp' or 'ai'
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiThinking, setAiThinking] = useState(false);
  const [cursorPos, setCursorPos] = useState(null);
  const [capturedCells, setCapturedCells] = useState(null);
  const [whiteCaptures, setWhiteCaptures] = useState(0);
  const [blackCaptures, setBlackCaptures] = useState(0);

  const tray = currentPlayer === "white" ? whiteTray : blackTray;
  const setTray = currentPlayer === "white" ? setWhiteTray : setBlackTray;
  const playerColor = PLAYERS[currentPlayer].color;

  // AI Logic
  function evaluateMove(board, piece, col, row, player) {
    const { newBoard, capturedCount } = placePiece(board, piece, col, row, player);
    const clears = computeClears(newBoard, player);
    const opponent = player === "white" ? "black" : "white";
    
    // Score components
    let score = 0;
    
    // Big bonus for captures
    score += capturedCount * 25;
    
    // Points from clearing
    const numLines = clears.rows.size + clears.cols.size + (clears.diag1 ? 1 : 0) + (clears.diag2 ? 1 : 0);
    score += scoreForClears(clears, piece);
    
    // Bonus for blocking opponent's potential lines
    for (let r = 0; r < BOARD_SIZE; r++) {
      let opponentCount = 0, myCount = 0, empty = 0;
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (newBoard[r][c] === opponent) opponentCount++;
        else if (newBoard[r][c] === player) myCount++;
        else empty++;
      }
      // Block opponent lines that are close to complete
      if (opponentCount >= 5 && myCount > 0) score += 30;
    }
    
    for (let c = 0; c < BOARD_SIZE; c++) {
      let opponentCount = 0, myCount = 0, empty = 0;
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (newBoard[r][c] === opponent) opponentCount++;
        else if (newBoard[r][c] === player) myCount++;
        else empty++;
      }
      if (opponentCount >= 5 && myCount > 0) score += 30;
    }
    
    // Bonus for center control
    const centerDist = Math.abs(col - 4.5) + Math.abs(row - 4.5);
    score += (9 - centerDist) * 2;
    
    // Bonus for setting up future lines
    for (let r = 0; r < BOARD_SIZE; r++) {
      let myCount = 0;
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (newBoard[r][c] === player) myCount++;
      }
      if (myCount >= 5) score += myCount * 5;
    }
    
    return score;
  }

  function findBestAiMove(board, tray, player, difficulty) {
    const moves = [];
    
    for (let pieceIdx = 0; pieceIdx < tray.length; pieceIdx++) {
      const piece = tray[pieceIdx];
      if (!piece) continue;
      
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (canPlace(board, piece, c, r, player)) {
            const score = evaluateMove(board, piece, c, r, player);
            moves.push({ pieceIdx, col: c, row: r, score });
          }
        }
      }
    }
    
    if (moves.length === 0) return null;
    
    // Sort by score
    moves.sort((a, b) => b.score - a.score);
    
    // Difficulty adjustment
    let chosenMove;
    if (difficulty === "easy") {
      // Pick from bottom 40% of moves
      const startIdx = Math.floor(moves.length * 0.6);
      const idx = startIdx + Math.floor(Math.random() * (moves.length - startIdx));
      chosenMove = moves[idx];
    } else if (difficulty === "medium") {
      // Pick from top 50%, with some randomness
      const topHalf = moves.slice(0, Math.max(1, Math.floor(moves.length * 0.5)));
      chosenMove = topHalf[Math.floor(Math.random() * topHalf.length)];
    } else {
      // Hard - always best move
      chosenMove = moves[0];
    }
    
    return chosenMove;
  }

  function executeAiMove() {
    if (gameOver || currentPlayer === "white" || gameMode !== "ai") return;
    
    setAiThinking(true);
    
    const thinkingTime = aiDifficulty === "easy" ? 800 : aiDifficulty === "medium" ? 1200 : 1500;
    
    setTimeout(() => {
      const move = findBestAiMove(board, blackTray, "black", aiDifficulty);
      
      if (!move) {
        // No valid moves, end turn
        setAiThinking(false);
        const freshTray = generateTray();
        setBlackTray(freshTray);
        setCurrentPlayer("white");
        return;
      }
      
      const piece = blackTray[move.pieceIdx];
      const { newBoard, capturedCount } = placePiece(board, piece, move.col, move.row, "black");
      const newTray = [...blackTray];
      newTray[move.pieceIdx] = null;
      
      // Track captures
      if (capturedCount > 0) {
        setBlackCaptures(prev => prev + capturedCount);
        const captureCells = new Set();
        piece.cells.forEach(([dc, dr]) => {
          const r = move.row + dr;
          const c = move.col + dc;
          if (board[r][c] === "white") {
            captureCells.add(`${r}-${c}`);
          }
        });
        setCapturedCells(captureCells);
      }
      
      const clears = computeClears(newBoard, "black");
      const numLines = clears.rows.size + clears.cols.size + (clears.diag1 ? 1 : 0) + (clears.diag2 ? 1 : 0);
      const pts = scoreForClears(clears, piece) + (capturedCount * 15);
      
      setBlackScore(prev => prev + pts);
      
      if (numLines > 0) {
        const clearCells = new Set();
        clears.rows.forEach(row => { for (let i = 0; i < BOARD_SIZE; i++) clearCells.add(`${row}-${i}`); });
        clears.cols.forEach(col => { for (let i = 0; i < BOARD_SIZE; i++) clearCells.add(`${i}-${col}`); });
        if (clears.diag1) for (let i = 0; i < BOARD_SIZE; i++) clearCells.add(`${i}-${i}`);
        if (clears.diag2) for (let i = 0; i < BOARD_SIZE; i++) clearCells.add(`${i}-${(BOARD_SIZE-1-i)}`);
        
        setBoard(newBoard);
        setBlackTray(newTray);
        setClearingCells(clearCells);
        setAiThinking(false);
        
        setTimeout(() => {
          const { newBoard: cleared } = applyClears(newBoard, clears);
          setBoard(cleared);
          setClearingCells(null);
          setCapturedCells(null);
          setBlackTray(newTray);
          
          // Check if all pieces used
          if (newTray.every(p => p === null)) {
            const freshTray = generateTray();
            setBlackTray(freshTray);
            setCurrentPlayer("white");
          }
          // AI will continue playing if it has pieces left
        }, 600);
      } else {
        setBoard(newBoard);
        setBlackTray(newTray);
        setAiThinking(false);
        
        setTimeout(() => {
          setCapturedCells(null);
        }, 400);
        
        // Check if all pieces used
        if (newTray.every(p => p === null)) {
          const freshTray = generateTray();
          setBlackTray(freshTray);
          setCurrentPlayer("white");
        }
        // AI will continue playing if it has pieces left
      }
    }, thinkingTime);
  }

  // Trigger AI move when it's AI's turn
  useEffect(() => {
    if (gameMode === "ai" && currentPlayer === "black" && !gameOver && !clearingCells && !aiThinking) {
      executeAiMove();
    }
  }, [currentPlayer, gameMode, gameOver, clearingCells, blackTray, aiThinking]);

  // Count territory
  const territory = countTerritory(board);
  const totalCells = territory.white + territory.black;
  const whitePercent = totalCells > 0 ? (territory.white / totalCells) * 100 : 50;

  const handleTrayClick = (i) => {
    if (gameOver || tray[i] === null || aiThinking) return;
    if (gameMode === "ai" && currentPlayer === "black") return; // Can't control AI pieces
    setSelected(prev => prev === i ? null : i);
    setHighlightCells(null);
  };

  const handleCellHover = useCallback((c, r, e) => {
    if (selected === null) {
      setCursorPos(null);
      return;
    }
    const piece = tray[selected];
    if (!piece) {
      setCursorPos(null);
      return;
    }
    
    const cells = new Map();
    const valid = canPlace(board, piece, c, r, currentPlayer);
    
    for (const [dc, dr] of piece.cells) {
      cells.set(`${r + dr}-${c + dc}`, valid);
    }
    
    setHighlightCells(cells);
    
    if (e) {
      setCursorPos({ x: e.clientX, y: e.clientY, piece, valid });
    }
  }, [selected, tray, board, currentPlayer]);

  const handleCellClick = (c, r) => {
    if (gameOver || selected === null || aiThinking) return;
    if (gameMode === "ai" && currentPlayer === "black") return; // Can't place during AI turn
    const piece = tray[selected];
    if (!piece || !canPlace(board, piece, c, r, currentPlayer)) return;

    // Place piece and check captures
    const { newBoard, capturedCount } = placePiece(board, piece, c, r, currentPlayer);
    const newTray = [...tray];
    newTray[selected] = null;

    // Track captures with visual feedback
    if (capturedCount > 0) {
      if (currentPlayer === "white") {
        setWhiteCaptures(prev => prev + capturedCount);
      } else {
        setBlackCaptures(prev => prev + capturedCount);
      }
      
      const opponent = currentPlayer === "white" ? "black" : "white";
      const captureCells = new Set();
      piece.cells.forEach(([dc, dr]) => {
        const cellR = r + dr;
        const cellC = c + dc;
        if (board[cellR][cellC] === opponent) {
          captureCells.add(`${cellR}-${cellC}`);
        }
      });
      setCapturedCells(captureCells);
    }

    // Check clears for current player
    const clears = computeClears(newBoard, currentPlayer);
    const numLines = clears.rows.size + clears.cols.size + (clears.diag1 ? 1 : 0) + (clears.diag2 ? 1 : 0);
    const pts = scoreForClears(clears, piece) + (capturedCount * 15); // Bonus for captures

    if (currentPlayer === "white") {
      setWhiteScore(prev => prev + pts);
    } else {
      setBlackScore(prev => prev + pts);
    }

    setSelected(null);
    setHighlightCells(null);
    setCursorPos(null);

    if (numLines > 0) {
      // Show clearing animation
      const clearCells = new Set();
      clears.rows.forEach(row => { for (let i = 0; i < BOARD_SIZE; i++) clearCells.add(`${row}-${i}`); });
      clears.cols.forEach(col => { for (let i = 0; i < BOARD_SIZE; i++) clearCells.add(`${i}-${col}`); });
      if (clears.diag1) for (let i = 0; i < BOARD_SIZE; i++) clearCells.add(`${i}-${i}`);
      if (clears.diag2) for (let i = 0; i < BOARD_SIZE; i++) clearCells.add(`${i}-${(BOARD_SIZE-1-i)}`);

      setBoard(newBoard);
      setTray(newTray);
      setClearingCells(clearCells);

      setTimeout(() => {
        const { newBoard: cleared } = applyClears(newBoard, clears);
        setBoard(cleared);
        setClearingCells(null);
        setCapturedCells(null);
        
        // Only update tray, don't switch turns yet
        setTray(newTray);
        
        // Check if all pieces used
        if (newTray.every(p => p === null)) {
          // Refill and switch turn
          const freshTray = generateTray();
          setTray(freshTray);
          setCurrentPlayer(prev => prev === "white" ? "black" : "white");
        }
      }, 600);
    } else {
      setBoard(newBoard);
      setTray(newTray);
      
      // Clear capture animation after short delay
      setTimeout(() => {
        setCapturedCells(null);
      }, 400);
      
      // Check if all pieces used
      if (newTray.every(p => p === null)) {
        // Refill and switch turn
        const freshTray = generateTray();
        setTray(freshTray);
        setCurrentPlayer(prev => prev === "white" ? "black" : "white");
      }
    }
  };

  const passTurn = () => {
    if (gameOver || aiThinking) return;
    if (gameMode === "ai" && currentPlayer === "black") return; // Can't skip AI turn
    setSelected(null);
    setHighlightCells(null);
    setCursorPos(null);
  };

  // Check if current player can move
  const canMove = tray.some(p => p && canPlaceAnywhere(board, p, currentPlayer));

  // Check game over
  useEffect(() => {
    if (gameOver) return;
    
    const whiteCan = whiteTray.some(p => p && canPlaceAnywhere(board, p, "white"));
    const blackCan = blackTray.some(p => p && canPlaceAnywhere(board, p, "black"));
    
    if (!whiteCan && !blackCan) {
      setGameOver(true);
      // Determine winner by score
      if (whiteScore > blackScore) setWinner("white");
      else if (blackScore > whiteScore) setWinner("black");
      else setWinner("draw");
    }
  }, [board, whiteTray, blackTray, gameOver, whiteScore, blackScore]);

  const restart = () => {
    setBoard(emptyBoard());
    setWhiteTray(generateTray());
    setBlackTray(generateTray());
    setCurrentPlayer("white");
    setSelected(null);
    setWhiteScore(0);
    setBlackScore(0);
    setWhiteCaptures(0);
    setBlackCaptures(0);
    setGameOver(false);
    setWinner(null);
    setHighlightCells(null);
    setClearingCells(null);
    setCapturedCells(null);
    setShowModeSelect(true);
    setGameMode(null);
    setAiThinking(false);
  };

  const startGame = (mode, difficulty = "medium") => {
    setGameMode(mode);
    setAiDifficulty(difficulty);
    setShowModeSelect(false);
  };

  const boardWithHover = (
    <div style={styles.boardGrid}>
      {board.map((row, r) =>
        row.map((cell, c) => {
          const isLight = (r + c) % 2 === 0;
          const highlightInfo = highlightCells && highlightCells.get(`${r}-${c}`);
          const isHighlight = highlightInfo !== undefined;
          const isValidPlacement = highlightInfo === true;
          const isInvalidPlacement = highlightInfo === false;
          const isClearing = clearingCells && clearingCells.has(`${r}-${c}`);
          const isCaptured = capturedCells && capturedCells.has(`${r}-${c}`);
          
          let bgColor;
          if (isClearing) {
            bgColor = "#fff";
          } else if (isCaptured) {
            bgColor = "#ff6b6b"; // Red flash for captures
          } else if (cell === "white") {
            bgColor = PLAYERS.white.color;
          } else if (cell === "black") {
            bgColor = PLAYERS.black.color;
          } else if (isValidPlacement) {
            // Green tint for valid placement
            bgColor = isLight ? "#b8d4a0" : "#9ab880";
          } else if (isInvalidPlacement) {
            // Red tint for invalid placement
            bgColor = isLight ? "#d4a0a0" : "#b88080";
          } else if (isHighlight) {
            bgColor = isLight ? "#c8b888" : "#b09a70";
          } else {
            bgColor = isLight ? "#f0e8d8" : "#c4b48e";
          }

          return (
            <div
              key={`${r}-${c}`}
              onClick={() => handleCellClick(c, r)}
              onMouseEnter={(e) => handleCellHover(c, r, e)}
              onMouseLeave={() => { setHighlightCells(null); setCursorPos(null); }}
              style={{
                width: 58, height: 58,
                background: bgColor,
                border: "1px solid #8a7e6a44",
                cursor: selected ? "crosshair" : "default",
                transition: "background 0.12s ease",
                boxShadow: cell && !isClearing ? `inset 0 2px 4px rgba(0,0,0,0.35)` : "none",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {cell && !isClearing && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: cell === "white" 
                    ? `linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)`
                    : `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)`,
                }} />
              )}
              {isValidPlacement && !cell && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: `radial-gradient(circle, rgba(100,200,100,0.4) 0%, transparent 70%)`,
                  border: "2px solid rgba(100,200,100,0.6)",
                  borderRadius: 4,
                }} />
              )}
              {isInvalidPlacement && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: `radial-gradient(circle, rgba(200,100,100,0.3) 0%, transparent 70%)`,
                  border: "2px solid rgba(200,100,100,0.5)",
                  borderRadius: 4,
                }} />
              )}
              {isCaptured && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "radial-gradient(circle, #ff4444 0%, #ff8888 60%, transparent 100%)",
                  animation: "captureFlash 0.4s ease-out",
                }} />
              )}
              {isClearing && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "radial-gradient(circle, #fff 0%, #ffd54f 60%, transparent 100%)",
                  animation: "pulse 0.5s ease-out",
                }} />
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div style={styles.root}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.3); }
        }
        @keyframes captureFlash {
          0% { opacity: 1; }
          50% { opacity: 0.8; }
          100% { opacity: 0; }
        }
        @keyframes thinking {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: #1a1610; }
      `}</style>
      <div style={styles.bgPattern} />

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Block Duel</h1>
        <p style={styles.subtitle}>Strategic Block Placement Battle</p>
      </div>

      {/* Turn Banner */}
      <div style={{
        ...styles.turnBanner,
        background: currentPlayer === "white" ? "#e8dcc822" : "#3a322044",
        borderColor: playerColor,
        color: playerColor,
      }}>
        {aiThinking ? (
          <span>
            AI is thinking
            <span style={{ animation: "thinking 1.5s ease-in-out infinite", display: "inline-block", marginLeft: 4 }}>...</span>
          </span>
        ) : (
          `${PLAYERS[currentPlayer].name}'s Turn`
        )}
      </div>

      {/* Score Bar */}
      <div style={styles.scoreBar}>
        <div style={styles.playerScore}>
          <div style={{ ...styles.playerName, color: PLAYERS.white.color }}>White</div>
          <div style={{ ...styles.scoreValue, color: PLAYERS.white.color }}>{whiteScore}</div>
          <div style={{ fontSize: 9, color: "#8a7e6a", marginTop: 2 }}>
            {whiteCaptures} captured
          </div>
        </div>
        
        <div>
          <div style={{ fontSize: 9, color: "#6b5f4a", letterSpacing: 1, marginBottom: 4, textAlign: "center" }}>TERRITORY</div>
          <div style={styles.territoryBar}>
            <div style={{ 
              width: `${whitePercent}%`, 
              background: PLAYERS.white.color,
              transition: "width 0.3s ease",
            }} />
            <div style={{ 
              width: `${100 - whitePercent}%`, 
              background: PLAYERS.black.color,
              transition: "width 0.3s ease",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 9, color: "#6b5f4a" }}>
            <span>{territory.white}</span>
            <span>{territory.black}</span>
          </div>
        </div>

        <div style={styles.playerScore}>
          <div style={{ ...styles.playerName, color: PLAYERS.black.color }}>Black</div>
          <div style={{ ...styles.scoreValue, color: PLAYERS.black.darkColor }}>{blackScore}</div>
          <div style={{ fontSize: 9, color: "#8a7e6a", marginTop: 2 }}>
            {blackCaptures} captured
          </div>
        </div>
      </div>

      {/* Board */}
      <div style={styles.boardOuter}>
        <div style={{ display: "flex" }}>
          <div style={{ display: "flex", flexDirection: "column", width: 20, paddingRight: 4 }}>
            {Array.from({ length: BOARD_SIZE }, (_, i) => (
              <div key={i} style={{ height: 58, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#6b5f4a", fontFamily: "serif" }}>
                {BOARD_SIZE - i}
              </div>
            ))}
          </div>
          {boardWithHover}
        </div>
        <div style={{ display: "flex", marginLeft: 20, marginTop: 4 }}>
          {Array.from({ length: BOARD_SIZE }, (_, i) => (
            <div key={i} style={{ width: 58, textAlign: "center", fontSize: 10, color: "#6b5f4a", fontFamily: "serif" }}>
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>
      </div>

      {/* Current Player's Tray */}
      <div style={styles.trayContainer}>
        {tray.map((piece, i) => (
          <PiecePreview
            key={piece ? piece.id : `empty-${i}`}
            piece={piece}
            onClick={() => handleTrayClick(i)}
            selected={selected === i}
            disabled={gameOver}
            playerColor={playerColor}
          />
        ))}
      </div>

      {/* Instruction */}
      <div style={styles.instruction}>
        {aiThinking
          ? "AI is calculating its move..."
          : selected !== null
            ? "Click the board to place your piece"
            : canMove 
              ? gameMode === "ai" && currentPlayer === "black" 
                ? "AI's turn" 
                : `Select a piece • ${tray.filter(p => p !== null).length} remaining`
              : "No valid moves — End turn"}
      </div>

      {/* End Turn / Pass Button */}
      {!gameOver && !aiThinking && !(gameMode === "ai" && currentPlayer === "black") && (
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button 
            style={{
              ...styles.passBtn,
              background: "#d4a84b22",
              borderColor: "#d4a84b",
              color: "#d4a84b",
              fontWeight: 500,
            }}
            onMouseEnter={e => { e.target.style.background = "#d4a84b"; e.target.style.color = "#1a1610"; }}
            onMouseLeave={e => { e.target.style.background = "#d4a84b22"; e.target.style.color = "#d4a84b"; }}
            onClick={() => {
              // End turn early and give new pieces
              setSelected(null);
              setHighlightCells(null);
              setCursorPos(null);
              const freshTray = generateTray();
              setTray(freshTray);
              setCurrentPlayer(prev => prev === "white" ? "black" : "white");
            }}
          >
            End Turn
          </button>
          
          <button 
            style={styles.passBtn}
            onMouseEnter={e => { e.target.style.borderColor = "#c4b48e"; e.target.style.color = "#c4b48e"; }}
            onMouseLeave={e => { e.target.style.borderColor = "#8a7e6a"; e.target.style.color = "#8a7e6a"; }}
            onClick={passTurn}
          >
            Skip Piece
          </button>
        </div>
      )}

      {/* Mode Selection Modal */}
      {showModeSelect && (
        <div style={styles.overlay}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalTitle}>Block Duel</div>
            <div style={{ fontSize: 12, color: "#8a7e6a", letterSpacing: 2, marginBottom: 24 }}>Choose Game Mode</div>
            
            <button 
              style={{
                ...styles.modalBtn,
                marginBottom: 12,
                width: "100%",
                padding: "14px 24px",
              }}
              onMouseEnter={e => { e.target.style.background = "#d4a84b"; e.target.style.color = "#1a1610"; }}
              onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#d4a84b"; }}
              onClick={() => startGame("pvp")}
            >
              Player vs Player
            </button>

            <div style={{ fontSize: 11, color: "#6b5f4a", letterSpacing: 1, margin: "16px 0 8px" }}>VS COMPUTER</div>
            
            <button 
              style={{
                ...styles.modalBtn,
                marginBottom: 8,
                width: "100%",
                padding: "12px 24px",
                fontSize: 11,
              }}
              onMouseEnter={e => { e.target.style.background = "#8ba6c7"; e.target.style.color = "#1a1610"; e.target.style.borderColor = "#8ba6c7"; }}
              onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#d4a84b"; e.target.style.borderColor = "#d4a84b"; }}
              onClick={() => startGame("ai", "easy")}
            >
              Easy AI
            </button>

            <button 
              style={{
                ...styles.modalBtn,
                marginBottom: 8,
                width: "100%",
                padding: "12px 24px",
                fontSize: 11,
              }}
              onMouseEnter={e => { e.target.style.background = "#d4a84b"; e.target.style.color = "#1a1610"; }}
              onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#d4a84b"; }}
              onClick={() => startGame("ai", "medium")}
            >
              Medium AI
            </button>

            <button 
              style={{
                ...styles.modalBtn,
                marginBottom: 0,
                width: "100%",
                padding: "12px 24px",
                fontSize: 11,
              }}
              onMouseEnter={e => { e.target.style.background = "#c47a5a"; e.target.style.color = "#1a1610"; e.target.style.borderColor = "#c47a5a"; }}
              onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#d4a84b"; e.target.style.borderColor = "#d4a84b"; }}
              onClick={() => startGame("ai", "hard")}
            >
              Hard AI
            </button>

            <div style={{ 
              fontSize: 10, 
              color: "#6b5f4a", 
              lineHeight: 1.6, 
              marginTop: 24,
              padding: "12px",
              background: "#1a161022",
              borderRadius: 4,
              border: "1px solid #3a322033",
            }}>
              <strong style={{ color: "#8a7e6a" }}>Rules:</strong> Use all 3 pieces per turn. Capture opponent's blocks by placing over them! Fill rows, columns, or diagonals with your color to clear them. Click "End Turn" for new pieces. Highest score wins!
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameOver && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalTitle}>
              {winner === "draw" 
                ? "Draw!" 
                : gameMode === "ai"
                  ? winner === "white" ? "You Win!" : "AI Wins!"
                  : `${PLAYERS[winner].name} Wins!`
              }
            </div>
            
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#6b5f4a", letterSpacing: 2, marginBottom: 6 }}>
                    {gameMode === "ai" ? "YOU" : "WHITE"}
                  </div>
                  <div style={{ fontSize: 32, color: PLAYERS.white.color, fontWeight: 300 }}>{whiteScore}</div>
                  <div style={{ fontSize: 10, color: "#6b5f4a", marginTop: 4 }}>{territory.white} cells</div>
                </div>
                <div style={{ width: 1, background: "#3a3220" }} />
                <div>
                  <div style={{ fontSize: 11, color: "#6b5f4a", letterSpacing: 2, marginBottom: 6 }}>
                    {gameMode === "ai" ? "AI" : "BLACK"}
                  </div>
                  <div style={{ fontSize: 32, color: PLAYERS.black.darkColor, fontWeight: 300 }}>{blackScore}</div>
                  <div style={{ fontSize: 10, color: "#6b5f4a", marginTop: 4 }}>{territory.black} cells</div>
                </div>
              </div>
            </div>

            <button
              style={styles.modalBtn}
              onMouseEnter={e => { e.target.style.background = "#d4a84b"; e.target.style.color = "#1a1610"; }}
              onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#d4a84b"; }}
              onClick={restart}
            >
              New Game
            </button>
          </div>
        </div>
      )}

      {/* Floating Cursor Piece Preview */}
      {cursorPos && selected !== null && (
        <div style={{
          position: "fixed",
          left: cursorPos.x + 12,
          top: cursorPos.y + 12,
          pointerEvents: "none",
          zIndex: 1000,
          opacity: 0.85,
        }}>
          <div style={{
            background: cursorPos.valid ? "#2a2218dd" : "#3a1818dd",
            border: `2px solid ${cursorPos.valid ? playerColor : "#c47a5a"}`,
            borderRadius: 6,
            padding: 6,
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
          }}>
            {(() => {
              const piece = cursorPos.piece;
              const maxC = Math.max(...piece.cells.map(c => c[0])) + 1;
              const maxR = Math.max(...piece.cells.map(c => c[1])) + 1;
              const grid = Array.from({ length: maxR }, () => Array(maxC).fill(false));
              piece.cells.forEach(([c, r]) => { grid[r][c] = true; });
              
              return (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${maxC}, 22px)`, gridTemplateRows: `repeat(${maxR}, 22px)`, gap: 2 }}>
                  {grid.map((row, r) =>
                    row.map((filled, c) => (
                      <div key={`${r}-${c}`} style={{
                        width: 22, height: 22, borderRadius: 3,
                        background: filled ? playerColor : "transparent",
                        boxShadow: filled ? `inset 0 2px 3px rgba(0,0,0,0.4), 0 1px 2px ${playerColor}44` : "none",
                        border: filled ? "1px solid rgba(255,255,255,0.2)" : "none",
                      }} />
                    ))
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
