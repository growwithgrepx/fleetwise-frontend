const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || process.env.BASE_URL || 'https://test.grepx.sg',
    specPattern: 'cypress/e2e/**/*.cy.{js,ts,jsx,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    
    // Performance optimizations
    video: false, // Disable video recording for faster tests
    screenshotOnRunFailure: true,
    
    // Timeout configurations
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    
    // Retry configuration
    retries: {
      runMode: 1,
      openMode: 0
    },
    
    // Viewport configuration
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // Setup and teardown
    setupNodeEvents(on, config) {
      // Log test events
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        table(message) {
          console.table(message);
          return null;
        }
      });

      // Cleanup after tests
      on('after:run', async (results) => {
        // Clean up any test artifacts
        console.log('🧹 Cleaning up after E2E tests...');
        
        // You can add custom cleanup logic here
        // For example, clearing localStorage, cookies, etc.
        
        return results;
      });
    },
  },
  
  // Component testing configuration (if needed later)
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
}); 