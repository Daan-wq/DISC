/**
 * Application Constants
 * 
 * Centralized location for application-wide constants.
 * This ensures single source of truth for values used across multiple files.
 */

/**
 * The hardcoded quiz ID for the DISC assessment
 * This is the only quiz in the system (single quiz, never changes)
 * 
 * If you need to support multiple quizzes in the future:
 * 1. Move this to environment variables
 * 2. Or fetch from database
 * 3. Update all imports to use the new source
 */
export const QUIZ_ID = '00000000-0000-0000-0000-000000000001'
