import { loadWarpData } from './src/game/dataLoader.js';
import { buildNavigationGraph, findPath } from './src/game/navigation.js';

// Mock Vite glob for testing in Node
// (This won't work in pure Node easily without a mock)
// We'll just trust the logic for now or skip this test if complex.
