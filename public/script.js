const socket = io(); // Maak verbinding met de server

// Verwijzingen naar de knoppen en status-elementen
const toggleButton1 = document.getElementById('toggle-relais1');
const toggleButton2 = document.getElementById('toggle-relais2');
const input1Status = document.getElementById('input1-status');
const input2Status = document.getElementById('input2-status');
const temperatureDisplay = document.getElementById('temperature-display');
const temperatureFill = document.getElementById('temperature-fill'); // Voeg de referentie naar de gauge-fill toe
const alarmStatusDisplay = document.getElementById('alarm-status'); // Display voor alarmstatus
const alarmTemperatureDisplay = document.getElementById('alarm-temperature'); // Display voor alarm temperatuur
const resetAlarmButton = document.getElementById('reset-alarm'); // Knop om alarm te resetten

// Toggle relais 1 bij knopdruk
toggleButton1.addEventListener('click', (e) => {
    e.preventDefault(); // Voorkom standaard gedrag
    console.log('Toggling relais 1');
    socket.emit('toggle', { relais: 1 }); // Verzend toggle-commando naar server
});

// Toggle relais 2 bij knopdruk
toggleButton2.addEventListener('click', (e) => {
    e.preventDefault(); // Voorkom standaard gedrag
    console.log('Toggling relais 2');
    socket.emit('toggle', { relais: 2 });
});

// Functie om de rotatie van de gauge aan te passen
function updateGauge(temperature) {
    // Schaal de temperatuur naar een rotatie tussen 0 en 180 graden
    const rotation = ((temperature + 50) / 120) * 180;  // Van -50°C tot 70°C, geschaald naar 0 tot 180 graden
    temperatureFill.style.transform = `rotate(${rotation}deg)`; // Pas de rotatie toe

    // Werk de tekstweergave van de temperatuur bij
    temperatureDisplay.textContent = `${temperature} °C`;
}

// Luister naar statusupdates van inputs en temperatuur
socket.on('status update', (data) => {
    console.log('Statusupdate ontvangen:', data);

    // Werk de status van Input 1 bij
    if (data.input1 !== undefined) {
        input1Status.textContent = `Input 1 (GPIO 18): ${data.input1 === 1 ? 'Hoog' : 'Laag'}`;
        input1Status.style.backgroundColor = data.input1 === 1 ? 'green' : 'red';
    }

    // Werk de status van Input 2 bij
    if (data.input2 !== undefined) {
        input2Status.textContent = `Input 2 (GPIO 15): ${data.input2 === 1 ? 'Hoog' : 'Laag'}`;
        input2Status.style.backgroundColor = data.input2 === 1 ? 'green' : 'red';
    }

    // Werk temperatuur-gauge bij
    if (data.temperature !== null && data.temperature !== undefined) {
        updateGauge(data.temperature); // Werk de gauge bij met de ontvangen temperatuur
    } else {
        temperatureDisplay.textContent = 'Temperatuur: Sensorfout';
        temperatureFill.style.transform = `rotate(0deg)`; // Reset de gauge als er een fout is
    }

    // Toon de alarmstatus
    if (data.alarmFlag !== undefined) {
        alarmStatusDisplay.textContent = data.alarmFlag ? 'Alarm Actief' : 'Alarm Inactief';
        alarmStatusDisplay.style.backgroundColor = data.alarmFlag ? 'red' : 'green';
    }

    // Toon de ingestelde alarmtemperatuur
    if (data.alarmTemperature !== undefined) {
        alarmTemperatureDisplay.textContent = `Alarm Temperatuur: ${data.alarmTemperature} °C`;
    }
});

// Chatfunctionaliteit
socket.on('chat message', (msg) => {
    const item = document.createElement('li');
    item.textContent = msg;
    const messages = document.getElementById('messages');
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

// Verstuur chatbericht
const form = document.getElementById('form');
const input = document.getElementById('input');
form.addEventListener('submit', (e) => {
    e.preventDefault(); // Voorkom standaard gedrag
    if (input.value) {
        socket.emit('chat message', input.value);
        input.value = ''; // Wis het invoerveld
    }
});

// Reset de alarmstatus via Direct Method
resetAlarmButton.addEventListener('click', () => {
    console.log('Resetten van alarmstatus...');
    socket.emit('reset alarm'); // Verzend het reset-commando naar de server om de alarmstatus te resetten
});


