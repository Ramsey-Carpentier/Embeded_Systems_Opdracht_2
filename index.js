import express from 'express';
import { createServer } from 'node:http';
import path from 'path';
import { Server } from 'socket.io';
import onoff from 'onoff';
import i2c from 'i2c-bus';
import pkg from 'azure-iot-device';
import { Mqtt } from 'azure-iot-device-mqtt'; // MQTT importeren

const { Client, Message } = pkg; // Haal de Client en Message uit het default object

// Configuratie voor relais en inputs
var relais1 = new onoff.Gpio(17 + 512, 'out'); // GPIO 17 als uitgang
var relais2 = new onoff.Gpio(27 + 512, 'out'); // GPIO 27 als uitgang

// Input GPIO 18 en 15 als input
var input18 = new onoff.Gpio(18 + 512, 'in', 'both');
var input15 = new onoff.Gpio(15 + 512, 'in', 'both');

// Configuratie voor I2C en TC74
const I2C_BUS_NUMBER = 1; // I2C-busnummer (meestal 1 op de Raspberry Pi)
const TC74_ADDRESS = 0x4a; // Standaard I2C-adres van de TC74-sensor
const i2cBus = i2c.openSync(I2C_BUS_NUMBER); // Open I2C-bus

// Setup voor Azure IoT Hub
const connectionString = "HostName=IOTHUB-Opdracht2-embed.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=qP1XjGxf1NV8KsIJvkyPddEGInQ2QusDWAIoTMByhME="; // Vervang door je eigen verbindingsstring
const client = Client.fromConnectionString(connectionString, Mqtt);

// Verbind met IoT Hub en Device Twin
async function initializeDeviceTwin() {
  try {
    const twin = await client.getTwin();
    const properties = {
      desired: {
        alarmTemperature: 50, // Stel de alarm temperatuur in (bijv. 50°C)
      },
      reported: {
        alarmFlag: false, // Alarm vlag is standaard uit
      }
    };
    await twin.update(properties);
    console.log('Device Twin is geconfigureerd');
  } catch (err) {
    console.log('Fout bij het instellen van Device Twin:', err);
  }
}

// Direct Method voor het resetten van de alarmvlag
client.onDeviceMethod('alarmreset', (methodParams, callback) => {
  console.log('Alarmreset direct method invoked');
  const twin = client.getTwin();
  twin.properties.reported.update({ alarmFlag: false }, (err) => {
    if (err) {
      console.log('Fout bij het resetten van alarmvlag:', err);
      callback(err);
    } else {
      console.log('Alarmvlag gereset');
      callback(null, 'Alarm reset successful');
    }
  });
});

// Verzend de temperatuur naar IoT Hub
function sendTemperatureToIoTHub(temperature) {
  const message = new Message(JSON.stringify({ temperature }));
  client.sendEvent(message, (err) => {
    if (err) {
      console.log('Fout bij het verzenden van bericht naar IoT Hub:', err);
    } else {
      console.log('Temperatuur verzonden naar IoT Hub');
    }
  });
}

// Express en Socket.io setup
const app = express();
const server = createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(path.resolve('./public/index.html'));
});

app.get('/script.js', (req, res) => {
  res.sendFile(path.resolve('./public/script.js'));
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('a user is disconnected');
  });

  // Toggle relais 1 of 2 bij aanvraag
  socket.on('toggle', (msg) => {
    if (msg.relais === 1) {
      const currentState = relais1.readSync();
      relais1.writeSync(currentState ^ 1); // Toggle relais 1
      console.log(`Relais 1 is nu ${currentState ^ 1 ? 'hoog' : 'laag'}`);
    } else if (msg.relais === 2) {
      const currentState = relais2.readSync();
      relais2.writeSync(currentState ^ 1); // Toggle relais 2
      console.log(`Relais 2 is nu ${currentState ^ 1 ? 'hoog' : 'laag'}`);
    } else {
      console.log('Ongeldig relaisnummer ontvangen:', msg.relais);
    }
  });

  // Periodieke statusupdates voor inputs (GPIO 18 en 15) en temperatuur
  setInterval(() => {
    // Lees GPIO-status
    const input1Status = input18.readSync();
    const input2Status = input15.readSync();

    // Lees temperatuur van de TC74
    let temperature = null;
    try {
      temperature = i2cBus.readByteSync(TC74_ADDRESS, 0x00); // Lees temperatuurregister
    } catch (err) {
      console.error('Fout bij uitlezen temperatuur:', err.message);
    }

    // Temperatuur naar IoT Hub verzenden
    if (temperature !== null) {
      sendTemperatureToIoTHub(temperature);
    }

    // Stuur gegevens naar client
    socket.emit('status update', {
      input1: input1Status,
      input2: input2Status,
      temperature: temperature
    });
  }, 5000); // elke 5 seconden
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});

// Initialiseer Device Twin en start de client
initializeDeviceTwin().catch(console.error);
client.open();
