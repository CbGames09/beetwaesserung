let plantProfiles = {};

async function loadPlantProfiles() {
    try {
        const response = await fetch('/api/plant-profiles');
        plantProfiles = await response.json();
    } catch (error) {
        console.error('Fehler beim Laden der Profile:', error);
    }
}

loadPlantProfiles();

document.querySelectorAll('.profile-select').forEach(select => {
    select.addEventListener('change', (e) => {
        const plantId = e.target.dataset.plantId;
        const profileKey = e.target.value;
        const profile = plantProfiles[profileKey];
        
        if (profile && profile.lower !== null && profile.upper !== null) {
            document.getElementById(`plant_${plantId}_lower`).value = profile.lower;
            document.getElementById(`plant_${plantId}_upper`).value = profile.upper;
        }
    });
});

document.getElementById('plant-count-select').addEventListener('change', (e) => {
    const plantCount = parseInt(e.target.value);
    const plant4Settings = document.getElementById('plant-settings-4');
    const pumpSettings = document.getElementById('pump-settings');
    
    if (plantCount === 4) {
        plant4Settings.style.display = 'block';
        pumpSettings.style.display = 'none';
    } else {
        plant4Settings.style.display = 'none';
        pumpSettings.style.display = 'block';
    }
});

document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const plantCount = parseInt(formData.get('plant_count'));
    
    const config = {
        pin: formData.get('pin'),
        plant_count: plantCount,
        measurement_interval: parseInt(formData.get('measurement_interval')) * 60,
        plants: [],
        pump: {
            interval_days: parseInt(formData.get('pump_interval')),
            duration_seconds: parseInt(formData.get('pump_duration'))
        },
        water_tank: {
            radius_cm: parseFloat(formData.get('tank_radius')),
            height_cm: parseFloat(formData.get('tank_height'))
        }
    };
    
    for (let i = 1; i <= 4; i++) {
        config.plants.push({
            id: i,
            name: formData.get(`plant_${i}_name`),
            lower_limit: parseInt(formData.get(`plant_${i}_lower`)),
            upper_limit: parseInt(formData.get(`plant_${i}_upper`)),
            profile: formData.get(`plant_${i}_profile`)
        });
    }
    
    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(config)
        });
        
        const result = await response.json();
        
        if (result.success) {
            const successMsg = document.getElementById('success-message');
            successMsg.style.display = 'block';
            setTimeout(() => {
                successMsg.style.display = 'none';
            }, 3000);
        }
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        alert('Fehler beim Speichern der Einstellungen');
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/logout', {method: 'POST'});
    window.location.href = '/';
});

let currentPlantId = null;

function openWateringModal(plantId, plantName) {
    currentPlantId = plantId;
    document.getElementById('watering-plant-name').textContent = `Pflanze: ${plantName}`;
    document.getElementById('watering-modal').style.display = 'block';
}

function closeWateringModal() {
    document.getElementById('watering-modal').style.display = 'none';
    currentPlantId = null;
}

async function startWatering() {
    const duration = parseInt(document.getElementById('watering-duration').value);
    
    if (!currentPlantId || !duration || duration < 1) {
        alert('Bitte gültige Dauer eingeben');
        return;
    }
    
    try {
        const response = await fetch('/api/manual-watering', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                plant_id: currentPlantId,
                duration_seconds: duration
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Bewässerung für Pflanze ${currentPlantId} gestartet (${duration}s)`);
            closeWateringModal();
        } else {
            alert('Fehler beim Starten der Bewässerung');
        }
    } catch (error) {
        console.error('Fehler:', error);
        alert('Fehler beim Starten der Bewässerung');
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('watering-modal');
    if (event.target == modal) {
        closeWateringModal();
    }
};
