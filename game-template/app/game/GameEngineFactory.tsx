/**
 * Game Engine Factory
 * Selects and renders the appropriate game engine based on game type
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GameType } from './config/gameTypes';
import { GameEngineProps } from './GameEngine';
import { RunnerEngine } from './types/runner/RunnerEngine';
import { PuzzleEngine } from './types/puzzle/PuzzleEngine';
import { WordEngine } from './types/word/WordEngine';
import { CardEngine } from './types/card/CardEngine';
import { PlatformerEngine } from './types/platformer/PlatformerEngine';

interface GameEngineFactoryProps extends GameEngineProps {
  gameType: GameType;
}

export const GameEngineFactory: React.FC<GameEngineFactoryProps> = (props) => {
  const { gameType, ...engineProps } = props;

  switch (gameType) {
    case GameType.RUNNER:
      return <RunnerEngine {...engineProps} />;
    
    case GameType.PUZZLE:
      return <PuzzleEngine {...engineProps} />;
    
    case GameType.WORD:
      return <WordEngine {...engineProps} />;
    
    case GameType.CARD:
      return <CardEngine {...engineProps} />;
    
    case GameType.PLATFORMER:
      return <PlatformerEngine {...engineProps} />;
    
    default:
      return (
        <View style={styles.error}>
          <Text style={styles.errorText}>
            Unknown game type: {gameType}
          </Text>
          <Text style={styles.errorSubtext}>
            Please check game configuration
          </Text>
        </View>
      );
  }
};

const styles = StyleSheet.create({
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 20
  },
  errorText: {
    color: '#e94560',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  errorSubtext: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center'
  }
});
