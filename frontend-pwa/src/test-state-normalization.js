// Test script for state normalization
// Run this in browser console after loading the app

const testStateNormalization = () => {
  console.log('=== State Normalization Test ===');
  
  // Test 1: Queue state normalization
  const testQueueStates = [
    { state: 'ongoing', expected: 'in_progress' },
    { state: 'in_progress', expected: 'in_progress' },
    { state: 'waiting', expected: 'waiting' },
    { state: 'called', expected: 'called' },
    { state: 'completed', expected: 'completed' }
  ];
  
  const normalizeQueueState = (state) => {
    if (state === 'ongoing') return 'in_progress';
    return state;
  };
  
  console.log('Testing queue state normalization:');
  testQueueStates.forEach(test => {
    const result = normalizeQueueState(test.state);
    const passed = result === test.expected;
    console.log(`  ${test.state} -> ${result} [${passed ? '✅ PASS' : '❌ FAIL'}]`);
  });
  
  // Test 2: Appointment status normalization
  const testAppointmentStatuses = [
    { status: 'ongoing', expected: 'in_progress' },
    { status: 'in_progress', expected: 'in_progress' },
    { status: 'scheduled', expected: 'scheduled' },
    { status: 'completed', expected: 'completed' }
  ];
  
  const normalizeAppointmentStatus = (status) => {
    if (status === 'ongoing') return 'in_progress';
    return status;
  };
  
  console.log('\nTesting appointment status normalization:');
  testAppointmentStatuses.forEach(test => {
    const result = normalizeAppointmentStatus(test.status);
    const passed = result === test.expected;
    console.log(`  ${test.status} -> ${result} [${passed ? '✅ PASS' : '❌ FAIL'}]`);
  });
  
  // Test 3: Mock backend response normalization
  console.log('\nTesting backend response normalization:');
  const mockBackendResponse = {
    queues: [
      { queue_id: '1', state: 'ongoing', exam: 'X-Ray' },
      { queue_id: '2', state: 'waiting', exam: 'Blood Test' },
      { queue_id: '3', state: 'ongoing', exam: 'MRI' }
    ],
    appointments: [
      { appointment_id: 'a1', status: 'ongoing' },
      { appointment_id: 'a2', status: 'scheduled' }
    ]
  };
  
  // Normalize queues
  const normalizedQueues = mockBackendResponse.queues.map(q => ({
    ...q,
    state: normalizeQueueState(q.state)
  }));
  
  // Normalize appointments
  const normalizedAppointments = mockBackendResponse.appointments.map(a => ({
    ...a,
    status: normalizeAppointmentStatus(a.status)
  }));
  
  console.log('Normalized queues:', normalizedQueues);
  console.log('Normalized appointments:', normalizedAppointments);
  
  // Verify all 'ongoing' are converted to 'in_progress'
  const hasOngoingInQueues = normalizedQueues.some(q => q.state === 'ongoing');
  const hasOngoingInAppointments = normalizedAppointments.some(a => a.status === 'ongoing');
  
  console.log('\n=== Test Results ===');
  console.log(`No 'ongoing' in normalized queues: ${!hasOngoingInQueues ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`No 'ongoing' in normalized appointments: ${!hasOngoingInAppointments ? '✅ PASS' : '❌ FAIL'}`);
  
  const inProgressQueues = normalizedQueues.filter(q => q.state === 'in_progress');
  const inProgressAppointments = normalizedAppointments.filter(a => a.status === 'in_progress');
  
  console.log(`Found ${inProgressQueues.length} queues with 'in_progress' state`);
  console.log(`Found ${inProgressAppointments.length} appointments with 'in_progress' status`);
  
  return {
    success: !hasOngoingInQueues && !hasOngoingInAppointments,
    normalizedQueues,
    normalizedAppointments
  };
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testStateNormalization = testStateNormalization;
  console.log('State normalization test loaded. Run: testStateNormalization()');
}

export default testStateNormalization;