# Staff Hub - Replit Project Guide

## Overview

Staff Hub is a cross-platform mobile application built with React Native and Expo. It provides a dual-mode information management system with public content browsing and authenticated staff access. The app features role-based permissions (Public, Staff, Management), custom PIN authentication, internal messaging, content management, and staff administration capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**
- **Framework**: React Native 0.81.5 with Expo 54
- **Navigation**: React Navigation v7 (native-stack and bottom-tabs)
- **State Management**: React Context API for authentication and data
- **UI Libraries**: 
  - react-native-reanimated for animations
  - expo-blur for translucent effects
  - react-native-gesture-handler for touch interactions
  - react-native-keyboard-controller for keyboard handling
- **Type Safety**: TypeScript with strict mode enabled

**Navigation Structure**
The app implements a hybrid navigation pattern:
- Public users: Stack navigation only (PublicStackNavigator)
- Authenticated staff: Bottom tab navigation with nested stacks (StaffTabNavigator)
  - 4 tabs for staff: Home, Messages, Content, Profile
  - 5 tabs for management: Adds Management tab between Content and Profile
- Authentication state determines root navigator via MainTabNavigator

**Component Architecture**
- Themed components (ThemedText, ThemedView) that respond to system color scheme
- Reusable screen wrappers (ScreenScrollView, ScreenKeyboardAwareScrollView, ScreenFlatList) that handle safe areas and insets consistently
- Animated components using react-native-reanimated for micro-interactions (buttons, cards)
- Custom UI components: Button, Card, SegmentedControl, StaffAvatar

**Design System**
Centralized theme constants in `constants/theme.ts`:
- Color palettes for light/dark modes with semantic naming
- Spacing scale (xs to 4xl)
- Typography styles (h1-h4, body, small, link)
- Border radius values
- Platform-specific adaptations (iOS blur effects, Android solid backgrounds)

### Authentication & Authorization

**Custom PIN Authentication**
- No SSO/OAuth - uses local PIN/code system (4-6 digit codes)
- PINs are hashed using expo-crypto (SHA-256) before storage
- Authentication flow:
  1. Public screens show "Staff Login" button
  2. PIN entry modal with numeric keypad and masked input
  3. Shake animation on failed attempts with haptic feedback
  4. Auto-navigation to staff area on success
- Session persistence via AsyncStorage with encrypted credentials

**Role-Based Access Control**
Three user roles with granular permissions:
- **Public**: Browse published content only
- **Staff**: Custom permissions (viewRestrictedData, editContent, sendMessages)
- **Management**: All staff permissions plus manageStaff capability

Permission checks occur in:
- Context layer (AuthContext, DataContext)
- Screen-level UI rendering
- Navigation structure (conditional tab visibility)

### Data Management

**Local Storage Strategy**
- AsyncStorage for all persistent data (no backend/database)
- Storage keys namespaced under `@staffhub/` prefix
- Data structures:
  - Staff members with hashed PINs and permissions
  - Messages and conversations
  - Content items with categories and publish states
  - Current user session

**Data Context Provider**
Centralized data layer (DataContext) provides:
- CRUD operations for staff, messages, and content
- Derived state (conversations from messages, categories from content)
- Automatic data persistence to AsyncStorage
- Mock data initialization for development

**State Management Pattern**
- Context providers wrap the app tree (AuthProvider → DataProvider)
- Custom hooks (useAuth, useData) provide type-safe context access
- State updates trigger AsyncStorage persistence
- No external state management libraries (Redux, MobX, etc.)

### Screen Components

**Public Screens**
- PublicHomeScreen: Category cards, search, featured content carousel
- CategoryDetailScreen: Filtered content list by category
- ContentDetailScreen: Full content view with metadata
- PinLoginScreen: Custom numeric keypad with animations

**Staff Screens**
- StaffDashboardScreen: Quick actions, recent activity, role-appropriate content
- MessagesScreen: Conversation list with unread counts
- ConversationScreen: Real-time chat interface with message bubbles
- NewMessageScreen: Staff selection and compose interface
- ContentScreen: Content list with publish/draft segmented control
- CreateContentScreen: Multi-field form with category selection
- EditContentScreen: Content editor with publish/delete actions
- StaffProfileScreen: User settings and logout

**Management Screens**
- ManagementScreen: Dashboard with menu items
- StaffDirectoryScreen: Searchable staff list
- AddStaffScreen: Staff creation with auto-generated PIN
- EditStaffScreen: Staff editor with permission toggles and PIN reset

### Error Handling

**Error Boundary Implementation**
- Class component ErrorBoundary wraps entire app
- Custom ErrorFallback with detailed stack traces in development
- Production mode shows user-friendly error screen
- App restart capability via expo's reloadAppAsync
- Optional error logging callback (onError prop)

## External Dependencies

**Expo SDK Modules**
- expo-constants: Environment and manifest access
- expo-crypto: SHA-256 hashing for PIN security
- expo-font: Custom font loading
- expo-haptics: Tactile feedback for interactions
- expo-image: Optimized image component
- expo-linking: Deep linking support
- expo-splash-screen: Launch screen management
- expo-status-bar: Status bar styling
- expo-web-browser: In-app browser functionality
- expo-blur: iOS blur effects
- expo-glass-effect: Material blur effects

**React Native Libraries**
- @react-native-async-storage/async-storage: Local data persistence
- react-native-gesture-handler: Touch gesture system
- react-native-keyboard-controller: Advanced keyboard handling
- react-native-reanimated: Native-driven animations
- react-native-safe-area-context: Safe area insets
- react-native-screens: Native screen optimization
- react-native-web: Web platform support

**Navigation**
- @react-navigation/native: Core navigation
- @react-navigation/native-stack: iOS-style stack navigation
- @react-navigation/bottom-tabs: Tab bar navigation
- @react-navigation/elements: Header utilities

**Development Tools**
- TypeScript 5.9.2 with strict mode
- ESLint with Expo config and Prettier integration
- Babel with module resolver for @ alias imports
- React Compiler experimental support enabled

**Platform Support**
- iOS: Tab navigation, blur effects, haptics
- Android: Edge-to-edge display, predictive back gesture disabled
- Web: Single-page output, keyboard fallbacks for native-only features