/**
 * Card Game Engine
 * Pazaak-style card duel game
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { GameEngineProps } from '../../GameEngine';
import { CARD_CONFIG } from '../../config/gameTypes';

export const CardEngine: React.FC<GameEngineProps> = ({
  level,
  onScoreChange,
  onLivesChange,
  onWin,
  onLose,
  isPaused
}) => {
  const theme = CARD_CONFIG.theme;
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [currentCard, setCurrentCard] = useState(0);
  const [round, setRound] = useState(1);
  const [gamePhase, setGamePhase] = useState<'player' | 'opponent' | 'result'>('player');
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  const TARGET = 20;
  const ROUNDS_TO_WIN = 3;

  const drawCard = () => {
    return Math.floor(Math.random() * 10) + 1; // 1-10
  };

  useEffect(() => {
    setCurrentCard(drawCard());
  }, []);

  useEffect(() => {
    if (wins >= ROUNDS_TO_WIN) {
      onWin();
    } else if (losses >= ROUNDS_TO_WIN) {
      onLose();
    }
  }, [wins, losses]);

  const handleHit = () => {
    if (isPaused || gamePhase !== 'player') return;

    const newScore = playerScore + currentCard;
    setPlayerScore(newScore);

    if (newScore > TARGET) {
      // Bust!
      Alert.alert('Bust!', `You went over ${TARGET}!`, [
        { text: 'OK', onPress: () => endRound('opponent') }
      ]);
    } else if (newScore === TARGET) {
      // Perfect!
      Alert.alert('Perfect!', `You hit exactly ${TARGET}!`, [
        { text: 'OK', onPress: () => opponentTurn() }
      ]);
    } else {
      setCurrentCard(drawCard());
    }
  };

  const handleStand = () => {
    if (isPaused || gamePhase !== 'player') return;
    opponentTurn();
  };

  const opponentTurn = () => {
    setGamePhase('opponent');
    
    // Simple AI: try to beat player or get close to TARGET
    let aiScore = 0;
    const targetScore = playerScore > TARGET ? TARGET : Math.min(playerScore + 1, TARGET);
    
    const aiInterval = setInterval(() => {
      if (aiScore < targetScore && aiScore < TARGET) {
        const card = drawCard();
        aiScore += card;
        setOpponentScore(aiScore);
      } else {
        clearInterval(aiInterval);
        setTimeout(() => determineWinner(playerScore, aiScore), 1000);
      }
    }, 1000);
  };

  const determineWinner = (pScore: number, oScore: number) => {
    setGamePhase('result');

    let winner = '';
    if (pScore > TARGET) {
      winner = 'opponent';
    } else if (oScore > TARGET) {
      winner = 'player';
    } else if (pScore > oScore) {
      winner = 'player';
    } else {
      winner = 'opponent';
    }

    if (winner === 'player') {
      setWins(prev => prev + 1);
      Alert.alert('You Win This Round!', `${pScore} beats ${oScore}`, [
        { text: 'Next Round', onPress: startNextRound }
      ]);
    } else {
      setLosses(prev => prev + 1);
      Alert.alert('Opponent Wins', `${oScore} beats ${pScore}`, [
        { text: 'Next Round', onPress: startNextRound }
      ]);
    }
  };

  const startNextRound = () => {
    setPlayerScore(0);
    setOpponentScore(0);
    setCurrentCard(drawCard());
    setRound(prev => prev + 1);
    setGamePhase('player');
  };

  const endRound = (winner: 'player' | 'opponent') => {
    if (winner === 'opponent') {
      setLosses(prev => prev + 1);
    }
    setTimeout(startNextRound, 1500);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Game Info */}
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: theme.colors.accent }]}>
          Round {round} • First to {ROUNDS_TO_WIN} wins
        </Text>
        <View style={styles.scoreBoard}>
          <Text style={[styles.scoreBoardText, { color: theme.colors.text }]}>
            You: {wins} | Opponent: {losses}
          </Text>
        </View>
      </View>

      {/* Opponent Area */}
      <View style={[styles.playerArea, styles.opponentArea]}>
        <Text style={[styles.playerLabel, { color: theme.colors.textSecondary }]}>
          Opponent
        </Text>
        <View style={[styles.scoreDisplay, { backgroundColor: theme.colors.secondary + '40' }]}>
          <Text style={[styles.scoreText, { color: theme.colors.text }]}>
            {opponentScore}
          </Text>
        </View>
      </View>

      {/* Current Card */}
      <View style={styles.centerArea}>
        <View style={[styles.card, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.cardValue}>{currentCard}</Text>
        </View>
        <Text style={[styles.phaseText, { color: theme.colors.textSecondary }]}>
          {gamePhase === 'player' ? 'Your Turn' : gamePhase === 'opponent' ? 'Opponent Turn' : 'Round Over'}
        </Text>
      </View>

      {/* Player Area */}
      <View style={[styles.playerArea]}>
        <Text style={[styles.playerLabel, { color: theme.colors.textSecondary }]}>
          You
        </Text>
        <View style={[styles.scoreDisplay, { backgroundColor: theme.colors.primary + '40' }]}>
          <Text style={[styles.scoreText, { color: theme.colors.text }]}>
            {playerScore}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.standButton,
            { backgroundColor: theme.colors.secondary }
          ]}
          onPress={handleStand}
          disabled={isPaused || gamePhase !== 'player'}
        >
          <Text style={styles.buttonText}>Stand</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.hitButton,
            { backgroundColor: theme.colors.primary }
          ]}
          onPress={handleHit}
          disabled={isPaused || gamePhase !== 'player'}
        >
          <Text style={styles.buttonText}>Hit</Text>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <Text style={[styles.instructions, { color: theme.colors.textSecondary }]}>
        Get as close to {TARGET} as possible without going over!
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
    alignItems: 'center',
    marginBottom: 20
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },
  scoreBoard: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10
  },
  scoreBoardText: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  playerArea: {
    alignItems: 'center',
    marginVertical: 20
  },
  opponentArea: {
    marginTop: 0
  },
  playerLabel: {
    fontSize: 14,
    marginBottom: 10
  },
  scoreDisplay: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold'
  },
  centerArea: {
    alignItems: 'center',
    marginVertical: 20
  },
  card: {
    width: 100,
    height: 140,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  cardValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#fff'
  },
  phaseText: {
    fontSize: 16,
    marginTop: 10,
    fontWeight: 'bold'
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20
  },
  actionButton: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 15,
    minWidth: 120,
    alignItems: 'center'
  },
  standButton: {},
  hitButton: {},
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  instructions: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14
  }
});
