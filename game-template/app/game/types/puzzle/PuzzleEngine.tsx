/**
 * Puzzle Game Engine
 * Zen-themed match-3 puzzle game
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from 'react-native';
import { GameEngineProps } from '../../GameEngine';
import { PUZZLE_CONFIG } from '../../config/gameTypes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = 6;
const TILE_SIZE = (SCREEN_WIDTH - 40) / GRID_SIZE;
const COLORS = ['#e8d5b7', '#b8d4e3', '#d4e8d4', '#f4c2c2', '#e8d4f4'];

type Tile = {
  color: string;
  id: string;
};

export const PuzzleEngine: React.FC<GameEngineProps> = ({
  level,
  onScoreChange,
  onLivesChange,
  onWin,
  onLose,
  isPaused
}) => {
  const theme = PUZZLE_CONFIG.theme;
  const [grid, setGrid] = useState<Tile[][]>([]);
  const [score, setScore] = useState(0);
  const [selectedTile, setSelectedTile] = useState<{row: number; col: number} | null>(null);
  const [moves, setMoves] = useState(level.powerUps * 10 || 30);

  useEffect(() => {
    initializeGrid();
  }, []);

  useEffect(() => {
    if (score >= level.targetScore) {
      onWin();
    }
  }, [score]);

  useEffect(() => {
    if (moves === 0 && score < level.targetScore) {
      onLose();
    }
  }, [moves]);

  const initializeGrid = () => {
    const newGrid: Tile[][] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      const rowTiles: Tile[] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        rowTiles.push({
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          id: `${row}-${col}-${Date.now()}`
        });
      }
      newGrid.push(rowTiles);
    }
    setGrid(newGrid);
  };

  const handleTilePress = (row: number, col: number) => {
    if (isPaused) return;

    if (!selectedTile) {
      setSelectedTile({ row, col });
    } else {
      // Check if tiles are adjacent
      const isAdjacent =
        (Math.abs(selectedTile.row - row) === 1 && selectedTile.col === col) ||
        (Math.abs(selectedTile.col - col) === 1 && selectedTile.row === row);

      if (isAdjacent) {
        swapTiles(selectedTile.row, selectedTile.col, row, col);
        setMoves(prev => prev - 1);
      }
      setSelectedTile(null);
    }
  };

  const swapTiles = (row1: number, col1: number, row2: number, col2: number) => {
    const newGrid = [...grid.map(row => [...row])];
    const temp = newGrid[row1][col1];
    newGrid[row1][col1] = newGrid[row2][col2];
    newGrid[row2][col2] = temp;
    
    setGrid(newGrid);
    
    // Check for matches after swap
    setTimeout(() => checkMatches(), 300);
  };

  const checkMatches = () => {
    let matchesFound = false;
    const newGrid = [...grid.map(row => [...row])];
    const toRemove: {row: number; col: number}[] = [];

    // Check horizontal matches
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; col++) {
        if (
          newGrid[row][col].color === newGrid[row][col + 1].color &&
          newGrid[row][col].color === newGrid[row][col + 2].color
        ) {
          toRemove.push({row, col}, {row, col: col + 1}, {row, col: col + 2});
          matchesFound = true;
        }
      }
    }

    // Check vertical matches
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE - 2; row++) {
        if (
          newGrid[row][col].color === newGrid[row + 1][col].color &&
          newGrid[row][col].color === newGrid[row + 2][col].color
        ) {
          toRemove.push({row, col}, {row: row + 1, col}, {row: row + 2, col});
          matchesFound = true;
        }
      }
    }

    if (matchesFound) {
      // Remove matches and add score
      const uniqueMatches = Array.from(
        new Set(toRemove.map(t => `${t.row}-${t.col}`))
      ).map(key => {
        const [row, col] = key.split('-').map(Number);
        return {row, col};
      });

      const points = uniqueMatches.length * level.coinValue;
      setScore(prev => {
        const newScore = prev + points;
        onScoreChange(newScore);
        return newScore;
      });

      // Replace matched tiles
      uniqueMatches.forEach(({row, col}) => {
        newGrid[row][col] = {
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          id: `${row}-${col}-${Date.now()}`
        };
      });

      setGrid(newGrid);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Score Display */}
      <View style={styles.header}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Score
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {score}/{level.targetScore}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Moves
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.accent }]}>
            {moves}
          </Text>
        </View>
      </View>

      {/* Grid */}
      <View style={styles.gridContainer}>
        {grid.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((tile, colIndex) => {
              const isSelected =
                selectedTile?.row === rowIndex && selectedTile?.col === colIndex;
              
              return (
                <TouchableOpacity
                  key={tile.id}
                  style={[
                    styles.tile,
                    {
                      width: TILE_SIZE - 4,
                      height: TILE_SIZE - 4,
                      backgroundColor: tile.color
                    },
                    isSelected && styles.tileSelected
                  ]}
                  onPress={() => handleTilePress(rowIndex, colIndex)}
                  disabled={isPaused}
                />
              );
            })}
          </View>
        ))}
      </View>

      {/* Instructions */}
      <Text style={[styles.instructions, { color: theme.colors.textSecondary }]}>
        Tap two adjacent tiles to swap them. Match 3 or more of the same color!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 5
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  gridContainer: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: 5,
    borderRadius: 10
  },
  row: {
    flexDirection: 'row'
  },
  tile: {
    margin: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)'
  },
  tileSelected: {
    borderWidth: 3,
    borderColor: '#2c3e50'
  },
  instructions: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 14
  }
});
