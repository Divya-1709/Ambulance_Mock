import React, { useState, useEffect } from 'react';
import { Trash2, Play, Square, Siren, Activity, Plus, RefreshCw, Heart, Wind } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, update, remove, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCR8WT2WcS1QoUvlL93FjOXjst7ryWZ2P0",
  authDomain: "pd-ambulance.firebaseapp.com",
  projectId: "pd-ambulance",
  storageBucket: "pd-ambulance.firebasestorage.app",
  messagingSenderId: "596987992905",
  appId: "1:596987992905:web:a5e4a1f7cf8822f1de1898",
  measurementId: "G-MZVPXS26H1",
  databaseURL: "https://pd-ambulance-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const BANGALORE_CENTER = { lat: 12.9716, lng: 77.5946 };
const getRandomLocation = () => ({
  lat: BANGALORE_CENTER.lat + (Math.random() - 0.5) * 0.1,
  lng: BANGALORE_CENTER.lng + (Math.random() - 0.5) * 0.1
});

export default function FleetSimulator() {
  const [ambulances, setAmbulances] = useState({});
  const [newId, setNewId] = useState("AMB_001");
  const [isSimulating, setIsSimulating] = useState(true);

  // 🔄 Sync with Firebase
  useEffect(() => {
    const dbRef = ref(db, 'ambulances');
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val() || {};
      setAmbulances(data);
    });
    return () => unsubscribe();
  }, []);

  // 🧠 Simulation Loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const updates = {};
      const timestamp = Date.now();

      Object.values(ambulances).forEach((amb) => {
        // 🚫 Skip real hardware
        if (amb.ambulanceId === "AMB_004") return;

        if (!amb.isRunning) return;

        let { latitude, longitude, heartRate, spo2, isEmergency, ambulanceId } = amb;

        latitude += (Math.random() - 0.5) * 0.001;
        longitude += (Math.random() - 0.5) * 0.001;

        if (isEmergency) {
          heartRate = 60 + Math.floor(Math.random() * 40);
          spo2 = 94 + Math.floor(Math.random() * 6);
        } else {
          heartRate = 0;
          spo2 = 0;
        }

        updates[`ambulances/${ambulanceId}`] = {
          ...amb,
          latitude,
          longitude,
          heartRate,
          spo2,
          hasPatient: isEmergency,
          timestamp
        };
      });

      if (Object.keys(updates).length > 0) {
        update(ref(db), updates);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ambulances, isSimulating]);

  // 🚑 Deploy
  const deployAmbulance = () => {
    if (!newId) return;

    const loc = getRandomLocation();

    const newAmb = {
      ambulanceId: newId,
      latitude: loc.lat,
      longitude: loc.lng,
      heartRate: 0,
      spo2: 0,
      hasPatient: false,
      isRunning: false,
      isEmergency: false,
      timestamp: Date.now()
    };

    update(ref(db, `ambulances/${newId}`), newAmb);

    const num = parseInt(newId.split('_')[1] || "0") + 1;
    setNewId(`AMB_${String(num).padStart(3, '0')}`);
  };

  const removeAmbulance = (id) => remove(ref(db, `ambulances/${id}`));

  // ▶️ Start / Stop
  const handleStartStop = (id) => {
    const amb = ambulances[id];

    // 🚫 prevent controlling real hardware
    if (id === "AMB_004") return;

    if (amb.isRunning) {
      update(ref(db, `ambulances/${id}`), { isRunning: false, isEmergency: false });
    } else {
      update(ref(db, `ambulances/${id}`), { isRunning: true, isEmergency: false });
    }
  };

  // 🚨 Emergency
  const handleEmergency = (id) => {
    const amb = ambulances[id];

    // 🚫 prevent controlling real hardware
    if (id === "AMB_004") return;

    if (amb.isEmergency) {
      update(ref(db, `ambulances/${id}`), { isEmergency: false });
    } else {
      update(ref(db, `ambulances/${id}`), { isEmergency: true, isRunning: true });
    }
  };

  return (
    <div style={styles.appContainer}>
      <div style={styles.header}>
        <div style={styles.brandSection}>
          <div style={styles.logoBox}>
            <Activity color="#EF4444" size={28} />
          </div>
          <h1 style={styles.title}>Fleet Simulator</h1>
        </div>

        <div style={styles.controlSection}>
          <input
            style={styles.input}
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
          />

          <button style={styles.deployBtn} onClick={deployAmbulance}>
            <Plus size={18} /> Deploy
          </button>

          <button style={styles.refreshBtn} onClick={() => window.location.reload()}>
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div style={styles.contentArea}>
        <div style={styles.grid}>
          {Object.values(ambulances)
            .sort((a, b) => a.ambulanceId.localeCompare(b.ambulanceId))
            .map((amb) => (
              <div key={amb.ambulanceId} style={styles.card}>

                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.idText}>{amb.ambulanceId}</div>
                    <div style={styles.coordText}>
                      {amb.latitude?.toFixed(4)}, {amb.longitude?.toFixed(4)}
                    </div>
                  </div>

                  <button onClick={() => removeAmbulance(amb.ambulanceId)}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={styles.vitalsBox}>
                  <div style={styles.vitalGroup}>
                    <Heart size={18} />
                    {amb.heartRate || '--'}
                  </div>
                  <div style={styles.vitalGroup}>
                    <Wind size={18} />
                    {amb.spo2 || '--'}
                  </div>
                </div>

                <div style={styles.footer}>
                  <button onClick={() => handleStartStop(amb.ambulanceId)}>
                    {amb.isRunning ? <Square size={16}/> : <Play size={16}/>}
                  </button>

                  <button onClick={() => handleEmergency(amb.ambulanceId)}>
                    <Siren size={16}/>
                  </button>
                </div>

              </div>
            ))}
        </div>
      </div>
    </div>
  );
}



const styles = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden', // Prevents double scrollbars
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap', // Responsive wrapping
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    gap: '16px',
    zIndex: 10,
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
  },
  brandSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoBox: {
    backgroundColor: '#FEF2F2',
    padding: '8px',
    borderRadius: '10px'
  },
  title: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#0F172A',
    margin: 0,
    letterSpacing: '-0.5px'
  },
  controlSection: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap', // Allows buttons to drop to next line on mobile
  },
  input: {
    padding: '0 16px',
    height: '42px',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    fontSize: '14px',
    width: '180px', // Fixed width for cleaner look
    outline: 'none',
    backgroundColor: '#F8FAFC',
    color: '#0F172A'
  },
  deployBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '42px',
    padding: '0 20px',
    backgroundColor: '#0F172A',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
    whiteSpace: 'nowrap'
  },
  refreshBtn: {
    height: '42px',
    width: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#64748B'
  },
  btnText: {
    display: 'inline-block' // Ensures text doesn't collapse oddly
  },
  contentArea: {
    flex: 1, // Takes remaining height
    overflowY: 'auto', // Internal scroll
    padding: '24px',
  },
  grid: {
    display: 'grid',
    // Responsive columns: Minimum 300px wide, fills available space
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
    gap: '20px',
    maxWidth: '1600px', // Prevents it from getting too stretched on 4k monitors
    margin: '0 auto'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    transition: 'all 0.3s ease'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  idText: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0F172A'
  },
  coordText: {
    fontSize: '12px',
    color: '#64748B',
    marginTop: '4px',
    fontFamily: 'monospace'
  },
  statusCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px'
  },
  badge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 8px',
    borderRadius: '20px',
    letterSpacing: '0.5px'
  },
  deleteIcon: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#EF4444',
    padding: '4px',
    opacity: 0.6,
    transition: 'opacity 0.2s'
  },
  vitalsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-around', // Even spacing
    alignItems: 'center'
  },
  vitalGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  vitalNum: {
    fontSize: '16px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px'
  },
  unit: {
    fontSize: '11px',
    color: '#94A3B8',
    fontWeight: '500'
  },
  footer: {
    display: 'flex',
    gap: '12px',
    marginTop: 'auto' // Pushes buttons to bottom if card height varies
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: 'white'
  }
};
