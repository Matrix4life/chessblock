import { useState, useEffect, useCallback } from "react";

// ─── BLOCK BLAST STYLE SHAPES ────────────────────────────────────────────
const PIECE_TEMPLATES = {
  single: { cells: [[0,0]], label: "●" },
  double_h: { cells: [[0,0],[1,0]], label: "■■" },
  double_v: { cells: [[0,0],[0,1]], label: "■■" },
  triple_h: { cells: [[0,0],[1,0],[2,0]], label: "■■■" },
  triple_v: { cells: [[0,0],[0,1],[0,2]], label: "■■■" },
  L_1: { cells: [[0,0],[0,1],[1,1]], label: "L" },
  L_2: { cells: [[0,0],[1,0],[0,1]], label: "L" },
  L_3: { cells: [[1,0],[0,1],[1,1]], label: "L" },
  L_4: { cells: [[0,0],[1,0],[1,1]], label: "L" },
  quad_h: { cells: [[0,0],[1,0],[2,0],[3,0]], label: "■■■■" },
  quad_v: { cells: [[0,0],[0,1],[0,2],[0,3]], label: "■■■■" },
  square: { cells: [[0,0],[1,0],[0,1],[1,1]], label: "■" },
  T_1: { cells: [[0,0],[1,0],[2,0],[1,1]], label: "T" },
  T_2: { cells: [[1,0],[0,1],[1,1],[1,2]], label: "T" },
  T_3: { cells: [[1,0],[0,1],[1,1],[2,1]], label: "T" },
  T_4: { cells: [[0,0],[0,1],[1,1],[0,2]], label: "T" },
  Z_1: { cells: [[0,0],[1,0],[1,1],[2,1]], label: "Z" },
  Z_2: { cells: [[1,0],[0,1],[1,1],[0,2]], label: "Z" },
  S_1: { cells: [[1,0],[2,0],[0,1],[1,1]], label: "S" },
  S_2: { cells: [[0,0],[0,1],[1,1],[1,2]], label: "S" },
  L4_1: { cells: [[0,0],[0,1],[0,2],[1,2]], label: "L" },
  L4_2: { cells: [[0,0],[1,0],[2,0],[2,1]], label: "L" },
  L4_3: { cells: [[0,0],[1,0],[0,1],[0,2]], label: "L" },
  L4_4: { cells: [[0,0],[0,1],[1,1],[2,1]], label: "L" },
  plus: { cells: [[1,0],[0,1],[1,1],[2,1],[1,2]], label: "+" },
};

const PIECE_KEYS = Object.keys(PIECE_TEMPLATES);
const BOARD_SIZE = 10;

function getRandomPiece() {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  return { ...PIECE_TEMPLATES[key], id: Date.now() + Math.random() };
}

function generateTray(count = 3) {
  return Array.from({ length: count }, () => getRandomPiece());
}

function canPlace(board, piece, originCol, originRow, player) {
  for (const [dc, dr] of piece.cells) {
    const c = originCol + dc;
    const r = originRow + dr;
    if (c < 0 || c >= BOARD_SIZE || r < 0 || r >= BOARD_SIZE) return false;
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
    if (newBoard[r][c] === opponent) capturedCount++;
    newBoard[r][c] = player;
  }
  
  return { newBoard, capturedCount };
}

function computeClears(board, player) {
  const rows = new Set();
  const cols = new Set();
  
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (board[r].every(cell => cell === player)) rows.add(r);
  }
  
  for (let c = 0; c < BOARD_SIZE; c++) {
    let allPlayer = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[r][c] !== player) { allPlayer = false; break; }
    }
    if (allPlayer) cols.add(c);
  }
  
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

function emptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────
function PiecePreview({ piece, onClick, selected, disabled, playerColor, small }) {
  if (!piece) return <div style={small ? styles.emptySlotSmall : styles.emptySlot} />;
  
  const maxC = Math.max(...piece.cells.map(c => c[0])) + 1;
  const maxR = Math.max(...piece.cells.map(c => c[1])) + 1;
  const grid = Array.from({ length: maxR }, () => Array(maxC).fill(false));
  piece.cells.forEach(([c, r]) => { grid[r][c] = true; });
  
  const cellSize = small ? 18 : 26;
  const gap = small ? 2 : 3;

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        ...(small ? styles.pieceSlotSmall : styles.pieceSlot),
        border: selected ? `3px solid ${playerColor}` : "2px solid #3a3220",
        boxShadow: selected ? `0 0 20px ${playerColor}aa` : "none",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        background: selected ? "#2a2218" : "#1e1a14",
        transform: selected ? "scale(1.05)" : "scale(1)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${maxC}, ${cellSize}px)`, gridTemplateRows: `repeat(${maxR}, ${cellSize}px)`, gap }}>
        {grid.map((row, r) =>
          row.map((filled, c) => (
            <div key={`${r}-${c}`} style={{
              width: cellSize, height: cellSize, borderRadius: small ? 4 : 6,
              background: filled ? `linear-gradient(135deg, ${playerColor} 0%, ${playerColor}cc 100%)` : "transparent",
              boxShadow: filled ? `inset 0 2px 3px rgba(0,0,0,0.3), 0 2px 4px ${playerColor}55` : "none",
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
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#e8dcc8",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "12px",
    position: "relative",
  },
  header: {
    textAlign: "center", marginBottom: 8, width: "100%", maxWidth: 650,
  },
  title: {
    fontSize: 24, fontWeight: 600, letterSpacing: 2,
    color: "#d4a84b", margin: 0,
  },
  subtitle: {
    fontSize: 10, letterSpacing: 2, color: "#6b5f4a", textTransform: "uppercase", margin: "4px 0 0",
  },
  statsRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    width: "100%", maxWidth: 650, marginBottom: 8, gap: 8,
  },
  playerStat: {
    flex: 1, textAlign: "center", background: "#2a2218", borderRadius: 8, padding: "8px 12px",
    border: "1px solid #3a3220",
  },
  playerName: {
    fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4,
  },
  captureValue: {
    fontSize: 28, fontWeight: 300,
  },
  timerBox: {
    background: "#2a2218", borderRadius: 8, padding: "8px 16px",
    border: "1px solid #3a3220", minWidth: 100, textAlign: "center",
  },
  boardOuter: {
    background: "#2a2218",
    borderRadius: 8,
    padding: 8,
    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
    border: "1px solid #3a3220",
    width: "100%",
    maxWidth: 650,
    margin: "0 auto",
  },
  boardGrid: {
    display: "grid",
    gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
    gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
    gap: 1,
    aspectRatio: "1/1",
    maxWidth: 600,
    margin: "0 auto",
  },
  trayContainer: {
    display: "flex", gap: 8, marginTop: 12, justifyContent: "center", flexWrap: "wrap",
    width: "100%", maxWidth: 650,
  },
  pieceSlot: {
    background: "#1e1a14",
    borderRadius: 8,
    padding: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    minWidth: 90, minHeight: 85,
    transition: "all 0.2s ease",
  },
  emptySlot: {
    minWidth: 90, minHeight: 85,
    borderRadius: 8,
    border: "2px dashed #3a3220",
    background: "#1a1610",
  },
  pieceSlotSmall: {
    background: "#1e1a14",
    borderRadius: 6,
    padding: 6,
    display: "flex", alignItems: "center", justifyContent: "center",
    minWidth: 60, minHeight: 55,
    transition: "all 0.2s ease",
  },
  emptySlotSmall: {
    minWidth: 60, minHeight: 55,
    borderRadius: 6,
    border: "1px dashed #3a3220",
    background: "#1a1610",
  },
  btnRow: {
    display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "center",
    width: "100%", maxWidth: 650,
  },
  btn: {
    padding: "10px 20px",
    background: "transparent",
    border: "2px solid #d4a84b",
    color: "#d4a84b",
    borderRadius: 6,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s",
    fontWeight: 600,
    flex: 1,
    minWidth: 120,
  },
  overlay: {
    position: "fixed", inset: 0, zIndex: 100,
    background: "rgba(0,0,0,0.85)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 16,
  },
  modal: {
    background: "#2a2218",
    border: "1px solid #4a4030",
    borderRadius: 12,
    padding: "32px 24px",
    textAlign: "center",
    boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
    maxWidth: 400,
    width: "100%",
  },
  modalTitle: {
    fontSize: 24, color: "#d4a84b", letterSpacing: 3, textTransform: "uppercase",
    marginBottom: 12, fontWeight: 600,
  },
};

export default function BlockDuel() {
  const [board, setBoard] = useState(emptyBoard());
  const [whiteTray, setWhiteTray] = useState([]);
  const [blackTray, setBlackTray] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState("white");
  const [selected, setSelected] = useState(null);
  const [whiteCaptures, setWhiteCaptures] = useState(0);
  const [blackCaptures, setBlackCaptures] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [highlightCells, setHighlightCells] = useState(null);
  const [clearingCells, setClearingCells] = useState(null);
  const [capturedCells, setCapturedCells] = useState(null);
  const [showModeSelect, setShowModeSelect] = useState(true);
  const [gameMode, setGameMode] = useState(null); // 'pvp', 'ai', 'timed', 'race', 'timed-ai', 'race-ai'
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiThinking, setAiThinking] = useState(false);
  const [whiteTimeLeft, setWhiteTimeLeft] = useState(300); // 5 minutes per player
  const [blackTimeLeft, setBlackTimeLeft] = useState(300);
  const [timerActive, setTimerActive] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [selectionStep, setSelectionStep] = useState(1); // 1: opponent, 2: mode, 3: difficulty (if AI)
  const [selectedOpponent, setSelectedOpponent] = useState(null); // 'player' or 'ai'
  const [selectedMode, setSelectedMode] = useState(null); // 'timed', 'race', 'unlimited'
  const [showCustomize, setShowCustomize] = useState(false);
  const [colorTheme, setColorTheme] = useState({
    boardLight: "#f5e6d3",
    boardDark: "#d4c4a8",
    player1: "#8b6f47",
    player2: "#4a7c8e",
  });

  // Theme presets - using color wheel complementary colors for natural contrast
  const themes = {
    classic: {
      name: "Classic",
      boardLight: "#f5e6d3",
      boardDark: "#d4c4a8",
      player1: "#8b6f47",  // Warm brown
      player2: "#4a7c8e",  // Cool blue-gray (complementary)
    },
    forest: {
      name: "Forest",
      boardLight: "#e8f4e8",
      boardDark: "#c8dfc8",
      player1: "#6b9b6b",  // Sage green
      player2: "#b87d7d",  // Dusty rose (complementary red)
    },
    ocean: {
      name: "Ocean",
      boardLight: "#e3f2fd",
      boardDark: "#bbdefb",
      player1: "#5b8fb9",  // Ocean blue
      player2: "#d4956c",  // Warm orange (complementary)
    },
    sunset: {
      name: "Sunset",
      boardLight: "#fff8e1",
      boardDark: "#ffe4b5",
      player1: "#d4956c",  // Warm peach
      player2: "#6c9bd4",  // Sky blue (complementary)
    },
    lavender: {
      name: "Lavender",
      boardLight: "#f3e5f5",
      boardDark: "#e1d5e7",
      player1: "#9575b5",  // Soft purple
      player2: "#b5a857",  // Olive yellow (complementary)
    },
    mint: {
      name: "Mint",
      boardLight: "#e0f2f1",
      boardDark: "#b2dfdb",
      player1: "#5fa89a",  // Teal
      player2: "#c87d7d",  // Coral (complementary)
    },
    autumn: {
      name: "Autumn",
      boardLight: "#fff3e0",
      boardDark: "#ffe0b2",
      player1: "#bf8040",  // Burnt orange
      player2: "#4682b4",  // Steel blue (complementary)
    },
    slate: {
      name: "Slate",
      boardLight: "#eceff1",
      boardDark: "#cfd8dc",
      player1: "#78909c",  // Blue-gray
      player2: "#a1887f",  // Warm taupe (complementary)
    },
  };
  
  const PLAYERS = {
    white: { name: "You", color: colorTheme.player1, darkColor: colorTheme.player1 },
    black: { name: "Opponent", color: colorTheme.player2, darkColor: colorTheme.player2 },
  };
  
  const tray = currentPlayer === "white" ? whiteTray : blackTray;
  const setTray = currentPlayer === "white" ? setWhiteTray : setBlackTray;
  const playerColor = PLAYERS[currentPlayer].color;
  
  const isAiMode = gameMode === "ai" || gameMode === "timed-ai" || gameMode === "race-ai";
  const isTimedMode = gameMode === "timed" || gameMode === "timed-ai";
  const isRaceMode = gameMode === "race" || gameMode === "race-ai";
  const captureGoal = 300;

  // Timer countdown - only counts down for current player
  useEffect(() => {
    if (!timerActive || gameOver || !isTimedMode || !gameStarted) return;
    
    const interval = setInterval(() => {
      if (currentPlayer === "white") {
        setWhiteTimeLeft(prev => {
          if (prev <= 1) {
            setGameOver(true);
            setWinner("black"); // White ran out of time, black wins
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTimeLeft(prev => {
          if (prev <= 1) {
            setGameOver(true);
            setWinner("white"); // Black ran out of time, white wins
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timerActive, gameOver, isTimedMode, currentPlayer, gameStarted]);

  // Check race mode victory
  useEffect(() => {
    if (!isRaceMode || gameOver) return;
    
    if (whiteCaptures >= captureGoal) {
      setGameOver(true);
      setWinner("white");
    } else if (blackCaptures >= captureGoal) {
      setGameOver(true);
      setWinner("black");
    }
  }, [whiteCaptures, blackCaptures, isRaceMode, gameOver, captureGoal]);

  // AI Logic
  function evaluateMove(board, piece, col, row, player) {
    const { newBoard, capturedCount } = placePiece(board, piece, col, row, player);
    const clears = computeClears(newBoard, player);
    
    let score = 0;
    score += capturedCount * 30;
    
    const numLines = clears.rows.size + clears.cols.size + (clears.diag1 ? 1 : 0) + (clears.diag2 ? 1 : 0);
    score += numLines * 50;
    
    const centerDist = Math.abs(col - 4.5) + Math.abs(row - 4.5);
    score += (9 - centerDist) * 2;
    
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
    
    moves.sort((a, b) => b.score - a.score);
    
    let chosenMove;
    if (difficulty === "easy") {
      const startIdx = Math.floor(moves.length * 0.6);
      const idx = startIdx + Math.floor(Math.random() * (moves.length - startIdx));
      chosenMove = moves[idx];
    } else if (difficulty === "medium") {
      const topHalf = moves.slice(0, Math.max(1, Math.floor(moves.length * 0.5)));
      chosenMove = topHalf[Math.floor(Math.random() * topHalf.length)];
    } else {
      chosenMove = moves[0];
    }
    
    return chosenMove;
  }

  function executeAiMove() {
    if (gameOver || currentPlayer === "white" || !isAiMode) return;
    
    setAiThinking(true);
    
    const thinkingTime = aiDifficulty === "easy" ? 600 : aiDifficulty === "medium" ? 900 : 1200;
    
    setTimeout(() => {
      const move = findBestAiMove(board, blackTray, "black", aiDifficulty);
      
      if (!move) {
        setAiThinking(false);
        const freshTray = generateTray(blackTray.length);
        setBlackTray(freshTray);
        setCurrentPlayer("white");
        return;
      }
      
      const piece = blackTray[move.pieceIdx];
      const { newBoard, capturedCount } = placePiece(board, piece, move.col, move.row, "black");
      const newTray = [...blackTray];
      newTray[move.pieceIdx] = null;
      
      if (capturedCount > 0) {
        setBlackCaptures(prev => prev + capturedCount);
      }
      
      const clears = computeClears(newBoard, "black");
      const numLines = clears.rows.size + clears.cols.size + (clears.diag1 ? 1 : 0) + (clears.diag2 ? 1 : 0);
      
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
          
          // Add bonus pieces for lines cleared
          const updatedTray = newTray.filter(p => p !== null);
          const bonusPieces = Math.min(numLines, 5 - updatedTray.length);
          for (let i = 0; i < bonusPieces; i++) {
            updatedTray.push(getRandomPiece());
          }
          setBlackTray(updatedTray);
          
          if (updatedTray.every(p => p === null)) {
            const freshTray = generateTray(3);
            setBlackTray(freshTray);
            setCurrentPlayer("white");
          }
        }, 600);
      } else {
        setBoard(newBoard);
        setBlackTray(newTray);
        setAiThinking(false);
        
        setTimeout(() => {
          setCapturedCells(null);
        }, 400);
        
        if (newTray.every(p => p === null)) {
          const freshTray = generateTray(3);
          setBlackTray(freshTray);
          setCurrentPlayer("white");
        }
      }
    }, thinkingTime);
  }

  useEffect(() => {
    if (isAiMode && currentPlayer === "black" && !gameOver && !clearingCells && !aiThinking) {
      executeAiMove();
    }
  }, [currentPlayer, isAiMode, gameOver, clearingCells, blackTray, aiThinking]);

  const handleTrayClick = (i) => {
    if (gameOver || !tray[i] || aiThinking) return;
    if (isAiMode && currentPlayer === "black") return;
    setSelected(prev => prev === i ? null : i);
    setHighlightCells(null);
  };

  const handleCellHover = useCallback((c, r) => {
    if (selected === null) return;
    const piece = tray[selected];
    if (!piece) return;
    
    const cells = new Map();
    const valid = canPlace(board, piece, c, r, currentPlayer);
    const opponent = currentPlayer === "white" ? "black" : "white";
    
    for (const [dc, dr] of piece.cells) {
      const cellR = r + dr;
      const cellC = c + dc;
      const key = `${cellR}-${cellC}`;
      
      // Check if this cell is out of bounds
      if (cellR < 0 || cellR >= BOARD_SIZE || cellC < 0 || cellC >= BOARD_SIZE) {
        cells.set(key, { valid: false, isCapture: false, reason: 'out-of-bounds' });
      }
      // Check if this cell has our own piece
      else if (board[cellR][cellC] === currentPlayer) {
        cells.set(key, { valid: false, isCapture: false, reason: 'own-piece' });
      }
      // Check if this cell will be a capture
      else if (board[cellR][cellC] === opponent) {
        cells.set(key, { valid: valid, isCapture: true, reason: 'capture' });
      }
      // Empty cell
      else {
        cells.set(key, { valid: valid, isCapture: false, reason: 'empty' });
      }
    }
    
    setHighlightCells(cells);
  }, [selected, tray, board, currentPlayer]);

  const handleCellClick = (c, r) => {
    if (gameOver || selected === null || aiThinking) return;
    if (isAiMode && currentPlayer === "black") return;
    const piece = tray[selected];
    if (!piece || !canPlace(board, piece, c, r, currentPlayer)) return;

    const { newBoard, capturedCount } = placePiece(board, piece, c, r, currentPlayer);
    const newTray = [...tray];
    newTray[selected] = null;

    // Start timer on first move
    if (isTimedMode && !gameStarted) {
      setGameStarted(true);
      setTimerActive(true);
    }

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

    const clears = computeClears(newBoard, currentPlayer);
    const numLines = clears.rows.size + clears.cols.size + (clears.diag1 ? 1 : 0) + (clears.diag2 ? 1 : 0);

    setSelected(null);
    setHighlightCells(null);

    if (numLines > 0) {
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
        
        // Add bonus pieces for lines cleared (max 5 total)
        const updatedTray = newTray.filter(p => p !== null);
        const bonusPieces = Math.min(numLines, 5 - updatedTray.length);
        for (let i = 0; i < bonusPieces; i++) {
          updatedTray.push(getRandomPiece());
        }
        setTray(updatedTray);
        
        if (updatedTray.every(p => p === null)) {
          const freshTray = generateTray(3);
          setTray(freshTray);
          setCurrentPlayer(prev => prev === "white" ? "black" : "white");
        }
      }, 600);
    } else {
      setBoard(newBoard);
      setTray(newTray);
      
      setTimeout(() => {
        setCapturedCells(null);
      }, 400);
      
      if (newTray.every(p => p === null)) {
        const freshTray = generateTray(3);
        setTray(freshTray);
        setCurrentPlayer(prev => prev === "white" ? "black" : "white");
      }
    }
  };

  const endTurn = () => {
    if (gameOver || aiThinking) return;
    if (isAiMode && currentPlayer === "black") return;
    setSelected(null);
    setHighlightCells(null);
    const freshTray = generateTray(3);
    setTray(freshTray);
    setCurrentPlayer(prev => prev === "white" ? "black" : "white");
  };

  const restart = () => {
    setBoard(emptyBoard());
    setWhiteTray(generateTray(3));
    setBlackTray(generateTray(3));
    setCurrentPlayer("white");
    setSelected(null);
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
    setWhiteTimeLeft(300);
    setBlackTimeLeft(300);
    setTimerActive(false);
    setGameStarted(false);
    setSelectionStep(1);
    setSelectedOpponent(null);
    setSelectedMode(null);
  };

  const startGame = (mode, difficulty = "medium") => {
    setGameMode(mode);
    setAiDifficulty(difficulty);
    setShowModeSelect(false);
    setWhiteTray(generateTray(3));
    setBlackTray(generateTray(3));
    // Timer will start on first move
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check game over for regular modes
  useEffect(() => {
    if (gameOver || isTimedMode || isRaceMode) return;
    
    const whiteCan = whiteTray.some(p => p && canPlaceAnywhere(board, p, "white"));
    const blackCan = blackTray.some(p => p && canPlaceAnywhere(board, p, "black"));
    
    if (!whiteCan && !blackCan) {
      setGameOver(true);
      if (whiteCaptures > blackCaptures) setWinner("white");
      else if (blackCaptures > whiteCaptures) setWinner("black");
      else setWinner("draw");
    }
  }, [board, whiteTray, blackTray, gameOver, whiteCaptures, blackCaptures, isTimedMode, isRaceMode]);

  const boardWithHover = (
    <div style={styles.boardGrid}>
      {board.map((row, r) =>
        row.map((cell, c) => {
          const isLight = (r + c) % 2 === 0;
          const highlightInfo = highlightCells && highlightCells.get(`${r}-${c}`);
          const isHighlight = highlightInfo !== undefined;
          const isValidPlacement = highlightInfo?.valid === true && !highlightInfo?.isCapture;
          const isInvalidPlacement = highlightInfo?.valid === false;
          const isCapturePreview = highlightInfo?.valid === true && highlightInfo?.isCapture === true;
          const isOutOfBounds = highlightInfo?.reason === 'out-of-bounds';
          const isOwnPiece = highlightInfo?.reason === 'own-piece';
          const isClearing = clearingCells && clearingCells.has(`${r}-${c}`);
          const isCaptured = capturedCells && capturedCells.has(`${r}-${c}`);
          
          let bgColor;
          if (isClearing) {
            bgColor = "#fff";
          } else if (isCaptured) {
            bgColor = "#ff6b6b";
          } else if (isCapturePreview) {
            // Orange for capturing opponent's piece
            bgColor = isLight ? "#ffb347" : "#ff9520";
          } else if (isOwnPiece) {
            // Purple-red for trying to place on own piece (clearly blocked)
            bgColor = isLight ? "#cc6666" : "#aa4444";
          } else if (isOutOfBounds) {
            // Dark red for out of bounds (impossible)
            bgColor = "#660000";
          } else if (cell === "white") {
            bgColor = colorTheme.player1;
          } else if (cell === "black") {
            bgColor = colorTheme.player2;
          } else if (isValidPlacement) {
            bgColor = isLight ? "#90d070" : "#70c050";
          } else if (isInvalidPlacement) {
            bgColor = isLight ? "#ff8080" : "#ff5050";
          } else {
            bgColor = isLight ? colorTheme.boardLight : colorTheme.boardDark;
          }

          return (
            <div
              key={`${r}-${c}`}
              onClick={() => handleCellClick(c, r)}
              onMouseEnter={() => handleCellHover(c, r)}
              onMouseLeave={() => setHighlightCells(null)}
              onTouchStart={() => handleCellHover(c, r)}
              style={{
                background: bgColor,
                border: "1px solid #8a7e6a44",
                cursor: selected ? "crosshair" : "default",
                transition: "background 0.1s ease",
                boxShadow: cell && !isClearing ? `inset 0 1px 2px rgba(0,0,0,0.3)` : "none",
                position: "relative",
                borderRadius: 2,
              }}
            >
              {cell && !isClearing && !isCaptured && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: cell === "white" 
                    ? `linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)`
                    : `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)`,
                }} />
              )}
              {isValidPlacement && !cell && (
                <div style={{
                  position: "absolute", inset: 0,
                  border: "2px solid #50ff50",
                  borderRadius: 2,
                }} />
              )}
              {isCapturePreview && (
                <div style={{
                  position: "absolute", inset: 0,
                  border: "3px solid #ff6600",
                  borderRadius: 2,
                  boxShadow: "inset 0 0 8px rgba(255,102,0,0.4)",
                }} />
              )}
              {isInvalidPlacement && (
                <div style={{
                  position: "absolute", inset: 0,
                  border: "2px solid #ff3030",
                  borderRadius: 2,
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
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes captureFlash {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: #1a1610; touch-action: manipulation; }
      `}</style>

      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <h1 style={styles.title}>BLOCK DUEL</h1>
          <button 
            style={{
              padding: "6px 12px",
              background: "transparent",
              border: "1px solid #d4a84b",
              color: "#d4a84b",
              borderRadius: 4,
              fontSize: 10,
              letterSpacing: 1,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onClick={() => setShowCustomize(true)}
          >
            🎨 THEMES
          </button>
        </div>
        <p style={styles.subtitle}>
          {isTimedMode ? "5 Minute Blitz" : isRaceMode ? `Race to ${captureGoal}` : isAiMode ? "vs AI" : "Head to Head"}
        </p>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.playerStat}>
          <div style={{ ...styles.playerName, color: PLAYERS.white.color }}>
            {isAiMode ? "YOU" : "WHITE"}
          </div>
          <div style={{ ...styles.captureValue, color: PLAYERS.white.color }}>
            {whiteCaptures}
            {isRaceMode && <span style={{ fontSize: 14, color: "#8a7e6a" }}>/{captureGoal}</span>}
          </div>
          <div style={{ fontSize: 8, color: "#8a7e6a", marginTop: 2 }}>CAPTURED</div>
          {isTimedMode && (
            <div style={{ 
              fontSize: 16, 
              color: whiteTimeLeft < 60 ? "#ff6b6b" : currentPlayer === "white" ? "#d4a84b" : "#6b5f4a", 
              fontWeight: 600,
              marginTop: 4,
            }}>
              {formatTime(whiteTimeLeft)}
            </div>
          )}
        </div>

        {!isTimedMode && (
          <div style={styles.timerBox}>
            <div style={{ fontSize: 9, color: "#8a7e6a", marginBottom: 2 }}>
              {isRaceMode ? "RACE" : "GAME"}
            </div>
            <div style={{ fontSize: 16, color: "#d4a84b", fontWeight: 600 }}>
              {isRaceMode ? `to ${captureGoal}` : "∞"}
            </div>
          </div>
        )}

        <div style={styles.playerStat}>
          <div style={{ ...styles.playerName, color: PLAYERS.black.darkColor }}>
            {isAiMode ? "AI" : "BLACK"}
          </div>
          <div style={{ ...styles.captureValue, color: PLAYERS.black.darkColor }}>
            {blackCaptures}
            {isRaceMode && <span style={{ fontSize: 14, color: "#8a7e6a" }}>/{captureGoal}</span>}
          </div>
          <div style={{ fontSize: 8, color: "#8a7e6a", marginTop: 2 }}>CAPTURED</div>
          {isTimedMode && (
            <div style={{ 
              fontSize: 16, 
              color: blackTimeLeft < 60 ? "#ff6b6b" : currentPlayer === "black" ? "#d4a84b" : "#6b5f4a", 
              fontWeight: 600,
              marginTop: 4,
            }}>
              {formatTime(blackTimeLeft)}
            </div>
          )}
        </div>
      </div>

      <div style={styles.boardOuter}>
        {boardWithHover}
      </div>

      {/* Current Player's Tray */}
      <div style={{ ...styles.trayContainer, marginBottom: 8 }}>
        {tray.map((piece, i) => (
          <PiecePreview
            key={piece ? piece.id : `empty-${i}`}
            piece={piece}
            onClick={() => handleTrayClick(i)}
            selected={selected === i}
            disabled={gameOver || (isAiMode && currentPlayer === "black")}
            playerColor={playerColor}
          />
        ))}
      </div>

      {/* Opponent's Tray Preview */}
      {!isAiMode && (
        <div style={{ marginBottom: 8, textAlign: "center", width: "100%", maxWidth: 650 }}>
          <div style={{ fontSize: 9, color: "#6b5f4a", marginBottom: 6, letterSpacing: 1 }}>
            OPPONENT'S PIECES
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {(currentPlayer === "white" ? blackTray : whiteTray).map((piece, i) => (
              <PiecePreview
                key={piece ? piece.id : `opp-${i}`}
                piece={piece}
                disabled={true}
                playerColor={currentPlayer === "white" ? PLAYERS.black.color : PLAYERS.white.color}
                small={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      {!gameOver && (
        <div style={styles.btnRow}>
          <button 
            style={{
              ...styles.btn,
              background: "#d4a84b22",
              borderColor: "#d4a84b",
            }}
            onMouseEnter={e => { e.target.style.background = "#d4a84b"; e.target.style.color = "#1a1610"; }}
            onMouseLeave={e => { e.target.style.background = "#d4a84b22"; e.target.style.color = "#d4a84b"; }}
            onClick={endTurn}
            disabled={aiThinking || (isAiMode && currentPlayer === "black")}
          >
            End Turn
          </button>
          
          <button 
            style={styles.btn}
            onMouseEnter={e => { e.target.style.borderColor = "#8a7e6a"; e.target.style.color = "#8a7e6a"; }}
            onMouseLeave={e => { e.target.style.borderColor = "#d4a84b"; e.target.style.color = "#d4a84b"; }}
            onClick={() => setSelected(null)}
          >
            Deselect
          </button>
          
          <button 
            style={{
              ...styles.btn,
              borderColor: "#c47a5a",
              color: "#c47a5a",
            }}
            onMouseEnter={e => { e.target.style.background = "#c47a5a"; e.target.style.color = "#1a1610"; e.target.style.borderColor = "#c47a5a"; }}
            onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#c47a5a"; e.target.style.borderColor = "#c47a5a"; }}
            onClick={() => {
              setGameOver(true);
              // Determine winner by current captures
              if (whiteCaptures > blackCaptures) setWinner("white");
              else if (blackCaptures > whiteCaptures) setWinner("black");
              else setWinner("draw");
            }}
          >
            Forfeit
          </button>
        </div>
      )}

      {/* Customization Modal */}
      {showCustomize && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: 500 }}>
            <div style={styles.modalTitle}>Customize Colors</div>
            
            <div style={{ fontSize: 11, color: "#8a7e6a", marginBottom: 12, letterSpacing: 1 }}>
              CHOOSE A THEME
            </div>

            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(2, 1fr)", 
              gap: 10, 
              marginBottom: 20 
            }}>
              {Object.entries(themes).map(([key, theme]) => (
                <button
                  key={key}
                  style={{
                    ...styles.btn,
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    background: colorTheme === theme ? "#d4a84b22" : "transparent",
                    borderColor: colorTheme === theme ? "#d4a84b" : "#3a3220",
                  }}
                  onClick={() => setColorTheme(theme)}
                >
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{theme.name}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <div style={{ width: 20, height: 20, background: theme.boardLight, border: "1px solid #3a3220", borderRadius: 3 }} />
                    <div style={{ width: 20, height: 20, background: theme.boardDark, border: "1px solid #3a3220", borderRadius: 3 }} />
                    <div style={{ width: 20, height: 20, background: theme.player1, border: "1px solid #3a3220", borderRadius: 3 }} />
                    <div style={{ width: 20, height: 20, background: theme.player2, border: "1px solid #3a3220", borderRadius: 3 }} />
                  </div>
                </button>
              ))}
            </div>

            <div style={{ fontSize: 11, color: "#8a7e6a", marginBottom: 12, letterSpacing: 1 }}>
              CUSTOM COLORS
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ flex: 1, fontSize: 10, color: "#8a7e6a" }}>Board Light</label>
                <input 
                  type="color" 
                  value={colorTheme.boardLight}
                  onChange={(e) => setColorTheme({...colorTheme, boardLight: e.target.value})}
                  style={{ width: 50, height: 30, border: "1px solid #3a3220", borderRadius: 4, cursor: "pointer" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ flex: 1, fontSize: 10, color: "#8a7e6a" }}>Board Dark</label>
                <input 
                  type="color" 
                  value={colorTheme.boardDark}
                  onChange={(e) => setColorTheme({...colorTheme, boardDark: e.target.value})}
                  style={{ width: 50, height: 30, border: "1px solid #3a3220", borderRadius: 4, cursor: "pointer" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ flex: 1, fontSize: 10, color: "#8a7e6a" }}>Player 1</label>
                <input 
                  type="color" 
                  value={colorTheme.player1}
                  onChange={(e) => setColorTheme({...colorTheme, player1: e.target.value})}
                  style={{ width: 50, height: 30, border: "1px solid #3a3220", borderRadius: 4, cursor: "pointer" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ flex: 1, fontSize: 10, color: "#8a7e6a" }}>Player 2</label>
                <input 
                  type="color" 
                  value={colorTheme.player2}
                  onChange={(e) => setColorTheme({...colorTheme, player2: e.target.value})}
                  style={{ width: 50, height: 30, border: "1px solid #3a3220", borderRadius: 4, cursor: "pointer" }}
                />
              </div>
            </div>

            <button
              style={{ ...styles.btn, width: "100%" }}
              onMouseEnter={e => { e.target.style.background = "#d4a84b"; e.target.style.color = "#1a1610"; }}
              onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#d4a84b"; }}
              onClick={() => setShowCustomize(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Mode Selection Modal */}
      {showModeSelect && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalTitle}>Block Duel</div>
            
            {selectionStep === 1 && (
              <>
                <div style={{ fontSize: 11, color: "#8a7e6a", marginBottom: 12, letterSpacing: 1 }}>
                  SELECT OPPONENT
                </div>
                
                <button 
                  style={{ ...styles.btn, width: "100%", marginBottom: 10 }}
                  onMouseEnter={e => { e.target.style.background = "#d4a84b"; e.target.style.color = "#1a1610"; }}
                  onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#d4a84b"; }}
                  onClick={() => { setSelectedOpponent("player"); setSelectionStep(2); }}
                >
                  👥 Player vs Player
                </button>

                <button 
                  style={{ ...styles.btn, width: "100%", marginBottom: 0 }}
                  onMouseEnter={e => { e.target.style.background = "#d4a84b"; e.target.style.color = "#1a1610"; }}
                  onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#d4a84b"; }}
                  onClick={() => { setSelectedOpponent("ai"); setSelectionStep(2); }}
                >
                  🤖 Player vs AI
                </button>
              </>
            )}

            {selectionStep === 2 && (
              <>
                <div style={{ fontSize: 11, color: "#8a7e6a", marginBottom: 12, letterSpacing: 1 }}>
                  SELECT GAME MODE
                </div>
                
                <button 
                  style={{ ...styles.btn, width: "100%", marginBottom: 10 }}
                  onMouseEnter={e => { e.target.style.background = "#d4a84b"; e.target.style.color = "#1a1610"; }}
                  onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#d4a84b"; }}
                  onClick={() => {
                    setSelectedMode("timed");
                    if (selectedOpponent === "ai") {
                      setSelectionStep(3);
                    } else {
                      startGame("timed");
                    }
                  }}
                >
                  ⏱️ 5 Minute Blitz
                </button>

                <button 
                  style={{ ...styles.btn, width: "100%", marginBottom: 10 }}
                  onMouseEnter={e => { e.target.style.background = "#d4a84b"; e.target.style.color = "#1a1610"; }}
                  onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#d4a84b"; }}
                  onClick={() => {
                    setSelectedMode("race");
                    if (selectedOpponent === "ai") {
                      setSelectionStep(3);
                    } else {
                      startGame("race");
                    }
                  }}
                >
                  🏁 Race to 300
                </button>

                <button 
                  style={{ ...styles.btn, width: "100%", marginBottom: 12 }}
                  onMouseEnter={e => { e.target.style.background = "#d4a84b"; e.target.style.color = "#1a1610"; }}
                  onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#d4a84b"; }}
                  onClick={() => {
                    setSelectedMode("unlimited");
                    if (selectedOpponent === "ai") {
                      setSelectionStep(3);
                    } else {
                      startGame("pvp");
                    }
                  }}
                >
                  ♾️ Unlimited
                </button>

                <button 
                  style={{ ...styles.btn, width: "100%", fontSize: 10, borderColor: "#6b5f4a", color: "#6b5f4a" }}
                  onClick={() => { setSelectionStep(1); setSelectedOpponent(null); }}
                >
                  ← Back
                </button>
              </>
            )}

            {selectionStep === 3 && selectedOpponent === "ai" && (
              <>
                <div style={{ fontSize: 11, color: "#8a7e6a", marginBottom: 12, letterSpacing: 1 }}>
                  SELECT DIFFICULTY
                </div>
                
                <button 
                  style={{ ...styles.btn, width: "100%", marginBottom: 10, borderColor: "#8ba6c7", color: "#8ba6c7" }}
                  onMouseEnter={e => { e.target.style.background = "#8ba6c7"; e.target.style.color = "#1a1610"; e.target.style.borderColor = "#8ba6c7"; }}
                  onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#8ba6c7"; e.target.style.borderColor = "#8ba6c7"; }}
                  onClick={() => {
                    const mode = selectedMode === "timed" ? "timed-ai" : selectedMode === "race" ? "race-ai" : "ai";
                    startGame(mode, "easy");
                  }}
                >
                  Easy AI
                </button>

                <button 
                  style={{ ...styles.btn, width: "100%", marginBottom: 10 }}
                  onMouseEnter={e => { e.target.style.background = "#d4a84b"; e.target.style.color = "#1a1610"; }}
                  onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#d4a84b"; }}
                  onClick={() => {
                    const mode = selectedMode === "timed" ? "timed-ai" : selectedMode === "race" ? "race-ai" : "ai";
                    startGame(mode, "medium");
                  }}
                >
                  Medium AI
                </button>

                <button 
                  style={{ ...styles.btn, width: "100%", marginBottom: 12, borderColor: "#c47a5a", color: "#c47a5a" }}
                  onMouseEnter={e => { e.target.style.background = "#c47a5a"; e.target.style.color = "#1a1610"; e.target.style.borderColor = "#c47a5a"; }}
                  onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#c47a5a"; e.target.style.borderColor = "#c47a5a"; }}
                  onClick={() => {
                    const mode = selectedMode === "timed" ? "timed-ai" : selectedMode === "race" ? "race-ai" : "ai";
                    startGame(mode, "hard");
                  }}
                >
                  Hard AI
                </button>

                <button 
                  style={{ ...styles.btn, width: "100%", fontSize: 10, borderColor: "#6b5f4a", color: "#6b5f4a" }}
                  onClick={() => { setSelectionStep(2); setSelectedMode(null); }}
                >
                  ← Back
                </button>
              </>
            )}

            <div style={{ 
              fontSize: 9, 
              color: "#6b5f4a", 
              lineHeight: 1.5, 
              marginTop: 16,
              padding: "10px",
              background: "#1a161022",
              borderRadius: 6,
            }}>
              Capture opponent blocks! Clear lines for bonus pieces. First to goal wins!
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
                : isTimedMode && ((winner === "white" && blackTimeLeft === 0) || (winner === "black" && whiteTimeLeft === 0))
                  ? `${winner === "white" ? (isAiMode ? "You Win!" : "White Wins!") : (isAiMode ? "AI Wins!" : "Black Wins!")} - Time Out!`
                  : winner === "white" 
                    ? (isAiMode ? "You Win!" : "White Wins!")
                    : (isAiMode ? "AI Wins!" : "Black Wins!")
              }
            </div>
            
            <div style={{ marginTop: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-around" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#6b5f4a", marginBottom: 4 }}>
                    {isAiMode ? "YOU" : "WHITE"}
                  </div>
                  <div style={{ fontSize: 36, color: PLAYERS.white.color, fontWeight: 300 }}>
                    {whiteCaptures}
                  </div>
                  <div style={{ fontSize: 9, color: "#8a7e6a" }}>captured</div>
                </div>
                
                <div style={{ width: 1, background: "#3a3220", margin: "0 16px" }} />
                
                <div>
                  <div style={{ fontSize: 10, color: "#6b5f4a", marginBottom: 4 }}>
                    {isAiMode ? "AI" : "BLACK"}
                  </div>
                  <div style={{ fontSize: 36, color: PLAYERS.black.darkColor, fontWeight: 300 }}>
                    {blackCaptures}
                  </div>
                  <div style={{ fontSize: 9, color: "#8a7e6a" }}>captured</div>
                </div>
              </div>
            </div>

            <button
              style={{ ...styles.btn, width: "100%" }}
              onMouseEnter={e => { e.target.style.background = "#d4a84b"; e.target.style.color = "#1a1610"; }}
              onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#d4a84b"; }}
              onClick={restart}
            >
              New Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
