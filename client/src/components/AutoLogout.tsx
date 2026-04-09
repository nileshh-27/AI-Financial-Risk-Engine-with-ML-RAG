import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle } from "lucide-react";

// 120 seconds (2 mins) total inactivity before logout
const INACTIVITY_LIMIT_MS = 120 * 1000;
// Show warning at 90 seconds (1:30 mins of inactivity)
const WARNING_THRESHOLD_MS = 90 * 1000;
// Absolute logout removed to avoid breaking normal sessions, handled only by inactivity now
const ABSOLUTE_LIMIT_MS = 86400 * 1000; // 24 hours just in case

export function AutoLogout() {
    const { session, signOut } = useAuth();
    const [showWarning, setShowWarning] = useState(false);
    const [countdown, setCountdown] = useState(30);

    useEffect(() => {
        if (!session) return;

        let warningTimer: ReturnType<typeof setTimeout>;
        let logoutTimer: ReturnType<typeof setTimeout>;
        let absoluteTimer: ReturnType<typeof setTimeout>;
        let countdownInterval: ReturnType<typeof setInterval>;

        const sessionStart = Date.now();

        const doLogout = () => {
            // clear everything
            clearTimeout(warningTimer);
            clearTimeout(logoutTimer);
            clearTimeout(absoluteTimer);
            clearInterval(countdownInterval);
            signOut();
        };

        const resetInactivityTimers = () => {
            clearTimeout(warningTimer);
            clearTimeout(logoutTimer);
            clearInterval(countdownInterval);
            setShowWarning(false);
            setCountdown(10);

            // Inactivity Warning Timer
            warningTimer = setTimeout(() => {
                setShowWarning(true);
                let left = 30;
                setCountdown(left);

                countdownInterval = setInterval(() => {
                    left -= 1;
                    setCountdown(left);
                    if (left <= 0) {
                        clearInterval(countdownInterval);
                    }
                }, 1000);
            }, WARNING_THRESHOLD_MS);

            // Inactivity Logout Timer
            logoutTimer = setTimeout(() => {
                doLogout();
            }, INACTIVITY_LIMIT_MS);
        };

        const handleActivity = () => {
            // Can't reset activity timers if we have already hit absolute limit 
            // but absolute timer will naturally handle that.
            resetInactivityTimers();
        };

        // Absolute timer never resets unless session restarts
        absoluteTimer = setTimeout(() => {
            doLogout();
        }, ABSOLUTE_LIMIT_MS);

        resetInactivityTimers();

        window.addEventListener("mousemove", handleActivity);
        window.addEventListener("keydown", handleActivity);
        window.addEventListener("click", handleActivity);

        return () => {
            clearTimeout(warningTimer);
            clearTimeout(logoutTimer);
            clearTimeout(absoluteTimer);
            clearInterval(countdownInterval);

            window.removeEventListener("mousemove", handleActivity);
            window.removeEventListener("keydown", handleActivity);
            window.removeEventListener("click", handleActivity);
        };
    }, [session, signOut]);

    if (!showWarning) return null;

    return (
        <div className="fixed top-0 left-0 w-full z-[9999] bg-destructive text-destructive-foreground p-3 flex items-center justify-center gap-3 font-bold shadow-2xl animate-fade-in">
            <AlertCircle className="w-6 h-6 animate-pulse" />
            <span>Security Notice: You will be logged out in {countdown} seconds due to inactivity. Move your mouse or press a key to stay logged in.</span>
        </div>
    );
}
