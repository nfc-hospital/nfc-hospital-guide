// Test script for journeyStore state normalization
// Copy and paste this in browser console after loading the app

const testJourneyStore = () => {
  console.log('=== Journey Store Test ===');
  
  // Access the store
  const store = window.useJourneyStore?.getState?.();
  
  if (!store) {
    console.error('❌ Journey store not accessible. Make sure the app is loaded.');
    return;
  }
  
  console.log('Current store state:');
  console.log('  Patient State:', store.patientState);
  console.log('  Current Queues:', store.currentQueues);
  console.log('  Today\'s Appointments:', store.todaysAppointments);
  
  // Check for 'ongoing' in queues
  const hasOngoingInQueues = store.currentQueues?.some(q => q.state === 'ongoing');
  console.log(`\n✅ Check: No 'ongoing' in current queues: ${!hasOngoingInQueues ? 'PASS' : 'FAIL'}`);
  
  // Check for 'in_progress' in queues
  const inProgressQueues = store.currentQueues?.filter(q => q.state === 'in_progress') || [];
  console.log(`✅ Check: Found ${inProgressQueues.length} queue(s) with 'in_progress' state`);
  
  // Check for 'ongoing' in appointments
  const hasOngoingInAppointments = store.todaysAppointments?.some(a => a.status === 'ongoing');
  console.log(`✅ Check: No 'ongoing' in appointments: ${!hasOngoingInAppointments ? 'PASS' : 'FAIL'}`);
  
  // Check for 'in_progress' in appointments
  const inProgressAppointments = store.todaysAppointments?.filter(a => a.status === 'in_progress') || [];
  console.log(`✅ Check: Found ${inProgressAppointments.length} appointment(s) with 'in_progress' status`);
  
  // Test getCurrentTask function
  console.log('\n=== Testing getCurrentTask ===');
  const currentTask = store.getCurrentTask();
  console.log('Current Task:', currentTask);
  if (currentTask) {
    console.log('  Task State/Status:', currentTask.state || currentTask.status);
    console.log('  Task Details:', currentTask);
  }
  
  // Test state finding logic
  console.log('\n=== Testing State Finding Logic ===');
  if (inProgressQueues.length > 0) {
    console.log('✅ In-progress queue found:', inProgressQueues[0]);
    console.log('  Exam:', inProgressQueues[0].exam?.title || 'Unknown');
    console.log('  Queue Number:', inProgressQueues[0].queue_number);
  } else {
    console.log('ℹ️ No in-progress queues found (this is normal if no exam is in progress)');
  }
  
  // Summary
  console.log('\n=== Test Summary ===');
  const allTestsPassed = !hasOngoingInQueues && !hasOngoingInAppointments;
  console.log(`Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (!allTestsPassed) {
    console.log('\n⚠️ Issues found:');
    if (hasOngoingInQueues) {
      console.log('  - Some queues still have "ongoing" state');
      console.log('    Affected queues:', store.currentQueues?.filter(q => q.state === 'ongoing'));
    }
    if (hasOngoingInAppointments) {
      console.log('  - Some appointments still have "ongoing" status');
      console.log('    Affected appointments:', store.todaysAppointments?.filter(a => a.status === 'ongoing'));
    }
  }
  
  return {
    success: allTestsPassed,
    stats: {
      totalQueues: store.currentQueues?.length || 0,
      inProgressQueues: inProgressQueues.length,
      totalAppointments: store.todaysAppointments?.length || 0,
      inProgressAppointments: inProgressAppointments.length,
      hasOngoingInQueues,
      hasOngoingInAppointments
    }
  };
};

// Instructions for manual testing
console.log(`
=== Manual Testing Instructions ===

1. Copy and run this in browser console:
   testJourneyStore()

2. To simulate data refresh:
   const store = useJourneyStore.getState();
   await store.fetchJourneyData();
   testJourneyStore();

3. To check specific queue state:
   const store = useJourneyStore.getState();
   console.log('Queues:', store.currentQueues);
   console.log('In-Progress:', store.currentQueues?.filter(q => q.state === 'in_progress'));

4. To manually trigger state normalization test:
   Load the test file first, then run: testStateNormalization()
`);

// Export for browser
if (typeof window !== 'undefined') {
  window.testJourneyStore = testJourneyStore;
}