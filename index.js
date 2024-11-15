import express from 'express';
import { createServer } from 'node:http';
import path from 'path';
import { Server } from 'socket.io';

import rpio  from 'rpio';
rpio.open(15, rpio.INPUT);
console.log('Pin 15 is currently ' + (rpio.read(15) ? 'high' : 'low'));

//var relais = new pkgonoff.Gpio(17, 'out'); //use GPIO pin 17, and specify that it is output

var relais=false;

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
  socket.on('disconnect',()=> {
    console.log('a user is disconnected')
  });
  socket.on('toggle', (msg) =>
  {
  /*  if (relais.readSync() === 0) { //check the pin state, if the state is 0 (or off)
      relais.writeSync(1); //set pin state to 1 (turn LED on)
    } else {
      relais.writeSync(0); //set pin state to 0 (turn LED off)
    }*/
   relais=! relais;
   console.log(`toggle relais, value is ${relais}`);
  });
  socket.on('chat message', (msg) => 
  {
    console.log(`message is ${msg}`);
    io.emit('chat message', msg);
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});