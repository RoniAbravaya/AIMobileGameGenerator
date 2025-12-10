/**
 * Word Game Engine
 * Tower-style word puzzle game
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert
} from 'react-native';
import { GameEngineProps } from '../../GameEngine';
import { WORD_CONFIG } from '../../config/gameTypes';

const LETTER_GRID = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const COMMON_WORDS = ['CAT', 'DOG', 'RUN', 'JUMP', 'PLAY', 'GAME', 'WORD', 'CODE', 'TEST', 'HELP'];

export const WordEngine: React.FC<GameEngineProps> = ({
  level,
  onScoreChange,
  onLivesChange,
  onWin,
  onLose,
  isPaused
}) => {
  const theme = WORD_CONFIG.theme;
  const [letters, setLetters] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(level.timeLimit);

  useEffect(() => {
    generateLetters();
  }, []);

  useEffect(() => {
    if (!isPaused && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (score >= level.targetScore) {
              onWin();
            } else {
              onLose();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isPaused, timeLeft]);

  useEffect(() => {
    if (score >= level.targetScore) {
      onWin();
    }
  }, [score]);

  const generateLetters = () => {
    const vowels = 'AEIOU';
    const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
    const newLetters: string[] = [];
    
    // Ensure good mix of vowels and consonants
    for (let i = 0; i < 12; i++) {
      if (i % 3 === 0) {
        newLetters.push(vowels[Math.floor(Math.random() * vowels.length)]);
      } else {
        newLetters.push(consonants[Math.floor(Math.random() * consonants.length)]);
      }
    }
    
    setLetters(newLetters);
  };

  const handleLetterPress = (letter: string) => {
    if (isPaused) return;
    setCurrentWord(prev => prev + letter);
  };

  const handleSubmitWord = () => {
    if (currentWord.length < 3) {
      Alert.alert('Too Short', 'Words must be at least 3 letters!');
      return;
    }

    // Simple validation - check if it's a known word or has good letter pattern
    const isValid = 
      COMMON_WORDS.includes(currentWord.toUpperCase()) ||
      currentWord.length >= 4;

    if (isValid && !foundWords.includes(currentWord)) {
      const points = currentWord.length * level.coinValue;
      setScore(prev => {
        const newScore = prev + points;
        onScoreChange(newScore);
        return newScore;
      });
      setFoundWords(prev => [...prev, currentWord]);
      setCurrentWord('');
    } else if (foundWords.includes(currentWord)) {
      Alert.alert('Already Found', 'You already found that word!');
    } else {
      Alert.alert('Invalid', 'Not a valid word. Try again!');
    }
  };

  const handleClear = () => {
    setCurrentWord('');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
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
            Time
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.accent }]}>
            {timeLeft}s
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Words
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {foundWords.length}
          </Text>
        </View>
      </View>

      {/* Current Word Display */}
      <View style={styles.wordDisplay}>
        <Text style={[styles.currentWord, { color: theme.colors.text }]}>
          {currentWord || 'Tap letters to form words'}
        </Text>
      </View>

      {/* Letter Grid */}
      <View style={styles.letterGrid}>
        {letters.map((letter, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.letterTile, { backgroundColor: theme.colors.primary }]}
            onPress={() => handleLetterPress(letter)}
            disabled={isPaused}
          >
            <Text style={[styles.letterText, { color: theme.colors.text }]}>
              {letter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.clearButton, { backgroundColor: theme.colors.textSecondary }]}
          onPress={handleClear}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.submitButton, { backgroundColor: theme.colors.secondary }]}
          onPress={handleSubmitWord}
        >
          <Text style={styles.buttonText}>Submit Word</Text>
        </TouchableOpacity>
      </View>

      {/* Found Words */}
      <View style={styles.foundWords}>
        <Text style={[styles.foundTitle, { color: theme.colors.textSecondary }]}>
          Found Words:
        </Text>
        <View style={styles.wordsList}>
          {foundWords.map((word, index) => (
            <Text key={index} style={[styles.foundWord, { color: theme.colors.primary }]}>
              {word} ({word.length})
            </Text>
          ))}
        </View>
      </View>
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
    fontSize: 12
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  wordDisplay: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    marginBottom: 20,
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center'
  },
  currentWord: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2
  },
  letterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20
  },
  letterTile: {
    width: 60,
    height: 60,
    margin: 5,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3
  },
  letterText: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10
  },
  clearButton: {
    flex: 0.4
  },
  submitButton: {
    flex: 0.55
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16
  },
  foundWords: {
    flex: 1
  },
  foundTitle: {
    fontSize: 14,
    marginBottom: 10
  },
  wordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  foundWord: {
    fontSize: 14,
    marginRight: 10,
    marginBottom: 5
  }
});
