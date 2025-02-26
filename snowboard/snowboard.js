// Get the video upload element and video player
const uploadForm = document.getElementById('uploadForm');
const videoUpload = document.getElementById('videoUpload');
const uploadedVideo = document.getElementById('uploadedVideo');

// Create a canvas for visualization
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.style.display = 'block';
canvas.style.marginTop = '20px';
canvas.style.border = '2px solid #ccc';
canvas.style.maxWidth = '100%';

// Create a container for feedback
const feedbackContainer = document.createElement('div');
feedbackContainer.id = 'feedbackContainer';
feedbackContainer.style.marginTop = '20px';
feedbackContainer.style.padding = '15px';
feedbackContainer.style.backgroundColor = '#f9f9f9';
feedbackContainer.style.border = '1px solid #ddd';
feedbackContainer.style.borderRadius = '5px';
feedbackContainer.style.display = 'none';

// Add canvas and feedback to the document
const videoContainer = document.getElementById('videoContainer');
videoContainer.appendChild(canvas);
videoContainer.appendChild(feedbackContainer);

// Create a loading indicator
const loadingIndicator = document.createElement('div');
loadingIndicator.id = 'loadingIndicator';
loadingIndicator.innerHTML = 'Loading MediaPipe model... Please wait';
loadingIndicator.style.padding = '20px';
loadingIndicator.style.backgroundColor = '#f0f0f0';
loadingIndicator.style.textAlign = 'center';
loadingIndicator.style.marginTop = '20px';
loadingIndicator.style.display = 'none';
videoContainer.appendChild(loadingIndicator);

// Track frames for analysis
let frameCount = 0;
const ANALYZE_EVERY_N_FRAMES = 3; // Analyze every 3rd frame for better performance
let lastPoseData = null; // Store the last valid pose data

// Store pose history for trick detection
const poseHistory = [];
const POSE_HISTORY_LENGTH = 30; // Store 30 frames of history for trick detection

// Constants for fall detection
const FALL_HISTORY_LENGTH = 45; // Longer history for fall detection (1.5 seconds at 30fps)
const FALL_DETECTION_THRESHOLD = 0.25; // Threshold for detecting sudden movements
const MIN_FALL_CONFIDENCE = 0.6; // Minimum confidence for reliable fall detection

// Store recent vertical positions for fall detection
let verticalPositionHistory = [];
let lastStablePosition = null;
let fallDetected = false;
let fallType = null;
let fallAnalysis = null;
let fallRecoveryAdvice = null;

// Constants for spin detection
const MIN_SPIN_FRAMES = 5; // Minimum frames to detect a spin
const SPIN_COMPLETION_THRESHOLD = 20; // Degrees of tolerance for spin completion
const SPIN_DETECTION_CONFIDENCE = 0.6; // Minimum confidence for reliable spin detection

// Track continuous rotation for spin detection
let totalRotation = 0;
let lastShoulderAngle = null;
let spinStarted = false;
let spinInProgress = false;
let spinStartAngle = null;
let spinFrameCount = 0;
let detectedSpinDegrees = 0;

// Handle the form submission and video upload
uploadForm.addEventListener('submit', async function (event) {
    event.preventDefault();  // Prevent the form from refreshing the page

    if (videoUpload.files.length > 0) {
        const file = videoUpload.files[0];
        const videoURL = URL.createObjectURL(file);
        uploadedVideo.src = videoURL;

        // Show loading indicator
        loadingIndicator.style.display = 'block';
        feedbackContainer.style.display = 'none';
        
        // Show the video player
        uploadedVideo.style.display = 'block';
        
        // Wait for video metadata to load before setting up canvas
        uploadedVideo.onloadedmetadata = () => {
            canvas.width = uploadedVideo.videoWidth;
            canvas.height = uploadedVideo.videoHeight;
            
            // Set canvas display dimensions while maintaining aspect ratio
            const aspectRatio = uploadedVideo.videoWidth / uploadedVideo.videoHeight;
            const maxWidth = videoContainer.clientWidth;
            canvas.style.width = `${maxWidth}px`;
            canvas.style.height = `${maxWidth / aspectRatio}px`;
        };
        
        // Start loading the pose model immediately
        initPoseDetection();
        
        // Initialize Pose detection when user clicks play
        uploadedVideo.onplay = () => {
            // Reset pose history when video starts playing
            poseHistory.length = 0;
            
            // Show current frame info
            const frameInfoDiv = document.createElement('div');
            frameInfoDiv.id = 'frameInfo';
            frameInfoDiv.style.marginTop = '10px';
            frameInfoDiv.style.fontSize = '14px';
            frameInfoDiv.style.color = '#666';
            videoContainer.appendChild(frameInfoDiv);
            
            // Reset fall detection when video starts
            resetFallDetection();
            
            // Reset spin tracking when video starts
            resetSpinTracking();
        };
    } else {
        alert("Please upload a video file!");
    }
});

// Initialize MediaPipe Pose
async function initPoseDetection() {
    loadingIndicator.style.display = 'block';
    loadingIndicator.innerHTML = 'Loading MediaPipe model... Please wait';
    
    try {
        // Initialize MediaPipe Pose with higher performance settings
        const pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });
        
        // Configure the pose instance for better performance and accuracy
        pose.setOptions({
            modelComplexity: 2, // Use the highest accuracy model (0, 1, or 2)
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.7, // Increase detection confidence for better accuracy
            minTrackingConfidence: 0.7, // Increase tracking confidence
        });
        
        // Hide loading indicator when model is ready
        pose.onResults((results) => {
            if (loadingIndicator.style.display !== 'none') {
                loadingIndicator.style.display = 'none';
            }
            onPoseResults(results);
        });
        
        // Start processing frames
        startPoseProcessing(pose);
        
    } catch (error) {
        console.error("Error initializing pose detection:", error);
        loadingIndicator.style.display = 'none';
        feedbackContainer.style.display = 'block';
        feedbackContainer.innerHTML = `<p>Error: ${error.message || 'Could not initialize pose detection'}</p>
                                     <p>Make sure all libraries are loaded correctly.</p>`;
    }
}

// Process video frames with MediaPipe Pose
async function startPoseProcessing(pose) {
    // Check if the video is playing
    if (uploadedVideo.paused || uploadedVideo.ended) {
        // If paused, wait and check again later
        setTimeout(() => startPoseProcessing(pose), 100);
        return;
    }
    
    // Only process every Nth frame for better performance
    frameCount++;
    if (frameCount % ANALYZE_EVERY_N_FRAMES === 0) {
        // Update frame counter display
        const frameInfoDiv = document.getElementById('frameInfo');
        if (frameInfoDiv) {
            const currentTime = uploadedVideo.currentTime.toFixed(2);
            frameInfoDiv.textContent = `Frame: ${frameCount}, Time: ${currentTime}s`;
        }
        
        // Capture the current frame
        ctx.drawImage(uploadedVideo, 0, 0, canvas.width, canvas.height);
        
        try {
            // Process the frame with MediaPipe Pose
            await pose.send({image: canvas});
        } catch (error) {
            console.error("Error processing frame:", error);
        }
    } else {
        // For skipped frames, just draw the video and last known pose if available
        ctx.drawImage(uploadedVideo, 0, 0, canvas.width, canvas.height);
        if (lastPoseData) {
            drawLandmarks(lastPoseData);
            drawConnectors(lastPoseData);
        }
    }
    
    // Schedule next frame with requestAnimationFrame for better performance
    requestAnimationFrame(() => startPoseProcessing(pose));
}

// Handle pose detection results
function onPoseResults(results) {
    // Clear canvas for fresh drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the video frame
    ctx.drawImage(uploadedVideo, 0, 0, canvas.width, canvas.height);
    
    if (results.poseLandmarks) {
        // Store the most recent pose data
        lastPoseData = results.poseLandmarks;
        
        // Add to pose history for trick detection
        poseHistory.push({
            landmarks: JSON.parse(JSON.stringify(results.poseLandmarks)),
            timestamp: uploadedVideo.currentTime
        });
        
        // Limit history length
        if (poseHistory.length > POSE_HISTORY_LENGTH) {
            poseHistory.shift();
        }
        
        // Draw pose landmarks
        drawLandmarks(results.poseLandmarks);
        
        // Connect landmarks with lines to show skeleton
        drawConnectors(results.poseLandmarks);
        
        // Analyze snowboarding posture
        analyzeSnowboardPosture(results.poseLandmarks);
        
        // Detect snowboarding tricks
        detectTricks();
        
        // Track fall status
        trackFallStatus(results.poseLandmarks);
        
        // Track spin rotation
        trackSpinRotation(results.poseLandmarks);
    }
}

// Draw landmarks on canvas with improved visibility
function drawLandmarks(landmarks) {
    if (!landmarks) return;
    
    // Draw points with varying sizes based on confidence
    landmarks.forEach((landmark, index) => {
        // Skip landmarks with low visibility
        if (landmark.visibility < 0.2) return;
        
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        // Vary radius based on visibility
        const radius = 4 + (landmark.visibility * 6);
        
        // Different colors for different body parts for better visibility
        let color = 'red';
        
        // Color code: torso=blue, arms=green, legs=orange, face=purple
        if (index >= 11 && index <= 24) { // Torso landmarks
            color = '#4285F4'; // Blue
        } else if ((index >= 13 && index <= 16) || (index >= 17 && index <= 22)) { // Arms
            color = '#0F9D58'; // Green
        } else if (index >= 25 && index <= 32) { // Legs
            color = '#F4B400'; // Orange
        } else if (index <= 10) { // Face
            color = '#DB4437'; // Red
        }
        
        // Draw point
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        
        // Add border for better visibility
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Label key points with improved visibility
        const keyPointNames = {
            0: 'nose', 11: 'l_shoulder', 12: 'r_shoulder', 
            23: 'l_hip', 24: 'r_hip', 25: 'l_knee', 26: 'r_knee',
            27: 'l_ankle', 28: 'r_ankle', 15: 'l_hand', 16: 'r_hand'
        };
        
        if (keyPointNames[index] && landmark.visibility > 0.7) {
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(keyPointNames[index], x, y - 10);
            ctx.strokeText(keyPointNames[index], x, y - 10);
        }
    });
}

// Draw connectors between landmarks to create a skeleton with improved visibility
function drawConnectors(landmarks) {
    if (!landmarks) return;
    
    // Define connections for basic skeleton
    const connections = [
        // Torso
        [11, 12, '#4285F4'], // Left shoulder to right shoulder
        [11, 23, '#4285F4'], // Left shoulder to left hip
        [12, 24, '#4285F4'], // Right shoulder to right hip
        [23, 24, '#4285F4'], // Left hip to right hip
        
        // Arms - green
        [11, 13, '#0F9D58'], [13, 15, '#0F9D58'], // Left arm
        [12, 14, '#0F9D58'], [14, 16, '#0F9D58'], // Right arm
        
        // Legs - orange
        [23, 25, '#F4B400'], [25, 27, '#F4B400'], [27, 31, '#F4B400'], // Left leg
        [24, 26, '#F4B400'], [26, 28, '#F4B400'], [28, 32, '#F4B400']  // Right leg
    ];
    
    // Draw the connections with thickness based on visibility
    for (const [startIdx, endIdx, color] of connections) {
        const startPoint = landmarks[startIdx];
        const endPoint = landmarks[endIdx];
        
        if (!startPoint || !endPoint || 
            startPoint.visibility < 0.2 || 
            endPoint.visibility < 0.2) continue;
        
        const startX = startPoint.x * canvas.width;
        const startY = startPoint.y * canvas.height;
        const endX = endPoint.x * canvas.width;
        const endY = endPoint.y * canvas.height;
        
        // Calculate line width based on average visibility
        const avgVisibility = (startPoint.visibility + endPoint.visibility) / 2;
        const lineWidth = 2 + (avgVisibility * 4);
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = color || '#00FF00';
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }
}

// Function to update the analysis results panel with improvement tips
function updateAnalysisPanel(postureTips, trickInfo) {
    // Get the analysis panel
    const analysisPanel = document.querySelector('.analysis-panel');
    if (!analysisPanel) return;
    
    // Find or create the content area for analysis results
    let analysisContent = document.getElementById('analysisContent');
    if (!analysisContent) {
        // Remove placeholder text if it exists
        const placeholder = analysisPanel.querySelector('.placeholder-text');
        if (placeholder) {
            placeholder.remove();
        }
        
        // Create analysis content container
        analysisContent = document.createElement('div');
        analysisContent.id = 'analysisContent';
        analysisPanel.appendChild(analysisContent);
    }
    
    // Create HTML for the analysis content
    let analysisHTML = '<h3>Improvement Tips</h3>';
    
    // Add posture tips
    if (postureTips && postureTips.length > 0) {
        analysisHTML += `
            <div class="tips-section">
                <h4>Posture Improvements</h4>
                <ul>
                    ${postureTips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // Add trick-specific tips if a trick was detected
    if (trickInfo) {
        // Add extra spacing between sections
        analysisHTML += `
            <div style="margin-top: 25px; border-top: 1px solid #ddd; padding-top: 15px;" class="tips-section">
                <h4>${trickInfo.name}</h4>
                <ul>
                    ${trickInfo.tips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // Update the analysis content
    analysisContent.innerHTML = analysisHTML;
}

// Analyze snowboarding posture with more accurate measurements
function analyzeSnowboardPosture(landmarks) {
    if (!landmarks) return;
    
    let feedback = [];
    let postureTips = [];
    
    // Get key body points (using MediaPipe pose landmark indices)
    const keypoints = {
        nose: landmarks[0],
        leftShoulder: landmarks[11],
        rightShoulder: landmarks[12],
        leftElbow: landmarks[13],
        rightElbow: landmarks[14],
        leftWrist: landmarks[15],
        rightWrist: landmarks[16],
        leftHip: landmarks[23],
        rightHip: landmarks[24],
        leftKnee: landmarks[25],
        rightKnee: landmarks[26],
        leftAnkle: landmarks[27],
        rightAnkle: landmarks[28]
    };
    
    // Check if enough key points are visible for basic analysis
    const coreVisibilityThreshold = 0.5;
    const corePointsVisible = [
        keypoints.leftShoulder, keypoints.rightShoulder,
        keypoints.leftHip, keypoints.rightHip,
        keypoints.leftKnee, keypoints.rightKnee
    ].every(point => point && point.visibility > coreVisibilityThreshold);
    
    if (!corePointsVisible) {
        feedbackContainer.innerHTML = "<p>Need better visibility of your core body for accurate analysis</p>";
        return;
    }
    
    // Detect board stance (regular or goofy)
    const stance = detectStance(landmarks);
    feedback.push(`<strong>Stance:</strong> ${stance}`);
    
    // Check knee bend with improved angle calculation
    const leftKneeAngle = calculateAngle(
        [keypoints.leftHip.x, keypoints.leftHip.y],
        [keypoints.leftKnee.x, keypoints.leftKnee.y],
        [keypoints.leftAnkle.x, keypoints.leftAnkle.y]
    );
    
    const rightKneeAngle = calculateAngle(
        [keypoints.rightHip.x, keypoints.rightHip.y],
        [keypoints.rightKnee.x, keypoints.rightKnee.y],
        [keypoints.rightAnkle.x, keypoints.rightAnkle.y]
    );
    
    // Analyze knee bend with more specific feedback
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
    feedback.push(`<strong>Knee Bend:</strong> ${avgKneeAngle.toFixed(1)}°`);
    
    if (avgKneeAngle > 160) {
        postureTips.push("Your knees are too straight. Bend your knees more (aim for 130-140°) for better control, shock absorption, and easier turning.");
    } else if (avgKneeAngle < 100) {
        postureTips.push("Your knees are bent too much. A more moderate bend (130-140°) will give you better balance and energy efficiency.");
    } else if (avgKneeAngle > 140) {
        postureTips.push("Try to bend your knees a bit more for optimal balance and control.");
    } else if (avgKneeAngle < 120) {
        postureTips.push("Try straightening your knees slightly for better endurance and power transfer.");
    } else {
        postureTips.push("Good knee bend! This provides optimal balance between control and power.");
    }
    
    // Check asymmetry in knee bend
    const kneeBendDiff = Math.abs(leftKneeAngle - rightKneeAngle);
    if (kneeBendDiff > 15) {
        postureTips.push(`Your knee bend is asymmetrical (${kneeBendDiff.toFixed(1)}° difference). Try to balance your weight more evenly between both legs.`);
    }
    
    // Check upper body position with improved measurements
    const shoulderMidpoint = {
        x: (keypoints.leftShoulder.x + keypoints.rightShoulder.x) / 2,
        y: (keypoints.leftShoulder.y + keypoints.rightShoulder.y) / 2
    };
    
    const hipMidpoint = {
        x: (keypoints.leftHip.x + keypoints.rightHip.x) / 2,
        y: (keypoints.leftHip.y + keypoints.rightHip.y) / 2
    };
    
    // Calculate angle of torso relative to vertical
    const torsoAngle = Math.abs(Math.atan2(
        shoulderMidpoint.x - hipMidpoint.x,
        hipMidpoint.y - shoulderMidpoint.y
    ) * (180 / Math.PI));
    
    feedback.push(`<strong>Forward Lean:</strong> ${torsoAngle.toFixed(1)}°`);
    
    if (torsoAngle > 45) {
        postureTips.push("You're leaning too far forward. Reduce your forward lean to 15-30° for better balance and to prevent falls.");
    } else if (torsoAngle < 10) {
        postureTips.push("You're standing too upright. Lean forward slightly (15-30°) for better board control and edge engagement.");
    } else if (torsoAngle > 30) {
        postureTips.push("Try reducing your forward lean slightly for better overall balance.");
    } else if (torsoAngle < 15) {
        postureTips.push("A slightly more aggressive forward lean will improve your edge control.");
    } else {
        postureTips.push("Good upper body position! This forward lean gives you optimal control.");
    }
    
    // Check shoulder rotation (alignment with board direction)
    const shoulderRotation = calculateShoulderRotation(keypoints);
    feedback.push(`<strong>Shoulder Alignment:</strong> ${shoulderRotation.toFixed(1)}°`);
    
    if (Math.abs(shoulderRotation) > 30) {
        postureTips.push("Your shoulders are over-rotated. Try to keep them more aligned with your board for better balance and control.");
    } else if (Math.abs(shoulderRotation) < 5) {
        postureTips.push("Your shoulders are perfectly aligned with your board. This gives you good stability.");
    } else {
        postureTips.push("Good shoulder alignment. This helps maintain your balance through turns.");
    }
    
    // Analyze arm position
    if (keypoints.leftElbow.visibility > 0.5 && keypoints.rightElbow.visibility > 0.5) {
        const armSpread = calculateArmSpread(keypoints);
        feedback.push(`<strong>Arm Position:</strong> ${armSpread.toFixed(1)}% of shoulder width`);
        
        if (armSpread > 200) {
            postureTips.push("Your arms are spread too wide. Keep them closer to your body for better balance.");
        } else if (armSpread < 100) {
            postureTips.push("Your arms are too close to your body. Spread them slightly for better balance.");
        } else {
            postureTips.push("Good arm position for maintaining balance.");
        }
    }
    
    // Display posture information in the feedback container (bottom section)
    let feedbackHTML = `<h3>Posture Analysis</h3>
                      <div class="metrics">${feedback.join('<br>')}</div>`;
    
    feedbackContainer.innerHTML = feedbackHTML;
    feedbackContainer.style.display = 'block';
    
    // Update the analysis panel with the tips (top right section)
    let currentTrickInfo = getCurrentTrick();
    updateAnalysisPanel(postureTips, currentTrickInfo);
}

// Detect snowboarding tricks based on pose patterns
function detectTricks() {
    // We don't need to do anything here anymore since getCurrentTrick handles it
    // This function is still called from onPoseResults but doesn't take any action
    // since we're moving the trick display to the analysis panel
}

function getCurrentTrick() {
    // Give 360 detection highest priority and run it first
    if (detect360Spin()) {
        return {
            name: "Trick Detected: 360 Spin",
            tips: [
                "Keep your shoulders aligned with your board during takeoff",
                "Spot your landing by turning your head to look over your shoulder",
                "Maintain a compact body position for faster rotation",
                "Land with knees bent to absorb impact"
            ]
        };
    }
    
    // Then check other tricks
    const isNoseGrab = detectNoseGrab();
    const isTailGrab = detectTailGrab();
    const isMethodGrab = detectMethodGrab();
    const is180Spin = detect180Spin();
    const isCarving = detectCarvingTurn();
    
    if (is180Spin) {
        return {
            name: "Trick Detected: 180 Spin",
            tips: [
                "Initiate rotation with your shoulders more",
                "Keep your knees bent throughout the rotation",
                "Look in the direction of your spin to help complete the rotation",
                "Land with your weight centered for stability"
            ]
        };
    } else if (isNoseGrab) {
        return {
            name: "Trick Detected: Nose Grab",
            tips: [
                "Extend your front leg more to bring the nose closer",
                "Keep your back straight for better balance",
                "Try to hold the grab longer for style points",
                "Practice with more pop for a cleaner execution"
            ]
        };
    } else if (isTailGrab) {
        return {
            name: "Trick Detected: Tail Grab",
            tips: [
                "Try to hold the grab longer for better style",
                "Keep your back straight while grabbing for better control",
                "Pull your board up higher for a more pronounced grab"
            ]
        };
    } else if (isMethodGrab) {
        return {
            name: "Trick Detected: Method Grab",
            tips: [
                "Extend your back leg more for better board extension",
                "Try to arch your back more for proper method style",
                "Hold the grab longer for better technique"
            ]
        };
    } else if (isCarving) {
        return {
            name: "Movement Detected: Carving Turn",
            tips: [
                "Lean more into the turn to increase edge angle",
                "Keep your upper body facing downhill as you turn",
                "Bend your knees more during the turn for better control"
            ]
        };
    }
    
    // No trick detected
    return null;
}

// Detect tail grab (hand reaching toward back foot)
function detectTailGrab() {
    // Need enough pose history
    if (poseHistory.length < 5) return false;
    
    // Look at recent frames
    const recentPoses = poseHistory.slice(-5);
    
    // Count frames where hand is near foot position
    let tailGrabFrames = 0;
    
    for (const pose of recentPoses) {
        const landmarks = pose.landmarks;
        
        // Regular stance: right hand to right foot
        // Goofy stance: left hand to left foot
        const leftHandNearLeftFoot = isPointNear(landmarks[15], landmarks[31], 0.15);
        const rightHandNearRightFoot = isPointNear(landmarks[16], landmarks[32], 0.15);
        
        if (leftHandNearLeftFoot || rightHandNearRightFoot) {
            tailGrabFrames++;
        }
    }
    
    // If we see the hand near foot position in majority of recent frames
    return tailGrabFrames >= 3;
}


// Detect nose grab (hand reaching toward front foot)
function detectNoseGrab() {
    // Need enough pose history
    if (poseHistory.length < 5) return false;
    
    // Look at recent frames
    const recentPoses = poseHistory.slice(-5);
    
    // Count frames where hand is near foot position
    let noseGrabFrames = 0;
    
    for (const pose of recentPoses) {
        const landmarks = pose.landmarks;
        
        // Front foot landmarks and hands
        const leftHand = landmarks[15];
        const rightHand = landmarks[16];
        const leftFoot = landmarks[31]; 
        const rightFoot = landmarks[32];
        
        // For regular stance: left hand to left foot (which is front)
        // For goofy stance: right hand to right foot (which is front)
        const leftHandNearLeftFoot = isPointNear(landmarks[15], landmarks[31], 0.15);
        const rightHandNearRightFoot = isPointNear(landmarks[16], landmarks[32], 0.15);
        
        // Detect which is the front foot based on stance
        const stance = detectStance(landmarks);
        
        if ((stance.includes("Regular") && leftHandNearLeftFoot) || 
            (stance.includes("Goofy") && rightHandNearRightFoot)) {
            noseGrabFrames++;
        }
    }
    
    // If we see the hand near foot position in majority of recent frames
    return noseGrabFrames >= 3;
}

// Detect method grab (frontside hand reaching to backside edge)
function detectMethodGrab() {
    if (poseHistory.length < 5) return false;
    
    const recentPoses = poseHistory.slice(-5);
    let methodGrabFrames = 0;
    
    for (const pose of recentPoses) {
        const landmarks = pose.landmarks;
        
        // Method grab typically involves frontside hand grabbing backside edge
        // For regular stance: right hand reaches across to left edge
        // For goofy stance: left hand reaches across to right edge
        const rightHandCrossBody = (landmarks[16].x < landmarks[23].x); // Right hand past left hip
        const leftHandCrossBody = (landmarks[15].x > landmarks[24].x);  // Left hand past right hip
        
        // Also check for characteristic back arch
        const backArched = detectBackArch(landmarks);
        
        if ((rightHandCrossBody || leftHandCrossBody) && backArched) {
            methodGrabFrames++;
        }
    }
    
    return methodGrabFrames >= 3;
}

// Detect 180 spin (significant change in shoulder orientation)
function detect180Spin() {
    if (poseHistory.length < 15) return false; // Need more frames for spin detection
    
    // Look at beginning and end of history window
    const startPose = poseHistory[0].landmarks;
    const endPose = poseHistory[poseHistory.length - 1].landmarks;
    
    // Calculate initial and final shoulder angles
    const startShoulderAngle = Math.atan2(
        startPose[12].y - startPose[11].y,
        startPose[12].x - startPose[11].x
    ) * (180 / Math.PI);
    
    const endShoulderAngle = Math.atan2(
        endPose[12].y - endPose[11].y,
        endPose[12].x - endPose[11].x
    ) * (180 / Math.PI);
    
    // Calculate the absolute rotation (handle angle wrapping)
    let rotationAmount = Math.abs(endShoulderAngle - startShoulderAngle);
    if (rotationAmount > 180) rotationAmount = 360 - rotationAmount;
    
    // Check if rotation is close to 180 degrees
    return rotationAmount > 135 && rotationAmount < 225;
}

// Specialized 360 spin detection that won't be confused with nose grabs or falls
function detect360Spin() {
    // Need enough frames for detection
    if (poseHistory.length < 15) return false;
    
    // Calculate total rotation across all frames
    let totalRotation = 0;
    let previousAngle = null;
    let validFrames = 0;
    let maxAngularVelocity = 0;
    
    // First: calculate rotation metrics
    for (let i = 0; i < poseHistory.length; i++) {
        const landmarks = poseHistory[i].landmarks;
        
        // Only use frames with decent visibility
        if (landmarks[11].visibility < 0.4 || landmarks[12].visibility < 0.4) {
            continue;
        }
        
        // Calculate shoulder angle
        const currentAngle = Math.atan2(
            landmarks[12].y - landmarks[11].y,
            landmarks[12].x - landmarks[11].x
        ) * (180 / Math.PI);
        
        validFrames++;
        
        if (previousAngle !== null) {
            // Calculate rotation delta with wrapping
            let delta = currentAngle - previousAngle;
            
            // Normalize to -180 to 180 range
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            
            // Track the maximum angular velocity (rotation speed)
            if (Math.abs(delta) > maxAngularVelocity) {
                maxAngularVelocity = Math.abs(delta);
            }
            
            // Accumulate total rotation
            totalRotation += Math.abs(delta);
        }
        
        previousAngle = currentAngle;
    }
    
    // If we don't have enough valid frames, can't make a determination
    if (validFrames < 10) return false;
    
    // Fast 360s: look for substantial total rotation AND high angular velocity
    const hasEnoughRotation = totalRotation >= 270; // Allow slightly less than 360 to account for start/end cut off
    const isHighVelocity = maxAngularVelocity > 15; // Faster per-frame rotation for 360s than 180s
    
    // CRITICAL: Add specific checks to distinguish from nose grab
    // In a nose grab, arms extend but rotation is minimal
    let isArmExtended = false;
    let hasConsistentRotation = false;
    
    // Count consistent rotation frames vs. arm extension frames
    let rotationFrames = 0;
    let armExtensionFrames = 0;
    
    // Reset for second scan
    previousAngle = null;
    
    for (let i = 0; i < poseHistory.length; i++) {
        const landmarks = poseHistory[i].landmarks;
        
        // Skip low visibility frames
        if (landmarks[11].visibility < 0.4 || landmarks[12].visibility < 0.4) {
            continue;
        }
        
        // Check for arm extension (which could be confused with nose grab)
        // Look at wrist-to-shoulder distances
        if (landmarks[15].visibility > 0.4 && landmarks[16].visibility > 0.4) {
            const leftArmExtension = Math.sqrt(
                Math.pow(landmarks[15].x - landmarks[11].x, 2) + 
                Math.pow(landmarks[15].y - landmarks[11].y, 2)
            );
            
            const rightArmExtension = Math.sqrt(
                Math.pow(landmarks[16].x - landmarks[12].x, 2) + 
                Math.pow(landmarks[16].y - landmarks[12].y, 2)
            );
            
            // If either arm is significantly extended
            if (leftArmExtension > 0.2 || rightArmExtension > 0.2) {
                armExtensionFrames++;
            }
        }
        
        // Check for rotation
        const currentAngle = Math.atan2(
            landmarks[12].y - landmarks[11].y,
            landmarks[12].x - landmarks[11].x
        ) * (180 / Math.PI);
        
        if (previousAngle !== null) {
            let delta = currentAngle - previousAngle;
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            
            // Count frames with significant rotation
            if (Math.abs(delta) > 8) {
                rotationFrames++;
            }
        }
        
        previousAngle = currentAngle;
    }
    
    // In a 360, we should see MORE rotation frames than in a nose grab
    // and extended arms should be accompanied by rotation
    hasConsistentRotation = rotationFrames >= 8;
    isArmExtended = armExtensionFrames > validFrames * 0.3; // Allow some extended arm frames
    
    // A 360 should have both extended arms AND consistent rotation
    // This differentiates it from a nose grab which has extended arms but minimal rotation
    const is360NotNoseGrab = (hasConsistentRotation && isArmExtended) || 
                             (hasEnoughRotation && rotationFrames > armExtensionFrames);
    
    // CRITICAL: Add specific checks to distinguish from falls
    // In a fall, there's usually a sudden vertical movement and less clean rotation
    const isSmoothRotation = rotationFrames > validFrames * 0.6; // Most frames should show rotation in a 360
    
    // Use ALL of our criteria to identify a true 360
    return hasEnoughRotation && isHighVelocity && is360NotNoseGrab && isSmoothRotation;
}

// Helper function to calculate total rotation in a window of frames
function calculateWindowRotation(frames) {
    if (frames.length < 5) return 0;
    
    let totalRotation = 0;
    let previousAngle = null;
    let confidentFrames = 0;
    let rotationDirection = 0;
    let consistentDirectionFrames = 0;
    let maxConsistentDirection = 0;
    
    // Define minimum confidence threshold for reliable detection
    const MIN_VISIBILITY = 0.6;
    
    // First pass: determine dominant rotation direction
    for (let i = 0; i < frames.length; i++) {
        const landmarks = frames[i].landmarks;
        
        // Skip frames with low visibility
        if (landmarks[11].visibility < MIN_VISIBILITY || landmarks[12].visibility < MIN_VISIBILITY) {
            continue;
        }
        
        // Calculate shoulder angle
        const currentAngle = Math.atan2(
            landmarks[12].y - landmarks[11].y,
            landmarks[12].x - landmarks[11].x
        ) * (180 / Math.PI);
        
        if (previousAngle !== null) {
            // Calculate rotation delta, handling 360 degree wrapping
            let delta = currentAngle - previousAngle;
            
            // Normalize to -180 to +180 range
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            
            // Only count significant rotations (filter out minor movements)
            if (Math.abs(delta) > 3) {
                const currentDirection = Math.sign(delta);
                
                // Track consistent direction
                if (currentDirection === rotationDirection) {
                    consistentDirectionFrames++;
                } else {
                    // Direction changed, reset counter
                    if (consistentDirectionFrames > maxConsistentDirection) {
                        maxConsistentDirection = consistentDirectionFrames;
                    }
                    consistentDirectionFrames = 1;
                    rotationDirection = currentDirection;
                }
            }
        }
        
        previousAngle = currentAngle;
    }
    
    // Update max if the last segment was the longest
    if (consistentDirectionFrames > maxConsistentDirection) {
        maxConsistentDirection = consistentDirectionFrames;
    }
    
    // If we don't have enough consistent rotation, it's not a 360
    if (maxConsistentDirection < 10) return 0;
    
    // Second pass: calculate total rotation in the dominant direction
    previousAngle = null;
    let dominantRotation = 0;
    
    for (let i = 0; i < frames.length; i++) {
        const landmarks = frames[i].landmarks;
        
        // Skip frames with low visibility
        if (landmarks[11].visibility < MIN_VISIBILITY || landmarks[12].visibility < MIN_VISIBILITY) {
            continue;
        }
        
        // Calculate shoulder angle
        const currentAngle = Math.atan2(
            landmarks[12].y - landmarks[11].y,
            landmarks[12].x - landmarks[11].x
        ) * (180 / Math.PI);
        
        if (previousAngle !== null) {
            // Calculate rotation delta, handling 360 degree wrapping
            let delta = currentAngle - previousAngle;
            
            // Normalize to -180 to +180 range
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            
            // Add to total rotation (only count movements in dominant direction)
            if (Math.sign(delta) === Math.sign(rotationDirection) || Math.abs(delta) < 3) {
                dominantRotation += Math.abs(delta);
            }
        }
        
        previousAngle = currentAngle;
    }
    
    return dominantRotation;
}

// Detect carving turn (consistent lateral movement with edge angle)
function detectCarvingTurn() {
    if (poseHistory.length < 10) return false;
    
    // Track horizontal movement direction over time
    let movingRight = 0;
    let movingLeft = 0;
    
    // Reference point (nose)
    for (let i = 1; i < poseHistory.length; i++) {
        const prevX = poseHistory[i-1].landmarks[0].x;
        const currX = poseHistory[i].landmarks[0].x;
        
        if (currX > prevX + 0.01) movingRight++;
        if (currX < prevX - 0.01) movingLeft++;
    }
    
    // Detect consistent movement in one direction with proper leaning
    const isMovingConsistently = (movingRight > poseHistory.length * 0.7) || 
                               (movingLeft > poseHistory.length * 0.7);
    
    // Check for proper carving lean angle in recent frames
    let properEdgeAngle = 0;
    const recentPoses = poseHistory.slice(-5);
    
    for (const pose of recentPoses) {
        const landmarks = pose.landmarks;
        const shoulderTilt = Math.abs(landmarks[11].y - landmarks[12].y);
        const shoulderWidth = Math.abs(landmarks[11].x - landmarks[12].x);
        
        if (shoulderTilt > shoulderWidth * 0.12) {
            properEdgeAngle++;
        }
    }
    
    return isMovingConsistently && (properEdgeAngle >= 3);
}

// Helper function: detect back arch (for method grab)
function detectBackArch(landmarks) {
    if (!landmarks) return false;
    
    const spine = [landmarks[0], landmarks[11], landmarks[12], landmarks[23], landmarks[24]];
    
    // Check if spine forms an arch
    // Simplified: check if shoulders are significantly higher than hips
    const shoulderY = Math.min(landmarks[11].y, landmarks[12].y);
    const hipY = Math.min(landmarks[23].y, landmarks[24].y);
    
    return (hipY - shoulderY) > 0.15; // Significant height difference
}

// Detect stance (regular or goofy)
function detectStance(landmarks) {
    // This is a simplified detection. In a real app, you might 
    // need to analyze movement patterns over multiple frames
    
    // Try to detect which foot is forward based on shoulder and hip rotation
    const shoulderAngle = Math.atan2(
        landmarks[12].y - landmarks[11].y,
        landmarks[12].x - landmarks[11].x
    ) * (180 / Math.PI);
    
    const hipAngle = Math.atan2(
        landmarks[24].y - landmarks[23].y,
        landmarks[24].x - landmarks[23].x
    ) * (180 / Math.PI);
    
    // If camera is viewing from the front of rider
    if (shoulderAngle > 0 && hipAngle > 0) {
        return "Regular (left foot forward)";
    } else if (shoulderAngle < 0 && hipAngle < 0) {
        return "Goofy (right foot forward)";
    } 
    // If viewing from behind rider, reverse the logic
    else if (shoulderAngle < 0 && hipAngle < 0) {
        return "Regular (left foot forward)";
    } else {
        return "Goofy (right foot forward)";
    }
}

// Calculate shoulder rotation relative to horizontal
function calculateShoulderRotation(keypoints) {
    return Math.atan2(
        keypoints.rightShoulder.y - keypoints.leftShoulder.y,
        keypoints.rightShoulder.x - keypoints.leftShoulder.x
    ) * (180 / Math.PI);
}

// Calculate how wide arms are spread relative to shoulder width
function calculateArmSpread(keypoints) {
    const shoulderWidth = Math.sqrt(
        Math.pow((keypoints.rightShoulder.x - keypoints.leftShoulder.x) * canvas.width, 2) +
        Math.pow((keypoints.rightShoulder.y - keypoints.leftShoulder.y) * canvas.height, 2)
    );
    
    const wristDistance = Math.sqrt(
        Math.pow((keypoints.rightWrist.x - keypoints.leftWrist.x) * canvas.width, 2) +
        Math.pow((keypoints.rightWrist.y - keypoints.leftWrist.y) * canvas.height, 2)
    );
    
    return (wristDistance / shoulderWidth) * 100;
}

// Helper function: Check if two points are near each other
function isPointNear(point1, point2, threshold) {
    if (!point1 || !point2 || point1.visibility < 0.5 || point2.visibility < 0.5) {
        return false;
    }
    
    const distance = Math.sqrt(
        Math.pow(point1.x - point2.x, 2) + 
        Math.pow(point1.y - point2.y, 2)
    );
    
    return distance < threshold;
}

// Calculate angle between three points (in degrees)
function calculateAngle(pointA, pointB, pointC) {
    // Convert to screen coordinates
    const a = [pointA[0] * canvas.width, pointA[1] * canvas.height];
    const b = [pointB[0] * canvas.width, pointB[1] * canvas.height];
    const c = [pointC[0] * canvas.width, pointC[1] * canvas.height];
    
    // Calculate vectors
    const ab = [b[0] - a[0], b[1] - a[1]];
    const bc = [c[0] - b[0], c[1] - b[1]];
    
    // Calculate dot product
    const dotProduct = ab[0] * bc[0] + ab[1] * bc[1];
    
    // Calculate magnitudes
    const abMag = Math.sqrt(ab[0] * ab[0] + ab[1] * ab[1]);
    const bcMag = Math.sqrt(bc[0] * bc[0] + bc[1] * bc[1]);
    
    // Prevent division by zero
    if (abMag === 0 || bcMag === 0) return 0;
    
    // Calculate angle in radians (handle numerical precision issues)
    const cosTheta = Math.max(-1, Math.min(1, dotProduct / (abMag * bcMag)));
    const angleRad = Math.acos(cosTheta);
    
    // Convert to degrees
    return 180 - (angleRad * 180 / Math.PI);
}

// Track fall status
function trackFallStatus(landmarks) {
    if (!landmarks || landmarks.length < 33) return;
    
    // Get key body points for fall detection
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    // Skip if key points aren't visible enough
    if (nose.visibility < 0.5 || 
        leftShoulder.visibility < 0.5 || 
        rightShoulder.visibility < 0.5 ||
        leftHip.visibility < 0.5 || 
        rightHip.visibility < 0.5) {
        return;
    }
    
    // Calculate center of mass (simplified as midpoint between shoulders and hips)
    const centerOfMass = {
        x: (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4,
        y: (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4
    };
    
    // Store vertical position history
    verticalPositionHistory.push({
        timestamp: new Date().getTime(),
        centerOfMass: centerOfMass,
        nose: nose,
        shoulders: {left: leftShoulder, right: rightShoulder},
        hips: {left: leftHip, right: rightHip}
    });
    
    // Limit history length
    if (verticalPositionHistory.length > FALL_HISTORY_LENGTH) {
        verticalPositionHistory.shift();
    }
    
    // Need enough history for fall detection
    if (verticalPositionHistory.length < 10) return;
    
    // Check for falls if we haven't already detected one
    if (!fallDetected) {
        detectFall();
    }
}

// Detect if a fall has occurred
function detectFall() {
    // Need enough history data
    if (verticalPositionHistory.length < 10) return false;
    
    if (detect360Spin()) {
        return false; // Don't detect falls during a 360 spin
    }

    // Get recent position data
    const recent = verticalPositionHistory.slice(-5);
    const earlier = verticalPositionHistory.slice(-15, -5);
    
    // Calculate average y positions for key points
    const recentNoseY = average(recent.map(pos => pos.nose.y));
    const earlierNoseY = average(earlier.map(pos => pos.nose.y));
    
    const recentCOMY = average(recent.map(pos => pos.centerOfMass.y));
    const earlierCOMY = average(earlier.map(pos => pos.centerOfMass.y));
    
    // Detect sudden vertical position changes (falls typically involve the nose/head moving down suddenly)
    const noseYChange = recentNoseY - earlierNoseY;
    const comYChange = recentCOMY - earlierCOMY;
    
    // Check rotation/orientation
    const recentShoulderAngle = average(recent.map(pos => 
        Math.atan2(pos.shoulders.right.y - pos.shoulders.left.y, 
                  pos.shoulders.right.x - pos.shoulders.left.x) * (180 / Math.PI)
    ));
    
    const earlierShoulderAngle = average(earlier.map(pos => 
        Math.atan2(pos.shoulders.right.y - pos.shoulders.left.y, 
                  pos.shoulders.right.x - pos.shoulders.left.x) * (180 / Math.PI)
    ));
    
    // Detect sudden rotation changes
    const shoulderAngleChange = Math.abs(recentShoulderAngle - earlierShoulderAngle);
    
    // Front edge catch - typically involves sudden forward fall
    if (noseYChange > FALL_DETECTION_THRESHOLD && shoulderAngleChange < 45) {
        fallDetected = true;
        fallType = "Front Edge Catch";
        analyzeFrontEdgeCatch();
        return true;
    }
    
    // Back edge catch - typically involves sudden backward fall with head moving up
    if (noseYChange < -FALL_DETECTION_THRESHOLD && shoulderAngleChange < 45) {
        fallDetected = true;
        fallType = "Back Edge Catch";
        analyzeBackEdgeCatch();
        return true;
    }
    
    // Falling out of trick - often involves rotation followed by uncontrolled movement
    if (shoulderAngleChange > 45 && (Math.abs(noseYChange) > FALL_DETECTION_THRESHOLD/2 || 
                                     Math.abs(comYChange) > FALL_DETECTION_THRESHOLD/2)) {
        fallDetected = true;
        fallType = "Fall During Trick Attempt";
        analyzeTrickFall();
        return true;
    }
    
    return false;
}

// Analyze front edge catch falls
function analyzeFrontEdgeCatch() {
    // Review recent history to determine likely causes
    const recent = verticalPositionHistory.slice(-10);
    const earlier = verticalPositionHistory.slice(-20, -10);
    
    // Calculate weight distribution before fall
    const weightDistribution = calculateWeightDistribution(earlier);
    
    // Check if weight was too far forward
    if (weightDistribution < 0.4) { // Weight biased toward front foot
        fallAnalysis = "Your weight was too far forward on your board, causing your front edge to catch the snow.";
        fallRecoveryAdvice = [
            "Keep your weight centered or slightly back when riding",
            "Bend your knees more to absorb bumps",
            "Look further ahead to anticipate terrain changes",
            "Practice moving your weight back slightly when on your toe edge"
        ];
    } 
    // Check if board angle was improper
    else {
        fallAnalysis = "Your front edge caught the snow, likely due to insufficient edge angle or improper board control.";
        fallRecoveryAdvice = [
            "Focus on keeping your edge engaged throughout turns",
            "Practice applying more pressure to your toes when on toe edge",
            "Look in the direction you want to go, not down at the snow",
            "Try practicing on gentler terrain to build edge control"
        ];
    }
    
    // Update the analysis panel with fall information
    updateFallAnalysis();
}

// Analyze back edge catch falls
function analyzeBackEdgeCatch() {
    // Review recent history to determine likely causes
    const recent = verticalPositionHistory.slice(-10);
    const earlier = verticalPositionHistory.slice(-20, -10);
    
    // Calculate weight distribution before fall
    const weightDistribution = calculateWeightDistribution(earlier);
    
    // Check if weight was too far back
    if (weightDistribution > 0.6) { // Weight biased toward back foot
        fallAnalysis = "Your weight was too far back on your board, causing your back edge to catch the snow.";
        fallRecoveryAdvice = [
            "Keep your weight more centered on your board",
            "Bend your knees more to maintain flexibility",
            "Focus on initiating turns from the front foot",
            "Practice weight shifts on flat ground before attempting steeper terrain"
        ];
    } 
    // Check if board angle was improper
    else {
        fallAnalysis = "Your back edge caught the snow, likely due to insufficient edge angle or heel-side pressure.";
        fallRecoveryAdvice = [
            "Focus on maintaining consistent pressure on your heel edge",
            "Keep your knees bent and your back straight",
            "Avoid leaning too far back when on your heel edge",
            "Practice C-turns to build confidence with edge transitions"
        ];
    }
    
    // Update the analysis panel with fall information
    updateFallAnalysis();
}

// Analyze falls during trick attempts
function analyzeTrickFall() {
    // Review rotation and body position during trick attempt
    const recent = verticalPositionHistory.slice(-15);
    
    // Calculate rotation consistency
    const shoulderAngles = recent.map(pos => 
        Math.atan2(pos.shoulders.right.y - pos.shoulders.left.y, 
                  pos.shoulders.right.x - pos.shoulders.left.x) * (180 / Math.PI)
    );
    
    // Normalize angles to handle -180/+180 transition
    for (let i = 1; i < shoulderAngles.length; i++) {
        while (shoulderAngles[i] - shoulderAngles[i-1] > 180) shoulderAngles[i] -= 360;
        while (shoulderAngles[i] - shoulderAngles[i-1] < -180) shoulderAngles[i] += 360;
    }
    
    // Calculate changes between consecutive frames
    const angleChanges = [];
    for (let i = 1; i < shoulderAngles.length; i++) {
        angleChanges.push(Math.abs(shoulderAngles[i] - shoulderAngles[i-1]));
    }
    
    // Calculate standard deviation of angle changes (high = inconsistent rotation)
    const stdDevRotation = standardDeviation(angleChanges);
    
    // Check for incomplete rotation
    const totalRotation = Math.abs(shoulderAngles[shoulderAngles.length-1] - shoulderAngles[0]);
    
    if (stdDevRotation > 15) {
        fallAnalysis = "Your rotation was inconsistent during the trick attempt, leading to a loss of control.";
        fallRecoveryAdvice = [
            "Focus on initiating rotation with your shoulders and head first",
            "Keep your core engaged throughout the rotation",
            "Start with smaller rotations (180s) before progressing to larger ones",
            "Practice rotations on flat ground or small features first"
        ];
    }
    else if (totalRotation % 360 > 45 && totalRotation % 360 < 315) {
        fallAnalysis = "You didn't complete your full rotation, causing you to land off-balance.";
        fallRecoveryAdvice = [
            "Commit fully to the rotation from the takeoff",
            "Look over your shoulder in the direction of rotation to spot your landing",
            "Make sure you're generating enough pop on takeoff",
            "Try to keep your body compact during rotation for faster spins"
        ];
    }
    else {
        fallAnalysis = "You lost balance during your trick attempt, likely due to improper landing preparation.";
        fallRecoveryAdvice = [
            "Focus on keeping your board flat for landing",
            "Bend your knees more to absorb the landing impact",
            "Keep your shoulders aligned with your board",
            "Practice the trick at lower speeds until you build consistency"
        ];
    }
    
    // Update the analysis panel with fall information
    updateFallAnalysis();
}

// Calculate approximate weight distribution between front/back foot
function calculateWeightDistribution(positionData) {
    if (!positionData || positionData.length === 0) return 0.5; // Default to centered
    
    // Average the position data
    const avgLeftHip = {
        x: average(positionData.map(pos => pos.hips.left.x)),
        y: average(positionData.map(pos => pos.hips.left.y))
    };
    
    const avgRightHip = {
        x: average(positionData.map(pos => pos.hips.right.x)),
        y: average(positionData.map(pos => pos.hips.right.y))
    };
    
    const avgHipCenter = {
        x: (avgLeftHip.x + avgRightHip.x) / 2,
        y: (avgLeftHip.y + avgRightHip.y) / 2
    };
    
    const avgShoulderCenter = {
        x: average(positionData.map(pos => (pos.shoulders.left.x + pos.shoulders.right.x) / 2)),
        y: average(positionData.map(pos => (pos.shoulders.left.y + pos.shoulders.right.y) / 2))
    };
    
    // Calculate lean angle (forward/backward)
    const leanX = avgShoulderCenter.x - avgHipCenter.x;
    
    // Normalize to a 0-1 scale where 0.5 is centered, 0 is all weight on front, 1 is all weight on back
    // This is a simplified approximation
    const normalizedLean = 0.5 + (leanX * 2); // Scale appropriately
    
    return Math.max(0, Math.min(1, normalizedLean)); // Clamp between 0 and 1
}

// Update the analysis panel with fall detection results
function updateFallAnalysis() {
    // Find or create the fall analysis section in the analysis panel
    const analysisPanel = document.querySelector('.analysis-panel');
    if (!analysisPanel) return;
    
    // Find existing content
    let analysisContent = document.getElementById('analysisContent');
    if (!analysisContent) {
        analysisContent = document.createElement('div');
        analysisContent.id = 'analysisContent';
        analysisPanel.appendChild(analysisContent);
    }
    
    // Look for existing fall section
    let fallSection = document.getElementById('fallAnalysisSection');
    if (!fallSection) {
        // Create fall section
        fallSection = document.createElement('div');
        fallSection.id = 'fallAnalysisSection';
        fallSection.className = 'tips-section';
        fallSection.style.marginTop = '25px';
        fallSection.style.borderTop = '1px solid #ddd';
        fallSection.style.paddingTop = '15px';
        
        // Append to analysis content
        analysisContent.appendChild(fallSection);
    }
    
    // Create fall analysis HTML
    let fallHTML = `
        <h4>Fall Detection: ${fallType}</h4>
        <p><strong>Analysis:</strong> ${fallAnalysis}</p>
        <p><strong>Improvement Tips:</strong></p>
        <ul>
            ${fallRecoveryAdvice.map(tip => `<li>${tip}</li>`).join('')}
        </ul>
    `;
    
    // Update fall section
    fallSection.innerHTML = fallHTML;
}

// Reset fall detection when video changes or restarts
function resetFallDetection() {
    verticalPositionHistory = [];
    fallDetected = false;
    fallType = null;
    fallAnalysis = null;
    fallRecoveryAdvice = null;
    
    // Remove fall section if it exists
    const fallSection = document.getElementById('fallAnalysisSection');
    if (fallSection) {
        fallSection.remove();
    }
}

// Track rotation for spin detection
function trackSpinRotation(landmarks) {
    if (!landmarks || landmarks.length < 33) return;
    
    // Get key points for spin detection
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    // Skip if key points aren't visible enough
    if (leftShoulder.visibility < SPIN_DETECTION_CONFIDENCE || 
        rightShoulder.visibility < SPIN_DETECTION_CONFIDENCE ||
        leftHip.visibility < SPIN_DETECTION_CONFIDENCE || 
        rightHip.visibility < SPIN_DETECTION_CONFIDENCE) {
        return;
    }
    
    // Calculate current shoulder angle (relative to horizontal)
    const shoulderAngle = Math.atan2(
        rightShoulder.y - leftShoulder.y,
        rightShoulder.x - leftShoulder.x
    ) * (180 / Math.PI);
    
    // Calculate hip angle for verification
    const hipAngle = Math.atan2(
        rightHip.y - leftHip.y,
        rightHip.x - leftHip.x
    ) * (180 / Math.PI);
    
    // Check if shoulders and hips are rotating together (true spin)
    const shoulderHipAngleDiff = Math.abs(normalizeAngle(shoulderAngle - hipAngle));
    const isBodyRotating = shoulderHipAngleDiff < 45; // Shoulders and hips should rotate together
    
    // If this is the first frame or spin isn't in progress yet
    if (lastShoulderAngle === null) {
        lastShoulderAngle = shoulderAngle;
        return;
    }
    
    // Calculate angle change since last frame
    let angleDelta = shoulderAngle - lastShoulderAngle;
    
    // Handle angle wrapping (e.g., going from 179° to -179° is a small change, not a large one)
    if (angleDelta > 180) angleDelta -= 360;
    if (angleDelta < -180) angleDelta += 360;
    
    // Only track significant movements (filter out noise)
    if (Math.abs(angleDelta) > 1 && Math.abs(angleDelta) < 45 && isBodyRotating) {
        // If we haven't started tracking a spin yet
        if (!spinStarted && Math.abs(angleDelta) > 3) {
            spinStarted = true;
            spinInProgress = true;
            spinStartAngle = shoulderAngle;
            spinFrameCount = 1;
            totalRotation = 0;
        }
        
        // If we're already tracking a spin
        if (spinInProgress) {
            totalRotation += angleDelta;
            spinFrameCount++;
            
            // Check if we've completed a spin (returned close to starting angle)
            const currentTotalDegrees = Math.abs(totalRotation);
            
            // Determine if we've completed a common spin denomination (180, 360, 540, 720, etc.)
            if (spinFrameCount >= MIN_SPIN_FRAMES) {
                // 180 spin
                if (currentTotalDegrees >= 160 && currentTotalDegrees < 200 && detectedSpinDegrees < 180) {
                    detectedSpinDegrees = 180;
                }
                // 360 spin
                else if (currentTotalDegrees >= 340 && currentTotalDegrees < 380 && detectedSpinDegrees < 360) {
                    detectedSpinDegrees = 360;
                }
                // 540 spin
                else if (currentTotalDegrees >= 520 && currentTotalDegrees < 560 && detectedSpinDegrees < 540) {
                    detectedSpinDegrees = 540;
                }
                // 720 spin
                else if (currentTotalDegrees >= 700 && currentTotalDegrees < 740 && detectedSpinDegrees < 720) {
                    detectedSpinDegrees = 720;
                }
                // 900 spin
                else if (currentTotalDegrees >= 880 && currentTotalDegrees < 920 && detectedSpinDegrees < 900) {
                    detectedSpinDegrees = 900;
                }
                // 1080 spin
                else if (currentTotalDegrees >= 1060 && currentTotalDegrees < 1100 && detectedSpinDegrees < 1080) {
                    detectedSpinDegrees = 1080;
                }
            }
            
            // Check if spin has stopped (no significant rotation for a while)
            if (poseHistory.length > 10 && spinFrameCount > MIN_SPIN_FRAMES) {
                const recentPoses = poseHistory.slice(-5);
                let recentRotationSum = 0;
                
                for (let i = 1; i < recentPoses.length; i++) {
                    const prevLandmarks = recentPoses[i-1].landmarks;
                    const currLandmarks = recentPoses[i].landmarks;
                    
                    // Skip if landmarks aren't visible
                    if (!prevLandmarks[11] || !prevLandmarks[12] || !currLandmarks[11] || !currLandmarks[12] ||
                        prevLandmarks[11].visibility < 0.5 || prevLandmarks[12].visibility < 0.5 ||
                        currLandmarks[11].visibility < 0.5 || currLandmarks[12].visibility < 0.5) {
                        continue;
                    }
                    
                    const prevAngle = Math.atan2(
                        prevLandmarks[12].y - prevLandmarks[11].y,
                        prevLandmarks[12].x - prevLandmarks[11].x
                    ) * (180 / Math.PI);
                    
                    const currAngle = Math.atan2(
                        currLandmarks[12].y - currLandmarks[11].y,
                        currLandmarks[12].x - currLandmarks[11].x
                    ) * (180 / Math.PI);
                    
                    let recentDelta = currAngle - prevAngle;
                    if (recentDelta > 180) recentDelta -= 360;
                    if (recentDelta < -180) recentDelta += 360;
                    
                    recentRotationSum += Math.abs(recentDelta);
                }
                
                // If very little rotation in recent frames, consider the spin complete
                if (recentRotationSum < 10 && detectedSpinDegrees > 0) {
                    // Finalize the detected spin
                    const spinTrick = getSpinTrickName(detectedSpinDegrees, Math.sign(totalRotation));
                    processTrickDetection(spinTrick);
                    
                    // Reset for next spin
                    resetSpinTracking();
                    return;
                }
            }
        }
    }
    
    // Update the last angle for next frame
    lastShoulderAngle = shoulderAngle;
}

// Get trick name based on rotation degrees and direction
function getSpinTrickName(degrees, direction) {
    let name = degrees.toString();
    
    // Add direction prefix for 360 and higher
    if (degrees >= 360) {
        if (direction > 0) {
            name = "Frontside " + name;
        } else {
            name = "Backside " + name;
        }
    }
    
    return {
        name: `${name}° Spin`,
        degrees: degrees,
        direction: direction > 0 ? "frontside" : "backside",
        tips: getSpinTips(degrees, direction)
    };
}

// Get appropriate tips based on spin difficulty
function getSpinTips(degrees, direction) {
    // Base tips for all spins
    const baseTips = [
        "Initiate rotation with your head and shoulders",
        "Keep your core engaged throughout the rotation",
        "Spot your landing by looking over your shoulder"
    ];
    
    // Additional tips based on spin complexity
    if (degrees <= 180) {
        return [
            ...baseTips,
            "Practice riding switch to improve your landing confidence"
        ];
    }
    else if (degrees <= 360) {
        return [
            ...baseTips,
            "Wind up slightly in the opposite direction before spinning",
            "Keep your arms tucked in for faster rotation"
        ];
    }
    else if (degrees <= 540) {
        return [
            ...baseTips,
            "Generate more pop on takeoff for more airtime",
            "Keep your body compact during the spin",
            "Practice 360s with confidence before attempting 540s regularly"
        ];
    }
    else {
        return [
            ...baseTips,
            "Focus on getting maximum pop on takeoff",
            "Keep your body as compact as possible for faster rotation",
            "Start your rotation even before leaving the ground",
            "Consider wearing a helmet for these advanced tricks"
        ];
    }
}

// Process a detected spin trick
function processTrickDetection(spinTrick) {
    // Add to analysis panel
    updateSpinAnalysis(spinTrick);
}

// Update the analysis panel with spin detection results
function updateSpinAnalysis(spinTrick) {
    // Find or create the spin analysis section in the analysis panel
    const analysisPanel = document.querySelector('.analysis-panel');
    if (!analysisPanel) return;
    
    // Find existing content
    let analysisContent = document.getElementById('analysisContent');
    if (!analysisContent) {
        analysisContent = document.createElement('div');
        analysisContent.id = 'analysisContent';
        analysisPanel.appendChild(analysisContent);
    }
    
    // Look for existing trick section
    let trickSection = document.getElementById('trickAnalysisSection');
    if (!trickSection) {
        // Create trick section
        trickSection = document.createElement('div');
        trickSection.id = 'trickAnalysisSection';
        trickSection.className = 'tips-section';
        trickSection.style.marginTop = '25px';
        trickSection.style.borderTop = '1px solid #ddd';
        trickSection.style.paddingTop = '15px';
        
        // Append to analysis content
        analysisContent.appendChild(trickSection);
    }
    
    // Create trick analysis HTML
    let trickHTML = `
        <h4>Trick Detected: ${spinTrick.name}</h4>
        <p><strong>Rotation:</strong> ${spinTrick.degrees}° ${spinTrick.direction}</p>
        <p><strong>Improvement Tips:</strong></p>
        <ul>
            ${spinTrick.tips.map(tip => `<li>${tip}</li>`).join('')}
        </ul>
    `;
    
    // Update trick section
    trickSection.innerHTML = trickHTML;
}

// Reset spin tracking
function resetSpinTracking() {
    totalRotation = 0;
    lastShoulderAngle = null;
    spinStarted = false;
    spinInProgress = false;
    spinStartAngle = null;
    spinFrameCount = 0;
    detectedSpinDegrees = 0;
}

// Helper: Normalize angle to -180 to +180 range
function normalizeAngle(angle) {
    let result = angle;
    while (result > 180) result -= 360;
    while (result < -180) result += 360;
    return result;
}

// Helper: Calculate average of an array of numbers
function average(array) {
    if (!array || array.length === 0) return 0;
    return array.reduce((sum, val) => sum + val, 0) / array.length;
}

// Helper: Calculate standard deviation of an array of numbers
function standardDeviation(array) {
    if (!array || array.length <= 1) return 0;
    
    const avg = average(array);
    const squareDiffs = array.map(value => Math.pow(value - avg, 2));
    const variance = average(squareDiffs);
    
    return Math.sqrt(variance);
}

// Add this keydown listener to toggle debug info display
document.addEventListener('keydown', function(event) {
    if (event.key === 'd' || event.key === 'D') {
        // Toggle debug information display
        const debugDiv = document.getElementById('debugInfo') || document.createElement('div');
        debugDiv.id = 'debugInfo';
        
        if (debugDiv.style.display === 'block') {
            debugDiv.style.display = 'none';
        } else {
            debugDiv.style.display = 'block';
            debugDiv.style.position = 'fixed';
            debugDiv.style.bottom = '10px';
            debugDiv.style.right = '10px';
            debugDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
            debugDiv.style.color = 'white';
            debugDiv.style.padding = '10px';
            debugDiv.style.borderRadius = '5px';
            debugDiv.style.maxWidth = '300px';
            debugDiv.style.maxHeight = '200px';
            debugDiv.style.overflow = 'auto';
            debugDiv.style.fontSize = '12px';
            
            // Update debug info
            updateDebugInfo(debugDiv);
            document.body.appendChild(debugDiv);
        }
    }
});

// Update debug information display
function updateDebugInfo(debugDiv) {
    if (!debugDiv) return;
    
    // Only update every 10 frames to avoid performance impact
    if (frameCount % 10 !== 0) return;
    
    const frameRate = Math.round(1000 / (performance.now() - (window.lastFrameTime || performance.now())));
    window.lastFrameTime = performance.now();
    
    debugDiv.innerHTML = `
        <div style="font-weight:bold">Debug Info</div>
        <div>Frame Rate: ~${frameRate} fps</div>
        <div>Frame Count: ${frameCount}</div>
        <div>Video Time: ${uploadedVideo.currentTime.toFixed(2)}s</div>
        <div>Processing Every: ${ANALYZE_EVERY_N_FRAMES} frames</div>
        <div>Pose History Length: ${poseHistory.length}</div>
    `;
    
    if (lastPoseData && lastPoseData[0]) {
        const confidenceSum = lastPoseData.reduce((sum, point) => sum + point.visibility, 0);
        const avgConfidence = confidenceSum / lastPoseData.length;
        
        debugDiv.innerHTML += `
            <div>Avg Point Confidence: ${(avgConfidence * 100).toFixed(1)}%</div>
        `;
    }
    
    // Add spin tracking info if applicable
    if (spinInProgress) {
        debugDiv.innerHTML += `
            <div style="margin-top:5px; border-top:1px solid #555; padding-top:5px;">
                <div style="font-weight:bold">Spin Tracking</div>
                <div>Total Rotation: ${totalRotation.toFixed(1)}°</div>
                <div>Detected: ${detectedSpinDegrees}°</div>
                <div>Frames: ${spinFrameCount}</div>
            </div>
        `;
    }
    
    // Add fall detection info if applicable
    if (fallDetected) {
        debugDiv.innerHTML += `
            <div style="margin-top:5px; border-top:1px solid #555; padding-top:5px;">
                <div style="font-weight:bold">Fall Detection</div>
                <div>Fall Type: ${fallType}</div>
            </div>
        `;
    }
    
    // Schedule next update
    setTimeout(() => updateDebugInfo(debugDiv), 100);
}

// Add trick reference display
function addTrickReference() {
    const referencesDiv = document.createElement('div');
    referencesDiv.className = 'trick-references';
    referencesDiv.innerHTML = `
        <h3>Snowboarding Trick References</h3>
        <details>
            <summary>Tail Grab</summary>
            <p>Grab the tail of your board with your back hand while in the air.</p>
        </details>
        <details>
            <summary>Method Grab</summary>
            <p>Grab the heel edge of your board between your feet with your front hand, bending your knees and arching your back.</p>
        </details>
        <details>
            <summary>Spins</summary>
            <p>Rotate your body and board in the air:</p>
            <ul>
                <li><strong>180°:</strong> Half rotation, landing switch</li>
                <li><strong>360°:</strong> Full rotation, landing regular</li>
                <li><strong>540°:</strong> One and a half rotations, landing switch</li>
                <li><strong>720°:</strong> Two full rotations</li>
            </ul>
        </details>
        <details>
            <summary>Common Falls</summary>
            <p>Understanding falls can help prevent them:</p>
            <ul>
                <li><strong>Front Edge Catch:</strong> Catching the downhill edge, resulting in a forward fall</li>
                <li><strong>Back Edge Catch:</strong> Catching the uphill edge, often resulting in a backward fall</li>
                <li><strong>Trick Falls:</strong> Usually from incomplete rotation or improper weight distribution on landing</li>
            </ul>
        </details>
    `;
    
    // Add to page
    const container = document.querySelector('.container');
    container.appendChild(referencesDiv);
}


// Update the trick reference display to include nose grab
function updateTrickReference() {
    // Get the existing trick references section
    const existingReferences = document.querySelector('.trick-references');
    
    if (existingReferences) {
        // Find the existing details for grabs
        const existingDetails = existingReferences.querySelectorAll('details');
        
        // Find where to insert the nose grab (after tail grab)
        let tailGrabDetail = null;
        for (const detail of existingDetails) {
            const summary = detail.querySelector('summary');
            if (summary && summary.textContent.includes('Tail Grab')) {
                tailGrabDetail = detail;
                break;
            }
        }
        
        if (tailGrabDetail) {
            // Create new details element for nose grab
            const noseGrabDetail = document.createElement('details');
            noseGrabDetail.innerHTML = `
                <summary>Nose Grab</summary>
                <p>Grab the nose of your board with your front hand while in the air. This trick requires good control and flexibility.</p>
            `;
            
            // Insert after tail grab
            tailGrabDetail.parentNode.insertBefore(noseGrabDetail, tailGrabDetail.nextSibling);
        }
    }
}

// Modify the window load event handler to update the trick references
const originalAddTrickReference = addTrickReference;
addTrickReference = function() {
    originalAddTrickReference();
    updateTrickReference();
};

// If the trick reference section is already present, update it now
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.trick-references')) {
        updateTrickReference();
    }
});

// Call to add the trick reference section
window.addEventListener('load', function() {
    addTrickReference();

});