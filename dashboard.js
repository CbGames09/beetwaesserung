let moistureChart, tempChart, humidityChart;
let currentTimeRange = '24h';
let notificationPermission = false;
let lastAlertCount = 0;
let alertsAcknowledged = false;

function initCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            }
        },
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };

    moistureChart = new Chart(document.getElementById('moistureChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Pflanze 1',
                    data: [],
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.3
                },
                {
                    label: 'Pflanze 2',
                    data: [],
                    borderColor: '#2196f3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.3
                },
                {
                    label: 'Pflanze 3',
                    data: [],
                    borderColor: '#ff9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    tension: 0.3
                },
                {
                    label: 'Pflanze 4',
                    data: [],
                    borderColor: '#9c27b0',
                    backgroundColor: 'rgba(156, 39, 176, 0.1)',
                    tension: 0.3
                }
            ]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                title: {
                    display: true,
                    text: 'Bodenfeuchtigkeit (%)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    tempChart = new Chart(document.getElementById('tempChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperatur',
                data: [],
                borderColor: '#ff5722',
                backgroundColor: 'rgba(255, 87, 34, 0.1)',
                tension: 0.3
            }]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                title: {
                    display: true,
                    text: 'Lufttemperatur (°C)'
                }
            }
        }
    });

    humidityChart = new Chart(document.getElementById('humidityChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Luftfeuchtigkeit',
                data: [],
                borderColor: '#00bcd4',
                backgroundColor: 'rgba(0, 188, 212, 0.1)',
                tension: 0.3
            }]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                title: {
                    display: true,
                    text: 'Luftfeuchtigkeit (%)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function formatTimeLabel(timestamp, range) {
    const date = new Date(timestamp);
    if (range === '24h') {
        return date.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'});
    } else {
        return date.toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit'}) + ' ' + 
               date.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'});
    }
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            notificationPermission = (permission === 'granted');
        });
    } else if ('Notification' in window && Notification.permission === 'granted') {
        notificationPermission = true;
    }
}

function showNotification(alert) {
    if (!notificationPermission || !('Notification' in window)) return;
    
    const icon = alert.severity === 'critical' ? '🚨' : '⚠️';
    new Notification(`${icon} ${alert.message}`, {
        body: 'Pflanzenbewässerung System',
        icon: '/static/favicon.ico',
        requireInteraction: alert.severity === 'critical'
    });
}

function acknowledgeAlerts() {
    alertsAcknowledged = true;
    const alertsBanner = document.getElementById('alerts-banner');
    if (alertsBanner) {
        alertsBanner.style.display = 'none';
    }
}

function updateAlerts(alerts) {
    const alertsBanner = document.getElementById('alerts-banner');
    const alertIndicator = document.getElementById('alert-indicator');
    const alertCount = alertIndicator ? alertIndicator.querySelector('.alert-count') : null;
    
    if (alerts && alerts.length > 0) {
        if (alertIndicator) alertIndicator.style.display = 'flex';
        if (alertCount) alertCount.textContent = alerts.length;
        
        if (!alertsAcknowledged && alertsBanner) {
            alertsBanner.innerHTML = `
                <div class="alerts-header">
                    ${alerts.map(alert => `
                        <div class="alert alert-${alert.severity}">
                            <span class="material-icons">${alert.icon}</span>
                            <span>${alert.message}</span>
                        </div>
                    `).join('')}
                    <button class="acknowledge-btn" onclick="acknowledgeAlerts()">
                        <span class="material-icons">check</span>
                        Bestätigen
                    </button>
                </div>
            `;
            alertsBanner.style.display = 'block';
        }
        
        if (alerts.length > lastAlertCount) {
            alerts.slice(lastAlertCount).forEach(alert => {
                if (alert.severity === 'critical') {
                    showNotification(alert);
                }
            });
            alertsAcknowledged = false;
        }
        lastAlertCount = alerts.length;
    } else {
        if (alertsBanner) alertsBanner.style.display = 'none';
        if (alertIndicator) alertIndicator.style.display = 'none';
        lastAlertCount = 0;
        alertsAcknowledged = false;
    }
}

function updateDashboard() {
    fetch(`/api/sensor-data?range=${currentTimeRange}`)
        .then(response => response.json())
        .then(data => {
            if (data.alerts) {
                updateAlerts(data.alerts);
            }
            
            if (data.current && data.config && data.config.plants) {
                const plantCount = data.config.plant_count || 3;
                
                for (let i = 0; i < 3; i++) {
                    const plantCard = document.getElementById(`plant-${i + 1}`);
                    const moistureValue = data.current.moisture[i] || 0;
                    const plantConfig = data.config.plants[i];
                    
                    if (!plantConfig) continue;
                    
                    plantCard.querySelector('h3').textContent = plantConfig.name;
                    plantCard.querySelector('.moisture-value').textContent = moistureValue;
                    
                    const statusElement = plantCard.querySelector('.status');
                    const iconElement = plantCard.querySelector('.plant-icon');
                    
                    if (moistureValue < plantConfig.lower_limit) {
                        statusElement.setAttribute('data-status', 'low');
                        statusElement.textContent = 'Zu trocken';
                        iconElement.textContent = 'water_drop';
                    } else if (moistureValue > plantConfig.upper_limit) {
                        statusElement.setAttribute('data-status', 'high');
                        statusElement.textContent = 'Zu feucht';
                        iconElement.textContent = 'warning';
                    } else {
                        statusElement.setAttribute('data-status', 'ok');
                        statusElement.textContent = 'OK';
                        iconElement.textContent = 'eco';
                    }
                }
                
                const card4 = document.getElementById('plant-4');
                const card4Title = card4.querySelector('.card-title');
                const card4Value = card4.querySelector('.card-value');
                const card4Icon = card4.querySelector('.card-icon');
                const card4PlantIcon = card4.querySelector('.plant-icon');
                const card4Status = card4.querySelector('.status');
                
                if (plantCount === 4) {
                    card4.classList.remove('descaling-card');
                    card4PlantIcon.textContent = 'eco';
                    const plantConfig = data.config.plants[3];
                    
                    if (plantConfig) {
                        card4Title.textContent = plantConfig.name;
                        card4Value.innerHTML = '<span class="material-icons card-icon">water_drop</span><span class="moisture-value">--</span>%';
                        
                        const moistureValue = data.current.moisture[3] || 0;
                        
                        card4.querySelector('.moisture-value').textContent = moistureValue;
                        
                        if (moistureValue < plantConfig.lower_limit) {
                            card4Status.setAttribute('data-status', 'low');
                            card4Status.textContent = 'Zu trocken';
                            card4PlantIcon.textContent = 'water_drop';
                        } else if (moistureValue > plantConfig.upper_limit) {
                            card4Status.setAttribute('data-status', 'high');
                            card4Status.textContent = 'Zu feucht';
                            card4PlantIcon.textContent = 'warning';
                        } else {
                            card4Status.setAttribute('data-status', 'ok');
                            card4Status.textContent = 'OK';
                            card4PlantIcon.textContent = 'eco';
                        }
                    }
                } else {
                    card4.classList.add('descaling-card');
                    card4PlantIcon.textContent = 'water_pump';
                    card4Title.textContent = 'Pumpe';
                    
                    const pump = data.config.pump || { interval_days: 7, duration_seconds: 60 };
                    card4Value.innerHTML = `<span class="material-icons card-icon">schedule</span><span class="pump-info">${pump.interval_days} Tage / ${pump.duration_seconds}s</span>`;
                    
                    card4Status.setAttribute('data-status', 'low');
                    card4Status.textContent = 'Außer Betrieb';
                }
                
                const airTempElement = document.getElementById('air-temp');
                const airHumidityElement = document.getElementById('air-humidity');
                const waterLevelElement = document.getElementById('water-level');
                const selfTestIconElement = document.getElementById('self-test-icon');
                const selfTestStatusElement = document.getElementById('self-test-status');
                const selfTestMessageElement = document.getElementById('self-test-message');
                
                if (airTempElement) airTempElement.textContent = `${data.current.air_temp || 0}°C`;
                if (airHumidityElement) airHumidityElement.textContent = `${data.current.air_humidity || 0}%`;
                
                if (waterLevelElement) {
                    const waterTank = data.config.water_tank || { radius_cm: 10, height_cm: 50 };
                    const waterDistanceCm = data.current.water_distance_cm || 0;
                    const waterHeightCm = waterTank.height_cm - waterDistanceCm;
                    const waterLiters = (waterHeightCm * Math.pow(waterTank.radius_cm, 2) * Math.PI) / 1000;
                    waterLevelElement.textContent = `${Math.max(0, waterLiters).toFixed(1)} L`;
                }
                
                if (selfTestIconElement && selfTestStatusElement && selfTestMessageElement) {
                    const selfTest = data.current.self_test || { status: 'ok', message: '' };
                    
                    if (selfTest.status === 'ok') {
                        selfTestIconElement.textContent = 'check_circle';
                        selfTestIconElement.style.color = '#4caf50';
                        selfTestStatusElement.title = 'Selbsttest: OK';
                    } else {
                        selfTestIconElement.textContent = 'warning';
                        selfTestIconElement.style.color = '#ff9800';
                        selfTestStatusElement.title = 'Selbsttest: Warnung - Klicken für Details';
                    }
                    
                    selfTestMessageElement.textContent = selfTest.message || 'System läuft normal';
                }
            }
            
            if (data.history && data.history.length > 0 && data.config) {
                const labels = data.history.map(entry => formatTimeLabel(entry.timestamp, currentTimeRange));
                const plantCount = data.config.plant_count || 3;
                
                moistureChart.data.labels = labels;
                for (let i = 0; i < 4; i++) {
                    if (i < plantCount) {
                        moistureChart.data.datasets[i].label = data.config.plants[i].name;
                        moistureChart.data.datasets[i].data = data.history.map(entry => entry.moisture[i] || 0);
                        moistureChart.data.datasets[i].hidden = false;
                    } else {
                        moistureChart.data.datasets[i].hidden = true;
                    }
                }
                moistureChart.update();
                
                tempChart.data.labels = labels;
                tempChart.data.datasets[0].data = data.history.map(entry => entry.air_temp);
                tempChart.update();
                
                humidityChart.data.labels = labels;
                humidityChart.data.datasets[0].data = data.history.map(entry => entry.air_humidity);
                humidityChart.update();
            }
        })
        .catch(error => console.error('Fehler beim Laden der Daten:', error));
}

document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTimeRange = e.target.dataset.range;
        updateDashboard();
    });
});

initCharts();
requestNotificationPermission();
updateDashboard();
setInterval(updateDashboard, 5000);

const modal = document.getElementById('self-test-modal');
const selfTestStatusElement = document.getElementById('self-test-status');
const closeBtn = document.querySelector('.close');

if (selfTestStatusElement && modal && closeBtn) {
    selfTestStatusElement.onclick = function() {
        modal.style.display = 'block';
    };

    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}
