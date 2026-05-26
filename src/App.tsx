import React, { useEffect, useRef, useState } from 'react';
import { getEngine, resetEngine } from './engine/Engine';
import type { GameEngine } from './engine/Engine';
import type { Player } from './engine/types';

import { AuthPlugin } from './plugins/AuthPlugin';
import { SupabasePlugin } from './plugins/SupabasePlugin';
import { StagePlugin } from './plugins/StagePlugin';
import { EnemyPlugin } from './plugins/EnemyPlugin';
import { GoldPlugin } from './plugins/GoldPlugin';
import { TapPlugin } from './plugins/TapPlugin';
import { ComponentPlugin } from './plugins/ComponentPlugin';
import { OverclockPlugin } from './plugins/OverclockPlugin';
import { SavePlugin } from './plugins/SavePlugin';
import { ZonePlugin } from './plugins/ZonePlugin';
import { ItemPlugin } from './plugins/ItemPlugin';

import { LoginScreen } from './components/auth/LoginScreen';
import { RegisterScreen } from './components/auth/RegisterScreen';
import { ResetScreen } from './components/auth/ResetScreen';
import { BootScreen } from './components/game/BootScreen';
import { GameScreen } from './components/game/GameScreen';

type AppScreen = 'login' | 'register' | 'reset' | 'booting' | 'game';

function buildEngine(): GameEngine {
  resetEngine();
  const engine = getEngine();

  engine.register(new AuthPlugin());
  engine.register(new SupabasePlugin());
  engine.register(new StagePlugin());
  engine.register(new EnemyPlugin());
  engine.register(new GoldPlugin());
  engine.register(new TapPlugin());
  engine.register(new ComponentPlugin());
  engine.register(new OverclockPlugin());
  engine.register(new ItemPlugin());
  engine.register(new SavePlugin());
  engine.register(new ZonePlugin());

  return engine;
}

export default function App() {
  const engineRef = useRef<GameEngine | null>(null);
  const [screen, setScreen] = useState<AppScreen>('booting');
  const [player, setPlayer] = useState<Player | null>(null);
  useEffect(() => {
    const engine = buildEngine();
    engineRef.current = engine;

    const unsubAuth = engine.on<Player>('auth_success', event => {
      setPlayer(event.payload);
      setScreen(s => s === 'booting' ? s : 'game');
    });

    const unsubSignout = engine.on('auth_signout', () => {
      setPlayer(null);
      setScreen('login');
    });

    engine.boot().then(() => {
      // Auth session check is fire-and-forget, give it a moment to resolve
      setTimeout(() => {
        const authPlugin = engine.getPlugin<AuthPlugin>('auth');
        const existingPlayer = authPlugin?.getPlayer();
        if (existingPlayer) {
          setPlayer(existingPlayer);
          setScreen('game');
        } else {
          setScreen(s => s === 'booting' ? 'login' : s);
        }
      }, 300);
    });

    return () => {
      unsubAuth();
      unsubSignout();
    };
  }, []);

const engine = engineRef.current;
  const authPlugin = engine?.getPlugin<AuthPlugin>('auth');

  if (!engine || !authPlugin) {
    return (
      <div className="min-h-screen circuit-bg flex items-center justify-center">
        <div className="font-pixel glow-cyan animate-blink" style={{ color: '#00f5ff', fontSize: '10px' }}>
          INITIALIZING...
        </div>
      </div>
    );
  }

  if (screen === 'booting') {
    return (
      <BootScreen
        engine={engine}
        onComplete={() => {
          if (player) {
            setScreen('game');
          } else {
            setScreen('login');
          }
        }}
      />
    );
  }

  if (screen === 'login') {
    return (
      <LoginScreen
        authPlugin={authPlugin}
        onSwitchToRegister={() => setScreen('register')}
        onSwitchToReset={() => setScreen('reset')}
      />
    );
  }

  if (screen === 'register') {
    return (
      <RegisterScreen
        authPlugin={authPlugin}
        onSwitchToLogin={() => setScreen('login')}
      />
    );
  }

  if (screen === 'reset') {
    return (
      <ResetScreen
        authPlugin={authPlugin}
        onBack={() => setScreen('login')}
      />
    );
  }

  if (screen === 'game' && player) {
    return <GameScreen engine={engine} player={player} />;
  }

  return null;
}
