// GazeDetectionComponent.js
import { useEffect, useRef, useState } from 'react';
import webgazer from 'webgazer';

const GazeDetectionComponent = () => {
    const canvasRef = useRef(null);
    const timeoutRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const isTrackingRef = useRef(true);
    const initializeRef = useRef(false);

    const checkEngagement = (data) => {
        if (!data) {
            startEngagementTimer();
            return;
        }

        const { x, y } = data;

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        console.log(screenWidth, screenHeight);

        const focusZoneWidth = screenWidth * 0.5;
        const focusZoneHeight = screenHeight * 0.5;

        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;

// Check if gaze is within the central focus zone
        const isFocusedOnCenter = (
            x > centerX - focusZoneWidth / 2 &&
            x < centerX + focusZoneWidth / 2 &&
            y > centerY - focusZoneHeight / 2 &&
            y < centerY + focusZoneHeight / 2
        );


        if (isFocusedOnCenter) {
            // User is engaged, clear any existing timer
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        } else {
            // User might be looking away, start timer
            startEngagementTimer();
        }
    };

    const startEngagementTimer = () => {
        console.log('User might be looking away...', isTrackingRef.current);
        if (!timeoutRef.current && isTrackingRef.current) {
            timeoutRef.current = setTimeout(() => {
                alert('Please focus on the screen!');
                // Optional: Add any additional logic for lost focus
                timeoutRef.current = null;
            }, 2000); // 2 seconds threshold
        }
    };

    const initializeWebGazer = async () => {

        if(initializeRef.current){
            return;
        }


        initializeRef.current = true;


        try {
            if (!webgazer) {
                throw new Error('WebGazer.js not available');
            }



            webgazer.setRegression("ridge").setTracker('clmtrackr')
                .setGazeListener((data, elapsedTime) => {
                    if (data) {
                        // console.log(`Gaze coordinates: (${data.x}, ${data.y}) at ${elapsedTime}ms`);
                        checkEngagement(data);
                    } else {
                        checkEngagement(null);
                    }
                })
                .showPredictionPoints(true);

            console.log('WebGazer initialized',webgazer.isReady());


            await webgazer.begin((e)=>console.log(e));


            console.log('WebGazer initialized',webgazer.isReady());
            // webgazer.setVideoElementCanvas(canvasRef.current);


            setIsLoading(false);
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    const startTracking = async () => {
        try {
            await webgazer.resume();
            isTrackingRef.current = true;
            // Reset any existing timers when starting
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        } catch (err) {
            setError('Failed to start tracking: ' + err.message);
        }
    };

    const stopTracking = () => {
        webgazer.pause();
        isTrackingRef.current = false;
        // Clear engagement timer when stopping
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    useEffect(() => {
        // Load WebGazer script if not already loaded
        setTimeout(() => {
            initializeWebGazer();
        },5000)


        return () => {
            // Cleanup when component unmounts
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            // if (webgazer) {
            //     webgazer.end();
            //     webgazer.clearGazeListener();
            // }
        };
    }, []);


    if (error) {
        return <div className="error">{error}</div>;
    }


    return (
        <div>
            <div style={{position: 'relative'}}>
                <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    style={{position: 'absolute', top: 0, left: 0,
                        transform: "scaleX(-1)",
                    }}
                />
            </div>


            {/* Control buttons */}
            <button onClick={startTracking} style={{padding: '10px 20px'}}>
                Start Eye Tracking
            </button>
        </div>
    );
};

export default GazeDetectionComponent;