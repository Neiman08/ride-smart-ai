package com.ridesmart.ai;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.TextView;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class RideSmartAccessibilityService extends AccessibilityService {

    private WindowManager windowManager;
    private TextView overlayText;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Handler scanHandler = new Handler(Looper.getMainLooper());

    private boolean isOverlayVisible = false;
    private boolean scannerRunning = false;

    private String lastDecision = "";

    private final Runnable scanRunnable = new Runnable() {
        @Override
        public void run() {
            long nextDelay = 1000;
            AccessibilityNodeInfo rootNode = null;

            try {
                rootNode = getRootInActiveWindow();

                if (rootNode == null) {
                    if (isOverlayVisible) hideOverlay();
                    scheduleNext(nextDelay);
                    return;
                }

                CharSequence pkgSeq = rootNode.getPackageName();
                String pkg = pkgSeq != null ? pkgSeq.toString().toLowerCase() : "";

                if (!pkg.contains("lyft") && !pkg.contains("uber")) {
                    if (isOverlayVisible) hideOverlay();
                    scheduleNext(1000);
                    return;
                }

                nextDelay = 200;

                String text = getTextFromNode(rootNode).toLowerCase();
                Log.d("RIDE_SMART", "TEXT: " + text);

                if (looksLikeRideOffer(text)) {
                    String decision = analyzeRide(text);
                    Log.d("RIDE_SMART", "DECISION: " + decision);

                    if (!decision.equals(lastDecision)) {
                        lastDecision = decision;
                        updateOverlay(decision);
                    }
                } else {
                    if (isOverlayVisible) hideOverlay();
                    lastDecision = "";
                }

            } catch (Exception e) {
                Log.e("RIDE_SMART", "SCAN ERROR: " + e.getMessage(), e);
            } finally {
                safeRecycle(rootNode);
            }

            scheduleNext(nextDelay);
        }
    };

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();

        AccessibilityServiceInfo info = new AccessibilityServiceInfo();

        info.eventTypes =
                AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED |
                        AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED;

        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.notificationTimeout = 0;

        info.flags =
                AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS |
                        AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS |
                        AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS;

        setServiceInfo(info);

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        hideOverlay();
        startScanner();

        Log.d("RIDE_SMART", "SNIPER ENGINE ACTIVO 200MS");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {}

    @Override
    public void onInterrupt() {
        stopScanner();
        hideOverlay();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopScanner();
        hideOverlay();
    }

    private void startScanner() {
        if (scannerRunning) return;
        scannerRunning = true;
        scanHandler.removeCallbacks(scanRunnable);
        scanHandler.post(scanRunnable);
    }

    private void stopScanner() {
        scannerRunning = false;
        scanHandler.removeCallbacks(scanRunnable);
    }

    private void scheduleNext(long delay) {
        if (!scannerRunning) return;
        scanHandler.removeCallbacks(scanRunnable);
        scanHandler.postDelayed(scanRunnable, delay);
    }

    private void updateOverlay(String decision) {
        if (decision.startsWith("✅")) {
            showOverlay(decision, "#CC008000");
        } else if (decision.startsWith("⚠️")) {
            showOverlay(decision, "#CCE6A700");
        } else {
            showOverlay(decision, "#CCB00020");
        }
    }

    private void showOverlay(String message, String color) {
        mainHandler.post(() -> {
            try {
                if (windowManager == null) {
                    windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
                }

                if (overlayText == null) {
                    overlayText = new TextView(this);

                    overlayText.setTextColor(Color.WHITE);

                    overlayText.setTextSize(16);

                    overlayText.setGravity(Gravity.START);

                    overlayText.setPadding(40, 90, 40, 40);

                    overlayText.setLineSpacing(8f, 1f);

                    overlayText.setElevation(20f);

                    overlayText.setShadowLayer(
                            18f,
                            0f,
                            0f,
                            Color.parseColor("#00FF88")
                    );

                    overlayText.setBackgroundColor(
                            Color.parseColor("#CC0A0A0A")
                    );

                    WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                            WindowManager.LayoutParams.MATCH_PARENT,
                            WindowManager.LayoutParams.WRAP_CONTENT,
                            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                                    WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE |
                                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                            PixelFormat.TRANSLUCENT
                    );

                    params.gravity = Gravity.TOP;

                    overlayText.setTag(params);
                    windowManager.addView(overlayText, params);
                    isOverlayVisible = true;
                }

                overlayText.setBackgroundColor(Color.parseColor(color));
                overlayText.setText(
                        "🔥 RIDE SMART AI\n" +
                                "━━━━━━━━━━\n" +
                                message.trim() +
                                "\n━━━━━━━━━━"
                );

                WindowManager.LayoutParams params =
                        (WindowManager.LayoutParams) overlayText.getTag();

                windowManager.updateViewLayout(overlayText, params);

                overlayText.invalidate();
                overlayText.requestLayout();
                overlayText.bringToFront();

            } catch (Exception e) {
                Log.e("RIDE_SMART", "OVERLAY ERROR: " + e.getMessage());
            }
        });
    }

    private void hideOverlay() {
        mainHandler.post(() -> {
            try {
                if (overlayText != null && windowManager != null) {
                    windowManager.removeView(overlayText);
                }
            } catch (Exception ignored) {}

            overlayText = null;
            isOverlayVisible = false;
            lastDecision = "";
        });
    }

    private String getTextFromNode(AccessibilityNodeInfo node) {
        if (node == null) return "";

        StringBuilder text = new StringBuilder();

        if (node.getText() != null) {
            text.append(node.getText()).append(" ");
        }

        if (node.getContentDescription() != null) {
            text.append(node.getContentDescription()).append(" ");
        }

        int childCount = node.getChildCount();

        for (int i = 0; i < childCount; i++) {
            AccessibilityNodeInfo child = node.getChild(i);

            if (child != null) {
                try {
                    text.append(getTextFromNode(child));
                } finally {
                    safeRecycle(child);
                }
            }
        }

        return text.toString();
    }

    private boolean looksLikeRideOffer(String text) {
        boolean hasCoreData =
                text.contains("$") &&
                        text.contains("min") &&
                        text.contains("mi");

        boolean hasLyftText =
                text.contains("tarifa estimada") ||
                        text.contains("para este viaje") ||
                        text.contains("aceptar") ||
                        text.contains("conectar");

        boolean hasUberText =
                text.contains("pickup") ||
                        text.contains("trip") ||
                        text.contains("accept") ||
                        text.contains("exclusive");

        boolean isOnlineScreen =
                text.contains("estás en línea") ||
                        text.contains("estamos buscando viajes") ||
                        text.contains("buscando viajes") ||
                        text.contains("horario prioritario");

        return hasCoreData && (hasLyftText || hasUberText) && !isOnlineScreen;
    }

    private String analyzeRide(String text) {

        SharedPreferences prefs =
                getSharedPreferences("CapacitorStorage", MODE_PRIVATE);

        SharedPreferences fallbackPrefs =
                getSharedPreferences("ridesmart_filters", MODE_PRIVATE);

        boolean enableAI =
                getBooleanPrefDual(prefs, fallbackPrefs, "enableAI", true);

        boolean ignoreBad =
                getBooleanPrefDual(prefs, fallbackPrefs, "ignoreBad", true);

        boolean testMode =
                getBooleanPrefDual(prefs, fallbackPrefs, "testMode", true);

        boolean airportMode =
                getBooleanPrefDual(prefs, fallbackPrefs, "airportMode", false);

        boolean avoidDowntown =
                getBooleanPrefDual(prefs, fallbackPrefs, "avoidDowntown", false);

        boolean hotZonesOnly =
                getBooleanPrefDual(prefs, fallbackPrefs, "hotZonesOnly", false);

        double minDpm =
                getDoublePrefDual(prefs, fallbackPrefs, "minDpm", 1.40);

        double minHourly =
                getDoublePrefDual(prefs, fallbackPrefs, "minHourly", 26.0);

        double maxPickup =
                getDoublePrefDual(prefs, fallbackPrefs, "maxPickup", 5.0);

        double maxTotal =
                getDoublePrefDual(prefs, fallbackPrefs, "maxTotal", 35.0);

        if (!enableAI) {
            return "⚠️ AI SNIPER OFF";
        }

        double pay = extractFirstMoney(text);
        double totalMiles = extractMiles(text);
        double totalMinutes = extractMinutes(text);
        double pickupMiles = extractPickupMiles(text);

        if (pay <= 0 || totalMiles <= 0 || totalMinutes <= 0) {
            return "⚠️ ORDEN DETECTADA | Faltan datos";
        }

        double dollarPerMile = pay / totalMiles;
        double hourly = pay / (totalMinutes / 60.0);

        boolean passesMoney =
                dollarPerMile >= minDpm &&
                        hourly >= minHourly;

        boolean passesDistance =
                pickupMiles <= maxPickup &&
                        totalMiles <= maxTotal;

        boolean airportBonus =
                airportMode &&
                        (
                                text.contains("ord") ||
                                        text.contains("o'hare") ||
                                        text.contains("ohare") ||
                                        text.contains("mdw") ||
                                        text.contains("midway")
                        );

        boolean downtownBlocked =
                avoidDowntown &&
                        (
                                text.contains("downtown") ||
                                        text.contains("loop") ||
                                        text.contains("chicago loop")
                        );

        if (downtownBlocked) {
            return "❌ MALA ORDEN | Downtown bloqueado";
        }

        if (hotZonesOnly && !isHotZone(text)) {
            return "❌ MALA ORDEN | Fuera de zona caliente";
        }

        if ((passesMoney && passesDistance) || airportBonus) {
            String ready = testMode ? " | READY" : "";
            return "✅ BUENA ORDEN" + ready +
                    " | $" + round(dollarPerMile) + "/mi" +
                    " | $" + round(hourly) + "/h" +
                    " | pickup " + round(pickupMiles) + "mi";
        }

        if (
                dollarPerMile >= (minDpm * 0.75) &&
                        hourly >= (minHourly * 0.75) &&
                        totalMiles <= (maxTotal * 1.25)
        ) {
            return "⚠️ REGULAR" +
                    " | $" + round(dollarPerMile) + "/mi" +
                    " | $" + round(hourly) + "/h" +
                    " | pickup " + round(pickupMiles) + "mi";
        }

        if (ignoreBad) {
            return "❌ MALA ORDEN" +
                    " | $" + round(dollarPerMile) + "/mi" +
                    " | $" + round(hourly) + "/h" +
                    " | pickup " + round(pickupMiles) + "mi";
        }

        return "⚠️ NO PASA FILTROS" +
                " | $" + round(dollarPerMile) + "/mi" +
                " | $" + round(hourly) + "/h";
    }

    private boolean isHotZone(String text) {
        return text.contains("o'hare") ||
                text.contains("ohare") ||
                text.contains("ord") ||
                text.contains("midway") ||
                text.contains("mdw") ||
                text.contains("rosemont") ||
                text.contains("schaumburg") ||
                text.contains("arlington heights") ||
                text.contains("downtown") ||
                text.contains("naperville") ||
                text.contains("oak brook");
    }

    private boolean getBooleanPref(SharedPreferences prefs, String key, boolean fallback) {
        try {
            String value = prefs.getString(key, null);
            if (value == null) return fallback;
            return Boolean.parseBoolean(value);
        } catch (Exception e) {
            return fallback;
        }
    }

    private double getDoublePref(SharedPreferences prefs, String key, double fallback) {
        try {
            String value = prefs.getString(key, null);
            if (value == null) return fallback;
            return Double.parseDouble(value);
        } catch (Exception e) {
            return fallback;
        }
    }

    private double extractFirstMoney(String text) {
        try {
            Matcher matcher =
                    Pattern.compile("\\$\\s?(\\d+(?:[.,]\\d{1,2})?)").matcher(text);

            if (matcher.find()) {
                String val = matcher.group(1);

                if (val.contains(",") && val.contains(".")) {
                    val = val.replace(",", "");
                } else if (val.contains(",")) {
                    val = val.replace(",", ".");
                }

                return Double.parseDouble(val);
            }

            return 0;

        } catch (Exception e) {
            return 0;
        }
    }

    private double extractPickupMiles(String text) {
        try {
            String clean = segmentText(text);

            Matcher matcher =
                    Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s?mi").matcher(clean);

            if (matcher.find()) {
                return Double.parseDouble(
                        matcher.group(1).replace(",", ".")
                );
            }

            return 0;

        } catch (Exception e) {
            return 0;
        }
    }

    private double extractMiles(String text) {
        try {
            String clean = segmentText(text);

            Matcher matcher =
                    Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s?mi").matcher(clean);

            double pickupMiles = 0;
            double tripMiles = 0;

            if (matcher.find()) {
                pickupMiles = Double.parseDouble(
                        matcher.group(1).replace(",", ".")
                );
            }

            if (matcher.find()) {
                tripMiles = Double.parseDouble(
                        matcher.group(1).replace(",", ".")
                );
            }

            return pickupMiles + tripMiles;

        } catch (Exception e) {
            return 0;
        }
    }

    private double extractMinutes(String text) {
        try {
            String clean = segmentText(text);

            Matcher matcher =
                    Pattern.compile("(\\d+)\\s?min").matcher(clean);

            double pickupMin = 0;
            double tripMin = 0;

            if (matcher.find()) {
                pickupMin = Double.parseDouble(matcher.group(1));
            }

            if (matcher.find()) {
                tripMin = Double.parseDouble(matcher.group(1));
            }

            return pickupMin + tripMin;

        } catch (Exception e) {
            return 0;
        }
    }

    private String segmentText(String text) {
        int start = text.indexOf("para este viaje");

        if (start < 0) return text;

        String sub = text.substring(start);

        int endAceptar = sub.indexOf("aceptar");
        int endConectar = sub.indexOf("conectar");
        int endAccept = sub.indexOf("accept");

        int end = -1;

        if (endAceptar >= 0) end = endAceptar;
        if (endConectar >= 0) end = end < 0 ? endConectar : Math.min(end, endConectar);
        if (endAccept >= 0) end = end < 0 ? endAccept : Math.min(end, endAccept);

        if (end > 0) {
            sub = sub.substring(0, end);
        }

        return sub;
    }

    private String round(double value) {
        return String.format(Locale.US, "%.2f", value);
    }

    private void safeRecycle(AccessibilityNodeInfo node) {
        try {
            if (node != null) {
                node.recycle();
            }
        } catch (Exception ignored) {}
    }

    private boolean getBooleanPrefDual(
            SharedPreferences primary,
            SharedPreferences fallbackPrefs,
            String key,
            boolean fallback
    ) {
        try {
            if (primary.contains(key)) {
                return getBooleanPref(primary, key, fallback);
            }
            if (fallbackPrefs.contains(key)) {
                return getBooleanPref(fallbackPrefs, key, fallback);
            }
            return fallback;
        } catch (Exception e) {
            return fallback;
        }
    }

    private double getDoublePrefDual(
            SharedPreferences primary,
            SharedPreferences fallbackPrefs,
            String key,
            double fallback
    ) {
        try {
            if (primary.contains(key)) {
                return getDoublePref(primary, key, fallback);
            }
            if (fallbackPrefs.contains(key)) {
                return getDoublePref(fallbackPrefs, key, fallback);
            }
            return fallback;
        } catch (Exception e) {
            return fallback;
        }
    }
}
