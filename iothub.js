import pkg from 'azure-iot-device';
const { Client, Message } = pkg;
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
import { connectionString } from './settings.js';


// create a client
let client = Client.fromConnectionString(connectionString, Protocol);

//open client
client.open()
    .then((connected) => console.log(`IOTHUB connected: ${JSON.stringify(connected)}`))
    .catch((error) => console.log(`IOTHUB error: ${JSON.stringify(error)}`));

//send messages
let messageId = 0;
let message = new Message(JSON.stringify({
    messageId: messageId,
    deviceId: 'Raspberry Pi Web Client',
    temperature: 20,
    humidity: 50
}));
setInterval(() => {
    client.sendEvent({ ...message, messageId: messageId++ })
    .then((connected) => console.log(`IOTHUB connected: ${JSON.stringify(connected)}`))
    .catch((error) => console.log(`IOTHUB error: ${JSON.stringify(error)}`))
}
    , 5000);

//alarm direct method
client.onDeviceMethod('alarm', () => { console.log("ALARM") });

//twin
client.getTwin()
    .then((twin) => {
        twin.on('properties.desired', (desiredChange) => {
            console.log(`received new desired properties: ${JSON.stringify(desiredChange)}`);
            if (desiredChange.alarmtemp) {
                console.log("ALARMTEMP");
            }
            twin.properties.reported.update({ alarm: false }, (error) => {
                if (error) {
                    console.log(`error updating twin reported properties: ${JSON.stringify(error)}`);
                } else {
                    console.log(`twin reported properties updated: ${JSON.stringify({ alarm: desiredChange.alarm })}`);
                }
            });
        });
    })
    .catch((error) => console.log(`IOTHUB error: ${JSON.stringify(error)}`));