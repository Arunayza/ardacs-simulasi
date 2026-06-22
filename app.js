// === GLOBAL SIMULATION VARIABLES ===
let lastLowBatNotif = 0;

// === RAT PROPERTIES ARRAY ===
let rats = [
    { x: 60, y: 220, targetX: 60, targetY: 220, width: 22, height: 14, speed: 1.5, state: "idle", direction: 1 },
    { x: 100, y: 220, targetX: 100, targetY: 220, width: 20, height: 13, speed: 1.3, state: "trapped", direction: -1 },
    { x: 130, y: 220, targetX: 130, targetY: 220, width: 24, height: 15, speed: 1.1, state: "trapped", direction: 1 },
    { x: 160, y: 220, targetX: 160, targetY: 220, width: 21, height: 13, speed: 1.4, state: "trapped", direction: -1 },
    { x: 180, y: 220, targetX: 180, targetY: 220, width: 23, height: 14, speed: 1.2, state: "trapped", direction: 1 }
];

// === VIRTUAL DATABASE STATE ===
let firebaseState = {
    status: {
        pintu: "Terbuka",
        tikusDitangkap: 0,
        sesi: 1,
        online: true,
        batteryVoltage: "4.12",
        batteryPercent: 92,
        camBaseUrl: "http://192.168.1.88"
    },
    control: {
        buzzer: false,
        relayKamera: false,
        notifEnabled: true,
        deleteHistoryCommand: ""
    },
    notifikasi: ""
};

// === DUMMY SESSION HISTORY ===
let sessionHistory = [
    {
        sesiKe: 1,
        entries: [
            { status_pintu: "Tikus Tertangkap", tikus_ke: 1, waktu: Date.now() - 3600000 * 3 },
            { status_pintu: "Pintu Tertutup", tikus_ke: 1, waktu: Date.now() - 3600000 * 3 - 60000 },
            { status_pintu: "Pintu Terbuka", tikus_ke: 0, waktu: Date.now() - 3600000 * 3 - 120000 }
        ]
    }
];

// === INITIAL CONFIGURATION ===
document.addEventListener("DOMContentLoaded", () => {
    initAppTime();
    setupBottomNavigation();
    setupDrawerNavigation();
    setupSimulatorControls();
    setupCameraSimulation();
    
    // Initial UI synchronization
    syncUI();
    updateDatabaseViewer();
    
    // Set time updating every minute
    setInterval(updateStatusBarTime, 60000);
});

// Update Phone Status Bar Time
function initAppTime() {
    updateStatusBarTime();
    // Set android toolbar title to current date
    const toolbarTitle = document.getElementById("toolbarTitle");
    const now = new Date();
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    toolbarTitle.textContent = now.toLocaleDateString('id-ID', options);
}

function updateStatusBarTime() {
    const timeSpan = document.getElementById("statusBarTime");
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    timeSpan.textContent = `${hrs}:${mins}`;
}

// === SYNCHRONIZE VIRTUAL DB & MOBILE INTERFACE ===
function syncUI() {
    // 1. Connectivity Status
    const chipStatus = document.getElementById("chipStatus");
    const chipStatusText = document.getElementById("chipStatusText");
    const wfTrapPintuText = document.getElementById("wfTrapPintuText");
    
    if (firebaseState.status.online) {
        chipStatus.className = "chip-status online";
        chipStatusText.textContent = "Online";
        document.getElementById("btnPhoneBuzzer").disabled = false;
        document.getElementById("btnPhoneRelay").disabled = false;
        document.getElementById("btnPhoneCapture").disabled = false;
    } else {
        chipStatus.className = "chip-status offline";
        chipStatusText.textContent = "Offline";
        document.getElementById("btnPhoneBuzzer").disabled = true;
        document.getElementById("btnPhoneRelay").disabled = true;
        document.getElementById("btnPhoneCapture").disabled = true;
    }

    // 2. Home Tab values
    document.getElementById("viewStatusPintu").textContent = firebaseState.status.pintu;
    document.getElementById("viewTikusDitangkap").textContent = firebaseState.status.tikusDitangkap;
    document.getElementById("viewSesi").textContent = firebaseState.status.sesi;
    
    // Highlight door state
    const pintuSpan = document.getElementById("viewStatusPintu");
    if (firebaseState.status.pintu.includes("Tertangkap") || firebaseState.status.pintu.includes("Penuh") || firebaseState.status.pintu === "Tertutup") {
        pintuSpan.style.color = "var(--color-red)";
        if (wfTrapPintuText) {
            wfTrapPintuText.textContent = `Pintu: ${firebaseState.status.pintu}`;
            wfTrapPintuText.style.fill = "var(--color-red)";
        }
    } else {
        pintuSpan.style.color = "var(--color-green)";
        if (wfTrapPintuText) {
            wfTrapPintuText.textContent = `Pintu: Terbuka`;
            wfTrapPintuText.style.fill = "var(--color-green)";
        }
    }

    // Sync Physical Controller buttons based on connectivity and catch count (max 5)
    const ctrlCatchBtn = document.getElementById("ctrlCatchBtn");
    const ctrlResetTrapBtn = document.getElementById("ctrlResetTrapBtn");
    const ctrlEmptyTrapBtn = document.getElementById("ctrlEmptyTrapBtn");
    
    if (!firebaseState.status.online) {
        if (ctrlCatchBtn) ctrlCatchBtn.disabled = true;
        if (ctrlResetTrapBtn) ctrlResetTrapBtn.disabled = true;
        if (ctrlEmptyTrapBtn) ctrlEmptyTrapBtn.disabled = true;
    } else {
        if (ctrlResetTrapBtn) ctrlResetTrapBtn.disabled = false;
        if (ctrlEmptyTrapBtn) ctrlEmptyTrapBtn.disabled = false;
        
        if (firebaseState.status.tikusDitangkap >= 5) {
            if (ctrlCatchBtn) ctrlCatchBtn.disabled = true;
            if (ctrlEmptyTrapBtn) ctrlEmptyTrapBtn.style.display = "block";
        } else {
            if (ctrlCatchBtn) ctrlCatchBtn.disabled = false;
            if (ctrlEmptyTrapBtn) ctrlEmptyTrapBtn.style.display = "none";
        }
    }

    // Battery values
    document.getElementById("viewBatteryPercent").textContent = `${firebaseState.status.batteryPercent} %`;
    document.getElementById("viewBatteryVoltage").textContent = `${firebaseState.status.batteryVoltage} V`;
    document.getElementById("statusBarBatteryPercent").textContent = `${firebaseState.status.batteryPercent}%`;
    document.getElementById("statusBarBatteryLevel").style.width = `${firebaseState.status.batteryPercent}%`;

    // 3. Action Buttons Icon states
    const btnBuzzer = document.getElementById("btnPhoneBuzzer");
    const iconBuzzer = document.getElementById("iconBuzzer");
    const labelBuzzer = document.getElementById("labelBuzzer");
    const wfTrapBuzzerText = document.getElementById("wfTrapBuzzerText");

    if (firebaseState.control.buzzer) {
        btnBuzzer.classList.add("active");
        // Mute icon
        iconBuzzer.innerHTML = `<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`;
        labelBuzzer.textContent = "Buzzer: AKTIF (Tekan untuk Mati)";
        document.getElementById("buzzerVisualizer").classList.add("active");
        document.getElementById("buzzerTextStatus").textContent = "Menyala (Menakuti Tikus)";
        if (wfTrapBuzzerText) {
            wfTrapBuzzerText.textContent = "Buzzer: ACTIVE (90dB)";
            wfTrapBuzzerText.style.fill = "var(--color-green)";
        }
    } else {
        btnBuzzer.classList.remove("active");
        // Volume up icon
        iconBuzzer.innerHTML = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
        labelBuzzer.textContent = "Tekan untuk Menakuti Tikus";
        document.getElementById("buzzerVisualizer").classList.remove("active");
        document.getElementById("buzzerTextStatus").textContent = "Mati (Silent)";
        if (wfTrapBuzzerText) {
            wfTrapBuzzerText.textContent = "Buzzer: OFF";
            wfTrapBuzzerText.style.fill = "#e53935";
        }
    }

    const btnRelay = document.getElementById("btnPhoneRelay");
    const iconRelay = document.getElementById("iconRelay");
    const labelRelay = document.getElementById("labelRelay");
    const cameraOfflineOverlay = document.getElementById("cameraOfflineOverlay");

    if (firebaseState.control.relayKamera) {
        btnRelay.classList.add("active");
        // Camera off icon
        iconRelay.innerHTML = `<path d="M9.75 5.85L12 8.1l2.25-2.25L16.5 8 13.5 11l-3-3L8 10.5l1.75-4.65zM20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 11.5L12.5 13l-2.5 2.5V9h5v6.5zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>`;
        labelRelay.textContent = "Matikan Modul Kamera";
        cameraOfflineOverlay.style.display = "none";
    } else {
        btnRelay.classList.remove("active");
        // Camera on icon
        iconRelay.innerHTML = `<path d="M9 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0-8c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5zm11 11h-2v-2h-2v2h-2v2h2v2h2v-2h2v-2zm-6 2H2v-2c0-2.33 4.75-3.5 7-3.5s7 1.17 7 3.5v2z"/>`;
        labelRelay.textContent = "Nyalakan Kamera Manual";
        cameraOfflineOverlay.style.display = "flex";
    }

    // Settings Sidebar values
    document.getElementById("switchNotif").checked = firebaseState.control.notifEnabled;
    const wfAppNotifText = document.getElementById("wfAppNotifText");
    if (wfAppNotifText) {
        wfAppNotifText.textContent = firebaseState.control.notifEnabled ? "Notifikasi: Aktif" : "Notifikasi: Bisu";
        wfAppNotifText.style.fill = firebaseState.control.notifEnabled ? "#ffd54f" : "#888888";
    }

    // 4. History tab sync
    renderHistoryList();
}

// Renders the session history on screen
function renderHistoryList() {
    const container = document.getElementById("sessionsContainer");
    container.innerHTML = "";

    if (sessionHistory.length === 0) {
        container.innerHTML = `<div class="empty-history-text">Belum ada riwayat penangkapan.</div>`;
        return;
    }

    // Sort sessions in ascending order (Sesi 1, 2, 3...)
    const sortedSessions = [...sessionHistory].sort((a, b) => a.sesiKe - b.sesiKe);

    sortedSessions.forEach(session => {
        const card = document.createElement("div");
        card.className = "session-card";
        
        let entriesHTML = "";
        
        // Show top 5 entries
        const displayEntries = [...session.entries]
            .sort((a,b) => b.waktu - a.waktu) // newest to oldest
            .slice(0, 5)
            .reverse(); // display oldest to newest in rows

        displayEntries.forEach(entry => {
            const date = new Date(entry.waktu);
            const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            entriesHTML += `
                <div class="session-entry-row">
                    <span class="entry-status">${entry.status_pintu} ${entry.tikus_ke > 0 ? '(Tikus Ke-' + entry.tikus_ke + ')' : ''}</span>
                    <span class="entry-time">${timeStr}</span>
                </div>
            `;
        });

        if (displayEntries.length === 0) {
            entriesHTML = `<div class="empty-history-text" style="padding: 10px 0;">Tidak ada log sesi ini.</div>`;
        }

        card.innerHTML = `
            <div class="session-title">Sesi ${session.sesiKe}</div>
            <div class="session-entries-container">
                ${entriesHTML}
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Update database code block viewer and flash changes
let previousStateString = "";
function updateDatabaseViewer() {
    const viewer = document.getElementById("dbJSONViewer");
    const currentStateString = JSON.stringify(firebaseState, null, 2);
    
    if (currentStateString === previousStateString) return;

    viewer.innerHTML = "";
    
    // Highlight changed parts visually
    const keys = Object.keys(firebaseState);
    let outputHTML = '{\n';
    
    // 1. Status sub-tree
    outputHTML += '  <span class="db-key">"status"</span>: {\n';
    const statusKeys = Object.keys(firebaseState.status);
    statusKeys.forEach((k, idx) => {
        let val = firebaseState.status[k];
        let valFormatted = typeof val === 'string' ? `"${val}"` : val;
        
        // Check if value changed from previous
        let isChanged = false;
        if (previousStateString) {
            try {
                let prevObj = JSON.parse(previousStateString);
                if (prevObj.status[k] !== val) isChanged = true;
            } catch(e) {}
        }
        
        let valSpan = isChanged ? `<span class="db-val db-val-changed">${valFormatted}</span>` : `<span class="db-val">${valFormatted}</span>`;
        outputHTML += `    <span class="db-key">"${k}"</span>: ${valSpan}${idx < statusKeys.length - 1 ? ',' : ''}\n`;
    });
    outputHTML += '  },\n';
    
    // 2. Control sub-tree
    outputHTML += '  <span class="db-key">"control"</span>: {\n';
    const controlKeys = Object.keys(firebaseState.control);
    controlKeys.forEach((k, idx) => {
        let val = firebaseState.control[k];
        let valFormatted = typeof val === 'string' ? `"${val}"` : val;
        
        // Check if value changed
        let isChanged = false;
        if (previousStateString) {
            try {
                let prevObj = JSON.parse(previousStateString);
                if (prevObj.control[k] !== val) isChanged = true;
            } catch(e) {}
        }
        
        let valSpan = isChanged ? `<span class="db-val db-val-changed">${valFormatted}</span>` : `<span class="db-val">${valFormatted}</span>`;
        outputHTML += `    <span class="db-key">"${k}"</span>: ${valSpan}${idx < controlKeys.length - 1 ? ',' : ''}\n`;
    });
    outputHTML += '  },\n';

    // 3. Notifikasi string
    let notifVal = firebaseState.notifikasi;
    let notifChanged = false;
    if (previousStateString) {
        try {
            let prevObj = JSON.parse(previousStateString);
            if (prevObj.notifikasi !== notifVal) notifChanged = true;
        } catch(e) {}
    }
    let notifSpan = notifChanged ? `<span class="db-val db-val-changed">"${notifVal}"</span>` : `<span class="db-val">"${notifVal}"</span>`;
    outputHTML += `  <span class="db-key">"notifikasi"</span>: ${notifSpan}\n`;
    
    outputHTML += '}';
    viewer.innerHTML = outputHTML;
    previousStateString = currentStateString;
}

// === INTERACTIVE WORKFLOW PULSE ANIMATIONS ===
function triggerWorkflowPulse(direction, callback) {
    // Reset all lines and nodes
    const lines = ["pathTrapToFirebase", "pathFirebaseToApp", "pathAppToFirebase", "pathFirebaseToTrap"];
    lines.forEach(id => document.getElementById(id).classList.remove("active"));
    
    const nodes = ["wfNodeTrap", "wfNodeFirebase", "wfNodeApp"];
    nodes.forEach(id => document.getElementById(id).classList.remove("active"));
    
    const statusDesc = document.getElementById("workflowStatusDesc");

    if (direction === "trap_to_app") {
        // Step 1: Trap updates Firebase
        document.getElementById("wfNodeTrap").classList.add("active");
        document.getElementById("pathTrapToFirebase").classList.add("active");
        statusDesc.innerHTML = `<span class="active-step">Step 1: Alat Perangkap &rarr; Firebase</span> Sensor perangkap mendeteksi perubahan fisik (tikus terjebak) dan mengirim data status ke Firebase Cloud.`;
        
        setTimeout(() => {
            document.getElementById("pathTrapToFirebase").classList.remove("active");
            document.getElementById("wfNodeFirebase").classList.add("active");
            document.getElementById("pathFirebaseToApp").classList.add("active");
            statusDesc.innerHTML = `<span class="active-step">Step 2: Firebase &rarr; Android App</span> Firebase menyebarkan perubahan data secara real-time ke aplikasi Android Client yang sedang terhubung.`;
            
            setTimeout(() => {
                document.getElementById("pathFirebaseToApp").classList.remove("active");
                document.getElementById("wfNodeApp").classList.add("active");
                statusDesc.innerHTML = `<span class="active-step">Step 3: Aplikasi Menerima Data</span> Aplikasi mendeteksi status "Tikus Tertangkap", memicu getaran, memperbarui grafik antarmuka, dan memicu notifikasi lokal.`;
                
                if (callback) callback();
            }, 1000);
        }, 1000);

    } else if (direction === "app_to_trap") {
        // Step 1: App updates control in Firebase
        document.getElementById("wfNodeApp").classList.add("active");
        document.getElementById("pathAppToFirebase").classList.add("active");
        statusDesc.innerHTML = `<span class="active-step">Step 1: Android App &rarr; Firebase</span> Pengguna menekan tombol kontrol di aplikasi. Perintah diteruskan dengan menulis nilai baru pada node control Firebase.`;
        
        setTimeout(() => {
            document.getElementById("pathAppToFirebase").classList.remove("active");
            document.getElementById("wfNodeFirebase").classList.add("active");
            document.getElementById("pathFirebaseToTrap").classList.add("active");
            statusDesc.innerHTML = `<span class="active-step">Step 2: Firebase &rarr; Alat Perangkap</span> ESP8266 yang terhubung mendengar (listen) event database secara konstan dan menangkap sinyal perintah baru.`;
            
            setTimeout(() => {
                document.getElementById("pathFirebaseToTrap").classList.remove("active");
                document.getElementById("wfNodeTrap").classList.add("active");
                statusDesc.innerHTML = `<span class="active-step">Step 3: Aksi Hardware Dipicu</span> ESP8266 memproses perintah tersebut dan menyalakan/mematikan output fisik (Buzzer/Relay Daya Kamera) pada sirkuit perangkap.`;
                
                if (callback) callback();
            }, 1000);
        }, 1000);
    }
}

// === SOUND & TOAST NOTIFICATION UTILITIES ===
function showToast(message) {
    const toast = document.getElementById("phoneToast");
    toast.textContent = message;
    toast.classList.add("show");
    
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
}

function showLocalNotification(title, message) {
    if (!firebaseState.control.notifEnabled) return;
    
    const notifDrawer = document.getElementById("notifDrawer");
    document.getElementById("notifTitle").textContent = title;
    document.getElementById("notifDesc").textContent = message;
    
    notifDrawer.classList.add("show");
    
    // Play a gentle notification chime using Web Audio API (completely native)
    playNotificationSound();

    setTimeout(() => {
        notifDrawer.classList.remove("show");
    }, 4500);
}

function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5
        
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
        // Fallback silently if context blocker is active
    }
}

// === BOTTOM NAVIGATION TAB SWITCHING ===
function setupBottomNavigation() {
    const navItems = document.querySelectorAll(".bottom-nav-item");
    const tabs = document.querySelectorAll(".app-screen-tab");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetTab = item.getAttribute("data-tab");
            
            // Switch navigation visual active state
            navItems.forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");
            
            // Show corresponding screen tab
            tabs.forEach(tab => {
                if (tab.id === targetTab) {
                    tab.classList.add("active");
                } else {
                    tab.classList.remove("active");
                }
            });

            // Adjust flow lines if camera tab is opened
            const cameraStreamLine = document.getElementById("pathCameraToApp");
            const statusDesc = document.getElementById("workflowStatusDesc");
            
            if (targetTab === "tab-camera" && firebaseState.control.relayKamera && firebaseState.status.online) {
                cameraStreamLine.classList.add("active");
                statusDesc.innerHTML = `<span class="active-step">Aliran Kamera: ESP32-CAM &rarr; App</span> Streaming video lokal aktif secara peer-to-peer menggunakan format MJPEG.`;
            } else {
                cameraStreamLine.classList.remove("active");
            }
        });
    });
}

// === SIDEBAR DRAWERS SETUP ===
function setupDrawerNavigation() {
    const btnMenu = document.getElementById("btnMenuDrawer");
    const phoneDrawer = document.getElementById("phoneDrawer");
    const drawerBackdrop = document.getElementById("drawerBackdrop");
    
    const openDrawer = () => {
        phoneDrawer.classList.add("open");
        drawerBackdrop.classList.add("active");
    };
    
    const closeDrawer = () => {
        phoneDrawer.classList.remove("open");
        drawerBackdrop.classList.remove("active");
    };
    
    btnMenu.addEventListener("click", openDrawer);
    drawerBackdrop.addEventListener("click", closeDrawer);
    
    // Toggle notification in sidebar
    document.getElementById("switchNotif").addEventListener("change", (e) => {
        firebaseState.control.notifEnabled = e.target.checked;
        syncUI();
        updateDatabaseViewer();
        showToast(`Notifikasi: ${e.target.checked ? "Diaktifkan" : "Dimatikan"}`);
    });
    
    // Toggle dark mode
    document.getElementById("switchDarkMode").addEventListener("change", (e) => {
        const phoneScreen = document.getElementById("phoneScreen");
        if (e.target.checked) {
            phoneScreen.classList.add("dark-mode");
            showToast("Tema Gelap Diaktifkan");
        } else {
            phoneScreen.classList.remove("dark-mode");
            showToast("Tema Terang Diaktifkan");
        }
        syncUI();
    });
}

// === INTERACTIVE CONTROLLER ACTIONS ===
function setupSimulatorControls() {
    // 1. Online / Offline toggle buttons
    const onlineBtn = document.getElementById("ctrlOnlineBtn");
    const offlineBtn = document.getElementById("ctrlOfflineBtn");
    
    onlineBtn.addEventListener("click", () => {
        firebaseState.status.online = true;
        onlineBtn.classList.add("btn-accent");
        offlineBtn.classList.remove("btn-accent");
        
        syncUI();
        updateDatabaseViewer();
        showToast("Perangkat Terhubung ke Firebase");
    });
    
    offlineBtn.addEventListener("click", () => {
        firebaseState.status.online = false;
        offlineBtn.classList.add("btn-accent");
        onlineBtn.classList.remove("btn-accent");
        
        // When device is offline, camera streams and controls cannot be made
        syncUI();
        updateDatabaseViewer();
        showToast("Perangkat Terputus (Offline)");
        
        // Update workflow lines status to normal
        const lines = ["pathTrapToFirebase", "pathFirebaseToApp", "pathAppToFirebase", "pathFirebaseToTrap", "pathCameraToApp"];
        lines.forEach(id => document.getElementById(id).classList.remove("active"));
        document.getElementById("workflowStatusDesc").textContent = "Alat Offline. Koneksi jaringan terputus.";
    });
    
    // 2. Simulate Rat Caught Button
    document.getElementById("ctrlCatchBtn").addEventListener("click", () => {
        if (!firebaseState.status.online) {
            alert("Harap hubungkan alat secara ONLINE terlebih dahulu untuk mengirim status tikus ditangkap.");
            return;
        }

        if (firebaseState.status.tikusDitangkap >= 5) {
            alert("Perangkap sudah penuh! Silakan keluarkan tikus terlebih dahulu secara fisik.");
            return;
        }

        // Simulate trap triggered
        firebaseState.status.tikusDitangkap += 1;
        const activeSesi = firebaseState.status.sesi;

        if (firebaseState.status.tikusDitangkap >= 5) {
            firebaseState.status.pintu = "Tikus Tertangkap (Penuh)";
            firebaseState.notifikasi = `Awas! Perangkap PENUH! 5 Tikus Tertangkap di Sesi ${activeSesi}. Segera keluarkan tikus!`;
        } else {
            firebaseState.status.pintu = "Tikus Tertangkap";
            firebaseState.notifikasi = `Awas! Tikus ke-${firebaseState.status.tikusDitangkap} tertangkap di Sesi ${activeSesi}!`;
        }
        
        // Add log entry to the active session history array
        let session = sessionHistory.find(s => s.sesiKe === activeSesi);
        
        if (!session) {
            session = { sesiKe: activeSesi, entries: [] };
            sessionHistory.push(session);
        }

        const now = Date.now();
        session.entries.push({ status_pintu: "Tikus Tertangkap", tikus_ke: firebaseState.status.tikusDitangkap, waktu: now });
        session.entries.push({ status_pintu: "Pintu Tertutup", tikus_ke: firebaseState.status.tikusDitangkap, waktu: now - 1500 });

        syncUI();
        updateDatabaseViewer();
        
        // Trigger workflow pulses
        triggerWorkflowPulse("trap_to_app", () => {
            showLocalNotification("Perangkap Tikus", firebaseState.notifikasi);
        });
    });

    // 2.5 Keluarkan Tikus & Reset Perangkap (Physical action outside the app)
    document.getElementById("ctrlEmptyTrapBtn").addEventListener("click", () => {
        if (!firebaseState.status.online) {
            alert("Harap hubungkan alat secara ONLINE terlebih dahulu.");
            return;
        }

        const currentSesi = firebaseState.status.sesi;
        const nextSesi = currentSesi + 1;

        // Reset positions of the rats
        rats[0].x = 60;
        rats[0].targetX = 60;
        rats[0].state = "idle";
        for (let i = 1; i < rats.length; i++) {
            rats[i].x = 95 + Math.random() * 90;
            rats[i].targetX = rats[i].x;
            rats[i].state = "trapped";
        }

        // Advance to next session
        firebaseState.status.sesi = nextSesi;
        firebaseState.status.tikusDitangkap = 0;
        firebaseState.status.pintu = "Terbuka";
        
        // Add new session in history
        let session = { sesiKe: nextSesi, entries: [] };
        sessionHistory.push(session);
        const now = Date.now();
        session.entries.push({ status_pintu: "Pintu Terbuka", tikus_ke: 0, waktu: now });

        firebaseState.notifikasi = `Sesi ${nextSesi} dimulai. Perangkap telah dikosongkan secara fisik.`;

        syncUI();
        updateDatabaseViewer();
        showToast(`Tikus dikeluarkan! Sesi ${nextSesi} aktif.`);

        triggerWorkflowPulse("trap_to_app", () => {
            showLocalNotification("Perangkap Tikus", `Sesi Baru ${nextSesi} Dimulai. Pintu Terbuka.`);
        });
    });

    // Reset Trap Pintu Terbuka
    document.getElementById("ctrlResetTrapBtn").addEventListener("click", () => {
        if (!firebaseState.status.online) {
            alert("Harap hubungkan alat secara ONLINE terlebih dahulu.");
            return;
        }

        firebaseState.status.pintu = "Terbuka";
        
        syncUI();
        updateDatabaseViewer();
        
        triggerWorkflowPulse("trap_to_app", () => {
            showToast("Perangkap di-reset: Pintu Terbuka.");
        });
    });

    // 3. Battery Capacity Slider
    const batSlider = document.getElementById("ctrlBatterySlider");
    const batVal = document.getElementById("ctrlBatterySliderVal");
    
    batSlider.addEventListener("input", (e) => {
        const val = parseInt(e.target.value);
        batVal.textContent = `${val}%`;
        
        // Calculate dynamic voltage proportional to percent (3.2V to 4.2V scale)
        const voltage = (3.2 + (val / 100) * 1.0).toFixed(2);
        
        firebaseState.status.batteryPercent = val;
        firebaseState.status.batteryVoltage = voltage;
        
        syncUI();
        updateDatabaseViewer();
        
        // Low battery notification check
        if (val <= 15 && firebaseState.control.notifEnabled) {
            // throttle to prevent infinite flood
            if (!lastLowBatNotif || Date.now() - lastLowBatNotif > 10000) {
                showLocalNotification("Baterai Lemah!", `Baterai alat tersisa ${val}% (${voltage}V). Segera lakukan pengisian daya!`);
                lastLowBatNotif = Date.now();
            }
        }
    });

    // 4. Physical Android Buttons interactions (Clicks on mockup screen)
    document.getElementById("btnPhoneBuzzer").addEventListener("click", () => {
        if (!firebaseState.status.online) return;
        
        // Toggle virtual state
        firebaseState.control.buzzer = !firebaseState.control.buzzer;
        
        syncUI();
        updateDatabaseViewer();
        
        showToast(`Perintah Buzzer: ${firebaseState.control.buzzer ? "ON" : "OFF"}`);
        
        triggerWorkflowPulse("app_to_trap");
    });
    
    document.getElementById("btnPhoneRelay").addEventListener("click", () => {
        if (!firebaseState.status.online) return;
        
        // Toggle camera relay
        firebaseState.control.relayKamera = !firebaseState.control.relayKamera;
        
        syncUI();
        updateDatabaseViewer();
        
        showToast(`Perintah Relay Kamera: ${firebaseState.control.relayKamera ? "ON" : "OFF"}`);
        
        triggerWorkflowPulse("app_to_trap", () => {
            // Toggle stream line in svg if tab camera is active
            const cameraStreamLine = document.getElementById("pathCameraToApp");
            const isCamTab = document.getElementById("navCameraBtn").classList.contains("active");
            if (isCamTab && firebaseState.control.relayKamera) {
                cameraStreamLine.classList.add("active");
            } else {
                cameraStreamLine.classList.remove("active");
            }
        });
    });

    // Reset History from Mobile Outlined Button
    document.getElementById("btnPhoneResetHistory").addEventListener("click", () => {
        if (!firebaseState.status.online) {
            alert("Harap hubungkan alat secara ONLINE untuk mereset data.");
            return;
        }

        if (confirm("Apakah Anda yakin ingin menghapus seluruh riwayat dan mereset sesi?")) {
            firebaseState.control.deleteHistoryCommand = "ALL";
            
            // Clear history and increment session counter
            sessionHistory = [];
            firebaseState.status.sesi += 1; // start new session
            firebaseState.status.tikusDitangkap = 0; // reset caught counter
            firebaseState.status.pintu = "Terbuka";
            
            syncUI();
            updateDatabaseViewer();
            
            showToast("History Dihapus. Sesi Baru Dimulai.");
            
            triggerWorkflowPulse("app_to_trap", () => {
                firebaseState.control.deleteHistoryCommand = "";
                updateDatabaseViewer();
            });
        }
    });
}

// === CANVAS LIVE CAMERA SIMULATION (MOUSE CAGE VIEW) ===
function setupCameraSimulation() {
    const canvas = document.getElementById("cameraCanvas");
    const ctx = canvas.getContext("2d");
    const flashOverlay = document.getElementById("flashOverlay");
    
    // Snapping door coordinates
    let doorHeight = 0; // 0 open, 50 closed
    
    // Cheese coordinates inside trap
    const cheese = { x: 220, y: 225, eaten: false };

    // Capture Button Action
    document.getElementById("btnPhoneCapture").addEventListener("click", () => {
        if (!firebaseState.status.online || !firebaseState.control.relayKamera) return;
        
        // Triggers camera flash visual effect
        flashOverlay.classList.add("camera-flash-active");
        setTimeout(() => {
            flashOverlay.classList.remove("camera-flash-active");
        }, 200);

        playCameraShutterSound();
        showToast("Foto disimpan di Pictures/ESP32CAM");
    });
    
    function playCameraShutterSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = "triangle";
            osc.frequency.setValueAtTime(1000, ctx.currentTime);
            osc.frequency.setValueAtTime(300, ctx.currentTime + 0.05);
            
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
        } catch(e) {}
    }

    // Main Canvas Render Loop
    function renderLoop() {
        // Clear canvas
        ctx.fillStyle = "#0c0d12";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (!firebaseState.status.online) {
            // Draw static television noise if device is offline
            drawStaticNoise();
            requestAnimationFrame(renderLoop);
            return;
        }
        
        if (!firebaseState.control.relayKamera) {
            // Blank screen if camera is off
            requestAnimationFrame(renderLoop);
            return;
        }

        // Draw camera HUD indicators (REC, timestamp)
        drawCameraHUD();

        // Draw Cage/Trap Graphics
        drawTrapStructure();
        
        // Update Rat AI & Animation for active rats
        if (firebaseState.status.tikusDitangkap === 0) {
            // 1 rat sniffing outside
            updateRatAI(rats[0], 0);
            drawRat(rats[0]);
        } else {
            // up to 5 rats caught inside
            const caughtCount = Math.min(firebaseState.status.tikusDitangkap, 5);
            for (let i = 0; i < caughtCount; i++) {
                updateRatAI(rats[i], i);
                drawRat(rats[i]);
            }
        }
        
        // Request next frame
        requestAnimationFrame(renderLoop);
    }
    
    // Draw static noise
    function drawStaticNoise() {
        const imgData = ctx.createImageData(canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 255;
            data[i] = noise;       // red
            data[i+1] = noise;     // green
            data[i+2] = noise;     // blue
            data[i+3] = 255;       // alpha
        }
        ctx.putImageData(imgData, 0, 0);
        
        // Overlay "NO SIGNAL" Text
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(40, 130, 240, 60);
        ctx.strokeStyle = "#e53935";
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 130, 240, 60);
        
        ctx.font = "bold 14px 'Outfit', sans-serif";
        ctx.fillStyle = "#e53935";
        ctx.textAlign = "center";
        ctx.fillText("ALAT OFFLINE", canvas.width/2, 155);
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "#9e9e9e";
        ctx.fillText("Hubungan Firebase Terputus", canvas.width/2, 175);
    }

    // Camera OSD/HUD overlay
    function drawCameraHUD() {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

        // Blinking REC red dot
        if (Math.floor(Date.now() / 600) % 2 === 0) {
            ctx.fillStyle = "#e53935";
            ctx.beginPath();
            ctx.arc(35, 35, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "left";
        ctx.fillText("REC LIVE", 45, 38);

        // Timestamp
        const now = new Date();
        const dateStr = now.toLocaleDateString() + " " + now.toLocaleTimeString();
        ctx.textAlign = "right";
        ctx.fillText(dateStr, canvas.width - 35, 38);
    }

    // Draw the trap wire cage and door
    function drawTrapStructure() {
        const cageX = 80;
        const cageY = 140;
        const cageW = 160;
        const cageH = 100;
        const floorY = cageY + cageH;

        // Ground Floor Line
        ctx.strokeStyle = "#424242";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(10, floorY + 1);
        ctx.lineTo(canvas.width - 10, floorY + 1);
        ctx.stroke();

        // Draw Cheese (Target Bait)
        if (!cheese.eaten) {
            ctx.fillStyle = "#ffd54f"; // Yellow cheese
            ctx.beginPath();
            ctx.moveTo(cheese.x, cheese.y);
            ctx.lineTo(cheese.x + 14, cheese.y + 12);
            ctx.lineTo(cheese.x - 4, cheese.y + 12);
            ctx.closePath();
            ctx.fill();
            
            // Cheese holes
            ctx.fillStyle = "#ffb300";
            ctx.beginPath();
            ctx.arc(cheese.x + 3, cheese.y + 8, 1.5, 0, Math.PI * 2);
            ctx.arc(cheese.x + 8, cheese.y + 10, 1, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Back Wall wire grid of cage
        ctx.strokeStyle = "rgba(0, 255, 60, 0.15)";
        ctx.lineWidth = 1;
        // Verticals grid
        for (let x = cageX + 10; x < cageX + cageW; x += 12) {
            ctx.beginPath();
            ctx.moveTo(x, cageY);
            ctx.lineTo(x, cageY + cageH);
            ctx.stroke();
        }
        // Horizontals grid
        for (let y = cageY + 10; y < cageY + cageH; y += 12) {
            ctx.beginPath();
            ctx.moveTo(cageX, y);
            ctx.lineTo(cageX + cageW, y);
            ctx.stroke();
        }

        // Draw Front Outline of Cage (Strong Green tint for Nightvision style)
        ctx.strokeStyle = "rgba(0, 255, 60, 0.4)";
        ctx.lineWidth = 2;
        ctx.strokeRect(cageX, cageY, cageW, cageH);

        // Trap Door mechanics (Left side of cage)
        const doorX = cageX;
        
        if (firebaseState.status.pintu === "Terbuka") {
            // Animate door opening up
            if (doorHeight > 0) doorHeight -= 3;
        } else {
            // Animate door snapping shut down
            if (doorHeight < cageH) doorHeight += 12; // Fast snap
            if (doorHeight > cageH) doorHeight = cageH;
        }

        // Draw the door plate
        ctx.strokeStyle = "rgba(0, 255, 60, 0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Door slides from top down
        ctx.moveTo(doorX, cageY);
        ctx.lineTo(doorX, cageY + doorHeight);
        ctx.stroke();

        // Draw ESP8266 + Buzzer schematic on side
        ctx.fillStyle = "#1565c0"; // Blue MCU board mockup on right side
        ctx.fillRect(cageX + cageW + 6, cageY + 40, 16, 25);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 6px monospace";
        ctx.fillText("ESP", cageX + cageW + 8, cageY + 54);

        // Buzzer soundwave arcs
        if (firebaseState.control.buzzer) {
            ctx.strokeStyle = "#e53935";
            ctx.lineWidth = 1.5;
            const bX = cageX + cageW + 14;
            const bY = cageY + cageH - 20;
            
            // Draw speaker
            ctx.fillStyle = "#212121";
            ctx.fillRect(bX - 6, bY - 4, 6, 8);
            ctx.beginPath();
            ctx.moveTo(bX, bY - 8);
            ctx.lineTo(bX + 4, bY - 12);
            ctx.lineTo(bX + 4, bY + 12);
            ctx.lineTo(bX, bY + 8);
            ctx.closePath();
            ctx.fill();

            // Blinking arcs
            const arcRadius = (Math.floor(Date.now() / 150) % 3) * 6 + 6;
            ctx.beginPath();
            ctx.arc(bX + 6, bY, arcRadius, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
        }
    }

    // Update Rat movement and state machine
    function updateRatAI(rat, index) {
        const floorLevel = 220;
        const cageLeft = 95;
        const cageRight = 220;
        
        // Scare behavior if Buzzer is ON and trap is closed
        if (firebaseState.control.buzzer && firebaseState.status.pintu !== "Terbuka") {
            rat.state = "scared";
            rat.speed = 3.2; // frantic running
        } else if (firebaseState.status.pintu.includes("Tertangkap") || firebaseState.status.pintu.includes("Penuh") || firebaseState.status.pintu === "Tertutup") {
            rat.state = "trapped";
            rat.speed = 1.0;
        } else {
            rat.state = "sniffing";
            rat.speed = 1.2;
        }

        // Logic based on state
        if (rat.state === "sniffing") {
            // Sniffing around, heading toward cheese bait (middle-right of cage)
            rat.targetX = cheese.x - 10 - (index * 8); // stack slightly
            rat.targetY = floorLevel;

            // Move rat horizontally towards target
            if (Math.abs(rat.x - rat.targetX) > 5) {
                rat.direction = rat.x < rat.targetX ? 1 : -1;
                rat.x += rat.speed * rat.direction;
            } else {
                rat.x = rat.targetX;
                // Idle wiggle
                rat.x += Math.sin(Date.now() / 100 + index) * 0.5;
            }
        } 
        else if (rat.state === "trapped") {
            // Trapped inside, pacing back and forth inside the cage
            if (rat.targetX === cheese.x - 10 || Math.abs(rat.x - rat.targetX) < 10) {
                // Pick a new random point inside cage boundaries
                rat.targetX = cageLeft + Math.random() * (cageRight - cageLeft - 30);
            }
            
            rat.direction = rat.x < rat.targetX ? 1 : -1;
            rat.x += rat.speed * rat.direction;
        } 
        else if (rat.state === "scared") {
            // Frantic vibration and running left to right hitting walls
            if (rat.targetX === cheese.x - 10 || Math.abs(rat.x - rat.targetX) < 10) {
                // oscillate quickly between left and right walls
                rat.targetX = rat.x < 150 ? cageRight - 15 : cageLeft + 5;
            }
            rat.direction = rat.x < rat.targetX ? 1 : -1;
            rat.x += rat.speed * rat.direction;
            
            // Scared vibration offset vertical
            rat.y = floorLevel + (Math.random() - 0.5) * 3;
            return; // skip normal y positioning
        }
        
        rat.y = floorLevel;
    }

    // Render rat graphics on Canvas
    function drawRat(rat) {
        ctx.save();
        
        // Position and mirror tail/ears depending on direction
        ctx.translate(rat.x, rat.y);
        if (rat.direction === -1) {
            ctx.scale(-1, 1);
        }

        // Draw Tail (pink wiggling bezier curve)
        ctx.strokeStyle = "#ffb74d"; // Orange-pink tail
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-10, -2);
        // Animate tail wiggle
        const tailOffset = Math.sin(Date.now() / (rat.state === "scared" ? 50 : 200)) * 6;
        ctx.bezierCurveTo(-15, -6 + tailOffset, -20, -2 - tailOffset, -24, -6);
        ctx.stroke();

        // Mouse Body (Grey oval)
        ctx.fillStyle = "#757575"; // Grey fur
        ctx.beginPath();
        ctx.ellipse(0, -5, rat.width / 2, rat.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ears (light pink centers)
        ctx.fillStyle = "#ffcc80"; // Pink inner ear
        ctx.beginPath();
        ctx.arc(-2, -12, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#757575";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Snout / Nose (pink dot)
        ctx.fillStyle = "#ffab91";
        ctx.beginPath();
        ctx.arc(rat.width/2 + 1, -4, 2, 0, Math.PI*2);
        ctx.fill();

        // Eye (black dot)
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(5, -6, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Sweat droplets if scared
        if (rat.state === "scared") {
            ctx.fillStyle = "#29b6f6"; // Blue drops
            ctx.beginPath();
            ctx.arc(-5, -16, 1.5, 0, Math.PI * 2);
            ctx.arc(12, -14, 1, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
    
    // Start loop
    renderLoop();
}
