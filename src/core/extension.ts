/**
 * Main extension entry point
 * Initializes the sidebar application when the side panel is opened
 * @since 1.0.0
 */

import { Sidebar } from '../ui/sidebar';

/**
 * Initialize extension when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🤖 Dude Extension initializing...');
    
    try {
        // Initialize the main sidebar application
        const sidebar = new Sidebar();
        console.log('✅ Dude Extension initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Dude Extension:', error);
    }
});
