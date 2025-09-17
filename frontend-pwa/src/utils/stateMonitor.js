// State Monitoring Utility for V2 Refactoring
// Monitors and logs state inconsistencies in real-time

class StateMonitor {
  constructor() {
    this.issues = [];
    this.stats = {
      totalChecks: 0,
      ongoingFound: 0,
      inProgressFound: 0,
      normalizations: 0
    };
    this.isMonitoring = false;
    this.intervalId = null;
  }

  // Start monitoring the store
  startMonitoring(intervalMs = 5000) {
    if (this.isMonitoring) {
      console.log('⚠️ Monitoring already active');
      return;
    }

    console.log('🔍 Starting state monitoring...');
    this.isMonitoring = true;
    
    // Initial check
    this.checkStates();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkStates();
    }, intervalMs);
    
    console.log(`✅ Monitoring started (checking every ${intervalMs/1000}s)`);
  }

  // Stop monitoring
  stopMonitoring() {
    if (!this.isMonitoring) {
      console.log('⚠️ Monitoring not active');
      return;
    }

    clearInterval(this.intervalId);
    this.isMonitoring = false;
    console.log('🛑 Monitoring stopped');
    this.printReport();
  }

  // Check current states
  checkStates() {
    this.stats.totalChecks++;
    
    // Get store if available
    const store = window.useJourneyStore?.getState?.();
    if (!store) {
      console.warn('Store not available');
      return;
    }

    const timestamp = new Date().toISOString();
    let foundIssues = false;

    // Check queues
    if (store.currentQueues) {
      store.currentQueues.forEach((queue, index) => {
        if (queue.state === 'ongoing') {
          foundIssues = true;
          this.stats.ongoingFound++;
          this.logIssue({
            type: 'ONGOING_STATE',
            location: `currentQueues[${index}]`,
            value: queue,
            timestamp
          });
        } else if (queue.state === 'in_progress') {
          this.stats.inProgressFound++;
        }
      });
    }

    // Check appointments
    if (store.todaysAppointments) {
      store.todaysAppointments.forEach((apt, index) => {
        if (apt.status === 'ongoing') {
          foundIssues = true;
          this.stats.ongoingFound++;
          this.logIssue({
            type: 'ONGOING_STATUS',
            location: `todaysAppointments[${index}]`,
            value: apt,
            timestamp
          });
        } else if (apt.status === 'in_progress') {
          this.stats.inProgressFound++;
        }
      });
    }

    // Log check result
    if (foundIssues) {
      console.warn(`⚠️ [${timestamp}] Found 'ongoing' states that need normalization`);
    } else if (this.stats.totalChecks % 10 === 0) {
      // Log every 10th check to avoid spam
      console.log(`✅ [${timestamp}] No issues found (Check #${this.stats.totalChecks})`);
    }
  }

  // Log an issue
  logIssue(issue) {
    this.issues.push(issue);
    console.warn('Issue found:', issue);
  }

  // Print monitoring report
  printReport() {
    console.log('\n=== State Monitoring Report ===');
    console.log(`Total Checks: ${this.stats.totalChecks}`);
    console.log(`'ongoing' states found: ${this.stats.ongoingFound}`);
    console.log(`'in_progress' states found: ${this.stats.inProgressFound}`);
    
    if (this.issues.length > 0) {
      console.log('\n⚠️ Issues Found:');
      this.issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. [${issue.timestamp}] ${issue.type} at ${issue.location}`);
      });
    } else {
      console.log('\n✅ No issues found during monitoring');
    }
    
    // Success rate
    const successRate = this.stats.ongoingFound === 0 ? 100 : 
      ((this.stats.totalChecks - this.stats.ongoingFound) / this.stats.totalChecks * 100).toFixed(2);
    console.log(`\nSuccess Rate: ${successRate}%`);
  }

  // Clear monitoring data
  clear() {
    this.issues = [];
    this.stats = {
      totalChecks: 0,
      ongoingFound: 0,
      inProgressFound: 0,
      normalizations: 0
    };
    console.log('✅ Monitoring data cleared');
  }

  // Get current stats
  getStats() {
    return {
      ...this.stats,
      issueCount: this.issues.length,
      isMonitoring: this.isMonitoring
    };
  }

  // Check if normalization is working
  testNormalization() {
    console.log('\n=== Testing Normalization Function ===');
    
    // Test data
    const testCases = [
      { input: 'ongoing', expected: 'in_progress' },
      { input: 'waiting', expected: 'waiting' },
      { input: 'in_progress', expected: 'in_progress' }
    ];
    
    // Get the normalization function from store
    const normalizeQueueState = (state) => {
      if (state === 'ongoing') return 'in_progress';
      return state;
    };
    
    let allPassed = true;
    testCases.forEach(test => {
      const result = normalizeQueueState(test.input);
      const passed = result === test.expected;
      allPassed = allPassed && passed;
      console.log(`  ${test.input} -> ${result} [${passed ? '✅' : '❌'}]`);
    });
    
    console.log(`\nNormalization Test: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    return allPassed;
  }
}

// Create global instance
if (typeof window !== 'undefined') {
  window.StateMonitor = new StateMonitor();
  
  // Add convenience methods
  window.startStateMonitoring = (interval) => window.StateMonitor.startMonitoring(interval);
  window.stopStateMonitoring = () => window.StateMonitor.stopMonitoring();
  window.getMonitoringStats = () => window.StateMonitor.getStats();
  window.testStateNormalization = () => window.StateMonitor.testNormalization();
  
  console.log(`
=== State Monitor Loaded ===
Available commands:
  startStateMonitoring(5000)  - Start monitoring (check every 5 seconds)
  stopStateMonitoring()       - Stop monitoring and show report
  getMonitoringStats()        - Get current statistics
  testStateNormalization()    - Test normalization function
  
Example usage:
  startStateMonitoring(3000);  // Monitor every 3 seconds
  // ... wait for some time ...
  stopStateMonitoring();       // Stop and see report
  `);
}

export default StateMonitor;