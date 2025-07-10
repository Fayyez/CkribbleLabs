# CkribbleLabs - Multiplayer Drawing & Guessing Game

## 1. Brief Description

CkribbleLabs is a real-time multiplayer drawing and guessing game inspired by popular games like Pictionary and Skribbl.io. Players take turns drawing words while others try to guess what's being drawn. The game features interactive canvas drawing, real-time chat, scoring systems, and both individual and team-based gameplay modes.

The application provides an engaging social gaming experience where players can create or join rooms, select from themed word categories, customize their avatars, and compete in multiple rounds of creative drawing and quick thinking.

## 2. Gameplay

### Core Mechanics
- **Turn-Based Drawing**: Players rotate as the "drawer" who must illustrate a selected word
- **Real-Time Guessing**: Other players submit guesses through a live chat system
- **Word Selection**: Drawers choose from 3 randomly generated word options
- **Time Pressure**: Each drawing round has a countdown timer (default 60 seconds)
- **Scoring System**: Points awarded based on guess accuracy and speed
- **Multiple Rounds**: Games consist of multiple rounds where each player gets to draw

### Game Flow
1. **Room Creation/Joining**: Players create or join game rooms with custom settings
2. **Avatar & Display Name**: Players select avatars and set display names
3. **Game Configuration**: Host configures number of rounds, drawing time, themes, and game mode
4. **Drawing Phase**: Current drawer selects a word and illustrates it on the canvas
5. **Guessing Phase**: Other players submit guesses via chat in real-time
6. **Scoring**: Points awarded for correct guesses and successful drawings
7. **Round Progression**: Game continues until all rounds are completed
8. **Final Results**: Leaderboard displays final scores and declares winner(s)

### Winning Conditions
- **Individual Mode**: Player with highest cumulative score wins
- **Team Mode**: Team with highest combined/average score wins

## 3. Tech Stack

### Frontend
- **React 18**: Modern React with hooks for component architecture
- **Redux Toolkit**: State management for game state, user authentication, and real-time data
- **React Router**: Client-side routing for different game screens
- **CSS3**: Custom styling with responsive design

### Backend & Infrastructure
- **Supabase**: Backend-as-a-Service platform providing:
  - **Database**: PostgreSQL for persistent data storage
  - **Real-time**: WebSocket connections for live multiplayer functionality
  - **Authentication**: User management and session handling
  - **Edge Functions**: Serverless functions for game logic

### Serverless Functions (Supabase Edge Functions)
- **create-room**: Room creation and configuration
- **join-room**: Player joining and room state management
- **start-game**: Game initialization and turn order setup
- **start-round**: Round management and word generation
- **end-round**: Turn completion and score calculation
- **end-game**: Game completion and cleanup
- **submit-guess**: Guess validation and scoring
- **get-random-words**: Word generation from themed categories

### Real-time Communication
- **Supabase Realtime**: WebSocket-based real-time updates for:
  - Canvas drawing synchronization
  - Chat messages and guesses
  - Game state changes
  - Player join/leave events
  - Timer synchronization
  - Score updates

## 4. Features

### 🎨 Drawing & Canvas
- **Interactive Drawing Canvas**: HTML5 Canvas with touch and mouse support
- **Drawing Tools**: Multiple brush sizes, colors, and drawing modes
- **Real-time Synchronization**: Drawing strokes broadcast instantly to all players
- **Canvas Controls**: Clear canvas, undo functionality
- **Responsive Design**: Optimized for desktop and mobile devices

### 💬 Communication
- **Real-time Chat**: Live messaging system for guesses and communication
- **Guess Validation**: Automatic word matching with close-guess hints
- **System Messages**: Game events and notifications
- **Correct Guess Highlighting**: Visual feedback for successful guesses

### 👥 Multiplayer Features
- **Room System**: Create and join custom game rooms
- **Player Management**: Real-time player list with join/leave handling
- **Spectator Mode**: Watch ongoing games
- **Cross-platform**: Web-based, works on any device with browser

### 🏆 Team-Based Mode
- **Team Formation**: Players can be assigned to teams (Red/Blue)
- **Team Scoring**: Combined and average team scores
- **Team Competition**: Team vs team gameplay
- **Team Leaderboards**: Separate rankings for individual and team modes

### 🎯 Themed Words
- **Multiple Categories**: 
  - Default general words
  - Animals
  - Geography
  - Computer Science
  - Custom themes
- **Difficulty Scaling**: Words selected based on game settings
- **Word Management**: Prevents word repetition within games

### 👤 Avatar Selection
- **Custom Avatars**: Players can select from multiple avatar options
- **Profile Images**: Support for custom profile pictures
- **Display Names**: Customizable player names
- **Visual Identity**: Consistent avatar display across all game screens

### ⚙️ Game Customization
- **Configurable Rounds**: 1-10 rounds per game
- **Drawing Time**: Adjustable time limits (30-120 seconds)
- **Room Capacity**: Support for 2-10 players
- **Game Modes**: Individual and team-based competition
- **Private Rooms**: Password-protected games

### 📊 Scoring & Statistics
- **Dynamic Scoring**: Points based on guess speed and accuracy
- **Drawer Rewards**: Points for successful drawings
- **Real-time Updates**: Live score tracking during games
- **Final Leaderboards**: Comprehensive results with rankings
- **Game Statistics**: Round completion, turn tracking, and performance metrics

### 🔄 Game Management
- **Automatic Turn Rotation**: Seamless player turn management
- **Game State Persistence**: Reliable state management across connections
- **Error Recovery**: Automatic reconnection and state restoration
- **Graceful Ending**: Proper game cleanup and room management

### 📱 User Experience
- **Responsive UI**: Mobile-friendly interface
- **Intuitive Controls**: Easy-to-use drawing tools and navigation
- **Visual Feedback**: Clear indicators for game state and user actions
- **Accessibility**: Keyboard navigation and screen reader support

## 5. Additional Technical Details

### Architecture Patterns
- **Component-Based**: Modular React components for maintainability
- **Redux Slices**: Organized state management with dedicated slices for:
  - Authentication (`authSlice`)
  - Game state (`gameSlice`)
  - Canvas operations (`canvasSlice`)
  - Chat functionality (`chatSlice`)
  - Room management (`roomSlice`)
  - Player presence (`presenceSlice`)

### Database Schema
- **Users Table**: Player profiles and authentication data
- **Rooms Table**: Game room configuration and state
- **Real-time Subscriptions**: Live updates for multiplayer synchronization

### Security Features
- **Input Validation**: Server-side validation for all game actions
- **Rate Limiting**: Protection against spam and abuse
- **CORS Configuration**: Secure cross-origin resource sharing
- **Authentication**: Secure user sessions and authorization

### Performance Optimizations
- **Efficient Rendering**: Optimized canvas updates and React re-renders
- **Debounced Updates**: Reduced network traffic for drawing operations
- **State Normalization**: Efficient Redux state structure
- **Lazy Loading**: Code splitting for optimal bundle sizes

### Development & Deployment
- **Local Development**: Supabase CLI for local development environment
- **Environment Management**: Separate development and production configurations
- **CI/CD Ready**: Structured for automated deployment pipelines
- **Monitoring**: Built-in logging and error tracking

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Support**: iOS Safari, Chrome Mobile
- **WebSocket Support**: Fallback handling for connectivity issues
- **Canvas Support**: HTML5 Canvas with touch event handling

---

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Supabase account and project
- Modern web browser with WebSocket support

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure Supabase environment variables
4. Deploy Edge Functions: `npm run deploy-functions`
5. Start development server: `npm start`

### Configuration
- Update `src/lib/supabase.js` with your Supabase credentials
- Configure room settings and game parameters
- Customize themes and word categories in Edge Functions

---

*CkribbleLabs - Where creativity meets competition!* 