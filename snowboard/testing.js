// SNOWBOARD ANALYZER TESTING & TROUBLESHOOTING GUIDE

/*
This guide provides structured testing procedures to verify the improved detection 
algorithms and troubleshoot any remaining issues.

== TESTING PROCEDURE ==

1. TRICK DETECTION VALIDATION

For each trick type, follow this procedure:
*/

// Add this function to help with testing
function runDetectionTest(videoElement, testName, expectedResults) {
    console.log(`%c=== Running ${testName} Test ===`, 'background: #222; color: #bada55; font-size: 14px;');
    
    // Create test state tracking
    const testState = {
        frameCount: 0,
        detections: {
            tailGrab: 0,
            methodGrab: 0,
            spin180: 0,
            spin360: 0,
            fallDetected: 0
        },
        spinMaxRotation: 0,
        testComplete: false
    };
    
    // Reset all detection state
    poseHistory.length = 0;
    verticalPositionHistory.length = 0;
    resetSpinTracking();
    resetFallDetection();
    
    // Create a toggle button for the test
    const testButton = document.createElement('button');
    testButton.innerText = 'Run Detection Test';
    testButton.style.position = 'fixed';
    testButton.style.top = '10px';
    testButton.style.right = '10px';
    testButton.style.zIndex = '9999';
    testButton.style.padding = '10px';
    testButton.style.backgroundColor = '#4CAF50';
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '4px';
    testButton.style.cursor = 'pointer';
    document.body.appendChild(testButton);
    
    // Create a test results display
    const resultsDisplay = document.createElement('div');
    resultsDisplay.style.position = 'fixed';
    resultsDisplay.style.top = '60px';
    resultsDisplay.style.right = '10px';
    resultsDisplay.style.zIndex = '9999';
    resultsDisplay.style.padding = '10px';
    resultsDisplay.style.backgroundColor = 'rgba(0,0,0,0.7)';
    resultsDisplay.style.color = 'white';
    resultsDisplay.style.borderRadius = '4px';
    resultsDisplay.style.width = '300px';
    resultsDisplay.style.display = 'none';
    document.body.appendChild(resultsDisplay);
    
    // Override the detection functions for testing
    const originalTailGrab = window.detectTailGrab;
    const originalMethodGrab = window.detectMethodGrab;
    const original180Spin = window.detect180Spin;
    
    // Test monitoring functions
    window.detectTailGrab = function() {
        const result = originalTailGrab();
        if (result) testState.detections.tailGrab++;
        return result;
    };
    
    window.detectMethodGrab = function() {
        const result = originalMethodGrab();
        if (result) testState.detections.methodGrab++;
        return result;
    };
    
    window.detect180Spin = function() {
        const result = original180Spin();
        if (result) testState.detections.spin180++;
        return result;
    };
    
    // Monitor spin rotation
    const originalTrackSpinRotation = window.trackSpinRotation;
    window.trackSpinRotation = function(landmarks) {
        originalTrackSpinRotation(landmarks);
        if (spinInProgress) {
            testState.spinMaxRotation = Math.max(testState.spinMaxRotation, Math.abs(totalRotation));
            if (detectedSpinDegrees >= 360) {
                testState.detections.spin360++;
            }
        }
    };
    
    // Monitor fall detection
    const originalDetectFall = window.detectFall;
    window.detectFall = function() {
        const result = originalDetectFall();
        if (result) testState.detections.fallDetected++;
        return result;
    };
    
    // Update display
    function updateTestDisplay() {
        if (!testState.testComplete) {
            testState.frameCount++;
            
            resultsDisplay.innerHTML = `
                <h3>${testName} Test</h3>
                <p>Frames processed: ${testState.frameCount}</p>
                <ul>
                    <li>Tail Grabs: ${testState.detections.tailGrab}</li>
                    <li>Method Grabs: ${testState.detections.methodGrab}</li>
                    <li>180° Spins: ${testState.detections.spin180}</li>
                    <li>360° Spins: ${testState.detections.spin360}</li>
                    <li>Falls: ${testState.detections.fallDetected}</li>
                    <li>Max Rotation: ${testState.spinMaxRotation.toFixed(1)}°</li>
                </ul>
            `;
            
            // Check if video ended
            if (videoElement.ended || videoElement.paused) {
                completeTest();
            } else {
                // Continue monitoring
                requestAnimationFrame(updateTestDisplay);
            }
        }
    }
    
    // Complete test and show results
    function completeTest() {
        if (testState.testComplete) return;
        
        testState.testComplete = true;
        console.log('Test complete. Results:');
        console.table({
            'Tail Grabs': testState.detections.tailGrab,
            'Method Grabs': testState.detections.methodGrab,
            '180° Spins': testState.detections.spin180,
            '360° Spins': testState.detections.spin360,
            'Falls': testState.detections.fallDetected,
            'Max Rotation': testState.spinMaxRotation.toFixed(1) + '°'
        });
        
        // Compare with expected results
        if (expectedResults) {
            let passedTests = 0;
            let totalTests = 0;
            const results = [];
            
            // Check each expected result
            for (const [key, expectedValue] of Object.entries(expectedResults)) {
                totalTests++;
                let actualValue;
                let passed = false;
                
                if (key === 'maxRotation') {
                    actualValue = testState.spinMaxRotation;
                    // Allow 30 degree margin for rotation
                    passed = Math.abs(actualValue - expectedValue) <= 30;
                } else if (key in testState.detections) {
                    actualValue = testState.detections[key];
                    // For counts, check if at least the expected amount was detected
                    passed = actualValue >= expectedValue;
                }
                
                results.push({
                    test: key,
                    expected: expectedValue,
                    actual: actualValue,
                    passed: passed
                });
                
                if (passed) passedTests++;
            }
            
            // Log results
            console.log(`Test results: ${passedTests}/${totalTests} passed`);
            console.table(results);
            
            // Show in UI
            resultsDisplay.innerHTML += `
                <h4>Test Results: ${passedTests}/${totalTests} passed</h4>
                <table style="width:100%; border-collapse: collapse;">
                    <tr>
                        <th style="text-align:left; border-bottom: 1px solid #ddd;">Test</th>
                        <th style="text-align:left; border-bottom: 1px solid #ddd;">Expected</th>
                        <th style="text-align:left; border-bottom: 1px solid #ddd;">Actual</th>
                        <th style="text-align:left; border-bottom: 1px solid #ddd;">Result</th>
                    </tr>
                    ${results.map(r => `
                        <tr>
                            <td style="border-bottom: 1px solid #333;">${r.test}</td>
                            <td style="border-bottom: 1px solid #333;">${r.expected}</td>
                            <td style="border-bottom: 1px solid #333;">${r.actual}</td>
                            <td style="border-bottom: 1px solid #333; color:${r.passed ? '#4CAF50' : '#F44336'}">
                                ${r.passed ? 'PASS' : 'FAIL'}
                            </td>
                        </tr>
                    `).join('')}
                </table>
            `;
        }
        
        // Restore original functions
        window.detectTailGrab = originalTailGrab;
        window.detectMethodGrab = originalMethodGrab;
        window.detect180Spin = original180Spin;
        window.trackSpinRotation = originalTrackSpinRotation;
        window.detectFall = originalDetectFall;
    }
    
    // Set up button handlers
    testButton.addEventListener('click', function() {
        // Toggle test
        if (resultsDisplay.style.display === 'none') {
            resultsDisplay.style.display = 'block';
            testButton.innerText = 'Stop Test';
            testButton.style.backgroundColor = '#F44336';
            
            // Start or resume video
            if (videoElement.paused) {
                videoElement.play();
            }
            
            // Start monitoring
            updateTestDisplay();
        } else {
            resultsDisplay.style.display = 'none';
            testButton.innerText = 'Run Detection Test';
            testButton.style.backgroundColor = '#4CAF50';
            
            // Complete test
            completeTest();
        }
    });
    
    // Clean up when video ends
    videoElement.addEventListener('ended', completeTest);
    
    console.log(`%c${testName} test ready. Click the button to start.`, 'color: #bada55');
}

/*
Example usage:

// When testing a specific trick, define expected results
const tailGrabExpected = {
    tailGrab: 1,      // Should detect at least 1 tail grab
    methodGrab: 0,    // Should not detect method grabs
    maxRotation: 0    // Should not detect significant rotation
};

// Add a button to initiate testing
document.getElementById('startTailGrabTest').addEventListener('click', function() {
    runDetectionTest(uploadedVideo, 'Tail Grab', tailGrabExpected);
});

2. SPIN DETECTION TESTS

For testing spin detection, add a dedicated spin test button:
*/

function addSpinTestButton() {
    const spinButton = document.createElement('button');
    spinButton.innerText = 'Test Spin Detection';
    spinButton.style.marginLeft = '10px';
    spinButton.addEventListener('click', function() {
        // Expected values for 360 spin
        const spinExpected = {
            spin180: 0,     // It should bypass 180 and detect 360
            spin360: 1,     // Should detect at least one 360 spin
            maxRotation: 360 // Should get close to 360 degrees rotation
        };
        
        runDetectionTest(uploadedVideo, 'Spin Detection', spinExpected);
    });
    
    // Add to upload form
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.appendChild(spinButton);
    }
}

/*
3. TROUBLESHOOTING COMMON ISSUES

If you're still having detection issues after implementing all the improvements, 
use these techniques to diagnose problems:
*/

// Add this function to monitor landmark quality
function monitorLandmarkQuality(landmarks) {
    if (!landmarks) return;
    
    // Count visible landmarks
    let visibleCount = 0;
    let highConfidenceCount = 0;
    
    landmarks.forEach(landmark => {
        if (landmark.visibility > 0.5) visibleCount++;
        if (landmark.visibility > 0.7) highConfidenceCount++;
    });
    
    // Check visibility of key points for each detection type
    const tailGrabPoints = hasGoodVisibility(landmarks, [15, 16, 31, 32], 0.7);
    const methodGrabPoints = hasGoodVisibility(landmarks, [15, 16, 23, 24, 0], 0.65);
    const spinPoints = hasGoodVisibility(landmarks, [11, 12, 23, 24], 0.65);
    
    // Log landmark quality metrics
    console.log(`Landmark quality: ${visibleCount}/${landmarks.length} visible points`);
    console.log(`Detection readiness: TailGrab=${tailGrabPoints}, Method=${methodGrabPoints}, Spin=${spinPoints}`);
    
    // Return quality metrics
    return {
        totalLandmarks: landmarks.length,
        visibleCount: visibleCount,
        highConfidenceCount: highConfidenceCount,
        tailGrabReady: tailGrabPoints,
        methodGrabReady: methodGrabPoints,
        spinReady: spinPoints,
        overallQuality: highConfidenceCount / landmarks.length
    };
}

// Function to log detection values for debugging
function logDetectionValues(landmarks) {
    if (!landmarks) return;
    
    // Skip logging most frames for performance
    if (frameCount % 30 !== 0) return;
    
    // 1. Get key body points
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftFoot = landmarks[31];
    const rightFoot = landmarks[32];
    
    // 2. Calculate distances for grab detection
    const leftHandToLeftFoot = isPointNear(leftWrist, leftFoot, 0.15);
    const rightHandToRightFoot = isPointNear(rightWrist, rightFoot, 0.15);
    
    // 3. Calculate shoulder angle for spin detection
    const shoulderAngle = Math.atan2(
        rightShoulder.y - leftShoulder.y,
        rightShoulder.x - leftShoulder.x
    ) * (180 / Math.PI);
    
    // 4. Log the values
    console.log(`Frame ${frameCount} - Detection metrics:`);
    console.log(`- Shoulder angle: ${shoulderAngle.toFixed(1)}°`);
    console.log(`- Left hand near left foot: ${leftHandToLeftFoot}`);
    console.log(`- Right hand near right foot: ${rightHandToRightFoot}`);
    console.log(`- Total rotation (if spinning): ${totalRotation.toFixed(1)}°`);
    console.log(`- Spin in progress: ${spinInProgress}`);
    
    // 5. Check current landmark quality
    const quality = monitorLandmarkQuality(landmarks);
    console.log(`- Landmark quality: ${(quality.overallQuality * 100).toFixed(1)}%`);
}

/*
4. IMPLEMENTATION CHECKLIST

Use this checklist to verify you've implemented all improvements:

☐ 1. Replaced core detection functions:
  ☐ detectTailGrab()
  ☐ detectMethodGrab()
  ☐ detectBackArch()
  ☐ trackSpinRotation()
  ☐ detectFall()
  ☐ isPointNear()
  ☐ calculateAngle()
  ☐ normalizeAngle()

☐ 2. Added new helper functions:
  ☐ hasGoodVisibility()
  ☐ analyzeGeneralFall()
  ☐ calculatePostureStability()
  ☐ drawDebugVisualizations()

☐ 3. Updated key constants:
  ☐ MIN_SPIN_FRAMES
  ☐ SPIN_DETECTION_CONFIDENCE
  ☐ FALL_DETECTION_THRESHOLD

☐ 4. Added new variables:
  ☐ spinStartTime
  ☐ spinStartLandmarks
  ☐ window.angleHistory

☐ 5. Updated reset functions:
  ☐ resetSpinTracking()
  ☐ resetFallDetection()

☐ 6. Added visualization and debugging code:
  ☐ drawDebugVisualizations() call in onPoseResults
  ☐ Testing functions from this guide

5. TUNING RECOMMENDATIONS

The final step is fine-tuning your detection thresholds. These values depend on your
camera angle, lighting, and the specific tricks you want to detect. 

Start with these values and adjust as needed:

// General detection constants
const MIN_DETECTION_CONFIDENCE = 0.65;  // MediaPipe confidence threshold

// Spin detection
const MIN_SPIN_FRAMES = 4;  // Minimum frames to detect a spin
const SPIN_DETECTION_CONFIDENCE = 0.65;  // Minimum landmark confidence

// Trick detection
const POSE_HISTORY_LENGTH = 45;  // Increased from 30 frames
const GRAB_THRESHOLD = 0.1;  // Distance threshold for grab detection

// Fall detection
const FALL_DETECTION_THRESHOLD = 0.2;  // Reduced from 0.25

6. ADDITIONAL IMPROVEMENTS

After implementing the core fixes, consider these enhancements:

1. Smoothing techniques - Apply moving averages to position data to reduce jitter
2. Calibration phase - Add a "calibration" step where users stand in T-pose
3. User feedback system - Ask users to rate detection accuracy to collect data
4. Multi-angle support - Better handle different camera perspectives
5. Add more specific trick detection - Indy grabs, nosegrabs, etc.
*/

// Finally, add a comprehensive testing function
function addComprehensiveTestFunction() {
    // Creates a button that tests all detection aspects
    const testAllButton = document.createElement('button');
    testAllButton.innerText = 'Run Full Detection Test Suite';
    testAllButton.style.marginTop = '20px';
    testAllButton.style.padding = '10px 15px';
    testAllButton.style.backgroundColor = '#2196F3';
    testAllButton.style.color = 'white';
    testAllButton.style.border = 'none';
    testAllButton.style.borderRadius = '4px';
    testAllButton.style.cursor = 'pointer';
    testAllButton.style.display = 'block';
    testAllButton.style.margin = '20px auto';
    
    testAllButton.addEventListener('click', function() {
        // Enable debug mode
        const debugDiv = document.getElementById('debugInfo') || document.createElement('div');
        debugDiv.id = 'debugInfo';
        debugDiv.style.display = 'block';
        debugDiv.style.position = 'fixed';
        debugDiv.style.bottom = '10px';
        debugDiv.style.right = '10px';
        debugDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
        debugDiv.style.color = 'white';
        debugDiv.style.padding = '10px';
        debugDiv.style.borderRadius = '5px';
        document.body.appendChild(debugDiv);
        
        // Add a monitor callback to onPoseResults
        const originalOnPoseResults = window.onPoseResults;
        window.onPoseResults = function(results) {
            // Call original function
            originalOnPoseResults(results);
            
            // Add additional monitoring
            if (results.poseLandmarks) {
                // Log detection values periodically
                logDetectionValues(results.poseLandmarks);
                
                // Update debug visualization
                drawDebugVisualizations(results.poseLandmarks);
            }
        };
        
        // Start video playback
        if (uploadedVideo.paused) {
            uploadedVideo.play();
        }
        
        alert('Comprehensive test mode enabled. Check the console for detailed detection metrics.');
    });
    
    // Add to page
    const controlsDiv = document.querySelector('.controls');
    if (controlsDiv) {
        controlsDiv.appendChild(testAllButton);
    }
}

// Call this function on page load to add all testing capabilities
window.addEventListener('load', function() {
    addSpinTestButton();
    addComprehensiveTestFunction();
    
    console.log('%cSnowboard detection testing tools loaded!', 'background: #4CAF50; color: white; padding: 5px; border-radius: 3px;');
});